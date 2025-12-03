/**
 * HC9: Only Magister Manajemen can have classes on Saturday
 */

import type { Constraint } from 'timetable-sa';
import type { TimetableState } from '../../types/index.js';

export class SaturdayRestriction implements Constraint<TimetableState> {
  name = 'Saturday Restriction';
  type = 'hard' as const;

  evaluate(state: TimetableState): number {
    const { schedule } = state;
    let violationCount = 0;

    for (const entry of schedule) {
      if (entry.timeSlot.day === 'Saturday') {
        const isMagisterManajemen = entry.prodi.toLowerCase().includes('magister manajemen');
        if (!isMagisterManajemen) {
          violationCount++;
        }
      }
    }

    if (violationCount === 0) return 1;
    return 1 / (1 + violationCount);
  }

  describe(state: TimetableState): string | undefined {
    const { schedule } = state;

    for (const entry of schedule) {
      if (entry.timeSlot.day === 'Saturday') {
        const isMagisterManajemen = entry.prodi.toLowerCase().includes('magister manajemen');
        if (!isMagisterManajemen) {
          return `Only Magister Manajemen allowed on Saturday, but class ${entry.classId} is from ${entry.prodi}`;
        }
      }
    }

    return undefined;
  }

  getViolations(state: TimetableState): string[] {
    const { schedule } = state;
    const violations: string[] = [];

    for (const entry of schedule) {
      if (entry.timeSlot.day === 'Saturday') {
        const isMagisterManajemen = entry.prodi.toLowerCase().includes('magister manajemen');
        if (!isMagisterManajemen) {
          violations.push(
            `Only Magister Manajemen allowed on Saturday, but class ${entry.classId} (${entry.className}) is from ${entry.prodi}`
          );
        }
      }
    }

    return violations;
  }
}
