/**
 * Represents a constraint violation in the solution.
 */
export interface Violation {
  /**
   * Name of the constraint that was violated
   */
  constraintName: string;

  /**
   * Type of constraint (hard or soft)
   */
  constraintType: 'hard' | 'soft';

  /**
   * Severity score (0 = completely violated, 1 = satisfied)
   *
   * For hard constraints: typically 0 or 1
   * For soft constraints: can be any value between 0 and 1
   */
  score: number;

  /**
   * Human-readable description of the violation (if provided by constraint)
   */
  description?: string;
}
