/**
 * Targeted move operator: Fix Max Daily Periods violations
 *
 * This operator targets lecturers who exceed their maximum daily teaching periods
 * and redistributes their classes to other days.
 * UPDATED: Now uses constraint-aware slot+room validation.
 */

import type { MoveGenerator } from 'timetable-sa';
import type { TimetableState } from '../types/index.js';
import { getValidTimeSlotAndRoomCombinationsWithPriority, calculateEndTime } from '../utils/index.js';

export class FixMaxDailyPeriods implements MoveGenerator<TimetableState> {
  name = 'Fix Max Daily Periods';

  canApply(state: TimetableState): boolean {
    // Check if any lecturer exceeds max daily periods
    return this.hasMaxDailyPeriodsViolation(state);
  }

  generate(state: TimetableState, temperature: number): TimetableState {
    // Clone state
    const newState = JSON.parse(JSON.stringify(state)) as TimetableState;

    // Find violating lecturer-day combinations
    const violations = this.findViolations(newState);

    if (violations.length === 0) {
      return newState;
    }

    // Pick a random violation
    const violation = violations[Math.floor(Math.random() * violations.length)];
    const { lecturerCode, day, classes } = violation;

    // Pick a random class from this lecturer's overloaded day
    const entry = classes[Math.floor(Math.random() * classes.length)];

    // Use constraint-aware slot+room validator to get ONLY valid combinations
    const { preferred, acceptable, all } = getValidTimeSlotAndRoomCombinationsWithPriority(newState, entry);

    // Filter out the current overloaded day (we want to move to a different day)
    const validDifferentDayCombos = all.filter(c => c.timeSlot.day !== day);

    if (validDifferentDayCombos.length === 0) {
      return newState; // No valid combinations on different days
    }

    // Pick random valid combination from a different day
    const combo = validDifferentDayCombos[Math.floor(Math.random() * validDifferentDayCombos.length)];

    // Calculate prayer time adjustment
    const calc = calculateEndTime(combo.timeSlot.startTime, entry.sks, combo.timeSlot.day);

    // Update BOTH time slot AND room
    entry.timeSlot = {
      period: combo.timeSlot.period,
      day: combo.timeSlot.day,
      startTime: combo.timeSlot.startTime,
      endTime: combo.timeSlot.endTime,
    };
    entry.room = combo.room;
    entry.prayerTimeAdded = calc.prayerTimeAdded;

    // Update overflow status
    const isLabRoom = combo.roomType.toLowerCase().includes('lab');
    entry.isOverflowToLab = !entry.needsLab && isLabRoom;

    return newState;
  }

  private hasMaxDailyPeriodsViolation(state: TimetableState): boolean {
    const lecturerMap = new Map(state.lecturers.map(l => [l.Code, l]));
    const lecturerDayPeriods = new Map<string, Map<string, number>>();

    for (const entry of state.schedule) {
      for (const lecturerCode of entry.lecturers) {
        const lecturer = lecturerMap.get(lecturerCode);
        if (!lecturer || !lecturer.Max_Daily_Periods) continue;

        const key = lecturerCode;
        if (!lecturerDayPeriods.has(key)) {
          lecturerDayPeriods.set(key, new Map());
        }

        const dayMap = lecturerDayPeriods.get(key)!;
        const currentPeriods = dayMap.get(entry.timeSlot.day) || 0;
        const newPeriods = currentPeriods + entry.sks;
        dayMap.set(entry.timeSlot.day, newPeriods);

        if (newPeriods > lecturer.Max_Daily_Periods) {
          return true;
        }
      }
    }

    return false;
  }

  private findViolations(state: TimetableState): Array<{
    lecturerCode: string;
    day: string;
    classes: typeof state.schedule;
    totalPeriods: number;
    maxPeriods: number;
  }> {
    const violations: Array<{
      lecturerCode: string;
      day: string;
      classes: typeof state.schedule;
      totalPeriods: number;
      maxPeriods: number;
    }> = [];

    const lecturerMap = new Map(state.lecturers.map(l => [l.Code, l]));
    const lecturerDayPeriods = new Map<string, Map<string, number>>();
    const lecturerDayClasses = new Map<string, Map<string, typeof state.schedule>>();

    for (const entry of state.schedule) {
      for (const lecturerCode of entry.lecturers) {
        const lecturer = lecturerMap.get(lecturerCode);
        if (!lecturer || !lecturer.Max_Daily_Periods) continue;

        const key = lecturerCode;
        if (!lecturerDayPeriods.has(key)) {
          lecturerDayPeriods.set(key, new Map());
          lecturerDayClasses.set(key, new Map());
        }

        const dayMap = lecturerDayPeriods.get(key)!;
        const classMap = lecturerDayClasses.get(key)!;

        const currentPeriods = dayMap.get(entry.timeSlot.day) || 0;
        const newPeriods = currentPeriods + entry.sks;
        dayMap.set(entry.timeSlot.day, newPeriods);

        if (!classMap.has(entry.timeSlot.day)) {
          classMap.set(entry.timeSlot.day, []);
        }
        classMap.get(entry.timeSlot.day)!.push(entry);

        if (newPeriods > lecturer.Max_Daily_Periods) {
          // Check if we already added this violation
          const existingViolation = violations.find(
            v => v.lecturerCode === lecturerCode && v.day === entry.timeSlot.day
          );

          if (!existingViolation) {
            violations.push({
              lecturerCode,
              day: entry.timeSlot.day,
              classes: classMap.get(entry.timeSlot.day)!,
              totalPeriods: newPeriods,
              maxPeriods: lecturer.Max_Daily_Periods,
            });
          }
        }
      }
    }

    return violations;
  }
}
