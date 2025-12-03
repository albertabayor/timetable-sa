/**
 * Targeted move operator: Fix room capacity violations
 *
 * This operator specifically targets classes that are assigned to rooms
 * with insufficient capacity and moves them to larger rooms.
 *
 * Strategy:
 * 1. Find all classes with room capacity violations
 * 2. Pick one randomly
 * 3. Find a larger room that can accommodate the class without conflicts
 * 4. If no suitable room at current time, try changing time slot too
 */

import type { MoveGenerator } from 'timetable-sa';
import type { TimetableState, ScheduleEntry } from '../types/index.js';
import { getValidTimeSlotAndRoomCombinationsWithPriority, canUseExclusiveRoom } from '../utils/index.js';

export class FixRoomCapacity implements MoveGenerator<TimetableState> {
  name = 'Fix Room Capacity';

  canApply(state: TimetableState): boolean {
    return this.findViolatingClasses(state).length > 0;
  }

  /**
   * Find all classes that violate room capacity constraint
   */
  private findViolatingClasses(state: TimetableState): ScheduleEntry[] {
    const { schedule, rooms } = state;
    const roomMap = new Map(rooms.map(r => [r.Code, r]));
    const violating: ScheduleEntry[] = [];

    for (const entry of schedule) {
      const room = roomMap.get(entry.room);

      if (!room) {
        violating.push(entry); // Room not found - also a violation
        continue;
      }

      if (room.Capacity < entry.participants) {
        violating.push(entry); // Room too small
      }
    }

    return violating;
  }

  /**
   * Find available rooms with sufficient capacity at the current time slot
   */
  private findSuitableRooms(
    state: TimetableState,
    entry: ScheduleEntry
  ): Array<{ code: string; capacity: number; type: string }> {
    const suitableRooms: Array<{ code: string; capacity: number; type: string }> = [];

    for (const room of state.rooms) {
      // 1. Check capacity - must be sufficient
      if (room.Capacity < entry.participants) continue;

      // 2. Check lab requirement
      if (entry.needsLab && !room.Type.toLowerCase().includes('lab')) continue;

      // 3. Check exclusive room constraints
      if (!canUseExclusiveRoom(room.Code, entry.className, entry.prodi)) {
        continue;
      }

      // 4. Check if room is available at current time slot
      const hasConflict = state.schedule.some(other => {
        if (other.classId === entry.classId) return false; // Skip self
        if (other.room !== room.Code) return false; // Different room

        // Check if on same day
        if (other.timeSlot.day !== entry.timeSlot.day) return false;

        // Check time overlap
        const [otherStartH, otherStartM] = other.timeSlot.startTime.split(':').map(Number);
        const [otherEndH, otherEndM] = other.timeSlot.endTime.split(':').map(Number);
        const [entryStartH, entryStartM] = entry.timeSlot.startTime.split(':').map(Number);
        const [entryEndH, entryEndM] = entry.timeSlot.endTime.split(':').map(Number);

        const otherStart = otherStartH! * 60 + otherStartM!;
        const otherEnd = otherEndH! * 60 + otherEndM!;
        const entryStart = entryStartH! * 60 + entryStartM!;
        const entryEnd = entryEndH! * 60 + entryEndM!;

        return entryStart < otherEnd && entryEnd > otherStart;
      });

      if (hasConflict) continue;

      // Room is suitable
      suitableRooms.push({
        code: room.Code,
        capacity: room.Capacity,
        type: room.Type,
      });
    }

    // Sort by capacity (prefer smaller rooms that still fit, to save larger rooms)
    suitableRooms.sort((a, b) => a.capacity - b.capacity);

    return suitableRooms;
  }

  generate(state: TimetableState, temperature: number): TimetableState {
    const violatingClasses = this.findViolatingClasses(state);

    if (violatingClasses.length === 0) {
      return state; // No violations to fix
    }

    // Clone state
    const newState = JSON.parse(JSON.stringify(state)) as TimetableState;

    // Pick random violating class
    const targetClass = violatingClasses[Math.floor(Math.random() * violatingClasses.length)];
    const entry = newState.schedule.find(e => e.classId === targetClass.classId);

    if (!entry) {
      return newState;
    }

    // Strategy 1: Try to find a better room at the same time slot
    const suitableRooms = this.findSuitableRooms(newState, entry);

    if (suitableRooms.length > 0) {
      // Found a suitable room at current time - just change room
      const newRoom = suitableRooms[0]; // Already sorted by capacity
      entry.room = newRoom.code;

      // Update overflow status
      const isLabRoom = newRoom.type.toLowerCase().includes('lab');
      entry.isOverflowToLab = !entry.needsLab && isLabRoom;

      return newState;
    }

    // Strategy 2: No suitable room at current time - try changing time slot AND room
    const { preferred, acceptable, all } = getValidTimeSlotAndRoomCombinationsWithPriority(
      newState,
      entry
    );

    // Filter combinations that have sufficient capacity
    const filterByCapacity = (combos: typeof all) =>
      combos.filter(c => c.capacity >= entry.participants);

    let validCombos = filterByCapacity(preferred);

    // If no preferred combos, try acceptable (Friday slots)
    if (validCombos.length === 0) {
      validCombos = filterByCapacity(acceptable);
    }

    // If still no combos, use all valid ones
    if (validCombos.length === 0) {
      validCombos = filterByCapacity(all);
    }

    if (validCombos.length === 0) {
      return newState; // Cannot fix this violation
    }

    // Pick random valid combination (prefer smaller capacity rooms)
    validCombos.sort((a, b) => a.capacity - b.capacity);
    const combo = validCombos[0]; // Smallest sufficient room

    // Update entry with new time slot and room
    entry.timeSlot = {
      period: combo.timeSlot.period,
      day: combo.timeSlot.day,
      startTime: combo.timeSlot.startTime,
      endTime: combo.timeSlot.endTime,
    };
    entry.room = combo.room;

    // Update overflow status
    const isLabRoom = combo.roomType.toLowerCase().includes('lab');
    entry.isOverflowToLab = !entry.needsLab && isLabRoom;

    return newState;
  }
}
