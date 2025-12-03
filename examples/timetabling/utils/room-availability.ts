/**
 * Room availability checking utilities
 */

import type { Room, ClassRequirement, ScheduleEntry, TimeSlot } from "../types/index.js";
import { LAB_ROOMS, NON_LAB_ROOMS, EXCLUSIVE_ROOMS } from "./room-constants.js";
import { calculateEndTime, timeToMinutes } from "./time.js";

/**
 * Check if a course can use an exclusive room
 */
export function canUseExclusiveRoom(roomCode: string, courseName: string, prodi: string): boolean {
  const exclusiveConfig = EXCLUSIVE_ROOMS[roomCode];
  if (!exclusiveConfig) return true;

  const courseMatch = exclusiveConfig.courses.some((c) =>
    courseName.toLowerCase().includes(c.toLowerCase())
  );
  const prodiMatch = !exclusiveConfig.prodi || prodi.toLowerCase().includes(exclusiveConfig.prodi.toLowerCase());

  return courseMatch && prodiMatch;
}

/**
 * Check if a room is available at a given time slot
 */
export function isRoomAvailable(
  schedule: ScheduleEntry[],
  room: string,
  timeSlot: TimeSlot,
  sks: number
): boolean {
  for (const entry of schedule) {
    if (entry.room !== room) continue;
    if (entry.timeSlot.day !== timeSlot.day) continue;

    const calc1 = calculateEndTime(entry.timeSlot.startTime, entry.sks, entry.timeSlot.day);
    const calc2 = calculateEndTime(timeSlot.startTime, sks, timeSlot.day);

    const start1 = timeToMinutes(entry.timeSlot.startTime);
    const end1 = timeToMinutes(calc1.endTime);
    const start2 = timeToMinutes(timeSlot.startTime);
    const end2 = timeToMinutes(calc2.endTime);

    if (start1 < end2 && start2 < end1) {
      return false;
    }
  }

  return true;
}

/**
 * Get available rooms for a class at a given time slot
 * Priority order:
 * 1. Exclusive rooms (if required)
 * 2. Specific rooms from requirement
 * 3. Lab rooms for lab classes
 * 4. Non-lab rooms for non-lab classes
 * 5. Overflow to lab (non-lab classes using lab rooms)
 * 6. Any available room
 */
export function getAvailableRooms(
  allRooms: Room[],
  schedule: ScheduleEntry[],
  classReq: ClassRequirement,
  timeSlot: TimeSlot,
  participants: number,
  needsLab: boolean,
  courseName: string,
  prodi: string
): string[] {
  const sks = classReq.SKS || 3;

  // Priority 1: Exclusive room - STRICT ENFORCEMENT
  for (const [roomCode, config] of Object.entries(EXCLUSIVE_ROOMS)) {
    const courseMatch = config.courses.some((c) => courseName.toLowerCase().includes(c.toLowerCase()));
    const prodiMatch = !config.prodi || prodi.toLowerCase().includes(config.prodi.toLowerCase());

    if (courseMatch && prodiMatch) {
      const room = allRooms.find((r) => r.Code === roomCode);
      if (room && room.Capacity >= participants) {
        if (isRoomAvailable(schedule, roomCode, timeSlot, sks)) {
          return [roomCode];
        }
      }
      return [];
    }
  }

  let roomCodes: string[] = [];

  // Priority 2: Specific rooms from requirement
  if (classReq.rooms) {
    roomCodes = classReq.rooms
      .split(",")
      .map((r) => r.trim())
      .filter((r) => {
        const room = allRooms.find((room) => room.Code === r);
        if (!room || room.Capacity < participants) return false;
        return isRoomAvailable(schedule, r, timeSlot, sks);
      });
  }

  if (roomCodes.length > 0) return roomCodes;

  // Priority 3: Lab rooms for lab classes
  if (needsLab) {
    roomCodes = allRooms
      .filter((r) => {
        if (!LAB_ROOMS.includes(r.Code)) return false;
        if (r.Capacity < participants) return false;
        if (!canUseExclusiveRoom(r.Code, courseName, prodi)) return false;
        return isRoomAvailable(schedule, r.Code, timeSlot, sks);
      })
      .map((r) => r.Code);

    if (roomCodes.length > 0) return roomCodes;
  }

  // Priority 4: Non-lab rooms for non-lab classes
  if (!needsLab) {
    roomCodes = allRooms
      .filter((r) => {
        if (!NON_LAB_ROOMS.includes(r.Code)) return false;
        if (r.Capacity < participants) return false;
        return isRoomAvailable(schedule, r.Code, timeSlot, sks);
      })
      .map((r) => r.Code);

    if (roomCodes.length > 0) return roomCodes;

    // Priority 5: Overflow to lab
    roomCodes = allRooms
      .filter((r) => {
        if (!LAB_ROOMS.includes(r.Code)) return false;
        if (r.Capacity < participants) return false;
        if (!canUseExclusiveRoom(r.Code, courseName, prodi)) return false;
        return isRoomAvailable(schedule, r.Code, timeSlot, sks);
      })
      .map((r) => r.Code);

    return roomCodes;
  }

  // Priority 6: Any available room
  roomCodes = allRooms
    .filter((r) => {
      if (r.Capacity < participants) return false;
      if (!canUseExclusiveRoom(r.Code, courseName, prodi)) return false;
      return isRoomAvailable(schedule, r.Code, timeSlot, sks);
    })
    .map((r) => r.Code);

  return roomCodes;
}
