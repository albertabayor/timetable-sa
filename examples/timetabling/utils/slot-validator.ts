/**
 * Constraint-aware time slot validator
 *
 * This module provides functions to find valid time slots that don't violate any constraints.
 * This is a proactive approach to constraint satisfaction - we only generate moves that are valid.
 */

import type { TimetableState, ScheduleEntry, TimeSlot as TimeSlotType } from '../types/index.js';
import { TIME_SLOTS_PAGI, TIME_SLOTS_SORE, calculateEndTime, isValidFridayStartTime, canUseExclusiveRoom } from './index.js';

/**
 * Check if a time slot would violate Friday prayer time (11:40-13:10) overlap
 */
function wouldViolateFridayPrayer(
  day: string,
  startTime: string,
  endTime: string
): boolean {
  if (day !== 'Friday') {
    return false;
  }

  const PRAYER_START = 11 * 60 + 40; // 11:40
  const PRAYER_END = 13 * 60 + 10;   // 13:10

  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  const classStart = startHour! * 60 + startMin!;
  const classEnd = endHour! * 60 + endMin!;

  // Check if time ranges overlap
  // Use >= because classes ending AT 11:40 conflict with prayer time starting at 11:40
  return classStart < PRAYER_END && classEnd >= PRAYER_START;
}

/**
 * Check if a time slot would violate Friday time restriction (cannot start at 11:00, 12:00, 13:00)
 */
function wouldViolateFridayTimeRestriction(day: string, startTime: string): boolean {
  if (day !== 'Friday') {
    return false;
  }
  return !isValidFridayStartTime(startTime);
}

/**
 * Check if a time slot would cause lecturer conflict
 */
function wouldCauseLecturerConflict(
  state: TimetableState,
  entry: ScheduleEntry,
  newTimeSlot: TimeSlotType
): boolean {
  // Check if any lecturer has another class at this time
  for (const lecturerCode of entry.lecturers) {
    for (const other of state.schedule) {
      if (other.classId === entry.classId) continue; // Skip self

      // Check if this lecturer teaches this other class
      if (!other.lecturers.includes(lecturerCode)) continue;

      // Check if time slots overlap and on same day
      if (other.timeSlot.day === newTimeSlot.day) {
        const [otherStartH, otherStartM] = other.timeSlot.startTime.split(':').map(Number);
        const [otherEndH, otherEndM] = other.timeSlot.endTime.split(':').map(Number);
        const [newStartH, newStartM] = newTimeSlot.startTime.split(':').map(Number);
        const [newEndH, newEndM] = newTimeSlot.endTime.split(':').map(Number);

        const otherStart = otherStartH! * 60 + otherStartM!;
        const otherEnd = otherEndH! * 60 + otherEndM!;
        const newStart = newStartH! * 60 + newStartM!;
        const newEnd = newEndH! * 60 + newEndM!;

        // Check overlap
        if (newStart < otherEnd && newEnd > otherStart) {
          return true; // Conflict!
        }
      }
    }
  }

  return false;
}

/**
 * Check if a time slot would cause room conflict (if room is specified)
 */
function wouldCauseRoomConflict(
  state: TimetableState,
  entry: ScheduleEntry,
  newTimeSlot: TimeSlotType,
  newRoom?: string
): boolean {
  const roomToCheck = newRoom || entry.room;
  if (!roomToCheck) {
    return false; // No room assigned yet
  }

  // Check if any other class uses this room at this time
  for (const other of state.schedule) {
    if (other.classId === entry.classId) continue; // Skip self
    if (other.room !== roomToCheck) continue; // Different room

    // Check if time slots overlap and on same day
    if (other.timeSlot.day === newTimeSlot.day) {
      const [otherStartH, otherStartM] = other.timeSlot.startTime.split(':').map(Number);
      const [otherEndH, otherEndM] = other.timeSlot.endTime.split(':').map(Number);
      const [newStartH, newStartM] = newTimeSlot.startTime.split(':').map(Number);
      const [newEndH, newEndM] = newTimeSlot.endTime.split(':').map(Number);

      const otherStart = otherStartH! * 60 + otherStartM!;
      const otherEnd = otherEndH! * 60 + otherEndM!;
      const newStart = newStartH! * 60 + newStartM!;
      const newEnd = newEndH! * 60 + newEndM!;

      // Check overlap
      if (newStart < otherEnd && newEnd > otherStart) {
        return true; // Conflict!
      }
    }
  }

  return false;
}

