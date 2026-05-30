/**
 * Targeted move operator: Fix lecturer conflicts
 *
 * This operator specifically targets lecturer conflicts - when the same lecturer
 * is scheduled for multiple classes at overlapping times.
 * 
 * OPTIMIZED: Now uses O(N log N) group-and-sort pattern instead of O(N²) nested loops.
 */

import type { MoveGenerator } from '../../../src/index.js';
import type { TimetableState, ScheduleEntry } from '../types/index.js';
import {
  getValidTimeSlotAndRoomCombinationsWithPriority,
  calculateEndTime,
  timeToMinutes,
  groupScheduleByKey,
  sortEntriesByStartTime,
  getEndTimeInMinutes,
  startsAfterEnd,
} from '../utils/index.js';

export class FixLecturerConflict implements MoveGenerator<TimetableState> {
  name = 'Fix Lecturer Conflict';
  targetConstraintTypes = ['hard'] as const;
  targetConstraintKeys = ['no_lecturer_conflict'];

  /**
   * Find all lecturer conflicts in the schedule using O(N log N) algorithm
   * 
   * Algorithm:
   * 1. Group entries by lecturer+day - O(N)
   * 2. Sort each group by start time - O(K log K) per group
   * 3. Check adjacent entries for overlap - O(K) per group
   * 
   * Total: O(N log N) instead of O(N²)
   */
  private findLecturerConflicts(schedule: ScheduleEntry[]): ScheduleEntry[] {
    const conflicts = new Set<ScheduleEntry>();
    
    // Build index: lecturer+day -> entries
    // Need to handle multi-lecturer classes
    const lecturerDayGroups = new Map<string, ScheduleEntry[]>();
    
    for (const entry of schedule) {
      for (const lecturer of entry.lecturers) {
        const key = `${lecturer}_${entry.timeSlot.day}`;
        if (!lecturerDayGroups.has(key)) {
          lecturerDayGroups.set(key, []);
        }
        lecturerDayGroups.get(key)!.push(entry);
      }
    }
    
    // Check each group for conflicts
    for (const entries of lecturerDayGroups.values()) {
      if (entries.length < 2) continue;
      
      // Sort by start time
      sortEntriesByStartTime(entries);
      
      // Check adjacent and overlapping entries
      for (let i = 0; i < entries.length; i++) {
        const entry1 = entries[i]!;
        const end1 = getEndTimeInMinutes(entry1);
        
        for (let j = i + 1; j < entries.length; j++) {
          const entry2 = entries[j]!;
          const start2 = timeToMinutes(entry2.timeSlot.startTime);
          
          // Short-circuit: if entry2 starts after entry1 ends, no more overlaps
          if (startsAfterEnd(end1, start2)) break;
          
          // Overlap found - add both to conflicts
          conflicts.add(entry1);
          conflicts.add(entry2);
        }
      }
    }
    
    return Array.from(conflicts);
  }

  canApply(state: TimetableState): boolean {
    return this.findLecturerConflicts(state.schedule).length > 0;
  }

  generate(state: TimetableState, temperature: number): TimetableState {
    // SA engine already clones state, so we work directly on the passed state

    // Find all classes with lecturer conflicts
    const conflictingClasses = this.findLecturerConflicts(state.schedule);

    if (conflictingClasses.length === 0) {
      return state;
    }

    // Pick one conflicting class randomly
    const entry = conflictingClasses[Math.floor(Math.random() * conflictingClasses.length)]!;

    // Use constraint-aware slot+room validator to get ONLY valid combinations
    const { preferred, acceptable, all } = getValidTimeSlotAndRoomCombinationsWithPriority(state, entry);

    let combinationsToUse = preferred.length > 0 ? preferred : (acceptable.length > 0 ? acceptable : all);

    if (combinationsToUse.length === 0) {
      return state; // No valid combinations available
    }

    // Pick random valid combination
    const combo = combinationsToUse[Math.floor(Math.random() * combinationsToUse.length)]!;

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

    return state;
  }
}
