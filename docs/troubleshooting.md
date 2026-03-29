# Troubleshooting

This guide covers the failure modes and operational pathologies that are most
likely to appear when integrating `timetable-sa` into a real optimization
workflow. Each section explains the observed symptom, the code-level cause, and
the most reliable corrective actions.

## `solve()` throws `SolveConcurrencyError`

This error occurs when a second `solve()` call starts before the previous call
on the same solver instance has finished.

### Why it happens

`SimulatedAnnealing<TState>` uses an instance-level `isSolving` guard. The guard
is checked at the start of `solve()` and cleared in a `finally` block.

### How to fix it

- await the current solve before calling `solve()` again,
- create one solver instance per concurrent run,
- avoid sharing a single instance across overlapping async workflows.

### Safe pattern

```ts
const solverA = new SimulatedAnnealing(state, constraints, moves, config);
const solverB = new SimulatedAnnealing(state, constraints, moves, config);

const [solutionA, solutionB] = await Promise.all([
  solverA.solve(),
  solverB.solve(),
]);
```

## `SAConfigError` during construction

`SAConfigError` indicates that the constructor rejected the supplied state,
constraint list, move generators, or configuration.

### Common causes

- `initialState` is `null` or `undefined`,
- a constraint is missing `name`, `type`, or `evaluate`,
- a move generator is missing `name`, `generate`, or `canApply`,
- `coolingRate` is not strictly between `0` and `1`,
- `maxIterations` is not a positive integer,
- an optional numeric field violates its integer or range constraint,
- a soft constraint has a negative `weight`.

### Important non-causes

The current validator does not reject these conditions by itself:

- empty `constraints` arrays,
- empty `moveGenerators` arrays,
- `minTemperature >= initialTemperature`.

If your application requires these invariants, enforce them at the integration
layer.

## `ConstraintValidationError` at runtime

`ConstraintValidationError` indicates that a constraint returned an invalid
score during evaluation.

### Exact trigger

The engine throws this error when `evaluate(state)` returns:

- a non-finite value such as `NaN` or `Infinity`, or
- a finite value outside the interval `[0, 1]`.

### Common misunderstanding

The score is a satisfaction score, not a violation score.

- `1` means satisfied,
- `0` means violated,
- intermediate values mean partial satisfaction.

Returning higher numbers for worse states is a common integration mistake.

### Recommended fix

Normalize every constraint explicitly.

```ts
evaluate(state) {
  const raw = computeSatisfaction(state);
  return Math.max(0, Math.min(1, raw));
}
```

## Constraint evaluation throws a custom error

If your `evaluate()` function throws its own exception, that exception normally
propagates directly. The engine does not automatically wrap arbitrary user code
errors into `ConstraintValidationError`.

### How to handle it

- catch and rethrow with domain-specific context inside the constraint, or
- validate required state invariants before running the solver.

## No progress callbacks are arriving

If `onProgress` is configured but you do not see updates, the issue is often
cadence-related rather than callback-related.

### How callbacks are scheduled

The solver emits progress:

- at iteration `0`,
- every `logging.logInterval` iterations,
- on forced events such as reheating.

### Checklist

- confirm that `onProgress` is actually defined,
- reduce `logging.logInterval` if callbacks are too sparse,
- confirm that the solve is reaching enough iterations,
- confirm that all move generators are not immediately inapplicable.

## Progress callback is slow

If throughput drops dramatically after enabling `onProgress`, the callback is
likely dominating wall-clock time.

### Why it happens

By default, `onProgressMode` is `'await'`, which means the solver waits for the
callback to finish before continuing.

### How to fix it

- switch to `onProgressMode: 'fire-and-forget'`,
- reduce callback side effects,
- batch external writes,
- increase `logging.logInterval` to reduce callback frequency.

### Important implementation detail

The callback receives `state = null`, not a cloned state snapshot. If your code
expects a real state object, it may silently fail or misbehave.

## Progress callback throws errors, but solve continues

This behavior is expected.

### Why it happens

`ProgressReporter` catches callback errors and forwards them to the logger as
warnings. The optimization loop continues because progress telemetry is treated
as observational, not correctness-critical.

### How to debug it

