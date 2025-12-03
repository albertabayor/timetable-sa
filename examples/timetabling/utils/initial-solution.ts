/**
 * Generate initial timetable solution using greedy algorithm
 */

import type { TimetableState, ScheduleEntry, TimetableInput, TimeSlot } from '../types/index.js';
import { TIME_SLOTS_PAGI, TIME_SLOTS_SORE, initializeTimeSlots, calculateEndTime, timeToMinutes, hasClassOverlap } from './index.js';
import fs from 'fs';

/**
 * Check if a new entry conflicts with existing schedule
 */
function hasConflict(entry: ScheduleEntry, schedule: ScheduleEntry[]): boolean {
  for (const existing of schedule) {
    // Same day check
    if (entry.timeSlot.day !== existing.timeSlot.day) continue;

    // Time overlap check
    const calc1 = calculateEndTime(entry.timeSlot.startTime, entry.sks, entry.timeSlot.day);
    const calc2 = calculateEndTime(existing.timeSlot.startTime, existing.sks, existing.timeSlot.day);

    const start1 = timeToMinutes(entry.timeSlot.startTime);
    const end1 = timeToMinutes(calc1.endTime);
    const start2 = timeToMinutes(existing.timeSlot.startTime);
    const end2 = timeToMinutes(calc2.endTime);

    const timeOverlap = start1 < end2 && start2 < end1;
    if (!timeOverlap) continue;

    // Check conflicts
    // 1. Room conflict
    if (entry.room === existing.room) return true;

    // 2. Lecturer conflict
    for (const lecturer of entry.lecturers) {
      if (existing.lecturers.includes(lecturer)) return true;
    }

    // 3. Prodi/Class conflict
    if (entry.prodi === existing.prodi && hasClassOverlap(entry.class, existing.class)) {
      return true;
    }
  }

  return false;
}

export function generateInitialSolution(data: TimetableInput): TimetableState {
  const { rooms, lecturers, classes } = data;

  // Initialize default time slots
  initializeTimeSlots();

  const schedule: ScheduleEntry[] = [];
  const availableTimeSlots: TimeSlot[] = [...TIME_SLOTS_PAGI, ...TIME_SLOTS_SORE];

  console.log(`\nGenerating initial solution for ${classes.length} classes...`);

  let successCount = 0;
  let failCount = 0;

  for (const classReq of classes) {
    // Extract lecturer codes
    const lecturerCodes: string[] = [];
    if (classReq.Kode_Dosen1) lecturerCodes.push(classReq.Kode_Dosen1);
    if (classReq.Kode_Dosen2) lecturerCodes.push(classReq.Kode_Dosen2);
    if (classReq.Kode_Dosen_Prodi_Lain1) lecturerCodes.push(classReq.Kode_Dosen_Prodi_Lain1);
    if (classReq.Kode_Dosen_Prodi_Lain2) lecturerCodes.push(classReq.Kode_Dosen_Prodi_Lain2);

    if (lecturerCodes.length === 0) {
      console.warn(`  ⚠️  Skipping ${classReq.Kode_Matakuliah}: No lecturers on class ${classReq.Mata_Kuliah}`);
      failCount++;
      continue;
    }

    // Get class properties
    const participants = classReq.Peserta || 30;
    const needsLab = classReq.should_on_the_lab?.toLowerCase() === 'yes';
    const classType = classReq.Class_Type?.toLowerCase() || 'pagi';
    const prodi = classReq.Prodi || 'Unknown';
    const sks = classReq.SKS || 3;

    // Filter time slots
    let slots = classType === 'sore' ? [...TIME_SLOTS_SORE] : [...TIME_SLOTS_PAGI];

    // Filter Saturday for non-Magister Manajemen
    const isMM = prodi.toLowerCase().includes('magister manajemen');
    if (!isMM) {
      slots = slots.filter(s => s.day !== 'Saturday');
    }

    // NOTE: We do NOT filter Friday prayer times here anymore
    // Let SA algorithm handle this with targeted operators

    // Try to find a valid slot and room
    let placed = false;

    for (const slot of slots) {
      // Find suitable rooms
      const suitableRooms = rooms.filter(room => {
        // Check capacity
        if (room.Capacity < participants) return false;

        // Check if lab requirement matches
        if (needsLab && !room.Type.toLowerCase().includes('lab')) return false;

        return true;
      });

      if (suitableRooms.length === 0) continue;

      // Try each suitable room until find one without conflict
      let roomPlaced = false;

      for (const room of suitableRooms) {
        // Calculate end time with prayer time consideration
        const calc = calculateEndTime(slot.startTime, sks, slot.day);

        // Create schedule entry
        const entry: ScheduleEntry = {
          classId: classReq.Kode_Matakuliah,
          className: classReq.Mata_Kuliah || 'Unknown',
          class: classReq.Kelas || 'A',
          prodi: prodi,
          lecturers: lecturerCodes,
          room: room.Code,
          timeSlot: {
            period: slot.period,
            day: slot.day,
            startTime: slot.startTime,
            endTime: calc.endTime,
          },
          sks: sks,
          needsLab: needsLab,
          participants: participants,
          classType: classType,
          prayerTimeAdded: calc.prayerTimeAdded,
          isOverflowToLab: false,
        };

        // Check if this placement causes conflict
        if (!hasConflict(entry, schedule)) {
          schedule.push(entry);
          placed = true;
          roomPlaced = true;
          successCount++;
          break; // Found valid room, break room loop
        }
      }

      if (roomPlaced) break; // Found valid slot+room, break slot loop
    }

    if (!placed) {
      console.warn(`  ⚠️  Could not place ${classReq.Kode_Matakuliah}: ${classReq.Mata_Kuliah}`);
      failCount++;
    }
  }

  console.log(`\n✅ Initial solution generated:`);
  console.log(`   Successfully placed: ${successCount}/${classes.length}`);
  console.log(`   Failed to place: ${failCount}/${classes.length}\n`);

  // save the result of greedy algorithm to a json file for further analysis
  fs.writeFileSync("initial-solution.json", JSON.stringify(schedule, null, 2));

  return {
    schedule,
    availableTimeSlots,
    rooms,
    lecturers,
  };
}
