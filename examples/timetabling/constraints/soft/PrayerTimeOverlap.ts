/**
 * SC5: Minimize prayer time overlaps
 * Penalizes classes that overlap with prayer times
 */

import type { Constraint } from '../../../../src/index.js';
import type { TimetableState } from '../../types/index.js';
import { getPrayerTimeOverlap, timeToMinutes, calculateEndTime } from '../../utils/index.js';

export class PrayerTimeOverlap implements Constraint<TimetableState> {
  name = 'Prayer Time Overlap';
  type = 'soft' as const;
  weight: number;

  constructor(weight: number = 12) {
    this.weight = weight;
  }

  evaluate(state: TimetableState): number {
    const { schedule } = state;
    let totalScore = 0;
    let count = 0;

    for (const entry of schedule) {
      count++;

      const prayerTime = getPrayerTimeOverlap(
        entry.timeSlot.startTime,
        entry.sks,
        entry.timeSlot.day
      );

      if (prayerTime === 0) {
        totalScore += 1;
      } else {
        // Score decreases based on overlap duration
        let score = Math.max(0.5, 1 - prayerTime / 100);

        // Extra penalty for Friday prayer (12:00-13:00)
        if (entry.timeSlot.day === 'Friday') {
          const startMinutes = timeToMinutes(entry.timeSlot.startTime);
          const endTime = calculateEndTime(
            entry.timeSlot.startTime,
            entry.sks,
            entry.timeSlot.day
          ).endTime;
          const endMinutes = timeToMinutes(endTime);

          const fridayPrayerStart = 12 * 60;
          const fridayPrayerEnd = 13 * 60;

          if (startMinutes < fridayPrayerEnd && endMinutes > fridayPrayerStart) {
            score = 0.1; // Heavy penalty for Friday prayer overlap
          }
        }

        totalScore += score;
      }
    }

    return count > 0 ? totalScore / count : 1;
  }

  describe(): string {
    return 'Classes overlapping with prayer times (especially Friday 12:00-13:00)';
  }

  getViolations(state: TimetableState): string[] {
    const { schedule } = state;
    const violations: string[] = [];

    for (const entry of schedule) {
      const prayerTime = getPrayerTimeOverlap(
        entry.timeSlot.startTime,
        entry.sks,
        entry.timeSlot.day
      );

      if (prayerTime > 0) {
        const endTime = calculateEndTime(
          entry.timeSlot.startTime,
          entry.sks,
          entry.timeSlot.day
        );

        // Extra penalty for Friday prayer (12:00-13:00)
        if (entry.timeSlot.day === 'Friday') {
          const startMinutes = timeToMinutes(entry.timeSlot.startTime);
          const endMinutes = timeToMinutes(endTime.endTime);
          const fridayPrayerStart = 12 * 60;
          const fridayPrayerEnd = 13 * 60;

          if (startMinutes < fridayPrayerEnd && endMinutes > fridayPrayerStart) {
            violations.push(
              `Class ${entry.classId} (${entry.timeSlot.startTime}-${endTime.endTime}) overlaps with Friday prayer time (12:00-13:00)`
            );
            continue;
          }
        }

        violations.push(
          `Class ${entry.classId} (${entry.timeSlot.startTime}-${endTime.endTime} on ${entry.timeSlot.day}) overlaps with prayer time (${prayerTime} minutes overlap)`
        );
      }
    }

    return violations;
  }
}
