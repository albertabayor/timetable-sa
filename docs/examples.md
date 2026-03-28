# Examples

This page points you to practical example material in the repository and shows
how to use the solver in a minimal generic setting. The goal is to bridge the
gap between the abstract API and the patterns you will actually use in a real
project.

## Repository example

The repository includes a timetabling-oriented example workflow that reflects
the package's original use case while still demonstrating the generic API.

Run it with Bun:

```bash
bun examples/timetabling/example-basic.ts
```

This example demonstrates:

- hard and soft constraint composition,
- targeted and exploratory move operators,
- tabu and reheating behavior,
- file-based logging,
- post-run diagnostics and exported result artifacts.

## Minimal generic example

This example shows the smallest plausible generic setup.

```ts
import { SimulatedAnnealing } from 'timetable-sa';
import type { Constraint, MoveGenerator, SAConfig } from 'timetable-sa';

type S = { values: number[] };

const constraints: Constraint<S>[] = [
  {
    name: 'Hard Sum Bound',
    type: 'hard',
    evaluate: (s) => (s.values.reduce((a, b) => a + b, 0) <= 20 ? 1 : 0),
  },
  {
    name: 'Soft Keep Small',
    type: 'soft',
    weight: 5,
    evaluate: (s) =>
      Math.max(0, Math.min(1, 1 - s.values.reduce((a, b) => a + b, 0) / 20)),
  },
];

const moves: MoveGenerator<S>[] = [
  {
    name: 'Mutate One',
    canApply: (s) => s.values.length > 0,
    generate: (s) => {
      const i = Math.floor(Math.random() * s.values.length);
      s.values[i] = Math.max(0, s.values[i] + (Math.random() < 0.5 ? -1 : 1));
      return s;
    },
  },
];

const config: SAConfig<S> = {
  initialTemperature: 100,
  minTemperature: 0.01,
  coolingRate: 0.995,
  maxIterations: 10000,
  hardConstraintWeight: 1000,
  cloneState: (s) => ({ values: [...s.values] }),
  tabuSearchEnabled: true,
};

const solver = new SimulatedAnnealing({ values: [8, 7, 9] }, constraints, moves, config);
const result = await solver.solve();
```

## What to learn from the examples

The examples are most useful when you read them for design patterns rather than
for domain literals.

- how hard and soft constraints are separated,
- how move generators are kept small and domain-specific,
- how cloning is made explicit,
- how solver diagnostics are used after optimization.

## Benchmark and maintenance scripts

The repository also contains internal benchmark and comparison scripts used
during maintenance and tuning work.

- `scripts/benchmark-sa.ts`
- `scripts/compare-timetabling-configs.ts`

These scripts are useful when you want to compare parameter sets, evaluate
operator strategies, or establish empirical baselines for your own domain.

## Next steps

After reviewing the examples:

- read `testing-guide.md` to validate your own constraints and moves,
- read `configuration.md` to tune the solver for your workload,
- read `benchmarks/baseline-20260328.md` for empirical context.
