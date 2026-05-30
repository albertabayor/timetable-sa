/**
 * Targeted move operator: Fix room conflicts
 *
 * This operator specifically targets room conflicts - when the same room
 * is assigned to multiple classes at overlapping times.
 * 
 * OPTIMIZED: Now uses O(N log N) group-and-sort pattern instead of O(N²) nested loops.
 */

import type { MoveGenerator } from '../../../src/index.js';
import type { TimetableState, ScheduleEntry } from '../types/index.js';
import {
  timeToMinutes,
  canUseExclusiveRoom,
  groupScheduleByKey,
  sortEntriesByStartTime,
  getEndTimeInMinutes,
  startsAfterEnd,
} from '../utils/index.js';

export class FixRoomConflict implements MoveGenerator<TimetableState> {
  name = 'Fix Room Conflict';
  targetConstraintTypes = ['hard'] as const;
  targetConstraintKeys = ['no_room_conflict'];

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
   * Find all room conflicts in the schedule using O(N log N) algorithm
   * 
   * Algorithm:
   * 1. Group entries by room+day - O(N)
   * 2. Sort each group by start time - O(K log K) per group
   * 3. Check adjacent entries for overlap - O(K) per group
   * 
   * Total: O(N log N) instead of O(N²)
   */
  private findRoomConflicts(schedule: ScheduleEntry[]): ScheduleEntry[] {
    const conflicts = new Set<ScheduleEntry>();
    
    // Group by room+day
    const roomDayGroups = groupScheduleByKey(schedule, (entry) =>
      `${entry.room}_${entry.timeSlot.day}`
    );
    
    // Check each group for conflicts
    for (const entries of roomDayGroups.values()) {
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
    return this.findRoomConflicts(state.schedule).length > 0;
  }

  generate(state: TimetableState, temperature: number): TimetableState {
    // SA engine already clones state, so we work directly on the passed state

    // Find all classes with room conflicts
    const conflictingClasses = this.findRoomConflicts(state.schedule);

    if (conflictingClasses.length === 0) {
      return state;
    }

    // Pick one conflicting class randomly
    const entry = conflictingClasses[Math.floor(Math.random() * conflictingClasses.length)]!;

    // Get suitable rooms based on requirements
    const suitableRooms = state.rooms.filter(room => {
      // Check capacity
      if (room.Capacity < entry.participants) return false;

      // Check if lab requirement matches
      if (entry.needsLab && !room.Type.toLowerCase().includes('lab')) return false;

      // Check exclusive room constraints
      if (!canUseExclusiveRoom(room.Code, entry.className, entry.prodi)) return false;

      // Check if room is available at this time slot (no conflict)
      const hasConflict = state.schedule.some(other => {
        if (other.classId === entry.classId) return false; // Skip self
        if (other.room !== room.Code) return false; // Different room
        return this.hasTimeOverlap(entry, other); // Check time overlap
      });

      if (hasConflict) return false;

      return true;
    });

    if (suitableRooms.length === 0) {
      return state; // No suitable rooms available
    }

    // Pick random room (different from current if possible)
    const otherRooms = suitableRooms.filter(r => r.Code !== entry.room);
    const roomsToChooseFrom = otherRooms.length > 0 ? otherRooms : suitableRooms;

    const newRoom = roomsToChooseFrom[Math.floor(Math.random() * roomsToChooseFrom.length)]!;

    // Update room
    entry.room = newRoom.Code;

    return state;
  }
}
