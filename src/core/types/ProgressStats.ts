/**
 * Progress statistics for real-time optimization tracking
 *
 * This interface provides comprehensive metrics about the optimization
 * progress that can be used for real-time monitoring, logging, or
 * integration with external systems (WebSocket, database, etc.)
 */
export interface ProgressStats {
  /** Current iteration number */
  iteration: number;

  /** Current cost/fitness value */
  currentCost: number;

  /** Best cost found so far */
  bestCost: number;

  /** Current temperature */
  temperature: number;

  /** Number of hard constraint violations */
  hardViolations: number;

  /** Number of soft constraint violations */
  softViolations: number;

  /** Number of tabu hits (if Tabu Search enabled) */
  tabuHits: number;

  /** Current optimization phase */
  phase: 'phase1' | 'phase15' | 'phase2' | 'initial';

  /** Number of reheating events that have occurred */
  reheatingCount: number;

  /** Number of accepted moves so far */
  acceptedMoves: number;

  /** Number of rejected moves so far */
  rejectedMoves: number;

  /** Iterations without improvement (stagnation count) */
  stagnationCount: number;

  /** Iteration where best cost was found */
  bestCostIteration: number;

  /** Progress percentage (0-100) */
  progressPercent: number;

  /** Timestamp when this progress was recorded */
  timestamp: number;
}

/**
 * Progress callback function type
 *
 * @param iteration - Current iteration number
 * @param currentCost - Current cost/fitness value
 * @param temperature - Current temperature
 * @param state - Current state (null if not provided for performance)
 * @param stats - Complete progress statistics
 */
export type OnProgressCallback<TState> = (
  iteration: number,
  currentCost: number,
  temperature: number,
  state: TState | null,
  stats: ProgressStats
) => void | Promise<void>;
