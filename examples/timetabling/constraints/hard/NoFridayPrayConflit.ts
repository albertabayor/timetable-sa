import { Constraint } from "../../../../src";
import { TimetableState } from "../../types";

/**
 * NoFridayPrayConflict: Classes cannot overlap with Friday prayer time (11:40 - 13:10)
 *
 * This checks if a class TIME RANGE overlaps with the prayer window, not just the start time.
 * Example violation: Class from 10:00-13:20 overlaps because it spans through 11:40-13:10
 */
export class NoFridayPrayConflict implements Constraint<TimetableState> {
  name = 'No Friday Pray Conflict';
  type = 'hard' as const;

  // Friday prayer time window: 11:40 - 13:10
  private readonly PRAYER_START = 11 * 60 + 40; // 11:40 in minutes
  private readonly PRAYER_END = 13 * 60 + 10;   // 13:10 in minutes

  /**
   * Check if a class overlaps with Friday prayer time
   */
  private overlapsWithPrayerTime(entry: any): boolean {
    if (entry.timeSlot.day !== 'Friday') {
      return false;
    }

    // Convert class time to minutes
    const [startHour, startMin] = entry.timeSlot.startTime.split(':').map(Number);
    const [endHour, endMin] = entry.timeSlot.endTime.split(':').map(Number);
    const classStart = startHour! * 60 + startMin!;
    const classEnd = endHour! * 60 + endMin!;

    // Check if time ranges overlap
    // Overlap occurs if: (classStart < prayerEnd) AND (classEnd >= prayerStart)
    // Use >= because classes ending AT 11:40 conflict with prayer time starting at 11:40
    return classStart < this.PRAYER_END && classEnd >= this.PRAYER_START;
  }

  evaluate(state: TimetableState): number {
    const { schedule } = state;
    let violationCount = 0;

    for (let entry of schedule) {
      if (this.overlapsWithPrayerTime(entry)) {
        violationCount++;
      }
    }

    if (violationCount === 0) return 1;
    return 1 / (1 + violationCount);
  }

  describe(state: TimetableState): string | undefined {
    const { schedule } = state;

    for (let entry of schedule) {
      if (this.overlapsWithPrayerTime(entry)) {
        return `Class ${entry.classId} (${entry.className}) overlaps with Friday prayer time (11:40-13:10). Class time: ${entry.timeSlot.startTime}-${entry.timeSlot.endTime}`;
      }
    }

    return undefined;
  }

  getViolations(state: TimetableState): string[] {
    const { schedule } = state;
    const violations: string[] = [];

    for (let entry of schedule) {
      if (this.overlapsWithPrayerTime(entry)) {
        violations.push(
          `Class ${entry.classId} (${entry.className}) overlaps with Friday prayer time (11:40-13:10). Class time: ${entry.timeSlot.startTime}-${entry.timeSlot.endTime}`
        );
      }
    }

    return violations;
  }
}