import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { SimulatedAnnealing } from '../src/index.js';
import type { Constraint, MoveGenerator, SAConfig, SolverDiagnostics } from '../src/index.js';
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

type TimetablingData = ReturnType<typeof loadDataFromExcel>;

type VariantKind = 'phase15-off' | 'phase15-legacy' | 'phase15-tuned';

type CellDefinition = {
  id: string;
  label: string;
  variant: VariantKind;
  maxIterations: number;
  tunedBudgetFraction: number | null;
  config: SAConfig<TimetableState>;
};

type RunResult = {
  cellId: string;
  variant: VariantKind;
  trial: number;
  tierMaxIterations: number;
  tunedBudgetFraction: number | null;
  initialSeed: number;
  solverSeed: number;
  runtimeMs: number;
  fitness: number;
  hardViolations: number;
  softViolations: number;
  isFeasible: boolean;
  diagnostics: SolverDiagnostics;
};

type TrialRecord = {
  trial: number;
  initialSeed: number;
  solverSeed: number;
  resultsByCell: Record<string, RunResult>;
};

type SummaryStats = {
  runs: number;
  feasibleRuns: number;
  feasibilityRate: number;
  runtimeMedianMs: number;
  runtimeP95Ms: number;
  phase15MedianMs: number;
  phase15P95Ms: number;
  finalFitnessMedian: number;
  feasibleOnlyFinalFitnessMedian: number | null;
  finalHardMedian: number;
  finalSoftMedian: number;
  bestHardAfterPhase1Median: number;
  bestHardAfterPhase15Median: number;
  timeToFirstFeasibleMedianMs: number | null;
  timeToFirstFeasibleP95Ms: number | null;
  phase15ImprovedBestHardRate: number;
  phase15NoChangeRate: number;
  phase15RuntimeOnlyRate: number;
  phase15TriggeredRate: number;
  attemptsMedian: number;
  iterationsMedian: number;
  budgetUsedMedian: number;
  budgetLimitMedian: number;
};

type PairwiseDelta = {
  feasibilityDeltaPp: number;
  runtimeMedianDeltaMs: number;
  runtimeP95DeltaMs: number;
  rescueCount: number;
  rescueRate: number;
  regressCount: number;
  regressRate: number;
};

type TierArtifact = {
  maxIterations: number;
  cells: CellDefinition[];
  summaries: Record<string, SummaryStats>;
  deltasVsOff: Record<string, PairwiseDelta>;
  trials: TrialRecord[];
};

const DEFAULT_RUNS = 30;
const DEFAULT_TIER_ITERATIONS = [2000, 5000, 10000];
const DEFAULT_TUNED_BUDGET_FRACTIONS = [0.1, 0.2, 0.25, 0.35];
const DEFAULT_OUTPUT_PATH = './artifacts/intensification-stage2-matrix.json';
const DEFAULT_BASE_SEED = 20260331;

const TARGETED_REPAIR_OPERATORS = [
  'Fix Friday Prayer Conflict',
  'Fix Friday Lecturer Conflict',
  'Swap Friday with Non-Friday',
  'Fix Lecturer Conflict',
  'Fix Room Conflict',
  'Fix Max Daily Periods',
  'Fix Room Capacity',
  'Fix Exclusive Room',
];

const ALL_MOVE_OPERATOR_NAMES = [
  'Fix Friday Prayer Conflict',
  'Fix Friday Lecturer Conflict',
  'Swap Friday with Non-Friday',
  'Fix Lecturer Conflict',
  'Fix Room Conflict',
  'Fix Max Daily Periods',
  'Fix Room Capacity',
  'Fix Exclusive Room',
  'Change Time Slot and Room',
  'Change Time Slot',
  'Change Room',
  'Swap Classes',
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

function cloneState(state: TimetableState): TimetableState {
  return {
    ...state,
    schedule: state.schedule.map((entry: ScheduleEntry) => ({ ...entry })),
  };
}

function buildCommonBaseConfig(maxIterations: number): SAConfig<TimetableState> {
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
    intensificationIterations: 2000,
    maxIntensificationAttempts: 3,
    intensificationStagnationLimit: 300,
    operatorSelectionMode: 'hybrid',
    logging: { enabled: false },
  };
}