/**
 * Check if a time slot would cause prodi conflict (same prodi, same time)
 */
function wouldCauseProdiConflict(
  state: TimetableState,
  entry: ScheduleEntry,
  newTimeSlot: TimeSlotType
): boolean {
  // Check if any class from same prodi has a time conflict
  for (const other of state.schedule) {
    if (other.classId === entry.classId) continue; // Skip self
    if (other.prodi !== entry.prodi) continue; // Different prodi

    // Check if time slots overlap and on same day
    if (other.timeSlot.day === newTimeSlot.day) {
      const [otherStartH, otherStartM] = other.timeSlot.startTime.split(':').map(Number);
      const [otherEndH, otherEndM] = other.timeSlot.endTime.split(':').map(Number);
      const [newStartH, newStartM] = newTimeSlot.startTime.split(':').map(Number);
      const [newEndH, newEndM] = newTimeSlot.endTime.split(':').map(Number);

      const otherStart = otherStartH! * 60 + otherStartM!;
      const otherEnd = otherEndH! * 60 + otherEndM!;
      const newStart = newStartH! * 60 + newStartM!;
      const newEnd = newEndH! * 60 + newEndM!;

      // Check overlap
      if (newStart < otherEnd && newEnd > otherStart) {
        return true; // Conflict!
      }
    }
  }

  return false;
}

/**
 * Check if using this time slot would violate max daily periods for any lecturer
 */
function wouldViolateMaxDailyPeriods(
  state: TimetableState,
  entry: ScheduleEntry,
  newTimeSlot: TimeSlotType
): boolean {
  const lecturerMap = new Map(state.lecturers.map(l => [l.Code, l]));

  for (const lecturerCode of entry.lecturers) {
    const lecturer = lecturerMap.get(lecturerCode);
    if (!lecturer || !lecturer.Max_Daily_Periods) continue;

    // Count current periods for this lecturer on the new day
    let periodsOnDay = 0;
    for (const other of state.schedule) {
      if (other.classId === entry.classId) continue; // Skip self
      if (!other.lecturers.includes(lecturerCode)) continue;
      if (other.timeSlot.day === newTimeSlot.day) {
        periodsOnDay += other.sks;
      }
    }

    // Add the periods from this class
    periodsOnDay += entry.sks;

    if (periodsOnDay > lecturer.Max_Daily_Periods) {
      return true;
    }
  }

  return false;
}

/**
 * Check if class type matches time slot
 * - Evening classes (sore): 15:30 - 17:59
 * - Morning classes (pagi): 07:00 - 15:29
 */
function wouldViolateClassTypeTime(
  classType: string,
  startTime: string
): boolean {
  const [hour, minute] = startTime.split(':').map(Number);
  const startMinutes = hour! * 60 + minute!;

  if (classType === 'sore') {
    // Evening class must start between 15:30 and 17:59
    return startMinutes < 15 * 60 + 30 || startMinutes >= 18 * 60;
  } else {
    // Morning class must start before 15:30
    return startMinutes >= 15 * 60 + 30;
  }
}

/**
 * Check if Saturday restriction is violated (only MM can have Saturday classes)
 */
function wouldViolateSaturdayRestriction(
  prodi: string,
  day: string
): boolean {
  if (day !== 'Saturday') {
    return false;
  }
  const isMM = prodi.toLowerCase().includes('magister manajemen');
  return !isMM;
}

/**
 * Check if class would start during prayer time (not at, but during)
 */
