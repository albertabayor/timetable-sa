import { SimulatedAnnealing } from '../src/index.js';
import type { Constraint, MoveGenerator, SAConfig } from '../src/index.js';
import type { TimetableState, ScheduleEntry } from '../examples/timetabling/types/index.js';
import { loadDataFromExcel } from '../examples/timetabling/data/index.js';
import { generateInitialSolution } from '../examples/timetabling/utils/initial-solution.js';

import {
  NoLecturerConflict,
  NoRoomConflict,
  RoomCapacity,
  NoProdiConflict,
  MaxDailyPeriods,
  ClassTypeTime,
  SaturdayRestriction,
  FridayTimeRestriction,
  PrayerTimeStart,
  ExclusiveRoom,
} from '../examples/timetabling/constraints/hard/index.js';
import { NoFridayPrayConflict } from '../examples/timetabling/constraints/hard/NoFridayPrayConflit.js';

import {
  Compactness,
  EveningClassPriority,
  OverflowPenalty,
  PrayerTimeOverlap,
  PreferredRoom,
  PreferredTime,
  ResearchDay,
  TransitTime,
} from '../examples/timetabling/constraints/soft/index.js';

import {
  ChangeTimeSlot,
  ChangeRoom,
  SwapClasses,
  ChangeTimeSlotAndRoom,
  FixFridayPrayerConflict,
  FixFridayLecturerConflict,
  FixLecturerConflict,
  FixRoomConflict,
  FixMaxDailyPeriods,
  FixRoomCapacity,
  FixExclusiveRoom,
} from '../examples/timetabling/moves/index.js';
import { SwapFridayWithNonFriday } from '../examples/timetabling/moves/SwapFridayWithNonFriday.js';

type RunResult = {
  runtimeMs: number;
  fitness: number;
  hardViolations: number;
  softViolations: number;
  operatorAttempts: Record<string, number>;
};

const TARGETED_OPERATORS = [
  'Fix Friday Prayer Conflict',
  'Fix Friday Lecturer Conflict',
  'Swap Friday with Non-Friday',
  'Fix Lecturer Conflict',
  'Fix Room Conflict',
  'Fix Max Daily Periods',
  'Fix Room Capacity',
  'Fix Exclusive Room',
];

function createConstraints(): Constraint<TimetableState>[] {
  return [
    new NoLecturerConflict(),
    new NoRoomConflict(),
    new RoomCapacity(),
    new NoProdiConflict(),
    new NoFridayPrayConflict(),
    new MaxDailyPeriods(),
    new ClassTypeTime(),
    new SaturdayRestriction(),
    new FridayTimeRestriction(),
    new PrayerTimeStart(),
    new ExclusiveRoom(),
    new PreferredTime(10),
    new PreferredRoom(10),
    new TransitTime(5),
    new Compactness(15),
    new PrayerTimeOverlap(20),
    new EveningClassPriority(20),
    new ResearchDay(10),
    new OverflowPenalty(10),
  ];
}

