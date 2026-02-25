/**
 * SC8: Avoid scheduling on lecturer's research day
 */

import type { Constraint } from '../../../../src/index.js';
import type { TimetableState } from '../../types/index.js';

export class ResearchDay implements Constraint<TimetableState> {
  name = 'Research Day';
  type = 'soft' as const;
  weight: number;

  constructor(weight: number = 12) {
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
        if (!lecturer || !lecturer.Research_Day) continue;

        count++;

        const researchDay = lecturer.Research_Day.trim();

        // Check if class is on research day
        if (researchDay && (
          entry.timeSlot.day === researchDay ||
          researchDay.includes(entry.timeSlot.day)
        )) {
          totalScore += 0.3; // Heavy penalty for scheduling on research day
        } else {
          totalScore += 1;
        }
      }
    }

    return count > 0 ? totalScore / count : 1;
  }

  describe(): string {
    return 'Classes scheduled on lecturer\'s designated research day';
  }

  getViolations(state: TimetableState): string[] {
    const { schedule, lecturers } = state;
    const violations: string[] = [];
    const lecturerMap = new Map(lecturers.map(l => [l.Code, l]));

    for (const entry of schedule) {
      for (const lecturerCode of entry.lecturers) {
        const lecturer = lecturerMap.get(lecturerCode);
        if (!lecturer || !lecturer.Research_Day) continue;

        const researchDay = lecturer.Research_Day.trim();

        // Check if class is on research day
        if (researchDay && (
          entry.timeSlot.day === researchDay ||
          researchDay.includes(entry.timeSlot.day)
        )) {
          violations.push(
            `Class ${entry.classId} scheduled on ${entry.timeSlot.day} which is research day for lecturer ${lecturerCode}`
          );
        }
      }
    }

    return violations;
  }
}
