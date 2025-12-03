/**
 * Move operator: Change time slot of a random class
 *
 * UPDATED: Now uses constraint-aware slot validation to only select valid slots
 */

import type { MoveGenerator } from "timetable-sa";
import type { TimetableState } from "../types/index.js";
import { getValidTimeSlotsWithPriority, calculateEndTime } from "../utils/index.js";

export class ChangeTimeSlot implements MoveGenerator<TimetableState> {
  name = "Change Time Slot";

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

    // Get constraint-aware valid slots (without room checking for more flexibility)
    const { preferred, acceptable } = getValidTimeSlotsWithPriority(newState, entry);

    // Prefer non-Friday slots (80% of time), but allow Friday if needed
    let slotsToUse = preferred;
    if (preferred.length === 0 || (acceptable.length > 0 && Math.random() < 0.2)) {
      slotsToUse = acceptable;
    }

    // Combine if both available
    if (preferred.length > 0 && acceptable.length > 0 && Math.random() < 0.8) {
      slotsToUse = preferred;
    } else if (acceptable.length > 0) {
      slotsToUse = acceptable;
    }

    if (slotsToUse.length === 0) {
      return newState; // No valid slots available
    }

    // Pick random valid time slot
    const newSlot = slotsToUse[Math.floor(Math.random() * slotsToUse.length)];

    // Calculate prayer time adjustment
    const calc = calculateEndTime(newSlot.startTime, entry.sks, newSlot.day);

    // Update time slot
    entry.timeSlot = {
      period: newSlot.period,
      day: newSlot.day,
      startTime: newSlot.startTime,
      endTime: newSlot.endTime, // Use the pre-calculated end time from validator
    };
    entry.prayerTimeAdded = calc.prayerTimeAdded;

    return newState;
  }
}
