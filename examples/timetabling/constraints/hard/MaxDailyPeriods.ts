/**
 * HC7: Lecturer cannot exceed maximum daily teaching periods
 */

import type { Constraint } from 'timetable-sa';
import type { TimetableState, ScheduleEntry } from '../../types/index.js';

export class MaxDailyPeriods implements Constraint<TimetableState> {
  name = 'Max Daily Periods';
  type = 'hard' as const;

  evaluate(state: TimetableState): number {
    const { schedule, lecturers } = state;
    let violationCount = 0;

    // Build lecturer map
    const lecturerMap = new Map(lecturers.map(l => [l.Code, l]));

    // Track periods per lecturer per day
    const lecturerDayPeriods = new Map<string, Map<string, number>>();

    for (const entry of schedule) {
      for (const lecturerCode of entry.lecturers) {
        const lecturer = lecturerMap.get(lecturerCode);
        if (!lecturer || !lecturer.Max_Daily_Periods) continue;

        const key = lecturerCode;
        if (!lecturerDayPeriods.has(key)) {
          lecturerDayPeriods.set(key, new Map());
        }

        const dayMap = lecturerDayPeriods.get(key)!;
        const currentPeriods = dayMap.get(entry.timeSlot.day) || 0;
        const newPeriods = currentPeriods + entry.sks;
        dayMap.set(entry.timeSlot.day, newPeriods);

        if (newPeriods > lecturer.Max_Daily_Periods) {
          violationCount++;
        }
      }
    }

    if (violationCount === 0) return 1;
    return 1 / (1 + violationCount);
  }

  describe(state: TimetableState): string | undefined {
    const { schedule, lecturers } = state;
    const lecturerMap = new Map(lecturers.map(l => [l.Code, l]));
    const lecturerDayPeriods = new Map<string, Map<string, number>>();

    for (const entry of schedule) {
      for (const lecturerCode of entry.lecturers) {
        const lecturer = lecturerMap.get(lecturerCode);
        if (!lecturer || !lecturer.Max_Daily_Periods) continue;

        const key = lecturerCode;
        if (!lecturerDayPeriods.has(key)) {
          lecturerDayPeriods.set(key, new Map());
        }

        const dayMap = lecturerDayPeriods.get(key)!;
        const currentPeriods = dayMap.get(entry.timeSlot.day) || 0;
        const newPeriods = currentPeriods + entry.sks;
        dayMap.set(entry.timeSlot.day, newPeriods);

        if (newPeriods > lecturer.Max_Daily_Periods) {
          return `Lecturer ${lecturerCode} exceeds max daily periods (${lecturer.Max_Daily_Periods}) on ${entry.timeSlot.day} with ${newPeriods} periods`;
        }
      }
    }

    return undefined;
  }

  getViolations(state: TimetableState): string[] {
    const { schedule, lecturers } = state;
    const violations: string[] = [];
    const lecturerMap = new Map(lecturers.map(l => [l.Code, l]));
    const lecturerDayPeriods = new Map<string, Map<string, number>>();

    for (const entry of schedule) {
      for (const lecturerCode of entry.lecturers) {
        const lecturer = lecturerMap.get(lecturerCode);
        if (!lecturer || !lecturer.Max_Daily_Periods) continue;

        const key = lecturerCode;
        if (!lecturerDayPeriods.has(key)) {
          lecturerDayPeriods.set(key, new Map());
        }

        const dayMap = lecturerDayPeriods.get(key)!;
        const currentPeriods = dayMap.get(entry.timeSlot.day) || 0;
        const newPeriods = currentPeriods + entry.sks;
        dayMap.set(entry.timeSlot.day, newPeriods);

        if (newPeriods > lecturer.Max_Daily_Periods) {
          violations.push(
            `Lecturer ${lecturerCode} exceeds max daily periods (${lecturer.Max_Daily_Periods}) on ${entry.timeSlot.day} with ${newPeriods} periods`
          );
        }
      }
    }

    return violations;
  }
}
