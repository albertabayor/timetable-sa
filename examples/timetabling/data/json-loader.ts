/**
 * JSON parser for timetabling data (future support)
 */

import fs from "fs";
import type { TimetableInput } from "../types/index.js";

/**
 * Load timetabling data from a JSON file
 *
 * Expected format:
 * {
 *   "rooms": [...],
 *   "lecturers": [...],
 *   "classes": [...]
 * }
 *
 * @param filepath - Path to the JSON file
 * @returns Parsed timetable input data
 */
export function loadDataFromJSON(filepath: string): TimetableInput {
  const fileContent = fs.readFileSync(filepath, "utf-8");
  const data = JSON.parse(fileContent) as TimetableInput;

  if (!data.rooms || !Array.isArray(data.rooms)) {
    throw new Error("JSON file must contain a 'rooms' array");
  }
  if (!data.lecturers || !Array.isArray(data.lecturers)) {
    throw new Error("JSON file must contain a 'lecturers' array");
  }
  if (!data.classes || !Array.isArray(data.classes)) {
    throw new Error("JSON file must contain a 'classes' array");
  }

  return data;
}

/**
 * Load timetabling data from a raw TimetableInput object
 * Useful for API integrations
 *
 * @param data - Raw timetable input data
 * @returns Validated timetable input data
 */
export function loadDataFromObject(data: TimetableInput): TimetableInput {
  if (!data.rooms || !Array.isArray(data.rooms)) {
    throw new Error("Input data must contain a 'rooms' array");
  }
  if (!data.lecturers || !Array.isArray(data.lecturers)) {
    throw new Error("Input data must contain a 'lecturers' array");
  }
  if (!data.classes || !Array.isArray(data.classes)) {
    throw new Error("Input data must contain a 'classes' array");
  }

  return data;
}
