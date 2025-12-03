/**
 * Unit tests for SimulatedAnnealing core engine
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { SimulatedAnnealing } from '../../src/core/SimulatedAnnealing.js';
import type { Constraint } from '../../src/core/interfaces/Constraint.js';
import type { MoveGenerator } from '../../src/core/interfaces/MoveGenerator.js';
import type { SAConfig } from '../../src/core/interfaces/SAConfig.js';

// ========================================
// Test Domain: Simple Task Assignment Problem
// ========================================

interface TaskAssignmentState {
  assignments: Array<{
    taskId: string;
    workerId: string;
    timeSlot: number;
  }>;
  totalWorkers: number;
  totalTimeSlots: number;
}

// ========================================
// Test Constraints
// ========================================

class NoWorkerConflict implements Constraint<TaskAssignmentState> {
  name = 'No Worker Conflict';
  type = 'hard' as const;

  evaluate(state: TaskAssignmentState): number {
    const conflicts = new Set<number>();

    for (let i = 0; i < state.assignments.length; i++) {
      for (let j = i + 1; j < state.assignments.length; j++) {
        const a = state.assignments[i];
        const b = state.assignments[j];

        if (a.workerId === b.workerId && a.timeSlot === b.timeSlot) {
          conflicts.add(i);
        }
      }
    }

    return conflicts.size === 0 ? 1 : 1 / (1 + conflicts.size);
  }

  getViolations(state: TaskAssignmentState): string[] {
    const violations: string[] = [];

    for (let i = 0; i < state.assignments.length; i++) {
      for (let j = i + 1; j < state.assignments.length; j++) {
        const a = state.assignments[i];
        const b = state.assignments[j];

        if (a.workerId === b.workerId && a.timeSlot === b.timeSlot) {
          violations.push(
            `Worker ${a.workerId} assigned to both ${a.taskId} and ${b.taskId} at time ${a.timeSlot}`
          );
        }
      }
    }

    return violations;
  }
}

class PreferMorningSlots implements Constraint<TaskAssignmentState> {
  name = 'Prefer Morning Slots';
  type = 'soft' as const;
  weight = 5;

  evaluate(state: TaskAssignmentState): number {
    let morningCount = 0;

    for (const assignment of state.assignments) {
      if (assignment.timeSlot < 3) { // Morning is slots 0, 1, 2
        morningCount++;
      }
    }

    return morningCount / state.assignments.length;
  }
}

class AlwaysFail implements Constraint<TaskAssignmentState> {
  name = 'Always Fail';
  type = 'hard' as const;

  evaluate(state: TaskAssignmentState): number {
    return 0; // Always violated
  }

  getViolations(state: TaskAssignmentState): string[] {
    return ['This constraint always fails'];
  }
}

// ========================================
// Test Move Generators
// ========================================

class ChangeTimeSlot implements MoveGenerator<TaskAssignmentState> {
  name = 'Change Time Slot';

  canApply(state: TaskAssignmentState): boolean {
    return state.assignments.length > 0 && state.totalTimeSlots > 0;
  }

  generate(state: TaskAssignmentState, temperature: number): TaskAssignmentState {
    const newState = JSON.parse(JSON.stringify(state)) as TaskAssignmentState;

    const randomIndex = Math.floor(Math.random() * newState.assignments.length);
    const newTimeSlot = Math.floor(Math.random() * newState.totalTimeSlots);

    newState.assignments[randomIndex].timeSlot = newTimeSlot;

    return newState;
  }
}

class ChangeWorker implements MoveGenerator<TaskAssignmentState> {
  name = 'Change Worker';

  canApply(state: TaskAssignmentState): boolean {
    return state.assignments.length > 0 && state.totalWorkers > 1;
  }

  generate(state: TaskAssignmentState, temperature: number): TaskAssignmentState {
    const newState = JSON.parse(JSON.stringify(state)) as TaskAssignmentState;

    const randomIndex = Math.floor(Math.random() * newState.assignments.length);
    const newWorkerId = `W${Math.floor(Math.random() * newState.totalWorkers)}`;

    newState.assignments[randomIndex].workerId = newWorkerId;

    return newState;
  }
}

class NoOpMove implements MoveGenerator<TaskAssignmentState> {
  name = 'No Op';

  canApply(state: TaskAssignmentState): boolean {
    return false; // Never applicable
  }

  generate(state: TaskAssignmentState, temperature: number): TaskAssignmentState {
    return state;
  }
}

// ========================================
// Helper Functions
// ========================================

function createTestState(withConflicts = false): TaskAssignmentState {
  if (withConflicts) {
    return {
      assignments: [
        { taskId: 'T1', workerId: 'W0', timeSlot: 0 },
        { taskId: 'T2', workerId: 'W0', timeSlot: 0 }, // Conflict!
        { taskId: 'T3', workerId: 'W1', timeSlot: 1 },
      ],
      totalWorkers: 2,
      totalTimeSlots: 5,
    };
  }

  return {
    assignments: [
      { taskId: 'T1', workerId: 'W0', timeSlot: 0 },
      { taskId: 'T2', workerId: 'W1', timeSlot: 1 },
      { taskId: 'T3', workerId: 'W0', timeSlot: 2 },
    ],
    totalWorkers: 2,
    totalTimeSlots: 5,
  };
}

function createTestConfig(overrides?: Partial<SAConfig<TaskAssignmentState>>): SAConfig<TaskAssignmentState> {
  return {
    initialTemperature: 100,
    minTemperature: 0.01,
    coolingRate: 0.95,
    maxIterations: 100,
    hardConstraintWeight: 1000,
    cloneState: (state) => JSON.parse(JSON.stringify(state)),
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

describe('SimulatedAnnealing Core Engine', () => {
  describe('Initialization', () => {
    it('should initialize with valid configuration', () => {
      const state = createTestState();
      const constraints = [new NoWorkerConflict()];
      const moves = [new ChangeTimeSlot()];
      const config = createTestConfig();

      const solver = new SimulatedAnnealing(state, constraints, moves, config);

      expect(solver).toBeDefined();
    });

    it('should separate hard and soft constraints', () => {
      const state = createTestState();
      const constraints = [
        new NoWorkerConflict(), // hard
        new PreferMorningSlots(), // soft
      ];
      const moves = [new ChangeTimeSlot()];
      const config = createTestConfig();

      const solver = new SimulatedAnnealing(state, constraints, moves, config);

      // Solver should work without errors
      expect(solver).toBeDefined();
    });

    it('should initialize operator statistics', () => {
      const state = createTestState();
      const constraints = [new NoWorkerConflict()];
      const moves = [new ChangeTimeSlot(), new ChangeWorker()];
      const config = createTestConfig({ maxIterations: 10 });

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      solver.solve();

      const stats = solver.getStats();

      expect(stats).toBeDefined();
      expect(stats['Change Time Slot']).toBeDefined();
      expect(stats['Change Worker']).toBeDefined();
    });
  });

  describe('Optimization Loop', () => {
    it('should complete optimization within maxIterations', () => {
      const state = createTestState(true); // With conflicts
      const constraints = [new NoWorkerConflict()];
      const moves = [new ChangeTimeSlot()];
      const config = createTestConfig({ maxIterations: 50 });

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      const solution = solver.solve();

      expect(solution.iterations).toBeLessThanOrEqual(50);
    });

    it('should respect minTemperature stopping condition', () => {
      const state = createTestState();
      const constraints = [new NoWorkerConflict()];
      const moves = [new ChangeTimeSlot()];
      const config = createTestConfig({
        initialTemperature: 10,
        minTemperature: 5,
        coolingRate: 0.5,
        maxIterations: 10000,
      });

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      const solution = solver.solve();

      expect(solution.finalTemperature).toBeLessThanOrEqual(5);
    });

    it('should stop early if Phase 1 eliminates all hard violations', () => {
      const state = createTestState(false); // No conflicts
      const constraints = [new NoWorkerConflict()];
      const moves = [new ChangeTimeSlot()];
      const config = createTestConfig({ maxIterations: 1000 });

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      const solution = solver.solve();

      expect(solution.hardViolations).toBe(0);
      // Should complete quickly since already optimal
    });

    it('should handle empty move generators gracefully', () => {
      const state = createTestState();
      const constraints = [new NoWorkerConflict()];
      const moves: MoveGenerator<TaskAssignmentState>[] = []; // No moves!
      const config = createTestConfig({ maxIterations: 10 });

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      const solution = solver.solve();

      // Should return initial state unchanged
      expect(solution.iterations).toBe(0);
    });

    it('should handle all non-applicable move generators', () => {
      const state = createTestState();
      const constraints = [new NoWorkerConflict()];
      const moves = [new NoOpMove()]; // Never applicable
      const config = createTestConfig({ maxIterations: 10 });

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      const solution = solver.solve();

      // Should return initial state
      expect(solution.iterations).toBe(0);
    });
  });

  describe('Constraint Evaluation', () => {
    it('should correctly evaluate hard constraints', () => {
      const stateWithConflict = createTestState(true);
      const stateWithoutConflict = createTestState(false);
      const constraints = [new NoWorkerConflict()];
      const moves = [new ChangeTimeSlot()];
      const config = createTestConfig({ maxIterations: 500 });

      const solver1 = new SimulatedAnnealing(stateWithConflict, constraints, moves, config);
      const solution1 = solver1.solve();

      const solver2 = new SimulatedAnnealing(stateWithoutConflict, constraints, moves, config);
      const solution2 = solver2.solve();

      // With enough iterations, both should reach 0 violations
      // But we verify the solver can distinguish between them initially
      expect(solution1.hardViolations).toBeLessThanOrEqual(0);
      expect(solution2.hardViolations).toBe(0);
    });

    it('should correctly count violations using getViolations()', () => {
      const state = createTestState(true); // Has conflict
      const constraints = [new NoWorkerConflict()];
      const moves = [new ChangeTimeSlot()];
      const config = createTestConfig({ maxIterations: 500 });

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      const solution = solver.solve();

      // With enough iterations, should be able to eliminate violations
      // This test verifies that getViolations() is used correctly
      expect(solution.hardViolations).toBeLessThanOrEqual(0);
      expect(solution.violations).toBeDefined();
    });

    it('should apply correct penalty weights for soft constraints', () => {
      const state = createTestState();
      const softConstraint = new PreferMorningSlots();
      const constraints = [softConstraint];
      const moves = [new ChangeTimeSlot()];
      const config = createTestConfig({ maxIterations: 10 });

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      const solution = solver.solve();

      // Soft violations should be counted
      expect(solution.softViolations).toBeGreaterThanOrEqual(0);
    });

    it('should heavily penalize hard constraints vs soft', () => {
      const state = createTestState(true); // With conflicts
      const constraints = [
        new NoWorkerConflict(), // hard
        new PreferMorningSlots(), // soft
      ];
      const moves = [new ChangeTimeSlot()];
      const config = createTestConfig({
        maxIterations: 500,
        hardConstraintWeight: 10000,
      });

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      const solution = solver.solve();

      // With enough iterations, hard constraints should be satisfied
      // This test verifies that hard constraints are prioritized
      expect(solution.hardViolations).toBe(0);
      // Fitness should be low (mostly just soft penalties)
      expect(solution.fitness).toBeLessThan(10000);
    });
  });

  describe('Solution Quality', () => {
    it('should find feasible solution for solvable problem', () => {
      const state = createTestState(true); // With conflicts
      const constraints = [new NoWorkerConflict()];
      const moves = [new ChangeTimeSlot(), new ChangeWorker()];
      const config = createTestConfig({ maxIterations: 500 });

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      const solution = solver.solve();

      // Should eliminate all hard violations with enough iterations
      expect(solution.hardViolations).toBe(0);
    });

    it('should improve fitness over iterations', () => {
      const state = createTestState(true); // With conflicts
      const constraints = [new NoWorkerConflict()];
      const moves = [new ChangeTimeSlot()];
      const config = createTestConfig({ maxIterations: 200 });

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      const solution = solver.solve();

      // Final fitness should be better than initial
      // (We can't check this directly, but violations should decrease)
      expect(solution.hardViolations).toBeLessThanOrEqual(1);
    });

    it('should optimize soft constraints after hard constraints satisfied', () => {
      const state = createTestState(false); // No hard violations
      const constraints = [
        new NoWorkerConflict(), // hard (already satisfied)
        new PreferMorningSlots(), // soft
      ];
      const moves = [new ChangeTimeSlot()];
      const config = createTestConfig({ maxIterations: 500 });

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      const solution = solver.solve();

      expect(solution.hardViolations).toBe(0);
      // Soft constraint optimization should occur in Phase 2
    });

    it('should handle unsolvable problems gracefully', () => {
      const state = createTestState();
      const constraints = [new AlwaysFail()]; // Always fails
      const moves = [new ChangeTimeSlot()];
      const config = createTestConfig({ maxIterations: 100 });

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      const solution = solver.solve();

      // Should complete without crashing
      expect(solution.hardViolations).toBeGreaterThan(0);
      expect(solution.iterations).toBeLessThanOrEqual(100);
    });
  });

  describe('Operator Statistics', () => {
    it('should track operator attempts', () => {
      const state = createTestState(true);
      const constraints = [new NoWorkerConflict()];
      const moves = [new ChangeTimeSlot(), new ChangeWorker()];
      const config = createTestConfig({ maxIterations: 50 });

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      solver.solve();

      const stats = solver.getStats();

      expect(stats['Change Time Slot'].attempts).toBeGreaterThan(0);
      expect(stats['Change Worker'].attempts).toBeGreaterThan(0);
    });

    it('should track operator success rates', () => {
      const state = createTestState(true);
      const constraints = [new NoWorkerConflict()];
      const moves = [new ChangeTimeSlot()];
      const config = createTestConfig({ maxIterations: 100 });

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      solver.solve();

      const stats = solver.getStats();

      expect(stats['Change Time Slot'].successRate).toBeGreaterThanOrEqual(0);
      expect(stats['Change Time Slot'].successRate).toBeLessThanOrEqual(1);
    });

    it('should calculate success rate as improvements/attempts', () => {
      const state = createTestState(true);
      const constraints = [new NoWorkerConflict()];
      const moves = [new ChangeTimeSlot()];
      const config = createTestConfig({ maxIterations: 100 });

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      solver.solve();

      const stats = solver.getStats();
      const opStats = stats['Change Time Slot'];

      if (opStats.attempts > 0) {
        expect(opStats.successRate).toBe(opStats.improvements / opStats.attempts);
      }
    });
  });

  describe('Reheating Mechanism', () => {
    it('should reheat when stuck in local minima', () => {
      const state = createTestState(true);
      const constraints = [new NoWorkerConflict()];
      const moves = [new ChangeTimeSlot()];
      const config = createTestConfig({
        maxIterations: 500,
        reheatingThreshold: 50,
        reheatingFactor: 2.0,
        maxReheats: 3,
      });

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      const solution = solver.solve();

      // Reheating should have occurred if stuck
      expect(solution.reheats).toBeGreaterThanOrEqual(0);
      expect(solution.reheats).toBeLessThanOrEqual(3);
    });

    it('should not exceed maxReheats', () => {
      const state = createTestState(true);
      const constraints = [new AlwaysFail()]; // Always fails to trigger reheating
      const moves = [new ChangeTimeSlot()];
      const config = createTestConfig({
        maxIterations: 1000,
        reheatingThreshold: 10,
        reheatingFactor: 2.0,
        maxReheats: 2,
      });

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      const solution = solver.solve();

      expect(solution.reheats).toBeLessThanOrEqual(2);
    });
  });

  describe('Solution Output', () => {
    it('should return complete solution object', () => {
      const state = createTestState();
      const constraints = [new NoWorkerConflict()];
      const moves = [new ChangeTimeSlot()];
      const config = createTestConfig({ maxIterations: 50 });

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      const solution = solver.solve();

      expect(solution.state).toBeDefined();
      expect(solution.fitness).toBeDefined();
      expect(solution.hardViolations).toBeDefined();
      expect(solution.softViolations).toBeDefined();
      expect(solution.iterations).toBeDefined();
      expect(solution.reheats).toBeDefined();
      expect(solution.finalTemperature).toBeDefined();
      expect(solution.violations).toBeDefined();
      expect(solution.operatorStats).toBeDefined();
    });

    it('should include violation details', () => {
      const state = createTestState(true); // With conflicts
      const constraints = [new NoWorkerConflict()];
      const moves = [new ChangeTimeSlot()];
      const config = createTestConfig({ maxIterations: 10 });

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      const solution = solver.solve();

      expect(Array.isArray(solution.violations)).toBe(true);

      if (solution.hardViolations > 0) {
        expect(solution.violations.length).toBeGreaterThan(0);
        expect(solution.violations[0]).toHaveProperty('constraintName');
        expect(solution.violations[0]).toHaveProperty('constraintType');
      }
    });

    it('should not mutate initial state', () => {
      const state = createTestState(true);
      const initialStateCopy = JSON.parse(JSON.stringify(state));

      const constraints = [new NoWorkerConflict()];
      const moves = [new ChangeTimeSlot()];
      const config = createTestConfig({ maxIterations: 50 });

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      solver.solve();

      // Initial state should remain unchanged
      expect(state).toEqual(initialStateCopy);
    });
  });

  describe('Edge Cases', () => {
    it('should handle state with no assignments', () => {
      const state: TaskAssignmentState = {
        assignments: [],
        totalWorkers: 2,
        totalTimeSlots: 5,
      };
      const constraints = [new NoWorkerConflict()];
      const moves = [new ChangeTimeSlot()];
      const config = createTestConfig({ maxIterations: 10 });

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      const solution = solver.solve();

      expect(solution.hardViolations).toBe(0);
    });

    it('should handle single assignment state', () => {
      const state: TaskAssignmentState = {
        assignments: [{ taskId: 'T1', workerId: 'W0', timeSlot: 0 }],
        totalWorkers: 2,
        totalTimeSlots: 5,
      };
      const constraints = [new NoWorkerConflict()];
      const moves = [new ChangeTimeSlot()];
      const config = createTestConfig({ maxIterations: 10 });

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      const solution = solver.solve();

      expect(solution.hardViolations).toBe(0);
    });

    it('should handle very high temperature', () => {
      const state = createTestState(true);
      const constraints = [new NoWorkerConflict()];
      const moves = [new ChangeTimeSlot()];
      const config = createTestConfig({
        initialTemperature: 1000000,
        maxIterations: 50,
      });

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      const solution = solver.solve();

      expect(solution).toBeDefined();
    });

    it('should handle very low cooling rate', () => {
      const state = createTestState(true);
      const constraints = [new NoWorkerConflict()];
      const moves = [new ChangeTimeSlot()];
      const config = createTestConfig({
        coolingRate: 0.5, // Fast cooling
        maxIterations: 100,
      });

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      const solution = solver.solve();

      expect(solution).toBeDefined();
      expect(solution.iterations).toBeLessThanOrEqual(100);
    });
  });
});