function buildPhase15OffConfig(maxIterations: number): SAConfig<TimetableState> {
  return {
    ...buildCommonBaseConfig(maxIterations),
    enableIntensification: false,
  };
}

function buildPhase15LegacyConfig(maxIterations: number): SAConfig<TimetableState> {
  return {
    ...buildCommonBaseConfig(maxIterations),
    enableIntensification: true,
    intensificationStartTemperatureMode: 'initial-reset',
    intensificationStartTempMultiplier: 1.0,
    intensificationStartTempCapRatio: 1.0,
    intensificationUseTabu: false,
    intensificationTargetedOperatorNames: ALL_MOVE_OPERATOR_NAMES,
    intensificationTargetedSelectionRate: 0.7,
    intensificationEarlyStopNoBestImproveIterations: 1_000_000_000,
    intensificationBudgetFractionOfMaxIterations: 1.0,
  };
}

function buildPhase15TunedConfig(
  maxIterations: number,
  tunedBudgetFraction: number
): SAConfig<TimetableState> {
  return {
    ...buildCommonBaseConfig(maxIterations),
    enableIntensification: true,
    intensificationStartTemperatureMode: 'phase1-end',
    intensificationStartTempMultiplier: 1.0,
    intensificationStartTempCapRatio: 1.0,
    intensificationUseTabu: true,
    intensificationTargetedOperatorNames: TARGETED_REPAIR_OPERATORS,
    intensificationTargetedSelectionRate: 0.7,
    intensificationEarlyStopNoBestImproveIterations: 800,
    intensificationBudgetFractionOfMaxIterations: tunedBudgetFraction,
  };
}

function createCellDefinitions(
  maxIterations: number,
  tunedBudgetFractions: number[]
): CellDefinition[] {
  const cells: CellDefinition[] = [
    {
      id: 'off',
      label: 'Phase15 OFF',
      variant: 'phase15-off',
      maxIterations,
      tunedBudgetFraction: null,
      config: buildPhase15OffConfig(maxIterations),
    },
    {
      id: 'legacy',
      label: 'Phase15 Legacy',
      variant: 'phase15-legacy',
      maxIterations,
      tunedBudgetFraction: null,
      config: buildPhase15LegacyConfig(maxIterations),
    },
  ];

  for (const budgetFraction of tunedBudgetFractions) {
    const key = budgetFraction.toFixed(2).replace('.', 'p');
    cells.push({
      id: `tuned-${key}`,
      label: `Phase15 Tuned (budget=${budgetFraction.toFixed(2)})`,
      variant: 'phase15-tuned',
      maxIterations,
      tunedBudgetFraction: budgetFraction,
      config: buildPhase15TunedConfig(maxIterations, budgetFraction),
    });
  }

  return cells;
}

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

async function withSeededRandom<T>(seed: number, fn: () => Promise<T> | T): Promise<T> {
  const originalRandom = Math.random;
  Math.random = createSeededRandom(seed);
  try {
    return await fn();
  } finally {
    Math.random = originalRandom;
  }
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx]!;
}

function medianNullable(values: Array<number | null>): number | null {
  const numeric = values.filter((value): value is number => value !== null);
  return numeric.length === 0 ? null : median(numeric);
}

function percentileNullable(values: Array<number | null>, p: number): number | null {
  const numeric = values.filter((value): value is number => value !== null);
  return numeric.length === 0 ? null : percentile(numeric, p);
}

