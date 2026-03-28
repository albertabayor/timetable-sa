/**
 * Generic Simulated Annealing optimizer for constraint satisfaction problems.
 *
 * This class implements a multi-phase simulated annealing algorithm:
 * - Phase 1: Eliminate hard constraint violations (60% of maxIterations)
 * - Phase 1.5: Intensification - Aggressively target remaining hard violations (optional)
 * - Phase 2: Optimize soft constraints while maintaining hard constraint satisfaction
 *
 * Features:
 * - Tabu Search: Prevents cycling by tracking recently visited states
 * - Aspiration Criteria: Overrides tabu status for exceptionally good solutions
 * - Adaptive Operator Selection: Learns which operators work best
 * - Reheating: Escapes local minima by temporarily increasing temperature
 * - Intensification: Focused optimization to eliminate stubborn hard violations
 *
 * @template TState - The state type for your problem domain
 */

import type { Constraint } from './interfaces/Constraint.js';
import type { MoveGenerator } from './interfaces/MoveGenerator.js';
import type { SAConfig } from './interfaces/SAConfig.js';
import type { Solution, OperatorStats } from './types/Solution.js';
import type { Violation } from './types/Violation.js';
import type { ProgressStats } from './types/ProgressStats.js';

export class SimulatedAnnealing<TState> {
  private initialState: TState;
  private constraints: Constraint<TState>[];
  private hardConstraints: Constraint<TState>[];
  private softConstraints: Constraint<TState>[];
  private moveGenerators: MoveGenerator<TState>[];
  private config: SAConfig<TState> & {
    reheatingFactor: number;
    maxReheats: number;
    tabuSearchEnabled: boolean;
    tabuTenure: number;
    maxTabuListSize: number;
    aspirationEnabled: boolean;
    enableIntensification: boolean;
    intensificationIterations: number;
    maxIntensificationAttempts: number;
    intensificationStagnationLimit?: number;
    getStateSignature?: (state: TState) => string;
    logging: Required<NonNullable<SAConfig<TState>['logging']>>;
  };
  // Operator statistics
  private operatorStats: OperatorStats = {};

  // Re-entrancy guard
  private isSolving = false;

  // Tabu list: stores move signatures with the iteration they were added
  private tabuList: Map<string, number> = new Map();

  // Progress tracking
  private progressStats: {
    acceptedMoves: number;
    rejectedMoves: number;
    stagnationCount: number;
    bestCostIteration: number;
    currentPhase: 'phase1' | 'phase15' | 'phase2' | 'initial';
    lastProgressIteration: number;
    initialCost: number;
    tabuHits: number;
  } = {
    acceptedMoves: 0,
    rejectedMoves: 0,
    stagnationCount: 0,
    bestCostIteration: 0,
    currentPhase: 'initial',
    lastProgressIteration: -1,
    initialCost: 0,
    tabuHits: 0,
  };

