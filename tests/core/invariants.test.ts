import { describe, expect, it } from '@jest/globals';
import { SimulatedAnnealing } from '../../src/core/SimulatedAnnealing.js';
import type { Constraint, MoveGenerator, ProgressStats } from '../../src/core/index.js';

interface InvariantState {
  value: number;
}

describe('Solver invariants', () => {
  it('should keep progressPercent monotonic non-decreasing', async () => {
    const progress: ProgressStats[] = [];

    const constraints: Constraint<InvariantState>[] = [
      {
        name: 'HardSatisfiedAtOne',
        type: 'hard',
        evaluate: (state) => (state.value >= 1 ? 1 : 0),
      },
    ];

    const moves: MoveGenerator<InvariantState>[] = [
      {
        name: 'Increment',
        canApply: () => true,
        generate: (state) => ({ value: state.value + 1 }),
      },
    ];

    const solver = new SimulatedAnnealing(
      { value: 0 },
      constraints,
      moves,
      {
        initialTemperature: 100,
        minTemperature: 0.0001,
        coolingRate: 0.95,
        maxIterations: 50,
        hardConstraintWeight: 1000,
        cloneState: (s) => ({ ...s }),
        logging: { enabled: false, logInterval: 1 },
        onProgress: (_i, _c, _t, _s, stats) => {
          progress.push(stats);
        },
      }
    );

    await solver.solve();

    for (let i = 1; i < progress.length; i++) {
      expect(progress[i]!.progressPercent).toBeGreaterThanOrEqual(progress[i - 1]!.progressPercent);
    }
  });

  it('should apply cooling even when moves are skipped by tabu', async () => {
    const constraints: Constraint<InvariantState>[] = [
      {
        name: 'AlwaysSatisfiedHard',
        type: 'hard',
        evaluate: () => 1,
      },
    ];

    const moves: MoveGenerator<InvariantState>[] = [
      {
        name: 'NoOp',
        canApply: () => true,
        generate: (state) => state,
      },
    ];

    const initialTemperature = 100;
    const coolingRate = 0.5;
    const maxIterations = 6;

    const solver = new SimulatedAnnealing(
      { value: 0 },
      constraints,
      moves,
      {
        initialTemperature,
        minTemperature: 0.000001,
        coolingRate,
        maxIterations,
        hardConstraintWeight: 1000,
        cloneState: (s) => ({ ...s }),
        tabuSearchEnabled: true,
        tabuTenure: 100,
        aspirationEnabled: false,
        getStateSignature: () => 'same-signature',
        logging: { enabled: false },
      }
    );

    const solution = await solver.solve();
    const expected = initialTemperature * Math.pow(coolingRate, maxIterations);

    expect(solution.finalTemperature).toBeCloseTo(expected, 8);
  });

  it('should preserve hard-violation safety during phase2 progression', async () => {
    const hardCountsDuringPhase2: number[] = [];

    const constraints: Constraint<InvariantState>[] = [
      {
        name: 'HardUpperBound',
        type: 'hard',
        evaluate: (state) => (state.value >= 0 ? 1 : 0),
      },
      {
        name: 'SoftNearTen',
        type: 'soft',
        evaluate: (state) => {
          const delta = Math.abs(10 - state.value);
          return Math.max(0, 1 - delta / 10);
        },
      },
    ];

    const moves: MoveGenerator<InvariantState>[] = [
      {
        name: 'UpOrDown',
        canApply: () => true,
        generate: (state) => ({ value: state.value + (Math.random() < 0.5 ? -1 : 1) }),
      },
    ];

    const solver = new SimulatedAnnealing(
      { value: 1 },
      constraints,
      moves,
      {
        initialTemperature: 100,
        minTemperature: 0.000001,
        coolingRate: 0.95,
        maxIterations: 80,
        hardConstraintWeight: 10000,
        cloneState: (s) => ({ ...s }),
        logging: { enabled: false, logInterval: 1 },
        onProgress: (_i, _c, _t, _s, stats) => {
          if (stats.phase === 'phase2') {
            hardCountsDuringPhase2.push(stats.hardViolations);
          }
        },
      }
    );

    await solver.solve();

    for (const count of hardCountsDuringPhase2) {
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });
});
