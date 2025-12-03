/**
 * SC4: Prefer compact schedules with minimal gaps
 * Penalizes large gaps between classes on the same day
 */

import type { Constraint } from 'timetable-sa';
import type { TimetableState } from '../../types/index.js';
import { timeToMinutes, calculateEndTime } from '../../utils/index.js';

export class Compactness implements Constraint<TimetableState> {
  name = 'Compactness';
  type = 'soft' as const;
  weight: number;

  constructor(weight: number = 8) {
    this.weight = weight;
  }

  evaluate(state: TimetableState): number {
    const { schedule } = state;

    // Group by prodi and day
    const scheduleByProdiDay = new Map<string, typeof schedule>();

    for (const entry of schedule) {
      const key = `${entry.prodi}-${entry.timeSlot.day}`;
      if (!scheduleByProdiDay.has(key)) {
        scheduleByProdiDay.set(key, []);
      }
      scheduleByProdiDay.get(key)!.push(entry);
    }

    let totalScore = 0;
    let count = 0;

    for (const [key, daySchedule] of scheduleByProdiDay) {
      if (daySchedule.length < 2) continue;

      // Sort by start time
      daySchedule.sort((a, b) =>
        timeToMinutes(a.timeSlot.startTime) - timeToMinutes(b.timeSlot.startTime)
      );

      // Calculate gaps between consecutive classes
      for (let i = 0; i < daySchedule.length - 1; i++) {
        const current = daySchedule[i];
        const next = daySchedule[i + 1];

        const currentEnd = calculateEndTime(
          current.timeSlot.startTime,
          current.sks,
          current.timeSlot.day
        );
        const currentEndMins = timeToMinutes(currentEnd.endTime);
        const nextStartMins = timeToMinutes(next.timeSlot.startTime);

        const gap = nextStartMins - currentEndMins;
        count++;

        // Prefer gaps <= 60 minutes
        // Penalize gaps > 60 minutes with decreasing score
        if (gap <= 60) {
          totalScore += 1;
        } else {
          // Score decreases as gap increases
          // Gap of 240+ minutes (4 hours) gets score of 0
          totalScore += Math.max(0, 1 - (gap - 60) / 180);
        }
      }
    }

    return count > 0 ? totalScore / count : 1;
  }
}