function wouldStartDuringPrayerTime(day: string, startTime: string): boolean {
  const [hour, minute] = startTime.split(':').map(Number);
  const startMinutes = hour! * 60 + minute!;

  // Prayer time windows (can start AT these times, but not DURING)
  const DZUHUR_START = 11 * 60 + 40;
  const DZUHUR_END = 13 * 60 + 10;
  const ASHAR_START = 15 * 60 + 0;
  const ASHAR_END = 15 * 60 + 30;
  const MAGHRIB_START = 18 * 60 + 0;
  const MAGHRIB_END = 18 * 60 + 30;

  // Check if starting DURING (not AT) prayer times
  if (day === 'Friday' || day === 'Monday' || day === 'Tuesday' ||
      day === 'Wednesday' || day === 'Thursday') {
    // Dzuhur
    if (startMinutes > DZUHUR_START && startMinutes < DZUHUR_END) return true;
  }

  // All days
  if (startMinutes > ASHAR_START && startMinutes < ASHAR_END) return true;
  if (startMinutes > MAGHRIB_START && startMinutes < MAGHRIB_END) return true;

  return false;
}

/**
 * Get all valid time slots for a class entry that don't violate any hard constraints
 *
 * @param state - Current timetable state
 * @param entry - The class entry to find slots for
 * @param checkRoom - Whether to check room conflicts (optional, default false by default for more flexibility)
 * @param strictMode - If false, relaxes some constraints when no slots found (default: true)
 * @returns Array of valid time slots
 */
export function getValidTimeSlots(
  state: TimetableState,
  entry: ScheduleEntry,
  checkRoom: boolean = false,
  strictMode: boolean = true
): Array<{ day: string; startTime: string; endTime: string; period: number }> {
  const validSlots: Array<{ day: string; startTime: string; endTime: string; period: number }> = [];

  // Get base time slots based on class type
  const baseSlots = entry.classType === 'sore' ? TIME_SLOTS_SORE : TIME_SLOTS_PAGI;

  for (const slot of baseSlots) {
    // Calculate end time for this class at this slot
    const calc = calculateEndTime(slot.startTime, entry.sks, slot.day);
    const endTime = calc.endTime;

    const newTimeSlot: TimeSlotType = {
      period: slot.period,
      day: slot.day,
      startTime: slot.startTime,
      endTime: endTime,
    };

    // Check all hard constraints
    let isValid = true;
    let failReason = '';

    // 1. Saturday restriction
    if (wouldViolateSaturdayRestriction(entry.prodi, slot.day)) {
      isValid = false;
      failReason = 'Saturday restriction';
    }

    // 2. Class type time match
    if (isValid && wouldViolateClassTypeTime(entry.classType, slot.startTime)) {
      isValid = false;
      failReason = 'Class type time';
    }

    // 3. Friday time restriction (start time)
    if (isValid && wouldViolateFridayTimeRestriction(slot.day, slot.startTime)) {
      isValid = false;
      failReason = 'Friday time restriction';
    }

    // 4. Friday prayer overlap
    if (isValid && wouldViolateFridayPrayer(slot.day, slot.startTime, endTime)) {
      isValid = false;
      failReason = 'Friday prayer overlap';
    }

    // 5. Prayer time start
    if (isValid && wouldStartDuringPrayerTime(slot.day, slot.startTime)) {
      isValid = false;
      failReason = 'Prayer time start';
    }

    // 6. Lecturer conflict
    if (isValid && wouldCauseLecturerConflict(state, entry, newTimeSlot)) {
      isValid = false;
      failReason = 'Lecturer conflict';
    }

    // 7. Room conflict (optional)
    if (isValid && checkRoom && wouldCauseRoomConflict(state, entry, newTimeSlot)) {
      isValid = false;
      failReason = 'Room conflict';
    }

    // 8. Prodi conflict
    if (isValid && wouldCauseProdiConflict(state, entry, newTimeSlot)) {
      isValid = false;
      failReason = 'Prodi conflict';
    }

    // 9. Max daily periods
    if (isValid && wouldViolateMaxDailyPeriods(state, entry, newTimeSlot)) {
      isValid = false;
      failReason = 'Max daily periods';
    }

    // DEBUG: Log why Friday 13:20 fails (if it does)
    if (!isValid && slot.day === 'Friday' && slot.startTime === '13:20') {
      // Temporary debug - will be visible in console
      if (typeof process !== 'undefined' && process.env.DEBUG_VALIDATOR) {
        console.log(`❌ Friday 13:20 filtered out: ${failReason}`);
      }
    }

    // If passed all checks, add to valid slots
    if (isValid) {
      validSlots.push({
        day: slot.day,
        startTime: slot.startTime,
        endTime: endTime,
        period: slot.period,
      });
    }
  }

  // FALLBACK: If no valid slots found and not in strict mode, relax some constraints
  if (validSlots.length === 0 && !strictMode) {
    // Try again with relaxed constraints (allow some conflicts but avoid critical ones)
    for (const slot of baseSlots) {
      const calc = calculateEndTime(slot.startTime, entry.sks, slot.day);
      const endTime = calc.endTime;

      const newTimeSlot: TimeSlotType = {
        period: slot.period,
        day: slot.day,
        startTime: slot.startTime,
        endTime: endTime,
      };

      // Only check critical constraints
      let isValid = true;

      // Must check: Saturday, class type, Friday prayer overlap
      if (wouldViolateSaturdayRestriction(entry.prodi, slot.day)) isValid = false;
      if (isValid && wouldViolateClassTypeTime(entry.classType, slot.startTime)) isValid = false;
      if (isValid && wouldViolateFridayPrayer(slot.day, slot.startTime, endTime)) isValid = false;
      if (isValid && wouldViolateFridayTimeRestriction(slot.day, slot.startTime)) isValid = false;

      if (isValid) {
        validSlots.push({
          day: slot.day,
          startTime: slot.startTime,
          endTime: endTime,
          period: slot.period,
        });
      }
    }
  }

  return validSlots;
}

