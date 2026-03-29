import type { Constraint } from './interfaces/Constraint.js';
import type { MoveGenerator } from './interfaces/MoveGenerator.js';
import type { SAConfig } from './interfaces/SAConfig.js';
import type { Solution, OperatorStats } from './types/Solution.js';
import type { Violation } from './types/Violation.js';
import { acceptanceProbabilityPhase1, acceptanceProbabilityPhase2, safeExp } from './policies/AcceptancePolicy.js';
import { OperatorSelectionPolicy } from './policies/OperatorSelectionPolicy.js';
import { getDefaultStateSignature } from './tabu/StateSignature.js';
import { TabuMemory } from './tabu/TabuMemory.js';
import { Logger } from './telemetry/Logger.js';
import { ProgressReporter } from './telemetry/ProgressReporter.js';
import type { ResolvedSAConfig } from './engine/EngineTypes.js';
import { evaluateConstraintScore } from './validation/ConstraintValidator.js';
import { mergeConfigWithDefaults, validateSolverInputs } from './validation/ConfigValidator.js';
import { SolveConcurrencyError } from './errors.js';

export class SimulatedAnnealing<TState> {
  private readonly initialState: TState;
  private readonly constraints: Constraint<TState>[];
  private readonly hardConstraints: Constraint<TState>[];
  private readonly softConstraints: Constraint<TState>[];
  private readonly moveGenerators: MoveGenerator<TState>[];
  private readonly config: ResolvedSAConfig<TState>;
  private readonly logger: Logger;
  private readonly progressReporter = new ProgressReporter<TState>();
  private readonly selectionPolicy = new OperatorSelectionPolicy<TState>();
  private hardConstraintHintCache: {
    iteration: number;
    violatedConstraintNames: Set<string>;
  } = {
    iteration: -1,
    violatedConstraintNames: new Set<string>(),
  };
  private hardBreakdownLogCache = new Map<string, string>();

  private operatorStats: OperatorStats = {};
  private readonly tabuList = new Map<string, number>();
  private tabuMemory: TabuMemory;
  private isSolving = false;

