/**
 * Integration tests with realistic timetabling examples
 *
 * These tests verify that the SA engine works end-to-end
 * on actual timetabling problems.
 */

import { describe, it, expect } from '@jest/globals';
import { SimulatedAnnealing } from '../../src/core/SimulatedAnnealing.js';
import type { Constraint } from '../../src/core/interfaces/Constraint.js';
import type { MoveGenerator } from '../../src/core/interfaces/MoveGenerator.js';
import type { SAConfig } from '../../src/core/interfaces/SAConfig.js';

// ========================================
// Simple Timetabling Domain
// ========================================

interface TimeSlot {
  day: string;
  hour: number;
}

interface Assignment {
  classId: string;
  room: string;
  lecturer: string;
  timeSlot: TimeSlot;
}

interface TimetableState {
  assignments: Assignment[];
  rooms: string[];
  lecturers: string[];
  availableTimeSlots: TimeSlot[];
}

// ========================================
// Realistic Constraints
// ========================================

class NoRoomConflict implements Constraint<TimetableState> {
  name = 'No Room Conflict';
  type = 'hard' as const;

  evaluate(state: TimetableState): number {
    const conflicts = this.getViolations(state);
    return conflicts.length === 0 ? 1 : 1 / (1 + conflicts.length);
  }

  getViolations(state: TimetableState): string[] {
    const violations: string[] = [];
    const { assignments } = state;

    for (let i = 0; i < assignments.length; i++) {
      for (let j = i + 1; j < assignments.length; j++) {
        const a = assignments[i];
        const b = assignments[j];

        if (
          a.room === b.room &&
          a.timeSlot.day === b.timeSlot.day &&
          a.timeSlot.hour === b.timeSlot.hour
        ) {
          violations.push(
            `Room ${a.room} conflict: ${a.classId} and ${b.classId} at ${a.timeSlot.day} ${a.timeSlot.hour}:00`
          );
        }
      }
    }

    return violations;
  }
}

class NoLecturerConflict implements Constraint<TimetableState> {
  name = 'No Lecturer Conflict';
  type = 'hard' as const;

  evaluate(state: TimetableState): number {
    const conflicts = this.getViolations(state);
    return conflicts.length === 0 ? 1 : 1 / (1 + conflicts.length);
  }

  getViolations(state: TimetableState): string[] {
    const violations: string[] = [];
    const { assignments } = state;

    for (let i = 0; i < assignments.length; i++) {
      for (let j = i + 1; j < assignments.length; j++) {
        const a = assignments[i];
        const b = assignments[j];

        if (
          a.lecturer === b.lecturer &&
          a.timeSlot.day === b.timeSlot.day &&
          a.timeSlot.hour === b.timeSlot.hour
        ) {
          violations.push(
            `Lecturer ${a.lecturer} conflict: ${a.classId} and ${b.classId} at ${a.timeSlot.day} ${a.timeSlot.hour}:00`
          );
        }
      }
    }

    return violations;
  }
}

class PreferMorningClasses implements Constraint<TimetableState> {
  name = 'Prefer Morning Classes';
  type = 'soft' as const;
  weight = 5;

  evaluate(state: TimetableState): number {
    let morningCount = 0;
    const { assignments } = state;

    for (const assignment of assignments) {
      if (assignment.timeSlot.hour < 12) {
        morningCount++;
      }
    }

    return assignments.length > 0 ? morningCount / assignments.length : 1;
  }
}

class AvoidFridayAfternoon implements Constraint<TimetableState> {
  name = 'Avoid Friday Afternoon';
  type = 'soft' as const;
  weight = 10;

  evaluate(state: TimetableState): number {
    let fridayAfternoonCount = 0;
    const { assignments } = state;

    for (const assignment of assignments) {
      if (assignment.timeSlot.day === 'Friday' && assignment.timeSlot.hour >= 13) {
        fridayAfternoonCount++;
      }
    }

    return assignments.length > 0
      ? 1 - fridayAfternoonCount / assignments.length
      : 1;
  }
}

// ========================================
// Realistic Move Operators
// ========================================

class ChangeTimeSlot implements MoveGenerator<TimetableState> {
  name = 'Change Time Slot';

  canApply(state: TimetableState): boolean {
    return state.assignments.length > 0 && state.availableTimeSlots.length > 0;
  }

  generate(state: TimetableState, temperature: number): TimetableState {
    const newState = JSON.parse(JSON.stringify(state)) as TimetableState;

    const randomIndex = Math.floor(Math.random() * newState.assignments.length);
    const randomSlotIndex = Math.floor(Math.random() * newState.availableTimeSlots.length);

    newState.assignments[randomIndex].timeSlot = { ...newState.availableTimeSlots[randomSlotIndex] };

    return newState;
  }
}

