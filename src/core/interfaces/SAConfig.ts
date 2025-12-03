/**
 * Configuration for the Simulated Annealing algorithm.
 *
 * @template TState - The state type for your problem domain
 */
export interface SAConfig<TState> {
  /**
   * Initial temperature for the annealing process.
   *
   * Higher values allow more exploration of the solution space at the start.
   * Typical values: 100 to 10000
   *
   * @default 1000
   *
   * @remarks
   * - Too high: Wastes iterations on random exploration
   * - Too low: Gets stuck in local minima quickly
   */
  initialTemperature: number;

  /**
   * Minimum temperature (stopping criterion).
   *
   * The algorithm stops when temperature drops below this value.
   * Typical values: 0.001 to 1
   *
   * @default 0.01
   */
  minTemperature: number;

  /**
   * Cooling rate (temperature decay factor).
   *
   * Temperature is multiplied by this value each iteration: `T = T * coolingRate`
   * Must be between 0 and 1 (exclusive).
   * Typical values: 0.95 to 0.999
   *
   * @default 0.995
   *
   * @remarks
   * - Higher (closer to 1): Slower cooling, more iterations, better results
   * - Lower (closer to 0): Faster cooling, fewer iterations, may miss optimal solution
   */
  coolingRate: number;

  /**
   * Maximum number of iterations (stopping criterion).
   *
   * The algorithm stops after this many iterations, even if temperature hasn't reached `minTemperature`.
   * Typical values: 10000 to 100000
   *
   * @default 50000
   */
  maxIterations: number;

  /**
   * Penalty weight for hard constraint violations.
   *
   * Hard constraints are penalized with: `hardViolations * hardConstraintWeight`
   * Should be much larger than soft constraint weights to prioritize hard constraints.
   * Typical values: 1000 to 100000
   *
   * @default 10000
   *
   * @remarks
   * This ensures hard constraints are satisfied before optimizing soft constraints.
   */
  hardConstraintWeight: number;

  /**
   * State cloning function.
   *
   * Provides a deep copy of the state to avoid mutating the current solution.
   *
   * @param state - State to clone
   * @returns Deep copy of the state
   *
   * @example
   * ```typescript
   * // Simple JSON-based cloning
   * cloneState: (state) => JSON.parse(JSON.stringify(state))
   *
   * // Custom cloning for better performance
   * cloneState: (state) => ({
   *   ...state,
   *   schedule: state.schedule.map(entry => ({ ...entry }))
   * })
   * ```
   */
  cloneState: (state: TState) => TState;

  /**
   * Number of iterations without improvement before triggering reheating.
   *
   * If set, the algorithm will "reheat" (increase temperature) when stuck in a local minimum.
   *
   * @default undefined (no reheating)
   *
   * @remarks
   * Reheating helps escape local minima by temporarily increasing exploration.
   * Typical values: 1000 to 5000
   */
  reheatingThreshold?: number;

  /**
   * Factor to multiply temperature by when reheating.
   *
   * Temperature increases by: `T = T * reheatingFactor`
   *
   * @default 2.0
   *
   * @remarks
   * Typical values: 1.5 to 3.0
   */
  reheatingFactor?: number;

  /**
   * Maximum number of reheating events allowed.
   *
   * Prevents infinite reheating loops.
   *
   * @default 3
   */
  maxReheats?: number;

  /**
   * Logging configuration
   */
  logging?: LoggingConfig;
}

/**
 * Logging configuration for the optimization process
 */
export interface LoggingConfig {
  /**
   * Enable or disable logging
   *
   * @default true
   */
  enabled?: boolean;

  /**
   * Logging level
   *
   * - `'debug'`: Detailed information for debugging
   * - `'info'`: General information about optimization progress
   * - `'warn'`: Warnings (e.g., no improvement for many iterations)
   * - `'error'`: Errors only
   * - `'none'`: No logging
   *
   * @default 'info'
   */
  level?: 'debug' | 'info' | 'warn' | 'error' | 'none';

  /**
   * Log progress every N iterations
   *
   * @default 1000
   */
  logInterval?: number;

  /**
   * Output destination
   *
   * - `'console'`: Log to console only
   * - `'file'`: Log to file only
   * - `'both'`: Log to both console and file
   *
   * @default 'console'
   */
  output?: 'console' | 'file' | 'both';

  /**
   * File path for file-based logging
   *
   * Only used if `output` is `'file'` or `'both'`
   *
   * @default './sa-optimization.log'
   */
  filePath?: string;
}
