# Introduction

`timetable-sa` is a generic optimization library for constraint-driven search
problems. It packages a production-oriented Simulated Annealing engine behind a
small TypeScript API so you can keep domain modeling in your application while
reusing a solver that already supports tabu memory, intensification, reheating,
adaptive operator selection, and progress telemetry.

## What the library solves

The library is designed for problems that can be expressed as repeated local
search over a mutable candidate state. In practical terms, you provide four
things:

- a typed state model `TState`,
- a set of `Constraint<TState>` definitions,
- a set of `MoveGenerator<TState>` operators,
- an `SAConfig<TState>` object describing runtime behavior.

The engine then searches for low-fitness states by combining randomized
exploration with progressively stronger exploitation.

## Optimization model

The solver minimizes a scalar objective function. Hard and soft constraints use
the same score contract but are aggregated differently.

- every constraint returns a satisfaction score in `[0, 1]`,
- `1` means satisfied,
- values below `1` represent partial or complete violation.

The runtime converts these scores into penalties and combines them into a final
fitness value. Hard penalties are amplified by `hardConstraintWeight`, which is
why the solver naturally prioritizes feasibility before quality refinement.

## Runtime strategy

The implementation uses a multi-phase search strategy rather than a single flat
annealing loop.

- Phase 1 reduces hard-constraint violations.
- Phase 1.5 optionally intensifies search if hard violations remain.
- Phase 2 improves total fitness while preserving the best hard-violation
  boundary reached so far.

This structure makes the library particularly effective for problems where hard
feasibility is not guaranteed at initialization and must be approached through
repair-oriented local moves.

## What the package exports

The public API is intentionally compact.

- `SimulatedAnnealing<TState>` as the main solver class,
- extension interfaces such as `Constraint`, `MoveGenerator`, and `SAConfig`,
- result and telemetry types such as `Solution`, `Violation`, and
  `ProgressStats`,
- typed runtime errors such as `SAConfigError`,
  `ConstraintValidationError`, and `SolveConcurrencyError`.

## What the package does not provide

The library is generic, so several responsibilities remain in consumer code.

- It does not provide domain models.
- It does not ship with industry-specific constraint sets.
- It does not include default move operators for your problem space.
- It does not define seeded randomness or deterministic replay as a built-in
  feature in the current version.

This separation is deliberate. It keeps the solver reusable across many problem
domains without embedding a specific scheduling ontology.

## When to use it

`timetable-sa` is a good fit when you want:

- a local-search optimizer that is easy to embed in a TypeScript codebase,
- explicit control over constraint logic and move design,
- iterative diagnostics such as progress callbacks and operator statistics,
- a middle ground between simple hill climbing and heavyweight solver stacks.

## Next steps

To continue from this conceptual overview:

- read `installation.md` to set up the package,
- read `quickstart.md` for the smallest working example,
- read `core-concepts.md` for the contracts that shape correct integrations.
