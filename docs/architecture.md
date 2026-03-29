# Internal architecture

This document explains how the implementation is organized internally and how
its major subsystems collaborate during a solve. It is written for maintainers,
researchers, and advanced integrators who need a code-faithful architectural
view rather than a marketing-level overview.

## Architectural summary

`timetable-sa` is a generic TypeScript solver with a narrow public surface and a
relatively rich internal runtime. The architecture is centered on one
orchestrator class, `SimulatedAnnealing<TState>`, supported by small modules for
validation, acceptance rules, operator selection, tabu memory, and telemetry.

The design has four noteworthy properties:

- generic domain modeling through `Constraint<TState>` and
  `MoveGenerator<TState>`,
- eager validation of configuration and shape contracts,
- online adaptation of move-operator selection,
- operational observability through logging and progress callbacks.

## Module map

The core implementation lives under `src/core/` and can be understood as six
collaborating layers.

### Public orchestration layer

`src/core/SimulatedAnnealing.ts` owns the end-to-end lifecycle of a solve.
Every public operation ultimately routes through this class.

Its responsibilities include:

- validating inputs at construction time,
- resolving defaults,
- partitioning hard and soft constraints,
- running the three optimization phases,
- managing tabu screening,
- collecting operator statistics,
- emitting logs and progress callbacks,
- packaging the final `Solution<TState>`.

### Validation layer

The validation layer consists of two focused modules.

- `src/core/validation/ConfigValidator.ts` validates constructor inputs and
  resolves defaults.
- `src/core/validation/ConstraintValidator.ts` validates runtime constraint
  scores.

The layer is conservative and fail-fast, but it does not attempt deep semantic
verification such as determinism checks or cross-field optimization advice.

### Policy layer

The policy layer encapsulates small decision functions rather than full
framework-style plug-in abstractions.

- `src/core/policies/AcceptancePolicy.ts` computes acceptance probabilities.
- `src/core/policies/OperatorSelectionPolicy.ts` implements hybrid and
  roulette-wheel operator selection.

This separation keeps acceptance and selection logic testable and independent of
the rest of the solver state machine.

### Tabu layer

The tabu layer provides state-signature generation and bounded short-term
memory.

- `src/core/tabu/StateSignature.ts` generates deterministic signatures.
- `src/core/tabu/TabuMemory.ts` stores recent signatures and applies aspiration
  logic.

### Telemetry layer

The telemetry layer is split between logging and callback reporting.

- `src/core/telemetry/Logger.ts` emits structured log lines to console and or
  file.
- `src/core/telemetry/ProgressReporter.ts` tracks progress counters and safely
  invokes callbacks.

### Type and error layer

Type and error definitions formalize the public and internal contracts.

- `src/core/types/` defines `Solution`, `Violation`, and `ProgressStats`.
- `src/core/interfaces/` defines `Constraint`, `MoveGenerator`, and
  `SAConfig`.
- `src/core/errors.ts` defines the explicit error taxonomy.
- `src/core/engine/EngineTypes.ts` defines internal resolved types and progress
  phase names.

## Solve pipeline

The easiest way to understand the architecture is to follow one `solve()` call.

### 1. Construction stage

Before solving begins, the constructor performs static setup.

```text
constructor(...)
  -> validateSolverInputs(...)
  -> partition constraints into hard and soft sets
  -> mergeConfigWithDefaults(...)
  -> create Logger
  -> create TabuMemory
  -> initialize operatorStats
```

This stage establishes the immutable problem definition for the instance.

### 2. Runtime reset stage

At the beginning of `solve()`, the solver resets runtime-only state.

It clears or resets:

- tabu memory,
- progress-reporter state,
- hard-constraint hint cache,
- hard-breakdown logging cache,
- per-operator counters.

This is why repeated solves on the same instance start from the same initial
problem definition but not from leftover runtime state.

### 3. Initial evaluation stage

The solver clones the initial state, computes its fitness and violations, logs
the initial summary, and optionally emits an initial progress callback.

Architecturally, this stage performs two roles:

