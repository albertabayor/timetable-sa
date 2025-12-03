/**
 * Excel file parser for timetabling data
 */

import XLSX from "xlsx";
import type { Room, Lecturer, ClassRequirement, TimetableInput } from "../types/index.js";

/**
 * Load timetabling data from an Excel file
 *
 * Expected sheets:
 * - ruangan: Room information
 * - dosen: Lecturer information
 * - kebutuhan_kelas: Class requirements
 *
 * @param filepath - Path to the Excel file
 * @returns Parsed timetable input data
 */
export function loadDataFromExcel(filepath: string): TimetableInput {
  const workbook = XLSX.readFile(filepath);

  const roomsSheet = workbook.Sheets["ruangan"];
  const lecturersSheet = workbook.Sheets["dosen"];
  const classesSheet = workbook.Sheets["kebutuhan_kelas"];

  if (!roomsSheet) {
    throw new Error('Excel file must contain a "ruangan" sheet');
  }
  if (!lecturersSheet) {
    throw new Error('Excel file must contain a "dosen" sheet');
  }
  if (!classesSheet) {
    throw new Error('Excel file must contain a "kebutuhan_kelas" sheet');
  }

  const rooms: Room[] = XLSX.utils.sheet_to_json(roomsSheet);
  const lecturers: Lecturer[] = XLSX.utils.sheet_to_json(lecturersSheet);
  const classes: ClassRequirement[] = XLSX.utils.sheet_to_json(classesSheet);

  return { rooms, lecturers, classes };
}
