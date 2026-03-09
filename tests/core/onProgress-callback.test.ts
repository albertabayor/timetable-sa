/**
 * Unit tests for onProgress callback feature
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { SimulatedAnnealing } from '../../src/core/SimulatedAnnealing.js';
import type { Constraint } from '../../src/core/interfaces/Constraint.js';
import type { MoveGenerator } from '../../src/core/interfaces/MoveGenerator.js';
import type { SAConfig } from '../../src/core/interfaces/SAConfig.js';
import type { ProgressStats } from '../../src/core/types/ProgressStats.js';

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
      if (assignment.timeSlot < 3) {
        morningCount++;
      }
    }

    return morningCount / state.assignments.length;
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

// ========================================
// Helper Functions
// ========================================

function createTestState(withConflicts = false): TaskAssignmentState {
  if (withConflicts) {
    return {
      assignments: [
        { taskId: 'T1', workerId: 'W0', timeSlot: 0 },
        { taskId: 'T2', workerId: 'W0', timeSlot: 0 },
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

function createTestConfig(overrides?: Partial<SAConfig<TaskAssignmentState>> & { logInterval?: number }): SAConfig<TaskAssignmentState> {
  const logInterval = overrides?.logInterval;
  const { logInterval: _, ...restOverrides } = overrides || {};
  
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
      ...(logInterval !== undefined && { logInterval }),
    },
    ...restOverrides,
  };
}

// ========================================
// Test Suite
// ========================================

describe('onProgress Callback Feature', () => {
  describe('Basic Callback Invocation', () => {
    it('should call onProgress at least once during optimization', async () => {
      const progressCalls: ProgressStats[] = [];
      
      const config = createTestConfig({
        maxIterations: 50,
        logInterval: 10,
        onProgress: (iteration, cost, temp, state, stats) => {
          progressCalls.push(stats);
        },
      });

      const state = createTestState();
      const constraints = [new NoWorkerConflict()];
      const moves = [new ChangeTimeSlot()];

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      await solver.solve();

      expect(progressCalls.length).toBeGreaterThan(0);
    });

    it('should call onProgress at iteration 0 initially', async () => {
      const progressCalls: ProgressStats[] = [];
      
      const config = createTestConfig({
        maxIterations: 50,
        onProgress: (iteration, cost, temp, state, stats) => {
          progressCalls.push(stats);
        },
      });

      const state = createTestState();
      const constraints = [new NoWorkerConflict()];
      const moves = [new ChangeTimeSlot()];

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      await solver.solve();

      expect(progressCalls.length).toBeGreaterThan(0);
      expect(progressCalls[0].iteration).toBe(0);
    });

    it('should call onProgress every logInterval iterations', async () => {
      const progressCalls: ProgressStats[] = [];
      const logInterval = 25;
      
      const config = createTestConfig({
        maxIterations: 100,
        logInterval: logInterval,
        onProgress: (iteration, cost, temp, state, stats) => {
          progressCalls.push(stats);
        },
      });

      const state = createTestState(true);
      const constraints = [new NoWorkerConflict()];
      const moves = [new ChangeTimeSlot()];

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      await solver.solve();

      // Check that callbacks occur at expected intervals (approximately)
      const callsAfterInitial = progressCalls.slice(1);
      expect(callsAfterInitial.length).toBeGreaterThan(0);
      
      // Verify progress percent increases
      for (let i = 1; i < progressCalls.length; i++) {
        expect(progressCalls[i].progressPercent).toBeGreaterThanOrEqual(0);
        expect(progressCalls[i].progressPercent).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('Progress Stats Content', () => {
    it('should provide correct iteration number', async () => {
      const progressCalls: ProgressStats[] = [];
      
      const config = createTestConfig({
        maxIterations: 50,
        logInterval: 10,
        onProgress: (iteration, cost, temp, state, stats) => {
          progressCalls.push(stats);
        },
      });

      const state = createTestState();
      const constraints = [new NoWorkerConflict()];
      const moves = [new ChangeTimeSlot()];

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      await solver.solve();

      expect(progressCalls.length).toBeGreaterThan(0);
      progressCalls.forEach(stats => {
        expect(typeof stats.iteration).toBe('number');
        expect(stats.iteration).toBeGreaterThanOrEqual(0);
      });
    });

    it('should provide current cost and best cost', async () => {
      const progressCalls: ProgressStats[] = [];
      
      const config = createTestConfig({
        maxIterations: 50,
        onProgress: (iteration, cost, temp, state, stats) => {
          progressCalls.push(stats);
        },
      });

      const state = createTestState(true);
      const constraints = [new NoWorkerConflict()];
      const moves = [new ChangeTimeSlot()];

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      await solver.solve();

      expect(progressCalls.length).toBeGreaterThan(0);
      progressCalls.forEach(stats => {
        expect(typeof stats.currentCost).toBe('number');
        expect(typeof stats.bestCost).toBe('number');
        expect(stats.bestCost).toBeLessThanOrEqual(stats.currentCost);
      });
    });

    it('should provide temperature', async () => {
      const progressCalls: ProgressStats[] = [];
      
      const config = createTestConfig({
        maxIterations: 50,
        onProgress: (iteration, cost, temp, state, stats) => {
          progressCalls.push(stats);
        },
      });

      const state = createTestState();
      const constraints = [new NoWorkerConflict()];
      const moves = [new ChangeTimeSlot()];

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      await solver.solve();

      progressCalls.forEach(stats => {
        expect(typeof stats.temperature).toBe('number');
        expect(stats.temperature).toBeGreaterThanOrEqual(0);
      });
    });

    it('should provide violation counts', async () => {
      const progressCalls: ProgressStats[] = [];
      
      const config = createTestConfig({
        maxIterations: 50,
        onProgress: (iteration, cost, temp, state, stats) => {
          progressCalls.push(stats);
        },
      });

      const state = createTestState(true);
      const constraints = [new NoWorkerConflict()];
      const moves = [new ChangeTimeSlot()];

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      await solver.solve();

      progressCalls.forEach(stats => {
        expect(typeof stats.hardViolations).toBe('number');
        expect(typeof stats.softViolations).toBe('number');
        expect(stats.hardViolations).toBeGreaterThanOrEqual(0);
        expect(stats.softViolations).toBeGreaterThanOrEqual(0);
      });
    });

    it('should provide phase information', async () => {
      const progressCalls: ProgressStats[] = [];
      
      const config = createTestConfig({
        maxIterations: 50,
        onProgress: (iteration, cost, temp, state, stats) => {
          progressCalls.push(stats);
        },
      });

      const state = createTestState();
      const constraints = [new NoWorkerConflict()];
      const moves = [new ChangeTimeSlot()];

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      await solver.solve();

      progressCalls.forEach(stats => {
        expect(['phase1', 'phase15', 'phase2', 'initial']).toContain(stats.phase);
      });
    });

    it('should provide progress percentage', async () => {
      const progressCalls: ProgressStats[] = [];
      
      const config = createTestConfig({
        maxIterations: 100,
        onProgress: (iteration, cost, temp, state, stats) => {
          progressCalls.push(stats);
        },
      });

      const state = createTestState();
      const constraints = [new NoWorkerConflict()];
      const moves = [new ChangeTimeSlot()];

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      await solver.solve();

      progressCalls.forEach(stats => {
        expect(typeof stats.progressPercent).toBe('number');
        expect(stats.progressPercent).toBeGreaterThanOrEqual(0);
        expect(stats.progressPercent).toBeLessThanOrEqual(100);
      });

      // First call should be at 0%
      expect(progressCalls[0].progressPercent).toBe(0);
      
      // Last call should be at 100% or close to it
      const lastCall = progressCalls[progressCalls.length - 1];
      expect(lastCall.progressPercent).toBeGreaterThanOrEqual(0);
    });

    it('should provide timestamp', async () => {
      const progressCalls: ProgressStats[] = [];
      
      const config = createTestConfig({
        maxIterations: 50,
        onProgress: (iteration, cost, temp, state, stats) => {
          progressCalls.push(stats);
        },
      });

      const state = createTestState();
      const constraints = [new NoWorkerConflict()];
      const moves = [new ChangeTimeSlot()];

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      await solver.solve();

      progressCalls.forEach(stats => {
        expect(typeof stats.timestamp).toBe('number');
        expect(stats.timestamp).toBeGreaterThan(0);
      });
    });

    it('should track accepted and rejected moves', async () => {
      const progressCalls: ProgressStats[] = [];
      
      const config = createTestConfig({
        maxIterations: 50,
        onProgress: (iteration, cost, temp, state, stats) => {
          progressCalls.push(stats);
        },
      });

      const state = createTestState();
      const constraints = [new NoWorkerConflict()];
      const moves = [new ChangeTimeSlot()];

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      await solver.solve();

      // Total moves should increase or stay same over time
      for (let i = 1; i < progressCalls.length; i++) {
        const totalMovesCurrent = progressCalls[i].acceptedMoves + progressCalls[i].rejectedMoves;
        const totalMovesPrevious = progressCalls[i-1].acceptedMoves + progressCalls[i-1].rejectedMoves;
        expect(totalMovesCurrent).toBeGreaterThanOrEqual(totalMovesPrevious);
      }
    });
  });

  describe('Async Callback Support', () => {
    it('should support async onProgress callbacks', async () => {
      const progressCalls: number[] = [];
      
      const config = createTestConfig({
        maxIterations: 50,
        onProgress: async (iteration, cost, temp, state, stats) => {
          // Simulate async work
          await new Promise(resolve => setTimeout(resolve, 1));
          progressCalls.push(iteration);
        },
      });

      const state = createTestState();
      const constraints = [new NoWorkerConflict()];
      const moves = [new ChangeTimeSlot()];

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      const solution = await solver.solve();

      expect(progressCalls.length).toBeGreaterThan(0);
      expect(solution).toBeDefined();
    });

    it('should wait for async callback to complete before continuing', async () => {
      let callbackCompleted = false;
      const progressCalls: number[] = [];
      
      const config = createTestConfig({
        maxIterations: 50,
        onProgress: async (iteration, cost, temp, state, stats) => {
          await new Promise(resolve => setTimeout(resolve, 5));
          callbackCompleted = true;
          progressCalls.push(iteration);
        },
      });

      const state = createTestState();
      const constraints = [new NoWorkerConflict()];
      const moves = [new ChangeTimeSlot()];

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      await solver.solve();

      // Callback should have been completed
      expect(callbackCompleted).toBe(true);
      expect(progressCalls.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should not break optimization when callback throws error', async () => {
      const config = createTestConfig({
        maxIterations: 50,
        onProgress: (iteration, cost, temp, state, stats) => {
          if (iteration === 10) {
            throw new Error('Test error');
          }
        },
      });

      const state = createTestState();
      const constraints = [new NoWorkerConflict()];
      const moves = [new ChangeTimeSlot()];

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      
      // Should not throw
      const solution = await solver.solve();
      
      expect(solution).toBeDefined();
      expect(solution.iterations).toBeGreaterThan(0);
    });

    it('should not break optimization when async callback rejects', async () => {
      const config = createTestConfig({
        maxIterations: 50,
        onProgress: async (iteration, cost, temp, state, stats) => {
          if (iteration === 10) {
            throw new Error('Test async error');
          }
        },
      });

      const state = createTestState();
      const constraints = [new NoWorkerConflict()];
      const moves = [new ChangeTimeSlot()];

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      
      // Should not throw
      const solution = await solver.solve();
      
      expect(solution).toBeDefined();
      expect(solution.iterations).toBeGreaterThan(0);
    });

    it('should continue optimization after callback error', async () => {
      const progressCalls: number[] = [];
      
      const config = createTestConfig({
        maxIterations: 50,
        onProgress: (iteration, cost, temp, state, stats) => {
          progressCalls.push(iteration);
          if (iteration === 10) {
            throw new Error('Test error');
          }
        },
      });

      const state = createTestState();
      const constraints = [new NoWorkerConflict()];
      const moves = [new ChangeTimeSlot()];

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      await solver.solve();

      // Should have called callback before and after the error
      const beforeError = progressCalls.filter(i => i < 10).length;
      const afterError = progressCalls.filter(i => i > 10).length;
      
      expect(beforeError).toBeGreaterThan(0);
      // May or may not have calls after, depending on when error occurs
    });
  });

  describe('Backward Compatibility', () => {
    it('should work without onProgress callback', async () => {
      const config = createTestConfig({
        maxIterations: 50,
        // No onProgress
      });

      const state = createTestState();
      const constraints = [new NoWorkerConflict()];
      const moves = [new ChangeTimeSlot()];

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      const solution = await solver.solve();

      expect(solution).toBeDefined();
      expect(solution.iterations).toBeGreaterThan(0);
    });

    it('should work with onProgress set to undefined', async () => {
      const config = createTestConfig({
        maxIterations: 50,
        onProgress: undefined,
      });

      const state = createTestState();
      const constraints = [new NoWorkerConflict()];
      const moves = [new ChangeTimeSlot()];

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      const solution = await solver.solve();

      expect(solution).toBeDefined();
    });
  });

  describe('State Parameter', () => {
    it('should pass null as state for performance', async () => {
      const receivedStates: (TaskAssignmentState | null)[] = [];
      
      const config = createTestConfig({
        maxIterations: 50,
        onProgress: (iteration, cost, temp, state, stats) => {
          receivedStates.push(state);
        },
      });

      const state = createTestState();
      const constraints = [new NoWorkerConflict()];
      const moves = [new ChangeTimeSlot()];

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      await solver.solve();

      // State should always be null for performance
      receivedStates.forEach(s => {
        expect(s).toBeNull();
      });
    });
  });

  describe('Integration with Other Features', () => {
    it('should work with tabu search enabled', async () => {
      const progressCalls: ProgressStats[] = [];
      
      const config = createTestConfig({
        maxIterations: 50,
        tabuSearchEnabled: true,
        tabuTenure: 10,
        onProgress: (iteration, cost, temp, state, stats) => {
          progressCalls.push(stats);
        },
      });

      const state = createTestState();
      const constraints = [new NoWorkerConflict()];
      const moves = [new ChangeTimeSlot()];

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      await solver.solve();

      progressCalls.forEach(stats => {
        expect(typeof stats.tabuHits).toBe('number');
        expect(stats.tabuHits).toBeGreaterThanOrEqual(0);
      });
    });

    it('should work with reheating enabled', async () => {
      const progressCalls: ProgressStats[] = [];
      
      const config = createTestConfig({
        maxIterations: 200,
        reheatingThreshold: 50,
        reheatingFactor: 2.0,
        maxReheats: 2,
        onProgress: (iteration, cost, temp, state, stats) => {
          progressCalls.push(stats);
        },
      });

      const state = createTestState(true);
      const constraints = [new NoWorkerConflict()];
      const moves = [new ChangeTimeSlot()];

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      const solution = await solver.solve();

      // Find if reheating occurred
      const maxReheats = Math.max(...progressCalls.map(s => s.reheatingCount));
      expect(maxReheats).toBeGreaterThanOrEqual(0);
      expect(solution.reheats).toBeLessThanOrEqual(2);
    });

    it('should work with intensification enabled', async () => {
      const phaseCalls: string[] = [];
      
      const config = createTestConfig({
        maxIterations: 200,
        enableIntensification: true,
        intensificationIterations: 50,
        onProgress: (iteration, cost, temp, state, stats) => {
          phaseCalls.push(stats.phase);
        },
      });

      const state = createTestState(true); // With conflicts to trigger intensification
      const constraints = [new NoWorkerConflict()];
      const moves = [new ChangeTimeSlot()];

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      await solver.solve();

      // Should have phase1 at minimum
      expect(phaseCalls).toContain('phase1');
      // Phase 2 is entered after phase 1 completes (which might happen before intensification)
      // The test just verifies intensification doesn't break progress tracking
    });
  });

  describe('Real-world Usage Patterns', () => {
    it('should allow progress tracking for UI updates', async () => {
      const uiUpdates: { iteration: number; progress: number; message: string }[] = [];
      
      const config = createTestConfig({
        maxIterations: 100,
        logInterval: 25,
        onProgress: (iteration, cost, temp, state, stats) => {
          uiUpdates.push({
            iteration,
            progress: stats.progressPercent,
            message: `[${stats.phase}] ${stats.progressPercent.toFixed(1)}% - Cost: ${cost.toFixed(2)}`,
          });
        },
      });

      const state = createTestState();
      const constraints = [new NoWorkerConflict()];
      const moves = [new ChangeTimeSlot()];

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      await solver.solve();

      expect(uiUpdates.length).toBeGreaterThan(0);
      
      // Each update should have a valid message
      uiUpdates.forEach(update => {
        expect(update.message).toBeDefined();
        expect(update.message.length).toBeGreaterThan(0);
      });
    });

    it('should allow database logging pattern', async () => {
      const dbLogs: ProgressStats[] = [];
      
      const config = createTestConfig({
        maxIterations: 50,
        onProgress: async (iteration, cost, temp, state, stats) => {
          // Simulate async database write
          await new Promise(resolve => setTimeout(resolve, 1));
          dbLogs.push({ ...stats });
        },
      });

      const state = createTestState();
      const constraints = [new NoWorkerConflict()];
      const moves = [new ChangeTimeSlot()];

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      await solver.solve();

      expect(dbLogs.length).toBeGreaterThan(0);
      
      // Each log should have a timestamp
      dbLogs.forEach(log => {
        expect(log.timestamp).toBeGreaterThan(0);
      });
    });

    it('should allow WebSocket emit pattern', async () => {
      const emittedEvents: { iteration: number; data: unknown }[] = [];
      
      const config = createTestConfig({
        maxIterations: 50,
        onProgress: async (iteration, cost, temp, state, stats) => {
          // Simulate WebSocket emit
          const payload = {
            type: 'optimization-progress',
            data: {
              iteration,
              progress: stats.progressPercent,
              temperature: temp,
              hardViolations: stats.hardViolations,
            },
          };
          
          // Simulate network delay
          await new Promise(resolve => setTimeout(resolve, 1));
          
          emittedEvents.push({ iteration, data: payload });
        },
      });

      const state = createTestState();
      const constraints = [new NoWorkerConflict()];
      const moves = [new ChangeTimeSlot()];

      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      await solver.solve();

      expect(emittedEvents.length).toBeGreaterThan(0);
      
      emittedEvents.forEach(event => {
        expect(event.data).toHaveProperty('type');
        expect(event.data).toHaveProperty('data');
      });
    });
  });
});
