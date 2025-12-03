/**
 * Generic Simulated Annealing optimizer for constraint satisfaction problems.
 *
 * This class implements a two-phase simulated annealing algorithm:
 * - Phase 1: Eliminate hard constraint violations
 * - Phase 2: Optimize soft constraints while maintaining hard constraint satisfaction
 *
 * @template TState - The state type for your problem domain
 */

import type { Constraint } from './interfaces/Constraint.js';
import type { MoveGenerator } from './interfaces/MoveGenerator.js';
import type { SAConfig } from './interfaces/SAConfig.js';
import type { Solution, OperatorStats } from './types/Solution.js';
import type { Violation } from './types/Violation.js';

export class SimulatedAnnealing<TState> {
  private initialState: TState;
  private constraints: Constraint<TState>[];
  private hardConstraints: Constraint<TState>[];
  private softConstraints: Constraint<TState>[];
  private moveGenerators: MoveGenerator<TState>[];
  private config: SAConfig<TState> & {
    reheatingFactor: number;
    maxReheats: number;
    logging: Required<NonNullable<SAConfig<TState>['logging']>>;
  };
  // Operator statistics
  private operatorStats: OperatorStats = {};

  constructor(
    initialState: TState,
    constraints: Constraint<TState>[],
    moveGenerators: MoveGenerator<TState>[],
    config: SAConfig<TState>
  ) {
    this.initialState = initialState;
    this.constraints = constraints;
    this.moveGenerators = moveGenerators;

    // Separate hard and soft constraints
    this.hardConstraints = constraints.filter((c) => c.type === 'hard');
    this.softConstraints = constraints.filter((c) => c.type === 'soft');

    // Merge config with defaults
    this.config = this.mergeWithDefaults(config);

    // Initialize operator stats
    for (const generator of moveGenerators) {
      this.operatorStats[generator.name] = {
        attempts: 0,
        improvements: 0,
        accepted: 0,
        successRate: 0,
      };
    }

    this.log('info', 'Simulated Annealing initialized', {
      hardConstraints: this.hardConstraints.length,
      softConstraints: this.softConstraints.length,
      moveGenerators: this.moveGenerators.length,
      config: {
        initialTemperature: this.config.initialTemperature,
        minTemperature: this.config.minTemperature,
        coolingRate: this.config.coolingRate,
        maxIterations: this.config.maxIterations,
      },
    });
  }