function createMoveGenerators(): MoveGenerator<TimetableState>[] {
  return [
    new FixFridayPrayerConflict(),
    new FixFridayLecturerConflict(),
    new SwapFridayWithNonFriday(),
    new FixLecturerConflict(),
    new FixRoomConflict(),
    new FixMaxDailyPeriods(),
    new FixRoomCapacity(),
    new FixExclusiveRoom(),
    new ChangeTimeSlotAndRoom(),
    new ChangeTimeSlot(),
    new ChangeRoom(),
    new SwapClasses(),
  ];
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function cloneState(state: TimetableState): TimetableState {
  return {
    ...state,
    schedule: state.schedule.map((entry: ScheduleEntry) => ({ ...entry })),
  };
}

function buildBaselineConfig(maxIterations: number): SAConfig<TimetableState> {
  return {
    initialTemperature: 100000,
    minTemperature: 0.0000001,
    coolingRate: 0.9995,
    maxIterations,
    hardConstraintWeight: 100000,
    cloneState,
    reheatingThreshold: 500,
    reheatingFactor: 150,
    maxReheats: 10,
    tabuSearchEnabled: true,
    tabuTenure: 50,
    maxTabuListSize: 1000,
    aspirationEnabled: true,
    enableIntensification: false,
    intensificationIterations: 2000,
    maxIntensificationAttempts: 3,
    operatorSelectionMode: 'hybrid',
    logging: { enabled: false },
  };
}

function buildTunedConfig(maxIterations: number): SAConfig<TimetableState> {
  return {
    initialTemperature: 100000,
    minTemperature: 0.0000001,
    coolingRate: 0.9995,
    maxIterations,
    hardConstraintWeight: 100000,
    cloneState,
    reheatingThreshold: 1200,
    reheatingFactor: 3,
    maxReheats: 4,
    tabuSearchEnabled: true,
    tabuTenure: 60,
    maxTabuListSize: 1500,
    aspirationEnabled: true,
    enableIntensification: true,
    intensificationIterations: 3000,
    maxIntensificationAttempts: 4,
    intensificationStagnationLimit: 350,
    operatorSelectionMode: 'hybrid',
    logging: { enabled: false },
  };
}

async function runSolver(
  initialState: TimetableState,
  config: SAConfig<TimetableState>
): Promise<RunResult> {
  const solver = new SimulatedAnnealing(
    cloneState(initialState),
    createConstraints(),
    createMoveGenerators(),
    config
  );

  const start = performance.now();
  const solution = await solver.solve();
  const end = performance.now();

  const operatorAttempts: Record<string, number> = {};
  for (const [name, stats] of Object.entries(solution.operatorStats)) {
    operatorAttempts[name] = stats.attempts;
  }

  return {
    runtimeMs: end - start,
    fitness: solution.fitness,
    hardViolations: solution.hardViolations,
    softViolations: solution.softViolations,
    operatorAttempts,
  };
}

function summarize(label: string, results: RunResult[]): void {
  const feasible = results.filter((result) => result.hardViolations === 0).length;
  const feasibilityRate = (feasible / results.length) * 100;

  const fitnessValues = results.map((result) => result.fitness);
  const hardValues = results.map((result) => result.hardViolations);
  const softValues = results.map((result) => result.softViolations);
  const runtimeValues = results.map((result) => result.runtimeMs);

  const targetedInactiveRuns = TARGETED_OPERATORS.reduce<Record<string, number>>((acc, operatorName) => {
    const inactiveCount = results.filter((result) => (result.operatorAttempts[operatorName] ?? 0) === 0).length;
    acc[operatorName] = inactiveCount;
    return acc;
  }, {});

  console.log(`\n=== ${label} ===`);
  console.log(`runs: ${results.length}`);
  console.log(`feasible runs (hard=0): ${feasible}/${results.length} (${feasibilityRate.toFixed(2)}%)`);
  console.log(`fitness median: ${median(fitnessValues).toFixed(2)}`);
  console.log(`fitness avg: ${average(fitnessValues).toFixed(2)}`);
  console.log(`hard violations median: ${median(hardValues).toFixed(2)}`);
  console.log(`soft violations median: ${median(softValues).toFixed(2)}`);
  console.log(`runtime median (s): ${(median(runtimeValues) / 1000).toFixed(2)}`);

  console.log('targeted operators inactive runs:');
  for (const operatorName of TARGETED_OPERATORS) {
    console.log(`  - ${operatorName}: ${targetedInactiveRuns[operatorName]}/${results.length}`);
  }
}

async function main(): Promise<void> {
  const runsArg = process.argv.find((arg) => arg.startsWith('--runs='));
  const iterationsArg = process.argv.find((arg) => arg.startsWith('--iterations='));
  const runs = runsArg ? Number(runsArg.split('=')[1]) : 10;
  const maxIterations = iterationsArg ? Number(iterationsArg.split('=')[1]) : 10000;

  if (!Number.isInteger(runs) || runs <= 0) {
    throw new Error(`Invalid --runs value: ${runs}`);
  }

  if (!Number.isInteger(maxIterations) || maxIterations <= 0) {
    throw new Error(`Invalid --iterations value: ${maxIterations}`);
  }

  const data = loadDataFromExcel('./data_uisi.xlsx');
  const baselineResults: RunResult[] = [];
  const tunedResults: RunResult[] = [];

  console.log('Running paired timetabling experiment...');
  console.log(`runs per config: ${runs}`);
  console.log(`maxIterations: ${maxIterations}`);

  for (let i = 0; i < runs; i++) {
    console.log(`\nTrial ${i + 1}/${runs}`);
    const seedState = generateInitialSolution(data, { randomize: true });

    const baseline = await runSolver(seedState, buildBaselineConfig(maxIterations));
    baselineResults.push(baseline);
    console.log(
      `  baseline => fitness=${baseline.fitness.toFixed(2)} hard=${baseline.hardViolations} soft=${baseline.softViolations} runtime=${(baseline.runtimeMs / 1000).toFixed(2)}s`
    );

    const tuned = await runSolver(seedState, buildTunedConfig(maxIterations));
    tunedResults.push(tuned);
    console.log(
      `  tuned    => fitness=${tuned.fitness.toFixed(2)} hard=${tuned.hardViolations} soft=${tuned.softViolations} runtime=${(tuned.runtimeMs / 1000).toFixed(2)}s`
    );
  }

  summarize('Baseline config', baselineResults);
  summarize('Tuned config', tunedResults);
}

await main();
