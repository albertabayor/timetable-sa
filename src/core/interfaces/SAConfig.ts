import type { OnProgressCallback } from '../types/ProgressStats.js';

/**
 * Minimal signal shape used for cooperative solver cancellation.
 *
 * This intentionally does not reference the DOM `AbortSignal` type so the
 * package declarations remain usable in Node/Bun TypeScript projects.
 */
export interface CancellationSignal {
  readonly aborted: boolean;
}

/**
 * Configuration for the Simulated Annealing algorithm.
 *
 * The algorithm uses a multi-phase approach:
 * - Phase 1: Eliminate hard constraint violations
 * - Phase 1.5: Intensification (optional) - Aggressively target remaining hard violations
 * - Phase 2: Optimize soft constraints
 *
 * Advanced features:
 * - Tabu Search: Prevents cycling by tracking visited states
 * - Reheating: Escapes local minima by temporarily increasing temperature
 * - Intensification: Focused optimization for stubborn violations
 * - Adaptive operator selection: Learns effective operators
 * - Real-time progress tracking via onProgress callback
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
    * Maximum number of reheating events allowed.
    *
    * Prevents infinite reheating loops.
    *
    * @default 3
    *
    * @remarks
    * - Set to 0 to disable reheating entirely
    * - Higher values allow more escape attempts from local minima
    */
   maxReheats?: number;

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

   // ============================================
   // TABU SEARCH CONFIGURATION
   // ============================================

   /**
    * Enable Tabu Search to prevent cycling.
    *
    * When enabled, the algorithm tracks recently visited states in a tabu list
    * and avoids revisiting them for a configurable number of iterations (tabu tenure).
    *
    * @default false
    *
    * @remarks
    * - Prevents the algorithm from cycling through the same solutions
    * - Helps exploration of new areas in the solution space
    * - Can be combined with aspiration criteria for better results
    *
    * @example
    * ```typescript
    * const config = {
    *   tabuSearchEnabled: true,
    *   tabuTenure: 50,
    *   aspirationEnabled: true
    * };
    * ```
    */
   tabuSearchEnabled?: boolean;

   /**
    * Number of iterations a state remains in the tabu list.
    *
    * After this many iterations, the state is removed from the tabu list
    * and can be visited again.
    *
    * @default 50
    *
    * @remarks
    * - Too short: May allow premature cycling
    * - Too long: May prevent visiting good solutions
    * - Typical values: 10 to 100
    */
   tabuTenure?: number;

   /**
    * Enable aspiration criteria for tabu search.
    *
    * If true, tabu states can be accepted if their fitness is better than
    * the global best solution found so far. This prevents missing exceptional
    * solutions due to tabu restrictions.
    *
    * **How it works:**
    * - Normally, tabu states are skipped during tabu tenure
    * - With aspiration, a tabu state is accepted if: fitness < globalBestFitness
    * - This allows "breakthrough" solutions to be accepted immediately
    *
    * **When to enable:**
    * - Tabu search is enabled
    * - You want to avoid missing optimal solutions
    * - Solution space has many local optima
    *
    * **When to disable:**
    * - Tabu search is disabled
    * - You want strict tabu enforcement (no overrides)
    *
    * @default true
    *
    * @example
    * ```typescript
    * const config = {
    *   tabuSearchEnabled: true,
    *   aspirationEnabled: true, // Accept tabu states better than global best
    *   tabuTenure: 50
    * };
    * ```
    */
   aspirationEnabled?: boolean;

   /**
    * Maximum number of entries in the tabu list.
    *
    * When exceeded, oldest entries are removed to prevent memory bloat.
    *
    * @default 1000
    */
   maxTabuListSize?: number;

  // ============================================
  // INTENSIFICATION CONFIGURATION
  // ============================================
  //
  // Intensification is an aggressive Phase 1.5 that targets remaining hard violations
  // when Phase 1 doesn't achieve zero violations. It uses focused operator selection
  // and multiple restart attempts to eliminate stubborn violations.
  //
  // How it works:
  // 1. Triggered when Phase 1 ends with hardViolations > 0
  // 2. Each attempt runs for intensificationIterations with focused operator selection
  // 3. Uses targeted operators (fix/swap/change) 70% of time, all operators 30%
  // 4. Aggressively accepts moves that reduce hard violations
  // 5. Reheats if stagnation detected (300 iterations without improvement)
  // 6. Stops early when all hard violations eliminated
  // 7. Up to maxIntensificationAttempts restart attempts
  //
  // When to use (enabled by default):
  // - Problems with complex, conflicting constraints
  // - Hard constraints are difficult to satisfy
  // - Phase 1 frequently ends with remaining violations
  //
  // When to disable:
  // - Simple problems where Phase 1 consistently reaches zero violations
  // - Quick approximate solutions are acceptable
  // - Soft constraints are more important than hard constraint feasibility

  /**
   * Enable Phase 1.5 Intensification mode.
   *
   * When Phase 1 ends with remaining hard violations, this mode
   * aggressively targets those violations with dedicated iterations and
   * focused operator selection.
   *
   * Intensification features:
   * - Uses targeted operators (fix/swap/change) 70% of time
   * - Aggressive acceptance for reducing hard violations
   * - Multiple restart attempts with temperature reset
   * - Reheating when stagnation detected
   * - Early exit when all violations eliminated
   *
   * This is particularly helpful for problems with many conflicting constraints
   * or where reaching feasibility is the main challenge.
   *
   * @default true
   */
  enableIntensification?: boolean;

  /**
   * Maximum iterations for each intensification attempt.
   *
   * Each intensification attempt runs this many iterations focusing
   * on eliminating remaining hard violations. If all violations are
   * eliminated before reaching this limit, the attempt stops early.
   *
   * Higher values:
   * - More thorough search for feasibility
   * - Slower single attempts
   *
   * Lower values:
   * - Faster attempts
   * - May miss solutions that require more iterations
   *
   * Recommended: 2000 for most problems, 5000+ for very complex problems
   *
   * @default 2000
   */
  intensificationIterations?: number;

  /**
   * Maximum number of intensification restart attempts.
   *
   * Each attempt resets the temperature and focuses on remaining hard violations.
   * The process stops when either:
   * - All hard violations are eliminated (success)
   * - Maximum attempts reached (may have remaining violations)
   *
   * Multiple attempts help because each restart can explore different regions
   * of the solution space due to the temperature reset.
   *
   * Recommended:
   * - 2-3 attempts for most problems
   * - 4-5 attempts for very difficult problems
   *
   * @default 3
   */
  maxIntensificationAttempts?: number;

  /**
   * Number of iterations without improvement before triggering reheating
   * during intensification phase.
   *
   * When the algorithm doesn't find improvement for this many iterations
   * during intensification, it will reheat (increase temperature) to escape
   * local minima.
   *
   * @default 300
   *
   * @remarks
   * - Lower values: More aggressive reheating, faster exploration
   * - Higher values: More patient search, may get stuck longer
   * - Typical values: 100 to 500
   */
  intensificationStagnationLimit?: number;

  /**
   * Start temperature mode for each intensification attempt.
   *
   * - 'phase1-end': derive from Phase 1 terminal temperature (default)
   * - 'initial-reset': reset to initialTemperature (legacy behavior)
   *
   * @default 'phase1-end'
   */
  intensificationStartTemperatureMode?: 'phase1-end' | 'initial-reset';

  /**
   * Multiplier applied to Phase 1 end temperature when
   * intensificationStartTemperatureMode is 'phase1-end'.
   *
   * @default 1.0
   */
  intensificationStartTempMultiplier?: number;

  /**
   * Upper cap ratio against initialTemperature for intensification start temp.
   *
   * startTemp <= initialTemperature * intensificationStartTempCapRatio
   *
   * @default 1.0
   */
  intensificationStartTempCapRatio?: number;

  /**
   * Whether tabu gating is applied during Phase 1.5.
   *
   * This flag only has effect when tabuSearchEnabled is true.
   *
   * @default true
   */
  intensificationUseTabu?: boolean;

  /**
   * Explicit list of move generator names considered "targeted" in Phase 1.5.
   *
   * Matching is case-insensitive exact name match.
   * If empty/omitted, Phase 1.5 selects from all applicable generators.
   *
   * @default []
   */
  intensificationTargetedOperatorNames?: string[];

  /**
   * Probability of selecting targeted operators when targeted set is available.
   *
   * Must be between 0 and 1.
   *
   * @default 0.7
   */
  intensificationTargetedSelectionRate?: number;

  /**
   * Per-attempt early stop threshold for Phase 1.5 when there is no
   * improvement to global best hard-violation objective.
   *
   * @default 800
   */
  intensificationEarlyStopNoBestImproveIterations?: number;

  /**
   * Global Phase 1.5 budget cap as fraction of maxIterations.
   *
   * Total intensification iterations across all attempts are capped at:
   * floor(maxIterations * intensificationBudgetFractionOfMaxIterations).
   *
   * Must be > 0 and <= 1.
   *
   * @default 0.25
   */
  intensificationBudgetFractionOfMaxIterations?: number;

  /**
   * Custom function to generate a unique signature for a state.
   *
   * Used by Tabu Search to track visited states. If not provided,
   * the algorithm uses a default implementation that may not work
   * correctly for all problem domains.
   *
   * @param state - The current state
   * @returns A unique string signature for the state
   *
   * @example
   * ```typescript
   * // For timetabling problems
   * getStateSignature: (state) => {
   *   return state.schedule
   *     .map(s => `${s.classId}:${s.day}:${s.time}:${s.room}`)
   *     .sort()
   *     .join('|');
   * }
   *
   * // For simple problems
   * getStateSignature: (state) => JSON.stringify(state)
   * ```
   */
  getStateSignature?: (state: TState) => string;

  /**
   * Operator selection mode
   *
   * - 'hybrid': 30% random + 70% weighted by success rate (default, more robust)
   * - 'roulette-wheel': 100% fitness-proportionate selection (pure Muklason formula)
   *
   * @default 'hybrid'
   *
   * @remarks
   * - 'hybrid': Guaranteed exploration at all stages, prevents over-exploitation
   * - 'roulette-wheel': Pure data-driven, good for research/comparison
   * 
   * Reference: Muklason et al. (2024), Cowling et al. (2002)
   */
  operatorSelectionMode?: 'hybrid' | 'roulette-wheel';

  /**
   * Logging configuration
   */
  logging?: LoggingConfig;

  /**
   * Callback function for real-time progress tracking.
   *
   * This callback is invoked at regular intervals during optimization to provide
   * real-time progress updates. It's called every `logInterval` iterations, at
   * phase transitions, and when reheating occurs.
   *
   * **Use Cases:**
   * - Web applications: Send progress to frontend via WebSocket
   * - CLI tools: Update progress bars
   * - Monitoring: Log to database or metrics service
   * - Debugging: Track optimization behavior
   *
   * **Performance Note:**
   * The callback receives `null` for the state parameter to avoid expensive
   * cloning operations. If you need the state, access it through your own
   * reference or consider storing metrics instead of full state.
   *
   * **Async Support:**
   * The callback can be async (return a Promise). The optimization will wait
   * for the callback to complete before continuing. Errors in the callback
   * are caught and logged but won't break the optimization.
   *
   * @param iteration - Current iteration number
   * @param currentCost - Current cost/fitness value
   * @param temperature - Current temperature
   * @param state - Current state (always null for performance)
   * @param stats - Complete progress statistics
   *
   * @example
   * ```typescript
   * const config: SAConfig<MyState> = {
   *   maxIterations: 20000,
   *   logInterval: 500,
   *   onProgress: async (iteration, cost, temp, state, stats) => {
   *     // Update progress bar
   *     console.log(`Progress: ${stats.progressPercent.toFixed(1)}%`);
   *
   *     // Send to server
   *     await fetch('/api/progress', {
   *       method: 'POST',
   *       body: JSON.stringify({ iteration, cost, stats })
   *     });
   *   }
   * };
   * ```
   *
   * @default undefined (no progress tracking)
   */
  onProgress?: OnProgressCallback<TState>;

  /**
   * Progress callback execution mode.
   *
   * - `'await'`: Wait for callback completion before continuing optimization
   * - `'fire-and-forget'`: Trigger callback without blocking optimization loop
   *
   * @default 'await'
   */
  onProgressMode?: 'await' | 'fire-and-forget';

  /**
   * Optional cooperative cancellation signal.
   *
   * Pass an `AbortController.signal` or any object with an `aborted` boolean
   * property. When the signal is aborted, `solve()` rejects with
   * `SolveCancelledError` at the next cancellation check and does not create a
   * final solution.
   *
   * Errors thrown from `onProgress` are still caught and logged for backward
   * compatibility. Use `cancelSignal` instead of throwing from `onProgress` to
   * stop the solver.
   *
   * @default undefined
   */
  cancelSignal?: CancellationSignal;
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
