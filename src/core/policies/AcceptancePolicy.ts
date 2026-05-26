const MIN_EXP_INPUT = -700;
const MAX_EXP_INPUT = 700;

/**
 * Computes an exponential value with defensive bounds for extreme inputs.
 *
 * This helper avoids passing non-finite numbers or numerically unsafe values
 * directly into `Math.exp()`. Inputs below the minimum threshold are treated
 * as `0`, and inputs above the maximum threshold are treated as positive
 * infinity to prevent underflow or overflow during acceptance-probability
 * calculations.
 *
 * @param value - The exponent input to evaluate
 * @returns The bounded exponential result for the given input
 *
 * @example
 * ```typescript
 * safeExp(0);
 * // => 1
 * ```
 *
 * @example
 * ```typescript
 * safeExp(2);
 * // => 7.38905609893065
 * ```
 *
 * @example
 * ```typescript
 * safeExp(-1000);
 * // => 0
 * ```
 *
 * @example
 * ```typescript
 * safeExp(1000);
 * // => Infinity
 * ```
 *
 * @example
 * ```typescript
 * safeExp(Number.NEGATIVE_INFINITY);
 * // => 0
 * ```
 */
export function safeExp(value: number): number {
  if (!Number.isFinite(value)) {
    return value > 0 ? Number.POSITIVE_INFINITY : 0;
  }

  if (value < MIN_EXP_INPUT) return 0;
  if (value > MAX_EXP_INPUT) return Number.POSITIVE_INFINITY;
  return Math.exp(value);
}

/**
 * Computes the phase-1 acceptance probability for Simulated Annealing.
 *
 * During phase 1, the search prioritizes reducing hard-constraint violations.
 * A candidate is always accepted when it has fewer hard violations than the
 * current state. If hard violations are equal, the candidate is always
 * accepted when its fitness is lower; otherwise the function returns the
 * standard Simulated Annealing acceptance probability for a non-improving
 * move.
 *
 * The returned value is consumed by the annealer as:
 * `Math.random() < acceptanceProbabilityPhase1(...)`.
 *
 * @param currentHardViolations - Hard-constraint violations in the current state
 * @param newHardViolations - Hard-constraint violations in the candidate state
 * @param currentFitness - Current state's fitness value; lower is better
 * @param newFitness - Candidate state's fitness value; lower is better
 * @param temperature - Current annealing temperature used to soften worse moves
 * @returns Acceptance probability in the range used by `Math.random() < probability`
 *
 * @example
 * ```typescript
 * acceptanceProbabilityPhase1(5, 3, 1200, 1400, 250);
 * // => 1
 * // Fewer hard violations, so the move is always accepted.
 * ```
 *
 * @example
 * ```typescript
 * acceptanceProbabilityPhase1(2, 2, 950, 900, 250);
 * // => 1
 * // Same hard violations and better fitness, so the move is always accepted.
 * ```
 *
 * @example
 * ```typescript
 * acceptanceProbabilityPhase1(2, 2, 900, 950, 250);
 * // => 0.8187307530779818
 * // Same hard violations but worse fitness, so acceptance is probabilistic.
 * // In SimulatedAnnealing.ts this is used as: Math.random() < acceptProb
 * ```
 *
 * @example
 * ```typescript
 * acceptanceProbabilityPhase1(1, 3, 900, 850, 250);
 * // => 0
 * // More hard violations are rejected in phase 1 even if fitness improves.
 * ```
 */
export function acceptanceProbabilityPhase1(
  currentHardViolations: number,
  newHardViolations: number,
  currentFitness: number,
  newFitness: number,
  temperature: number
): number {
  if (newHardViolations < currentHardViolations) {
    return 1.0;
  }

  if (newHardViolations === currentHardViolations) {
    if (newFitness < currentFitness) {
      return 1.0;
    }
    return safeExp((currentFitness - newFitness) / temperature);
  }

  return 0.0;
}

/**
 * Computes the phase-2 acceptance probability for Simulated Annealing.
 *
 * During phase 2, the search no longer compares the candidate against the
 * current state's hard violations. Instead, it uses the best hard-violation
 * count seen so far as the feasibility boundary. A candidate with more hard
 * violations than that boundary is always rejected, while a candidate with
 * fewer hard violations is always accepted. When the candidate matches the
 * boundary, fitness decides whether the move is accepted deterministically or
 * probabilistically.
 *
 * The returned value is consumed by the annealer as:
 * `Math.random() < acceptanceProbabilityPhase2(...)`.
 *
 * @param bestHardViolations - Lowest hard-constraint violation count found so far
 * @param newHardViolations - Hard-constraint violations in the candidate state
 * @param currentFitness - Current state's fitness value; lower is better
 * @param newFitness - Candidate state's fitness value; lower is better
 * @param temperature - Current annealing temperature used to soften worse moves
 * @returns Acceptance probability in the range used by `Math.random() < probability`
 *
 * @example
 * ```typescript
 * acceptanceProbabilityPhase2(2, 3, 900, 850, 250);
 * // => 0
 * // The candidate exceeds the best hard-violation boundary, so it is rejected.
 * ```
 *
 * @example
 * ```typescript
 * acceptanceProbabilityPhase2(2, 1, 900, 1100, 250);
 * // => 1
 * // Fewer hard violations than the best-so-far boundary, so the move is always accepted.
 * ```
 *
 * @example
 * ```typescript
 * acceptanceProbabilityPhase2(2, 2, 950, 900, 250);
 * // => 1
 * // Same hard-violation boundary and better fitness, so the move is always accepted.
 * ```
 *
 * @example
 * ```typescript
 * acceptanceProbabilityPhase2(2, 2, 900, 950, 250);
 * // => 0.8187307530779818
 * // Same hard-violation boundary but worse fitness, so acceptance is probabilistic.
 * // In SimulatedAnnealing.ts this is used as: Math.random() < acceptProb
 * ```
 */
export function acceptanceProbabilityPhase2(
  bestHardViolations: number,
  newHardViolations: number,
  currentFitness: number,
  newFitness: number,
  temperature: number
): number {
  if (newHardViolations > bestHardViolations) {
    return 0.0;
  }

  if (newHardViolations < bestHardViolations) {
    return 1.0;
  }

  if (newFitness < currentFitness) {
    return 1.0;
  }

  return safeExp((currentFitness - newFitness) / temperature);
}
