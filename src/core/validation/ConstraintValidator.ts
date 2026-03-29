import type { Constraint } from '../interfaces/Constraint.js';
import { ConstraintValidationError } from '../errors.js';

export function evaluateConstraintScore<TState>(constraint: Constraint<TState>, state: TState): number {
  const score = constraint.evaluate(state);

  if (typeof score !== 'number' || !Number.isFinite(score)) {
    throw new ConstraintValidationError(
      `Constraint "${constraint.name}" returned invalid score (${score}). ` +
      'evaluate() must return a finite number between 0 and 1.'
    );
  }

  if (score < 0 || score > 1) {
    throw new ConstraintValidationError(
      `Constraint "${constraint.name}" returned out-of-range score (${score}). ` +
      'evaluate() must return a number between 0 and 1.'
    );
  }

  return score;
}
