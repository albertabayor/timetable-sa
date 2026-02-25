# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[2.2.0]: https://github.com/albertabayor/timetable-sa/compare/v2.1.1...v2.2.0
[2.1.1]: https://github.com/albertabayor/timetable-sa/releases/tag/v2.1.1
