/**
 * Core type definitions for the University Course Timetabling Problem (UCTP) solver
 */

export interface Room {
  Code: string;
  Name: string;
  Type: string;
  Capacity: number;
}

export interface Lecturer {
  "Prodi Code": string;
  Code: string;
  Name: string;
  Prefered_Time: string;
  Research_Day: string;
  Transit_Time: number;
  Max_Daily_Periods: number;
  Prefered_Room: string;
}

export interface ClassRequirement {
  Prodi: string;
  Kelas: string;
  Kode_Matakuliah: string;
  Mata_Kuliah: string;
  SKS: number;
  Jenis: string;
  Peserta: number;
  Kode_Dosen1: string;
  Kode_Dosen2: string;
  Kode_Dosen_Prodi_Lain1: string;
  Kode_Dosen_Prodi_Lain2: string;
  Class_Type: string;
  should_on_the_lab: string;
  rooms: string;
}

export interface TimeSlot {
  day: string;
  startTime: string;
  endTime: string;
  period: number;
}

export interface ScheduleEntry {
  classId: string;
  className: string;
  class: string | string[];
  prodi: string;
  lecturers: string[];
  room: string;
  timeSlot: TimeSlot;
  sks: number;
  needsLab: boolean;
  participants: number;
  classType: string;
  prayerTimeAdded: number;
  isOverflowToLab?: boolean;
}

export interface Solution {
  schedule: ScheduleEntry[];
  fitness: number;
  hardViolations: number;
  softViolations: number;
  violationReport?: ViolationReport;
}

export interface ViolationReport {
  hardConstraintViolations: ConstraintViolation[];
  softConstraintViolations: ConstraintViolation[];
  summary: {
    totalHardViolations: number;
    totalSoftViolations: number;
    violationsByType: { [key: string]: number };
  };
}

export interface ConstraintViolation {
  classId: string;
  className: string;
  constraintType: string;
  reason: string;
  severity: "hard" | "soft";
  details?: any;
}

export interface OperatorStats {
  move: { attempts: number; improvements: number; successRate: number };
  swap: { attempts: number; improvements: number; successRate: number };
}

/**
 * Configuration for exclusive room assignments
 */
export interface ExclusiveRoomConfig {
  courses: string[];
  prodi?: string;
}

/**
 * Prayer time configuration
 */
export interface PrayerTime {
  start: number;
  end: number;
  duration: number;
}

/**
 * Time slot generation configuration for merge mode
 */
export interface TimeSlotGenerationConfig {
  startTime?: string;
  endTime?: string;
  slotDuration?: number;
}

/**
 * Time slot configuration (merge with defaults or full custom)
 */
export interface TimeSlotConfig {
  pagi?: TimeSlotGenerationConfig;
  sore?: TimeSlotGenerationConfig;
  days?: string[];
}

/**
 * Custom time slots (full override mode)
 */
export interface CustomTimeSlots {
  pagi?: TimeSlot[];
  sore?: TimeSlot[];
}

/**
 * Algorithm configuration options
 */
export interface AlgorithmConfig {
  initialTemperature?: number;
  minTemperature?: number;
  coolingRate?: number;
  maxIterations?: number;
  reheatingThreshold?: number;
  reheatingFactor?: number;
  maxReheats?: number;
  hardConstraintWeight?: number;
  softConstraintWeights?: SoftConstraintWeights;

  // Mode 1: Merge with defaults (partial override)
  timeSlotConfig?: TimeSlotConfig;

  // Mode 2: Full custom (100% override, ignore defaults)
  customTimeSlots?: CustomTimeSlots;

  // Constraint configuration
  constraints?: ConstraintsConfig;

  // Logging configuration
  logging?: LoggingConfig;
}

export interface SoftConstraintWeights {
  preferredTime?: number;
  preferredRoom?: number;
  transitTime?: number;
  compactness?: number;
  prayerTimeOverlap?: number;
  eveningClassPriority?: number;
  labRequirement?: number;
  overflowPenalty?: number;
}

/**
 * Custom constraint function types
 */
export type CustomHardConstraintFunction = (
  schedule: ScheduleEntry[],
  entry: ScheduleEntry,
  rooms: Map<string, Room>,
  lecturers: Map<string, Lecturer>
) => boolean;

export type CustomSoftConstraintFunction = (
  schedule: ScheduleEntry[],
  entry: ScheduleEntry,
  rooms: Map<string, Room>,
  lecturers: Map<string, Lecturer>
) => number;

/**
 * Configuration for which hard constraints to enable
 */
export interface HardConstraintsConfig {
  lecturerConflict?: boolean; // HC1
  roomConflict?: boolean; // HC2
  roomCapacity?: boolean; // HC3
  prodiConflict?: boolean; // HC5
  maxDailyPeriods?: boolean; // HC7
  classTypeTime?: boolean; // HC8
  saturdayRestriction?: boolean; // HC9
  fridayTimeRestriction?: boolean; // HC10
  prayerTimeStart?: boolean; // HC11
  exclusiveRoom?: boolean; // HC12
}

/**
 * Configuration for which soft constraints to enable
 */
export interface SoftConstraintsConfig {
  preferredTime?: boolean; // SC1
  preferredRoom?: boolean; // SC2
  transitTime?: boolean; // SC3
  compactness?: boolean; // SC4
  prayerTimeOverlap?: boolean; // SC5
  eveningClassPriority?: boolean; // SC6
  overflowPenalty?: boolean; // SC7
  researchDay?: boolean; // SC8
}

/**
 * Custom constraint definition
 */
export interface CustomConstraint {
  name: string;
  description: string;
  type: "hard" | "soft";
  weight?: number; // Only for soft constraints
  checkFunction: CustomHardConstraintFunction | CustomSoftConstraintFunction;
}

/**
 * Constraint configuration
 */
export interface ConstraintsConfig {
  hardConstraints?: HardConstraintsConfig;
  softConstraints?: SoftConstraintsConfig;
  customConstraints?: CustomConstraint[];
}

/**
 * Logging configuration
 */
export type LogLevel = "debug" | "info" | "warn" | "error" | "none";

export type LogOutput = "console" | "file" | "both";

export interface LoggingConfig {
  enabled?: boolean;
  level?: LogLevel;
  output?: LogOutput;
  filePath?: string;
  includeTimestamp?: boolean;
  includeLevel?: boolean;
}

/**
 * Input data structure for the solver
 */
export interface TimetableInput {
  rooms: Room[];
  lecturers: Lecturer[];
  classes: ClassRequirement[];
}

/**
 * Output format for timetable results
 */
export interface TimetableOutput {
  "Class ID": string;
  "Class Name": string;
  Class: string;
  Program: string;
  Lecturers: string;
  Room: string;
  "Room Type": string;
  "Is Overflow": string;
  Day: string;
  "Start Time": string;
  "End Time": string;
  SKS: number;
  "Base Duration (minutes)": number;
  "Prayer Time Added (minutes)": number;
  "Total Duration (minutes)": number;
  Participants: number;
  "Class Type": string;
  "Needs Lab": string;
}
