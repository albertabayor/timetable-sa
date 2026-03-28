const MIN_EXP_INPUT = -700;
const MAX_EXP_INPUT = 700;

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
