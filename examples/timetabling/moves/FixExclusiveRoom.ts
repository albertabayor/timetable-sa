/**
 * Targeted move operator: Fix exclusive room violations.
 *
 * This operator specifically targets classes assigned to rooms they are not allowed to use
 * based on exclusive room rules.
 */

import type { MoveGenerator } from '../../../src/index.js';
import type { TimetableState, ScheduleEntry } from '../types/index.js';
import {
  calculateEndTime,
  canUseExclusiveRoom,
  getValidTimeSlotAndRoomCombinationsWithPriority,
  isRoomAvailable,
} from '../utils/index.js';

export class FixExclusiveRoom implements MoveGenerator<TimetableState> {
  name = 'Fix Exclusive Room';
  targetConstraintTypes = ['hard'] as const;
  targetConstraintKeys = ['exclusive_room'];

  private findViolatingClasses(state: TimetableState): ScheduleEntry[] {
    return state.schedule.filter(
      (entry) => !canUseExclusiveRoom(entry.room, entry.className, entry.prodi)
    );
  }

  canApply(state: TimetableState): boolean {
    return this.findViolatingClasses(state).length > 0;
  }

  private getValidRoomAtCurrentTimeslot(
    state: TimetableState,
    entry: ScheduleEntry
  ): { roomCode: string; roomType: string } | null {
    const candidates = state.rooms.filter((room) => {
      if (!canUseExclusiveRoom(room.Code, entry.className, entry.prodi)) return false;
      if (room.Capacity < entry.participants) return false;

      if (entry.needsLab && !room.Type.toLowerCase().includes('lab')) return false;

      return isRoomAvailable(state.schedule, room.Code, entry.timeSlot, entry.sks);
    });

    if (candidates.length === 0) return null;

    // Prefer the smallest adequate capacity room
    candidates.sort((a, b) => a.Capacity - b.Capacity);
    return {
      roomCode: candidates[0]!.Code,
      roomType: candidates[0]!.Type,
    };
  }

  generate(state: TimetableState, _temperature: number): TimetableState {
    const violatingClasses = this.findViolatingClasses(state);
    if (violatingClasses.length === 0) return state;

    const entry = violatingClasses[Math.floor(Math.random() * violatingClasses.length)]!;

    // Strategy 1: Keep the same timeslot, only fix room
    const roomCandidate = this.getValidRoomAtCurrentTimeslot(state, entry);
    if (roomCandidate) {
      entry.room = roomCandidate.roomCode;
      const isLabRoom = roomCandidate.roomType.toLowerCase().includes('lab');
      entry.isOverflowToLab = !entry.needsLab && isLabRoom;
      return state;
    }

    // Strategy 2: Move timeslot and room together using global validator
    const { preferred, acceptable, all } = getValidTimeSlotAndRoomCombinationsWithPriority(state, entry);
    const combinations = preferred.length > 0 ? preferred : acceptable.length > 0 ? acceptable : all;

    if (combinations.length === 0) {
      return state;
    }

    const combo = combinations[Math.floor(Math.random() * combinations.length)]!;
    const calc = calculateEndTime(combo.timeSlot.startTime, entry.sks, combo.timeSlot.day);

    entry.timeSlot = {
      period: combo.timeSlot.period,
      day: combo.timeSlot.day,
      startTime: combo.timeSlot.startTime,
      endTime: combo.timeSlot.endTime,
    };
    entry.room = combo.room;
    entry.prayerTimeAdded = calc.prayerTimeAdded;

    const isLabRoom = combo.roomType.toLowerCase().includes('lab');
    entry.isOverflowToLab = !entry.needsLab && isLabRoom;

    return state;
  }
}