- enable `logging.level: 'warn'` or `'debug'`,
- inspect the callback for rejected promises,
- add explicit application-side error capture if telemetry failure must abort
  the run.

## File logging is not created

If log files are missing, verify the configuration and the runtime environment.

### Checklist

- set `logging.output` to `'file'` or `'both'`,
- set a writable `logging.filePath`,
- confirm the process has permission to write to the target location,
- confirm logging is not disabled with `logging.enabled: false`.

### Implementation detail

The logger creates missing parent directories automatically. If the file still
does not appear, the problem is usually permissions or an unexpected working
directory.

## Solver exits early with very few iterations

Early termination often indicates that the search cannot generate valid
neighbors or that one of the stopping conditions is reached much sooner than
expected.

### Likely causes

- all move generators return `false` from `canApply(...)`,
- `minTemperature` is too high for the chosen `coolingRate`,
- `maxIterations` is too low,
- Phase 1 reaches zero hard violations quickly and Phase 2 cools out fast.

### How to investigate

- add logging at `info` or `debug` level,
- inspect whether any operator attempts are recorded in `operatorStats`,
- verify that move generators remain applicable across the full state space.

## Poor convergence or high variance

High variance across runs is expected to some degree because the solver uses
`Math.random()` internally. Excessive variance usually points to weak move
design, weak scoring gradients, or unstable configuration.

### Corrective actions

- increase `maxIterations`,
- cool more slowly by moving `coolingRate` closer to `1`,
- increase `hardConstraintWeight` if hard feasibility is inconsistent,
- enable tabu search and intensification,
- add more targeted move generators,
- ensure constraints return informative partial-satisfaction scores instead of
  only binary outputs where graded feedback is possible.

## Hard violations do not drop effectively

When hard violations remain stubbornly high, the problem is often not the anneal
schedule alone.

### Likely causes

- `hardConstraintWeight` is too small,
- move generators do not directly repair the dominant violations,
- operator names do not align with the Phase 1 targeting heuristics,
- `getViolations()` is missing, so hard-violation multiplicity is only inferred,
- the problem instance may be infeasible.

### Recommended actions

- increase `hardConstraintWeight`,
- add or rename repair-oriented operators with names like `fix`, `swap`,
  `change`, `capacity`, `lecturer`, or domain-specific equivalents,
- implement `getViolations()` for hard constraints,
- run several independent solves before concluding infeasibility.

## Tabu search does not help

When enabling tabu produces little improvement, the state-signature function is
usually the first thing to inspect.

### Likely causes

- signatures collide because they ignore meaningful state differences,
- signatures are too expensive to compute and add overhead without enough value,
- the tenure is too short to suppress cycling,
- the underlying move set already has low cycling risk.

### Fixes

- implement a domain-specific `getStateSignature(...)`,
- increase `tabuTenure` moderately,
- inspect `tabuHits` through `ProgressStats` to confirm the feature is active.

## Tabu search fails with signature-generation errors

If the solver cannot create a deterministic default signature and no custom
signature function is provided, it throws a plain `Error` asking for
`config.getStateSignature`.

### When this happens

This is most common when the state contains unusual object graphs or structures
that cannot be serialized deterministically by the fallback path.

### Fix

Provide a stable signature that captures only the optimization-relevant parts of
the state.

## Solution quality looks inconsistent with `softViolations`

This is usually a reporting misunderstanding.

### Important distinction

- `fitness` is the weighted optimization objective,
- `softViolations` in `Solution<TState>` is a count of soft-violation records,
- `ProgressStats.softViolations` is also a count, not a weighted soft penalty.

Two solutions can therefore have the same `softViolations` count but very
different `fitness` values.

## Final recommendation

When debugging difficult behavior, inspect the system in this order:

1. verify score semantics and clone correctness,
2. verify move-generator applicability and diversity,
3. verify state-signature quality for tabu,
4. tune annealing and intensification parameters,
5. compare several runs before drawing conclusions from a single trajectory.

## Next steps

If you need more implementation detail after debugging:

- read `api-reference.md` for precise type and error contracts,
- read `configuration.md` for tuning strategy,
- read `advanced-features.md` for the algorithm rules behind these symptoms.
