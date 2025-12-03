/**
 * SC3: Ensure sufficient transit time between classes for lecturers
 */

import type { Constraint } from 'timetable-sa';
import type { TimetableState } from '../../types/index.js';
import { timeToMinutes, calculateEndTime } from '../../utils/index.js';

export class TransitTime implements Constraint<TimetableState> {
  name = 'Transit Time';
  type = 'soft' as const;
  weight: number;

  constructor(weight: number = 15) {
    this.weight = weight;
  }

  evaluate(state: TimetableState): number {
    const { schedule, lecturers } = state;
    const lecturerMap = new Map(lecturers.map(l => [l.Code, l]));

    let minScore = 1;
    let violations = 0;

    // Group schedule by day
    const scheduleByDay = new Map<string, typeof schedule>();
    for (const entry of schedule) {
      const day = entry.timeSlot.day;
      if (!scheduleByDay.has(day)) {
        scheduleByDay.set(day, []);
      }
      scheduleByDay.get(day)!.push(entry);
    }

    // Sort each day's schedule by start time
    for (const [day, daySchedule] of scheduleByDay) {
      daySchedule.sort((a, b) => {
        return timeToMinutes(a.timeSlot.startTime) - timeToMinutes(b.timeSlot.startTime);
      });

      // Check transit time for each lecturer
      for (const lecturer of lecturers) {
        if (!lecturer.Transit_Time) continue;

        const lecturerClasses = daySchedule.filter(entry =>
          entry.lecturers.includes(lecturer.Code)
        );

        for (let i = 0; i < lecturerClasses.length - 1; i++) {
          const current = lecturerClasses[i];
          const next = lecturerClasses[i + 1];

          const currentEnd = calculateEndTime(
            current.timeSlot.startTime,
            current.sks,
            current.timeSlot.day
          );
          const currentEndMins = timeToMinutes(currentEnd.endTime);
          const nextStartMins = timeToMinutes(next.timeSlot.startTime);

          const gapMinutes = nextStartMins - currentEndMins;

          if (gapMinutes < lecturer.Transit_Time) {
            violations++;
            const score = Math.max(0, gapMinutes / lecturer.Transit_Time);
            minScore = Math.min(minScore, score);
          }
        }
      }
    }

    return minScore;
  }
}
