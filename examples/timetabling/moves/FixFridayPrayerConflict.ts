/**
 * Targeted move operator: Fix Friday prayer time conflicts
 *
 * This operator specifically targets classes that overlap with Friday prayer time (11:40-13:10).
 * UPDATED: Now uses constraint-aware slot+room validation for guaranteed valid moves.
 */

import type { MoveGenerator } from 'timetable-sa';
import type { TimetableState } from '../types/index.js';
import { getValidTimeSlotAndRoomCombinationsWithPriority, calculateEndTime, isValidFridayStartTime } from '../utils/index.js';

export class FixFridayPrayerConflict implements MoveGenerator<TimetableState> {
  name = 'Fix Friday Prayer Conflict';

  // Friday prayer time window: 11:40 - 13:10
  private readonly PRAYER_START = 11 * 60 + 40;
  private readonly PRAYER_END = 13 * 60 + 10;

  /**
   * Check if a class overlaps with Friday prayer time
   */
  private overlapsWithPrayerTime(entry: any): boolean {
    if (entry.timeSlot.day !== 'Friday') {
      return false;
    }

    const [startHour, startMin] = entry.timeSlot.startTime.split(':').map(Number);
    const [endHour, endMin] = entry.timeSlot.endTime.split(':').map(Number);
    const classStart = startHour! * 60 + startMin!;
    const classEnd = endHour! * 60 + endMin!;

    return classStart < this.PRAYER_END && classEnd > this.PRAYER_START;
  }

  canApply(state: TimetableState): boolean {
    // Only apply if there are Friday violations (either invalid start time OR overlap)
    return state.schedule.some(
      (entry) =>
        (entry.timeSlot.day === 'Friday' && !isValidFridayStartTime(entry.timeSlot.startTime)) ||
        this.overlapsWithPrayerTime(entry)
    );
  }

  generate(state: TimetableState, temperature: number): TimetableState {
    // Clone state
    const newState = JSON.parse(JSON.stringify(state)) as TimetableState;

    // Find all classes violating Friday time restriction (invalid start OR overlap)
    const violatingClasses = newState.schedule.filter(
      (entry) =>
        (entry.timeSlot.day === 'Friday' && !isValidFridayStartTime(entry.timeSlot.startTime)) ||
        this.overlapsWithPrayerTime(entry)
    );

    if (violatingClasses.length === 0) {
      return newState;
    }

    // Pick one violating class randomly
    const entry = violatingClasses[Math.floor(Math.random() * violatingClasses.length)];

    // Use constraint-aware slot+room validator to get ONLY valid (time, room) combinations
    const { preferred, acceptable, all } = getValidTimeSlotAndRoomCombinationsWithPriority(newState, entry);

    // Strongly prefer moving to non-Friday days (95% chance)
    let combinationsToUse = preferred;
    if (preferred.length === 0 || (acceptable.length > 0 && Math.random() < 0.05)) {
      combinationsToUse = acceptable;
    }

    // Fallback to all if preferred/acceptable are empty
    if (combinationsToUse.length === 0 && all.length > 0) {
      combinationsToUse = all;
    }

    if (combinationsToUse.length === 0) {
      return newState; // No valid combinations available
    }

    // Pick random valid combination
    const combo = combinationsToUse[Math.floor(Math.random() * combinationsToUse.length)];

    // Calculate prayer time adjustment
    const calc = calculateEndTime(combo.timeSlot.startTime, entry.sks, combo.timeSlot.day);

    // Update BOTH time slot AND room (crucial for avoiding room conflicts!)
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
