/**
 * Move operator: Change room of a random class
 */

import type { MoveGenerator } from 'timetable-sa';
import type { TimetableState } from '../types/index.js';
import { isRoomAvailable, canUseExclusiveRoom } from '../utils/index.js';

export class ChangeRoom implements MoveGenerator<TimetableState> {
  name = 'Change Room';

  canApply(state: TimetableState): boolean {
    return state.schedule.length > 0 && state.rooms.length > 0;
  }

  generate(state: TimetableState, temperature: number): TimetableState {
    // Clone state
    const newState = JSON.parse(JSON.stringify(state)) as TimetableState;

    if (newState.schedule.length === 0 || newState.rooms.length === 0) {
      return newState;
    }

    // Pick random class
    const randomIndex = Math.floor(Math.random() * newState.schedule.length);
    const entry = newState.schedule[randomIndex];

    // Filter available rooms (exclude current entry from schedule check)
    const otherSchedule = newState.schedule.filter((_, idx) => idx !== randomIndex);

    const availableRooms = newState.rooms.filter(room => {
      // Check capacity
      if (room.Capacity < entry.participants) return false;

      // Check exclusive room permissions
      if (!canUseExclusiveRoom(room.Code, entry.className, entry.prodi)) return false;

      // Check if room is available at this time
      if (!isRoomAvailable(otherSchedule, room.Code, entry.timeSlot, entry.sks)) return false;

      // Check lab requirement
      if (entry.needsLab && !room.Type.toLowerCase().includes('lab')) return false;

      return true;
    });

    // If no available rooms, return unchanged state
    if (availableRooms.length === 0) {
      return newState;
    }

    // Pick random available room
    const newRoom = availableRooms[Math.floor(Math.random() * availableRooms.length)];

    // Update room
    entry.room = newRoom.Code;

    return newState;
  }
}
