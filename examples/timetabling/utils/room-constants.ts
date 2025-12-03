/**
 * Room type definitions and exclusive room assignments
 */

import type { ExclusiveRoomConfig } from "../types/index.js";

/**
 * Lab rooms available in the university
 */
export const LAB_ROOMS = [
  "CM-206",
  "CM-207",
  "CM-LabVirtual",
  "CM-Lab3",
  "G5-Lab1",
  "G5-Lab2",
  "G5-LabAudioVisual",
];

/**
 * Non-lab (regular) rooms available in the university
 */
export const NON_LAB_ROOMS = [
  "B2-R1",
  "B3-R1",
  "B3-R2",
  "B3R3",
  "CM-101",
  "CM-102",
  "CM-103",
  "CM-201",
  "CM-202",
  "CM-203",
  "CM-204",
  "CM-205",
  "CM-208",
  "G2-R2",
  "G2-R3",
  "G2-R4",
  "G2-R5",
  "G2-R6",
  "G2-R7",
  "G3-R1",
  "G3-R2",
  "G3-R4",
  "G4-R1",
  "G4-R2",
  "G4-R3",
  "G4-R4",
];

/**
 * Exclusive room assignments - certain rooms can only be used by specific courses/programs
 */
export const EXCLUSIVE_ROOMS: Record<string, ExclusiveRoomConfig> = {
  "G5-LabAudioVisual": {
    courses: ["Fotografi Dasar"],
    prodi: "DESAIN KOMUNIKASI VISUAL",
  },
};
