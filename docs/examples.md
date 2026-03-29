# Examples

This page keeps the examples simple. Start with one small generic problem, then
adapt the same structure to your own domain.

## Minimal example

This example uses a list of numbers as the state. One hard constraint keeps the
sum at or below a limit, and one soft constraint prefers smaller totals.

```ts
import { SimulatedAnnealing } from 'timetable-sa';
import type { Constraint, MoveGenerator, SAConfig } from 'timetable-sa';

type State = {
  values: number[];
};

const constraints: Constraint<State>[] = [
  {
    name: 'Sum must stay under 20',
    type: 'hard',
    evaluate: (state) =>
      state.values.reduce((sum, value) => sum + value, 0) <= 20 ? 1 : 0,
  },
  {
    name: 'Prefer smaller totals',
    type: 'soft',
    weight: 5,
    evaluate: (state) => {
      const total = state.values.reduce((sum, value) => sum + value, 0);
      return Math.max(0, Math.min(1, 1 - total / 20));
    },
  },
];

const moves: MoveGenerator<State>[] = [
  {
    name: 'Adjust one value',
    canApply: (state) => state.values.length > 0,
    generate: (state) => {
      const index = Math.floor(Math.random() * state.values.length);
      const delta = Math.random() < 0.5 ? -1 : 1;
      state.values[index] = Math.max(0, state.values[index] + delta);
      return state;
    },
  },
];

const config: SAConfig<State> = {
  initialTemperature: 100,
  minTemperature: 0.01,
  coolingRate: 0.995,
  maxIterations: 10000,
  hardConstraintWeight: 1000,
  cloneState: (state) => ({ values: [...state.values] }),
};

const solver = new SimulatedAnnealing(
  { values: [8, 7, 9] },
  constraints,
  moves,
  config
);

const result = await solver.solve();

console.log(result.fitness);
console.log(result.hardViolations);
console.log(result.state);
```

## What this example shows

Use this example to understand the minimum pieces you need:

- a typed state object,
- at least one constraint,
- at least one move generator,
- a `cloneState` function,
- an awaited call to `solve()`.

## Next steps

After this example works, continue with:

- `quickstart.md` for a guided setup,
- `configuration.md` for tuning options,
- `testing-guide.md` for validating your constraints and moves.
