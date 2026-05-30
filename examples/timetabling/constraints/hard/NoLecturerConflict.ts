/**
 * HC1: No lecturer can teach two classes at the same time
 * Optimized from O(N²) to O(N log N) using group-sort-shortcircuit pattern
 */

import type { Constraint } from 'timetable-sa';
import type { TimetableState, ScheduleEntry } from '../../types/index.js';
import {
  timeToMinutes,
  groupScheduleByKey,
  sortEntriesByStartTime,
  getEndTimeInMinutes,
  startsAfterEnd,
} from '../../utils/index.js';

export class NoLecturerConflict implements Constraint<TimetableState> {
  name = 'No Lecturer Conflict';
  key = 'no_lecturer_conflict';
  type = 'hard' as const;

  evaluate(state: TimetableState): number {
    const { schedule } = state;
    let violationCount = 0;

    // Step 1: Group by day - O(N)
    const groupedByDay = groupScheduleByKey(schedule, (entry) => entry.timeSlot.day);

    // Step 2: Process each day
    for (const entries of groupedByDay.values()) {
      if (entries.length < 2) continue;

      // Sort by start time - O(K log K)
      sortEntriesByStartTime(entries);

      // Build lecturer -> entries index for this day - O(K * L) where L = avg lecturers per class
      const lecturerIndex = new Map<string, ScheduleEntry[]>();
      for (const entry of entries) {
        for (const lecturer of entry.lecturers) {
          if (!lecturerIndex.has(lecturer)) {
            lecturerIndex.set(lecturer, []);
          }
          lecturerIndex.get(lecturer)!.push(entry);
        }
      }

      // Check conflicts per lecturer - already sorted by start time
      for (const lecturerEntries of lecturerIndex.values()) {
        if (lecturerEntries.length < 2) continue;

        for (let i = 0; i < lecturerEntries.length; i++) {
          const entry1 = lecturerEntries[i];
          const end1 = getEndTimeInMinutes(entry1);

          for (let j = i + 1; j < lecturerEntries.length; j++) {
            const entry2 = lecturerEntries[j];
            const start2 = timeToMinutes(entry2.timeSlot.startTime);

            // Short-circuit: if entry2 starts after entry1 ends, no more overlaps
            if (startsAfterEnd(end1, start2)) {
              break;
            }

            // Time overlap detected for this lecturer
            violationCount++;
          }
        }
      }
    }

    if (violationCount === 0) return 1;
    return 1 / (1 + violationCount);
  }

  describe(state: TimetableState): string | undefined {
    const { schedule } = state;

    const groupedByDay = groupScheduleByKey(schedule, (entry) => entry.timeSlot.day);

    for (const entries of groupedByDay.values()) {
      if (entries.length < 2) continue;

      sortEntriesByStartTime(entries);

      const lecturerIndex = new Map<string, ScheduleEntry[]>();
      for (const entry of entries) {
        for (const lecturer of entry.lecturers) {
          if (!lecturerIndex.has(lecturer)) {
            lecturerIndex.set(lecturer, []);
          }
          lecturerIndex.get(lecturer)!.push(entry);
        }
      }

      for (const [lecturerCode, lecturerEntries] of lecturerIndex) {
        if (lecturerEntries.length < 2) continue;

        for (let i = 0; i < lecturerEntries.length; i++) {
          const entry1 = lecturerEntries[i];
          const end1 = getEndTimeInMinutes(entry1);

          for (let j = i + 1; j < lecturerEntries.length; j++) {
            const entry2 = lecturerEntries[j];
            const start2 = timeToMinutes(entry2.timeSlot.startTime);

            if (startsAfterEnd(end1, start2)) {
              break;
            }

            return `Lecturer ${lecturerCode} has conflict between ${entry1.classId} and ${entry2.classId} on ${entry1.timeSlot.day}`;
          }
        }
      }
    }

    return undefined;
  }

  getViolations(state: TimetableState): string[] {
    const { schedule } = state;
    const violations: string[] = [];

    const groupedByDay = groupScheduleByKey(schedule, (entry) => entry.timeSlot.day);

    for (const entries of groupedByDay.values()) {
      if (entries.length < 2) continue;

      sortEntriesByStartTime(entries);

      const lecturerIndex = new Map<string, ScheduleEntry[]>();
      for (const entry of entries) {
        for (const lecturer of entry.lecturers) {
          if (!lecturerIndex.has(lecturer)) {
            lecturerIndex.set(lecturer, []);
          }
          lecturerIndex.get(lecturer)!.push(entry);
        }
      }

      for (const [lecturerCode, lecturerEntries] of lecturerIndex) {
        if (lecturerEntries.length < 2) continue;

        for (let i = 0; i < lecturerEntries.length; i++) {
          const entry1 = lecturerEntries[i];
          const end1 = getEndTimeInMinutes(entry1);

          for (let j = i + 1; j < lecturerEntries.length; j++) {
            const entry2 = lecturerEntries[j];
            const start2 = timeToMinutes(entry2.timeSlot.startTime);

            if (startsAfterEnd(end1, start2)) {
              break;
            }

            violations.push(
              `Lecturer ${lecturerCode} has conflict between ${entry1.classId} (${entry1.timeSlot.day} ${entry1.timeSlot.startTime}) and ${entry2.classId} (${entry2.timeSlot.day} ${entry2.timeSlot.startTime})`
            );
          }
        }
      }
    }

    return violations;
  }
}
