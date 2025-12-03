/**
 * HC2: No two classes can use the same room at the same time
 */

import type { Constraint } from 'timetable-sa';
import type { TimetableState, ScheduleEntry } from '../../types/index.js';
import { timeToMinutes, calculateEndTime } from '../../utils/index.js';

export class NoRoomConflict implements Constraint<TimetableState> {
  name = 'No Room Conflict';
  type = 'hard' as const;

  evaluate(state: TimetableState): number {
    const { schedule } = state;
    let violationCount = 0;

    for (let i = 0; i < schedule.length; i++) {
      for (let j = i + 1; j < schedule.length; j++) {
        const entry1 = schedule[i];
        const entry2 = schedule[j];

        if (this.hasRoomConflict(entry1, entry2)) {
          violationCount++;
        }
      }
    }

    // Return score between 0 and 1
    if (violationCount === 0) return 1;
    return 1 / (1 + violationCount);
  }

  describe(state: TimetableState): string | undefined {
    const { schedule } = state;

    for (let i = 0; i < schedule.length; i++) {
      for (let j = i + 1; j < schedule.length; j++) {
        const entry1 = schedule[i];
        const entry2 = schedule[j];

        if (this.hasRoomConflict(entry1, entry2)) {
          return `Room ${entry1.room} is occupied by both ${entry1.classId} and ${entry2.classId} on ${entry1.timeSlot.day} at ${entry1.timeSlot.startTime}`;
        }
      }
    }

    return undefined;
  }

  getViolations(state: TimetableState): string[] {
    const { schedule } = state;
    const violations: string[] = [];

    for (let i = 0; i < schedule.length; i++) {
      for (let j = i + 1; j < schedule.length; j++) {
        const entry1 = schedule[i];
        const entry2 = schedule[j];

        if (this.hasRoomConflict(entry1, entry2)) {
          violations.push(
            `Room ${entry1.room} is occupied by both ${entry1.classId} (${entry1.timeSlot.startTime}) and ${entry2.classId} (${entry2.timeSlot.startTime}) on ${entry1.timeSlot.day}`
          );
        }
      }
    }

    return violations;
  }

  private hasRoomConflict(entry1: ScheduleEntry, entry2: ScheduleEntry): boolean {
    // Must be same room
    if (entry1.room !== entry2.room) {
      return false;
    }

    // Must be same day
    if (entry1.timeSlot.day !== entry2.timeSlot.day) {
      return false;
    }

    // Check time overlap
    return this.isTimeOverlap(entry1, entry2);
  }

  private isTimeOverlap(entry1: ScheduleEntry, entry2: ScheduleEntry): boolean {
    const calc1 = calculateEndTime(entry1.timeSlot.startTime, entry1.sks, entry1.timeSlot.day);
    const calc2 = calculateEndTime(entry2.timeSlot.startTime, entry2.sks, entry2.timeSlot.day);

    const start1 = timeToMinutes(entry1.timeSlot.startTime);
    const end1 = timeToMinutes(calc1.endTime);
    const start2 = timeToMinutes(entry2.timeSlot.startTime);
    const end2 = timeToMinutes(calc2.endTime);

    return start1 < end2 && start2 < end1;
  }
}