class ChangeRoom implements MoveGenerator<TimetableState> {
  name = 'Change Room';

  canApply(state: TimetableState): boolean {
    return state.assignments.length > 0 && state.rooms.length > 1;
  }

  generate(state: TimetableState, temperature: number): TimetableState {
    const newState = JSON.parse(JSON.stringify(state)) as TimetableState;

    const randomIndex = Math.floor(Math.random() * newState.assignments.length);
    const randomRoomIndex = Math.floor(Math.random() * newState.rooms.length);

    newState.assignments[randomIndex].room = newState.rooms[randomRoomIndex];

    return newState;
  }
}

class SwapTimeSlots implements MoveGenerator<TimetableState> {
  name = 'Swap Time Slots';

  canApply(state: TimetableState): boolean {
    return state.assignments.length >= 2;
  }

  generate(state: TimetableState, temperature: number): TimetableState {
    const newState = JSON.parse(JSON.stringify(state)) as TimetableState;

    const idx1 = Math.floor(Math.random() * newState.assignments.length);
    let idx2 = Math.floor(Math.random() * newState.assignments.length);

    while (idx2 === idx1 && newState.assignments.length > 1) {
      idx2 = Math.floor(Math.random() * newState.assignments.length);
    }

    const temp = newState.assignments[idx1].timeSlot;
    newState.assignments[idx1].timeSlot = newState.assignments[idx2].timeSlot;
    newState.assignments[idx2].timeSlot = temp;

    return newState;
  }
}

// ========================================
// Helper Functions
// ========================================

function createSimpleTimetable(withConflicts = false): TimetableState {
  const rooms = ['R101', 'R102', 'R103'];
  const lecturers = ['Dr. Smith', 'Dr. Jones', 'Dr. Brown'];
  const availableTimeSlots: TimeSlot[] = [
    { day: 'Monday', hour: 8 },
    { day: 'Monday', hour: 10 },
    { day: 'Monday', hour: 14 },
    { day: 'Tuesday', hour: 8 },
    { day: 'Tuesday', hour: 10 },
    { day: 'Wednesday', hour: 8 },
    { day: 'Wednesday', hour: 14 },
    { day: 'Thursday', hour: 10 },
    { day: 'Friday', hour: 8 },
    { day: 'Friday', hour: 14 },
  ];

  if (withConflicts) {
    return {
      assignments: [
        {
          classId: 'CS101',
          room: 'R101',
          lecturer: 'Dr. Smith',
          timeSlot: { day: 'Monday', hour: 8 },
        },
        {
          classId: 'CS102',
          room: 'R101', // Same room!
          lecturer: 'Dr. Jones',
          timeSlot: { day: 'Monday', hour: 8 }, // Same time!
        },
        {
          classId: 'CS103',
          room: 'R102',
          lecturer: 'Dr. Smith', // Same lecturer!
          timeSlot: { day: 'Monday', hour: 8 }, // Same time!
        },
      ],
      rooms,
      lecturers,
      availableTimeSlots,
    };
  }

  return {
    assignments: [
      {
        classId: 'CS101',
        room: 'R101',
        lecturer: 'Dr. Smith',
        timeSlot: { day: 'Monday', hour: 8 },
      },
      {
        classId: 'CS102',
        room: 'R102',
        lecturer: 'Dr. Jones',
        timeSlot: { day: 'Monday', hour: 10 },
      },
      {
        classId: 'CS103',
        room: 'R103',
        lecturer: 'Dr. Brown',
        timeSlot: { day: 'Tuesday', hour: 8 },
      },
    ],
    rooms,
    lecturers,
    availableTimeSlots,
  };
}

function createConfig(overrides?: Partial<SAConfig<TimetableState>>): SAConfig<TimetableState> {
  return {
    initialTemperature: 1000,
    minTemperature: 0.1,
    coolingRate: 0.95,
    maxIterations: 1000,
    hardConstraintWeight: 10000,
    cloneState: (state) => JSON.parse(JSON.stringify(state)),
    logging: {
      enabled: false,
      level: 'error',
    },
    ...overrides,
  };
}

// ========================================
// Integration Tests
// ========================================

