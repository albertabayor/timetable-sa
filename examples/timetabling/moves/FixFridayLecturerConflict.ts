/**
 * Compound targeted move operator: Fix Friday prayer + lecturer conflict.
 *
 * Prioritizes Friday-violating classes that also participate in lecturer conflicts,
 * then relocates them to valid slot+room combinations.
 */

import type { MoveGenerator } from '../../../src/index.js';
import type { TimetableState, ScheduleEntry } from '../types/index.js';
import {
  calculateEndTime,
  getValidTimeSlotAndRoomCombinationsWithPriority,
  isValidFridayStartTime,
  timeToMinutes,
} from '../utils/index.js';

export class FixFridayLecturerConflict implements MoveGenerator<TimetableState> {
  name = 'Fix Friday Lecturer Conflict';
  targetConstraintTypes = ['hard'] as const;
  targetConstraintKeys = [
    'friday_time_restriction',
    'no_friday_pray_conflict',
    'no_lecturer_conflict',
  ];

  private readonly PRAYER_START = 11 * 60 + 40;
  private readonly PRAYER_END = 13 * 60 + 10;

  private overlaps(slotA: { startTime: string; endTime: string }, slotB: { startTime: string; endTime: string }): boolean {
    const startA = timeToMinutes(slotA.startTime);
    const endA = timeToMinutes(slotA.endTime);
    const startB = timeToMinutes(slotB.startTime);
    const endB = timeToMinutes(slotB.endTime);
    return startA < endB && endA > startB;
  }

  private isFridayViolation(entry: ScheduleEntry): boolean {
    if (entry.timeSlot.day !== 'Friday') return false;

    if (!isValidFridayStartTime(entry.timeSlot.startTime)) {
      return true;
    }

    const classStart = timeToMinutes(entry.timeSlot.startTime);
    const classEnd = timeToMinutes(entry.timeSlot.endTime);
    return classStart < this.PRAYER_END && classEnd >= this.PRAYER_START;
  }

  private findFridayViolations(state: TimetableState): ScheduleEntry[] {
    return state.schedule.filter((entry) => this.isFridayViolation(entry));
  }

  private findFridayViolationsWithLecturerConflicts(state: TimetableState): ScheduleEntry[] {
    const fridayViolations = this.findFridayViolations(state);
    const conflicting = new Set<ScheduleEntry>();

    for (const entry of fridayViolations) {
      for (const other of state.schedule) {
        if (other.classId === entry.classId) continue;
        if (other.timeSlot.day !== entry.timeSlot.day) continue;

        const sharesLecturer = entry.lecturers.some((lecturer) => other.lecturers.includes(lecturer));
        if (!sharesLecturer) continue;

        if (this.overlaps(entry.timeSlot, other.timeSlot)) {
          conflicting.add(entry);
          break;
        }
      }
    }

    return Array.from(conflicting);
  }

  canApply(state: TimetableState): boolean {
    return this.findFridayViolations(state).length > 0;
  }

  generate(state: TimetableState, temperature: number): TimetableState {
    const highPriority = this.findFridayViolationsWithLecturerConflicts(state);
    const candidates = highPriority.length > 0 ? highPriority : this.findFridayViolations(state);

    if (candidates.length === 0) return state;

    const target = candidates[Math.floor(Math.random() * candidates.length)]!;
    const { preferred, acceptable, all } = getValidTimeSlotAndRoomCombinationsWithPriority(state, target);

    let combinations = preferred;
    if (combinations.length === 0) {
      combinations = acceptable;
    }
    if (combinations.length === 0) {
      combinations = all;
    }
    if (combinations.length === 0) {
      return state;
    }

    // At high temp, broader exploration among top candidates; at low temp, pick stronger candidates.
    const sorted = [...combinations].sort((a, b) => {
      const aFridayPenalty = a.timeSlot.day === 'Friday' ? 1 : 0;
      const bFridayPenalty = b.timeSlot.day === 'Friday' ? 1 : 0;
      return aFridayPenalty - bFridayPenalty;
    });

    const topK = temperature > 10000 ? Math.min(5, sorted.length) : Math.min(2, sorted.length);
    const chosen = sorted[Math.floor(Math.random() * topK)]!;

    const calc = calculateEndTime(chosen.timeSlot.startTime, target.sks, chosen.timeSlot.day);

    target.timeSlot = {
      period: chosen.timeSlot.period,
      day: chosen.timeSlot.day,
      startTime: chosen.timeSlot.startTime,
      endTime: chosen.timeSlot.endTime,
    };
    target.room = chosen.room;
    target.prayerTimeAdded = calc.prayerTimeAdded;

    const isLabRoom = chosen.roomType.toLowerCase().includes('lab');
    target.isOverflowToLab = !target.needsLab && isLabRoom;

    return state;
  }
}
