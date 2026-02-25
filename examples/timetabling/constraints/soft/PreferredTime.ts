/**
 * SC1: Prefer lecturer's preferred time slots
 * 
 * OPTIMIZED: Caches parsed preferred time ranges to avoid repeated string parsing.
 * This reduces the ~1.1ms per call to much faster evaluation.
 */

import type { Constraint } from '../../../../src/index.js';
import type { TimetableState, Lecturer } from '../../types/index.js';

// Cached parsed preferred time ranges
interface TimeRange {
  day: string;
  startMinutes: number;
  endMinutes: number;
}

// Global cache for parsed preferred times (key: preferredTime string)
const preferredTimeCache = new Map<string, TimeRange[]>();

/**
 * Parse a preferred time string into time ranges (cached)
 * Input format: "08.00 - 12.00 monday, 13.00 - 17.00 tuesday"
 */
function parsePreferredTime(preferredTime: string): TimeRange[] {
  // Check cache first
  const cached = preferredTimeCache.get(preferredTime);
  if (cached) return cached;

  const ranges: TimeRange[] = [];
  const dailySchedules = preferredTime.toLowerCase().split(', ');

  for (const schedule of dailySchedules) {
    const parts = schedule.trim().split(' ');
    if (parts.length < 4) continue;

    const day = parts[parts.length - 1]!;
    const timeRange = parts.slice(0, 3).join(' ');
    const [startTime, , endTime] = timeRange.split(' ');

    if (!startTime || !endTime) continue;

    const [startHour, startMinute] = startTime.split('.').map(Number);
    const [endHour, endMinute] = endTime.split('.').map(Number);

    if (startHour === undefined || startMinute === undefined ||
        endHour === undefined || endMinute === undefined) continue;

    ranges.push({
      day,
      startMinutes: startHour * 60 + startMinute,
      endMinutes: endHour * 60 + endMinute,
    });
  }

  // Cache the result
  preferredTimeCache.set(preferredTime, ranges);
  return ranges;
}

export class PreferredTime implements Constraint<TimetableState> {
  name = 'Preferred Time';
  type = 'soft' as const;
  weight: number;

  // Cache lecturer map per evaluation (invalidated when lecturers change)
  private cachedLecturerMap: Map<string, Lecturer> | null = null;
  private cachedLecturersLength: number = 0;

  constructor(weight: number = 10) {
    this.weight = weight;
  }

  evaluate(state: TimetableState): number {
    const { schedule, lecturers } = state;
    
    // Reuse lecturer map if lecturers haven't changed
    if (!this.cachedLecturerMap || this.cachedLecturersLength !== lecturers.length) {
      this.cachedLecturerMap = new Map(lecturers.map(l => [l.Code, l]));
      this.cachedLecturersLength = lecturers.length;
    }
    const lecturerMap = this.cachedLecturerMap;

    let totalScore = 0;
    let count = 0;

    for (const entry of schedule) {
      const entryDay = entry.timeSlot.day.toLowerCase();
      const [entryHour, entryMinute] = entry.timeSlot.startTime.split(':').map(Number);
      const entryTimeInMinutes = entryHour! * 60 + entryMinute!;

      for (const lecturerCode of entry.lecturers) {
        const lecturer = lecturerMap.get(lecturerCode);
        if (!lecturer || !lecturer.Prefered_Time) continue;

        count++;

        // Use cached parsed time ranges
        const ranges = parsePreferredTime(lecturer.Prefered_Time);
        
        // Check if entry matches any preferred range
        let matches = false;
        for (const range of ranges) {
          if (range.day === entryDay && 
              entryTimeInMinutes >= range.startMinutes && 
              entryTimeInMinutes < range.endMinutes) {
            matches = true;
            break;
          }
        }

        if (matches) {
          totalScore += 1;
        }
      }
    }

    return count > 0 ? totalScore / count : 1;
  }

  describe(): string {
    return 'Classes not scheduled in lecturer\'s preferred time slots';
  }

  getViolations(state: TimetableState): string[] {
    const { schedule, lecturers } = state;
    const violations: string[] = [];

    // Reuse lecturer map if lecturers haven't changed
    if (!this.cachedLecturerMap || this.cachedLecturersLength !== lecturers.length) {
      this.cachedLecturerMap = new Map(lecturers.map(l => [l.Code, l]));
      this.cachedLecturersLength = lecturers.length;
    }
    const lecturerMap = this.cachedLecturerMap;

    for (const entry of schedule) {
      const entryDay = entry.timeSlot.day.toLowerCase();
      const [entryHour, entryMinute] = entry.timeSlot.startTime.split(':').map(Number);
      const entryTimeInMinutes = entryHour! * 60 + entryMinute!;

      for (const lecturerCode of entry.lecturers) {
        const lecturer = lecturerMap.get(lecturerCode);
        if (!lecturer || !lecturer.Prefered_Time) continue;

        // Use cached parsed time ranges
        const ranges = parsePreferredTime(lecturer.Prefered_Time);

        // Check if entry matches any preferred range
        let matches = false;
        for (const range of ranges) {
          if (range.day === entryDay &&
              entryTimeInMinutes >= range.startMinutes &&
              entryTimeInMinutes < range.endMinutes) {
            matches = true;
            break;
          }
        }

        if (!matches) {
          violations.push(
            `Lecturer ${lecturerCode} (${entry.classId}) scheduled at ${entry.timeSlot.day} ${entry.timeSlot.startTime} instead of preferred time: ${lecturer.Prefered_Time}`
          );
        }
      }
    }

    return violations;
  }
}
