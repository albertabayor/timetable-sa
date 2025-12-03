import type { Violation } from './Violation.js';

/**
 * Represents the solution found by the Simulated Annealing algorithm.
 *
 * @template TState - The state type for your problem domain
 */
export interface Solution<TState> {
  /**
   * The best state found during optimization
   */
  state: TState;

  /**
   * Final fitness score (lower is better)
   *
   * Fitness = (hardViolations * hardConstraintWeight) + softPenalty
   *
   * @remarks
   * - A fitness of 0 means all hard and soft constraints are satisfied
   * - Higher fitness indicates more constraint violations
   */
  fitness: number;

  /**
   * Number of hard constraint violations in the final solution
   *
   * Ideally this should be 0 (all hard constraints satisfied)
   */
  hardViolations: number;

  /**
   * Number of soft constraint violations in the final solution
   *
   * This is the count of soft constraints with satisfaction < 1.0
   */
  softViolations: number;

  /**
   * Total number of iterations performed
   */
  iterations: number;

  /**
   * Number of reheating events that occurred
   */
  reheats: number;

  /**
   * Final temperature when optimization stopped
   */
  finalTemperature: number;

  /**
   * Detailed list of all constraint violations
   *
   * Useful for debugging and understanding what constraints are not satisfied
   */
  violations: Violation[];

  /**
   * Statistics about move operators used during optimization
   */
  operatorStats: OperatorStats;
}

/**
 * Statistics about move operator performance
 */
export interface OperatorStats {
  [operatorName: string]: {
    /**
     * Number of times this operator was attempted
     */
    attempts: number;

    /**
     * Number of times this operator led to an improvement
     */
    improvements: number;

    /**
     * Number of times this operator was accepted (including worse moves)
     */
    accepted: number;

    /**
     * Success rate (improvements / attempts)
     */
    successRate: number;
  };
}
