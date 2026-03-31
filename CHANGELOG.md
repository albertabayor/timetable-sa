# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.1.0] - 2026-03-31

This release expands the public observability and Phase 1.5 tuning surface of
`timetable-sa` while keeping the core solver entry points unchanged.

### Added

- New `SAConfig` fields for Phase 1.5 tuning:
  - `intensificationStartTemperatureMode`
  - `intensificationStartTempMultiplier`
  - `intensificationStartTempCapRatio`
  - `intensificationUseTabu`
  - `intensificationTargetedOperatorNames`
  - `intensificationTargetedSelectionRate`
  - `intensificationEarlyStopNoBestImproveIterations`
  - `intensificationBudgetFractionOfMaxIterations`
- New solution-level diagnostics payload:
  - `SolverDiagnostics`
  - `PhaseTimingDiagnostics`
  - `FeasibilityDiagnostics`
  - `IntensificationDiagnostics`
- New `SimulatedAnnealing#getDiagnostics()` snapshot method.
- New docs-site coverage for diagnostics, migration guidance, and updated
  Phase 1.5 behavior.

### Changed

- Phase 1.5 now defaults to deriving its start temperature from the Phase 1
  terminal temperature via `intensificationStartTemperatureMode: 'phase1-end'`.
- Phase 1.5 can apply optional tabu gating, explicit targeted operator
  selection, per-attempt early stop, and a global iteration budget cap.
- `solve()` now returns `solution.diagnostics` as an additive telemetry field.

### Notes

- If you need legacy Phase 1.5 restart behavior, set
  `intensificationStartTemperatureMode: 'initial-reset'`.

## [3.0.0] - 2026-03-30

This release hardens the public runtime contract of `timetable-sa` and
promotes the current branch changes as a major version.

### Added

- New exported error classes:
  - `SAError`
  - `SAConfigError`
  - `ConstraintValidationError`
  - `SolveConcurrencyError`
- New optional config field: `onProgressMode` with support for `'await'` and
  `'fire-and-forget'` callback execution.
- New internal telemetry, validation, tabu, and policy modules that improve
  observability, maintainability, and test coverage.

### Changed

- Refactored the solver core into smaller internal modules without changing the
  main public entry points.
- Expanded documentation to reflect current runtime behavior, configuration,
  troubleshooting, testing guidance, and migration notes.
- Improved progress reporting, logging, tabu tracking, and operator statistics
  handling.

### Fixed

- Fixed tabu aspiration checks to evaluate the candidate fitness instead of the
  current-state fitness.
- Fixed runtime state reset between repeated `solve()` calls on the same solver
  instance.
- Fixed cooling progression so temperature continues to decay when candidate
  states are skipped by tabu rules.
- Fixed deterministic fallback state signatures for non-timetabling state
  shapes, including circular structures.

### Breaking changes

- `solve()` now rejects concurrent calls on the same
  `SimulatedAnnealing` instance with `SolveConcurrencyError`.
- Constructor and runtime validation are now stricter:
  - invalid numeric config values must be finite
  - integer-style config fields must be valid positive integers where required
  - negative soft constraint weights are rejected
  - invalid constraint scores now throw instead of being silently tolerated
- Validation failures now throw typed errors such as `SAConfigError` and
  `ConstraintValidationError` instead of generic `Error`.
- When tabu search cannot derive a deterministic fallback signature for a state,
  consumers may now need to provide `getStateSignature` explicitly.

## [2.4.0] - 2026-03-28

This release improves progress telemetry and clarifies the meaning of tabu
statistics reported during optimization.

### Added

- New `ProgressStats` fields:
  - `initialCost` for the cost at the start of optimization.
  - `improvement` for the percentage improvement from the initial cost to the
    best cost.
  - `tabuSize` for the current number of states in the tabu list.

### Changed

- Corrected `tabuHits` so it now counts states rejected because they were tabu,
  instead of reporting the tabu list size.

### Breaking changes

- The meaning of `ProgressStats.tabuHits` changed.
- If you previously used `tabuHits` as the tabu list size, use `tabuSize`
  instead.