  /**
   * Reset mutable runtime state before each solve() call
   */
  private resetRuntimeState(): void {
    this.tabuList.clear();

    this.progressStats = {
      acceptedMoves: 0,
      rejectedMoves: 0,
      stagnationCount: 0,
      bestCostIteration: 0,
      currentPhase: 'initial',
      lastProgressIteration: -1,
      initialCost: 0,
      tabuHits: 0,
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

  /**
   * Validate required numeric config field
   */
  private assertFiniteNumber(value: number, fieldName: string): void {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error(`${fieldName} must be a finite number, got ${value}`);
    }
  }

  /**
   * Validate optional numeric config field
   */
  private assertOptionalFiniteNumber(value: number | undefined, fieldName: string): void {
    if (value === undefined) return;
    this.assertFiniteNumber(value, fieldName);
  }

  /**
   * Validates all constructor inputs to ensure they meet requirements
   */
  private validateInputs(
    initialState: TState,
    constraints: Constraint<TState>[],
    moveGenerators: MoveGenerator<TState>[],
    config: SAConfig<TState>
  ): void {
    // Validate initial state
    if (initialState === null || initialState === undefined) {
      throw new Error('Initial state cannot be null or undefined');
    }

    // Validate constraints
    if (!Array.isArray(constraints)) {
      throw new Error('Constraints must be an array');
    }

    for (const constraint of constraints) {
      if (!constraint.name || typeof constraint.name !== 'string') {
        throw new Error('All constraints must have a name property');
      }
      if (!constraint.type || !['hard', 'soft'].includes(constraint.type)) {
        throw new Error(`Constraint "${constraint.name}" must have type 'hard' or 'soft'`);
      }
      if (typeof constraint.evaluate !== 'function') {
        throw new Error(`Constraint "${constraint.name}" must have an evaluate function`);
      }
    }

    // Validate move generators
    if (!Array.isArray(moveGenerators)) {
      throw new Error('Move generators must be an array');
    }

    // Note: Empty move generators are allowed and handled gracefully at runtime
    // The algorithm will simply return the initial state unchanged

    for (const generator of moveGenerators) {
      if (!generator.name || typeof generator.name !== 'string') {
        throw new Error('All move generators must have a name property');
      }
      if (typeof generator.generate !== 'function') {
        throw new Error(`Move generator "${generator.name}" must have a generate function`);
      }
      if (typeof generator.canApply !== 'function') {
        throw new Error(`Move generator "${generator.name}" must have a canApply function`);
      }
    }

    // Validate config
    this.assertFiniteNumber(config.initialTemperature, 'initialTemperature');
    if (config.initialTemperature <= 0) {
      throw new Error(`initialTemperature must be positive, got ${config.initialTemperature}`);
    }

    this.assertFiniteNumber(config.minTemperature, 'minTemperature');
    if (config.minTemperature <= 0) {
      throw new Error(`minTemperature must be positive, got ${config.minTemperature}`);
    }

    this.assertFiniteNumber(config.coolingRate, 'coolingRate');
    if (config.coolingRate <= 0 || config.coolingRate >= 1) {
      throw new Error(`coolingRate must be between 0 and 1 (exclusive), got ${config.coolingRate}`);
    }

    this.assertFiniteNumber(config.maxIterations, 'maxIterations');
    if (!Number.isInteger(config.maxIterations) || config.maxIterations <= 0) {
      throw new Error(`maxIterations must be positive, got ${config.maxIterations}`);
    }

    this.assertFiniteNumber(config.hardConstraintWeight, 'hardConstraintWeight');
    if (config.hardConstraintWeight <= 0) {
      throw new Error(`hardConstraintWeight must be a positive number, got ${config.hardConstraintWeight}`);
    }

    if (typeof config.cloneState !== 'function') {
      throw new Error('cloneState must be a function');
    }

    // Validate optional config values if provided
    this.assertOptionalFiniteNumber(config.reheatingThreshold, 'reheatingThreshold');
    if (config.reheatingThreshold !== undefined && (!Number.isInteger(config.reheatingThreshold) || config.reheatingThreshold <= 0)) {
      throw new Error(`reheatingThreshold must be positive if provided, got ${config.reheatingThreshold}`);
    }

    this.assertOptionalFiniteNumber(config.maxReheats, 'maxReheats');
    if (config.maxReheats !== undefined && (!Number.isInteger(config.maxReheats) || config.maxReheats < 0)) {
      throw new Error(`maxReheats must be non-negative if provided, got ${config.maxReheats}`);
    }

    this.assertOptionalFiniteNumber(config.reheatingFactor, 'reheatingFactor');
    if (config.reheatingFactor !== undefined && config.reheatingFactor <= 1) {
      throw new Error(`reheatingFactor must be greater than 1 if provided, got ${config.reheatingFactor}`);
    }

    this.assertOptionalFiniteNumber(config.tabuTenure, 'tabuTenure');
    if (config.tabuTenure !== undefined && (!Number.isInteger(config.tabuTenure) || config.tabuTenure <= 0)) {
      throw new Error(`tabuTenure must be positive if provided, got ${config.tabuTenure}`);
    }

    this.assertOptionalFiniteNumber(config.maxTabuListSize, 'maxTabuListSize');
    if (config.maxTabuListSize !== undefined && (!Number.isInteger(config.maxTabuListSize) || config.maxTabuListSize <= 0)) {
      throw new Error(`maxTabuListSize must be positive if provided, got ${config.maxTabuListSize}`);
    }

    this.assertOptionalFiniteNumber(config.intensificationIterations, 'intensificationIterations');
    if (config.intensificationIterations !== undefined && (!Number.isInteger(config.intensificationIterations) || config.intensificationIterations <= 0)) {
      throw new Error(`intensificationIterations must be positive if provided, got ${config.intensificationIterations}`);
    }

    this.assertOptionalFiniteNumber(config.maxIntensificationAttempts, 'maxIntensificationAttempts');
    if (config.maxIntensificationAttempts !== undefined && (!Number.isInteger(config.maxIntensificationAttempts) || config.maxIntensificationAttempts <= 0)) {
      throw new Error(`maxIntensificationAttempts must be positive if provided, got ${config.maxIntensificationAttempts}`);
    }

    this.assertOptionalFiniteNumber(config.intensificationStagnationLimit, 'intensificationStagnationLimit');
    if (config.intensificationStagnationLimit !== undefined && (!Number.isInteger(config.intensificationStagnationLimit) || config.intensificationStagnationLimit <= 0)) {
      throw new Error(`intensificationStagnationLimit must be positive if provided, got ${config.intensificationStagnationLimit}`);
    }

    if (config.logging?.logInterval !== undefined) {
      this.assertFiniteNumber(config.logging.logInterval, 'logging.logInterval');
      if (!Number.isInteger(config.logging.logInterval) || config.logging.logInterval <= 0) {
        throw new Error(`logging.logInterval must be a positive integer if provided, got ${config.logging.logInterval}`);
      }
    }
  }

  constructor(
    initialState: TState,
    constraints: Constraint<TState>[],
    moveGenerators: MoveGenerator<TState>[],
    config: SAConfig<TState>
  ) {
    // Input validation
    this.validateInputs(initialState, constraints, moveGenerators, config);

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
   * Algorithm Phases:
   * 1. Phase 1: Eliminate hard constraint violations (60% of maxIterations)
   *    - Focuses on reducing hard violations
   *    - Uses tabu search if enabled to prevent cycling
   *    - Reheats if stuck in local minima
   *
   * 2. Phase 1.5: Intensification (if enableIntensification = true and hardViolations > 0)
   *    - Aggressively targets remaining hard violations
   *    - Uses focused operator selection (70% targeted, 30% random)
   *    - Multiple restart attempts (maxIntensificationAttempts)
   *    - Stops early when all hard violations eliminated
   *
   * 3. Phase 2: Optimize soft constraints
   *    - Maintains hard constraint satisfaction (strict enforcement)
   *    - Optimizes soft constraint satisfaction
   *    - Uses tabu search if enabled
   *
   * @returns Best solution found with detailed statistics
   */
  async solve(): Promise<Solution<TState>> {
    if (this.isSolving) {
      throw new Error('solve() is already running on this SimulatedAnnealing instance. Await the current solve() call or use a new instance.');
    }

    this.isSolving = true;
    this.resetRuntimeState();

    try {
      this.log('info', 'Starting optimization...');
      this.log('info', 'Phase 1: Eliminating hard constraint violations');
      
      // Initialize phase
      this.setPhase('phase1');

      let currentState = this.config.cloneState(this.initialState);
      let bestState = this.config.cloneState(currentState);

      const initialResult = this.calculateFitnessAndViolations(currentState);
      let currentFitness = initialResult.fitness;
      let bestFitness = currentFitness;

      // Store initial cost for progress tracking
      this.progressStats.initialCost = currentFitness;

      let currentHardViolations = initialResult.hardViolations;
      let bestHardViolations = currentHardViolations;

      let temperature = this.config.initialTemperature;
      let iteration = 0;
      let iterationsWithoutImprovement = 0;
      let reheats = 0;

      this.log('info', 'Initial state', {
        fitness: currentFitness.toFixed(2),
        hardViolations: currentHardViolations,
      });

      // Calculate and log soft violations for initial state
      const initialViolations = this.getViolations(currentState);
      const initialSoftViolations = initialViolations.filter(
        (v) => v.constraintType === 'soft'
      ).length;
      const initialHardViolations = initialViolations.filter(
        (v) => v.constraintType === 'hard'
      ).length;

      this.log('info', 'Initial state violations summary', {
        hardViolations: initialHardViolations,
        softViolations: initialSoftViolations,
        totalViolations: initialViolations.length,
      });

      // Trigger initial progress callback
      if (this.config.onProgress) {
        await this.triggerProgressCallback(
          0,
          currentFitness,
          bestFitness,
          temperature,
          currentHardViolations,
          initialSoftViolations,
          reheats
        );
      }

      // Calculate breakdown per constraint type
      const violationsByConstraint = initialViolations.reduce(
        (acc, v) => {
          const key = `${v.constraintType}:${v.constraintName}`;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      this.log('info', 'Initial violations breakdown by constraint', violationsByConstraint);

      // Phase 1: Eliminate hard constraints
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

      this.log('info', `Phase 1 complete: Hard violations = ${bestHardViolations}`);

      // Phase 1.5: Intensification
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

      // Phase 2: Optimize soft constraints
      const phase2Result = await this.runPhase2(
        bestState,
        bestFitness,
        bestHardViolations,
        temperature,
        iteration,
        iterationsWithoutImprovement,
        reheats
      );

      bestState = phase2Result.bestState;
      bestFitness = phase2Result.bestFitness;
      bestHardViolations = phase2Result.bestHardViolations;
      temperature = phase2Result.temperature;
      iteration = phase2Result.iteration;
      reheats = phase2Result.reheats;

      return this.createSolution(bestState, bestFitness, bestHardViolations, temperature, iteration, reheats);
    } finally {
      this.isSolving = false;
    }
  }

  /**
   * Phase 1: Eliminate hard constraint violations
   * 
   * Focuses on reducing hard violations using tabu search and reheating.
   * Runs for 60% of maxIterations or until all hard violations are eliminated.
   */
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
      const { newState, operatorName } = this.generateNeighbor(currentState, temperature);

      if (!newState) {
        break;
      }

      const { fitness: newFitness, hardViolations: newHardViolations } = this.calculateFitnessAndViolations(newState);

      // Tabu Search: Check if this state was recently visited (with aspiration criteria)
      if (this.config.tabuSearchEnabled) {
        const newSignature = this.getStateSignature(newState);
        if (this.shouldSkipTabu(newSignature, iteration, newFitness, bestFitness)) {
          this.progressStats.tabuHits++; // Increment tabu hits counter
          phase1Iteration++;
          iteration++;
          continue;
        }
      }

      this.operatorStats[operatorName]!.attempts++;

      // Phase 1 acceptance: prioritize reducing hard violations
      const acceptProb = this.acceptanceProbabilityPhase1(
        currentHardViolations,
        newHardViolations,
        currentFitness,
        newFitness,
        temperature
      );

      const accepted = Math.random() < acceptProb;
      const isImprovement = newHardViolations < bestHardViolations ||
        (newHardViolations === bestHardViolations && newFitness < bestFitness);

      if (accepted) {
        this.operatorStats[operatorName]!.accepted++;

        if (newFitness < currentFitness) {
          this.operatorStats[operatorName]!.improvements++;
        }

        // Add current state to tabu list (prevent cycling back)
        if (this.config.tabuSearchEnabled) {
          const currentSignature = this.getStateSignature(currentState);
          this.addToTabuList(currentSignature, iteration);
        }

        currentState = newState;
        currentFitness = newFitness;
        currentHardViolations = newHardViolations;

        // Update best solution
        if (isImprovement) {
          bestState = this.config.cloneState(currentState);
          bestFitness = newFitness;
          bestHardViolations = newHardViolations;
          iterationsWithoutImprovement = 0;
          this.progressStats.bestCostIteration = iteration;
          this.updateProgressStats(true, true, iteration);

          this.log('debug', `[Phase 1] New best: Hard violations = ${bestHardViolations}, Fitness = ${bestFitness.toFixed(2)}, Operator = ${operatorName}`);
        } else {
          iterationsWithoutImprovement++;
          this.updateProgressStats(true, false);
        }
      } else {
        iterationsWithoutImprovement++;
        this.updateProgressStats(false, false);
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
        this.progressStats.stagnationCount = 0;

        this.log('info', `[Phase 1] Reheating #${reheats}: Temperature = ${temperature.toFixed(2)}, Hard violations = ${bestHardViolations}`);
        
        // Trigger progress callback on reheating
        if (this.shouldTriggerProgress(iteration, true)) {
          const softV = this.getViolations(bestState).filter(v => v.constraintType === 'soft').length;
          await this.triggerProgressCallback(iteration,currentFitness, bestFitness, temperature, bestHardViolations, softV, reheats);
        }
      }

      temperature *= this.config.coolingRate;
      phase1Iteration++;
      iteration++;

      const logInterval = this.config.logging.logInterval ?? 1000;
      if (phase1Iteration % logInterval === 0 || this.shouldTriggerProgress(iteration)) {
        this.log('info', `[Phase 1] Iteration ${phase1Iteration}: Temp = ${temperature.toFixed(2)}, Hard violations = ${currentHardViolations}, Best = ${bestHardViolations}`);
        
        // Trigger progress callback at intervals
        if (this.shouldTriggerProgress(iteration)) {
          const softV = this.getViolations(bestState).filter(v => v.constraintType === 'soft').length;
          await this.triggerProgressCallback(iteration, currentFitness, bestFitness, temperature, bestHardViolations, softV, reheats);
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

  /**
   * Phase 1.5: Intensification
   * 
   * Aggressively targets remaining hard violations with multiple restart attempts.
   * Uses focused operator selection and reheating when stagnation is detected.
   */
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
    this.log('info', 'Phase 1.5: Intensification - targeting remaining hard violations');

    let currentState = this.config.cloneState(bestState);
    let currentFitness = bestFitness;
    let currentHardViolations = bestHardViolations;
    let intensificationAttempt = 0;

    while (bestHardViolations > 0 && intensificationAttempt < this.config.maxIntensificationAttempts) {
      intensificationAttempt++;
      this.log('info', `[Intensification] Attempt ${intensificationAttempt}/${this.config.maxIntensificationAttempts}`);

      // Reset temperature for fresh exploration
      let intensificationTemp = this.config.initialTemperature;
      let intensificationIterations = 0;
      let stagnationCounter = 0;
      const stagnationLimit = this.config.intensificationStagnationLimit!;

      // Start from best known state
      currentState = this.config.cloneState(bestState);
      currentFitness = bestFitness;
      currentHardViolations = bestHardViolations;

      while (intensificationIterations < this.config.intensificationIterations && bestHardViolations > 0) {
        // Include ALL operators during intensification, but weight targeted ones higher
        const allGenerators = this.moveGenerators.filter((gen) => gen.canApply(currentState));
        const targetedGenerators = allGenerators.filter((gen) => {
          const name = gen.name.toLowerCase();
          return name.includes('fix') || name.includes('swap') || name.includes('change');
        });

        // Use targeted operators 70% of time, all operators 30% (more exploration)
        const generators = targetedGenerators.length > 0 && Math.random() < 0.7
          ? targetedGenerators
          : allGenerators;

        if (generators.length === 0) {
          break;
        }

        // Random selection during intensification (more exploration)
        const selectedGenerator = generators[Math.floor(Math.random() * generators.length)]!;
        const clonedState = this.config.cloneState(currentState);
        const newState = selectedGenerator.generate(clonedState, intensificationTemp);

        if (!newState) {
          intensificationIterations++;
          continue;
        }

        this.operatorStats[selectedGenerator.name]!.attempts++;

        const { fitness: newFitness, hardViolations: newHardViolations } = this.calculateFitnessAndViolations(newState);

        // Intensification acceptance: heavily favor reducing hard violations
        let accept = false;

        if (newHardViolations < currentHardViolations) {
          accept = true;
          this.operatorStats[selectedGenerator.name]!.improvements++;
          stagnationCounter = 0;
        } else if (newHardViolations === currentHardViolations) {
          if (newFitness < currentFitness) {
            accept = true;
            this.operatorStats[selectedGenerator.name]!.improvements++;
            stagnationCounter = 0;
          } else {
            const acceptProb = Math.exp((currentFitness - newFitness) / intensificationTemp);
            accept = Math.random() < acceptProb;
            stagnationCounter++;
          }
        } else {
          const worsenProb = Math.exp(-1 / (intensificationTemp / 10000));
          if (Math.random() < worsenProb * 0.02) {
            accept = true;
            this.log('debug', '[Intensification] Accepting worsening move to escape local minimum');
          }
          stagnationCounter++;
        }

        if (accept) {
          this.operatorStats[selectedGenerator.name]!.accepted++;
          currentState = newState;
          currentFitness = newFitness;
          currentHardViolations = newHardViolations;

          // Update best if improved
          if (newHardViolations < bestHardViolations ||
              (newHardViolations === bestHardViolations && newFitness < bestFitness)) {
            bestState = this.config.cloneState(currentState);
            bestFitness = newFitness;
            bestHardViolations = newHardViolations;

            this.log('debug', `[Intensification] New best: Hard violations = ${bestHardViolations}, Fitness = ${bestFitness.toFixed(2)}`);
          }
        }

        // Reheat if stagnating
        if (stagnationCounter >= stagnationLimit) {
          intensificationTemp = this.config.initialTemperature * 0.5;
          stagnationCounter = 0;
          this.log('debug', '[Intensification] Stagnation detected, reheating');
        }

        intensificationTemp *= 0.999;
        intensificationIterations++;
        iteration++;

        if (intensificationIterations % 500 === 0) {
          this.log('info', `[Intensification] Iter ${intensificationIterations}: Hard violations = ${currentHardViolations}, Best = ${bestHardViolations}`);
        }
      }

      if (bestHardViolations === 0) {
        this.log('info', `[Intensification] SUCCESS! All hard violations eliminated in attempt ${intensificationAttempt}`);
        break;
      }
    }

    if (bestHardViolations > 0) {
      this.log('warn', `[Intensification] Could not eliminate all hard violations. Remaining: ${bestHardViolations}`);
    }

    return {
      bestState,
      bestFitness,
      bestHardViolations,
      iteration,
    };
  }

  /**
   * Phase 2: Optimize soft constraints
   * 
   * Maintains hard constraint satisfaction while optimizing soft constraints.
   * Uses tabu search and reheating to escape local minima.
   */
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
    this.log('info', 'Phase 2: Optimizing soft constraints');
    this.setPhase('phase2');

    let currentState = this.config.cloneState(bestState);
    let currentFitness = bestFitness;
    iterationsWithoutImprovement = 0;

    while (temperature > this.config.minTemperature && iteration < this.config.maxIterations) {
      const { newState, operatorName } = this.generateNeighbor(currentState, temperature);

      if (!newState) {
        break;
      }

      const { fitness: newFitness, hardViolations: newHardViolations } = this.calculateFitnessAndViolations(newState);

      // Tabu Search: Check if this state was recently visited (with aspiration criteria)
      if (this.config.tabuSearchEnabled) {
        const newSignature = this.getStateSignature(newState);
        if (this.shouldSkipTabu(newSignature, iteration, newFitness, bestFitness)) {
          this.progressStats.tabuHits++; // Increment tabu hits counter
          iteration++;
          continue;
        }
      }

      this.operatorStats[operatorName]!.attempts++;

      // STRICT Phase 2: NEVER accept solutions that increase hard violations
      const acceptProb = this.acceptanceProbabilityPhase2(
        bestHardViolations,
        newHardViolations,
        currentFitness,
        newFitness,
        temperature
      );

      const accepted = Math.random() < acceptProb;
      const isImprovement = newFitness < bestFitness;

      if (accepted) {
        this.operatorStats[operatorName]!.accepted++;

        if (newFitness < currentFitness) {
          this.operatorStats[operatorName]!.improvements++;
        }

        // Add current state to tabu list (prevent cycling back)
        if (this.config.tabuSearchEnabled) {
          const currentSignature = this.getStateSignature(currentState);
          this.addToTabuList(currentSignature, iteration);
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
          this.progressStats.bestCostIteration = iteration;
          this.updateProgressStats(true, true, iteration);

          this.log('debug', `[Phase 2] New best: Fitness = ${bestFitness.toFixed(2)}, Hard violations = ${newHardViolations}, Operator = ${operatorName}`);
        } else {
          iterationsWithoutImprovement++;
          this.updateProgressStats(true, false);
        }
      } else {
        iterationsWithoutImprovement++;
        this.updateProgressStats(false, false);
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
        this.progressStats.stagnationCount = 0;

        this.log('info', `[Phase 2] Reheating #${reheats}: Temperature = ${temperature.toFixed(2)}, Fitness = ${bestFitness.toFixed(2)}`);

        // Trigger progress callback on reheating
        if (this.shouldTriggerProgress(iteration, true)) {
          const softV = this.getViolations(bestState).filter(v => v.constraintType === 'soft').length;
          await this.triggerProgressCallback(iteration,currentFitness, bestFitness, temperature, bestHardViolations, softV, reheats);
        }
      }

      temperature *= this.config.coolingRate;
      iteration++;

      const logInterval = this.config.logging.logInterval ?? 1000;
      if (iteration % logInterval === 0 || this.shouldTriggerProgress(iteration)) {
        this.log('info', `[Phase 2] Iteration ${iteration}: Temp = ${temperature.toFixed(2)}, Current = ${currentFitness.toFixed(2)}, Best = ${bestFitness.toFixed(2)}`);

        // Trigger progress callback at intervals
        if (this.shouldTriggerProgress(iteration)) {
          const softV = this.getViolations(bestState).filter(v => v.constraintType === 'soft').length;
          await this.triggerProgressCallback(iteration, currentFitness, bestFitness, temperature, bestHardViolations, softV, reheats);
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

  /**
   * Create the final solution object with all statistics
   */
  private createSolution(
    bestState: TState,
    bestFitness: number,
    bestHardViolations: number,
    finalTemperature: number,
    iteration: number,
    reheats: number
  ): Solution<TState> {
    // Calculate final statistics
    this.updateOperatorStats();

    const violations = this.getViolations(bestState);
    const hardViolations = violations.filter((v) => v.constraintType === 'hard').length;
    const softViolations = violations.filter((v) => v.constraintType === 'soft').length;

    this.log('info', 'Optimization complete', {
      iterations: iteration,
      reheats: reheats,
      finalTemperature: finalTemperature.toFixed(4),
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
      finalTemperature: finalTemperature,
      violations: violations,
      operatorStats: this.operatorStats,
    };
  }

  /**
   * Calculate fitness for a state (wrapper for backward compatibility)
   */
  private calculateFitness(state: TState): number {
    return this.calculateFitnessAndViolations(state).fitness;
  }

  /**
   * Count hard constraint violations (wrapper for backward compatibility)
   */
  private countHardViolations(state: TState): number {
    return this.calculateFitnessAndViolations(state).hardViolations;
  }

  /**
   * OPTIMIZED: Calculate both fitness AND hard violation count in a single pass
   * 
   * This eliminates the redundant constraint evaluation that was causing
   * ~28% performance overhead (hard constraints were evaluated twice per iteration).
   * 
   * @returns Object with fitness score and hard violation count
   */
  private calculateFitnessAndViolations(state: TState): { fitness: number; hardViolations: number } {
    let hardPenalty = 0;
    let softPenalty = 0;
    let hardViolationCount = 0;

    // Evaluate hard constraints ONCE - calculate both penalty and violation count
    for (const constraint of this.hardConstraints) {
      const score = this.evaluateConstraintScore(constraint, state);
      if (score < 1) {
        hardPenalty += (1 - score);

        // Count violations using getViolations() if available
        if (constraint.getViolations) {
          const violations = constraint.getViolations(state);
          hardViolationCount += violations.length;
        } else {
          // Fallback: infer count from score
          // Many constraints use: score = 1 / (1 + violationCount)
          // Guard against division by zero
          const inferredCount = score > 0 ? Math.round((1 / score) - 1) : 1;
          hardViolationCount += Math.max(1, inferredCount);
        }
      }
    }

    // Evaluate soft constraints
    for (const constraint of this.softConstraints) {
      const score = this.evaluateConstraintScore(constraint, state);
      const weight = constraint.weight ?? 10;
      if (score < 1) {
        softPenalty += (1 - score) * weight;
      }
    }

    const fitness = hardPenalty * this.config.hardConstraintWeight + softPenalty;

    return { fitness, hardViolations: hardViolationCount };
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
    const clonedState = this.config.cloneState(state); 
    const newState = selectedGenerator.generate(clonedState, temperature);

    return { newState, operatorName: selectedGenerator.name };
  }

   /**
    * Pure Roulette Wheel Selection (100% fitness-proportionate)
    *
    * Formula: P(i) = fitness(i) / Σ fitness(j)
    *
    * Reference: Muklason et al. (2024) - Tabu-Simulated Annealing Hyper-Heuristics
    *
    * @param generators - All applicable move generators
    * @returns Selected generator
    */
   private selectGeneratorRouletteWheel(generators: MoveGenerator<TState>[]): MoveGenerator<TState> {
     // Use success rate as fitness
     const fitnesses = generators.map(gen =>
       this.operatorStats[gen.name]?.successRate || 1.0 / generators.length
     );

     const totalFitness = fitnesses.reduce((sum, f) => sum + f, 0);

     if (totalFitness === 0) {
       // Uniform random if no data
       return generators[Math.floor(Math.random() * generators.length)]!;
     }

     // Pure Roulette Wheel selection
     let random = Math.random() * totalFitness;
     for (let i = 0; i < generators.length; i++) {
       random -= fitnesses[i]!;
       if (random <= 0) {
         return generators[i]!;
       }
     }

     return generators[generators.length - 1]!;
   }

   /**
    * Hybrid Selection (30% random + 70% weighted)
    *
    * Modification from Roulette Wheel to guarantee exploration
    *
    * Reference: Cowling et al. (2002) - Hyper-heuristics with diversity preservation
    *
    * @param generators - All applicable move generators
    * @returns Selected generator
    */
   private selectGeneratorHybrid(generators: MoveGenerator<TState>[]): MoveGenerator<TState> {
     // 30%: forced random (exploration)
     if (Math.random() < 0.3) {
       return generators[Math.floor(Math.random() * generators.length)]!;
     }

     // 70%: weighted based on success rates
     const weights = generators.map((gen) => {
       const stats = this.operatorStats[gen.name]!;
       return stats.successRate || 0.5; // Default to 0.5 if no data yet
     });

     const totalWeight = weights.reduce((sum, w) => sum + w, 0);

     if (totalWeight === 0) {
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
    * Select move generator based on configured mode
    *
    * Delegates to either hybrid (default) or roulette-wheel selection.
    *
    * @param generators - All applicable move generators
    * @returns Selected generator
    */
   private selectMoveGenerator(generators: MoveGenerator<TState>[]): MoveGenerator<TState> {
     const mode = this.config.operatorSelectionMode ?? 'hybrid';

     if (mode === 'roulette-wheel') {
       return this.selectGeneratorRouletteWheel(generators);
     } else {
       return this.selectGeneratorHybrid(generators);
     }
   }

  // ============================================
  // TABU SEARCH METHODS
  // ============================================
  //
  // Tabu Search prevents the algorithm from cycling back to recently visited states.
  // This helps escape local minima by maintaining a short-term memory of the search.
  //
  // How it works:
  // 1. Each state is assigned a lightweight signature (hash)
  // 2. Signatures are stored in a tabu list with their iteration number
  // 3. Before accepting a move, check if the new state is tabu
  // 4. States remain tabu for 'tabuTenure' iterations
  // 5. Old entries are automatically removed when list exceeds 'maxTabuListSize'
  //
  // Configuration:
  // - tabuSearchEnabled: Enable/disable tabu search (default: false)
  // - tabuTenure: Number of iterations a state stays tabu (default: 50)
  // - maxTabuListSize: Maximum tabu entries stored (default: 1000)

  /**
   * Generate a lightweight signature for a state
   * Used to track visited states in the tabu list
   *
   * Note: This creates a hash based on schedule assignments, not the full state.
   * This is efficient because we only care about the assignment decisions,
   * not the entire state object.
   *
   * The signature format: "classId:day:startTime:room|classId:day:startTime:room|..."
   * Sorted for consistency so same assignments produce same signature
   */
  private getStateSignature(state: TState): string {
    // Use custom signature function if provided
    if (this.config.getStateSignature) {
      try {
        return this.config.getStateSignature(state);
      } catch (error) {
        this.log('warn', 'Custom getStateSignature failed, falling back to default', { error });
      }
    }

    // Default implementation: Try to get schedule from state (for timetabling problems)
    const schedule = (state as any).schedule;
    if (!schedule || !Array.isArray(schedule)) {
      // For non-timetable states, use deterministic serialization fallback
      try {
        return this.stableStringify(state);
      } catch {
        throw new Error(
          'Unable to generate deterministic state signature. Please provide config.getStateSignature for your state type.'
        );
      }
    }

    // Create a signature based on class assignments (classId -> day+time+room)
    const assignments: string[] = [];
    for (const entry of schedule) {
      if (entry.classId && entry.timeSlot && entry.room) {
        assignments.push(`${entry.classId}:${entry.timeSlot.day}:${entry.timeSlot.startTime}:${entry.room}`);
      }
    }
    
    // Sort for consistency and join
    return assignments.sort().join('|');
  }

   /**
    * Check if a state should be skipped (tabu) with aspiration criteria support.
    *
    * **Tabu Search Basic:** A state is skipped if it's in the tabu list within tabu tenure.
    *
    * **With Aspiration Criteria:** A tabu state can be accepted if its fitness
    * is better than the global best solution found so far. This prevents missing
    * exceptional breakthrough solutions due to tabu restrictions.
    *
    * @param signature - Unique signature of the state
    * @param currentIteration - Current algorithm iteration
    * @param newFitness - Fitness of the new state
    * @param globalBestFitness - Best fitness found so far
    * @returns true if the state should be skipped (tabu and no aspiration met)
    *
    * @example
    * ```typescript
    * // Without aspiration: skip all tabu states
    * // With aspiration: accept tabu state if fitness < globalBest
    * if (this.shouldSkipTabu(signature, iteration, newFitness, bestFitness)) {
    *   continue; // Skip this state
    * }
    * ```
    */
   private shouldSkipTabu(
     signature: string,
     currentIteration: number,
     newFitness: number,
     globalBestFitness: number
   ): boolean {
     // Tabu search disabled: never skip
     if (!this.config.tabuSearchEnabled) {
       return false;
     }

     const addedAt = this.tabuList.get(signature);
     if (addedAt === undefined) {
       return false; // Not tabu
     }

     // Check if still within tabu tenure
     if ((currentIteration - addedAt) >= this.config.tabuTenure) {
       return false; // Tabu expired, not a tabu anymore
     }

     // State is tabu - check aspiration criteria
     if (this.config.aspirationEnabled && newFitness < globalBestFitness) {
       // Aspiration criteria met: accept this tabu state
       // This is a breakthrough solution better than global best!
       this.log('debug', `[Tabu] Aspiration criteria met: fitness=${newFitness.toFixed(2)} < globalBest=${globalBestFitness.toFixed(2)}`);
       return false; // Don't skip, accept this state
     }

     // Tabu and no aspiration met: skip this state
     return true;
   }

  /**
   * Add a state signature to the tabu list
   */
  private addToTabuList(signature: string, iteration: number): void {
    this.tabuList.set(signature, iteration);

    // Cleanup if list is too large
    if (this.tabuList.size > this.config.maxTabuListSize) {
      this.cleanupTabuList(iteration);
    }

    // Proactive cleanup: Remove expired entries periodically to prevent memory bloat
    // Cleanup every 100 iterations to maintain performance
    if (iteration % 100 === 0) {
      this.cleanupTabuList(iteration);
    }
  }

  /**
   * Remove expired entries from tabu list
   */
  private cleanupTabuList(currentIteration: number): void {
    const expiredKeys: string[] = [];
    
    for (const [key, addedAt] of this.tabuList.entries()) {
      if ((currentIteration - addedAt) >= this.config.tabuTenure) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.tabuList.delete(key);
    }

    // If still too large, remove oldest entries
    if (this.tabuList.size > this.config.maxTabuListSize * 0.8) {
      const entries = [...this.tabuList.entries()].sort((a, b) => a[1] - b[1]);
      const toRemove = entries.slice(0, Math.floor(entries.length * 0.3));
      for (const [key] of toRemove) {
        this.tabuList.delete(key);
      }
    }
  }

  /**
   * Phase 1 acceptance probability (prioritize hard constraints)
   *
   * Logic:
   * - Always accept if hard violations decrease
   * - Standard SA acceptance if hard violations stay the same
   * - Never accept if hard violations increase
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
      // Standard SA acceptance probability
      // i.e :
      // currentFitness = 150, newFitness = 160, temperature = 1000
      // acceptanceProbability = exp((150 - 160) / 1000) = exp(-10 / 1000) = exp(-0.01) ≈ 0.99005
      // so the chance of accepting a slightly worse solution is about 99%
      return Math.exp((currentFitness - newFitness) / temperature);
    }

    // Worse hard violations: never accept in phase 1
    return 0.0;
  }

  /**
   * Phase 2 acceptance probability (strictly enforce hard constraints)
   *
   * Logic:
   * - NEVER accept if hard violations increase (strict enforcement)
   * - Always accept if hard violations decrease
   * - Standard SA acceptance for soft constraint optimization if hard violations stable
   *
   * This ensures once a feasible solution is found, we never violate hard constraints
   * while optimizing soft constraints.
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
      const score = this.evaluateConstraintScore(constraint, state);

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
   * Evaluate and validate a constraint score
   */
  private evaluateConstraintScore(constraint: Constraint<TState>, state: TState): number {
    const score = constraint.evaluate(state);

    if (typeof score !== 'number' || !Number.isFinite(score)) {
      throw new Error(
        `Constraint "${constraint.name}" returned invalid score (${score}). ` +
        'evaluate() must return a finite number between 0 and 1.'
      );
    }

    if (score < 0 || score > 1) {
      throw new Error(
        `Constraint "${constraint.name}" returned out-of-range score (${score}). ` +
        'evaluate() must return a number between 0 and 1.'
      );
    }

    return score;
  }

  /**
   * Deterministic stringify for state signatures
   */
  private stableStringify(value: unknown, seen = new WeakSet<object>()): string {
    if (value === null) return 'null';

    const valueType = typeof value;
    if (valueType === 'number' || valueType === 'boolean') {
      return String(value);
    }

    if (typeof value === 'string') {
      return JSON.stringify(value);
    }

    if (typeof value === 'bigint') {
      return `${value.toString()}n`;
    }

    if (valueType === 'undefined') {
      return 'undefined';
    }

    if (valueType === 'function') {
      return '[Function]';
    }

    if (valueType === 'symbol') {
      return '[Symbol]';
    }

    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stableStringify(item, seen)).join(',')}]`;
    }

    if (valueType === 'object') {
      const obj = value as Record<string, unknown>;
      if (seen.has(obj)) {
        return '[Circular]';
      }

      seen.add(obj);
      const keys = Object.keys(obj).sort();
      const content = keys
        .map((key) => `${JSON.stringify(key)}:${this.stableStringify(obj[key], seen)}`)
        .join(',');
      seen.delete(obj);

      return `{${content}}`;
    }

    return String(value);
  }

  /**
   * Sanitize log payload to reduce accidental sensitive data exposure
   */
  private sanitizeLogData(data: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
    if (depth > 4) return '[TruncatedDepth]';
    if (data === null || data === undefined) return data;

    const dataType = typeof data;
    if (typeof data === 'string') {
      return data.length > 500 ? `${data.slice(0, 500)}...[truncated]` : data;
    }

    if (dataType === 'number' || dataType === 'boolean') return data;
    if (dataType === 'bigint') return `${data.toString()}n`;
    if (dataType === 'function') return '[Function]';
    if (dataType === 'symbol') return '[Symbol]';

    if (Array.isArray(data)) {
      return data.slice(0, 100).map((item) => this.sanitizeLogData(item, depth + 1, seen));
    }

    if (dataType === 'object') {
      const obj = data as Record<string, unknown>;
      if (seen.has(obj)) return '[Circular]';
      seen.add(obj);

      const redacted: Record<string, unknown> = {};
      const sensitiveKeyPattern = /(password|secret|token|apikey|api_key|authorization|cookie|session|credential|privatekey|private_key)/i;
      const keys = Object.keys(obj).slice(0, 100);

      for (const key of keys) {
        if (sensitiveKeyPattern.test(key)) {
          redacted[key] = '[REDACTED]';
        } else {
          redacted[key] = this.sanitizeLogData(obj[key], depth + 1, seen);
        }
      }

      seen.delete(obj);
      return redacted;
    }

    return '[UnsupportedType]';
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
   * Trigger progress callback with current statistics
   *
   * Called at regular intervals to provide real-time progress updates.
   * Supports both sync and async callbacks with proper error handling.
   */
  private async triggerProgressCallback(
    iteration: number,
    currentCost: number,
    bestCost: number,
    temperature: number,
    hardViolations: number,
    softViolations: number,
    reheats: number
  ): Promise<void> {
    if (!this.config.onProgress) return;
    if (iteration === this.progressStats.lastProgressIteration) return;

    this.progressStats.lastProgressIteration = iteration;

    const stats: ProgressStats = {
      iteration,
      currentCost,
      bestCost: bestCost, // Will be overridden by caller if needed
      temperature,
      hardViolations,
      softViolations,
      tabuHits: this.progressStats.tabuHits,
      tabuSize: this.tabuList.size,
      phase: this.progressStats.currentPhase,
      reheatingCount: reheats,
      acceptedMoves: this.progressStats.acceptedMoves,
      rejectedMoves: this.progressStats.rejectedMoves,
      stagnationCount: this.progressStats.stagnationCount,
      bestCostIteration: this.progressStats.bestCostIteration,
      progressPercent: Math.min(100, (iteration / this.config.maxIterations) * 100),
      initialCost: this.progressStats.initialCost,
      improvement: this.progressStats.initialCost > 0
        ? ((this.progressStats.initialCost - bestCost) / this.progressStats.initialCost) * 100
        : 0,
      timestamp: Date.now(),
    };

    

    try {
      const result = this.config.onProgress(iteration, currentCost, temperature, null, stats);
      if (result instanceof Promise) {
        await result;
      }
    } catch (error) {
      // Don't let callback errors break optimization
      this.log('warn', 'onProgress callback error:', error);
    }
  }

  /**
   * Check if progress callback should be triggered
   */
  private shouldTriggerProgress(iteration: number, force = false): boolean {
    if (!this.config.onProgress) return false;
    if (force) return true;
    if (iteration === 0) return true; // Always trigger at start
    if (iteration === this.progressStats.lastProgressIteration) return false;

    const logInterval = this.config.logging.logInterval ?? 1000;
    return iteration % logInterval === 0;
  }

  /**
   * Update progress tracking statistics
   */
  private updateProgressStats(
    accepted: boolean,
    isImprovement: boolean,
    bestCostIteration?: number
  ): void {
    if (accepted) {
      this.progressStats.acceptedMoves++;
      if (isImprovement) {
        this.progressStats.stagnationCount = 0;
      } else {
        this.progressStats.stagnationCount++;
      }
    } else {
      this.progressStats.rejectedMoves++;
      this.progressStats.stagnationCount++;
    }

    if (bestCostIteration !== undefined) {
      this.progressStats.bestCostIteration = bestCostIteration;
    }
  }

  /**
   * Set current optimization phase
   */
  private setPhase(phase: 'phase1' | 'phase15' | 'phase2' | 'initial'): void {
    if (this.progressStats.currentPhase !== phase) {
      this.progressStats.currentPhase = phase;
      this.log('info', `Entering ${phase} phase`);
    }
  }

  /**
   * Merge config with defaults
   */
   private mergeWithDefaults(config: SAConfig<TState>): SAConfig<TState> & {
    reheatingFactor: number;
    maxReheats: number;
    tabuSearchEnabled: boolean;
    tabuTenure: number;
    maxTabuListSize: number;
    aspirationEnabled: boolean;
    enableIntensification: boolean;
    intensificationIterations: number;
    maxIntensificationAttempts: number;
    intensificationStagnationLimit: number;
    getStateSignature?: (state: TState) => string;
    logging: Required<NonNullable<SAConfig<TState>['logging']>>;
  } {
    return {
      ...config,
      reheatingFactor: config.reheatingFactor ?? 2.0,
      maxReheats: config.maxReheats ?? 3,
      // Tabu Search defaults
      tabuSearchEnabled: config.tabuSearchEnabled ?? false,
      tabuTenure: config.tabuTenure ?? 50,
      maxTabuListSize: config.maxTabuListSize ?? 1000,
      aspirationEnabled: config.aspirationEnabled ?? true,
      // Intensification defaults
      enableIntensification: config.enableIntensification ?? true,
      intensificationIterations: config.intensificationIterations ?? 2000,
      maxIntensificationAttempts: config.maxIntensificationAttempts ?? 3,
      intensificationStagnationLimit: config.intensificationStagnationLimit ?? 300,
      ...(config.getStateSignature && { getStateSignature: config.getStateSignature }),
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
    let serializedData = '';

    if (data !== undefined) {
      try {
        serializedData = ` ${JSON.stringify(this.sanitizeLogData(data))}`;
      } catch {
        serializedData = ' [UnserializableData]';
      }
    }

    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}${serializedData}`;

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
