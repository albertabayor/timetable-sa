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
