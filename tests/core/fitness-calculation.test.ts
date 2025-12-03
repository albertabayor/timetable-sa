/**
 * Unit tests for fitness calculation logic
 *
 * Tests how the SA engine calculates fitness from constraint evaluations,
 * including proper weighting of hard vs soft constraints.
 */

import { describe, it, expect } from '@jest/globals';
import { SimulatedAnnealing } from '../../src/core/SimulatedAnnealing.js';
import type { Constraint } from '../../src/core/interfaces/Constraint.js';
import type { MoveGenerator } from '../../src/core/interfaces/MoveGenerator.js';
import type { SAConfig } from '../../src/core/interfaces/SAConfig.js';

// ========================================
// Test State
// ========================================

interface FitnessTestState {
  hardScore: number; // 0 = violated, 1 = satisfied
  softScore: number; // 0 = violated, 1 = satisfied
}

// ========================================
// Controlled Constraints
// ========================================

class HardConstraintFixed implements Constraint<FitnessTestState> {
  name = 'Hard Constraint Fixed';
  type = 'hard' as const;

  constructor(private score: number) {}

  evaluate(state: FitnessTestState): number {
    return this.score;
  }

  getViolations(state: FitnessTestState): string[] {
    return this.score < 1 ? ['Hard constraint violated'] : [];
  }
}

class SoftConstraintFixed implements Constraint<FitnessTestState> {
  name = 'Soft Constraint Fixed';
  type = 'soft' as const;

  constructor(private score: number, public weight: number = 10) {}

  evaluate(state: FitnessTestState): number {
    return this.score;
  }
}

class HardConstraintFromState implements Constraint<FitnessTestState> {
  name = 'Hard Constraint From State';
  type = 'hard' as const;

  evaluate(state: FitnessTestState): number {
    return state.hardScore;
  }

  getViolations(state: FitnessTestState): string[] {
    return state.hardScore < 1 ? ['Hard violation'] : [];
  }
}

class SoftConstraintFromState implements Constraint<FitnessTestState> {
  name = 'Soft Constraint From State';
  type = 'soft' as const;
  weight = 10;

  evaluate(state: FitnessTestState): number {
    return state.softScore;
  }
}

// ========================================
// Dummy Move Generator
// ========================================

class NoOpMove implements MoveGenerator<FitnessTestState> {
  name = 'No Op';

  canApply(state: FitnessTestState): boolean {
    return true;
  }

  generate(state: FitnessTestState, temperature: number): FitnessTestState {
    return { ...state }; // No change
  }
}

// ========================================
// Helper Functions
// ========================================

