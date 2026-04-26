/**
 * Core Simulated Annealing Library
 *
 * A generic, unopinionated constraint-satisfaction solver using Simulated Annealing
 * with advanced features including Tabu Search and Intensification.
 *
 * @module core
 */

// Main solver
export { SimulatedAnnealing } from './SimulatedAnnealing.js';
export {
  SAError,
  SAConfigError,
  ConstraintValidationError,
  SolveConcurrencyError,
  SolveCancelledError,
} from './errors.js';

// Interfaces
export type { Constraint } from './interfaces/Constraint.js';
export type { MoveGenerator } from './interfaces/MoveGenerator.js';
export type { SAConfig, LoggingConfig, CancellationSignal } from './interfaces/SAConfig.js';

// Types
export type {
  Solution,
  OperatorStats,
  SolverDiagnostics,
  PhaseTimingDiagnostics,
  FeasibilityDiagnostics,
  IntensificationDiagnostics,
} from './types/Solution.js';
export type { Violation } from './types/Violation.js';
export type { ProgressStats, OnProgressCallback } from './types/ProgressStats.js';
