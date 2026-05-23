/**
 * Generates neighboring states by applying moves or modifications to the current state.
 *
 * Move generators define how to explore the solution space. Common types include:
 * - **Local moves**: Modify a single element (e.g., change room, change time slot)
 * - **Swap moves**: Exchange properties between two elements
 * - **Insert/Remove moves**: Add or remove elements from the solution
 *
 * @template TState - The state type for your problem domain
 *
 * @example
 * ```typescript
 * // Example: Change time slot for a random class
 * class ChangeTimeSlot implements MoveGenerator<TimetableState> {
 *   name = 'Change Time Slot';
 *
 *   canApply(state: TimetableState): boolean {
 *     return state.schedule.length > 0 && state.availableTimeSlots.length > 0;
 *   }
 *
 *   generate(state: TimetableState, temperature: number): TimetableState {
 *     // State is already cloned by the SA engine, modify it directly
 *     const randomIndex = Math.floor(Math.random() * state.schedule.length);
 *     const randomSlot = state.availableTimeSlots[
 *       Math.floor(Math.random() * state.availableTimeSlots.length)
 *     ];
 *     state.schedule[randomIndex].timeSlot = randomSlot;
 *     return state;
 *   }
 * }
 * ```
 */
export interface MoveGenerator<TState> {
  /**
   * Unique name for this move operator (used in logging and statistics)
   *
   * @example "Change Time Slot", "Swap Classes", "Change Room"
   */
  name: string;

  /**
   * Generate a new neighbor state from the current state.
   *
   * The SA engine already clones the state before passing it to this method,
   * so you can safely modify the passed state directly.
   *
   * The implementation should:
   * 1. Modify the passed state directly (it's already a clone)
   * 2. Return the modified state
   *
   * @param state - Current state (ALREADY CLONED by the SA engine, safe to modify)
   * @param temperature - Current temperature in the SA algorithm
   *   Can be used to adjust move intensity (larger moves at high temp, smaller at low temp)
   * @returns Modified state with changes applied
   *
   * @remarks
   * - **IMPORTANT**: The SA engine clones the state before calling this method at
   *   {@link SimulatedAnnealing.generateNeighbor}. You can safely modify the passed state.
   * - No need to clone again - doing so would waste performance.
   * - The `temperature` parameter can be used for temperature-dependent moves:
   *   - High temperature: Explore broadly (larger, more random moves)
   *   - Low temperature: Refine locally (smaller, more focused moves)
   *
   * @example
   * ```typescript
   * generate(state: MyState, temperature: number): MyState {
   *   // State is already cloned by the engine, modify directly
   *
   *   // Temperature-dependent move size
   *   const moveSize = temperature > 100 ? 'large' : 'small';
   *
   *   // Apply modification directly to the cloned state
   *   modifyState(state, moveSize);
   *
   *   return state;
   * }
   * ```
   */
  generate(state: TState, temperature: number): TState;

  /**
   * Check if this move can be applied to the current state.
   *
   * Use this to skip inapplicable moves (e.g., cannot swap if schedule has < 2 entries).
   *
   * @param state - Current state
   * @returns `true` if move is applicable, `false` otherwise
   *
   * @remarks
   * If `canApply` returns `false`, the move generator will be skipped during that iteration.
   * This allows for conditional move operators based on the state.
   *
   * @example
   * ```typescript
   * canApply(state: TimetableState): boolean {
   *   // Cannot swap if less than 2 classes
   *   return state.schedule.length >= 2;
   * }
   * ```
   */
  canApply(state: TState): boolean;
}
