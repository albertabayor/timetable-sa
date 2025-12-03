/**
 * SC2: Prefer lecturer's preferred room
 */

import type { Constraint } from 'timetable-sa';
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
}