- it establishes baseline telemetry, and
- it seeds the incumbent `currentState` and `bestState`.

### 4. Phase execution stage

The orchestration layer then moves through Phase 1, optional intensification,
and Phase 2.

Each phase reuses lower-level services but applies them differently.

- neighbor generation is reused across phases,
- acceptance rules differ by phase,
- progress telemetry is reused but phase-tagged,
- tabu logic is reusable and phase-agnostic.

### 5. Packaging stage

At the end, `createSolution(...)` recomputes the final violation set from the
best state, counts hard and soft violations from that set, logs completion, and
returns the structured result.

The architectural point is important: final counts are derived from the
materialized `Violation[]`, not from stale counters accumulated during search.

## Data model and contracts

The solver's architecture depends on a small number of contracts that every
integration must satisfy.

### Constraint contract

`Constraint<TState>` models satisfaction, not penalty.

```text
score in [0, 1]
1 = satisfied
0 = violated
```

This single design choice propagates through the entire architecture:

- fitness computation uses `1 - score`,
- violation materialization uses `score < 1`,
- runtime validation rejects non-finite or out-of-range scores.

### Move generator contract

The engine clones a state before calling `generate(...)`. This means the move
generator contract is mutation-friendly even though the public API looks pure.

That decision simplifies operator implementations and centralizes cloning policy
in configuration.

### Configuration contract

`SAConfig<TState>` is partially required and partially defaulted.

The architecture separates:

- validation, handled by `validateSolverInputs(...)`, from
- default resolution, handled by `mergeConfigWithDefaults(...)`.

This split avoids mixing user-facing diagnostics with internal convenience.

## Fitness and violation architecture

Fitness evaluation and violation reporting are related but distinct subsystems.

### Fitness path

`calculateFitnessAndViolations(...)` computes two things:

- scalar `fitness`,
- integer `hardViolations`.

The function iterates through hard constraints first, then soft constraints.
For hard constraints, it aggregates both fractional penalty and a discrete
violation count. For soft constraints, it aggregates only weighted penalty.

### Violation-reporting path

`getViolations(...)` constructs `Violation[]` records for both hard and soft
constraints.

The architectural split is intentional:

- search decisions need fast scalar and count summaries,
- final reporting needs human-readable diagnostic structure.

Because these paths are separate, advanced users should implement
`getViolations()` when they need discrete multiplicity to match the real-world
problem semantics.

## Phase architecture

The solver is not a single homogeneous loop. Each phase specializes the search
process around a different objective.

### Phase 1 as feasibility engine

Phase 1 is structurally biased toward feasibility.

- it caps itself at 60 percent of the total iteration budget,
- it terminates once `bestHardViolations` reaches zero,
- it uses targeted operator selection when possible,
- it forbids acceptance of moves that worsen hard-violation count.

### Phase 1.5 as bounded intensification engine

Phase 1.5 is a separate sub-engine with its own temperature variable,
acceptance logic, and stagnation counter.

This is architecturally important because intensification is not simply a flag
inside the main loop. It is a standalone procedure with restart semantics.

### Phase 2 as constrained refinement engine

Phase 2 reuses much of the main-loop structure but changes the acceptance
baseline from `currentHardViolations` to `bestHardViolations`.

This design lets the solver continue exploring while protecting the best
hard-feasibility boundary achieved so far.

## Operator adaptation architecture

Operator adaptation is a light online-learning subsystem rather than a full
reinforcement-learning module.

### Statistics model

Each operator has four counters:

- `attempts`,
- `improvements`,
- `accepted`,
- `successRate`.

The counters are updated incrementally after every selection and every accepted
move. `successRate` is recomputed as `improvements / attempts`.

### Selection model

`OperatorSelectionPolicy` uses smoothed success rates with `alpha = 1` and
`beta = 2`, which provides modest exploration pressure for operators with low
sample counts.

In hybrid mode, a 30 percent random branch is preserved indefinitely. There is
no warm-up stage followed by a pure exploitation stage.

## Hard-constraint hinting architecture

One of the more domain-aware parts of the architecture is the hard-fix hinting
system in `generateNeighbor(...)`.

