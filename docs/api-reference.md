# API reference

This document is the source-of-truth reference for the public API exposed by
`timetable-sa`. It is derived from the implementation in `src/`, not from
planned features, and it focuses on precise runtime behavior, type contracts,
default values, and failure modes.

## Export surface

The package exports one primary class, four error types, and the public type
system that you use to model a domain-specific optimization problem.

```ts
export { SimulatedAnnealing } from './core/index.js';
export {
  SAError,
  SAConfigError,
  ConstraintValidationError,
  SolveConcurrencyError,
} from './core/index.js';
export type {
  Constraint,
  MoveGenerator,
  SAConfig,
  LoggingConfig,
  Solution,
  OperatorStats,
  Violation,
  ProgressStats,
  OnProgressCallback,
} from './core/index.js';
```

## `SimulatedAnnealing<TState>`

`SimulatedAnnealing<TState>` is the main solver class. A solver instance is
stateful at runtime, but its problem definition is fixed after construction:
the initial state, constraints, move generators, and configuration are all
captured in the constructor.

### Constructor

The constructor validates input eagerly, partitions constraints into hard and
soft sets, resolves configuration defaults, initializes logging, and prepares
operator statistics.

```ts
new SimulatedAnnealing<TState>(
  initialState: TState,
  constraints: Constraint<TState>[],
  moveGenerators: MoveGenerator<TState>[],
  config: SAConfig<TState>
)
```

#### Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `initialState` | `TState` | Initial candidate solution. It must not be `null` or `undefined`. |
| `constraints` | `Constraint<TState>[]` | Constraint set used for fitness evaluation and violation reporting. |
| `moveGenerators` | `MoveGenerator<TState>[]` | Neighborhood operators used to generate candidate states. |
| `config` | `SAConfig<TState>` | Annealing, tabu, intensification, logging, and progress settings. |

#### Constructor behavior

The constructor performs these operations in order:

1. It calls `validateSolverInputs(...)`.
2. It stores the original arrays and partitions constraints into hard and soft
   subsets.
3. It resolves defaults with `mergeConfigWithDefaults(...)`.
4. It creates a `Logger` from the resolved logging config.
5. It creates a `TabuMemory` instance backed by an internal `Map`.
6. It initializes `operatorStats` with zeroed counters for every move
   generator.

#### Throws

The constructor throws `SAConfigError` for all documented validation failures,
including null initial state, malformed constraints, malformed move
generators, invalid numeric values, and invalid optional tuning parameters.

It does not throw `TypeError` as part of its explicit validation contract.

### `solve()`

`solve()` runs the full optimization lifecycle and returns the best solution
encountered across all phases.

```ts
solve(): Promise<Solution<TState>>
```

#### Runtime contract

The method is asynchronous because progress callbacks may be asynchronous. A
single solver instance permits only one in-flight `solve()` call.

- If `solve()` is invoked while another invocation is still running on the
  same instance, the solver throws `SolveConcurrencyError`.
- The internal `isSolving` guard is always reset in a `finally` block.
- Runtime state such as tabu memory, progress counters, and operator stats is
  reset at the start of each new solve.

#### High-level lifecycle

The implementation in `src/core/SimulatedAnnealing.ts` executes these stages:

1. Clone `initialState` with `config.cloneState`.
2. Evaluate the initial state and emit an initial progress callback when
   `onProgress` is configured.
3. Run Phase 1 to reduce hard violations.
4. If hard violations remain and `enableIntensification` is true, run Phase
   1.5 intensification.
5. Run Phase 2 to improve overall fitness while forbidding degradation beyond
   the best hard-violation count found so far.
6. Build and return `Solution<TState>`.

### `getStats()`

`getStats()` returns a snapshot of operator statistics keyed by move generator
name.

```ts
getStats(): OperatorStats
```

The method copies the current counters, so callers cannot mutate the solver's
internal state through the returned object.

## `Constraint<TState>`

`Constraint<TState>` defines a scored condition over a candidate state. The
library treats the score as a normalized satisfaction measure, not as a raw
penalty.

```ts
interface Constraint<TState> {
  name: string;
  type: 'hard' | 'soft';
  weight?: number;
  evaluate(state: TState): number;
  describe?(state: TState): string | undefined;
  getViolations?(state: TState): string[];
}
```

### Semantic contract

The implementation enforces the following contract at runtime:

