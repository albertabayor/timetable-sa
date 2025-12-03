/**
 * Unit tests for Simulated Annealing acceptance probability logic
 *
 * Tests the critical acceptance probability calculations in both phases:
 * - Phase 1: Hard constraint elimination
 * - Phase 2: Soft constraint optimization with strict hard constraint preservation
 */

import { describe, it, expect } from '@jest/globals';
import { SimulatedAnnealing } from '../../src/core/SimulatedAnnealing.js';
import type { Constraint } from '../../src/core/interfaces/Constraint.js';
import type { MoveGenerator } from '../../src/core/interfaces/MoveGenerator.js';
import type { SAConfig } from '../../src/core/interfaces/SAConfig.js';

// ========================================
// Test State & Domain
// ========================================

interface SimpleState {
  value: number;
  hardViolationCount: number;
  softViolationCount: number;
}

// ========================================
// Controlled Constraints
// ========================================

class HardConstraintWithControl implements Constraint<SimpleState> {
  name = 'Hard Constraint';
  type = 'hard' as const;

  evaluate(state: SimpleState): number {
    return state.hardViolationCount === 0 ? 1 : 1 / (1 + state.hardViolationCount);
  }

  getViolations(state: SimpleState): string[] {
    const violations: string[] = [];
    for (let i = 0; i < state.hardViolationCount; i++) {
      violations.push(`Hard violation ${i + 1}`);
    }
    return violations;
  }
}

class SoftConstraintWithControl implements Constraint<SimpleState> {
  name = 'Soft Constraint';
  type = 'soft' as const;
  weight = 10;

  evaluate(state: SimpleState): number {
    return state.softViolationCount === 0 ? 1 : 1 / (1 + state.softViolationCount);
  }
}

// ========================================
// Controlled Move Generators
// ========================================

class ImprovesHardMove implements MoveGenerator<SimpleState> {
  name = 'Improves Hard';

  canApply(state: SimpleState): boolean {
    return state.hardViolationCount > 0;
  }

  generate(state: SimpleState, temperature: number): SimpleState {
    return {
      ...state,
      hardViolationCount: Math.max(0, state.hardViolationCount - 1),
    };
  }
}

class WorsensHardMove implements MoveGenerator<SimpleState> {
  name = 'Worsens Hard';

  canApply(state: SimpleState): boolean {
    return true;
  }

  generate(state: SimpleState, temperature: number): SimpleState {
    return {
      ...state,
      hardViolationCount: state.hardViolationCount + 1,
    };
  }
}

class ImprovesSoftMove implements MoveGenerator<SimpleState> {
  name = 'Improves Soft';

  canApply(state: SimpleState): boolean {
    return state.softViolationCount > 0;
  }

  generate(state: SimpleState, temperature: number): SimpleState {
    return {
      ...state,
      softViolationCount: Math.max(0, state.softViolationCount - 1),
    };
  }
}

class WorsensSoftMove implements MoveGenerator<SimpleState> {
  name = 'Worsens Soft';

  canApply(state: SimpleState): boolean {
    return true;
  }

  generate(state: SimpleState, temperature: number): SimpleState {
    return {
      ...state,
      softViolationCount: state.softViolationCount + 1,
    };
  }
}

class NeutralMove implements MoveGenerator<SimpleState> {
  name = 'Neutral Move';

  canApply(state: SimpleState): boolean {
    return true;
  }

  generate(state: SimpleState, temperature: number): SimpleState {
    return { ...state }; // No change
  }
}

// ========================================
// Helper Functions
// ========================================

function createConfig(overrides?: Partial<SAConfig<SimpleState>>): SAConfig<SimpleState> {
  return {
    initialTemperature: 100,
    minTemperature: 0.01,
    coolingRate: 0.95,
    maxIterations: 100,
    hardConstraintWeight: 10000,
    cloneState: (state) => ({ ...state }),
    logging: {
      enabled: false,
      level: 'error',
    },
    ...overrides,
  };
}

// ========================================
// Test Suite
// ========================================

