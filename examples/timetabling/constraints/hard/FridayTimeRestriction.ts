/**
 * HC10: Friday time restrictions
 * Classes cannot start at 11:00, 12:00, or 13:00 on Friday
 */

import type { Constraint } from 'timetable-sa';
import type { TimetableState } from '../../types/index.js';
import { isValidFridayStartTime } from '../../utils/index.js';

export class FridayTimeRestriction implements Constraint<TimetableState> {
  name = 'Friday Time Restriction';
  type = 'hard' as const;

  evaluate(state: TimetableState): number {
    const { schedule } = state;
    let violationCount = 0;

    for (const entry of schedule) {
      if (entry.timeSlot.day === 'Friday') {
        if (!isValidFridayStartTime(entry.timeSlot.startTime)) {
          violationCount++;
        }
      }
    }

    if (violationCount === 0) return 1;
    return 1 / (1 + violationCount);
  }

  describe(state: TimetableState): string | undefined {
    const { schedule } = state;

    for (const entry of schedule) {
      if (entry.timeSlot.day === 'Friday') {
        if (!isValidFridayStartTime(entry.timeSlot.startTime)) {
          return `Class ${entry.classId} cannot start at ${entry.timeSlot.startTime} on Friday (prohibited: 11:00, 12:00, 13:00)`;
        }
      }
    }

    return undefined;
  }

  getViolations(state: TimetableState): string[] {
    const { schedule } = state;
    const violations: string[] = [];

    for (const entry of schedule) {
      if (entry.timeSlot.day === 'Friday') {
        if (!isValidFridayStartTime(entry.timeSlot.startTime)) {
          violations.push(
            `Class ${entry.classId} (${entry.className}) cannot start at ${entry.timeSlot.startTime} on Friday (prohibited: 11:00, 12:00, 13:00)`
          );
        }
      }
    }

    return violations;
  }
}
