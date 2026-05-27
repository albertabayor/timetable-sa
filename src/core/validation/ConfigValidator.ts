import type { Constraint } from '../interfaces/Constraint.js';
import type { MoveGenerator } from '../interfaces/MoveGenerator.js';
import type { SAConfig } from '../interfaces/SAConfig.js';
import type { ResolvedSAConfig } from '../engine/EngineTypes.js';
import { SAConfigError } from '../errors.js';

function assertFiniteNumber(value: number, fieldName: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new SAConfigError(`${fieldName} must be a finite number, got ${value}`);
  }
}

function assertOptionalFiniteNumber(value: number | undefined, fieldName: string): void {
  if (value === undefined) return;
  assertFiniteNumber(value, fieldName);
}

function assertOptionalProbability(value: number | undefined, fieldName: string): void {
  if (value === undefined) return;
  assertFiniteNumber(value, fieldName);
  if (value < 0 || value > 1) {
    throw new SAConfigError(`${fieldName} must be between 0 and 1 if provided, got ${value}`);
  }
}

export function validateSolverInputs<TState>(
  initialState: TState,
  constraints: Constraint<TState>[],
  moveGenerators: MoveGenerator<TState>[],
  config: SAConfig<TState>
): void {
  if (initialState === null || initialState === undefined) {
    throw new SAConfigError('Initial state cannot be null or undefined');
  }

  if (!Array.isArray(constraints)) {
    throw new SAConfigError('Constraints must be an array');
  }

  for (const constraint of constraints) {
    if (!constraint.name || typeof constraint.name !== 'string') {
      throw new SAConfigError('All constraints must have a name property');
    }
    if (!constraint.type || !['hard', 'soft'].includes(constraint.type)) {
      throw new SAConfigError(`Constraint "${constraint.name}" must have type 'hard' or 'soft'`);
    }
    if (typeof constraint.evaluate !== 'function') {
      throw new SAConfigError(`Constraint "${constraint.name}" must have an evaluate function`);
    }
    if (constraint.type === 'soft' && constraint.weight !== undefined) {
      assertFiniteNumber(constraint.weight, `weight for soft constraint "${constraint.name}"`);
      if (constraint.weight < 0) {
        throw new SAConfigError(
          `weight for soft constraint "${constraint.name}" must be >= 0, got ${constraint.weight}`
        );
      }
    }
  }

  if (!Array.isArray(moveGenerators)) {
    throw new SAConfigError('Move generators must be an array');
  }

  for (const generator of moveGenerators) {
    if (!generator.name || typeof generator.name !== 'string') {
      throw new SAConfigError('All move generators must have a name property');
    }
    if (typeof generator.generate !== 'function') {
      throw new SAConfigError(`Move generator "${generator.name}" must have a generate function`);
    }
    if (typeof generator.canApply !== 'function') {
      throw new SAConfigError(`Move generator "${generator.name}" must have a canApply function`);
    }
  }

  assertFiniteNumber(config.initialTemperature, 'initialTemperature');
  if (config.initialTemperature <= 0) {
    throw new SAConfigError(`initialTemperature must be positive, got ${config.initialTemperature}`);
  }

  assertFiniteNumber(config.minTemperature, 'minTemperature');
  if (config.minTemperature <= 0) {
    throw new SAConfigError(`minTemperature must be positive, got ${config.minTemperature}`);
  }

  assertFiniteNumber(config.coolingRate, 'coolingRate');
  if (config.coolingRate <= 0 || config.coolingRate >= 1) {
    throw new SAConfigError(`coolingRate must be between 0 and 1 (exclusive), got ${config.coolingRate}`);
  }

  assertFiniteNumber(config.maxIterations, 'maxIterations');
  if (!Number.isInteger(config.maxIterations) || config.maxIterations <= 0) {
    throw new SAConfigError(`maxIterations must be positive, got ${config.maxIterations}`);
  }

  assertFiniteNumber(config.hardConstraintWeight, 'hardConstraintWeight');
  if (config.hardConstraintWeight <= 0) {
    throw new SAConfigError(`hardConstraintWeight must be a positive number, got ${config.hardConstraintWeight}`);
  }

  if (typeof config.cloneState !== 'function') {
    throw new SAConfigError('cloneState must be a function');
  }

  if (
    config.cancelSignal !== undefined &&
    (typeof config.cancelSignal !== 'object' ||
      config.cancelSignal === null ||
      typeof config.cancelSignal.aborted !== 'boolean')
  ) {
    throw new SAConfigError('cancelSignal must have an aborted boolean property if provided');
  }

  assertOptionalFiniteNumber(config.reheatingThreshold, 'reheatingThreshold');
  if (config.reheatingThreshold !== undefined && (!Number.isInteger(config.reheatingThreshold) || config.reheatingThreshold <= 0)) {
    throw new SAConfigError(`reheatingThreshold must be positive if provided, got ${config.reheatingThreshold}`);
  }

  assertOptionalFiniteNumber(config.maxReheats, 'maxReheats');
  if (config.maxReheats !== undefined && (!Number.isInteger(config.maxReheats) || config.maxReheats < 0)) {
    throw new SAConfigError(`maxReheats must be non-negative if provided, got ${config.maxReheats}`);
  }

  assertOptionalFiniteNumber(config.reheatingFactor, 'reheatingFactor');
  if (config.reheatingFactor !== undefined && config.reheatingFactor <= 1) {
    throw new SAConfigError(`reheatingFactor must be greater than 1 if provided, got ${config.reheatingFactor}`);
  }

  assertOptionalFiniteNumber(config.tabuTenure, 'tabuTenure');
  if (config.tabuTenure !== undefined && (!Number.isInteger(config.tabuTenure) || config.tabuTenure <= 0)) {
    throw new SAConfigError(`tabuTenure must be positive if provided, got ${config.tabuTenure}`);
  }

  assertOptionalFiniteNumber(config.maxTabuListSize, 'maxTabuListSize');
  if (config.maxTabuListSize !== undefined && (!Number.isInteger(config.maxTabuListSize) || config.maxTabuListSize <= 0)) {
    throw new SAConfigError(`maxTabuListSize must be positive if provided, got ${config.maxTabuListSize}`);
  }

  assertOptionalFiniteNumber(config.intensificationIterations, 'intensificationIterations');
  if (config.intensificationIterations !== undefined && (!Number.isInteger(config.intensificationIterations) || config.intensificationIterations <= 0)) {
    throw new SAConfigError(`intensificationIterations must be positive if provided, got ${config.intensificationIterations}`);
  }

  assertOptionalFiniteNumber(config.maxIntensificationAttempts, 'maxIntensificationAttempts');
  if (config.maxIntensificationAttempts !== undefined && (!Number.isInteger(config.maxIntensificationAttempts) || config.maxIntensificationAttempts <= 0)) {
    throw new SAConfigError(`maxIntensificationAttempts must be positive if provided, got ${config.maxIntensificationAttempts}`);
  }

  assertOptionalFiniteNumber(config.intensificationStagnationLimit, 'intensificationStagnationLimit');
  if (config.intensificationStagnationLimit !== undefined && (!Number.isInteger(config.intensificationStagnationLimit) || config.intensificationStagnationLimit <= 0)) {
    throw new SAConfigError(`intensificationStagnationLimit must be positive if provided, got ${config.intensificationStagnationLimit}`);
  }

  if (
    config.intensificationStartTemperatureMode !== undefined &&
    config.intensificationStartTemperatureMode !== 'phase1-end' &&
    config.intensificationStartTemperatureMode !== 'initial-reset'
  ) {
    throw new SAConfigError(
      `intensificationStartTemperatureMode must be 'phase1-end' or 'initial-reset' if provided, got ${String(config.intensificationStartTemperatureMode)}`
    );
  }

  assertOptionalFiniteNumber(config.intensificationStartTempMultiplier, 'intensificationStartTempMultiplier');
  if (config.intensificationStartTempMultiplier !== undefined && config.intensificationStartTempMultiplier <= 0) {
    throw new SAConfigError(`intensificationStartTempMultiplier must be positive if provided, got ${config.intensificationStartTempMultiplier}`);
  }

  assertOptionalFiniteNumber(config.intensificationStartTempCapRatio, 'intensificationStartTempCapRatio');
  if (config.intensificationStartTempCapRatio !== undefined && config.intensificationStartTempCapRatio <= 0) {
    throw new SAConfigError(`intensificationStartTempCapRatio must be positive if provided, got ${config.intensificationStartTempCapRatio}`);
  }

  if (config.intensificationTargetedOperatorNames !== undefined) {
    if (!Array.isArray(config.intensificationTargetedOperatorNames)) {
      throw new SAConfigError('intensificationTargetedOperatorNames must be an array of strings if provided');
    }
    for (const operatorName of config.intensificationTargetedOperatorNames) {
      if (typeof operatorName !== 'string' || operatorName.trim().length === 0) {
        throw new SAConfigError('intensificationTargetedOperatorNames must contain only non-empty strings');
      }
    }
  }

  assertOptionalProbability(config.intensificationTargetedSelectionRate, 'intensificationTargetedSelectionRate');

  assertOptionalFiniteNumber(
    config.intensificationEarlyStopNoBestImproveIterations,
    'intensificationEarlyStopNoBestImproveIterations'
  );
  if (
    config.intensificationEarlyStopNoBestImproveIterations !== undefined &&
    (!Number.isInteger(config.intensificationEarlyStopNoBestImproveIterations) ||
      config.intensificationEarlyStopNoBestImproveIterations <= 0)
  ) {
    throw new SAConfigError(
      `intensificationEarlyStopNoBestImproveIterations must be positive if provided, got ${config.intensificationEarlyStopNoBestImproveIterations}`
    );
  }

  assertOptionalFiniteNumber(
    config.intensificationBudgetFractionOfMaxIterations,
    'intensificationBudgetFractionOfMaxIterations'
  );
  if (
    config.intensificationBudgetFractionOfMaxIterations !== undefined &&
    (config.intensificationBudgetFractionOfMaxIterations <= 0 ||
      config.intensificationBudgetFractionOfMaxIterations > 1)
  ) {
    throw new SAConfigError(
      `intensificationBudgetFractionOfMaxIterations must be > 0 and <= 1 if provided, got ${config.intensificationBudgetFractionOfMaxIterations}`
    );
  }

  if (config.logging?.logInterval !== undefined) {
    assertFiniteNumber(config.logging.logInterval, 'logging.logInterval');
    if (!Number.isInteger(config.logging.logInterval) || config.logging.logInterval <= 0) {
      throw new SAConfigError(`logging.logInterval must be a positive integer if provided, got ${config.logging.logInterval}`);
    }
  }
}