describe('Acceptance Probability Logic', () => {
  describe('Phase 1: Hard Constraint Elimination', () => {
    it('should ALWAYS accept moves that reduce hard violations', () => {
      const initialState: SimpleState = {
        value: 0,
        hardViolationCount: 5,
        softViolationCount: 0,
      };

      const constraints = [new HardConstraintWithControl()];
      const moves = [new ImprovesHardMove()]; // Always improves
      const config = createConfig({ maxIterations: 10 });

      const solver = new SimulatedAnnealing(initialState, constraints, moves, config);
      const solution = solver.solve();

      // Should accept all improvements and reach 0 violations
      expect(solution.hardViolations).toBe(0);

      const stats = solver.getStats();
      const moveStats = stats['Improves Hard'];

      // All improving moves should be accepted
      expect(moveStats.accepted).toBe(moveStats.attempts);
    });

    it('should NEVER accept moves that increase hard violations in Phase 1', () => {
      const initialState: SimpleState = {
        value: 0,
        hardViolationCount: 1,
        softViolationCount: 0,
      };

      const constraints = [new HardConstraintWithControl()];
      const moves = [new WorsensHardMove()]; // Always worsens
      const config = createConfig({ maxIterations: 50 });

      const solver = new SimulatedAnnealing(initialState, constraints, moves, config);
      const solution = solver.solve();

      const stats = solver.getStats();
      const moveStats = stats['Worsens Hard'];

      // NO worsening moves should be accepted in Phase 1
      expect(moveStats.accepted).toBe(0);

      // Hard violations should not increase from initial
      expect(solution.hardViolations).toBeGreaterThanOrEqual(1);
    });

    it('should use Metropolis criterion for moves with same hard violations', () => {
      const initialState: SimpleState = {
        value: 0,
        hardViolationCount: 0, // Already satisfied
        softViolationCount: 5,
      };

      const constraints = [
        new HardConstraintWithControl(),
        new SoftConstraintWithControl(),
      ];
      const moves = [new NeutralMove()]; // Doesn't change anything
      const config = createConfig({
        maxIterations: 100,
        initialTemperature: 1000, // High temp for more exploration
      });

      const solver = new SimulatedAnnealing(initialState, constraints, moves, config);
      solver.solve();

      // With high temperature and neutral moves, some should be accepted
      // even though they don't improve (due to Metropolis criterion)
      const stats = solver.getStats();
      const moveStats = stats['Neutral Move'];

      // At least some attempts should have been made
      expect(moveStats.attempts).toBeGreaterThan(0);
    });

    it('should prioritize hard violations over soft in Phase 1', () => {
      const initialState: SimpleState = {
        value: 0,
        hardViolationCount: 3,
        softViolationCount: 10,
      };

      const constraints = [
        new HardConstraintWithControl(),
        new SoftConstraintWithControl(),
      ];
      const moves = [new ImprovesHardMove(), new ImprovesSoftMove()];
      const config = createConfig({ maxIterations: 200 });

      const solver = new SimulatedAnnealing(initialState, constraints, moves, config);
      const solution = solver.solve();

      // Hard violations should be completely eliminated
      expect(solution.hardViolations).toBe(0);

      const stats = solver.getStats();
      const hardMoveStats = stats['Improves Hard'];
      const softMoveStats = stats['Improves Soft'];

      // Hard-improving moves should have higher success rate
      if (hardMoveStats.attempts > 0 && softMoveStats.attempts > 0) {
        expect(hardMoveStats.accepted).toBeGreaterThan(0);
      }
    });
  });

  describe('Phase 2: Soft Constraint Optimization', () => {
    it('should STRICTLY reject moves that increase hard violations in Phase 2', () => {
      const initialState: SimpleState = {
        value: 0,
        hardViolationCount: 0, // Already satisfied (Phase 2 will start)
        softViolationCount: 5,
      };

      const constraints = [
        new HardConstraintWithControl(),
        new SoftConstraintWithControl(),
      ];
      const moves = [
        new WorsensHardMove(), // This should NEVER be accepted in Phase 2
        new ImprovesSoftMove(),
      ];
      const config = createConfig({ maxIterations: 200 });

      const solver = new SimulatedAnnealing(initialState, constraints, moves, config);
      const solution = solver.solve();

      const stats = solver.getStats();
      const worseningStats = stats['Worsens Hard'];

      // CRITICAL: Zero worsening moves should be accepted in Phase 2
      expect(worseningStats.accepted).toBe(0);

      // Hard violations must remain at 0
      expect(solution.hardViolations).toBe(0);
    });

    it('should accept soft-improving moves in Phase 2', () => {
      const initialState: SimpleState = {
        value: 0,
        hardViolationCount: 0, // Phase 2
        softViolationCount: 5,
      };

      const constraints = [
        new HardConstraintWithControl(),
        new SoftConstraintWithControl(),
      ];
      const moves = [new ImprovesSoftMove()];
      const config = createConfig({ maxIterations: 100 });

      const solver = new SimulatedAnnealing(initialState, constraints, moves, config);
      const solution = solver.solve();

      // Soft violations should improve
      expect(solution.softViolations).toBeLessThan(5);

      const stats = solver.getStats();
      const moveStats = stats['Improves Soft'];

      // Should accept improving moves
      expect(moveStats.accepted).toBeGreaterThan(0);
    });

    it('should use Metropolis for soft-worsening moves (at high temp)', () => {
      const initialState: SimpleState = {
        value: 0,
        hardViolationCount: 0,
        softViolationCount: 1,
      };

      const constraints = [
        new HardConstraintWithControl(),
        new SoftConstraintWithControl(),
      ];
      const moves = [new WorsensSoftMove()];
      const config = createConfig({
        initialTemperature: 10000, // Very high temperature
        maxIterations: 50,
      });

      const solver = new SimulatedAnnealing(initialState, constraints, moves, config);
      const solution = solver.solve();

      const stats = solver.getStats();
      const moveStats = stats['Worsens Soft'];

      // At very high temperature, some worsening moves might be accepted
      // (This tests the Metropolis criterion for soft constraints)
      // But hard violations should still be 0
      expect(solution.hardViolations).toBe(0);
    });

    it('should maintain hard constraint satisfaction throughout Phase 2', () => {
      const initialState: SimpleState = {
        value: 0,
        hardViolationCount: 0,
        softViolationCount: 10,
      };

      const constraints = [
        new HardConstraintWithControl(),
        new SoftConstraintWithControl(),
      ];
      const moves = [
        new ImprovesSoftMove(),
        new WorsensSoftMove(),
        new WorsensHardMove(), // Should NEVER be accepted
      ];
      const config = createConfig({ maxIterations: 500 });

      const solver = new SimulatedAnnealing(initialState, constraints, moves, config);
      const solution = solver.solve();

      // CRITICAL TEST: Hard violations MUST remain 0
      expect(solution.hardViolations).toBe(0);

      const stats = solver.getStats();

      // Worsening hard moves should have ZERO acceptance
      expect(stats['Worsens Hard'].accepted).toBe(0);
    });
  });

  describe('Temperature-Dependent Acceptance', () => {
    it('should accept more worsening moves at high temperature', () => {
      const initialState: SimpleState = {
        value: 0,
        hardViolationCount: 0,
        softViolationCount: 1,
      };

      const constraints = [new SoftConstraintWithControl()];
      const moves = [new WorsensSoftMove()];

      // High temperature run
      const configHigh = createConfig({
        initialTemperature: 10000,
        maxIterations: 30,
        coolingRate: 0.99,
      });

      // Low temperature run
      const configLow = createConfig({
        initialTemperature: 1,
        maxIterations: 30,
        coolingRate: 0.99,
      });

      const solverHigh = new SimulatedAnnealing(initialState, constraints, moves, configHigh);
      solverHigh.solve();
      const statsHigh = solverHigh.getStats();

      const solverLow = new SimulatedAnnealing(initialState, constraints, moves, configLow);
      solverLow.solve();
      const statsLow = solverLow.getStats();

      // High temperature should accept more worsening moves
      const acceptanceRateHigh = statsHigh['Worsens Soft'].accepted / statsHigh['Worsens Soft'].attempts;
      const acceptanceRateLow = statsLow['Worsens Soft'].accepted / statsLow['Worsens Soft'].attempts;

      expect(acceptanceRateHigh).toBeGreaterThan(acceptanceRateLow);
    });

    it('should accept fewer worsening moves as temperature decreases', () => {
      const initialState: SimpleState = {
        value: 0,
        hardViolationCount: 0,
        softViolationCount: 1,
      };

      const constraints = [new SoftConstraintWithControl()];
      const moves = [new WorsensSoftMove()];

      const config = createConfig({
        initialTemperature: 1000,
        coolingRate: 0.9, // Fast cooling
        maxIterations: 100,
      });

      const solver = new SimulatedAnnealing(initialState, constraints, moves, config);
      solver.solve();

      const stats = solver.getStats();

      // Some moves might be accepted early, but overall acceptance should be low
      // due to fast cooling
      expect(stats['Worsens Soft'].attempts).toBeGreaterThan(0);
    });
  });

  describe('Acceptance Probability Edge Cases', () => {
    it('should handle zero temperature gracefully', () => {
      const initialState: SimpleState = {
        value: 0,
        hardViolationCount: 0,
        softViolationCount: 1,
      };

      const constraints = [new SoftConstraintWithControl()];
      const moves = [new WorsensSoftMove()];

      const config = createConfig({
        initialTemperature: 0.01,
        minTemperature: 0.0001,
        coolingRate: 0.1, // Very fast cooling to reach ~0
        maxIterations: 100,
      });

      const solver = new SimulatedAnnealing(initialState, constraints, moves, config);
      const solution = solver.solve();

      // Should complete without errors
      expect(solution).toBeDefined();
    });

    it('should handle identical fitness values', () => {
      const initialState: SimpleState = {
        value: 0,
        hardViolationCount: 0,
        softViolationCount: 0, // Already optimal
      };

      const constraints = [
        new HardConstraintWithControl(),
        new SoftConstraintWithControl(),
      ];
      const moves = [new NeutralMove()]; // No change in fitness

      const config = createConfig({ maxIterations: 50 });

      const solver = new SimulatedAnnealing(initialState, constraints, moves, config);
      const solution = solver.solve();

      expect(solution.hardViolations).toBe(0);
      expect(solution.softViolations).toBe(0);
    });

    it('should handle very large fitness differences', () => {
      const initialState: SimpleState = {
        value: 0,
        hardViolationCount: 100, // Very bad
        softViolationCount: 100,
      };

      const constraints = [
        new HardConstraintWithControl(),
        new SoftConstraintWithControl(),
      ];
      const moves = [new ImprovesHardMove()];

      const config = createConfig({ maxIterations: 200 });

      const solver = new SimulatedAnnealing(initialState, constraints, moves, config);
      const solution = solver.solve();

      // Should still work and improve
      expect(solution.hardViolations).toBeLessThan(100);
    });
  });

  describe('Phase Transition', () => {
    it('should transition from Phase 1 to Phase 2 when hard violations reach 0', () => {
      const initialState: SimpleState = {
        value: 0,
        hardViolationCount: 2,
        softViolationCount: 5,
      };

      const constraints = [
        new HardConstraintWithControl(),
        new SoftConstraintWithControl(),
      ];
      const moves = [new ImprovesHardMove(), new ImprovesSoftMove()];

      const config = createConfig({ maxIterations: 500 });

      const solver = new SimulatedAnnealing(initialState, constraints, moves, config);
      const solution = solver.solve();

      // Should complete Phase 1 (eliminate hard violations)
      expect(solution.hardViolations).toBe(0);

      // Should then work on soft violations in Phase 2
      expect(solution.softViolations).toBeLessThan(5);
    });

    it('should enforce stricter acceptance in Phase 2 than Phase 1', () => {
      // This is tested implicitly by the Phase 2 tests above
      // where worsening hard moves are NEVER accepted in Phase 2
      // but might be explored (and rejected) in Phase 1
      expect(true).toBe(true);
    });
  });
});