/**
 * Get valid time slots with prioritization
 *
 * Returns slots grouped by priority:
 * - preferred: Slots on non-Friday days (safer, fewer restrictions)
 * - acceptable: Valid Friday slots
 *
 * @param state - Current timetable state
 * @param entry - The class entry to find slots for
 * @returns Object with preferred and acceptable slots
 */
export function getValidTimeSlotsWithPriority(
  state: TimetableState,
  entry: ScheduleEntry
): {
  preferred: Array<{ day: string; startTime: string; endTime: string; period: number }>;
  acceptable: Array<{ day: string; startTime: string; endTime: string; period: number }>;
  all: Array<{ day: string; startTime: string; endTime: string; period: number }>;
} {
  // Don't check room conflicts for more flexibility
  const allValid = getValidTimeSlots(state, entry, false, true);

  const preferred = allValid.filter(slot => slot.day !== 'Friday');
  const acceptable = allValid.filter(slot => slot.day === 'Friday');

  return {
    preferred,
    acceptable,
    all: allValid,
  };
}

/**
 * Get valid time slot + room combinations
 *
 * This is the ULTIMATE constraint-aware function that returns combinations of
 * time slots and rooms that are guaranteed to be valid.
 *
 * @param state - Current timetable state
 * @param entry - The class entry to find slots for
 * @returns Array of valid {timeSlot, room} combinations
 */
