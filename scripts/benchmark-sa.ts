import { SimulatedAnnealing } from '../src/index.js';
import type { Constraint, MoveGenerator, SAConfig, ProgressStats } from '../src/index.js';

interface BenchState {
  schedule: { id: string; slot: number; room: number }[];
  slotCount: number;
  roomCount: number;
}

class HardNoConflict implements Constraint<BenchState> {
  name = 'HardNoConflict';
  type = 'hard' as const;

  evaluate(state: BenchState): number {
    let conflicts = 0;
    for (let i = 0; i < state.schedule.length; i++) {
      for (let j = i + 1; j < state.schedule.length; j++) {
        const a = state.schedule[i]!;
        const b = state.schedule[j]!;
        if (a.slot === b.slot && a.room === b.room) conflicts++;
      }
    }
    return conflicts === 0 ? 1 : 1 / (1 + conflicts);
  }
}

class SoftSpread implements Constraint<BenchState> {
  name = 'SoftSpread';
  type = 'soft' as const;
  weight = 10;

  evaluate(state: BenchState): number {
    const usedSlots = new Set(state.schedule.map((s) => s.slot));
    return usedSlots.size / state.slotCount;
  }
}

class ChangeSlot implements MoveGenerator<BenchState> {
  name = 'ChangeSlot';
  canApply(state: BenchState): boolean {
    return state.schedule.length > 0;
  }
  generate(state: BenchState): BenchState {
    const idx = Math.floor(Math.random() * state.schedule.length);
    state.schedule[idx]!.slot = Math.floor(Math.random() * state.slotCount);
    return state;
  }
}

class ChangeRoom implements MoveGenerator<BenchState> {
  name = 'ChangeRoom';
  canApply(state: BenchState): boolean {
    return state.schedule.length > 0;
  }
  generate(state: BenchState): BenchState {
    const idx = Math.floor(Math.random() * state.schedule.length);
    state.schedule[idx]!.room = Math.floor(Math.random() * state.roomCount);
    return state;
  }
}

function createInitialState(itemCount: number, slotCount: number, roomCount: number): BenchState {
  return {
    schedule: Array.from({ length: itemCount }, (_, i) => ({
      id: `C${i}`,
      slot: i % Math.max(1, Math.floor(slotCount / 2)),
      room: i % Math.max(1, Math.floor(roomCount / 2)),
    })),
    slotCount,
    roomCount,
  };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx]!;
}

async function run(): Promise<void> {
  const runs = 10;
  const durations: number[] = [];
  const fitnesses: number[] = [];
  const hardViolations: number[] = [];
  const softViolations: number[] = [];
  const acceptanceRates: number[] = [];
  const tabuHitRatios: number[] = [];

  for (let i = 0; i < runs; i++) {
    const initialState = createInitialState(140, 30, 12);
    let latestStats: ProgressStats | null = null;

    const config: SAConfig<BenchState> = {
      initialTemperature: 5000,
      minTemperature: 0.0001,
      coolingRate: 0.996,
      maxIterations: 6000,
      hardConstraintWeight: 10000,
      cloneState: (state) => ({
        ...state,
        schedule: state.schedule.map((item) => ({ ...item })),
      }),
      tabuSearchEnabled: true,
      tabuTenure: 40,
      aspirationEnabled: true,
      maxTabuListSize: 1200,
      enableIntensification: true,
      intensificationIterations: 800,
      maxIntensificationAttempts: 2,
      logging: { enabled: false },
      onProgress: (_iteration, _cost, _temperature, _state, stats) => {
        latestStats = stats;
      },
      onProgressMode: 'await',
    };

    const solver = new SimulatedAnnealing(
      initialState,
      [new HardNoConflict(), new SoftSpread()],
      [new ChangeSlot(), new ChangeRoom()],
      config
    );

    const start = performance.now();
    const solution = await solver.solve();
    const end = performance.now();

    durations.push(end - start);
    fitnesses.push(solution.fitness);
    hardViolations.push(solution.hardViolations);
    softViolations.push(solution.softViolations);

    const attempts = Object.values(solution.operatorStats).reduce((sum, stat) => sum + stat.attempts, 0);
    const accepted = Object.values(solution.operatorStats).reduce((sum, stat) => sum + stat.accepted, 0);
    acceptanceRates.push(attempts > 0 ? accepted / attempts : 0);
    const tabuHits = latestStats ? (latestStats as ProgressStats).tabuHits : 0;
    tabuHitRatios.push(attempts > 0 ? tabuHits / attempts : 0);
  }

  console.log('=== SA BENCHMARK SUMMARY ===');
  console.log(`runs: ${runs}`);
  console.log(`runtime median (ms): ${median(durations).toFixed(2)}`);
  console.log(`runtime p95 (ms): ${percentile(durations, 95).toFixed(2)}`);
  console.log(`fitness median: ${median(fitnesses).toFixed(4)}`);
  console.log(`fitness p95: ${percentile(fitnesses, 95).toFixed(4)}`);
  console.log(`hard violations median: ${median(hardViolations).toFixed(2)}`);
  console.log(`soft violations median: ${median(softViolations).toFixed(2)}`);
  console.log(`acceptance rate median: ${(median(acceptanceRates) * 100).toFixed(2)}%`);
  console.log(`tabu hit ratio median: ${(median(tabuHitRatios) * 100).toFixed(2)}%`);
}

await run();
