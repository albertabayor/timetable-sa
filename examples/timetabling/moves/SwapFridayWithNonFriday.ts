/**
 * Advanced move operator: Swap Friday class with non-Friday class
 *
 * This operator solves the Friday prayer conflict deadlock by swapping
 * a Friday class with a non-Friday class.
 *
 * IMPROVED:
 * 1. Primary: Swap with same-lecturer classes (guaranteed no lecturer conflict)
 * 2. Secondary: Cross-lecturer swaps (find compatible classes from any lecturer)
 * 3. Cascade: If room swap fails, aggressively search for alternative rooms
 * 4. Smart selection: Prioritize swaps that don't create new conflicts
 */

import type { MoveGenerator } from '../../../src/index.js';
import type { TimetableState, ScheduleEntry } from '../types/index.js';
import { calculateEndTime, isValidFridayStartTime, canUseExclusiveRoom, isRoomAvailable } from '../utils/index.js';

export class SwapFridayWithNonFriday implements MoveGenerator<TimetableState> {
  name = 'Swap Friday with Non-Friday';
  targetConstraintTypes = ['hard'] as const;
  targetConstraintKeys = ['friday_time_restriction', 'no_friday_pray_conflict'];

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

  /**
   * Check if a Friday time slot would violate prayer time after swap
   */
  private wouldViolateFridayPrayer(startTime: string, sks: number): boolean {
    const calc = calculateEndTime(startTime, sks, 'Friday');
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = calc.endTime.split(':').map(Number);
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

  /**
   * Check if swapping would cause lecturer conflict
   */
  private wouldCauseLecturerConflict(
    state: TimetableState,
    class1: ScheduleEntry,
    class2: ScheduleEntry,
    newTimeSlot1: { day: string; startTime: string; endTime: string },
    newTimeSlot2: { day: string; startTime: string; endTime: string }
  ): boolean {
    // Check all lecturers involved in both classes
    const allLecturers = [...new Set([...class1.lecturers, ...class2.lecturers])];
    
    for (const lecturerCode of allLecturers) {
      // Check this lecturer's other classes
      for (const other of state.schedule) {
        if (other.classId === class1.classId || other.classId === class2.classId) continue;
        if (!other.lecturers.includes(lecturerCode)) continue;
        
        // Check conflict with class1 at new position
        if (class1.lecturers.includes(lecturerCode) && other.timeSlot.day === newTimeSlot1.day) {
          if (this.timesOverlap(newTimeSlot1, other.timeSlot)) {
            return true;
          }
        }
        
        // Check conflict with class2 at new position
        if (class2.lecturers.includes(lecturerCode) && other.timeSlot.day === newTimeSlot2.day) {
          if (this.timesOverlap(newTimeSlot2, other.timeSlot)) {
            return true;
          }
        }
      }
    }
    
    return false;
  }

  /**
   * Check if two time ranges overlap
   */
  private timesOverlap(
    slot1: { day: string; startTime: string; endTime: string },
    slot2: { day: string; startTime: string; endTime: string }
  ): boolean {
    if (slot1.day !== slot2.day) return false;
    
    const [s1h, s1m] = slot1.startTime.split(':').map(Number);
    const [e1h, e1m] = slot1.endTime.split(':').map(Number);
    const [s2h, s2m] = slot2.startTime.split(':').map(Number);
    const [e2h, e2m] = slot2.endTime.split(':').map(Number);
    
    const start1 = s1h! * 60 + s1m!;
    const end1 = e1h! * 60 + e1m!;
    const start2 = s2h! * 60 + s2m!;
    const end2 = e2h! * 60 + e2m!;
    
    return start1 < end2 && end1 > start2;
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
   * More aggressive search: tries all rooms sorted by capacity
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

  /**
   * Get swap candidates - prioritized list
   */
  private getSwapCandidates(
    state: TimetableState,
    fridayClass: ScheduleEntry
  ): { sameLecturer: ScheduleEntry[]; crossLecturer: ScheduleEntry[] } {
    const sameLecturer: ScheduleEntry[] = [];
    const crossLecturer: ScheduleEntry[] = [];

    for (const entry of state.schedule) {
      // Must be non-Friday
      if (entry.timeSlot.day === 'Friday') continue;

      // Must not be the same class
      if (entry.classId === fridayClass.classId) continue;

      // Skip if the swap would cause Friday prayer violation for this class
      if (this.wouldViolateFridayPrayer(fridayClass.timeSlot.startTime, entry.sks)) {
        continue;
      }

      // Check if this class shares at least one lecturer
      const sharedLecturer = fridayClass.lecturers.some((lec) => entry.lecturers.includes(lec));

      if (sharedLecturer) {
        sameLecturer.push(entry);
      } else {
        // Cross-lecturer candidate - need to verify no conflicts would be created
        crossLecturer.push(entry);
      }
    }

    return { sameLecturer, crossLecturer };
  }

  /**
   * Attempt to perform the swap
   */
  private performSwap(
    state: TimetableState,
    fridayClass: ScheduleEntry,
    nonFridayClass: ScheduleEntry
  ): boolean {
    // Check if the swap would cause Friday prayer violation for nonFridayClass
    if (this.wouldViolateFridayPrayer(fridayClass.timeSlot.startTime, nonFridayClass.sks)) {
      return false;
    }

    // Prepare new time slots
    const newTimeSlotForFriday = {
      day: nonFridayClass.timeSlot.day,
      startTime: nonFridayClass.timeSlot.startTime,
      endTime: nonFridayClass.timeSlot.endTime,
    };
    const newTimeSlotForNonFriday = {
      day: fridayClass.timeSlot.day,
      startTime: fridayClass.timeSlot.startTime,
      endTime: fridayClass.timeSlot.endTime,
    };

    // Check for lecturer conflicts after swap
    if (this.wouldCauseLecturerConflict(state, fridayClass, nonFridayClass, newTimeSlotForFriday, newTimeSlotForNonFriday)) {
      return false;
    }

    // Check if rooms are compatible
    const fridayClassCanUseNonFridayRoom = this.canSwapRoom(
      state,
      fridayClass,
      nonFridayClass.room,
      nonFridayClass.timeSlot.day
    );

    const nonFridayClassCanUseFridayRoom = this.canSwapRoom(
      state,
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

      return true;
    }

    // If rooms incompatible, try swapping time slots and finding new rooms
    // Temporarily swap time slots
    const tempTimeSlot = { ...fridayClass.timeSlot };
    fridayClass.timeSlot = { ...nonFridayClass.timeSlot };
    nonFridayClass.timeSlot = tempTimeSlot;

    // Try to find suitable rooms for both classes at their new time slots
    const fridayClassNewRoom = this.findSuitableRoom(state, fridayClass);
    const nonFridayClassNewRoom = this.findSuitableRoom(state, nonFridayClass);

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

      return true;
    }

    // Swap failed - revert
    const revertTimeSlot = { ...fridayClass.timeSlot };
    fridayClass.timeSlot = { ...nonFridayClass.timeSlot };
    nonFridayClass.timeSlot = revertTimeSlot;

    return false;
  }

  generate(state: TimetableState, temperature: number): TimetableState {
    // SA engine already clones state, so we work directly on the passed state

    // Find all classes violating Friday constraints
    const fridayViolators = state.schedule.filter(
      (entry) =>
        (entry.timeSlot.day === 'Friday' && !isValidFridayStartTime(entry.timeSlot.startTime)) ||
        this.overlapsWithPrayerTime(entry)
    );

    if (fridayViolators.length === 0) {
      return state;
    }

    // Pick one violating Friday class
    const fridayClass = fridayViolators[Math.floor(Math.random() * fridayViolators.length)]!;

    // Get swap candidates
    const { sameLecturer, crossLecturer } = this.getSwapCandidates(state, fridayClass);

    // At high temperature, more willing to try cross-lecturer swaps
    const crossLecturerProbability = temperature > 10000 ? 0.4 : 0.1;

    // Try same-lecturer swaps first (safer)
    if (sameLecturer.length > 0 && Math.random() >= crossLecturerProbability) {
      // Shuffle and try up to 3 candidates
      const shuffled = [...sameLecturer].sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < Math.min(3, shuffled.length); i++) {
        if (this.performSwap(state, fridayClass, shuffled[i]!)) {
          return state;
        }
      }
    }

    // Try cross-lecturer swaps
    if (crossLecturer.length > 0) {
      // Shuffle and try up to 5 candidates (need more attempts since they're less likely to work)
      const shuffled = [...crossLecturer].sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < Math.min(5, shuffled.length); i++) {
        if (this.performSwap(state, fridayClass, shuffled[i]!)) {
          return state;
        }
      }
    }

    // If all swaps failed, try same-lecturer candidates that we skipped
    if (sameLecturer.length > 0) {
      const shuffled = [...sameLecturer].sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < shuffled.length; i++) {
        if (this.performSwap(state, fridayClass, shuffled[i]!)) {
          return state;
        }
      }
    }

    return state;
  }
}
