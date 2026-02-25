/**
 * SC6: Evening classes should start at preferred times
 * Optimal start time is 18:30
 * Acceptable range: 15:30 - 19:30
 * Penalize very late starts (>= 19:30)
 */

import type { Constraint } from '../../../../src/index.js';
import type { TimetableState } from '../../types/index.js';
import { timeToMinutes } from '../../utils/index.js';

export class EveningClassPriority implements Constraint<TimetableState> {
  name = 'Evening Class Priority';
  type = 'soft' as const;
  weight: number;

  constructor(weight: number = 7) {
    this.weight = weight;
  }

  evaluate(state: TimetableState): number {
    const { schedule } = state;
    let totalScore = 0;
    let count = 0;

    for (const entry of schedule) {
      if (entry.classType !== 'sore') continue;

      count++;
      const startMinutes = timeToMinutes(entry.timeSlot.startTime);

      // Optimal: 18:30
      if (startMinutes === 18 * 60 + 30) {
        totalScore += 1.0;
      }
      // Good: 18:00 - 18:30
      else if (startMinutes >= 18 * 60 && startMinutes < 18 * 60 + 30) {
        totalScore += 0.85;
      }
      // Acceptable early: 16:00 - 18:00
      else if (startMinutes >= 16 * 60 && startMinutes < 18 * 60) {
        totalScore += 0.8;
      }
      // Too early: 15:30 - 16:00
      else if (startMinutes >= 15 * 60 + 30 && startMinutes < 16 * 60) {
        totalScore += 0.8;
      }
      // Too late: >= 19:30 (heavy penalty)
      else if (startMinutes >= 19 * 60 + 30) {
        totalScore += 0.1;
      }
      // Other times
      else {
        totalScore += 0.1;
      }
    }

    return count > 0 ? totalScore / count : 1;
  }

  describe(): string {
    return 'Evening classes (sore) not starting at optimal time (18:30)';
  }

  getViolations(state: TimetableState): string[] {
    const { schedule } = state;
    const violations: string[] = [];

    for (const entry of schedule) {
      if (entry.classType !== 'sore') continue;

      const startMinutes = timeToMinutes(entry.timeSlot.startTime);

      // Optimal: 18:30
      if (startMinutes === 18 * 60 + 30) {
        continue; // No violation
      }

      // Good: 18:00 - 18:30
      if (startMinutes >= 18 * 60 && startMinutes < 18 * 60 + 30) {
        violations.push(
          `Evening class ${entry.classId} starts at ${entry.timeSlot.startTime} (suboptimal, optimal is 18:30)`
        );
      }
      // Acceptable early: 16:00 - 18:00
      else if (startMinutes >= 16 * 60 && startMinutes < 18 * 60) {
        violations.push(
          `Evening class ${entry.classId} starts too early at ${entry.timeSlot.startTime} (optimal is 18:30)`
        );
      }
      // Too early: 15:30 - 16:00
      else if (startMinutes >= 15 * 60 + 30 && startMinutes < 16 * 60) {
        violations.push(
          `Evening class ${entry.classId} starts way too early at ${entry.timeSlot.startTime} (optimal is 18:30)`
        );
      }
      // Too late: >= 19:30 (heavy penalty)
      else if (startMinutes >= 19 * 60 + 30) {
        violations.push(
          `Evening class ${entry.classId} starts too late at ${entry.timeSlot.startTime} (optimal is 18:30)`
        );
      }
      // Other times
      else {
        violations.push(
          `Evening class ${entry.classId} starts at ${entry.timeSlot.startTime} (optimal is 18:30)`
        );
      }
    }

    return violations;
  }
}
