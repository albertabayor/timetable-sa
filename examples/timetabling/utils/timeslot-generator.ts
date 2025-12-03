/**
 * Time slot generation for morning (pagi) and evening (sore) classes
 */

import type { TimeSlot, TimeSlotGenerationConfig } from "../types/index.js";

export const DEFAULT_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Default configuration
export const DEFAULT_PAGI_CONFIG: Required<TimeSlotGenerationConfig> = {
  startTime: "07:30",
  endTime: "15:30", // Changed from 17:00 to avoid overlap with evening classes
  slotDuration: 50,
};

export const DEFAULT_SORE_CONFIG: Required<TimeSlotGenerationConfig> = {
  startTime: "15:30",
  endTime: "21:00",
  slotDuration: 50,
};

// Export mutable arrays (will be populated by initialization)
export let TIME_SLOTS_PAGI: TimeSlot[] = [];
export let TIME_SLOTS_SORE: TimeSlot[] = [];
export let TIME_SLOTS: TimeSlot[] = [];
export let DAYS: string[] = DEFAULT_DAYS;

/**
 * Parse time string to hours and minutes
 */
function parseTime(timeStr: string): { hour: number; minute: number } {
  const [hourStr, minuteStr] = timeStr.split(":");
  return {
    hour: parseInt(hourStr || "0", 10),
    minute: parseInt(minuteStr || "0", 10),
  };
}

/**
 * Convert time to minutes for comparison
 */
function timeToMinutes(hour: number, minute: number): number {
  return hour * 60 + minute;
}

/**
 * Generate time slots based on configuration
 */
function generateTimeSlots(
  days: string[],
  config: Required<TimeSlotGenerationConfig>,
  isEvening: boolean = false
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const start = parseTime(config.startTime);
  const end = parseTime(config.endTime);
  const endMinutes = timeToMinutes(end.hour, end.minute);

  for (const day of days) {
    let hour = start.hour;
    let minute = start.minute;
    let period = 1;

    while (true) {
      const currentMinutes = timeToMinutes(hour, minute);

      if (currentMinutes >= endMinutes) {
        break;
      }

      const startTime = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;

      let endHour = hour;
      let endMinute = minute + config.slotDuration;
      if (endMinute >= 60) {
        endHour += Math.floor(endMinute / 60);
        endMinute = endMinute % 60;
      }

      const endTimeMinutes = timeToMinutes(endHour, endMinute);
      if (endTimeMinutes > endMinutes) {
        break;
      }

      const endTime = `${endHour.toString().padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}`;

      // Special handling for prayer time breaks (preserve original logic)
      if (hour === 19 && minute === 20) break;

      const slot = { day, startTime, endTime, period };
      slots.push(slot);

      // Move to next slot
      minute = endMinute;

      // Prayer time adjustments (preserve original logic)
      if (minute === 50 && hour === 15) {
        minute -= 20;
      } else if (hour === 18 && minute === 50) {
        minute -= 20;
      }

      if (minute >= 60) {
        hour += Math.floor(minute / 60);
        minute = minute % 60;
      } else {
        hour = endHour;
      }

      period++;
    }
  }

  return slots;
}

/**
 * Initialize time slots with custom configuration
 */
export function initializeTimeSlots(
  pagiConfig?: TimeSlotGenerationConfig,
  soreConfig?: TimeSlotGenerationConfig,
  customDays?: string[]
): void {
  // Merge with defaults
  const mergedPagiConfig: Required<TimeSlotGenerationConfig> = {
    ...DEFAULT_PAGI_CONFIG,
    ...pagiConfig,
  };

  const mergedSoreConfig: Required<TimeSlotGenerationConfig> = {
    ...DEFAULT_SORE_CONFIG,
    ...soreConfig,
  };

  const daysToUse = customDays || DEFAULT_DAYS;
  DAYS = daysToUse;

  // Generate slots
  TIME_SLOTS_PAGI = generateTimeSlots(daysToUse, mergedPagiConfig, false);
  TIME_SLOTS_SORE = generateTimeSlots(daysToUse, mergedSoreConfig, true);

  // Combine slots for TIME_SLOTS (preserve original logic)
  TIME_SLOTS = [...TIME_SLOTS_PAGI];

  for (const slot of TIME_SLOTS_SORE) {
    const slotTime = parseTime(slot.startTime);
    const slotMinutes = timeToMinutes(slotTime.hour, slotTime.minute);

    // Add evening slots (18:00+) to TIME_SLOTS
    if (slotMinutes >= timeToMinutes(18, 0)) {
      TIME_SLOTS.push(slot);
    }
  }
}

/**
 * Set custom time slots directly (full override mode)
 */
export function setCustomTimeSlots(pagiSlots?: TimeSlot[], soreSlots?: TimeSlot[]): void {
  if (pagiSlots) {
    TIME_SLOTS_PAGI = pagiSlots;
  }

  if (soreSlots) {
    TIME_SLOTS_SORE = soreSlots;
  }

  // Rebuild TIME_SLOTS from custom slots
  TIME_SLOTS = [...TIME_SLOTS_PAGI];

  for (const slot of TIME_SLOTS_SORE) {
    const slotTime = parseTime(slot.startTime);
    const slotMinutes = timeToMinutes(slotTime.hour, slotTime.minute);

    if (slotMinutes >= timeToMinutes(18, 0)) {
      TIME_SLOTS.push(slot);
    }
  }
}

// Auto-initialize with defaults when module is imported
initializeTimeSlots();
