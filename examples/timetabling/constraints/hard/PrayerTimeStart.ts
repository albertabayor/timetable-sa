/**
 * HC11: Classes cannot start during prayer time
 */

import type { Constraint } from 'timetable-sa';
import type { TimetableState } from '../../types/index.js';
import { isStartingDuringPrayerTime } from '../../utils/index.js';

export class PrayerTimeStart implements Constraint<TimetableState> {
  name = 'No Prayer Time Start';
  type = 'hard' as const;

  evaluate(state: TimetableState): number {
    const { schedule } = state;
    let violationCount = 0;

    for (const entry of schedule) {
      if (isStartingDuringPrayerTime(entry.timeSlot.startTime)) {
        violationCount++;
      }
    }

    if (violationCount === 0) return 1;
    return 1 / (1 + violationCount);
  }

  describe(state: TimetableState): string | undefined {
    const { schedule } = state;

    for (const entry of schedule) {
      if (isStartingDuringPrayerTime(entry.timeSlot.startTime)) {
        return `Class ${entry.classId} cannot start during prayer time at ${entry.timeSlot.startTime}`;
      }
    }

    return undefined;
  }

  getViolations(state: TimetableState): string[] {
    const { schedule } = state;
    const violations: string[] = [];

    for (const entry of schedule) {
      if (isStartingDuringPrayerTime(entry.timeSlot.startTime)) {
        violations.push(
          `Class ${entry.classId} (${entry.className}) cannot start during prayer time at ${entry.timeSlot.startTime}`
        );
      }
    }

    return violations;
  }
}
