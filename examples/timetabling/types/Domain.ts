/**
 * Domain-specific types for University Course Timetabling
 *
 * This is an EXAMPLE of how to define domain types for timetabling.
 * Users can modify these types to match their specific requirements.
 */

/**
 * Room/Classroom definition
 */
export interface Room {
  Code: string;
  Name: string;
  Type: string;      // e.g., "Lecture Hall", "Lab", "Seminar Room"
  Capacity: number;
}

/**
 * Lecturer/Instructor definition
 */
export interface Lecturer {
  "Prodi Code": string;
  Code: string;
  Name: string;
  Prefered_Time: string;        // e.g., "08.00 - 10.00 monday"
  Research_Day: string;         // Day reserved for research
  Transit_Time: number;         // Minutes needed between classes
  Max_Daily_Periods: number;    // Maximum teaching hours per day
  Prefered_Room: string;
}

/**
 * Class requirement/course definition
 */
export interface ClassRequirement {
  Prodi: string;                        // Study program
  Kelas: string;                        // Class section (A, B, C, etc.)
  Kode_Matakuliah: string;             // Course code
  Mata_Kuliah: string;                 // Course name
  SKS: number;                         // Credit hours
  Jenis: string;                       // Course type
  Peserta: number;                     // Number of participants
  Kode_Dosen1: string;                 // Primary lecturer code
  Kode_Dosen2: string;                 // Secondary lecturer code
  Kode_Dosen_Prodi_Lain1: string;     // External lecturer 1
  Kode_Dosen_Prodi_Lain2: string;     // External lecturer 2
  Class_Type: string;                  // "pagi" or "sore" (morning/evening)
  should_on_the_lab: string;           // "yes" or "no"
  rooms: string;                       // Preferred room
}

/**
 * Time slot definition - users can customize this!
 */
export interface TimeSlot {
  day: string;        // "Monday", "Tuesday", etc.
  startTime: string;  // "08:00", "09:30", etc.
  endTime: string;    // "10:00", "11:30", etc.
  period: number;     // Period number
}

/**
 * Prayer time configuration
 */
export interface PrayerTime {
  start: number;    // Start time in minutes from midnight
  end: number;      // End time in minutes from midnight
  duration: number; // Duration in minutes
}

/**
 * Exclusive room configuration
 */
export interface ExclusiveRoomConfig {
  courses: string[];  // List of course names that can use this room
  prodi?: string;     // Optional: restrict to specific program
}

/**
 * Input data structure for loading timetabling data
 */
export interface TimetableInput {
  rooms: Room[];
  lecturers: Lecturer[];
  classes: ClassRequirement[];
}