## [2.3.0] - 2026-03-20

This release adds real-time progress tracking through the `onProgress`
callback and formalizes asynchronous solving behavior.

### Added

- New `onProgress` callback support for real-time optimization monitoring.
- Full TypeScript support for progress reporting through the
  `ProgressStats` interface.
- Progress callback triggers at:
  - iteration `0`
  - each `logInterval`
  - phase transitions
  - reheating events
- Support for async progress callbacks, including integrations such as
  WebSocket updates, database logging, and UI progress reporting.
- Callback error handling so progress callback failures do not interrupt the
  optimization process.

### Changed

- `solve()` returns `Promise<Solution<TState>>` to support async progress
  callbacks.

### Example

```ts
const config: SAConfig<MyState> = {
  maxIterations: 20000,
  logInterval: 500,
  onProgress: async (iteration, cost, temp, state, stats) => {
    console.log(`[${stats.phase}] ${stats.progressPercent.toFixed(1)}%`);
    // Send to WebSocket, save to DB, update UI, etc.
  },
};

const solver = new SimulatedAnnealing(state, constraints, moves, config);
const solution = await solver.solve();
```

## [2.2.0] - 2026-02-26

### Added

- **New Configuration Options:**
  - `intensificationStagnationLimit` - Configurable stagnation limit for intensification phase (default: 300)
  - `getStateSignature` - Custom function to generate unique state signatures for Tabu Search, enabling generic state types beyond timetabling

- **Input Validation:**
  - Comprehensive validation in `SimulatedAnnealing` constructor
  - Validates initial state, constraints, move generators, and configuration parameters
  - Clear error messages for invalid inputs

- **Documentation:**
  - Added detailed JSDoc comments for new configuration options
  - Improved type definitions for better IDE support

### Fixed

- **MoveGenerator Interface Documentation:**
  - Corrected misleading documentation that instructed users to clone state in `generate()` method
  - Now clearly states that state is already cloned by the SA engine before being passed
  - Prevents performance issues from double-cloning

- **Division by Zero Protection:**
  - Added defensive check in fitness calculation to prevent division by zero when constraint returns score = 0
  - Graceful fallback to count of 1 violation

- **Memory Leak Prevention:**
  - Implemented proactive cleanup of expired Tabu list entries every 100 iterations
  - Prevents unbounded memory growth during long-running optimizations

- **Type Safety Improvements:**
  - Fixed unsafe type cast in `getStateSignature()` method
  - Added support for custom state signature functions
  - JSON serialization fallback for non-timetable state types

### Changed

- **Code Organization:**
  - Refactored monolithic `solve()` method (~400 lines) into focused sub-methods:
    - `runPhase1()` - Phase 1: Eliminate hard constraints
    - `runIntensification()` - Phase 1.5: Intensification
    - `runPhase2()` - Phase 2: Optimize soft constraints
    - `createSolution()` - Create final solution object
  - Improved readability and maintainability
  - No functional changes, fully backward compatible

### Security

- **Input Validation:**
  - Added validation to prevent invalid configuration values that could cause runtime errors
  - Validates cooling rate is within (0, 1) range
  - Validates all numeric parameters are positive where required

## [2.1.1] - Previous Version

- Initial documented version
- Multi-phase Simulated Annealing algorithm
- Tabu Search with aspiration criteria
- Intensification mode for stubborn violations
- Adaptive operator selection (hybrid and roulette-wheel modes)

[2.4.0]: https://github.com/albertabayor/timetable-sa/compare/v2.3.0...v2.4.0
[2.3.0]: https://github.com/albertabayor/timetable-sa/compare/v2.2.0...v2.3.0
[2.2.0]: https://github.com/albertabayor/timetable-sa/compare/v2.1.1...v2.2.0
[2.1.1]: https://github.com/albertabayor/timetable-sa/releases/tag/v2.1.1
[3.1.0]: https://github.com/albertabayor/timetable-sa/compare/v3.0.0...v3.1.0
[3.0.0]: https://github.com/albertabayor/timetable-sa/compare/v2.4.0...v3.0.0
