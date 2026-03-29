# timetable-sa

![](https://img.shields.io/badge/Node.js-18%2B-brightgreen?style=flat-square)
[![npm version](https://img.shields.io/npm/v/timetable-sa.svg?style=flat-square)](https://www.npmjs.com/package/timetable-sa)
![license](https://img.shields.io/badge/license-MIT-blue?style=flat-square)

`timetable-sa` is a generic TypeScript optimization library for
constraint-driven problems. It gives you a production-oriented Simulated
Annealing engine with optional tabu search, aspiration, reheating,
intensification, adaptive operator selection, structured logging, and runtime
progress telemetry.

It is designed for engineers building real optimization systems in scheduling,
timetabling, assignment, packing, allocation, and other state-space search
problems where you want to keep domain logic in your own code while reusing a
robust search engine.

**Learn more in the [documentation hub](https://github.com/albertabayor/timetable-sa-docs).**

## Why `timetable-sa`

The library is generic at the API layer and opinionated at the runtime layer.
You define the domain, and the engine handles the stochastic search mechanics.

- model your problem with `TState`, `Constraint<TState>`, and
  `MoveGenerator<TState>`
- optimize with a multi-phase solver that first pushes toward hard-feasibility
  and then refines total fitness
- instrument runs with `onProgress`, structured logs, and operator statistics
- tune advanced features such as tabu tenure, aspiration, reheating, and
  intensification without rewriting the core search loop

## Get started

Install the package from npm.

```bash
npm install timetable-sa
```

Then define your state, constraints, moves, and config.

```ts
import { SimulatedAnnealing } from 'timetable-sa';
import type { Constraint, MoveGenerator, SAConfig } from 'timetable-sa';

interface State {
  values: number[];
}

const constraints: Constraint<State>[] = [
  {
    name: 'Hard Bound',
    type: 'hard',
    evaluate: (s) => (s.values.reduce((a, b) => a + b, 0) <= 20 ? 1 : 0),
  },
  {
    name: 'Prefer Lower Sum',
    type: 'soft',
    weight: 5,
    evaluate: (s) =>
      Math.max(0, Math.min(1, 1 - s.values.reduce((a, b) => a + b, 0) / 20)),
  },
];

const moves: MoveGenerator<State>[] = [
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

const config: SAConfig<State> = {
  initialTemperature: 1000,
  minTemperature: 0.01,
  coolingRate: 0.995,
  maxIterations: 20000,
  hardConstraintWeight: 10000,
  cloneState: (s) => ({ values: [...s.values] }),
  tabuSearchEnabled: true,
  logging: { enabled: true, level: 'info', logInterval: 1000 },
};

const solver = new SimulatedAnnealing(
  { values: [8, 7, 9] },
  constraints,
  moves,
  config
);

const result = await solver.solve();

console.log({
  fitness: result.fitness,
  hardViolations: result.hardViolations,
  softViolations: result.softViolations,
  iterations: result.iterations,
});
```

## How it works

The solver uses a three-stage optimization lifecycle.

1. Phase 1 reduces hard-constraint violations.
2. Phase 1.5 optionally intensifies the search when hard violations remain.
3. Phase 2 refines total fitness while preserving the best hard-violation
   boundary reached so far.

Internally, the objective is computed as:

```text
fitness(state) = hardConstraintWeight * hardPenalty(state) + softPenalty(state)
```

where hard and soft penalties are derived from normalized constraint
satisfaction scores in `[0, 1]`.

## Documentation

All package documentation now lives in the dedicated docs repository:

- [timetable-sa-docs](https://github.com/albertabayor/timetable-sa-docs)

Use that repository as the source of truth for:

- getting started and quickstart guides,
- configuration and advanced algorithm behavior,
- architecture, API reference, examples, and troubleshooting.

## Public API

The package exports a compact but expressive API surface.

- `SimulatedAnnealing`
- `SAError`, `SAConfigError`, `ConstraintValidationError`,
  `SolveConcurrencyError`
- `Constraint`, `MoveGenerator`, `SAConfig`, `LoggingConfig`
- `Solution`, `Violation`, `OperatorStats`, `ProgressStats`,
  `OnProgressCallback`

## Use cases

`timetable-sa` is especially useful when your problem has:

- hard constraints that must dominate optimization,
- soft preferences that still need measurable improvement,
- a custom state representation that you want to keep fully typed,
- domain-specific repair and perturbation operators,
- a need for observable iterative search rather than opaque black-box solving.

## Development notes

The repository includes source code, tests, and example artifacts used to
validate and evolve the solver implementation.

- source: `src/`
- tests: `tests/`
- examples and scripts: `examples/`, `scripts/`

## License

MIT