async function runSolver(
  initialState: TimetableState,
  cell: CellDefinition,
  trial: number,
  initialSeed: number,
  solverSeed: number
): Promise<RunResult> {
  const solution = await withSeededRandom(solverSeed, async () => {
    const solver = new SimulatedAnnealing(
      cloneState(initialState),
      createConstraints(),
      createMoveGenerators(),
      cell.config
    );
    return solver.solve();
  });

  return {
    cellId: cell.id,
    variant: cell.variant,
    trial,
    tierMaxIterations: cell.maxIterations,
    tunedBudgetFraction: cell.tunedBudgetFraction,
    initialSeed,
    solverSeed,
    runtimeMs: solution.diagnostics?.phaseTimings.totalRuntimeMs ?? 0,
    fitness: solution.fitness,
    hardViolations: solution.hardViolations,
    softViolations: solution.softViolations,
    isFeasible: solution.hardViolations === 0,
    diagnostics: solution.diagnostics!,
  };
}

function summarize(results: RunResult[]): SummaryStats {
  const feasibleResults = results.filter((result) => result.isFeasible);
  const phase15Improved = results.filter(
    (result) => (result.diagnostics.intensification.phase15BestHardDelta ?? 0) < 0
  ).length;
  const phase15NoChange = results.filter(
    (result) =>
      result.diagnostics.intensification.triggered &&
      result.diagnostics.intensification.phase15BestHardDelta === 0
  ).length;
  const phase15RuntimeOnly = results.filter((result) => {
    const intensification = result.diagnostics.intensification;
    return (
      intensification.triggered &&
      intensification.phase15BestHardDelta === 0 &&
      result.diagnostics.phaseTimings.phase15Ms > 0
    );
  }).length;
  const triggeredRuns = results.filter((result) => result.diagnostics.intensification.triggered).length;

  return {
    runs: results.length,
    feasibleRuns: feasibleResults.length,
    feasibilityRate: results.length === 0 ? 0 : (feasibleResults.length / results.length) * 100,
    runtimeMedianMs: median(results.map((result) => result.runtimeMs)),
    runtimeP95Ms: percentile(results.map((result) => result.runtimeMs), 95),
    phase15MedianMs: median(results.map((result) => result.diagnostics.phaseTimings.phase15Ms)),
    phase15P95Ms: percentile(results.map((result) => result.diagnostics.phaseTimings.phase15Ms), 95),
    finalFitnessMedian: median(results.map((result) => result.fitness)),
    feasibleOnlyFinalFitnessMedian:
      feasibleResults.length === 0 ? null : median(feasibleResults.map((result) => result.fitness)),
    finalHardMedian: median(results.map((result) => result.hardViolations)),
    finalSoftMedian: median(results.map((result) => result.softViolations)),
    bestHardAfterPhase1Median: median(
      results.map((result) => result.diagnostics.feasibility.bestHardViolationsAfterPhase1)
    ),
    bestHardAfterPhase15Median: median(
      results.map((result) => result.diagnostics.feasibility.bestHardViolationsAfterPhase15)
    ),
    timeToFirstFeasibleMedianMs: medianNullable(
      results.map((result) => result.diagnostics.feasibility.timeToFirstFeasibleMs)
    ),
    timeToFirstFeasibleP95Ms: percentileNullable(
      results.map((result) => result.diagnostics.feasibility.timeToFirstFeasibleMs),
      95
    ),
    phase15ImprovedBestHardRate: results.length === 0 ? 0 : (phase15Improved / results.length) * 100,
    phase15NoChangeRate: results.length === 0 ? 0 : (phase15NoChange / results.length) * 100,
    phase15RuntimeOnlyRate: results.length === 0 ? 0 : (phase15RuntimeOnly / results.length) * 100,
    phase15TriggeredRate: results.length === 0 ? 0 : (triggeredRuns / results.length) * 100,
    attemptsMedian: median(results.map((result) => result.diagnostics.intensification.attemptsRun)),
    iterationsMedian: median(results.map((result) => result.diagnostics.intensification.iterationsRun)),
    budgetUsedMedian: median(
      results.map((result) => result.diagnostics.intensification.phase15BudgetUsedIterations)
    ),
    budgetLimitMedian: median(
      results.map((result) => result.diagnostics.intensification.phase15BudgetLimitIterations)
    ),
  };
}