export function mergeConfigWithDefaults<TState>(config: SAConfig<TState>): ResolvedSAConfig<TState> {
  return {
    ...config,
    reheatingFactor: config.reheatingFactor ?? 2.0,
    maxReheats: config.maxReheats ?? 3,
    tabuSearchEnabled: config.tabuSearchEnabled ?? false,
    tabuTenure: config.tabuTenure ?? 50,
    maxTabuListSize: config.maxTabuListSize ?? 1000,
    aspirationEnabled: config.aspirationEnabled ?? true,
    enableIntensification: config.enableIntensification ?? true,
    intensificationIterations: config.intensificationIterations ?? 2000,
    maxIntensificationAttempts: config.maxIntensificationAttempts ?? 3,
    intensificationStagnationLimit: config.intensificationStagnationLimit ?? 300,
    intensificationStartTemperatureMode: config.intensificationStartTemperatureMode ?? 'phase1-end',
    intensificationStartTempMultiplier: config.intensificationStartTempMultiplier ?? 1.0,
    intensificationStartTempCapRatio: config.intensificationStartTempCapRatio ?? 1.0,
    intensificationUseTabu: config.intensificationUseTabu ?? true,
    intensificationTargetedOperatorNames: config.intensificationTargetedOperatorNames?.map((name) => name.trim()) ?? [],
    intensificationTargetedSelectionRate: config.intensificationTargetedSelectionRate ?? 0.7,
    intensificationEarlyStopNoBestImproveIterations: config.intensificationEarlyStopNoBestImproveIterations ?? 800,
    intensificationBudgetFractionOfMaxIterations: config.intensificationBudgetFractionOfMaxIterations ?? 0.25,
    ...(config.getStateSignature && { getStateSignature: config.getStateSignature }),
    onProgressMode: config.onProgressMode ?? 'await',
    logging: {
      enabled: config.logging?.enabled ?? true,
      level: config.logging?.level ?? 'info',
      logInterval: config.logging?.logInterval ?? 1000,
      output: config.logging?.output ?? 'console',
      filePath: config.logging?.filePath ?? './sa-optimization.log',
    },
  };
}
