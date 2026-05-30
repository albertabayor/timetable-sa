/**
 * HC2: No two classes can use the same room at the same time
 * Optimized from O(N²) to O(N log N) using group-sort-shortcircuit pattern
 */

import type { Constraint } from 'timetable-sa';
import type { TimetableState, ScheduleEntry } from '../../types/index.js';
import {
  timeToMinutes,
  groupScheduleByKey,
  sortEntriesByStartTime,
  getEndTimeInMinutes,
  hasTimeOverlap,
  startsAfterEnd,
} from '../../utils/index.js';

export class NoRoomConflict implements Constraint<TimetableState> {
  name = 'No Room Conflict';
  key = 'no_room_conflict';
  type = 'hard' as const;

  evaluate(state: TimetableState): number {
    const { schedule } = state;
    let violationCount = 0;

    // Step 1: Group by room + day - O(N)
    const grouped = groupScheduleByKey(schedule, (entry) =>
      `${entry.room}_${entry.timeSlot.day}`
    );

    // Step 2: Check conflicts within each group
    for (const entries of grouped.values()) {
      if (entries.length < 2) continue;

      // Sort by start time - O(K log K)
      sortEntriesByStartTime(entries);

      // Check for overlaps with short-circuit - O(K)
      for (let i = 0; i < entries.length; i++) {
        const entry1 = entries[i];
        const end1 = getEndTimeInMinutes(entry1);

        for (let j = i + 1; j < entries.length; j++) {
          const entry2 = entries[j];
          const start2 = timeToMinutes(entry2.timeSlot.startTime);

          // Short-circuit: if entry2 starts after entry1 ends, no more overlaps possible
          if (startsAfterEnd(end1, start2)) {
            break;
          }

          // Time overlap detected (same room + same day + overlapping time)
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

    // Group by room + day
    const grouped = groupScheduleByKey(schedule, (entry) =>
      `${entry.room}_${entry.timeSlot.day}`
    );

    for (const entries of grouped.values()) {
      if (entries.length < 2) continue;

      sortEntriesByStartTime(entries);

      for (let i = 0; i < entries.length; i++) {
        const entry1 = entries[i];
        const end1 = getEndTimeInMinutes(entry1);

        for (let j = i + 1; j < entries.length; j++) {
          const entry2 = entries[j];
          const start2 = timeToMinutes(entry2.timeSlot.startTime);

          if (startsAfterEnd(end1, start2)) {
            break;
          }

          return `Room ${entry1.room} is occupied by both ${entry1.classId} and ${entry2.classId} on ${entry1.timeSlot.day} at ${entry1.timeSlot.startTime}`;
        }
      }
    }

    return undefined;
  }

  getViolations(state: TimetableState): string[] {
    const { schedule } = state;
    const violations: string[] = [];

    // Group by room + day
    const grouped = groupScheduleByKey(schedule, (entry) =>
      `${entry.room}_${entry.timeSlot.day}`
    );

    for (const entries of grouped.values()) {
      if (entries.length < 2) continue;

      sortEntriesByStartTime(entries);

      for (let i = 0; i < entries.length; i++) {
        const entry1 = entries[i];
        const end1 = getEndTimeInMinutes(entry1);

        for (let j = i + 1; j < entries.length; j++) {
          const entry2 = entries[j];
          const start2 = timeToMinutes(entry2.timeSlot.startTime);

          if (startsAfterEnd(end1, start2)) {
            break;
          }

          violations.push(
            `Room ${entry1.room} is occupied by both ${entry1.classId} (${entry1.timeSlot.startTime}) and ${entry2.classId} (${entry2.timeSlot.startTime}) on ${entry1.timeSlot.day}`
          );
        }
      }
    }

    return violations;
  }
}
