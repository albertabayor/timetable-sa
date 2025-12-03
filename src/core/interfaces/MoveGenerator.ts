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
 *     const newState = cloneState(state);
 *     const randomIndex = Math.floor(Math.random() * newState.schedule.length);
 *     const randomSlot = newState.availableTimeSlots[
 *       Math.floor(Math.random() * newState.availableTimeSlots.length)
 *     ];
 *     newState.schedule[randomIndex].timeSlot = randomSlot;
 *     return newState;
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
   * The implementation should:
   * 1. Clone the current state (do not modify the input)
   * 2. Apply modifications to create a neighbor
   * 3. Return the new state
   *
   * @param state - Current state (should NOT be modified)
   * @param temperature - Current temperature in the SA algorithm
   *   Can be used to adjust move intensity (larger moves at high temp, smaller at low temp)
   * @returns New state with modifications applied
   *
   * @remarks
   * - **IMPORTANT**: Do not modify the input `state`. Always create a new state.
   * - The `temperature` parameter can be used for temperature-dependent moves:
   *   - High temperature: Explore broadly (larger, more random moves)
   *   - Low temperature: Refine locally (smaller, more focused moves)
   *
   * @example
   * ```typescript
   * generate(state: MyState, temperature: number): MyState {
   *   // Clone state to avoid modifying input
   *   const newState = JSON.parse(JSON.stringify(state));
   *
   *   // Temperature-dependent move size
   *   const moveSize = temperature > 100 ? 'large' : 'small';
   *
   *   // Apply modification
   *   modifyState(newState, moveSize);
   *
   *   return newState;
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