- `evaluate(state)` must return a finite number in the closed interval `[0, 1]`.
- `1` means fully satisfied.
- `0` means maximally violated.
- Intermediate values encode partial satisfaction.

This direction is important because the solver converts lack of satisfaction
into penalty by using `1 - score`.

### Hard constraints

Hard constraints contribute to fitness as:

```text
hardPenalty += 1 - score
fitness += hardPenalty * hardConstraintWeight
```

For hard constraints, `getViolations()` affects two outputs:

- the `hardViolations` count used in `Solution<TState>` and parts of phase
  control,
- the detailed `violations` array returned at the end of `solve()`.

If `getViolations()` is absent, the engine infers a violation count from the
score using:

```text
score > 0 ? max(1, round(1 / score - 1)) : 1
```

This inferred count is heuristic. If you need accurate multiplicity, implement
`getViolations()` explicitly.

### Soft constraints

Soft constraints contribute to fitness as:

```text
softPenalty += (1 - score) * (weight ?? 10)
```

The default soft-constraint weight is `10`, not `1`.

### Reporting helpers

`describe()` and `getViolations()` are optional diagnostic helpers.

- If `getViolations()` is present, the engine emits one `Violation` object for
  each returned string.
- Otherwise, the engine emits a single `Violation` object, optionally enriched
  by `describe()`.

### Example

This example matches the actual satisfaction-oriented score contract.

```ts
const noOverlap: Constraint<MyState> = {
  name: 'No overlap',
  type: 'hard',
  evaluate(state) {
    return findOverlapCount(state) === 0 ? 1 : 0;
  },
  getViolations(state) {
    return findOverlaps(state).map(
      (pair) => `${pair.left} overlaps with ${pair.right}`
    );
  },
};

const morningPreference: Constraint<MyState> = {
  name: 'Morning preference',
  type: 'soft',
  weight: 15,
  evaluate(state) {
    const ratio = fractionScheduledInMorning(state);
    return Math.max(0, Math.min(1, ratio));
  },
};
```

## `MoveGenerator<TState>`

`MoveGenerator<TState>` defines a neighborhood operator. The solver clones the
current state before calling `generate(...)`, so the move generator receives a
mutable working copy.

```ts
interface MoveGenerator<TState> {
  name: string;
  generate(state: TState, temperature: number): TState;
  canApply(state: TState): boolean;
}
```

### Runtime contract

The effective contract is as follows:

- `canApply(state)` decides whether the operator is eligible for selection in
  the current state.
- `generate(state, temperature)` is called with a cloned state.
- The method may mutate the passed state directly and return it.
- If all move generators return `false` from `canApply(...)`, solving stops
  early because the engine cannot generate neighbors.

### Selection implications

Move generator names are not only labels. In Phase 1 and Phase 1.5, the engine
contains name-based heuristics that prefer generators whose names include terms
such as `fix`, `swap`, `change`, `friday`, `lecturer`, `exclusive`, or
`capacity`.

This means operator naming has a small but real effect on search behavior.

## `SAConfig<TState>`

`SAConfig<TState>` controls the annealing schedule, reheating, tabu memory,
intensification, telemetry, and state cloning strategy.

```ts
interface SAConfig<TState> {
  initialTemperature: number;
  minTemperature: number;
  coolingRate: number;
  maxIterations: number;
  hardConstraintWeight: number;
  cloneState: (state: TState) => TState;
  reheatingThreshold?: number;
  maxReheats?: number;
  reheatingFactor?: number;
  tabuSearchEnabled?: boolean;
  tabuTenure?: number;
  aspirationEnabled?: boolean;
  maxTabuListSize?: number;
  enableIntensification?: boolean;
  intensificationIterations?: number;
  maxIntensificationAttempts?: number;
  intensificationStagnationLimit?: number;
  getStateSignature?: (state: TState) => string;
  operatorSelectionMode?: 'hybrid' | 'roulette-wheel';
  logging?: LoggingConfig;
  onProgress?: OnProgressCallback<TState>;
  onProgressMode?: 'await' | 'fire-and-forget';
}
```

### Required fields

These fields have no defaults and must be provided.

| Field | Validation |
| --- | --- |
| `initialTemperature` | finite number, `> 0` |
| `minTemperature` | finite number, `> 0` |
| `coolingRate` | finite number, `0 < coolingRate < 1` |
| `maxIterations` | positive integer |
| `hardConstraintWeight` | finite number, `> 0` |
| `cloneState` | function |

