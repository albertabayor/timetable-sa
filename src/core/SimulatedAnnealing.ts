import type { Constraint } from './interfaces/Constraint.js';
import type { MoveGenerator } from './interfaces/MoveGenerator.js';
import type { SAConfig } from './interfaces/SAConfig.js';
import type { Solution, OperatorStats, SolverDiagnostics } from './types/Solution.js';
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
import { SolveCancelledError, SolveConcurrencyError } from './errors.js';

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
  private diagnostics: SolverDiagnostics = {
    phaseTimings: {
      phase1Ms: 0,
      phase15Ms: 0,
      phase2Ms: 0,
      totalRuntimeMs: 0,
    },
    feasibility: {
      initialHardViolations: 0,
      bestHardViolationsAfterPhase1: 0,
      bestHardViolationsAfterPhase15: 0,
      bestHardViolationsFinal: 0,
      timeToFirstFeasibleMs: null,
      iterationToFirstFeasible: null,
    },
    intensification: {
      triggered: false,
      attemptsRun: 0,
      iterationsRun: 0,
      phase15BudgetLimitIterations: 0,
      phase15BudgetUsedIterations: 0,
      acceptedMoves: 0,
      hardImprovingAcceptedMoves: 0,
      equalHardAcceptedMoves: 0,
      hardWorseningAcceptedMoves: 0,
      phase15TabuSkips: 0,
      localReheats: 0,
      bestUpdates: 0,
      phase15EndedByBudget: false,
      phase15EndedByEarlyStop: false,
      phase15StartHard: null,
      phase15WorstCurrentHard: null,
      phase15EndCurrentHard: null,
      phase15BestHardDelta: null,
    },
  };

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

  private throwIfCancelled(): void {
    if (this.config.cancelSignal?.aborted) {
      throw new SolveCancelledError();
    }
  }

  async solve(): Promise<Solution<TState>> {
    if (this.isSolving) {
      throw new SolveConcurrencyError(
        'solve() is already running on this SimulatedAnnealing instance. Await the current solve() call or use a new instance.'
      );
    }

    this.isSolving = true;

    try {
      this.throwIfCancelled();
      this.resetRuntimeState();
      this.throwIfCancelled();

      const solveStartTime = performance.now();
      this.logger.log('info', 'Starting optimization...');
      this.logger.log('info', 'Phase 1: Eliminating hard constraint violations');
      this.setPhase('phase1');
      this.throwIfCancelled();

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

      this.diagnostics.feasibility.initialHardViolations = currentHardViolations;
      if (currentHardViolations === 0) {
        this.recordFirstFeasible(0, solveStartTime);
      }

      const initialViolations = this.getViolations(currentState);
      const initialSoftViolations = initialViolations.filter((v) => v.constraintType === 'soft').length;
      const initialHardViolations = initialViolations.filter((v) => v.constraintType === 'hard').length;

      this.logger.log('info', 'Initial state violations summary', {
        hardViolations: initialHardViolations,
        softViolations: initialSoftViolations,
        totalViolations: initialViolations.length,
      });

      if (this.config.onProgress) {
        this.throwIfCancelled();
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
        this.throwIfCancelled();
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

      const phase1StartTime = performance.now();
      this.throwIfCancelled();
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
        reheats,
        solveStartTime
      );
      this.throwIfCancelled();
      this.diagnostics.phaseTimings.phase1Ms = performance.now() - phase1StartTime;

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
      this.diagnostics.feasibility.bestHardViolationsAfterPhase1 = bestHardViolations;

      this.logger.log('info', `Phase 1 complete: Hard violations = ${bestHardViolations}`);

      if (bestHardViolations > 0 && this.config.enableIntensification) {
        this.setPhase('phase15');
        const phase15StartTime = performance.now();
        this.throwIfCancelled();
        const intensificationResult = await this.runIntensification(
          bestState,
          bestFitness,
          bestHardViolations,
          temperature,
          iteration,
          solveStartTime
        );
        this.throwIfCancelled();
        this.diagnostics.phaseTimings.phase15Ms = performance.now() - phase15StartTime;

        bestState = intensificationResult.bestState;
        bestFitness = intensificationResult.bestFitness;
        bestHardViolations = intensificationResult.bestHardViolations;
        iteration = intensificationResult.iteration;
      }
      this.diagnostics.feasibility.bestHardViolationsAfterPhase15 = bestHardViolations;

      const phase2StartTime = performance.now();
      this.throwIfCancelled();
      const phase2Result = await this.runPhase2(
        bestState,
        bestFitness,
        bestHardViolations,
        temperature,
        iteration,
        iterationsWithoutImprovement,
        reheats,
        solveStartTime
      );
      this.throwIfCancelled();
      this.diagnostics.phaseTimings.phase2Ms = performance.now() - phase2StartTime;
      this.diagnostics.phaseTimings.totalRuntimeMs = performance.now() - solveStartTime;
      this.diagnostics.feasibility.bestHardViolationsFinal = phase2Result.bestHardViolations;

      this.throwIfCancelled();
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
    reheats: number,
    solveStartTime: number
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
    this.throwIfCancelled();

    while (
      temperature > this.config.initialTemperature / 10 &&
      phase1Iteration < phase1MaxIterations &&
      bestHardViolations > 0
    ) {
      this.throwIfCancelled();
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
          this.throwIfCancelled();
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
          if (bestHardViolations === 0) {
            this.recordFirstFeasible(iteration, solveStartTime);
          }
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
          this.throwIfCancelled();
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
          this.throwIfCancelled();
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
          this.throwIfCancelled();
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
          this.throwIfCancelled();
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
    phase1EndTemperature: number,
    iteration: number,
    solveStartTime: number
  ): Promise<{
    bestState: TState;
    bestFitness: number;
    bestHardViolations: number;
    iteration: number;
  }> {
    this.throwIfCancelled();
    this.logger.log("info", "Phase 1.5: Intensification - targeting remaining hard violations");
    this.diagnostics.intensification.triggered = true;
    this.diagnostics.intensification.phase15StartHard = bestHardViolations;
    this.diagnostics.intensification.phase15WorstCurrentHard = bestHardViolations;

    const targetedNameSet = new Set(this.config.intensificationTargetedOperatorNames.map((name) => name.toLowerCase()));
    const phase15BudgetLimit = Math.max(1, Math.floor(this.config.maxIterations * this.config.intensificationBudgetFractionOfMaxIterations));

    this.diagnostics.intensification.phase15BudgetLimitIterations = phase15BudgetLimit;

    let remainingBudget = phase15BudgetLimit;

    // PR: these initial assignments are redundant because they are overwritten
    // at the start of the loop. Leaving as-is for now.
    let currentState = this.config.cloneState(bestState);
    let currentFitness = bestFitness;
    let currentHardViolations = bestHardViolations;
    let intensificationAttempt = 0;

    while (bestHardViolations > 0 && intensificationAttempt < this.config.maxIntensificationAttempts && remainingBudget > 0) {
      this.throwIfCancelled();
      intensificationAttempt++;
      this.diagnostics.intensification.attemptsRun = intensificationAttempt;
      this.logger.log("info", `[Intensification] Attempt ${intensificationAttempt}/${this.config.maxIntensificationAttempts}`);

      let intensificationTemp = this.resolveIntensificationStartTemperature(phase1EndTemperature);
      let intensificationIterations = 0;
      let stagnationCounter = 0;
      let noBestImproveCounter = 0;
      let attemptEndedByEarlyStop = false;

      currentState = this.config.cloneState(bestState);
      currentFitness = bestFitness;
      currentHardViolations = bestHardViolations;
      this.throwIfCancelled();

      const attemptIterationBudget = Math.min(this.config.intensificationIterations, remainingBudget);

      while (intensificationIterations < attemptIterationBudget && bestHardViolations > 0 && remainingBudget > 0) {
        this.throwIfCancelled();
        const allGenerators = this.moveGenerators.filter((gen) => gen.canApply(currentState));
        if (allGenerators.length === 0) break;

        const targetedGenerators = targetedNameSet.size === 0 ? [] : allGenerators.filter((gen) => targetedNameSet.has(gen.name.toLowerCase()));
        const generators = targetedGenerators.length > 0 && Math.random() < this.config.intensificationTargetedSelectionRate ? targetedGenerators : allGenerators;

        const selectedGenerator = generators[Math.floor(Math.random() * generators.length)]!;
        const clonedState = this.config.cloneState(currentState);
        const newState = selectedGenerator.generate(clonedState, intensificationTemp);
        this.throwIfCancelled();

        if (newState) {
          this.selectionPolicy.updateOnlineStats(this.operatorStats, selectedGenerator.name, { attempted: true });

          const { fitness: newFitness, hardViolations: newHardViolations } = this.calculateFitnessAndViolations(newState);
          this.diagnostics.intensification.phase15WorstCurrentHard = Math.max(this.diagnostics.intensification.phase15WorstCurrentHard ?? newHardViolations, newHardViolations);

          const shouldSkipWithTabu = this.config.intensificationUseTabu && this.config.tabuSearchEnabled && this.shouldSkipTabu(this.getStateSignature(newState), iteration, newFitness, bestFitness);

          if (shouldSkipWithTabu) {
            this.diagnostics.intensification.phase15TabuSkips++;
            this.progressReporter.addTabuHit();
            stagnationCounter++;
            noBestImproveCounter++;
          } else {
            let accept = false;
            let acceptanceCategory: "hard-improving" | "equal-hard" | "hard-worsening" | null = null;
            if (newHardViolations < currentHardViolations) {
              accept = true;
              acceptanceCategory = "hard-improving";
              stagnationCounter = 0;
            } else if (newHardViolations === currentHardViolations) {
              if (newFitness < currentFitness) {
                accept = true;
                acceptanceCategory = "equal-hard";
                stagnationCounter = 0;
              } else {
                const acceptProb = safeExp((currentFitness - newFitness) / intensificationTemp);
                accept = Math.random() < acceptProb;
                if (accept) {
                  acceptanceCategory = "equal-hard";
                }
                stagnationCounter++;
              }
            } else {
              /**
               * Allow rare hard-worsening moves to escape local minima during intensification.
               * Higher hardConstraintWeight makes these moves less likely to be accepted,
               * while higher intensificationTemp makes them more likely.
               */
              const worsenProb = safeExp(-(this.config.hardConstraintWeight / intensificationTemp));

              /**
               * Allow rare hard-worsening moves to escape local minima during intensification.
               * Higher hardConstraintWeight makes these moves less likely to be accepted,
               * while higher intensificationTemp makes them more likely.
               * The extra 0.02 factor keeps the final acceptance chance very small.
               *
               * PR : might be worth making the 0.02 factor configurable in case users want to allow more or fewer worsening moves during intensification
               */
              if (Math.random() < worsenProb * 0.02) {
                accept = true;
                acceptanceCategory = "hard-worsening";
                this.logger.log("debug", "[Intensification] Accepting worsening move to escape local minimum");
              }
              stagnationCounter++;
            }

            if (accept) {
              this.diagnostics.intensification.acceptedMoves++;
              if (acceptanceCategory === "hard-improving") {
                this.diagnostics.intensification.hardImprovingAcceptedMoves++;
              } else if (acceptanceCategory === "equal-hard") {
                this.diagnostics.intensification.equalHardAcceptedMoves++;
              } else if (acceptanceCategory === "hard-worsening") {
                this.diagnostics.intensification.hardWorseningAcceptedMoves++;
              }
              this.selectionPolicy.updateOnlineStats(this.operatorStats, selectedGenerator.name, {
                accepted: true,
                improved: newFitness < currentFitness,
              });

              if (this.config.intensificationUseTabu && this.config.tabuSearchEnabled) {
                const currentSignature = this.getStateSignature(currentState);
                this.addToTabuList(currentSignature, iteration);
              }

              currentState = newState;
              currentFitness = newFitness;
              currentHardViolations = newHardViolations;

              const isBestImprovement = newHardViolations < bestHardViolations || (newHardViolations === bestHardViolations && newFitness < bestFitness);

              if (isBestImprovement) {
                bestState = this.config.cloneState(currentState);
                bestFitness = newFitness;
                bestHardViolations = newHardViolations;
                this.diagnostics.intensification.bestUpdates++;
                noBestImproveCounter = 0;
                if (bestHardViolations === 0) {
                  this.recordFirstFeasible(iteration, solveStartTime);
                }
                this.logger.log("debug", `[Intensification] New best: Hard violations = ${bestHardViolations}, Fitness = ${bestFitness.toFixed(2)}`);
              } else {
                noBestImproveCounter++;
              }
            } else {
              noBestImproveCounter++;
            }
          }
        } else {
          stagnationCounter++;
          noBestImproveCounter++;
        }

        if (stagnationCounter >= this.config.intensificationStagnationLimit) {
          intensificationTemp = Math.max(this.config.minTemperature, intensificationTemp * 0.5);
          stagnationCounter = 0;
          this.diagnostics.intensification.localReheats++;
          this.logger.log("debug", "[Intensification] Stagnation detected, reheating");
        }

        intensificationTemp = Math.max(this.config.minTemperature, intensificationTemp * 0.999);
        intensificationIterations++;
        this.diagnostics.intensification.iterationsRun++;
        iteration++;
        remainingBudget--;
        this.throwIfCancelled();

        if (noBestImproveCounter >= this.config.intensificationEarlyStopNoBestImproveIterations) {
          attemptEndedByEarlyStop = true;
          this.diagnostics.intensification.phase15EndedByEarlyStop = true;
          this.logger.log("info", `[Intensification] Early-stop attempt ${intensificationAttempt}: no best-hard improvement for ${noBestImproveCounter} iterations`);
          this.throwIfCancelled();
          break;
        }

        if (intensificationIterations % 500 === 0) {
          this.logger.log("info", `[Intensification] Iter ${intensificationIterations}: Hard violations = ${currentHardViolations}, Best = ${bestHardViolations}, Remaining budget = ${remainingBudget}`);
        }
      }

      if (bestHardViolations === 0) {
        this.logger.log("info", `[Intensification] SUCCESS! All hard violations eliminated in attempt ${intensificationAttempt}`);
        this.throwIfCancelled();
        break;
      }

      if (attemptEndedByEarlyStop) {
        this.throwIfCancelled();
        continue;
      }
    }

    this.diagnostics.intensification.phase15BudgetUsedIterations = phase15BudgetLimit - remainingBudget;
    if (remainingBudget <= 0 && bestHardViolations > 0) {
      this.diagnostics.intensification.phase15EndedByBudget = true;
    }

    if (bestHardViolations > 0) {
      this.logger.log("warn", `[Intensification] Could not eliminate all hard violations. Remaining: ${bestHardViolations}`);
    }

    this.diagnostics.intensification.phase15EndCurrentHard = currentHardViolations;
    const phase15StartHard = this.diagnostics.intensification.phase15StartHard;
    this.diagnostics.intensification.phase15BestHardDelta = this.diagnostics.intensification.phase15StartHard === null ? null : bestHardViolations - phase15StartHard;

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
    reheats: number,
    solveStartTime: number
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
    this.throwIfCancelled();

    let currentState = this.config.cloneState(bestState);
    let currentFitness = bestFitness;
    iterationsWithoutImprovement = 0;

    while (temperature > this.config.minTemperature && iteration < this.config.maxIterations) {
      this.throwIfCancelled();
      const { newState, operatorName } = this.generateNeighbor(currentState, temperature, false, iteration);
      if (!newState) break;

      const { fitness: newFitness, hardViolations: newHardViolations } = this.calculateFitnessAndViolations(newState);

      if (this.config.tabuSearchEnabled) {
        const newSignature = this.getStateSignature(newState);
        if (this.shouldSkipTabu(newSignature, iteration, newFitness, bestFitness)) {
          this.progressReporter.addTabuHit();
          temperature *= this.config.coolingRate;
          iteration++;
          this.throwIfCancelled();
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
          if (bestHardViolations === 0) {
            this.recordFirstFeasible(iteration, solveStartTime);
          }
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
          this.throwIfCancelled();
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
          this.throwIfCancelled();
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
          this.throwIfCancelled();
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
          this.throwIfCancelled();
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

  private resolveIntensificationStartTemperature(phase1EndTemperature: number): number {
    if (this.config.intensificationStartTemperatureMode === 'initial-reset') {
      return this.config.initialTemperature;
    }

    const scaled = phase1EndTemperature * this.config.intensificationStartTempMultiplier;
    const capped = Math.min(
      scaled,
      this.config.initialTemperature * this.config.intensificationStartTempCapRatio
    );
    return Math.max(this.config.minTemperature, capped);
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
      diagnostics: this.getDiagnostics(),
    };
  }

  private recordFirstFeasible(iteration: number, solveStartTime: number): void {
    if (this.diagnostics.feasibility.timeToFirstFeasibleMs !== null) {
      return;
    }

    this.diagnostics.feasibility.timeToFirstFeasibleMs = performance.now() - solveStartTime;
    this.diagnostics.feasibility.iterationToFirstFeasible = iteration;
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
    this.diagnostics = {
      phaseTimings: {
        phase1Ms: 0,
        phase15Ms: 0,
        phase2Ms: 0,
        totalRuntimeMs: 0,
      },
      feasibility: {
        initialHardViolations: 0,
        bestHardViolationsAfterPhase1: 0,
        bestHardViolationsAfterPhase15: 0,
        bestHardViolationsFinal: 0,
        timeToFirstFeasibleMs: null,
        iterationToFirstFeasible: null,
      },
      intensification: {
        triggered: false,
        attemptsRun: 0,
        iterationsRun: 0,
        phase15BudgetLimitIterations: 0,
        phase15BudgetUsedIterations: 0,
        acceptedMoves: 0,
        hardImprovingAcceptedMoves: 0,
        equalHardAcceptedMoves: 0,
        hardWorseningAcceptedMoves: 0,
        phase15TabuSkips: 0,
        localReheats: 0,
        bestUpdates: 0,
        phase15EndedByBudget: false,
        phase15EndedByEarlyStop: false,
        phase15StartHard: null,
        phase15WorstCurrentHard: null,
        phase15EndCurrentHard: null,
        phase15BestHardDelta: null,
      },
    };

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

  getDiagnostics(): SolverDiagnostics {
    return {
      phaseTimings: { ...this.diagnostics.phaseTimings },
      feasibility: { ...this.diagnostics.feasibility },
      intensification: { ...this.diagnostics.intensification },
    };
  }
}
