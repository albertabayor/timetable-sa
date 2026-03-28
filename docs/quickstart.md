# Quick Start

This page walks through the smallest complete setup that can solve a
constraint-driven problem with `timetable-sa`. The example is intentionally
small, but it uses the same API shape that larger production integrations use.

## 1. Define the state

Your state type is the full candidate solution seen by constraints and move
generators.

```ts
type Assignment = { task: string; worker: string; slot: number };

interface State {
  assignments: Assignment[];
}
```

## 2. Define constraints

Each constraint returns a satisfaction score in `[0, 1]`, where `1` means the
state satisfies the constraint.

```ts
import type { Constraint } from 'timetable-sa';

class NoWorkerCollision implements Constraint<State> {
  name = 'No Worker Collision';
  type = 'hard' as const;

  evaluate(state: State): number {
    for (let i = 0; i < state.assignments.length; i++) {
      for (let j = i + 1; j < state.assignments.length; j++) {
        const a = state.assignments[i]!;
        const b = state.assignments[j]!;
        if (a.worker === b.worker && a.slot === b.slot) {
          return 0;
        }
      }
    }
    return 1;
  }
}

class PreferEarlierSlots implements Constraint<State> {
  name = 'Prefer Earlier Slots';
  type = 'soft' as const;
  weight = 10;

  evaluate(state: State): number {
    const avg =
      state.assignments.reduce((sum, a) => sum + a.slot, 0) /
      state.assignments.length;
    return Math.max(0, Math.min(1, 1 - avg / 10));
  }
}
```

## 3. Define a move generator

Move generators receive a clone prepared by the solver, so they can mutate the
provided state directly and return it.

```ts
import type { MoveGenerator } from 'timetable-sa';

class ChangeSlot implements MoveGenerator<State> {
  name = 'Change Slot';

  canApply(state: State): boolean {
    return state.assignments.length > 0;
  }

  generate(state: State): State {
    const idx = Math.floor(Math.random() * state.assignments.length);
    state.assignments[idx]!.slot = Math.floor(Math.random() * 10);
    return state;
  }
}
```

## 4. Configure the solver

The configuration defines temperature, iteration budget, cloning behavior, and
optional advanced features.

```ts
import type { SAConfig } from 'timetable-sa';

const config: SAConfig<State> = {
  initialTemperature: 1000,
  minTemperature: 0.01,
  coolingRate: 0.995,
  maxIterations: 20000,
  hardConstraintWeight: 10000,
  cloneState: (s) => ({
    assignments: s.assignments.map((a) => ({ ...a })),
  }),
  tabuSearchEnabled: true,
  logging: { enabled: true, level: 'info', logInterval: 1000 },
};
```

## 5. Solve the problem

Create an initial state, instantiate the solver, and await `solve()`.

```ts
import { SimulatedAnnealing } from 'timetable-sa';

const initialState: State = {
  assignments: [
    { task: 'A', worker: 'Alice', slot: 0 },
    { task: 'B', worker: 'Bob', slot: 0 },
    { task: 'C', worker: 'Alice', slot: 0 },
  ],
};

const solver = new SimulatedAnnealing(
  initialState,
  [new NoWorkerCollision(), new PreferEarlierSlots()],
  [new ChangeSlot()],
  config
);

const solution = await solver.solve();

console.log({
  fitness: solution.fitness,
  hardViolations: solution.hardViolations,
  softViolations: solution.softViolations,
  iterations: solution.iterations,
});
```

## 6. Inspect the result

The returned `Solution<TState>` contains more than the final state.

- `solution.state` is the best state found,
- `solution.fitness` is the final scalar objective,
- `solution.violations` contains structured diagnostic records,
- `solution.operatorStats` shows how each move generator performed.

## What to build next

Once the minimal flow works, the most valuable improvements are usually:

1. add more targeted move generators,
2. implement `getViolations()` on important hard constraints,
3. tune `hardConstraintWeight`, tabu, and intensification settings,
4. add `onProgress` telemetry for observability.

## Next steps

To deepen the integration:

- read `core-concepts.md` for the exact contracts,
- read `configuration.md` for tuning strategy,
- read `api-reference.md` for the full public surface.
