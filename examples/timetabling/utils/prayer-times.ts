/**
 * Prayer time constants
 * Times are in minutes from midnight for easier calculation
 */

import type { PrayerTime } from "../types/index.js";

export const PRAYER_TIMES = {
  DZUHUR: { start: 11 * 60 + 40, end: 12 * 60 + 30, duration: 50 } as PrayerTime, // 11:40-12:30
  ASHAR: { start: 15 * 60, end: 15 * 60 + 30, duration: 30 } as PrayerTime, // 15:00-15:30
  MAGHRIB: { start: 18 * 60, end: 18 * 60 + 30, duration: 30 } as PrayerTime, // 18:00-18:30
} as const;
