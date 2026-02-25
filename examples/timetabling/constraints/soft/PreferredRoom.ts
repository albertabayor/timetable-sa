/**
 * SC2: Prefer lecturer's preferred room
 */

import type { Constraint } from '../../../../src/index.js';
import type { TimetableState } from '../../types/index.js';

export class PreferredRoom implements Constraint<TimetableState> {
  name = 'Preferred Room';
  type = 'soft' as const;
  weight: number;

  constructor(weight: number = 5) {
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
        if (!lecturer || !lecturer.Prefered_Room) continue;

        count++;

        if (lecturer.Prefered_Room === entry.room) {
          totalScore += 1;
        }
      }
    }

    return count > 0 ? totalScore / count : 1;
  }

  describe(): string {
    return 'Classes not assigned to lecturer\'s preferred room';
  }

  getViolations(state: TimetableState): string[] {
    const { schedule, lecturers } = state;
    const violations: string[] = [];
    const lecturerMap = new Map(lecturers.map(l => [l.Code, l]));

    for (const entry of schedule) {
      for (const lecturerCode of entry.lecturers) {
        const lecturer = lecturerMap.get(lecturerCode);
        if (!lecturer || !lecturer.Prefered_Room) continue;

        if (lecturer.Prefered_Room !== entry.room) {
          violations.push(
            `Lecturer ${lecturerCode} (${entry.classId}) assigned to room ${entry.room} instead of preferred room ${lecturer.Prefered_Room}`
          );
        }
      }
    }

    return violations;
  }
}