  /**
   * Run the optimization algorithm
   *
   * @returns Best solution found
   */
  solve(): Solution<TState> {
    this.log('info', 'Starting optimization...');
    this.log('info', 'Phase 1: Eliminating hard constraint violations');

    let currentState = this.config.cloneState(this.initialState);
    let bestState = this.config.cloneState(currentState);

    let currentFitness = this.calculateFitness(currentState);
    let bestFitness = currentFitness;

    let currentHardViolations = this.countHardViolations(currentState);
    let bestHardViolations = currentHardViolations;

    let temperature = this.config.initialTemperature;
    let iteration = 0;
    let iterationsWithoutImprovement = 0;
    let reheats = 0;

    this.log('info', 'Initial state', {
      fitness: currentFitness.toFixed(2),
      hardViolations: currentHardViolations,
    });

    // Phase 1: Eliminate hard constraints
    const phase1MaxIterations = Math.floor(this.config.maxIterations * 0.6);
    let phase1Iteration = 0;

    while (
      temperature > this.config.initialTemperature / 10 &&
      phase1Iteration < phase1MaxIterations &&
      bestHardViolations > 0
    ) {
      const { newState, operatorName } = this.generateNeighbor(currentState, temperature);

      if (!newState) {
        // No applicable move generators
        break;
      }

      this.operatorStats[operatorName]!.attempts++;

      const newFitness = this.calculateFitness(newState);
      const newHardViolations = this.countHardViolations(newState);

      // Phase 1 acceptance: prioritize reducing hard violations
      const acceptProb = this.acceptanceProbabilityPhase1(
        currentHardViolations,
        newHardViolations,
        currentFitness,
        newFitness,
        temperature
      );

      if (Math.random() < acceptProb) {
        this.operatorStats[operatorName]!.accepted++;

        if (newFitness < currentFitness) {
          this.operatorStats[operatorName]!.improvements++;
        }

        currentState = newState;
        currentFitness = newFitness;
        currentHardViolations = newHardViolations;

        // Update best solution
        if (
          newHardViolations < bestHardViolations ||
          (newHardViolations === bestHardViolations && newFitness < bestFitness)
        ) {
          bestState = this.config.cloneState(currentState);
          bestFitness = newFitness;
          bestHardViolations = newHardViolations;
          iterationsWithoutImprovement = 0;

          this.log('debug', `[Phase 1] New best: Hard violations = ${bestHardViolations}, Fitness = ${bestFitness.toFixed(2)}, Operator = ${operatorName}`);
        } else {
          iterationsWithoutImprovement++;
        }
      } else {
        iterationsWithoutImprovement++;
      }

      // Reheating
      if (
        this.config.reheatingThreshold !== undefined &&
        iterationsWithoutImprovement >= this.config.reheatingThreshold &&
        this.config.maxReheats !== undefined &&
        reheats < this.config.maxReheats &&
        temperature < this.config.initialTemperature / 100
      ) {
        const reheatingFactor = this.config.reheatingFactor ?? 2.0;
        temperature *= reheatingFactor;
        reheats++;
        iterationsWithoutImprovement = 0;

        this.log('info', `[Phase 1] Reheating #${reheats}: Temperature = ${temperature.toFixed(2)}, Hard violations = ${bestHardViolations}`);
      }

      temperature *= this.config.coolingRate;
      phase1Iteration++;
      iteration++;

      const logInterval = this.config.logging.logInterval ?? 1000;
      if (phase1Iteration % logInterval === 0) {
        this.log('info', `[Phase 1] Iteration ${phase1Iteration}: Temp = ${temperature.toFixed(2)}, Hard violations = ${currentHardViolations}, Best = ${bestHardViolations}`);
      }
    }

    this.log('info', `Phase 1 complete: Hard violations = ${bestHardViolations}`);

    // Phase 2: Optimize soft constraints
    this.log('info', 'Phase 2: Optimizing soft constraints');

    currentState = this.config.cloneState(bestState);
    currentFitness = bestFitness;
    iterationsWithoutImprovement = 0;

    while (temperature > this.config.minTemperature && iteration < this.config.maxIterations) {
      const { newState, operatorName } = this.generateNeighbor(currentState, temperature);

      if (!newState) {
        break;
      }

      this.operatorStats[operatorName]!.attempts++;

      const newFitness = this.calculateFitness(newState);
      const newHardViolations = this.countHardViolations(newState);

      // STRICT Phase 2: NEVER accept solutions that increase hard violations
      const acceptProb = this.acceptanceProbabilityPhase2(
        bestHardViolations,
        newHardViolations,
        currentFitness,
        newFitness,
        temperature
      );

      if (Math.random() < acceptProb) {
        this.operatorStats[operatorName]!.accepted++;

        if (newFitness < currentFitness) {
          this.operatorStats[operatorName]!.improvements++;
        }

        currentState = newState;
        currentFitness = newFitness;

        // Track if this improves or maintains hard violations
        if (newHardViolations < bestHardViolations) {
          bestHardViolations = newHardViolations;
          this.log('debug', `[Phase 2] Hard violations reduced to ${bestHardViolations}`);
        }

        if (newFitness < bestFitness) {
          bestState = this.config.cloneState(currentState);
          bestFitness = newFitness;
          iterationsWithoutImprovement = 0;

          this.log('debug', `[Phase 2] New best: Fitness = ${bestFitness.toFixed(2)}, Hard violations = ${newHardViolations}, Operator = ${operatorName}`);
        } else {
          iterationsWithoutImprovement++;
        }
      } else {
        iterationsWithoutImprovement++;
      }

      // Reheating
      if (
        this.config.reheatingThreshold !== undefined &&
        iterationsWithoutImprovement >= this.config.reheatingThreshold &&
        this.config.maxReheats !== undefined &&
        reheats < this.config.maxReheats &&
        temperature < this.config.initialTemperature / 100
      ) {
        const reheatingFactor = this.config.reheatingFactor ?? 2.0;
        temperature *= reheatingFactor;
        reheats++;
        iterationsWithoutImprovement = 0;

        this.log('info', `[Phase 2] Reheating #${reheats}: Temperature = ${temperature.toFixed(2)}, Fitness = ${bestFitness.toFixed(2)}`);
      }

      temperature *= this.config.coolingRate;
      iteration++;

      const logInterval2 = this.config.logging.logInterval ?? 1000;
      if (iteration % logInterval2 === 0) {
        this.log('info', `[Phase 2] Iteration ${iteration}: Temp = ${temperature.toFixed(2)}, Current = ${currentFitness.toFixed(2)}, Best = ${bestFitness.toFixed(2)}`);
      }
    }

    // Calculate final statistics
    this.updateOperatorStats();

    const violations = this.getViolations(bestState);
    const hardViolations = violations.filter((v) => v.constraintType === 'hard').length;
    const softViolations = violations.filter((v) => v.constraintType === 'soft').length;

    this.log('info', 'Optimization complete', {
      iterations: iteration,
      reheats: reheats,
      finalTemperature: temperature.toFixed(4),
      fitness: bestFitness.toFixed(2),
      hardViolations: hardViolations,
      softViolations: softViolations,
    });

    this.logOperatorStats();

    return {
      state: bestState,
      fitness: bestFitness,
      hardViolations: hardViolations,
      softViolations: softViolations,
      iterations: iteration,
      reheats: reheats,
      finalTemperature: temperature,
      violations: violations,
      operatorStats: this.operatorStats,
    };
  }

