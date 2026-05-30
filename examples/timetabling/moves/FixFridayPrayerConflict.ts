/**
 * Targeted move operator: Fix Friday prayer time conflicts
 *
 * This operator specifically targets classes that overlap with Friday prayer time (11:40-13:10).
 * IMPROVED: Now includes push strategy to move blocking classes when no direct slot is available.
 * 
 * Strategies:
 * 1. Direct move: Find a valid non-Friday slot with available room
 * 2. Push strategy: If blocked by another class, try to move the blocker first
 * 3. Time-sensitive selection: Prefer early morning or late afternoon slots
 */

import type { MoveGenerator } from '../../../src/index.js';
import type { TimetableState, ScheduleEntry } from '../types/index.js';
import { getValidTimeSlotAndRoomCombinationsWithPriority, calculateEndTime, isValidFridayStartTime, canUseExclusiveRoom, isRoomAvailable } from '../utils/index.js';

export class FixFridayPrayerConflict implements MoveGenerator<TimetableState> {
  name = 'Fix Friday Prayer Conflict';
  targetConstraintTypes = ['hard'] as const;
  targetConstraintKeys = ['friday_time_restriction', 'no_friday_pray_conflict'];

  // Friday prayer time window: 11:40 - 13:10
  private readonly PRAYER_START = 11 * 60 + 40;
  private readonly PRAYER_END = 13 * 60 + 10;

  /**
   * Check if a class overlaps with Friday prayer time
   */
  private overlapsWithPrayerTime(entry: ScheduleEntry): boolean {
    if (entry.timeSlot.day !== 'Friday') {
      return false;
    }

    const [startHour, startMin] = entry.timeSlot.startTime.split(':').map(Number);
    const [endHour, endMin] = entry.timeSlot.endTime.split(':').map(Number);
    const classStart = startHour! * 60 + startMin!;
    const classEnd = endHour! * 60 + endMin!;

    return classStart < this.PRAYER_END && classEnd > this.PRAYER_START;
  }

  /**
   * Get all Friday-violating classes
   */
  private getViolatingClasses(state: TimetableState): ScheduleEntry[] {
    return state.schedule.filter(
      (entry) =>
        (entry.timeSlot.day === 'Friday' && !isValidFridayStartTime(entry.timeSlot.startTime)) ||
        this.overlapsWithPrayerTime(entry)
    );
  }

  canApply(state: TimetableState): boolean {
    return this.getViolatingClasses(state).length > 0;
  }

  /**
   * Get time slot priority score (prefer safe times that avoid prayer conflicts)
   * Higher score = better choice
   */
  private getSlotPriority(day: string, startTime: string): number {
    const [hour, min] = startTime.split(':').map(Number);
    const startMinutes = hour! * 60 + min!;
    
    // Strongly prefer non-Friday
    if (day !== 'Friday') {
      return 100;
    }
    
    // Friday slots: prefer early morning (before 10:00) or late afternoon (after 15:30)
    if (startMinutes < 10 * 60) {
      return 80; // Early morning Friday
    }
    if (startMinutes >= 15 * 60 + 30) {
      return 70; // Late afternoon Friday (after prayer)
    }
    
    // Avoid slots that might still overlap
    return 10;
  }

  /**
   * Find classes that could be pushed to make room for our target class
   * Returns classes that are blocking potential slots on non-Friday days
   */
  private findPushableCandidates(
    state: TimetableState,
    targetEntry: ScheduleEntry
  ): ScheduleEntry[] {
    const candidates: ScheduleEntry[] = [];
    
    // Days we want to move our target to (not Friday)
    const preferredDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday'];
    
    for (const day of preferredDays) {
      // Find classes on this day that share a lecturer with our target
      for (const other of state.schedule) {
        if (other.classId === targetEntry.classId) continue;
        if (other.timeSlot.day !== day) continue;
        
        // Check if this class shares a lecturer (would cause conflict if we moved target here)
        const sharesLecturer = targetEntry.lecturers.some(lec => other.lecturers.includes(lec));
        
        // Or if they share the same prodi (would cause prodi conflict)
        const sharesProdi = targetEntry.prodi === other.prodi;
        
        if (sharesLecturer || sharesProdi) {
          // This class might be blocking us - it's a push candidate
          candidates.push(other);
        }
      }
    }
    
    return candidates;
  }

