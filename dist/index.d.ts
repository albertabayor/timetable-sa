/**
 * ==========================================
 * SIMULATED ANNEALING FOR UTCP - ENHANCED VERSION V2
 * University Timetabling with Course Scheduling Problem
 * ==========================================
 *
 * NEW FEATURES V2:
 * - Overflow handling: Non-lab classes can use lab rooms when non-lab rooms are full
 * - Evening class optimization: Prioritize earlier start times (avoid 19:30)
 * - Exclusive room constraint: G5-LabAudioVisual only for "Fotografi Dasar" (DKV)
 * - Smart room allocation with priority system
 *
 * PREVIOUS FEATURES:
 * - Friday time restrictions (no start at 11:00, 12:00, 13:00)
 * - Prayer time handling (automatic duration extension)
 * - Evening class priority (18:30 first, then 15:30 if full)
 * - Lab room fallback to non-lab rooms
 * - Detailed constraint violation reporting
 */
interface Room {
    Code: string;
    Name: string;
    Type: string;
    Capacity: number;
}
interface Lecturer {
    "Prodi Code": string;
    Code: string;
    Name: string;
    Prefered_Time: string;
    Research_Day: string;
    Transit_Time: number;
    Max_Daily_Periods: number;
    Prefered_Room: string;
}
interface ClassRequirement {
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
interface TimeSlot {
    day: string;
    startTime: string;
    endTime: string;
    period: number;
}
interface ScheduleEntry {
    classId: string;
    className: string;
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
interface Solution {
    schedule: ScheduleEntry[];
    fitness: number;
    hardViolations: number;
    softViolations: number;
    violationReport?: ViolationReport;
}
interface ViolationReport {
    hardConstraintViolations: ConstraintViolation[];
    softConstraintViolations: ConstraintViolation[];
    summary: {
        totalHardViolations: number;
        totalSoftViolations: number;
        violationsByType: {
            [key: string]: number;
        };
    };
}
interface ConstraintViolation {
    classId: string;
    className: string;
    constraintType: string;
    reason: string;
    severity: "hard" | "soft";
    details?: any;
}
declare function loadData(filepath: string): {
    rooms: Room[];
    lecturers: Lecturer[];
    classes: ClassRequirement[];
};
declare class ConstraintChecker {
    private rooms;
    private lecturers;
    private violations;
    constructor(rooms: Room[], lecturers: Lecturer[]);
    resetViolations(): void;
    getViolations(): ConstraintViolation[];
    private addViolation;
    /**
     * HC1: No lecturer conflict
     */
    checkNoLecturerConflict(schedule: ScheduleEntry[], entry: ScheduleEntry): boolean;
    /**
     * HC2: No room conflict
     */
    checkNoRoomConflict(schedule: ScheduleEntry[], entry: ScheduleEntry): boolean;
    /**
     * HC3: Room capacity
     */
    checkRoomCapacity(entry: ScheduleEntry): boolean;
    /**
     * HC4: Lab requirement (SOFT - can fallback with penalty)
     */
    checkLabRequirement(entry: ScheduleEntry): number;
    /**
     * HC5: No class conflict same prodi
     */
    checkNoClassConflictSameProdi(schedule: ScheduleEntry[], entry: ScheduleEntry): boolean;
    /**
     * HC6: Research day
     */
    checkResearchDay(entry: ScheduleEntry): boolean;
    /**
     * HC7: Max daily periods
     */
    checkMaxDailyPeriods(schedule: ScheduleEntry[], entry: ScheduleEntry): boolean;
    /**
     * HC8: Class type time (MODIFIED - stricter evening class timing)
     */
    checkClassTypeTime(entry: ScheduleEntry): boolean;
    /**
     * HC9: Saturday restriction
     */
    checkSaturdayRestriction(entry: ScheduleEntry): boolean;
    /**
     * HC10: Friday time restriction
     */
    checkFridayTimeRestriction(entry: ScheduleEntry): boolean;
    /**
     * HC11: Not starting during prayer time
     */
    checkNotStartingDuringPrayerTime(entry: ScheduleEntry): boolean;
    /**
     * HC12: Exclusive room constraint - NEW
     */
    checkExclusiveRoomConstraint(entry: ScheduleEntry): boolean;
    /**
     * Helper: Check time overlap considering actual durations with prayer time
     */
    private isTimeOverlap;
    /**
     * SC1: Preferred time
     * Memeriksa apakah jadwal kelas sesuai dengan waktu preferensi dosen.
     * Format Prefered_Time: "HH.MM - HH.MM day, HH.MM - HH.MM day, ..."
     */
    checkPreferredTime(entry: ScheduleEntry): number;
    /**
     * SC2: Preferred room
     */
    checkPreferredRoom(entry: ScheduleEntry): number;
    /**
     * SC3: Transit time
     */
    checkTransitTime(schedule: ScheduleEntry[], entry: ScheduleEntry): number;
    /**
     * SC4: Compactness
     */
    checkCompactness(schedule: ScheduleEntry[], entry: ScheduleEntry): number;
    /**
     * SC5: Avoid prayer time overlap
     */
    checkPrayerTimeOverlap(entry: ScheduleEntry): number;
    /**
     * SC6: Evening class priority - MODIFIED: Penalize late starts (19:30)
     */
    checkEveningClassPriority(entry: ScheduleEntry): number;
    /**
     * SC7: Overflow penalty - NEW: Penalize non-lab classes using lab rooms
     */
    checkOverflowPenalty(entry: ScheduleEntry): number;
}
declare class SimulatedAnnealing {
    private rooms;
    private lecturers;
    private classes;
    private checker;
    private initialTemperature;
    private minTemperature;
    private coolingRate;
    private maxIterations;
    private hardConstraintWeight;
    private softConstraintWeights;
    constructor(rooms: Room[], lecturers: Lecturer[], classes: ClassRequirement[]);
    /**
     * Generate initial solution with smart room allocation
     */
    private generateInitialSolution;
    /**
     * Calculate fitness with violation tracking
     */
    private calculateFitness;
    /**
     * Generate neighbor solution
     */
    private generateNeighbor;
    /**
     * Acceptance probability
     */
    private acceptanceProbability;
    /**
     * Main SA algorithm
     */
    solve(): Solution;
}
export { SimulatedAnnealing, ConstraintChecker, loadData };
//# sourceMappingURL=index.d.ts.map