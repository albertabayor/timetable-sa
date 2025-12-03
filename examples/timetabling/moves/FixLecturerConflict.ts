/**
 * Targeted move operator: Fix lecturer conflicts
 *
 * This operator specifically targets lecturer conflicts - when the same lecturer
 * is scheduled for multiple classes at overlapping times.
 * UPDATED: Now uses constraint-aware slot+room validation.
 */

import type { MoveGenerator } from 'timetable-sa';
import type { TimetableState, ScheduleEntry } from '../types/index.js';
import { getValidTimeSlotAndRoomCombinationsWithPriority, calculateEndTime, timeToMinutes } from '../utils/index.js';

export class FixLecturerConflict implements MoveGenerator<TimetableState> {
  name = 'Fix Lecturer Conflict';

  /**
   * Check if two schedule entries have time overlap
   */
  private hasTimeOverlap(entry1: ScheduleEntry, entry2: ScheduleEntry): boolean {
    if (entry1.timeSlot.day !== entry2.timeSlot.day) return false;

    const start1 = timeToMinutes(entry1.timeSlot.startTime);
    const end1 = timeToMinutes(entry1.timeSlot.endTime);
    const start2 = timeToMinutes(entry2.timeSlot.startTime);
    const end2 = timeToMinutes(entry2.timeSlot.endTime);

    return start1 < end2 && start2 < end1;
  }

  /**
   * Find all lecturer conflicts in the schedule
   */
  private findLecturerConflicts(schedule: ScheduleEntry[]): ScheduleEntry[] {
    const conflicts: ScheduleEntry[] = [];

    for (let i = 0; i < schedule.length; i++) {
      for (let j = i + 1; j < schedule.length; j++) {
        const entry1 = schedule[i];
        const entry2 = schedule[j];

        // Check if they share a lecturer and have time overlap
        const sharedLecturer = entry1.lecturers.some(lec => entry2.lecturers.includes(lec));

        if (sharedLecturer && this.hasTimeOverlap(entry1, entry2)) {
          // Add both to conflicts if not already there
          if (!conflicts.includes(entry1)) conflicts.push(entry1);
          if (!conflicts.includes(entry2)) conflicts.push(entry2);
        }
      }
    }

    return conflicts;
  }

  canApply(state: TimetableState): boolean {
    return this.findLecturerConflicts(state.schedule).length > 0;
  }

  generate(state: TimetableState, temperature: number): TimetableState {
    // Clone state
    const newState = JSON.parse(JSON.stringify(state)) as TimetableState;

    // Find all classes with lecturer conflicts
    const conflictingClasses = this.findLecturerConflicts(newState.schedule);

    if (conflictingClasses.length === 0) {
      return newState;
    }

    // Pick one conflicting class randomly
    const entry = conflictingClasses[Math.floor(Math.random() * conflictingClasses.length)];

    // Use constraint-aware slot+room validator to get ONLY valid combinations
    const { preferred, acceptable, all } = getValidTimeSlotAndRoomCombinationsWithPriority(newState, entry);

    let combinationsToUse = preferred.length > 0 ? preferred : (acceptable.length > 0 ? acceptable : all);

    if (combinationsToUse.length === 0) {
      return newState; // No valid combinations available
    }

    // Pick random valid combination
    const combo = combinationsToUse[Math.floor(Math.random() * combinationsToUse.length)];

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
}