  /**
   * Try to find a slot for a class that would free up space
   */
  private tryPushClass(
    state: TimetableState,
    classToMove: ScheduleEntry
  ): boolean {
    // Skip if this class is also a Friday violator (don't create new problems)
    if (this.overlapsWithPrayerTime(classToMove)) {
      return false;
    }
    
    // Get valid slots for the class we want to push
    const { preferred, acceptable, all } = getValidTimeSlotAndRoomCombinationsWithPriority(state, classToMove);
    
    const candidates = preferred.length > 0 ? preferred : acceptable.length > 0 ? acceptable : all;
    
    if (candidates.length === 0) {
      return false;
    }
    
    // Pick a random valid combination
    const combo = candidates[Math.floor(Math.random() * candidates.length)]!;
    
    // Apply the move
    const calc = calculateEndTime(combo.timeSlot.startTime, classToMove.sks, combo.timeSlot.day);
    
    classToMove.timeSlot = {
      period: combo.timeSlot.period,
      day: combo.timeSlot.day,
      startTime: combo.timeSlot.startTime,
      endTime: combo.timeSlot.endTime,
    };
    classToMove.room = combo.room;
    classToMove.prayerTimeAdded = calc.prayerTimeAdded;
    
    const isLabRoom = combo.roomType.toLowerCase().includes('lab');
    classToMove.isOverflowToLab = !classToMove.needsLab && isLabRoom;
    
    return true;
  }

  generate(state: TimetableState, temperature: number): TimetableState {
    // SA engine already clones state, so we work directly on the passed state

    const violatingClasses = this.getViolatingClasses(state);

    if (violatingClasses.length === 0) {
      return state;
    }

    // Pick one violating class randomly
    const entry = violatingClasses[Math.floor(Math.random() * violatingClasses.length)]!;

    // Strategy 1: Try to find a direct valid slot
    const { preferred, acceptable, all } = getValidTimeSlotAndRoomCombinationsWithPriority(state, entry);

    // Sort by priority (prefer safe time slots)
    const sortByPriority = (combos: typeof preferred) => {
      return [...combos].sort((a, b) => 
        this.getSlotPriority(b.timeSlot.day, b.timeSlot.startTime) - 
        this.getSlotPriority(a.timeSlot.day, a.timeSlot.startTime)
      );
    };

    let combinationsToUse = sortByPriority(preferred);
    
    // At high temperature, explore more; at low temperature, be more selective
    const explorationThreshold = temperature > 10000 ? 0.3 : 0.05;
    
    if (combinationsToUse.length === 0 || (acceptable.length > 0 && Math.random() < explorationThreshold)) {
      combinationsToUse = sortByPriority(acceptable);
    }

    // Fallback to all if preferred/acceptable are empty
    if (combinationsToUse.length === 0 && all.length > 0) {
      combinationsToUse = sortByPriority(all);
    }

    // Strategy 2: If no valid combinations, try push strategy
    if (combinationsToUse.length === 0) {
      // Find classes that might be blocking us
      const pushCandidates = this.findPushableCandidates(state, entry);
      
      if (pushCandidates.length > 0) {
        // Try to push one of them
        const candidateToPush = pushCandidates[Math.floor(Math.random() * pushCandidates.length)]!;
        
        const pushSucceeded = this.tryPushClass(state, candidateToPush);
        
        if (pushSucceeded) {
          // Now try again to find a slot for our target
          const { preferred: p2, acceptable: a2, all: all2 } = getValidTimeSlotAndRoomCombinationsWithPriority(state, entry);
          combinationsToUse = sortByPriority(p2.length > 0 ? p2 : a2.length > 0 ? a2 : all2);
        }
      }
    }

    if (combinationsToUse.length === 0) {
      return state; // No valid combinations available even after push
    }

    // Select from top candidates (weighted towards better priorities at low temperature)
    let selectedIndex = 0;
    if (temperature > 5000 && combinationsToUse.length > 1) {
      // At high temperature, sometimes pick non-optimal
      selectedIndex = Math.floor(Math.random() * Math.min(3, combinationsToUse.length));
    }
    
    const combo = combinationsToUse[selectedIndex]!;

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

    return state;
  }
}
