# Core Concepts

This guide explains the conceptual model behind `timetable-sa`. It focuses on
the contracts that shape correct integrations: the meaning of `TState`, the
constraint score model, the role of move generators, the fitness decomposition,
and the runtime guarantees the solver provides.

## State

`TState` is the full candidate solution explored by the optimizer. Every
constraint, move generator, progress report, and final solution is defined in
terms of this type.

### Design recommendations

- keep frequently mutated data compact,
- keep static reference data outside the mutable core when possible,
- prefer plain objects and arrays unless a different structure is clearly more
  efficient,
- make cloning predictable and explicit because the solver depends on your
  `cloneState` function.

From a systems perspective, the quality of the state representation strongly
influences both performance and the expressiveness of local moves.

## Constraint contract

Each `Constraint<TState>` returns a normalized satisfaction score.

- `1` means fully satisfied,
- `0` means maximally violated,
- values between `0` and `1` represent partial satisfaction.

Hard and soft constraints use the same score semantics but differ in how the
solver aggregates them into fitness and how phase logic treats them.

### Runtime validation

The solver validates constraint scores at runtime.

- the score must be finite,
- the score must lie in `[0, 1]`.

If either rule is violated, the solver throws `ConstraintValidationError`.

### Diagnostic helpers

Constraints may optionally implement:

- `describe(state)` for one human-readable explanation,
- `getViolations(state)` for a detailed list of violation strings.

If `getViolations()` exists, the solver uses it for richer violation reporting
and more accurate hard-violation counting.

## Move generators

Move generators are neighborhood operators. They define how the solver moves
from one candidate state to a nearby candidate state.

- `canApply(state)` determines whether the operator is currently valid,
- `generate(state, temperature)` receives a solver-prepared clone, mutates it,
  and returns it.

### Practical guidance

- keep moves small enough to preserve local-search structure,
- include at least one exploratory move for diversification,
- add targeted repair operators for dominant hard violations,
- use names intentionally because Phase 1 heuristics can favor operators whose
  names suggest specific repair behavior.

## Fitness model

The solver minimizes a scalar objective built from hard and soft penalties.

```text
hardPenalty = sum(1 - hardScore)
softPenalty = sum((1 - softScore) * softWeight)
fitness = hardPenalty * hardConstraintWeight + softPenalty
```

Lower fitness is better.

This design means two things:

- constraint scores are interpreted as satisfaction, not penalty,
- hard feasibility pressure is controlled primarily by
  `hardConstraintWeight`.

## Optimization phases

The runtime is organized into three named phases.

- `phase1`: reduce hard-constraint violations,
- `phase15`: optional intensification if hard violations remain,
- `phase2`: optimize total fitness while preserving the best hard-violation
  boundary found so far.

This architecture separates feasibility-seeking behavior from late-stage
quality refinement.

## Tabu and aspiration

When enabled, tabu search prevents short-term cycling by tracking previously
visited state signatures.

- recent signatures remain tabu for `tabuTenure` iterations,
- tabu states are skipped before acceptance,
- aspiration can override tabu if a candidate improves global best fitness.

If your state is large or structurally complex, a custom `getStateSignature(...)`
function is often worth adding.

## Progress and observability

The solver exposes two built-in observability mechanisms.

- `onProgress` emits structured `ProgressStats` during the run,
- logging supports `console`, `file`, or `both` outputs.

The progress callback is designed for telemetry rather than state transport. In
practice, the callback receives `state = null` for performance reasons.

## Runtime safety guarantees

The implementation provides a small but important set of safety guarantees.

- invalid config numbers are rejected at construction time,
- invalid constraint scores are rejected at runtime,
- one solver instance cannot run overlapping `solve()` calls,
- mutable runtime state is reset for each solve,
- `getStats()` returns a snapshot copy rather than internal mutable state.

## Next steps

If you want to move from concepts to implementation detail:

- read `quickstart.md` for an end-to-end example,
- read `configuration.md` for tuning strategy,
- read `advanced-features.md` for phase logic and algorithm behavior.