function compareAgainstBaseline(
  baselineResults: RunResult[],
  candidateResults: RunResult[]
): PairwiseDelta {
  if (baselineResults.length !== candidateResults.length) {
    throw new Error(
      `Cannot compare paired results with different lengths: ${baselineResults.length} vs ${candidateResults.length}`
    );
  }

  let rescueCount = 0;
  let regressCount = 0;

  for (let i = 0; i < baselineResults.length; i++) {
    const baseline = baselineResults[i]!;
    const candidate = candidateResults[i]!;
    if (!baseline.isFeasible && candidate.isFeasible) rescueCount++;
    if (baseline.isFeasible && !candidate.isFeasible) regressCount++;
  }

  return {
    feasibilityDeltaPp:
      (candidateResults.filter((result) => result.isFeasible).length / candidateResults.length) * 100 -
      (baselineResults.filter((result) => result.isFeasible).length / baselineResults.length) * 100,
    runtimeMedianDeltaMs:
      median(candidateResults.map((result) => result.runtimeMs)) -
      median(baselineResults.map((result) => result.runtimeMs)),
    runtimeP95DeltaMs:
      percentile(candidateResults.map((result) => result.runtimeMs), 95) -
      percentile(baselineResults.map((result) => result.runtimeMs), 95),
    rescueCount,
    rescueRate: baselineResults.length === 0 ? 0 : (rescueCount / baselineResults.length) * 100,
    regressCount,
    regressRate: baselineResults.length === 0 ? 0 : (regressCount / baselineResults.length) * 100,
  };
}

function printSummary(label: string, summary: SummaryStats): void {
  console.log(`\n=== ${label} ===`);
  console.log(`runs: ${summary.runs}`);
  console.log(`feasible runs: ${summary.feasibleRuns}/${summary.runs} (${summary.feasibilityRate.toFixed(2)}%)`);
  console.log(`runtime median (s): ${(summary.runtimeMedianMs / 1000).toFixed(2)}`);
  console.log(`runtime p95 (s): ${(summary.runtimeP95Ms / 1000).toFixed(2)}`);
  console.log(`phase15 median (s): ${(summary.phase15MedianMs / 1000).toFixed(2)}`);
  console.log(`phase15 p95 (s): ${(summary.phase15P95Ms / 1000).toFixed(2)}`);
  console.log(`final fitness median: ${summary.finalFitnessMedian.toFixed(2)}`);
  console.log(
    `feasible-only fitness median: ${summary.feasibleOnlyFinalFitnessMedian === null ? 'n/a' : summary.feasibleOnlyFinalFitnessMedian.toFixed(2)}`
  );
  console.log(`final hard median: ${summary.finalHardMedian.toFixed(2)}`);
  console.log(`final soft median: ${summary.finalSoftMedian.toFixed(2)}`);
  console.log(`best hard after phase1 median: ${summary.bestHardAfterPhase1Median.toFixed(2)}`);
  console.log(`best hard after phase15 median: ${summary.bestHardAfterPhase15Median.toFixed(2)}`);
  console.log(
    `time-to-first-feasible median (s): ${summary.timeToFirstFeasibleMedianMs === null ? 'n/a' : (summary.timeToFirstFeasibleMedianMs / 1000).toFixed(2)}`
  );
  console.log(
    `time-to-first-feasible p95 (s): ${summary.timeToFirstFeasibleP95Ms === null ? 'n/a' : (summary.timeToFirstFeasibleP95Ms / 1000).toFixed(2)}`
  );
  console.log(`phase15 triggered rate: ${summary.phase15TriggeredRate.toFixed(2)}%`);
  console.log(`phase15 improved best-hard rate: ${summary.phase15ImprovedBestHardRate.toFixed(2)}%`);
  console.log(`phase15 no-change rate: ${summary.phase15NoChangeRate.toFixed(2)}%`);
  console.log(`phase15 runtime-only rate: ${summary.phase15RuntimeOnlyRate.toFixed(2)}%`);
  console.log(`phase15 attempts median: ${summary.attemptsMedian.toFixed(2)}`);
  console.log(`phase15 iterations median: ${summary.iterationsMedian.toFixed(2)}`);
  console.log(`phase15 budget used median: ${summary.budgetUsedMedian.toFixed(2)}`);
  console.log(`phase15 budget limit median: ${summary.budgetLimitMedian.toFixed(2)}`);
}

