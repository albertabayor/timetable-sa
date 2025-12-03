/**
 * Represents a constraint that evaluates a state in the optimization problem.
 *
 * Constraints can be either:
 * - **Hard constraints**: Must be satisfied (violations are heavily penalized)
 * - **Soft constraints**: Preferred but not required (violations are lightly penalized)
 *
 * @template TState - The state type for your problem domain
 *
 * @example
 * ```typescript
 * // Example: No room conflict constraint for timetabling
 * class NoRoomConflict implements Constraint<TimetableState> {
 *   name = 'No Room Conflict';
 *   type = 'hard' as const;
 *
 *   evaluate(state: TimetableState): number {
 *     // Check if any two classes use the same room at the same time
 *     for (let i = 0; i < state.schedule.length; i++) {
 *       for (let j = i + 1; j < state.schedule.length; j++) {
 *         if (hasConflict(state.schedule[i], state.schedule[j])) {
 *           return 0; // Violation
 *         }
 *       }
 *     }
 *     return 1; // Satisfied
 *   }
 * }
 * ```
 */
export interface Constraint<TState> {
  /**
   * Unique name for this constraint (used in logging and violation reports)
   *
   * @example "No Room Conflict", "Lecturer Max Hours", "Preferred Time Slot"
   */
  name: string;

  /**
   * Constraint type determines how violations are penalized
   *
   * - `'hard'`: Must be satisfied. Violations receive heavy penalty (hardConstraintWeight)
   * - `'soft'`: Preferred but not required. Violations receive light penalty (weight)
   */
  type: 'hard' | 'soft';

  /**
   * Weight for soft constraints (ignored for hard constraints)
   *
   * Higher weight = more important soft constraint
   * Lower weight = less important soft constraint
   *
   * @default 10
   */
  weight?: number;

  /**
   * Evaluate the constraint for the given state.
   *
   * @param state - Current state to evaluate
   * @returns Score between 0 and 1 (inclusive)
   *   - `1.0` = fully satisfied (no violation)
   *   - `0.0` = completely violated
   *   - `0.5` = partially satisfied (for soft constraints with gradual satisfaction)
   *
   * @remarks
   * - Hard constraints typically return 0 (violated) or 1 (satisfied)
   * - Soft constraints can return intermediate values (0.0 to 1.0) for partial satisfaction
   *
   * @example
   * ```typescript
   * // Hard constraint (binary: 0 or 1)
   * evaluate(state: MyState): number {
   *   return hasViolation(state) ? 0 : 1;
   * }
   *
   * // Soft constraint (gradual: 0 to 1)
   * evaluate(state: MyState): number {
   *   const score = calculateQuality(state);
   *   return Math.max(0, Math.min(1, score)); // Clamp to [0, 1]
   * }
   * ```
   */
  evaluate(state: TState): number;

  /**
   * Optional: Provide human-readable description of violations.
   *
   * This is useful for debugging and generating violation reports.
   *
   * @param state - Current state
   * @returns Description of violations, or `undefined` if constraint is satisfied
   *
   * @example
   * ```typescript
   * describe(state: TimetableState): string | undefined {
   *   for (const conflict of findConflicts(state)) {
   *     return `Room ${conflict.room} has overlapping classes: ${conflict.class1} and ${conflict.class2}`;
   *   }
   *   return undefined; // No violations
   * }
   * ```
   */
  describe?(state: TState): string | undefined;

  /**
   * Optional: Get detailed list of all violations for this constraint.
   *
   * This method allows constraints to report ALL violations, not just the first one.
   * If implemented, this method will be used instead of `describe()` for violation reporting.
   *
   * @param state - Current state
   * @returns Array of violation descriptions, or empty array if constraint is satisfied
   *
   * @example
   * ```typescript
   * getViolations(state: TimetableState): string[] {
   *   const violations: string[] = [];
   *   for (const conflict of findConflicts(state)) {
   *     violations.push(`Room ${conflict.room} has overlapping classes: ${conflict.class1} and ${conflict.class2}`);
   *   }
   *   return violations;
   * }
   * ```
   */
  getViolations?(state: TState): string[];
}
