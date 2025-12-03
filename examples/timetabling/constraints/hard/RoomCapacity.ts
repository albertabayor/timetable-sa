/**
 * HC3: Room capacity must accommodate all participants
 */

import type { Constraint } from 'timetable-sa';
import type { TimetableState } from '../../types/index.js';

export class RoomCapacity implements Constraint<TimetableState> {
  name = 'Room Capacity';
  type = 'hard' as const;

  evaluate(state: TimetableState): number {
    const { schedule, rooms } = state;
    const roomMap = new Map(rooms.map(r => [r.Code, r]));
    let violationCount = 0;

    for (const entry of schedule) {
      const room = roomMap.get(entry.room);

      if (!room) {
        violationCount++; // Room not found
        continue;
      }

      if (room.Capacity < entry.participants) {
        violationCount++; // Room too small
      }
    }

    // Return score between 0 and 1
    if (violationCount === 0) return 1;
    return 1 / (1 + violationCount);
  }

  describe(state: TimetableState): string | undefined {
    const { schedule, rooms } = state;
    const roomMap = new Map(rooms.map(r => [r.Code, r]));

    for (const entry of schedule) {
      const room = roomMap.get(entry.room);

      if (!room) {
        return `Room ${entry.room} not found for class ${entry.classId}`;
      }

      if (room.Capacity < entry.participants) {
        return `Room ${entry.room} capacity (${room.Capacity}) is less than participants (${entry.participants}) for class ${entry.classId}`;
      }
    }

    return undefined;
  }

  getViolations(state: TimetableState): string[] {
    const { schedule, rooms } = state;
    const roomMap = new Map(rooms.map(r => [r.Code, r]));
    const violations: string[] = [];

    for (const entry of schedule) {
      const room = roomMap.get(entry.room);

      if (!room) {
        violations.push(`Room ${entry.room} not found for class ${entry.classId}`);
        continue;
      }

      if (room.Capacity < entry.participants) {
        violations.push(
          `Room ${entry.room} capacity (${room.Capacity}) < participants (${entry.participants}) for class ${entry.classId}`
        );
      }
    }

    return violations;
  }
}