  constructor(
    initialState: TState,
    constraints: Constraint<TState>[],
    moveGenerators: MoveGenerator<TState>[],
    config: SAConfig<TState>
  ) {
    validateSolverInputs(initialState, constraints, moveGenerators, config);

    this.initialState = initialState;
    this.constraints = constraints;
    this.moveGenerators = moveGenerators;
    this.hardConstraints = constraints.filter((c) => c.type === 'hard');
    this.softConstraints = constraints.filter((c) => c.type === 'soft');
    this.config = mergeConfigWithDefaults(config);

    this.logger = new Logger({
      enabled: this.config.logging.enabled,
      level: this.config.logging.level,
      output: this.config.logging.output,
      filePath: this.config.logging.filePath,
    });

    this.tabuMemory = new TabuMemory(this.config.tabuTenure, this.config.maxTabuListSize, this.tabuList);

    for (const generator of moveGenerators) {
      this.operatorStats[generator.name] = {
        attempts: 0,
        improvements: 0,
        accepted: 0,
        successRate: 0,
      };
    }

    this.logger.log('info', 'Simulated Annealing initialized', {
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

  async solve(): Promise<Solution<TState>> {
    if (this.isSolving) {
      throw new SolveConcurrencyError(
        'solve() is already running on this SimulatedAnnealing instance. Await the current solve() call or use a new instance.'
      );
    }

    this.isSolving = true;
    this.resetRuntimeState();

    try {
      this.logger.log('info', 'Starting optimization...');
      this.logger.log('info', 'Phase 1: Eliminating hard constraint violations');
      this.setPhase('phase1');

      let currentState = this.config.cloneState(this.initialState);
      let bestState = this.config.cloneState(currentState);

      const initialResult = this.calculateFitnessAndViolations(currentState);
      let currentFitness = initialResult.fitness;
      let bestFitness = currentFitness;
      let currentHardViolations = initialResult.hardViolations;
      let bestHardViolations = currentHardViolations;
      let temperature = this.config.initialTemperature;
      let iteration = 0;
      let iterationsWithoutImprovement = 0;
      let reheats = 0;

      this.progressReporter.setInitialCost(currentFitness);

      this.logger.log('info', 'Initial state', {
        fitness: currentFitness.toFixed(2),
        hardViolations: currentHardViolations,
      });

      const initialViolations = this.getViolations(currentState);
      const initialSoftViolations = initialViolations.filter((v) => v.constraintType === 'soft').length;
      const initialHardViolations = initialViolations.filter((v) => v.constraintType === 'hard').length;

      this.logger.log('info', 'Initial state violations summary', {
        hardViolations: initialHardViolations,
        softViolations: initialSoftViolations,
        totalViolations: initialViolations.length,
      });

      if (this.config.onProgress) {
        await this.progressReporter.triggerProgressCallback(
          0,
          currentFitness,
          bestFitness,
          temperature,
          currentHardViolations,
          initialSoftViolations,
          reheats,
          this.config.maxIterations,
          this.tabuMemory.size,
          this.config.onProgress,
          this.config.onProgressMode,
          (error) => this.logger.log('warn', 'onProgress callback error:', error)
        );
      }

      const violationsByConstraint = initialViolations.reduce(
        (acc, v) => {
          const key = `${v.constraintType}:${v.constraintName}`;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );
      this.logger.log('info', 'Initial violations breakdown by constraint', violationsByConstraint);

      const phase1Result = await this.runPhase1(
        currentState,
        bestState,
        currentFitness,
        bestFitness,
        currentHardViolations,
        bestHardViolations,
        temperature,
        iteration,
        iterationsWithoutImprovement,
        reheats
      );

      currentState = phase1Result.currentState;
      bestState = phase1Result.bestState;
      currentFitness = phase1Result.currentFitness;
      bestFitness = phase1Result.bestFitness;
      currentHardViolations = phase1Result.currentHardViolations;
      bestHardViolations = phase1Result.bestHardViolations;
      temperature = phase1Result.temperature;
      iteration = phase1Result.iteration;
      iterationsWithoutImprovement = phase1Result.iterationsWithoutImprovement;
      reheats = phase1Result.reheats;

      this.logger.log('info', `Phase 1 complete: Hard violations = ${bestHardViolations}`);

      if (bestHardViolations > 0 && this.config.enableIntensification) {
        this.setPhase('phase15');
        const intensificationResult = await this.runIntensification(
          bestState,
          bestFitness,
          bestHardViolations,
          iteration
        );

        bestState = intensificationResult.bestState;
        bestFitness = intensificationResult.bestFitness;
        bestHardViolations = intensificationResult.bestHardViolations;
        iteration = intensificationResult.iteration;
      }

      const phase2Result = await this.runPhase2(
        bestState,
        bestFitness,
        bestHardViolations,
        temperature,
        iteration,
        iterationsWithoutImprovement,
        reheats
      );

      return this.createSolution(
        phase2Result.bestState,
        phase2Result.bestFitness,
        phase2Result.bestHardViolations,
        phase2Result.temperature,
        phase2Result.iteration,
        phase2Result.reheats
      );
    } finally {
      this.isSolving = false;
    }
  }

  private async runPhase1(
    currentState: TState,
    bestState: TState,
    currentFitness: number,
    bestFitness: number,
    currentHardViolations: number,
    bestHardViolations: number,
    temperature: number,
    iteration: number,
    iterationsWithoutImprovement: number,
    reheats: number
  ): Promise<{
    currentState: TState;
    bestState: TState;
    currentFitness: number;
    bestFitness: number;
    currentHardViolations: number;
    bestHardViolations: number;
    temperature: number;
    iteration: number;
    iterationsWithoutImprovement: number;
    reheats: number;
  }> {
    const phase1MaxIterations = Math.floor(this.config.maxIterations * 0.6);
    let phase1Iteration = 0;

    while (
      temperature > this.config.initialTemperature / 10 &&
      phase1Iteration < phase1MaxIterations &&
      bestHardViolations > 0
    ) {
      const { newState, operatorName } = this.generateNeighbor(currentState, temperature, true, iteration);
      if (!newState) break;

      const { fitness: newFitness, hardViolations: newHardViolations } = this.calculateFitnessAndViolations(newState);

      if (this.config.tabuSearchEnabled) {
        const newSignature = this.getStateSignature(newState);
        if (this.shouldSkipTabu(newSignature, iteration, newFitness, bestFitness)) {
          this.progressReporter.addTabuHit();
          temperature *= this.config.coolingRate;
          phase1Iteration++;
          iteration++;
          continue;
        }
      }

      this.selectionPolicy.updateOnlineStats(this.operatorStats, operatorName, { attempted: true });

      const acceptProb = acceptanceProbabilityPhase1(
        currentHardViolations,
        newHardViolations,
        currentFitness,
        newFitness,
        temperature
      );

      const accepted = Math.random() < acceptProb;
      const isImprovement =
        newHardViolations < bestHardViolations ||
        (newHardViolations === bestHardViolations && newFitness < bestFitness);

      if (accepted) {
        this.selectionPolicy.updateOnlineStats(this.operatorStats, operatorName, {
          accepted: true,
          improved: newFitness < currentFitness,
        });

        if (this.config.tabuSearchEnabled) {
          const currentSignature = this.getStateSignature(currentState);
          this.addToTabuList(currentSignature, iteration);
        }

        currentState = newState;
        currentFitness = newFitness;
        currentHardViolations = newHardViolations;

        if (isImprovement) {
          bestState = this.config.cloneState(currentState);
          bestFitness = newFitness;
          bestHardViolations = newHardViolations;
          iterationsWithoutImprovement = 0;
          this.progressReporter.updateMoveStats(true, true, iteration);

          this.logger.log(
            'debug',
            `[Phase 1] New best: Hard violations = ${bestHardViolations}, Fitness = ${bestFitness.toFixed(2)}, Operator = ${operatorName}`
          );
        } else {
          iterationsWithoutImprovement++;
          this.progressReporter.updateMoveStats(true, false);
        }
      } else {
        iterationsWithoutImprovement++;
        this.progressReporter.updateMoveStats(false, false);
      }

      if (
        this.config.reheatingThreshold !== undefined &&
        iterationsWithoutImprovement >= this.config.reheatingThreshold &&
        reheats < this.config.maxReheats &&
        temperature < this.config.initialTemperature / 100
      ) {
        temperature *= this.config.reheatingFactor;
        reheats++;
        iterationsWithoutImprovement = 0;
        this.progressReporter.updateMoveStats(true, true);

        this.logger.log(
          'info',
          `[Phase 1] Reheating #${reheats}: Temperature = ${temperature.toFixed(2)}, Hard violations = ${bestHardViolations}`
        );
        this.logHardViolationBreakdown('[Phase 1] Hard violation breakdown', bestState, 'phase1-reheat');

        if (this.progressReporter.shouldTriggerProgress(iteration, this.config.onProgress, this.config.logging.logInterval, true)) {
          const softV = this.getViolations(bestState).filter((v) => v.constraintType === 'soft').length;
          await this.progressReporter.triggerProgressCallback(
            iteration,
            currentFitness,
            bestFitness,
            temperature,
            bestHardViolations,
            softV,
            reheats,
            this.config.maxIterations,
            this.tabuMemory.size,
            this.config.onProgress,
            this.config.onProgressMode,
            (error) => this.logger.log('warn', 'onProgress callback error:', error)
          );
        }
      }

      temperature *= this.config.coolingRate;
      phase1Iteration++;
      iteration++;

      if (
        phase1Iteration % this.config.logging.logInterval === 0 ||
        this.progressReporter.shouldTriggerProgress(iteration, this.config.onProgress, this.config.logging.logInterval)
      ) {
        this.logger.log(
          'info',
          `[Phase 1] Iteration ${phase1Iteration}: Temp = ${temperature.toFixed(2)}, Hard violations = ${currentHardViolations}, Best = ${bestHardViolations}`
        );
        this.logHardViolationBreakdown('[Phase 1] Hard violation breakdown', currentState, 'phase1-iteration');

        if (this.progressReporter.shouldTriggerProgress(iteration, this.config.onProgress, this.config.logging.logInterval)) {
          const softV = this.getViolations(bestState).filter((v) => v.constraintType === 'soft').length;
          await this.progressReporter.triggerProgressCallback(
            iteration,
            currentFitness,
            bestFitness,
            temperature,
            bestHardViolations,
            softV,
            reheats,
            this.config.maxIterations,
            this.tabuMemory.size,
            this.config.onProgress,
            this.config.onProgressMode,
            (error) => this.logger.log('warn', 'onProgress callback error:', error)
          );
        }
      }
    }

    return {
      currentState,
      bestState,
      currentFitness,
      bestFitness,
      currentHardViolations,
      bestHardViolations,
      temperature,
      iteration,
      iterationsWithoutImprovement,
      reheats,
    };
  }

  private async runIntensification(
    bestState: TState,
    bestFitness: number,
    bestHardViolations: number,
    iteration: number
  ): Promise<{
    bestState: TState;
    bestFitness: number;
    bestHardViolations: number;
    iteration: number;
  }> {
    this.logger.log('info', 'Phase 1.5: Intensification - targeting remaining hard violations');

    let currentState = this.config.cloneState(bestState);
    let currentFitness = bestFitness;
    let currentHardViolations = bestHardViolations;
    let intensificationAttempt = 0;

    while (bestHardViolations > 0 && intensificationAttempt < this.config.maxIntensificationAttempts) {
      intensificationAttempt++;
      this.logger.log(
        'info',
        `[Intensification] Attempt ${intensificationAttempt}/${this.config.maxIntensificationAttempts}`
      );

      let intensificationTemp = this.config.initialTemperature;
      let intensificationIterations = 0;
      let stagnationCounter = 0;

      currentState = this.config.cloneState(bestState);
      currentFitness = bestFitness;
      currentHardViolations = bestHardViolations;

      while (intensificationIterations < this.config.intensificationIterations && bestHardViolations > 0) {
        const allGenerators = this.moveGenerators.filter((gen) => gen.canApply(currentState));
        const targetedGenerators = allGenerators.filter((gen) => {
          const name = gen.name.toLowerCase();
          return name.includes('fix') || name.includes('swap') || name.includes('change');
        });

        const generators = targetedGenerators.length > 0 && Math.random() < 0.7 ? targetedGenerators : allGenerators;

        if (generators.length === 0) break;

        const selectedGenerator = generators[Math.floor(Math.random() * generators.length)]!;
        const clonedState = this.config.cloneState(currentState);
        const newState = selectedGenerator.generate(clonedState, intensificationTemp);
        if (!newState) {
          intensificationIterations++;
          continue;
        }

        this.selectionPolicy.updateOnlineStats(this.operatorStats, selectedGenerator.name, { attempted: true });

        const { fitness: newFitness, hardViolations: newHardViolations } = this.calculateFitnessAndViolations(newState);

        let accept = false;
        if (newHardViolations < currentHardViolations) {
          accept = true;
          stagnationCounter = 0;
        } else if (newHardViolations === currentHardViolations) {
          if (newFitness < currentFitness) {
            accept = true;
            stagnationCounter = 0;
          } else {
            const acceptProb = safeExp((currentFitness - newFitness) / intensificationTemp);
            accept = Math.random() < acceptProb;
            stagnationCounter++;
          }
        } else {
          const worsenProb = safeExp(-1 / (intensificationTemp / 10000));
          if (Math.random() < worsenProb * 0.02) {
            accept = true;
            this.logger.log('debug', '[Intensification] Accepting worsening move to escape local minimum');
          }
          stagnationCounter++;
        }

        if (accept) {
          this.selectionPolicy.updateOnlineStats(this.operatorStats, selectedGenerator.name, {
            accepted: true,
            improved: newFitness < currentFitness,
          });

          currentState = newState;
          currentFitness = newFitness;
          currentHardViolations = newHardViolations;

          if (
            newHardViolations < bestHardViolations ||
            (newHardViolations === bestHardViolations && newFitness < bestFitness)
          ) {
            bestState = this.config.cloneState(currentState);
            bestFitness = newFitness;
            bestHardViolations = newHardViolations;
            this.logger.log(
              'debug',
              `[Intensification] New best: Hard violations = ${bestHardViolations}, Fitness = ${bestFitness.toFixed(2)}`
            );
          }
        }

        if (stagnationCounter >= this.config.intensificationStagnationLimit) {
          intensificationTemp = this.config.initialTemperature * 0.5;
          stagnationCounter = 0;
          this.logger.log('debug', '[Intensification] Stagnation detected, reheating');
        }

        intensificationTemp *= 0.999;
        intensificationIterations++;
        iteration++;

        if (intensificationIterations % 500 === 0) {
          this.logger.log(
            'info',
            `[Intensification] Iter ${intensificationIterations}: Hard violations = ${currentHardViolations}, Best = ${bestHardViolations}`
          );
        }
      }

      if (bestHardViolations === 0) {
        this.logger.log(
          'info',
          `[Intensification] SUCCESS! All hard violations eliminated in attempt ${intensificationAttempt}`
        );
        break;
      }
    }

    if (bestHardViolations > 0) {
      this.logger.log(
        'warn',
        `[Intensification] Could not eliminate all hard violations. Remaining: ${bestHardViolations}`
      );
    }

    return {
      bestState,
      bestFitness,
      bestHardViolations,
      iteration,
    };
  }

  private async runPhase2(
    bestState: TState,
    bestFitness: number,
    bestHardViolations: number,
    temperature: number,
    iteration: number,
    iterationsWithoutImprovement: number,
    reheats: number
  ): Promise<{
    bestState: TState;
    bestFitness: number;
    bestHardViolations: number;
    temperature: number;
    iteration: number;
    reheats: number;
  }> {
    this.logger.log('info', 'Phase 2: Optimizing soft constraints');
    this.setPhase('phase2');

    let currentState = this.config.cloneState(bestState);
    let currentFitness = bestFitness;
    iterationsWithoutImprovement = 0;

    while (temperature > this.config.minTemperature && iteration < this.config.maxIterations) {
      const { newState, operatorName } = this.generateNeighbor(currentState, temperature, false, iteration);
      if (!newState) break;

      const { fitness: newFitness, hardViolations: newHardViolations } = this.calculateFitnessAndViolations(newState);

      if (this.config.tabuSearchEnabled) {
        const newSignature = this.getStateSignature(newState);
        if (this.shouldSkipTabu(newSignature, iteration, newFitness, bestFitness)) {
          this.progressReporter.addTabuHit();
          temperature *= this.config.coolingRate;
          iteration++;
          continue;
        }
      }

      this.selectionPolicy.updateOnlineStats(this.operatorStats, operatorName, { attempted: true });

      const acceptProb = acceptanceProbabilityPhase2(
        bestHardViolations,
        newHardViolations,
        currentFitness,
        newFitness,
        temperature
      );

      const accepted = Math.random() < acceptProb;

      if (accepted) {
        this.selectionPolicy.updateOnlineStats(this.operatorStats, operatorName, {
          accepted: true,
          improved: newFitness < currentFitness,
        });

        if (this.config.tabuSearchEnabled) {
          const currentSignature = this.getStateSignature(currentState);
          this.addToTabuList(currentSignature, iteration);
        }

        currentState = newState;
        currentFitness = newFitness;

        if (newHardViolations < bestHardViolations) {
          bestHardViolations = newHardViolations;
          this.logger.log('debug', `[Phase 2] Hard violations reduced to ${bestHardViolations}`);
        }

        if (newFitness < bestFitness) {
          bestState = this.config.cloneState(currentState);
          bestFitness = newFitness;
          iterationsWithoutImprovement = 0;
          this.progressReporter.updateMoveStats(true, true, iteration);

          this.logger.log(
            'debug',
            `[Phase 2] New best: Fitness = ${bestFitness.toFixed(2)}, Hard violations = ${newHardViolations}, Operator = ${operatorName}`
          );
        } else {
          iterationsWithoutImprovement++;
          this.progressReporter.updateMoveStats(true, false);
        }
      } else {
        iterationsWithoutImprovement++;
        this.progressReporter.updateMoveStats(false, false);
      }

      if (
        this.config.reheatingThreshold !== undefined &&
        iterationsWithoutImprovement >= this.config.reheatingThreshold &&
        reheats < this.config.maxReheats &&
        temperature < this.config.initialTemperature / 100
      ) {
        temperature *= this.config.reheatingFactor;
        reheats++;
        iterationsWithoutImprovement = 0;

        this.logger.log(
          'info',
          `[Phase 2] Reheating #${reheats}: Temperature = ${temperature.toFixed(2)}, Fitness = ${bestFitness.toFixed(2)}`
        );
        this.logHardViolationBreakdown('[Phase 2] Hard violation breakdown', bestState, 'phase2-reheat');

        if (this.progressReporter.shouldTriggerProgress(iteration, this.config.onProgress, this.config.logging.logInterval, true)) {
          const softV = this.getViolations(bestState).filter((v) => v.constraintType === 'soft').length;
          await this.progressReporter.triggerProgressCallback(
            iteration,
            currentFitness,
            bestFitness,
            temperature,
            bestHardViolations,
            softV,
            reheats,
            this.config.maxIterations,
            this.tabuMemory.size,
            this.config.onProgress,
            this.config.onProgressMode,
            (error) => this.logger.log('warn', 'onProgress callback error:', error)
          );
        }
      }

      temperature *= this.config.coolingRate;
      iteration++;

      if (
        iteration % this.config.logging.logInterval === 0 ||
        this.progressReporter.shouldTriggerProgress(iteration, this.config.onProgress, this.config.logging.logInterval)
      ) {
        this.logger.log(
          'info',
          `[Phase 2] Iteration ${iteration}: Temp = ${temperature.toFixed(2)}, Current = ${currentFitness.toFixed(2)}, Best = ${bestFitness.toFixed(2)}`
        );
        this.logHardViolationBreakdown('[Phase 2] Hard violation breakdown', currentState, 'phase2-iteration');

        if (this.progressReporter.shouldTriggerProgress(iteration, this.config.onProgress, this.config.logging.logInterval)) {
          const softV = this.getViolations(bestState).filter((v) => v.constraintType === 'soft').length;
          await this.progressReporter.triggerProgressCallback(
            iteration,
            currentFitness,
            bestFitness,
            temperature,
            bestHardViolations,
            softV,
            reheats,
            this.config.maxIterations,
            this.tabuMemory.size,
            this.config.onProgress,
            this.config.onProgressMode,
            (error) => this.logger.log('warn', 'onProgress callback error:', error)
          );
        }
      }
    }

    return {
      bestState,
      bestFitness,
      bestHardViolations,
      temperature,
      iteration,
      reheats,
    };
  }

  private createSolution(
    bestState: TState,
    bestFitness: number,
    bestHardViolations: number,
    finalTemperature: number,
    iteration: number,
    reheats: number
  ): Solution<TState> {
    const violations = this.getViolations(bestState);
    const hardViolations = violations.filter((v) => v.constraintType === 'hard').length;
    const softViolations = violations.filter((v) => v.constraintType === 'soft').length;

    this.logger.log('info', 'Optimization complete', {
      iterations: iteration,
      reheats,
      finalTemperature: finalTemperature.toFixed(4),
      fitness: bestFitness.toFixed(2),
      hardViolations,
      softViolations,
    });
    this.logHardViolationBreakdown('[Final] Hard violation breakdown', bestState, 'final', true);

    this.logOperatorStats();

    return {
      state: bestState,
      fitness: bestFitness,
      hardViolations,
      softViolations,
      iterations: iteration,
      reheats,
      finalTemperature,
      violations,
      operatorStats: this.getStats(),
    };
  }

  private calculateFitnessAndViolations(state: TState): { fitness: number; hardViolations: number } {
    let hardPenalty = 0;
    let softPenalty = 0;
    let hardViolationCount = 0;

    for (const constraint of this.hardConstraints) {
      const score = evaluateConstraintScore(constraint, state);
      if (score < 1) {
        hardPenalty += 1 - score;
        if (constraint.getViolations) {
          hardViolationCount += constraint.getViolations(state).length;
        } else {
          const inferredCount = score > 0 ? Math.round(1 / score - 1) : 1;
          hardViolationCount += Math.max(1, inferredCount);
        }
      }
    }

    for (const constraint of this.softConstraints) {
      const score = evaluateConstraintScore(constraint, state);
      const weight = constraint.weight ?? 10;
      if (score < 1) {
        softPenalty += (1 - score) * weight;
      }
    }

    return {
      fitness: hardPenalty * this.config.hardConstraintWeight + softPenalty,
      hardViolations: hardViolationCount,
    };
  }

  private generateNeighbor(
    state: TState,
    temperature: number,
    prioritizeHardFixes: boolean,
    iteration: number
  ): { newState: TState | null; operatorName: string } {
    const applicableGenerators = this.moveGenerators.filter((gen) => gen.canApply(state));
    if (applicableGenerators.length === 0) {
      return { newState: null, operatorName: '' };
    }

    let generatorsToSelectFrom = applicableGenerators;
    if (prioritizeHardFixes) {
      const fallbackTargeted = applicableGenerators.filter((gen) => {
        const name = gen.name.toLowerCase();
        return name.includes('fix') || name.includes('swap friday');
      });

      const violatedConstraintNames = this.getViolatedHardConstraintNames(state, iteration);
      const preferredTargeted = fallbackTargeted.filter((gen) => {
        const name = gen.name.toLowerCase();

        for (const constraintName of violatedConstraintNames) {
          if (constraintName.includes('exclusive room') && name.includes('exclusive')) return true;
          if (constraintName.includes('lecturer conflict') && name.includes('lecturer')) return true;
          if (constraintName.includes('room conflict') && name.includes('room conflict')) return true;
          if (constraintName.includes('room capacity') && name.includes('capacity')) return true;
          if (constraintName.includes('max daily periods') && name.includes('max daily')) return true;
          if (constraintName.includes('friday') && (name.includes('friday') || name.includes('prayer'))) return true;
        }

        return false;
      });

      const targeted = preferredTargeted.length > 0 ? preferredTargeted : fallbackTargeted;

      if (targeted.length > 0 && Math.random() < 0.7) {
        generatorsToSelectFrom = targeted;
      }
    }

    const selectedGenerator = this.selectionPolicy.selectMoveGenerator(
      generatorsToSelectFrom,
      this.operatorStats,
      this.config.operatorSelectionMode ?? 'hybrid'
    );

    const clonedState = this.config.cloneState(state);
    const newState = selectedGenerator.generate(clonedState, temperature);
    return { newState, operatorName: selectedGenerator.name };
  }

  private getViolatedHardConstraintNames(state: TState, iteration: number): Set<string> {
    const refreshInterval = 50;
    if (
      this.hardConstraintHintCache.iteration >= 0 &&
      iteration - this.hardConstraintHintCache.iteration < refreshInterval
    ) {
      return this.hardConstraintHintCache.violatedConstraintNames;
    }

    const violated = new Set<string>();
    for (const constraint of this.hardConstraints) {
      const score = evaluateConstraintScore(constraint, state);
      if (score < 1) {
        violated.add(constraint.name.toLowerCase());
      }
    }

    this.hardConstraintHintCache = {
      iteration,
      violatedConstraintNames: violated,
    };

    return violated;
  }

  private getStateSignature(state: TState): string {
    return getDefaultStateSignature(state, this.logger, this.config.getStateSignature);
  }

  private getHardViolationBreakdown(state: TState): Record<string, number> {
    const breakdown: Record<string, number> = {};

    for (const constraint of this.hardConstraints) {
      const score = evaluateConstraintScore(constraint, state);
      if (score >= 1) continue;

      if (constraint.getViolations) {
        const count = constraint.getViolations(state).length;
        if (count > 0) {
          breakdown[constraint.name] = count;
        }
        continue;
      }

      const inferredCount = score > 0 ? Math.max(1, Math.round(1 / score - 1)) : 1;
      breakdown[constraint.name] = inferredCount;
    }

    return breakdown;
  }

  private logHardViolationBreakdown(
    message: string,
    state: TState,
    cacheKey: string,
    force = false
  ): void {
    const breakdown = this.getHardViolationBreakdown(state);
    const normalizedBreakdown =
      force && Object.keys(breakdown).length === 0 ? { none: 0 } : breakdown;

    // Skip noisy repeated logs when there are no hard violations
    if (!force && Object.keys(normalizedBreakdown).length === 0) {
      return;
    }

    const serialized = JSON.stringify(
      Object.keys(normalizedBreakdown)
        .sort()
        .map((key) => [key, normalizedBreakdown[key]])
    );

    if (!force && this.hardBreakdownLogCache.get(cacheKey) === serialized) {
      return;
    }

    this.hardBreakdownLogCache.set(cacheKey, serialized);

    this.logger.log('info', message, normalizedBreakdown);
  }

  // Backward-compatibility for existing tests and internal extension points
  private shouldSkipTabu(
    signature: string,
    currentIteration: number,
    newFitness: number,
    globalBestFitness: number
  ): boolean {
    if (!this.config.tabuSearchEnabled) return false;
    return this.tabuMemory.shouldSkip(
      signature,
      currentIteration,
      newFitness,
      globalBestFitness,
      this.config.aspirationEnabled
    );
  }

  private addToTabuList(signature: string, iteration: number): void {
    this.tabuMemory.add(signature, iteration);
  }

  private cleanupTabuList(currentIteration: number): void {
    this.tabuMemory.cleanup(currentIteration);
  }

  private getViolations(state: TState): Violation[] {
    const violations: Violation[] = [];

    for (const constraint of this.constraints) {
      const score = evaluateConstraintScore(constraint, state);
      if (score >= 1) continue;

      if (constraint.getViolations) {
        const descriptions = constraint.getViolations(state);
        for (const description of descriptions) {
          violations.push({
            constraintName: constraint.name,
            constraintType: constraint.type,
            score,
            description,
          });
        }
      } else {
        const violation: Violation = {
          constraintName: constraint.name,
          constraintType: constraint.type,
          score,
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

    return violations;
  }

  private logOperatorStats(): void {
    this.logger.log('info', 'Operator Statistics:');
    for (const operatorName in this.operatorStats) {
      const stats = this.operatorStats[operatorName]!;
      this.logger.log(
        'info',
        `  ${operatorName}: Attempts = ${stats.attempts}, Improvements = ${stats.improvements}, Accepted = ${stats.accepted}, Success Rate = ${(stats.successRate * 100).toFixed(2)}%`
      );
    }
  }

  private setPhase(phase: 'phase1' | 'phase15' | 'phase2' | 'initial'): void {
    if (this.progressReporter.setPhase(phase)) {
      this.logger.log('info', `Entering ${phase} phase`);
    }
  }

  private resetRuntimeState(): void {
    this.tabuMemory.clear();
    this.progressReporter.reset();
    this.hardConstraintHintCache = {
      iteration: -1,
      violatedConstraintNames: new Set<string>(),
    };
    this.hardBreakdownLogCache.clear();

    for (const operatorName in this.operatorStats) {
      this.operatorStats[operatorName] = {
        attempts: 0,
        improvements: 0,
        accepted: 0,
        successRate: 0,
      };
    }
  }

  getStats(): OperatorStats {
    const snapshot: OperatorStats = {};
    for (const operatorName in this.operatorStats) {
      snapshot[operatorName] = { ...this.operatorStats[operatorName]! };
    }
    return snapshot;
  }
}
