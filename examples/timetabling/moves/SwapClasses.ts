/**
 * Move operator: Swap time slots and/or rooms between two classes
 */

import type { MoveGenerator } from 'timetable-sa';
import type { TimetableState } from '../types/index.js';
import { calculateEndTime } from '../utils/index.js';

export class SwapClasses implements MoveGenerator<TimetableState> {
  name = 'Swap Classes';

  canApply(state: TimetableState): boolean {
    return state.schedule.length >= 2;
  }

  generate(state: TimetableState, temperature: number): TimetableState {
    // Clone state
    const newState = JSON.parse(JSON.stringify(state)) as TimetableState;

    if (newState.schedule.length < 2) {
      return newState;
    }

    // Pick two random classes
    const idx1 = Math.floor(Math.random() * newState.schedule.length);
    let idx2 = Math.floor(Math.random() * newState.schedule.length);

    while (idx2 === idx1) {
      idx2 = Math.floor(Math.random() * newState.schedule.length);
    }

    const entry1 = newState.schedule[idx1];
    const entry2 = newState.schedule[idx2];

    // Randomly decide what to swap
    const swapType = Math.random();

    if (swapType < 0.33) {
      // Swap time slots only
      const tempTimeSlot = entry1.timeSlot;
      entry1.timeSlot = entry2.timeSlot;
      entry2.timeSlot = tempTimeSlot;

      // Recalculate end times based on each class's SKS
      const calc1 = calculateEndTime(entry1.timeSlot.startTime, entry1.sks, entry1.timeSlot.day);
      const calc2 = calculateEndTime(entry2.timeSlot.startTime, entry2.sks, entry2.timeSlot.day);

      entry1.timeSlot.endTime = calc1.endTime;
      entry1.prayerTimeAdded = calc1.prayerTimeAdded;

      entry2.timeSlot.endTime = calc2.endTime;
      entry2.prayerTimeAdded = calc2.prayerTimeAdded;
    } else if (swapType < 0.66) {
      // Swap rooms only
      const tempRoom = entry1.room;
      entry1.room = entry2.room;
      entry2.room = tempRoom;
    } else {
      // Swap both
      const tempTimeSlot = entry1.timeSlot;
      const tempRoom = entry1.room;

      entry1.timeSlot = entry2.timeSlot;
      entry1.room = entry2.room;

      entry2.timeSlot = tempTimeSlot;
      entry2.room = tempRoom;

      // Recalculate end times based on each class's SKS
      const calc1 = calculateEndTime(entry1.timeSlot.startTime, entry1.sks, entry1.timeSlot.day);
      const calc2 = calculateEndTime(entry2.timeSlot.startTime, entry2.sks, entry2.timeSlot.day);

      entry1.timeSlot.endTime = calc1.endTime;
      entry1.prayerTimeAdded = calc1.prayerTimeAdded;

      entry2.timeSlot.endTime = calc2.endTime;
      entry2.prayerTimeAdded = calc2.prayerTimeAdded;
    }

    return newState;
  }
}
