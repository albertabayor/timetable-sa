/**
 * Time calculation utilities
 */

import { PRAYER_TIMES } from "./prayer-times.js";

/**
 * Convert time string (HH:MM) to minutes from midnight
 */
export function timeToMinutes(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return hour! * 60 + minute!;
}

/**
 * Convert minutes from midnight to time string (HH:MM)
 */
export function minutesToTime(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

/**
 * Calculate prayer time overlap for a class session
 */
export function getPrayerTimeOverlap(startTime: string, sks: number, day: string): number {
  const startMinutes = timeToMinutes(startTime);
  const classMinutes = sks * 50;
  const endMinutes = startMinutes + classMinutes;

  let totalPrayerTime = 0;

  // Only add prayer time if the class STARTS before prayer END and WOULD END after prayer START
  // AND the class actually spans through significant portion of prayer time

  // DZUHUR (11:40-12:30): Only add if class significantly overlaps
  if (startMinutes < PRAYER_TIMES.DZUHUR.end && endMinutes > PRAYER_TIMES.DZUHUR.start) {
    // Only add if class would end AFTER prayer end time (12:30)
    // This prevents extending classes that naturally end before/at prayer time
    if (endMinutes <= PRAYER_TIMES.DZUHUR.end) {
      // Class ends before or at prayer end - NO extension needed
      totalPrayerTime += 0;
    } else {
      totalPrayerTime += PRAYER_TIMES.DZUHUR.duration;
    }
  }

  // ASHAR (15:00-15:30): Only add if class would span through it
  if (startMinutes < PRAYER_TIMES.ASHAR.end && endMinutes > PRAYER_TIMES.ASHAR.start) {
    if (endMinutes <= PRAYER_TIMES.ASHAR.end) {
      totalPrayerTime += 0;
    } else {
      totalPrayerTime += PRAYER_TIMES.ASHAR.duration;
    }
  }

  // MAGHRIB (18:00-18:30): Only add if class would span through it
  if (startMinutes < PRAYER_TIMES.MAGHRIB.end && endMinutes > PRAYER_TIMES.MAGHRIB.start) {
    if (endMinutes <= PRAYER_TIMES.MAGHRIB.end) {
      totalPrayerTime += 0;
    } else {
      totalPrayerTime += PRAYER_TIMES.MAGHRIB.duration;
    }
  }

  return totalPrayerTime;
}

/**
 * Calculate end time for a class including prayer time
 */
export function calculateEndTime(
  startTime: string,
  sks: number,
  day: string
): { endTime: string; prayerTimeAdded: number } {
  const startMinutes = timeToMinutes(startTime);
  const classMinutes = sks * 50;
  const prayerTimeAdded = getPrayerTimeOverlap(startTime, sks, day);
  const totalMinutes = classMinutes + prayerTimeAdded;
  const endMinutes = startMinutes + totalMinutes;

  return {
    endTime: minutesToTime(endMinutes),
    prayerTimeAdded,
  };
}

/**
 * Check if start time is valid for Friday (cannot start at 11:00, 12:00, 13:00)
 */
export function isValidFridayStartTime(startTime: string): boolean {
  // Cannot start at exactly 11:00, 12:00, or 13:00
  // But 13:20, 13:30, etc are OK!
  const prohibited = ['11:00', '11:40', '12:00', '12:30', '13:00'];
  return !prohibited.includes(startTime);
}

/**
 * Check if a class would start during prayer time
 * Classes can start AT the prayer start time (e.g., 18:00) or after prayer end time (e.g., 18:30)
 * But they cannot start DURING prayer time (e.g., 18:15)
 */
export function isStartingDuringPrayerTime(startTime: string): boolean {
  const startMinutes = timeToMinutes(startTime);

  // Check DZUHUR (11:40-12:30): cannot start between 11:40 and 12:30 (exclusive)
  if (startMinutes > PRAYER_TIMES.DZUHUR.start && startMinutes < PRAYER_TIMES.DZUHUR.end) {
    return true;
  }

  // Check ASHAR (15:00-15:30): cannot start between 15:00 and 15:30 (exclusive)
  if (startMinutes > PRAYER_TIMES.ASHAR.start && startMinutes < PRAYER_TIMES.ASHAR.end) {
    return true;
  }

  // Check MAGHRIB (18:00-18:30): cannot start between 18:00 and 18:30 (exclusive)
  if (startMinutes > PRAYER_TIMES.MAGHRIB.start && startMinutes < PRAYER_TIMES.MAGHRIB.end) {
    return true;
  }

  return false;
}