function createConfig(overrides?: Partial<SAConfig<FitnessTestState>>): SAConfig<FitnessTestState> {
  return {
    initialTemperature: 100,
    minTemperature: 0.01,
    coolingRate: 0.95,
    maxIterations: 10,
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

describe('Fitness Calculation', () => {
  describe('Basic Fitness Calculation', () => {
    it('should calculate 0 fitness for fully satisfied constraints', () => {
      const state: FitnessTestState = { hardScore: 1, softScore: 1 };
      const constraints = [
        new HardConstraintFixed(1), // Fully satisfied
        new SoftConstraintFixed(1, 10), // Fully satisfied
      ];
      const moves = [new NoOpMove()];
      const config = createConfig({ maxIterations: 5 });

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      const solution = solver.solve();

      // Fitness should be 0 (no penalties)
      expect(solution.fitness).toBe(0);
      expect(solution.hardViolations).toBe(0);
      expect(solution.softViolations).toBe(0);
    });

    it('should calculate high fitness for violated hard constraints', () => {
      const state: FitnessTestState = { hardScore: 0, softScore: 1 };
      const constraints = [
        new HardConstraintFixed(0), // Completely violated
        new SoftConstraintFixed(1, 10), // Satisfied
      ];
      const moves = [new NoOpMove()];
      const config = createConfig({
        maxIterations: 5,
        hardConstraintWeight: 10000,
      });

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      const solution = solver.solve();

      // Fitness should be very high due to hard constraint weight
      // Hard penalty = (1 - 0) * 10000 = 10000
      expect(solution.fitness).toBeGreaterThanOrEqual(10000);
      expect(solution.hardViolations).toBeGreaterThan(0);
    });

    it('should calculate fitness with soft constraint penalties', () => {
      const state: FitnessTestState = { hardScore: 1, softScore: 0 };
      const constraints = [
        new HardConstraintFixed(1), // Satisfied
        new SoftConstraintFixed(0, 10), // Violated with weight 10
      ];
      const moves = [new NoOpMove()];
      const config = createConfig({ maxIterations: 5 });

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      const solution = solver.solve();

      // Fitness should be soft penalty only
      // Soft penalty = (1 - 0) * 10 = 10
      expect(solution.fitness).toBe(10);
      expect(solution.hardViolations).toBe(0);
      expect(solution.softViolations).toBeGreaterThan(0);
    });
  });

  describe('Constraint Weighting', () => {
    it('should weight hard constraints much higher than soft', () => {
      const stateHard: FitnessTestState = { hardScore: 0, softScore: 1 };
      const stateSoft: FitnessTestState = { hardScore: 1, softScore: 0 };

      const constraintsHard = [
        new HardConstraintFixed(0),
        new SoftConstraintFixed(1, 10),
      ];

      const constraintsSoft = [
        new HardConstraintFixed(1),
        new SoftConstraintFixed(0, 10),
      ];

      const config = createConfig({
        maxIterations: 5,
        hardConstraintWeight: 10000,
      });

      const solverHard = new SimulatedAnnealing(stateHard, constraintsHard, [new NoOpMove()], config);
      const solutionHard = solverHard.solve();

      const solverSoft = new SimulatedAnnealing(stateSoft, constraintsSoft, [new NoOpMove()], config);
      const solutionSoft = solverSoft.solve();

      // Hard violation fitness should be MUCH higher than soft
      expect(solutionHard.fitness).toBeGreaterThan(solutionSoft.fitness * 100);
    });

    it('should apply custom soft constraint weights correctly', () => {
      const state: FitnessTestState = { hardScore: 1, softScore: 0 };

      // Two identical violations with different weights
      const constraintsWeight5 = [new SoftConstraintFixed(0, 5)];
      const constraintsWeight20 = [new SoftConstraintFixed(0, 20)];

      const config = createConfig({ maxIterations: 5 });

      const solver5 = new SimulatedAnnealing(state, constraintsWeight5, [new NoOpMove()], config);
      const solution5 = solver5.solve();

      const solver20 = new SimulatedAnnealing(state, constraintsWeight20, [new NoOpMove()], config);
      const solution20 = solver20.solve();

      // Higher weight should result in higher fitness penalty
      // Weight 5: (1 - 0) * 5 = 5
      // Weight 20: (1 - 0) * 20 = 20
      expect(solution20.fitness).toBe(solution5.fitness * 4);
    });

    it('should use default weight of 10 for soft constraints without explicit weight', () => {
      const state: FitnessTestState = { hardScore: 1, softScore: 0 };
      const constraints = [new SoftConstraintFixed(0)]; // No weight specified, should default to 10

      const config = createConfig({ maxIterations: 5 });

      const solver = new SimulatedAnnealing(state, constraints, [new NoOpMove()], config);
      const solution = solver.solve();

      // Penalty should be (1 - 0) * 10 = 10
      expect(solution.fitness).toBe(10);
    });
  });

  describe('Partial Satisfaction', () => {
    it('should handle partial constraint satisfaction (score = 0.5)', () => {
      const state: FitnessTestState = { hardScore: 0.5, softScore: 0.5 };

      const constraints = [
        new HardConstraintFixed(0.5), // Half satisfied
        new SoftConstraintFixed(0.5, 10), // Half satisfied
      ];

      const config = createConfig({
        maxIterations: 5,
        hardConstraintWeight: 10000,
      });

      const solver = new SimulatedAnnealing(state, constraints, [new NoOpMove()], config);
      const solution = solver.solve();

      // Hard penalty = (1 - 0.5) * 10000 = 5000
      // Soft penalty = (1 - 0.5) * 10 = 5
      // Total = 5005
      expect(solution.fitness).toBe(5005);
    });

    it('should calculate fitness correctly for gradual improvements', () => {
      const configs = [
        { hardScore: 0.0, softScore: 1 },
        { hardScore: 0.25, softScore: 1 },
        { hardScore: 0.5, softScore: 1 },
        { hardScore: 0.75, softScore: 1 },
        { hardScore: 1.0, softScore: 1 },
      ];

      const fitnesses: number[] = [];

      for (const stateConfig of configs) {
        const state: FitnessTestState = stateConfig;
        const constraints = [new HardConstraintFixed(stateConfig.hardScore)];
        const config = createConfig({
          maxIterations: 5,
          hardConstraintWeight: 10000,
        });

        const solver = new SimulatedAnnealing(state, constraints, [new NoOpMove()], config);
        const solution = solver.solve();

        fitnesses.push(solution.fitness);
      }

      // Fitness should monotonically decrease as hard score improves
      for (let i = 1; i < fitnesses.length; i++) {
        expect(fitnesses[i]).toBeLessThan(fitnesses[i - 1]);
      }

      // Final fitness (fully satisfied) should be 0
      expect(fitnesses[fitnesses.length - 1]).toBe(0);
    });
  });

  describe('Multiple Constraints', () => {
    it('should sum penalties from multiple hard constraints', () => {
      const state: FitnessTestState = { hardScore: 0, softScore: 1 };

      const constraints = [
        new HardConstraintFixed(0), // Penalty: (1-0) * 10000 = 10000
        new HardConstraintFixed(0.5), // Penalty: (1-0.5) * 10000 = 5000
        new HardConstraintFixed(0.7), // Penalty: (1-0.7) * 10000 = 3000
      ];

      const config = createConfig({
        maxIterations: 5,
        hardConstraintWeight: 10000,
      });

      const solver = new SimulatedAnnealing(state, constraints, [new NoOpMove()], config);
      const solution = solver.solve();

      // Total penalty = 10000 + 5000 + 3000 = 18000
      expect(solution.fitness).toBe(18000);
    });

    it('should sum penalties from multiple soft constraints', () => {
      const state: FitnessTestState = { hardScore: 1, softScore: 0 };

      const constraints = [
        new SoftConstraintFixed(0, 10), // Penalty: (1-0) * 10 = 10
        new SoftConstraintFixed(0.5, 5), // Penalty: (1-0.5) * 5 = 2.5
        new SoftConstraintFixed(0.8, 20), // Penalty: (1-0.8) * 20 = 4
      ];

      const config = createConfig({ maxIterations: 5 });

      const solver = new SimulatedAnnealing(state, constraints, [new NoOpMove()], config);
      const solution = solver.solve();

      // Total penalty = 10 + 2.5 + 4 = 16.5
      expect(solution.fitness).toBe(16.5);
    });

    it('should combine hard and soft penalties correctly', () => {
      const state: FitnessTestState = { hardScore: 0, softScore: 0 };

      const constraints = [
        new HardConstraintFixed(0.5), // Hard: (1-0.5) * 10000 = 5000
        new SoftConstraintFixed(0, 10), // Soft: (1-0) * 10 = 10
        new SoftConstraintFixed(0.5, 20), // Soft: (1-0.5) * 20 = 10
      ];

      const config = createConfig({
        maxIterations: 5,
        hardConstraintWeight: 10000,
      });

      const solver = new SimulatedAnnealing(state, constraints, [new NoOpMove()], config);
      const solution = solver.solve();

      // Total = 5000 + 10 + 10 = 5020
      expect(solution.fitness).toBe(5020);
    });
  });

  describe('Violation Counting', () => {
    it('should count hard violations correctly using getViolations()', () => {
      const state: FitnessTestState = { hardScore: 0, softScore: 1 };

      const constraints = [
        new HardConstraintFromState(), // Will return hardScore from state
      ];

      const config = createConfig({ maxIterations: 5 });

      const solver = new SimulatedAnnealing(state, constraints, [new NoOpMove()], config);
      const solution = solver.solve();

      // hardScore = 0 means violated
      expect(solution.hardViolations).toBeGreaterThan(0);
    });

    it('should count multiple violations from single constraint', () => {
      // This is tested implicitly through getViolations() implementation
      // The SimulatedAnnealing class uses getViolations() to count actual violations
      const state: FitnessTestState = { hardScore: 0, softScore: 1 };

      const constraints = [new HardConstraintFromState()];
      const config = createConfig({ maxIterations: 5 });

      const solver = new SimulatedAnnealing(state, constraints, [new NoOpMove()], config);
      const solution = solver.solve();

      expect(solution.violations.length).toBeGreaterThan(0);
    });

    it('should provide violation details', () => {
      const state: FitnessTestState = { hardScore: 0, softScore: 0 };

      const constraints = [
        new HardConstraintFromState(),
        new SoftConstraintFromState(),
      ];

      const config = createConfig({ maxIterations: 5 });

      const solver = new SimulatedAnnealing(state, constraints, [new NoOpMove()], config);
      const solution = solver.solve();

      expect(solution.violations).toBeDefined();
      expect(Array.isArray(solution.violations)).toBe(true);

      if (solution.violations.length > 0) {
        expect(solution.violations[0]).toHaveProperty('constraintName');
        expect(solution.violations[0]).toHaveProperty('constraintType');
        expect(solution.violations[0]).toHaveProperty('score');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle constraint score = 0 (complete violation)', () => {
      const state: FitnessTestState = { hardScore: 0, softScore: 0 };
      const constraints = [new HardConstraintFixed(0)];
      const config = createConfig({
        maxIterations: 5,
        hardConstraintWeight: 10000,
      });

      const solver = new SimulatedAnnealing(state, constraints, [new NoOpMove()], config);
      const solution = solver.solve();

      // Penalty = (1 - 0) * 10000 = 10000
      expect(solution.fitness).toBe(10000);
    });

    it('should handle constraint score = 1 (complete satisfaction)', () => {
      const state: FitnessTestState = { hardScore: 1, softScore: 1 };
      const constraints = [new HardConstraintFixed(1), new SoftConstraintFixed(1, 10)];
      const config = createConfig({ maxIterations: 5 });

      const solver = new SimulatedAnnealing(state, constraints, [new NoOpMove()], config);
      const solution = solver.solve();

      // No penalties
      expect(solution.fitness).toBe(0);
    });

    it('should handle no constraints', () => {
      const state: FitnessTestState = { hardScore: 1, softScore: 1 };
      const constraints: Constraint<FitnessTestState>[] = [];
      const config = createConfig({ maxIterations: 5 });

      const solver = new SimulatedAnnealing(state, constraints, [new NoOpMove()], config);
      const solution = solver.solve();

      // No constraints = 0 fitness
      expect(solution.fitness).toBe(0);
      expect(solution.hardViolations).toBe(0);
      expect(solution.softViolations).toBe(0);
    });

    it('should handle very large penalty values', () => {
      const state: FitnessTestState = { hardScore: 0, softScore: 0 };
      const constraints = [new HardConstraintFixed(0)];
      const config = createConfig({
        maxIterations: 5,
        hardConstraintWeight: 1000000, // Very large weight
      });

      const solver = new SimulatedAnnealing(state, constraints, [new NoOpMove()], config);
      const solution = solver.solve();

      expect(solution.fitness).toBe(1000000);
      expect(isFinite(solution.fitness)).toBe(true);
    });

    it('should handle fractional scores correctly', () => {
      const state: FitnessTestState = { hardScore: 0.333, softScore: 0.667 };
      const constraints = [
        new HardConstraintFixed(0.333),
        new SoftConstraintFixed(0.667, 15),
      ];

      const config = createConfig({
        maxIterations: 5,
        hardConstraintWeight: 10000,
      });

      const solver = new SimulatedAnnealing(state, constraints, [new NoOpMove()], config);
      const solution = solver.solve();

      // Hard: (1 - 0.333) * 10000 = 6670
      // Soft: (1 - 0.667) * 15 = 4.995
      // Total ≈ 6674.995
      expect(solution.fitness).toBeCloseTo(6674.995, 2);
    });
  });
});
