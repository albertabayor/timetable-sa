/**
 * SC1: Prefer lecturer's preferred time slots
 */

import type { Constraint } from 'timetable-sa';
import type { TimetableState } from '../../types/index.js';

export class PreferredTime implements Constraint<TimetableState> {
  name = 'Preferred Time';
  type = 'soft' as const;
  weight: number;

  constructor(weight: number = 10) {
    this.weight = weight;
  }

  evaluate(state: TimetableState): number {
    const { schedule, lecturers } = state;
    const lecturerMap = new Map(lecturers.map(l => [l.Code, l]));

    let totalScore = 0;
    let count = 0;

    for (const entry of schedule) {
      for (const lecturerCode of entry.lecturers) {
        const lecturer = lecturerMap.get(lecturerCode);
        if (!lecturer || !lecturer.Prefered_Time) continue;

        count++;

        if (this.matchesPreferredTime(entry, lecturer.Prefered_Time)) {
          totalScore += 1;
        }
      }
    }

    return count > 0 ? totalScore / count : 1;
  }

  private matchesPreferredTime(entry: any, preferredTime: string): boolean {
    const entryDay = entry.timeSlot.day.toLowerCase();
    const entryTimeStr = entry.timeSlot.startTime;
    const [entryHour, entryMinute] = entryTimeStr.split(':').map(Number);
    const entryTimeInMinutes = entryHour! * 60 + entryMinute!;

    const dailySchedules = preferredTime.toLowerCase().split(', ');

    for (const schedule of dailySchedules) {
      const parts = schedule.trim().split(' ');
      if (parts.length < 4) continue;

      const day = parts[parts.length - 1];
      if (day !== entryDay) continue;

      const timeRange = parts.slice(0, 3).join(' ');
      const [startTime, , endTime] = timeRange.split(' ');

      if (!startTime || !endTime) continue;

      const [startHour, startMinute] = startTime.split('.').map(Number);
      const [endHour, endMinute] = endTime.split('.').map(Number);

      const startTimeInMinutes = startHour! * 60 + startMinute!;
      const endTimeInMinutes = endHour! * 60 + endMinute!;

      if (entryTimeInMinutes >= startTimeInMinutes && entryTimeInMinutes < endTimeInMinutes) {
        return true;
      }
    }

    return false;
  }
}