The validator does not enforce `minTemperature < initialTemperature`.

### Optional fields and resolved defaults

The table below reflects `mergeConfigWithDefaults(...)` exactly.

| Field | Default |
| --- | --- |
| `reheatingThreshold` | `undefined` |
| `maxReheats` | `3` |
| `reheatingFactor` | `2.0` |
| `tabuSearchEnabled` | `false` |
| `tabuTenure` | `50` |
| `maxTabuListSize` | `1000` |
| `aspirationEnabled` | `true` |
| `enableIntensification` | `true` |
| `intensificationIterations` | `2000` |
| `maxIntensificationAttempts` | `3` |
| `intensificationStagnationLimit` | `300` |
| `onProgressMode` | `'await'` |
| `logging.enabled` | `true` |
| `logging.level` | `'info'` |
| `logging.logInterval` | `1000` |
| `logging.output` | `'console'` |
| `logging.filePath` | `'./sa-optimization.log'` |

### Validation rules for optional fields

The validator applies these rules when the corresponding field is provided:

- `reheatingThreshold`: positive integer.
- `maxReheats`: non-negative integer.
- `reheatingFactor`: number greater than `1`.
- `tabuTenure`: positive integer.
- `maxTabuListSize`: positive integer.
- `intensificationIterations`: positive integer.
- `maxIntensificationAttempts`: positive integer.
- `intensificationStagnationLimit`: positive integer.
- `logging.logInterval`: positive integer.
- soft `weight`: finite number greater than or equal to `0`.

## `LoggingConfig`

`LoggingConfig` controls the built-in logger used by the solver.

```ts
interface LoggingConfig {
  enabled?: boolean;
  level?: 'debug' | 'info' | 'warn' | 'error' | 'none';
  logInterval?: number;
  output?: 'console' | 'file' | 'both';
  filePath?: string;
}
```

When `output` is `'file'` or `'both'`, the logger creates missing parent
directories with `mkdirSync(..., { recursive: true })` before appending log
lines.

## `OnProgressCallback<TState>`

`OnProgressCallback<TState>` is the public callback type used for progress
telemetry.

```ts
type OnProgressCallback<TState> = (
  iteration: number,
  currentCost: number,
  temperature: number,
  state: TState | null,
  stats: ProgressStats
) => void | Promise<void>;
```

### Callback behavior

The implementation has a few details that matter in production:

- `state` is always `null`. This is an intentional performance decision to
  avoid cloning the current state for telemetry.
- The callback can be synchronous or asynchronous.
- In `'await'` mode, the solver waits for completion.
- In `'fire-and-forget'` mode, the solver schedules the callback and continues.
- If the callback throws or rejects, the error is caught and logged at `warn`
  level; the solve continues.
- The callback is not invoked twice for the same iteration because
  `ProgressReporter` tracks `lastProgressIteration`.

## `Solution<TState>`

`Solution<TState>` is the result returned by `solve()`.

```ts
interface Solution<TState> {
  state: TState;
  fitness: number;
  hardViolations: number;
  softViolations: number;
  iterations: number;
  reheats: number;
  finalTemperature: number;
  violations: Violation[];
  operatorStats: OperatorStats;
}
```

### Field semantics

The field names are straightforward, but their exact meanings are worth making
explicit.

| Field | Meaning |
| --- | --- |
| `state` | Best state found during the solve. |
| `fitness` | Final objective value computed from hard and soft penalties. Lower is better. |
| `hardViolations` | Count of hard-constraint violation records in the final `violations` array. |
| `softViolations` | Count of soft-constraint violation records in the final `violations` array. |
| `iterations` | Total loop iterations completed across all phases. |
| `reheats` | Number of reheating events triggered in Phase 1 and Phase 2. |
| `finalTemperature` | Temperature value at the time solving stopped. |
| `violations` | Detailed violation objects generated from constraints. |
| `operatorStats` | Final per-operator attempt, acceptance, and improvement counters. |

`softViolations` is a count, not a weighted penalty sum.

### Fitness function

At the end of each evaluation, the solver computes:

```text
fitness(state) = hardConstraintWeight * hardPenalty(state) + softPenalty(state)

hardPenalty(state) = sum over hard constraints of (1 - score)
softPenalty(state) = sum over soft constraints of (1 - score) * weight
```