function printDelta(label: string, delta: PairwiseDelta): void {
  console.log(`\n--- Delta vs OFF: ${label} ---`);
  console.log(`feasibility delta (pp): ${delta.feasibilityDeltaPp.toFixed(2)}`);
  console.log(`runtime median delta (s): ${(delta.runtimeMedianDeltaMs / 1000).toFixed(2)}`);
  console.log(`runtime p95 delta (s): ${(delta.runtimeP95DeltaMs / 1000).toFixed(2)}`);
  console.log(`rescue count: ${delta.rescueCount} (${delta.rescueRate.toFixed(2)}%)`);
  console.log(`regress count: ${delta.regressCount} (${delta.regressRate.toFixed(2)}%)`);
}

function parseNumberArg(name: string, defaultValue: number): number {
  const arg = process.argv.find((entry) => entry.startsWith(`--${name}=`));
  if (!arg) return defaultValue;
  const value = Number(arg.split('=')[1]);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Invalid --${name} value: ${value}`);
  }
  return value;
}

function parseStringArg(name: string, defaultValue: string): string {
  const arg = process.argv.find((entry) => entry.startsWith(`--${name}=`));
  return arg ? arg.slice(name.length + 3) : defaultValue;
}

function parseIntegerListArg(name: string, defaultValues: number[]): number[] {
  const arg = process.argv.find((entry) => entry.startsWith(`--${name}=`));
  if (!arg) return defaultValues;
  const values = arg
    .slice(name.length + 3)
    .split(',')
    .map((entry) => Number(entry.trim()))
    .filter((value) => Number.isFinite(value));
  if (
    values.length === 0 ||
    values.some((value) => !Number.isInteger(value) || value <= 0)
  ) {
    throw new Error(`Invalid --${name} value: ${arg}`);
  }
  return values;
}

function parseFractionListArg(name: string, defaultValues: number[]): number[] {
  const arg = process.argv.find((entry) => entry.startsWith(`--${name}=`));
  if (!arg) return defaultValues;
  const values = arg
    .slice(name.length + 3)
    .split(',')
    .map((entry) => Number(entry.trim()))
    .filter((value) => Number.isFinite(value));
  if (
    values.length === 0 ||
    values.some((value) => value <= 0 || value > 1)
  ) {
    throw new Error(`Invalid --${name} value: ${arg}`);
  }
  return values;
}

function parseTierIterations(): number[] {
  const single = process.argv.find((entry) => entry.startsWith('--iterations='));
  if (single) {
    const value = Number(single.split('=')[1]);
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`Invalid --iterations value: ${value}`);
    }
    return [value];
  }
  return parseIntegerListArg('iteration-tiers', DEFAULT_TIER_ITERATIONS);
}

async function createSeedState(data: TimetablingData, initialSeed: number): Promise<TimetableState> {
  return withSeededRandom(initialSeed, async () =>
    generateInitialSolution(data, { randomize: true })
  );
}

async function runTier(
  maxIterations: number,
  runs: number,
  baseSeed: number,
  tunedBudgetFractions: number[],
  data: TimetablingData
): Promise<TierArtifact> {
  const cells = createCellDefinitions(maxIterations, tunedBudgetFractions);
  const resultsByCell = new Map<string, RunResult[]>();
  const trials: TrialRecord[] = [];

  for (const cell of cells) {
    resultsByCell.set(cell.id, []);
  }

  console.log(`\n==============================`);
  console.log(`Tier maxIterations=${maxIterations}`);
  console.log(`cells: ${cells.map((cell) => cell.id).join(', ')}`);

  for (let i = 0; i < runs; i++) {
    const trial = i + 1;
    const initialSeed = baseSeed + maxIterations * 10_000 + i * 1000;
    const solverSeed = initialSeed + 1;
    const seedState = await createSeedState(data, initialSeed);

    console.log(`\nTrial ${trial}/${runs} (initialSeed=${initialSeed}, solverSeed=${solverSeed})`);
    const trialResults: Record<string, RunResult> = {};

    for (const cell of cells) {
      const run = await runSolver(seedState, cell, trial, initialSeed, solverSeed);
      resultsByCell.get(cell.id)!.push(run);
      trialResults[cell.id] = run;
      console.log(
        `  ${cell.id.padEnd(12)} hard=${run.hardViolations} fit=${run.fitness.toFixed(2)} runtime=${(run.runtimeMs / 1000).toFixed(2)}s phase15Δ=${run.diagnostics.intensification.phase15BestHardDelta ?? 'n/a'}`
      );
    }

    trials.push({
      trial,
      initialSeed,
      solverSeed,
      resultsByCell: trialResults,
    });
  }

  const summaries: Record<string, SummaryStats> = {};
  for (const cell of cells) {
    summaries[cell.id] = summarize(resultsByCell.get(cell.id)!);
    printSummary(`${cell.label} @ maxIter=${maxIterations}`, summaries[cell.id]!);
  }

  const offResults = resultsByCell.get('off')!;
  const deltasVsOff: Record<string, PairwiseDelta> = {};
  for (const cell of cells) {
    if (cell.id === 'off') continue;
    const delta = compareAgainstBaseline(offResults, resultsByCell.get(cell.id)!);
    deltasVsOff[cell.id] = delta;
    printDelta(cell.label, delta);
  }

  return {
    maxIterations,
    cells,
    summaries,
    deltasVsOff,
    trials,
  };
}

async function main(): Promise<void> {
  const runs = parseNumberArg('runs', DEFAULT_RUNS);
  const tierIterations = parseTierIterations();
  const tunedBudgetFractions = parseFractionListArg(
    'tuned-budget-fractions',
    DEFAULT_TUNED_BUDGET_FRACTIONS
  );
  const baseSeed = parseNumberArg('seed', DEFAULT_BASE_SEED);
  const outputPath = resolve(parseStringArg('out', DEFAULT_OUTPUT_PATH));

  const data = loadDataFromExcel('./data_uisi.xlsx');

  console.log('Running Stage-2 intensification matrix benchmark (equal total budget)...');
  console.log(`runs per cell: ${runs}`);
  console.log(`tier iterations: ${tierIterations.join(', ')}`);
  console.log(`tuned budget fractions: ${tunedBudgetFractions.join(', ')}`);
  console.log(`baseSeed: ${baseSeed}`);
  console.log(`output: ${outputPath}`);

  const tiers: TierArtifact[] = [];
  for (const maxIterations of tierIterations) {
    const artifact = await runTier(
      maxIterations,
      runs,
      baseSeed,
      tunedBudgetFractions,
      data
    );
    tiers.push(artifact);
  }

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(
    outputPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        benchmarkType: 'stage2-equal-total-budget',
        config: {
          runs,
          tierIterations,
          tunedBudgetFractions,
          baseSeed,
        },
        tiers,
      },
      null,
      2
    )
  );
}

await main();
