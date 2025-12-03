/**
 * Core Simulated Annealing Library
 *
 * A generic, unopinionated constraint-satisfaction solver using Simulated Annealing.
 *
 * @module core
 */

// Main solver
export { SimulatedAnnealing } from './SimulatedAnnealing.js';

// Interfaces
export type { Constraint } from './interfaces/Constraint.js';
export type { MoveGenerator } from './interfaces/MoveGenerator.js';
export type { SAConfig, LoggingConfig } from './interfaces/SAConfig.js';

// Types
export type { Solution, OperatorStats } from './types/Solution.js';
export type { Violation } from './types/Violation.js';