  /**
   * Calculate fitness for a state
   */
  private calculateFitness(state: TState): number {
    let hardPenalty = 0;
    let softPenalty = 0;

    // Evaluate hard constraints
    for (const constraint of this.hardConstraints) {
      const score = constraint.evaluate(state);
      if (score < 1) {
        hardPenalty += (1 - score);
      }
    }

    // Evaluate soft constraints
    for (const constraint of this.softConstraints) {
      const score = constraint.evaluate(state);
      const weight = constraint.weight ?? 10;
      if (score < 1) {
        softPenalty += (1 - score) * weight;
      }
    }

    return hardPenalty * this.config.hardConstraintWeight + softPenalty;
  }

  /**
   * Count hard constraint violations
   */
  private countHardViolations(state: TState): number {
    let count = 0;

    for (const constraint of this.hardConstraints) {
      const score = constraint.evaluate(state);
      if (score < 1) {
        // If getViolations() is available, count actual violations
        if (constraint.getViolations) {
          const violations = constraint.getViolations(state);
          count += violations.length;
        } else {
          // Fallback: try to infer violation count from score
          // Many constraints use: score = 1 / (1 + violationCount)
          // Therefore: violationCount ≈ (1/score) - 1
          const inferredCount = Math.round((1 / score) - 1);
          count += Math.max(1, inferredCount); // At least 1 if score < 1
        }
      }
    }

    return count;
  }

  /**
   * Generate neighbor state using adaptive operator selection
   */
  private generateNeighbor(
    state: TState,
    temperature: number
  ): { newState: TState | null; operatorName: string } {
    // Filter applicable move generators
    const applicableGenerators = this.moveGenerators.filter((gen) => gen.canApply(state));

    if (applicableGenerators.length === 0) {
      return { newState: null, operatorName: '' };
    }

    // Adaptive selection based on success rates
    const selectedGenerator = this.selectMoveGenerator(applicableGenerators);

    const newState = selectedGenerator.generate(state, temperature);

    return { newState, operatorName: selectedGenerator.name };
  }

  /**
   * Select move generator adaptively based on success rates
   */
  private selectMoveGenerator(generators: MoveGenerator<TState>[]): MoveGenerator<TState> {
    // 30% of the time: random selection (exploration)
    if (Math.random() < 0.3) {
      return generators[Math.floor(Math.random() * generators.length)]!;
    }

    // 70% of the time: weighted selection based on success rates
    const weights = generators.map((gen) => {
      const stats = this.operatorStats[gen.name]!;
      return stats.successRate || 0.5; // Default to 0.5 if no data yet
    });

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    if (totalWeight === 0) {
      // No successful operators yet, random selection
      return generators[Math.floor(Math.random() * generators.length)]!;
    }

    // Weighted random selection
    let random = Math.random() * totalWeight;

    for (let i = 0; i < generators.length; i++) {
      random -= weights[i]!;
      if (random <= 0) {
        return generators[i]!;
      }
    }

    return generators[generators.length - 1]!;
  }

  /**
   * Phase 1 acceptance probability (prioritize hard constraints)
   */
  private acceptanceProbabilityPhase1(
    currentHardViolations: number,
    newHardViolations: number,
    currentFitness: number,
    newFitness: number,
    temperature: number
  ): number {
    // Better hard violations: always accept
    if (newHardViolations < currentHardViolations) {
      return 1.0;
    }

    // Same hard violations: standard SA acceptance
    if (newHardViolations === currentHardViolations) {
      if (newFitness < currentFitness) {
        return 1.0;
      }
      return Math.exp((currentFitness - newFitness) / temperature);
    }

    // Worse hard violations: never accept in phase 1
    return 0.0;
  }