This means `fitness` is not simply `hardViolations * hardConstraintWeight`.
Hard violations are counted separately for reporting and phase control, while
the fitness function uses the fractional deficit `1 - score`.

## `Violation`

`Violation` is the normalized diagnostic record returned in `Solution<TState>`.

```ts
interface Violation {
  constraintName: string;
  constraintType: 'hard' | 'soft';
  score: number;
  description?: string;
}
```

### Construction rules

The engine builds violations as follows:

- If `constraint.getViolations()` exists, each returned string becomes a
  separate `Violation` with the same `score`.
- Otherwise, the engine emits one `Violation` when `score < 1`.
- If `constraint.describe()` returns a string, it is copied into
  `description`.

## `ProgressStats`

`ProgressStats` is the structured metric payload attached to every progress
callback.

```ts
interface ProgressStats {
  iteration: number;
  currentCost: number;
  bestCost: number;
  temperature: number;
  hardViolations: number;
  softViolations: number;
  tabuHits: number;
  tabuSize: number;
  phase: 'phase1' | 'phase15' | 'phase2' | 'initial';
  reheatingCount: number;
  acceptedMoves: number;
  rejectedMoves: number;
  stagnationCount: number;
  bestCostIteration: number;
  progressPercent: number;
  initialCost: number;
  improvement: number;
  timestamp: number;
}
```

### Metric interpretation

- `softViolations` is the count passed by the solver at callback time, not the
  weighted soft penalty.
- `progressPercent` is estimated as `min(100, iteration / maxIterations * 100)`.
- `improvement` is reported as a percentage relative to `initialCost`.
- `phase` comes from internal phase transitions: `initial`, `phase1`,
  `phase15`, and `phase2`.

## `OperatorStats`

`OperatorStats` is the per-operator online-learning record.

```ts
interface OperatorStats {
  [operatorName: string]: {
    attempts: number;
    improvements: number;
    accepted: number;
    successRate: number;
  };
}
```

`successRate` is computed as `improvements / attempts` whenever an operator's
stats are updated.

## Errors

The error hierarchy is intentionally small and concrete.

### `SAError`

`SAError` is the base class for library-defined errors.

```ts
class SAError extends Error {
  readonly code: string;
}
```

It contains `message`, `name`, and `code`. It does not carry a `context`
object.

### `SAConfigError`

`SAConfigError` reports invalid constructor inputs or invalid config values.

Typical causes include:

- a missing or invalid `cloneState`,
- a non-finite numeric setting,
- an out-of-range score weight,
- malformed constraints or move generators,
- invalid optional integer parameters.

### `ConstraintValidationError`

`ConstraintValidationError` is thrown when a constraint returns an invalid score.

Typical causes include:

- `evaluate()` returns `NaN`, `Infinity`, or `-Infinity`,
- `evaluate()` returns a value outside `[0, 1]`.

If `evaluate()` itself throws an exception, that exception propagates directly;
it is not wrapped automatically into `ConstraintValidationError`.

### `SolveConcurrencyError`

`SolveConcurrencyError` is thrown when `solve()` is called concurrently on the
same solver instance.

## Example: fully typed configuration

This example matches the current runtime contract, including the real callback
signature and the fact that `state` is `null`.

```ts
const config: SAConfig<MyState> = {
  initialTemperature: 1000,
  minTemperature: 0.01,
  coolingRate: 0.995,
  maxIterations: 50000,
  hardConstraintWeight: 10000,
  cloneState: deepClone,
  tabuSearchEnabled: true,
  tabuTenure: 50,
  aspirationEnabled: true,
  enableIntensification: true,
  intensificationIterations: 2000,
  logging: {
    enabled: true,
    level: 'info',
    logInterval: 1000,
    output: 'console',
  },
  onProgress: async (iteration, currentCost, temperature, state, stats) => {
    console.log({
      iteration,
      currentCost,
      temperature,
      stateIsNull: state === null,
      phase: stats.phase,
      bestCost: stats.bestCost,
    });
  },
  onProgressMode: 'await',
};
```

## Next steps

If you are choosing where to go next, use the documents by intent:

- Read `configuration.md` for tuning guidance and parameter trade-offs.
- Read `advanced-features.md` for algorithm lifecycle and acceptance behavior.
- Read `architecture.md` for internal component relationships and data flow.
