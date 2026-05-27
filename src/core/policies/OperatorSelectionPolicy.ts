import type { MoveGenerator } from '../interfaces/MoveGenerator.js';
import type { OperatorStats } from '../types/Solution.js';

/**
 * Selects move generators from a pool of neighborhood operators using
 * statistics collected during the search.
 *
 * This policy tracks how often each operator is attempted and how often it
 * produces an improving move, then converts that history into selection
 * weights. Those weights can be consumed by a pure roulette-wheel strategy
 * or by a hybrid strategy that mixes random exploration with weighted choice.
 *
 * The operator score uses a smoothed success-rate model:
 * `(improvements + alpha) / (attempts + beta)`.
 *
 * In that model:
 * - `alpha` adds pseudocount improvement mass to the numerator, preventing
 *   operators with little data from starting at exactly zero.
 * - `beta` adds pseudocount trial mass to the denominator, damping extreme
 *   early ratios and controlling how strongly the prior influences the score.
 *
 * With the default values `alpha = 1` and `beta = 2`, an unseen operator has
 * an initial prior score of `0.5`, before enough observations shift the score
 * toward its empirical improvement rate.
 *
 * @typeParam TState - The solution/state type manipulated by the move generators
 */
export class OperatorSelectionPolicy<TState> {
  private readonly alpha: number;
  private readonly beta: number;

  /**
   * Creates a new operator-selection policy with smoothing hyperparameters for
   * the operator success-rate model.
   *
   * @param alpha - Pseudocount added to the number of improvements
   * @param beta - Pseudocount added to the number of attempts
   */
  constructor(alpha = 1, beta = 2) {
    this.alpha = alpha;
    this.beta = beta;
  }

  updateOnlineStats(
    operatorStats: OperatorStats,
    operatorName: string,
    updates: { attempted?: boolean; accepted?: boolean; improved?: boolean }
  ): void {
    const stats = operatorStats[operatorName];
    if (!stats) return;

    if (updates.attempted) stats.attempts++;
    if (updates.accepted) stats.accepted++;
    if (updates.improved) stats.improvements++;

    stats.successRate = stats.attempts > 0 ? stats.improvements / stats.attempts : 0;
  }

  selectMoveGenerator(
    generators: MoveGenerator<TState>[],
    operatorStats: OperatorStats,
    mode: 'hybrid' | 'roulette-wheel'
  ): MoveGenerator<TState> {
    if (mode === 'roulette-wheel') {
      return this.selectGeneratorRouletteWheel(generators, operatorStats);
    }
    return this.selectGeneratorHybrid(generators, operatorStats);
  }

  private selectGeneratorRouletteWheel(
    generators: MoveGenerator<TState>[],
    operatorStats: OperatorStats
  ): MoveGenerator<TState> {
    
    const operatorWeights = generators.map((gen) => {
      const stats = operatorStats[gen.name];

      // guards
      if (!stats || stats.attempts <= 0) return 1.0 / generators.length;
      
      // Smoothed operator success rate used as the roulette-wheel weight.
      return (stats.improvements + this.alpha) / (stats.attempts + this.beta);
    });

    const totalFitness = operatorWeights.reduce((sum, f) => sum + f, 0);

    // If every operator ends up with zero weight, fall back to uniform random selection.
    if (totalFitness === 0) {
      return generators[Math.floor(Math.random() * generators.length)]!;
    }

    // Roulette-wheel sampling: draw one point from the total weight range, then
    // walk the cumulative weights until that point lands inside an operator's segment.
    let random = Math.random() * totalFitness;
    for (let i = 0; i < generators.length; i++) {
      random -= operatorWeights[i]!;
      if (random <= 0) {
        return generators[i]!;
      }
    }

    // Numerical safety fallback for floating-point rounding. Note : it's just defensive programming but prolly it won't be hit in practice (note for me : maybe i should test this nevertheless).
    return generators[generators.length - 1]!;
  }

  private selectGeneratorHybrid(
    generators: MoveGenerator<TState>[],
    operatorStats: OperatorStats
  ): MoveGenerator<TState> {

    // 30% exploration: pick a random operator uniformly.
    if (Math.random() < 0.3) {
      return generators[Math.floor(Math.random() * generators.length)]!;
    }

    const weights = generators.map((gen) => {
      const stats = operatorStats[gen.name];
      // guards
      if (!stats || stats.attempts <= 0) return 0.5;
      return (stats.improvements + this.alpha) / (stats.attempts + this.beta);
    });

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    // If every operator ends up with zero weight, fall back to uniform random selection.
    if (totalWeight === 0) {
      return generators[Math.floor(Math.random() * generators.length)]!;
    }

    // Roulette-wheel sampling: draw one point from the total weight range, then
    // walk the cumulative weights until that point lands inside an operator's segment.
    let random = Math.random() * totalWeight;
    for (let i = 0; i < generators.length; i++) {
      random -= weights[i]!;
      if (random <= 0) {
        return generators[i]!;
      }
    }

    return generators[generators.length - 1]!;
  }
}