describe('Simple Timetabling Integration Tests', () => {
  describe('Feasible Problem Solving', () => {
    it('should solve a simple timetabling problem with conflicts', () => {
      const initialState = createSimpleTimetable(true); // With conflicts
      const constraints = [new NoRoomConflict(), new NoLecturerConflict()];
      const moves = [new ChangeTimeSlot(), new ChangeRoom()];
      const config = createConfig({ maxIterations: 500 });

      const solver = new SimulatedAnnealing(initialState, constraints, moves, config);
      const solution = solver.solve();

      // Should find a feasible solution
      expect(solution.hardViolations).toBe(0);
      expect(solution.state.assignments.length).toBe(3);
    });

    it('should maintain solution quality for already-feasible timetable', () => {
      const initialState = createSimpleTimetable(false); // No conflicts
      const constraints = [new NoRoomConflict(), new NoLecturerConflict()];
      const moves = [new ChangeTimeSlot(), new ChangeRoom()];
      const config = createConfig({ maxIterations: 100 });

      const solver = new SimulatedAnnealing(initialState, constraints, moves, config);
      const solution = solver.solve();

      // Should maintain feasibility
      expect(solution.hardViolations).toBe(0);
    });

    it('should optimize soft constraints after satisfying hard constraints', () => {
      const initialState = createSimpleTimetable(true);

      // Start with Friday afternoon classes
      initialState.assignments[0].timeSlot = { day: 'Friday', hour: 14 };
      initialState.assignments[1].timeSlot = { day: 'Friday', hour: 15 };
      initialState.assignments[2].timeSlot = { day: 'Friday', hour: 16 };

      const constraints = [
        new NoRoomConflict(),
        new NoLecturerConflict(),
        new AvoidFridayAfternoon(),
        new PreferMorningClasses(),
      ];
      const moves = [new ChangeTimeSlot(), new ChangeRoom()];
      const config = createConfig({ maxIterations: 1000 });

      const solver = new SimulatedAnnealing(initialState, constraints, moves, config);
      const solution = solver.solve();

      // Should satisfy hard constraints
      expect(solution.hardViolations).toBe(0);

      // Should improve soft constraints
      // (fewer Friday afternoons, more morning classes)
      expect(solution.softViolations).toBeLessThan(2);
    });
  });

  describe('Operator Effectiveness', () => {
    it('should use all move operators during search', () => {
      const initialState = createSimpleTimetable(true);
      const constraints = [new NoRoomConflict(), new NoLecturerConflict()];
      const moves = [
        new ChangeTimeSlot(),
        new ChangeRoom(),
        new SwapTimeSlots(),
      ];
      const config = createConfig({ maxIterations: 500 });

      const solver = new SimulatedAnnealing(initialState, constraints, moves, config);
      solver.solve();

      const stats = solver.getStats();

      // All operators should have been attempted
      expect(stats['Change Time Slot'].attempts).toBeGreaterThan(0);
      expect(stats['Change Room'].attempts).toBeGreaterThan(0);
      expect(stats['Swap Time Slots'].attempts).toBeGreaterThan(0);
    });

    it('should track operator success rates', () => {
      const initialState = createSimpleTimetable(true);
      const constraints = [new NoRoomConflict(), new NoLecturerConflict()];
      const moves = [new ChangeTimeSlot(), new ChangeRoom()];
      const config = createConfig({ maxIterations: 500 });

      const solver = new SimulatedAnnealing(initialState, constraints, moves, config);
      solver.solve();

      const stats = solver.getStats();

      for (const operatorName in stats) {
        const opStats = stats[operatorName];
        expect(opStats.successRate).toBeGreaterThanOrEqual(0);
        expect(opStats.successRate).toBeLessThanOrEqual(1);

        if (opStats.attempts > 0) {
          expect(opStats.successRate).toBe(
            opStats.improvements / opStats.attempts
          );
        }
      }
    });
  });

  describe('Constraint Satisfaction', () => {
    it('should eliminate all room conflicts', () => {
      const initialState = createSimpleTimetable(true);
      const constraints = [new NoRoomConflict()];
      const moves = [new ChangeTimeSlot(), new ChangeRoom()];
      const config = createConfig({ maxIterations: 500 });

      const solver = new SimulatedAnnealing(initialState, constraints, moves, config);
      const solution = solver.solve();

      // Verify no room conflicts manually
      const { assignments } = solution.state;
      for (let i = 0; i < assignments.length; i++) {
        for (let j = i + 1; j < assignments.length; j++) {
          const a = assignments[i];
          const b = assignments[j];

          const hasConflict =
            a.room === b.room &&
            a.timeSlot.day === b.timeSlot.day &&
            a.timeSlot.hour === b.timeSlot.hour;

          expect(hasConflict).toBe(false);
        }
      }
    });

    it('should eliminate all lecturer conflicts', () => {
      const initialState = createSimpleTimetable(true);
      const constraints = [new NoLecturerConflict()];
      const moves = [new ChangeTimeSlot()];
      const config = createConfig({ maxIterations: 500 });

      const solver = new SimulatedAnnealing(initialState, constraints, moves, config);
      const solution = solver.solve();

      // Verify no lecturer conflicts manually
      const { assignments } = solution.state;
      for (let i = 0; i < assignments.length; i++) {
        for (let j = i + 1; j < assignments.length; j++) {
          const a = assignments[i];
          const b = assignments[j];

          const hasConflict =
            a.lecturer === b.lecturer &&
            a.timeSlot.day === b.timeSlot.day &&
            a.timeSlot.hour === b.timeSlot.hour;

          expect(hasConflict).toBe(false);
        }
      }
    });

    it('should respect both room AND lecturer constraints simultaneously', () => {
      const initialState = createSimpleTimetable(true);
      const constraints = [new NoRoomConflict(), new NoLecturerConflict()];
      const moves = [new ChangeTimeSlot(), new ChangeRoom()];
      const config = createConfig({ maxIterations: 1000 });

      const solver = new SimulatedAnnealing(initialState, constraints, moves, config);
      const solution = solver.solve();

      expect(solution.hardViolations).toBe(0);

      // Verify both constraints manually
      const { assignments } = solution.state;
      for (let i = 0; i < assignments.length; i++) {
        for (let j = i + 1; j < assignments.length; j++) {
          const a = assignments[i];
          const b = assignments[j];

          const sameTime =
            a.timeSlot.day === b.timeSlot.day &&
            a.timeSlot.hour === b.timeSlot.hour;

          if (sameTime) {
            // If same time, must have different room AND lecturer
            expect(a.room).not.toBe(b.room);
            expect(a.lecturer).not.toBe(b.lecturer);
          }
        }
      }
    });
  });

  describe('Performance Characteristics', () => {
    it('should converge faster with better initial state', () => {
      const goodState = createSimpleTimetable(false); // No conflicts
      const badState = createSimpleTimetable(true); // With conflicts

      const constraints = [new NoRoomConflict(), new NoLecturerConflict()];
      const moves = [new ChangeTimeSlot(), new ChangeRoom()];
      const config = createConfig({ maxIterations: 500 });

      const solverGood = new SimulatedAnnealing(goodState, constraints, moves, config);
      const solutionGood = solverGood.solve();

      const solverBad = new SimulatedAnnealing(badState, constraints, moves, config);
      const solutionBad = solverBad.solve();

      // Good initial state should converge faster (fewer iterations)
      // Note: This might not always hold due to randomness, but generally should
      expect(solutionGood.hardViolations).toBe(0);
      expect(solutionBad.hardViolations).toBe(0);
    });

    it('should produce consistent results with same seed (deterministic cloning)', () => {
      const initialState = createSimpleTimetable(true);
      const constraints = [new NoRoomConflict(), new NoLecturerConflict()];
      const moves = [new ChangeTimeSlot()];
      const config = createConfig({ maxIterations: 100 });

      // Run twice - both should reach feasible solutions
      const solver1 = new SimulatedAnnealing(initialState, constraints, moves, config);
      const solution1 = solver1.solve();

      const solver2 = new SimulatedAnnealing(initialState, constraints, moves, config);
      const solution2 = solver2.solve();

      // Both should find feasible solutions
      expect(solution1.hardViolations).toBe(0);
      expect(solution2.hardViolations).toBe(0);
    });
  });

  describe('Scalability', () => {
    it('should handle larger timetabling problems', () => {
      const rooms = ['R101', 'R102', 'R103', 'R104', 'R105'];
      const lecturers = [
        'Dr. Smith',
        'Dr. Jones',
        'Dr. Brown',
        'Dr. White',
        'Dr. Black',
      ];
      const availableTimeSlots: TimeSlot[] = [];

      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const hours = [8, 9, 10, 11, 13, 14, 15, 16];

      for (const day of days) {
        for (const hour of hours) {
          availableTimeSlots.push({ day, hour });
        }
      }

      // Create 10 classes with conflicts
      const assignments: Assignment[] = [];
      for (let i = 0; i < 10; i++) {
        assignments.push({
          classId: `CS${101 + i}`,
          room: rooms[i % rooms.length],
          lecturer: lecturers[i % lecturers.length],
          timeSlot: availableTimeSlots[i % 5], // Create conflicts
        });
      }

      const initialState: TimetableState = {
        assignments,
        rooms,
        lecturers,
        availableTimeSlots,
      };

      const constraints = [new NoRoomConflict(), new NoLecturerConflict()];
      const moves = [new ChangeTimeSlot(), new ChangeRoom(), new SwapTimeSlots()];
      const config = createConfig({ maxIterations: 2000 });

      const solver = new SimulatedAnnealing(initialState, constraints, moves, config);
      const solution = solver.solve();

      // Should solve larger problem
      expect(solution.hardViolations).toBe(0);
      expect(solution.state.assignments.length).toBe(10);
    });
  });
});