export function getValidTimeSlotAndRoomCombinations(
  state: TimetableState,
  entry: ScheduleEntry
): Array<{
  timeSlot: { day: string; startTime: string; endTime: string; period: number };
  room: string;
  roomType: string;
  capacity: number;
}> {
  const validCombinations: Array<{
    timeSlot: { day: string; startTime: string; endTime: string; period: number };
    room: string;
    roomType: string;
    capacity: number;
  }> = [];

  // Get all valid time slots first
  const validTimeSlots = getValidTimeSlots(state, entry, false); // Don't check room conflicts yet

  // For each valid time slot, find available rooms
  for (const timeSlot of validTimeSlots) {
    // Filter suitable rooms
    const suitableRooms = state.rooms.filter(room => {
      // 1. Check capacity
      if (room.Capacity < entry.participants) return false;

      // 2. Check if lab requirement matches
      if (entry.needsLab && !room.Type.toLowerCase().includes('lab')) return false;

      // 3. Check if room is available at this time slot (no conflict)
      const hasConflict = state.schedule.some(other => {
        if (other.classId === entry.classId) return false; // Skip self
        if (other.room !== room.Code) return false; // Different room

        // Check if time slots overlap on same day
        if (other.timeSlot.day !== timeSlot.day) return false;

        const [otherStartH, otherStartM] = other.timeSlot.startTime.split(':').map(Number);
        const [otherEndH, otherEndM] = other.timeSlot.endTime.split(':').map(Number);
        const [newStartH, newStartM] = timeSlot.startTime.split(':').map(Number);
        const [newEndH, newEndM] = timeSlot.endTime.split(':').map(Number);

        const otherStart = otherStartH! * 60 + otherStartM!;
        const otherEnd = otherEndH! * 60 + otherEndM!;
        const newStart = newStartH! * 60 + newStartM!;
        const newEnd = newEndH! * 60 + newEndM!;

        return newStart < otherEnd && newEnd > otherStart;
      });

      if (hasConflict) return false;

      // 4. Check exclusive room constraints (if applicable)
      if (!canUseExclusiveRoom(room.Code, entry.className, entry.prodi)) {
        return false;
      }

      return true;
    });

    // Add all combinations of this time slot with suitable rooms
    for (const room of suitableRooms) {
      validCombinations.push({
        timeSlot: {
          day: timeSlot.day,
          startTime: timeSlot.startTime,
          endTime: timeSlot.endTime,
          period: timeSlot.period,
        },
        room: room.Code,
        roomType: room.Type,
        capacity: room.Capacity,
      });
    }
  }

  return validCombinations;
}

/**
 * Get valid time slot + room combinations with prioritization
 *
 * Returns combinations grouped by priority:
 * - preferred: Non-Friday time slots with available rooms
 * - acceptable: Friday time slots with available rooms
 *
 * @param state - Current timetable state
 * @param entry - The class entry to find slots for
 * @returns Object with preferred and acceptable combinations
 */
export function getValidTimeSlotAndRoomCombinationsWithPriority(
  state: TimetableState,
  entry: ScheduleEntry
): {
  preferred: Array<{
    timeSlot: { day: string; startTime: string; endTime: string; period: number };
    room: string;
    roomType: string;
    capacity: number;
  }>;
  acceptable: Array<{
    timeSlot: { day: string; startTime: string; endTime: string; period: number };
    room: string;
    roomType: string;
    capacity: number;
  }>;
  all: Array<{
    timeSlot: { day: string; startTime: string; endTime: string; period: number };
    room: string;
    roomType: string;
    capacity: number;
  }>;
} {
  const allCombinations = getValidTimeSlotAndRoomCombinations(state, entry);

  const preferred = allCombinations.filter(combo => combo.timeSlot.day !== 'Friday');
  const acceptable = allCombinations.filter(combo => combo.timeSlot.day === 'Friday');

  return {
    preferred,
    acceptable,
    all: allCombinations,
  };
}

/**
 * Check if a specific time slot would be valid for a class
 *
 * @param state - Current timetable state
 * @param entry - The class entry
 * @param timeSlot - The time slot to check
 * @returns true if valid, false otherwise
 */
export function isTimeSlotValid(
  state: TimetableState,
  entry: ScheduleEntry,
  timeSlot: TimeSlotType
): boolean {
  // Run all constraint checks
  if (wouldViolateSaturdayRestriction(entry.prodi, timeSlot.day)) return false;
  if (wouldViolateClassTypeTime(entry.classType, timeSlot.startTime)) return false;
  if (wouldViolateFridayTimeRestriction(timeSlot.day, timeSlot.startTime)) return false;
  if (wouldViolateFridayPrayer(timeSlot.day, timeSlot.startTime, timeSlot.endTime)) return false;
  if (wouldStartDuringPrayerTime(timeSlot.day, timeSlot.startTime)) return false;
  if (wouldCauseLecturerConflict(state, entry, timeSlot)) return false;
  if (wouldCauseRoomConflict(state, entry, timeSlot)) return false;
  if (wouldCauseProdiConflict(state, entry, timeSlot)) return false;
  if (wouldViolateMaxDailyPeriods(state, entry, timeSlot)) return false;

  return true;
}
