/**
 * Move operator: Change both time slot AND room of a random class
 *
 * This is the ULTIMATE smart move operator that uses constraint-aware validation
 * to select valid (time slot, room) combinations that are guaranteed to not violate
 * any constraints.
 *
 * This operator is more powerful than changing time or room separately because it
 * can find solutions that wouldn't be possible with sequential moves.
 */

import type { MoveGenerator } from 'timetable-sa';
import type { TimetableState } from '../types/index.js';
import { getValidTimeSlotAndRoomCombinationsWithPriority, calculateEndTime } from '../utils/index.js';

export class ChangeTimeSlotAndRoom implements MoveGenerator<TimetableState> {
  name = 'Change Time Slot and Room';

  canApply(state: TimetableState): boolean {
    return state.schedule.length > 0;
  }

  generate(state: TimetableState, temperature: number): TimetableState {
    // Clone state
    const newState = JSON.parse(JSON.stringify(state)) as TimetableState;

    if (newState.schedule.length === 0) {
      return newState;
    }

    // Pick random class
    const randomIndex = Math.floor(Math.random() * newState.schedule.length);
    const entry = newState.schedule[randomIndex];

    // Get ALL valid (time slot, room) combinations
    const { preferred, acceptable, all } = getValidTimeSlotAndRoomCombinationsWithPriority(
      newState,
      entry
    );

    // Strongly prefer non-Friday slots (85% of time)
    let combinationsToUse = preferred;
    if (preferred.length === 0 || (acceptable.length > 0 && Math.random() < 0.15)) {
      combinationsToUse = acceptable;
    }

    if (combinationsToUse.length === 0) {
      // Fallback to all combinations if no preferred ones
      combinationsToUse = all;
    }

    if (combinationsToUse.length === 0) {
      return newState; // No valid combinations available
    }

    // Pick random valid combination
    const combo = combinationsToUse[Math.floor(Math.random() * combinationsToUse.length)];

    // Calculate prayer time adjustment
    const calc = calculateEndTime(combo.timeSlot.startTime, entry.sks, combo.timeSlot.day);

    // Update BOTH time slot AND room
    entry.timeSlot = {
      period: combo.timeSlot.period,
      day: combo.timeSlot.day,
      startTime: combo.timeSlot.startTime,
      endTime: combo.timeSlot.endTime,
    };
    entry.room = combo.room;
    entry.prayerTimeAdded = calc.prayerTimeAdded;

    // Update overflow status
    const isLabRoom = combo.roomType.toLowerCase().includes('lab');
    entry.isOverflowToLab = !entry.needsLab && isLabRoom;

    return newState;
  }
}