### Cache design

The solver caches a `Set<string>` of violated hard-constraint names for 50
iterations.

This cache avoids recomputing the violated hard-constraint set on every
iteration, which is a useful compromise between reactivity and cost.

### Heuristic design

The architecture uses string-matching heuristics rather than formal metadata.
It compares lowercased constraint names against lowercased operator names and
prefers combinations that appear semantically aligned.

This makes the system simple and practical, but it also means naming conventions
matter.

## Tabu architecture

The tabu subsystem is intentionally minimal and composable.

### Storage strategy

The backing store is a `Map<string, number>`, where the value is the insertion
iteration.

This representation has two benefits:

- membership tests are O(1) on average,
- cleanup can be based on relative age without additional metadata.

### Signature strategy

The signature subsystem uses a cascading strategy:

- custom domain signature when provided,
- compact `schedule`-based signature for timetable-like states,
- deterministic generic serialization otherwise.

Architecturally, this improves portability across domains without forcing a
single canonical state layout.

### Failure strategy

If signature generation cannot be made deterministic, the solver throws a plain
`Error` asking the caller to supply `getStateSignature(...)`.

This is one of the few places where failure bypasses the `SAError` hierarchy.

## Telemetry architecture

Observability is built into the runtime rather than layered on afterward.

### Logger design

`Logger` is synchronous and intentionally simple.

- it sanitizes nested data,
- it redacts sensitive keys such as `password`, `secret`, `token`, and related
  variants,
- it writes human-readable log lines,
- it creates parent directories automatically for file output.

The logger does not implement batching, structured transport abstractions, or
async I/O. Its design favors predictability over maximal throughput.

### Progress reporter design

`ProgressReporter` maintains mutable internal counters independent of solver
state objects.

This subsystem tracks:

- accepted and rejected moves,
- stagnation count,
- iteration of the best cost,
- current phase,
- tabu hits,
- last progress iteration,
- initial cost.

This separation makes callback reporting cheap and avoids coupling telemetry to
the domain state representation.

### Error isolation

Progress callback failures are isolated from the optimization engine.
Exceptions are caught and forwarded to the logger as warnings.

From an architectural standpoint, telemetry is therefore best-effort, not part
of the correctness-critical path.

## Error architecture

The explicit error taxonomy is small and easy to reason about.

```text
SAError
  -> SAConfigError
  -> ConstraintValidationError
  -> SolveConcurrencyError
```

The taxonomy is used for:

- constructor-time validation failures,
- runtime score-contract violations,
- instance-level concurrency violations.

Not every runtime failure is wrapped into this hierarchy. For example,
user-thrown exceptions from `evaluate()` or failures in fallback signature
generation may propagate as plain `Error` instances.

## Complexity discussion

The codebase does not publish formal asymptotic guarantees, but the dominant
cost per iteration is easy to characterize.

### Time cost

Each accepted or evaluated candidate typically requires:

- one cloned state,
- one move application,
- evaluation of all relevant constraints,
- optional tabu signature generation,
- optional logging and progress checks.

In practical terms, runtime is usually dominated by:

```text
O(iterations * (constraint evaluation + move generation + signature cost))
```

### Space cost

Space consumption is primarily driven by:

- the current and best state objects,
- the tabu map,
- telemetry counters,
- transient strings used for signatures and logs.

## Design consequences for maintainers

The current architecture is compact and effective, but it implies several
maintenance principles.

- Keep score semantics consistent across all docs and tests: higher score means
  better satisfaction.
- Be careful when changing operator names because Phase 1 heuristics depend on
  them.
- Treat progress callbacks as observational and non-authoritative.
- Preserve deterministic signature behavior whenever state structure evolves.
- Prefer adding focused modules over growing `SimulatedAnnealing.ts` further,
  because it already concentrates most orchestration complexity.

## Next steps

For adjacent technical detail, continue with:

- `advanced-features.md` for algorithm behavior and acceptance rules,
- `api-reference.md` for exact public contracts,
- `configuration.md` for parameter defaults and validation rules.