  /**
   * Phase 2 acceptance probability (strictly enforce hard constraints)
   */
  private acceptanceProbabilityPhase2(
    bestHardViolations: number,
    newHardViolations: number,
    currentFitness: number,
    newFitness: number,
    temperature: number
  ): number {
    // CRITICAL: NEVER accept solutions that worsen hard violations
    if (newHardViolations > bestHardViolations) {
      return 0.0;
    }

    // If hard violations improved: always accept
    if (newHardViolations < bestHardViolations) {
      return 1.0;
    }

    // Same hard violations: standard SA acceptance based on fitness
    if (newFitness < currentFitness) {
      return 1.0;
    }

    return Math.exp((currentFitness - newFitness) / temperature);
  }

  /**
   * Standard acceptance probability
   */
  private acceptanceProbability(
    currentFitness: number,
    newFitness: number,
    temperature: number
  ): number {
    if (newFitness < currentFitness) {
      return 1.0;
    }

    return Math.exp((currentFitness - newFitness) / temperature);
  }

  /**
   * Get all violations for a state
   */
  private getViolations(state: TState): Violation[] {
    const violations: Violation[] = [];

    for (const constraint of this.constraints) {
      const score = constraint.evaluate(state);

      if (score < 1) {
        // Use getViolations() if available for detailed violation list
        if (constraint.getViolations) {
          const descriptions = constraint.getViolations(state);
          for (const description of descriptions) {
            violations.push({
              constraintName: constraint.name,
              constraintType: constraint.type,
              score: score,
              description: description,
            });
          }
        } else {
          // Fallback to describe() for backward compatibility
          const violation: Violation = {
            constraintName: constraint.name,
            constraintType: constraint.type,
            score: score,
          };

          if (constraint.describe) {
            const description = constraint.describe(state);
            if (description !== undefined) {
              violation.description = description;
            }
          }

          violations.push(violation);
        }
      }
    }

    return violations;
  }

  /**
   * Update operator statistics
   */
  private updateOperatorStats(): void {
    for (const operatorName in this.operatorStats) {
      const stats = this.operatorStats[operatorName]!;
      if (stats.attempts > 0) {
        stats.successRate = stats.improvements / stats.attempts;
      }
    }
  }

  /**
   * Log operator statistics
   */
  private logOperatorStats(): void {
    this.log('info', 'Operator Statistics:');

    for (const operatorName in this.operatorStats) {
      const stats = this.operatorStats[operatorName]!;
      this.log('info', `  ${operatorName}: Attempts = ${stats.attempts}, Improvements = ${stats.improvements}, Accepted = ${stats.accepted}, Success Rate = ${(stats.successRate * 100).toFixed(2)}%`);
    }
  }

  /**
   * Merge config with defaults
   */
  private mergeWithDefaults(config: SAConfig<TState>): SAConfig<TState> & {
    reheatingFactor: number;
    maxReheats: number;
    logging: Required<NonNullable<SAConfig<TState>['logging']>>;
  } {
    return {
      ...config,
      reheatingFactor: config.reheatingFactor ?? 2.0,
      maxReheats: config.maxReheats ?? 3,
      logging: {
        enabled: config.logging?.enabled ?? true,
        level: config.logging?.level ?? 'info',
        logInterval: config.logging?.logInterval ?? 1000,
        output: config.logging?.output ?? 'console',
        filePath: config.logging?.filePath ?? './sa-optimization.log',
      },
    };
  }

  /**
   * Logging helper
   */
  private log(level: string, message: string, data?: any): void {
    if (!this.config.logging.enabled) return;

    const logLevels = ['debug', 'info', 'warn', 'error', 'none'];
    const currentLevelIndex = logLevels.indexOf(this.config.logging.level);
    const messageLevelIndex = logLevels.indexOf(level);

    if (messageLevelIndex < currentLevelIndex) return;

    const timestamp = new Date().toISOString();
    const logMessage = data
      ? `[${timestamp}] [${level.toUpperCase()}] ${message} ${JSON.stringify(data)}`
      : `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    if (this.config.logging.output === 'console' || this.config.logging.output === 'both') {
      console.log(logMessage);
    }

    // File logging could be implemented here if needed
  }

  /**
   * Get current operator statistics
   */
  getStats(): OperatorStats {
    return this.operatorStats;
  }
}
