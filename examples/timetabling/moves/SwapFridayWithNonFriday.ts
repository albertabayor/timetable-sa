/**
 * Advanced move operator: Swap Friday class with non-Friday class
 *
 * This operator solves the Friday prayer conflict deadlock by swapping
 * a Friday class with a non-Friday class from the SAME lecturer.
 *
 * Strategy:
 * 1. Find classes on Friday that violate prayer time
 * 2. Find non-Friday classes from the same lecturer
 * 3. Swap their time slots (and rooms if needed)
 * 4. This guarantees no lecturer conflict while fixing Friday issue
 */

import type { MoveGenerator } from 'timetable-sa';
import type { TimetableState, ScheduleEntry } from '../types/index.js';
import { calculateEndTime, isValidFridayStartTime, canUseExclusiveRoom, isRoomAvailable } from '../utils/index.js';

export class SwapFridayWithNonFriday implements MoveGenerator<TimetableState> {
  name = 'Swap Friday with Non-Friday';

  // Friday prayer time window: 11:40 - 13:10
  private readonly PRAYER_START = 11 * 60 + 40;
  private readonly PRAYER_END = 13 * 60 + 10;

  /**
   * Check if a class overlaps with Friday prayer time
   */
  private overlapsWithPrayerTime(entry: ScheduleEntry): boolean {
    if (entry.timeSlot.day !== 'Friday') {
      return false;
    }

    const [startHour, startMin] = entry.timeSlot.startTime.split(':').map(Number);
    const [endHour, endMin] = entry.timeSlot.endTime.split(':').map(Number);
    const classStart = startHour! * 60 + startMin!;
    const classEnd = endHour! * 60 + endMin!;

    return classStart < this.PRAYER_END && classEnd >= this.PRAYER_START;
  }

  canApply(state: TimetableState): boolean {
    // Only apply if there are Friday violations
    return state.schedule.some(
      (entry) =>
        (entry.timeSlot.day === 'Friday' && !isValidFridayStartTime(entry.timeSlot.startTime)) ||
        this.overlapsWithPrayerTime(entry)
    );
  }

  generate(state: TimetableState, temperature: number): TimetableState {
    // Clone state
    const newState = JSON.parse(JSON.stringify(state)) as TimetableState;

    // Find all classes violating Friday constraints
    const fridayViolators = newState.schedule.filter(
      (entry) =>
        (entry.timeSlot.day === 'Friday' && !isValidFridayStartTime(entry.timeSlot.startTime)) ||
        this.overlapsWithPrayerTime(entry)
    );

    if (fridayViolators.length === 0) {
      return newState;
    }

    // Pick one violating Friday class
    const fridayClass = fridayViolators[Math.floor(Math.random() * fridayViolators.length)];

    // Find non-Friday classes from the same lecturer(s)
    const swapCandidates = newState.schedule.filter((entry) => {
      // Must be non-Friday
      if (entry.timeSlot.day === 'Friday') return false;

      // Must not be the same class
      if (entry.classId === fridayClass.classId) return false;

      // Must share at least one lecturer
      const sharedLecturer = fridayClass.lecturers.some((lec) => entry.lecturers.includes(lec));
      if (!sharedLecturer) return false;

      return true;
    });

    if (swapCandidates.length === 0) {
      return newState; // No swap candidates available
    }

    // Pick a random swap candidate
    const nonFridayClass = swapCandidates[Math.floor(Math.random() * swapCandidates.length)];

    // Check if swap is feasible (room compatibility)
    const fridayClassCanUseNonFridayRoom = this.canSwapRoom(
      newState,
      fridayClass,
      nonFridayClass.room,
      nonFridayClass.timeSlot.day
    );

    const nonFridayClassCanUseFridayRoom = this.canSwapRoom(
      newState,
      nonFridayClass,
      fridayClass.room,
      fridayClass.timeSlot.day
    );

    // If rooms are compatible, do a simple swap
    if (fridayClassCanUseNonFridayRoom && nonFridayClassCanUseFridayRoom) {
      // Swap time slots
      const tempTimeSlot = { ...fridayClass.timeSlot };
      const tempRoom = fridayClass.room;
      const tempPrayerTime = fridayClass.prayerTimeAdded;

      fridayClass.timeSlot = { ...nonFridayClass.timeSlot };
      fridayClass.room = nonFridayClass.room;
      fridayClass.prayerTimeAdded = nonFridayClass.prayerTimeAdded;

      nonFridayClass.timeSlot = tempTimeSlot;
      nonFridayClass.room = tempRoom;
      nonFridayClass.prayerTimeAdded = tempPrayerTime;

      return newState;
    }

    // If rooms incompatible, try swapping time slots and finding new rooms
    // Swap time slots only
    const tempTimeSlot = { ...fridayClass.timeSlot };
    fridayClass.timeSlot = { ...nonFridayClass.timeSlot };
    nonFridayClass.timeSlot = tempTimeSlot;

    // Try to find suitable rooms for both classes at their new time slots
    const fridayClassNewRoom = this.findSuitableRoom(newState, fridayClass);
    const nonFridayClassNewRoom = this.findSuitableRoom(newState, nonFridayClass);

    if (fridayClassNewRoom && nonFridayClassNewRoom) {
      fridayClass.room = fridayClassNewRoom;
      nonFridayClass.room = nonFridayClassNewRoom;

      // Recalculate prayer times
      const calc1 = calculateEndTime(fridayClass.timeSlot.startTime, fridayClass.sks, fridayClass.timeSlot.day);
      const calc2 = calculateEndTime(
        nonFridayClass.timeSlot.startTime,
        nonFridayClass.sks,
        nonFridayClass.timeSlot.day
      );

      fridayClass.prayerTimeAdded = calc1.prayerTimeAdded;
      nonFridayClass.prayerTimeAdded = calc2.prayerTimeAdded;

      fridayClass.timeSlot.endTime = calc1.endTime;
      nonFridayClass.timeSlot.endTime = calc2.endTime;

      return newState;
    }

    // Swap failed, return original state
    return state;
  }

  /**
   * Check if a class can use a specific room at a specific day
   */
  private canSwapRoom(state: TimetableState, entry: ScheduleEntry, newRoom: string, newDay: string): boolean {
    // Check exclusive room constraints
    if (!canUseExclusiveRoom(newRoom, entry.className, entry.prodi)) {
      return false;
    }

    // Check capacity
    const room = state.rooms.find((r) => r.Code === newRoom);
    if (!room || room.Capacity < entry.participants) {
      return false;
    }

    // Check lab requirement
    if (entry.needsLab && !room.Type.toLowerCase().includes('lab')) {
      return false;
    }

    return true;
  }

  /**
   * Find a suitable room for a class at its current time slot
   */
  private findSuitableRoom(state: TimetableState, entry: ScheduleEntry): string | null {
    const otherSchedule = state.schedule.filter((e) => e.classId !== entry.classId);

    const suitableRooms = state.rooms.filter((room) => {
      // Check capacity
      if (room.Capacity < entry.participants) return false;

      // Check exclusive room
      if (!canUseExclusiveRoom(room.Code, entry.className, entry.prodi)) return false;

      // Check lab requirement
      if (entry.needsLab && !room.Type.toLowerCase().includes('lab')) return false;

      // Check availability
      if (!isRoomAvailable(otherSchedule, room.Code, entry.timeSlot, entry.sks)) return false;

      return true;
    });

    if (suitableRooms.length === 0) return null;

    // Return smallest suitable room (to save larger rooms)
    suitableRooms.sort((a, b) => a.Capacity - b.Capacity);
    return suitableRooms[0].Code;
  }
}
