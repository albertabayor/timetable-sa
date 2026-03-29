# Configuration guide

This guide explains `SAConfig<TState>` from both a practical tuning perspective
and an implementation-accurate perspective. It documents which fields are truly
required, which defaults are resolved internally, what validation rules are
enforced, and how each setting influences runtime behavior.

## Configuration model

`SAConfig<TState>` combines six categories of settings:

- core annealing parameters,
- state cloning,
- reheating,
- tabu search,
- intensification,
- telemetry and operator selection.

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

## Required fields

These fields must always be supplied by the caller because the engine does not
define defaults for them.

### `initialTemperature`

`initialTemperature` sets the starting temperature for the main annealing loop.
The validator requires a finite number greater than `0`.

At runtime, the value also acts as a reference scale for:

- the Phase 1 stopping threshold `initialTemperature / 10`,
- the reheating gate `temperature < initialTemperature / 100`,
- the restart temperature used in intensification.

### `minTemperature`

`minTemperature` is the lower termination bound for Phase 2. The validator
requires a finite number greater than `0`.

The code does not enforce `minTemperature < initialTemperature`, even though
that relation is usually desirable in practice.

### `coolingRate`

`coolingRate` controls geometric cooling. The validator requires a finite
number strictly between `0` and `1`.

Because all main loops multiply temperature by `coolingRate` after each
iteration, values closer to `1` produce slower cooling, more exploration, and
typically higher runtime.

### `maxIterations`

`maxIterations` is the global iteration budget. The validator requires a
positive integer.

The value shapes multiple behaviors:

- it bounds Phase 2 directly,
- it gives Phase 1 an internal budget of `floor(maxIterations * 0.6)`,
- it defines the denominator for `ProgressStats.progressPercent`.

### `hardConstraintWeight`

`hardConstraintWeight` scales the aggregated hard penalty relative to soft
penalties. The validator requires a finite number greater than `0`.

If this weight is too low, the solver may trade away hard feasibility for soft
quality more often than you intend.

### `cloneState`

`cloneState` is the engine-owned deep-clone function. The validator requires it
to be a function.

This is one of the most important configuration points because the engine calls
it frequently:

- at solve startup,
- whenever a new best state is recorded,
- before passing state to move generators,
- when restarting intensification attempts.

An inaccurate clone function can corrupt search behavior in ways that look like
algorithmic failure but are actually aliasing bugs.

## Resolved defaults

The following defaults are applied by `mergeConfigWithDefaults(...)`.

| Field | Resolved default |
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

## Validation rules

This section captures the explicit rules enforced by
`validateSolverInputs(...)`.

### Constraint validation

Each constraint must satisfy these checks:

- `name` must be a non-empty string,
- `type` must be `'hard'` or `'soft'`,
- `evaluate` must be a function.

For soft constraints, if `weight` is provided:

- it must be finite,
- it must be greater than or equal to `0`.

The constructor does not require constraint arrays to be non-empty.

### Move-generator validation

Each move generator must satisfy these checks:

- `name` must be a non-empty string,
- `generate` must be a function,
- `canApply` must be a function.

As with constraints, the constructor validates shape but does not require the
array to be non-empty.

### Optional numeric validation

If present, these fields must satisfy the listed rules:

- `reheatingThreshold`: positive integer,
- `maxReheats`: non-negative integer,
- `reheatingFactor`: number greater than `1`,
- `tabuTenure`: positive integer,
- `maxTabuListSize`: positive integer,
- `intensificationIterations`: positive integer,
- `maxIntensificationAttempts`: positive integer,
- `intensificationStagnationLimit`: positive integer,
- `logging.logInterval`: positive integer.

## Core annealing tuning

The core parameters define the geometry of the search schedule. You should tune
them before adding advanced features because every later mechanism operates on
top of this baseline.

### Practical baseline

This baseline is close to the defaults implied by the code and works as a good
starting point for medium-sized problems.

```ts
const baseConfig = {
  initialTemperature: 1000,
  minTemperature: 0.01,
  coolingRate: 0.995,
  maxIterations: 20000,
  hardConstraintWeight: 10000,
};
```

### Tuning heuristics

- Increase `initialTemperature` if the search freezes too early.
- Increase `coolingRate` toward `1` if improvements continue late in the run.
- Increase `maxIterations` when the solver is still improving near the budget
  boundary.
- Increase `hardConstraintWeight` when hard-feasibility progress is too weak
  relative to soft optimization.

## Reheating configuration

Reheating is disabled unless `reheatingThreshold` is defined.

```ts
{
  reheatingThreshold: 1000,
  reheatingFactor: 2.0,
  maxReheats: 3,
}
```

### Operational behavior

In Phase 1 and Phase 2, reheating triggers only when all of these hold:

- stagnation reaches `reheatingThreshold`,
- `reheats < maxReheats`,
- current temperature is below `initialTemperature / 100`.

This final condition is easy to miss. If cooling has not yet progressed far
enough, reheating will not fire even when stagnation is high.

### Tuning guidance

- Use smaller thresholds for rugged landscapes with many local minima.
- Use larger thresholds when progress is noisy and you want more patience.
- Keep `reheatingFactor` moderate unless you have a clear reason to make
  reheating more aggressive.

## Tabu search configuration

Tabu search adds short-term memory to reduce cycling.

```ts
{
  tabuSearchEnabled: true,
  tabuTenure: 50,
  maxTabuListSize: 1000,
  aspirationEnabled: true,
  getStateSignature: (state) => string,
}
```

### Runtime behavior

- `tabuSearchEnabled` defaults to `false`.
- `tabuTenure` measures the number of iterations for which a signature remains
  tabu.
- `aspirationEnabled` lets the solver override tabu when
  `newFitness < globalBestFitness`.
