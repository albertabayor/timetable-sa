import type { MoveGenerator } from '../interfaces/MoveGenerator.js';
import type { OperatorStats } from '../types/Solution.js';

export class OperatorSelectionPolicy<TState> {
  private readonly alpha: number;
  private readonly beta: number;

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
    const fitnesses = generators.map((gen) => {
      const stats = operatorStats[gen.name];
      if (!stats) return 1.0 / generators.length;
      if (stats.attempts <= 0) return 1.0 / generators.length;
      return (stats.improvements + this.alpha) / (stats.attempts + this.beta);
    });

    const totalFitness = fitnesses.reduce((sum, f) => sum + f, 0);

    if (totalFitness === 0) {
      return generators[Math.floor(Math.random() * generators.length)]!;
    }

    let random = Math.random() * totalFitness;
    for (let i = 0; i < generators.length; i++) {
      random -= fitnesses[i]!;
      if (random <= 0) {
        return generators[i]!;
      }
    }

    return generators[generators.length - 1]!;
  }

  private selectGeneratorHybrid(
    generators: MoveGenerator<TState>[],
    operatorStats: OperatorStats
  ): MoveGenerator<TState> {
    if (Math.random() < 0.3) {
      return generators[Math.floor(Math.random() * generators.length)]!;
    }

    const weights = generators.map((gen) => {
      const stats = operatorStats[gen.name];
      if (!stats || stats.attempts <= 0) return 0.5;
      return (stats.improvements + this.alpha) / (stats.attempts + this.beta);
    });

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    if (totalWeight === 0) {
      return generators[Math.floor(Math.random() * generators.length)]!;
    }

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
