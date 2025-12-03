/**
 * HC12: Exclusive room constraint
 * Certain rooms are reserved for specific courses
 */

import type { Constraint } from 'timetable-sa';
import type { TimetableState } from '../../types/index.js';
import { canUseExclusiveRoom } from '../../utils/index.js';

export class ExclusiveRoom implements Constraint<TimetableState> {
  name = 'Exclusive Room';
  type = 'hard' as const;

  evaluate(state: TimetableState): number {
    const { schedule } = state;
    let violationCount = 0;

    for (const entry of schedule) {
      if (!canUseExclusiveRoom(entry.room, entry.className, entry.prodi)) {
        violationCount++;
      }
    }

    if (violationCount === 0) return 1;
    return 1 / (1 + violationCount);
  }

  describe(state: TimetableState): string | undefined {
    const { schedule } = state;

    for (const entry of schedule) {
      if (!canUseExclusiveRoom(entry.room, entry.className, entry.prodi)) {
        return `Room ${entry.room} is exclusive and cannot be used by class ${entry.classId} (${entry.className})`;
      }
    }

    return undefined;
  }

  getViolations(state: TimetableState): string[] {
    const { schedule } = state;
    const violations: string[] = [];

    for (const entry of schedule) {
      if (!canUseExclusiveRoom(entry.room, entry.className, entry.prodi)) {
        violations.push(
          `Room ${entry.room} is exclusive and cannot be used by class ${entry.classId} (${entry.className}) from ${entry.prodi}`
        );
      }
    }

    return violations;
  }
}
