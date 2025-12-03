/**
 * HC8: Class type must match time slot (morning/evening)
 * - Evening classes (sore) must start at or after 15:30
 * - Morning classes (pagi) must start before 18:30
 */

import type { Constraint } from 'timetable-sa';
import type { TimetableState } from '../../types/index.js';

export class ClassTypeTime implements Constraint<TimetableState> {
  name = 'Class Type Time Match';
  type = 'hard' as const;

  evaluate(state: TimetableState): number {
    const { schedule } = state;
    let violationCount = 0;

    for (const entry of schedule) {
      if (!this.isValidClassTypeTime(entry.timeSlot.startTime, entry.classType)) {
        violationCount++;
      }
    }

    if (violationCount === 0) return 1;
    return 1 / (1 + violationCount);
  }

  describe(state: TimetableState): string | undefined {
    const { schedule } = state;

    for (const entry of schedule) {
      if (!this.isValidClassTypeTime(entry.timeSlot.startTime, entry.classType)) {
        const [hour, minute] = entry.timeSlot.startTime.split(':').map(Number);
        const startMinutes = hour! * 60 + minute!;
        if (entry.classType === 'sore') {
          if (startMinutes < 15 * 60 + 30) {
            return `Evening class ${entry.classId} starting too early at ${entry.timeSlot.startTime} (must be >= 15:30)`;
          } else {
            return `Evening class ${entry.classId} starting too late at ${entry.timeSlot.startTime} (must be < 21:00)`;
          }
        } else {
          return `Morning class ${entry.classId} starting too late at ${entry.timeSlot.startTime} (must be < 15:30)`;
        }
      }
    }

    return undefined;
  }

  getViolations(state: TimetableState): string[] {
    const { schedule } = state;
    const violations: string[] = [];

    for (const entry of schedule) {
      if (!this.isValidClassTypeTime(entry.timeSlot.startTime, entry.classType)) {
        const [hour, minute] = entry.timeSlot.startTime.split(':').map(Number);
        const startMinutes = hour! * 60 + minute!;
        if (entry.classType === 'sore') {
          if (startMinutes < 15 * 60 + 30) {
            violations.push(
              `Evening class ${entry.classId} (${entry.className}) starting too early at ${entry.timeSlot.startTime} (must be >= 15:30)`
            );
          } else {
            violations.push(
              `Evening class ${entry.classId} (${entry.className}) starting too late at ${entry.timeSlot.startTime} (must be < 21:00)`
            );
          }
        } else {
          violations.push(
            `Morning class ${entry.classId} (${entry.className}) starting too late at ${entry.timeSlot.startTime} (must be < 15:30)`
          );
        }
      }
    }

    return violations;
  }

  private isValidClassTypeTime(startTime: string, classType: string): boolean {
    const [hour, minute] = startTime.split(':').map(Number);
    const startMinutes = hour! * 60 + minute!;

    if (classType === 'sore') {
      // Evening classes must start at or after 15:30 and before 21:00
      // Common times: 15:30, 18:00, 18:30
      return startMinutes >= 15 * 60 + 30 && startMinutes < 21 * 60;
    } else {
      // Morning classes must start before 15:30 (not overlap with evening time)
      return startMinutes < 15 * 60 + 30;
    }
  }
}
