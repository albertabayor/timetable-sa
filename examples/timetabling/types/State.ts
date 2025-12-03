/**
 * State definition for University Course Timetabling
 *
 * This represents the complete state of a timetable solution.
 * Users can modify this to match their specific needs.
 */

import type { Room, Lecturer, TimeSlot } from './Domain.js';

/**
 * A single entry in the timetable schedule
 */
export interface ScheduleEntry {
  classId: string;              // Course code
  className: string;            // Course name
  class: string | string[];     // Class section(s)
  prodi: string;                // Study program
  lecturers: string[];          // Lecturer codes
  room: string;                 // Room code
  timeSlot: TimeSlot;          // Scheduled time slot
  sks: number;                  // Credit hours
  needsLab: boolean;           // Requires lab room
  participants: number;         // Number of students
  classType: string;           // "pagi" or "sore"
  prayerTimeAdded: number;     // Minutes added for prayer time
  isOverflowToLab?: boolean;   // Non-lab class using lab room
}

/**
 * Complete timetable state
 *
 * This is what the Simulated Annealing algorithm operates on.
 */
export interface TimetableState {
  /**
   * The current schedule - array of scheduled classes
   */
  schedule: ScheduleEntry[];

  /**
   * Available time slots for scheduling
   * Users define these based on their institutional requirements
   */
  availableTimeSlots: TimeSlot[];

  /**
   * Available rooms
   */
  rooms: Room[];

  /**
   * Available lecturers
   */
  lecturers: Lecturer[];
}
