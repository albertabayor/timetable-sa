/**
 * Targeted move operator: Fix room conflicts
 *
 * This operator specifically targets room conflicts - when the same room
 * is assigned to multiple classes at overlapping times.
 */

import type { MoveGenerator } from 'timetable-sa';
import type { TimetableState, ScheduleEntry } from '../types/index.js';
import { timeToMinutes, canUseExclusiveRoom } from '../utils/index.js';

export class FixRoomConflict implements MoveGenerator<TimetableState> {
  name = 'Fix Room Conflict';

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
   * Find all room conflicts in the schedule
   */
  private findRoomConflicts(schedule: ScheduleEntry[]): ScheduleEntry[] {
    const conflicts: ScheduleEntry[] = [];

    for (let i = 0; i < schedule.length; i++) {
      for (let j = i + 1; j < schedule.length; j++) {
        const entry1 = schedule[i];
        const entry2 = schedule[j];

        // Check if they share a room and have time overlap
        if (entry1.room === entry2.room && this.hasTimeOverlap(entry1, entry2)) {
          // Add both to conflicts if not already there
          if (!conflicts.includes(entry1)) conflicts.push(entry1);
          if (!conflicts.includes(entry2)) conflicts.push(entry2);
        }
      }
    }

    return conflicts;
  }

  canApply(state: TimetableState): boolean {
    return this.findRoomConflicts(state.schedule).length > 0;
  }

  generate(state: TimetableState, temperature: number): TimetableState {
    // Clone state
    const newState = JSON.parse(JSON.stringify(state)) as TimetableState;

    // Find all classes with room conflicts
    const conflictingClasses = this.findRoomConflicts(newState.schedule);

    if (conflictingClasses.length === 0) {
      return newState;
    }

    // Pick one conflicting class randomly
    const entry = conflictingClasses[Math.floor(Math.random() * conflictingClasses.length)];

    // Get suitable rooms based on requirements
    const suitableRooms = newState.rooms.filter(room => {
      // Check capacity
      if (room.Capacity < entry.participants) return false;

      // Check if lab requirement matches
      if (entry.needsLab && !room.Type.toLowerCase().includes('lab')) return false;

      // Check exclusive room constraints
      if (!canUseExclusiveRoom(room.Code, entry.className, entry.prodi)) return false;

      // Check if room is available at this time slot (no conflict)
      const hasConflict = newState.schedule.some(other => {
        if (other.classId === entry.classId) return false; // Skip self
        if (other.room !== room.Code) return false; // Different room
        return this.hasTimeOverlap(entry, other); // Check time overlap
      });

      if (hasConflict) return false;

      return true;
    });

    if (suitableRooms.length === 0) {
      return newState; // No suitable rooms available
    }

    // Pick random room (different from current if possible)
    const otherRooms = suitableRooms.filter(r => r.Code !== entry.room);
    const roomsToChooseFrom = otherRooms.length > 0 ? otherRooms : suitableRooms;

    const newRoom = roomsToChooseFrom[Math.floor(Math.random() * roomsToChooseFrom.length)];

    // Update room
    entry.room = newRoom.Code;

    return newState;
  }
}
