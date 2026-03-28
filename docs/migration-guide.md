# Migration Guide

This guide helps you migrate from older, more domain-specific usage patterns to
the current generic solver API. The modern package surface is intentionally more
abstract: the library owns the search engine, while you own the domain model,
constraints, and move operators.

## Migrate constructor usage

Older usage patterns commonly passed domain collections directly into the solver
constructor.

Old pattern:

```ts
new SimulatedAnnealing(rooms, lecturers, classes, config)
```

Current pattern:

```ts
new SimulatedAnnealing(initialState, constraints, moveGenerators, config)
```

The conceptual shift is important. You now encode domain logic explicitly in
`TState`, `Constraint<TState>`, and `MoveGenerator<TState>`.

## Migrate to async solving

`solve()` is asynchronous and returns `Promise<Solution<TState>>`.

Update call sites accordingly.

```ts
const result = await solver.solve();
```

If you previously treated solving as synchronous, you may need to propagate
`async` through service, controller, or CLI layers.

## Migrate the constraint score contract

The current solver expects `Constraint.evaluate(state)` to return a finite
satisfaction score in `[0, 1]`.

- `1` means satisfied,
- `0` means violated,
- intermediate values mean partial satisfaction.

If older code used penalty-style semantics where larger numbers meant worse
states, you must invert or normalize that logic.

## Migrate move-generator assumptions

The current engine clones state before calling `generate(...)`. That means move
generators may mutate the provided working state directly.

This differs from designs where move operators are expected to deep-clone their
input on every call.

## Migrate progress callbacks

If you use `onProgress`, make the callback mode explicit when behavior matters.

```ts
onProgressMode: 'await' | 'fire-and-forget'
```

Also note that the callback receives `state = null` in the current
implementation for performance reasons.

## Migrate logging setup

To log to files, set `logging.output` and `logging.filePath` explicitly.

```ts
logging: {
  enabled: true,
  output: 'file',
  filePath: './logs/sa.log',
}
```

The logger creates parent directories automatically.

## Migrate error handling

If older integration code relied on generic catches, prefer typed catches where
appropriate.

- `SAConfigError`
- `ConstraintValidationError`
- `SolveConcurrencyError`

You should also be aware that user-thrown exceptions from constraint evaluation
can still propagate as plain errors.

## Recommended migration sequence

Use this order to reduce migration risk.

1. Define a typed `TState` that contains the full mutable candidate solution.
2. Move all domain rules into `Constraint` implementations.
3. Implement a fast, deterministic `cloneState`.
4. Port mutation logic into `MoveGenerator` implementations.
5. Add progress callbacks and logging only after the base solve works.
6. Run repeated solves and tune parameters empirically.

## Next steps

Once the migration is complete:

- read `api-reference.md` to verify current contracts,
- read `configuration.md` to tune the new runtime surface,
- read `troubleshooting.md` if the migrated system behaves differently than
  expected.