- `maxTabuListSize` limits memory growth indirectly through cleanup.

### State-signature guidance

The default signature generator is often sufficient for small plain objects, but
you should provide `getStateSignature(...)` when:

- the state contains non-deterministic property ordering,
- the state is large and expensive to serialize,
- the state includes cyclic or unusual structures,
- only part of the state determines search identity.

For timetable-like states with a `schedule` array, the engine already provides a
specialized default based on `classId`, `timeSlot.day`, `timeSlot.startTime`,
and `room`.

## Intensification configuration

Intensification is enabled by default and only runs when Phase 1 fails to reach
zero hard violations.

```ts
{
  enableIntensification: true,
  intensificationIterations: 2000,
  maxIntensificationAttempts: 3,
  intensificationStagnationLimit: 300,
}
```

### Runtime behavior

Each intensification attempt:

- restarts from the current best state,
- starts with `initialTemperature`,
- cools with a fixed multiplier `0.999`,
- reheats locally to `initialTemperature * 0.5` when stagnation exceeds the
  configured limit,
- prefers move generators with names containing `fix`, `swap`, or `change`.

### Tuning guidance

- Increase `intensificationIterations` for difficult feasibility problems.
- Increase `maxIntensificationAttempts` when restarts help but one attempt is
  rarely enough.
- Reduce `intensificationStagnationLimit` when local search gets trapped for too
  long.

## Operator selection configuration

Operator selection controls how the engine chooses among applicable move
generators.

```ts
{ operatorSelectionMode: 'hybrid' | 'roulette-wheel' }
```

### `'hybrid'`

`'hybrid'` is the default and usually the best general-purpose choice. It uses
30 percent random exploration and 70 percent weighted selection by historical
operator performance.

### `'roulette-wheel'`

`'roulette-wheel'` always uses weighted selection. It is useful when the
operator set is well understood and you want more direct exploitation of online
statistics.

## Logging configuration

Logging provides built-in observability without requiring an external telemetry
framework.

```ts
{
  logging: {
    enabled: true,
    level: 'debug' | 'info' | 'warn' | 'error' | 'none',
    logInterval: 1000,
    output: 'console' | 'file' | 'both',
    filePath: './sa-optimization.log',
  }
}
```

### Important implementation details

- `logging.logInterval` is also used as the cadence for normal progress
  callbacks.
- If `output` is `'file'` or `'both'`, missing parent directories are created
  automatically.
- Log payloads are sanitized and known sensitive key names are redacted.

## Progress callback configuration

Progress callbacks expose internal runtime metrics for UI integration,
monitoring, and experimentation.

```ts
{
  onProgress: (iteration, currentCost, temperature, state, stats) => {
    // state is always null
  },
  onProgressMode: 'await' | 'fire-and-forget',
}
```

### Behavioral notes

- `onProgressMode` defaults to `'await'`.
- The callback may return `void` or `Promise<void>`.
- `state` is intentionally `null` in every invocation.
- Callback failures are caught and logged, not propagated.

### Choosing a mode

- Use `'await'` when ordering and backpressure matter.
- Use `'fire-and-forget'` when raw optimization throughput matters more than
  strict telemetry synchronization.

## Recommended profiles

These profiles are not built into the library. They are curated starting points
based on the implemented defaults and runtime mechanics.

### Fast exploration profile

Use this profile for quick feedback loops and debugging small problems.

```ts
const fastConfig: SAConfig<MyState> = {
  initialTemperature: 200,
  minTemperature: 0.1,
  coolingRate: 0.99,
  maxIterations: 10000,
  hardConstraintWeight: 5000,
  cloneState: deepClone,
  tabuSearchEnabled: false,
  enableIntensification: false,
  logging: { enabled: true, level: 'info', logInterval: 500 },
};
```

### Feasibility-first profile

Use this profile when hard constraints are difficult and infeasible solutions
are unacceptable.

```ts
const feasibilityConfig: SAConfig<MyState> = {
  initialTemperature: 1000,
  minTemperature: 0.01,
  coolingRate: 0.995,
  maxIterations: 50000,
  hardConstraintWeight: 50000,
  cloneState: deepClone,
  tabuSearchEnabled: true,
  tabuTenure: 75,
  aspirationEnabled: true,
  enableIntensification: true,
  intensificationIterations: 4000,
  maxIntensificationAttempts: 4,
};
```

### Quality-focused profile

Use this profile when you already know the search space is manageable and want
better final quality.

```ts
const qualityConfig: SAConfig<MyState> = {
  initialTemperature: 1500,
  minTemperature: 0.005,
  coolingRate: 0.997,
  maxIterations: 80000,
  hardConstraintWeight: 10000,
  cloneState: deepClone,
  tabuSearchEnabled: true,
  tabuTenure: 50,
  maxTabuListSize: 2000,
  enableIntensification: true,
  reheatingThreshold: 1500,
  reheatingFactor: 2,
  maxReheats: 3,
  operatorSelectionMode: 'hybrid',
};
```

## Configuration anti-patterns

These patterns are valid in the type system but often harmful in practice.

- Setting `hardConstraintWeight` too close to soft weights.
- Using a very slow `cloneState` implementation on large states.
- Enabling tabu without a meaningful signature for complex states.
- Using `'await'` mode for expensive network-bound progress callbacks.
- Treating `minTemperature` as the main stopping control while keeping
  `maxIterations` unrealistically low.

## Next steps

To validate and tune a configuration more effectively:

- read `advanced-features.md` for the precise runtime rules behind each option,
- read `api-reference.md` for exact defaults and type semantics,
- read `troubleshooting.md` when a configuration appears valid but behaves
  poorly in practice.
