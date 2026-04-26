import { describe, expect, it } from '@jest/globals';
import {
  type CancellationSignal,
  SimulatedAnnealing,
  SolveCancelledError,
} from '../../src/index.js';
import type { Constraint } from '../../src/core/interfaces/Constraint.js';
import type { MoveGenerator } from '../../src/core/interfaces/MoveGenerator.js';
import type { SAConfig } from '../../src/core/interfaces/SAConfig.js';

interface CounterState {
  value: number;
}

interface MutableCancellationSignal extends CancellationSignal {
  aborted: boolean;
}

class AlwaysViolatedHard implements Constraint<CounterState> {
  name = 'Always Violated Hard';
  type = 'hard' as const;

  evaluate(): number {
    return 0;
  }

  getViolations(): string[] {
    return ['Always violated'];
  }
}

class AlwaysSatisfiedHard implements Constraint<CounterState> {
  name = 'Always Satisfied Hard';
  type = 'hard' as const;

  evaluate(): number {
    return 1;
  }
}

class PreferLargeValue implements Constraint<CounterState> {
  name = 'Prefer Large Value';
  type = 'soft' as const;
  weight = 1;

  evaluate(state: CounterState): number {
    return Math.max(0, Math.min(1, state.value / 1000));
  }
}

class IncrementMove implements MoveGenerator<CounterState> {
  name = 'Increment';
  calls = 0;

  constructor(private readonly onGenerate?: (calls: number) => void) {}

  canApply(): boolean {
    return true;
  }

  generate(state: CounterState): CounterState {
    this.calls++;
    this.onGenerate?.(this.calls);
    return { value: state.value + 1 };
  }
}

function createSignal(aborted = false): MutableCancellationSignal {
  return { aborted };
}

function createConfig(
  signal: CancellationSignal,
  overrides: Partial<SAConfig<CounterState>> = {}
): SAConfig<CounterState> {
  return {
    initialTemperature: 100,
    minTemperature: 0.01,
    coolingRate: 0.95,
    maxIterations: 200,
    hardConstraintWeight: 1000,
    cloneState: (state) => ({ ...state }),
    enableIntensification: false,
    logging: {
      enabled: false,
      level: 'error',
      logInterval: 1,
    },
    cancelSignal: signal,
    ...overrides,
  };
}

describe('solver cancellation', () => {
  it('throws SolveCancelledError if the signal is already aborted before start', async () => {
    const signal = createSignal(true);
    const solver = new SimulatedAnnealing(
      { value: 0 },
      [new AlwaysSatisfiedHard()],
      [new IncrementMove()],
      createConfig(signal)
    );

    await expect(solver.solve()).rejects.toBeInstanceOf(SolveCancelledError);
  });

  it('resets isSolving after cancellation so the same instance can solve again', async () => {
    const signal = createSignal(true);
    const solver = new SimulatedAnnealing(
      { value: 0 },
      [new AlwaysSatisfiedHard()],
      [new IncrementMove()],
      createConfig(signal, { maxIterations: 20 })
    );

    await expect(solver.solve()).rejects.toBeInstanceOf(SolveCancelledError);

    signal.aborted = false;
    await expect(solver.solve()).resolves.toMatchObject({
      state: expect.any(Object),
      fitness: expect.any(Number),
    });
  });

  it('exits Phase 1 before maxIterations when progress aborts the signal', async () => {
    const signal = createSignal();
    const move = new IncrementMove();
    const solver = new SimulatedAnnealing(
      { value: 0 },
      [new AlwaysViolatedHard()],
      [move],
      createConfig(signal, {
        maxIterations: 500,
        onProgress: (iteration, _cost, _temperature, _state, stats) => {
          if (stats.phase === 'phase1' && iteration >= 1) {
            signal.aborted = true;
          }
        },
      })
    );

    await expect(solver.solve()).rejects.toBeInstanceOf(SolveCancelledError);
    expect(move.calls).toBeGreaterThan(0);
    expect(move.calls).toBeLessThan(500);
  });

  it('exits Phase 1.5 during intensification when the signal is aborted', async () => {
    const signal = createSignal();
    const move = new IncrementMove((calls) => {
      if (calls >= 50) {
        signal.aborted = true;
      }
    });
    const solver = new SimulatedAnnealing(
      { value: 0 },
      [new AlwaysViolatedHard()],
      [move],
      createConfig(signal, {
        enableIntensification: true,
        maxIterations: 500,
        intensificationIterations: 200,
        maxIntensificationAttempts: 2,
      })
    );

    await expect(solver.solve()).rejects.toBeInstanceOf(SolveCancelledError);
    expect(solver.getDiagnostics().intensification.triggered).toBe(true);
    expect(move.calls).toBeGreaterThanOrEqual(50);
    expect(move.calls).toBeLessThan(500);
  });

  it('exits Phase 2 during soft optimization when progress aborts the signal', async () => {
    const signal = createSignal();
    const move = new IncrementMove();
    const solver = new SimulatedAnnealing(
      { value: 0 },
      [new AlwaysSatisfiedHard(), new PreferLargeValue()],
      [move],
      createConfig(signal, {
        maxIterations: 100,
        onProgress: (iteration, _cost, _temperature, _state, stats) => {
          if (stats.phase === 'phase2' && iteration >= 1) {
            signal.aborted = true;
          }
        },
      })
    );

    await expect(solver.solve()).rejects.toBeInstanceOf(SolveCancelledError);
    expect(move.calls).toBeGreaterThan(0);
    expect(move.calls).toBeLessThan(100);
  });

  it('still swallows normal onProgress callback errors', async () => {
    const signal = createSignal();
    const solver = new SimulatedAnnealing(
      { value: 0 },
      [new AlwaysSatisfiedHard(), new PreferLargeValue()],
      [new IncrementMove()],
      createConfig(signal, {
        maxIterations: 20,
        onProgress: (iteration) => {
          if (iteration === 1) {
            throw new Error('Progress write failed');
          }
        },
      })
    );

    await expect(solver.solve()).resolves.toMatchObject({
      state: expect.any(Object),
      fitness: expect.any(Number),
    });
  });

  it('observes abort after an awaited progress callback before generating a move', async () => {
    const signal = createSignal();
    const move = new IncrementMove();
    const solver = new SimulatedAnnealing(
      { value: 0 },
      [new AlwaysViolatedHard()],
      [move],
      createConfig(signal, {
        onProgress: async (iteration) => {
          if (iteration === 0) {
            signal.aborted = true;
          }
        },
      })
    );

    await expect(solver.solve()).rejects.toBeInstanceOf(SolveCancelledError);
    expect(move.calls).toBe(0);
  });

  it('does not resolve with a final Solution after cancellation', async () => {
    const signal = createSignal(true);
    const solver = new SimulatedAnnealing(
      { value: 0 },
      [new AlwaysSatisfiedHard()],
      [new IncrementMove()],
      createConfig(signal)
    );

    let resolved = false;
    await expect(
      solver.solve().then(() => {
        resolved = true;
      })
    ).rejects.toBeInstanceOf(SolveCancelledError);
    expect(resolved).toBe(false);
  });

  it('validates cancelSignal shape', () => {
    expect(
      () =>
        new SimulatedAnnealing(
          { value: 0 },
          [new AlwaysSatisfiedHard()],
          [new IncrementMove()],
          createConfig({ aborted: 'false' } as unknown as CancellationSignal)
        )
    ).toThrow(/cancelSignal must have an aborted boolean property/);
  });
});
