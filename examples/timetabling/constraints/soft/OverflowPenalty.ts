/**
 * SC7: Penalty for non-lab classes using lab rooms
 * Also checks if lab classes are in lab rooms (bonus for correct placement)
 */

import type { Constraint } from 'timetable-sa';
import type { TimetableState } from '../../types/index.js';
import { LAB_ROOMS } from '../../utils/index.js';

export class OverflowPenalty implements Constraint<TimetableState> {
  name = 'Overflow Penalty';
  type = 'soft' as const;
  weight: number;

  constructor(weight: number = 10) {
    this.weight = weight;
  }

  evaluate(state: TimetableState): number {
    const { schedule, rooms } = state;
    const roomMap = new Map(rooms.map(r => [r.Code, r]));

    let totalScore = 0;
    let count = schedule.length;

    for (const entry of schedule) {
      const room = roomMap.get(entry.room);
      const isLabRoom = room && (
        room.Type.toLowerCase().includes('lab') ||
        LAB_ROOMS.includes(room.Code)
      );

      if (entry.needsLab) {
        // Lab class should be in lab room
        if (isLabRoom) {
          totalScore += 1;
        } else {
          totalScore += 0.3; // Penalty for lab class not in lab room
        }
      } else {
        // Non-lab class
        if (entry.isOverflowToLab || isLabRoom) {
          totalScore += 0.7; // Penalty for using lab room unnecessarily
        } else {
          totalScore += 1;
        }
      }
    }

    return count > 0 ? totalScore / count : 1;
  }
}
