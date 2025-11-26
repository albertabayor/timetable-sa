/**
 * ==========================================
 * SIMULATED ANNEALING FOR UTCP - ENHANCED VERSION V3
 * University Timetabling with Course Scheduling Problem
 * ==========================================
 *
 * NEW FEATURES V3:
 * - SWAP OPERATOR: Menukar jadwal dua kelas untuk mengatasi deadlock
 * - REHEATING MECHANISM: Keluar dari local minimum dengan meningkatkan temperature
 * - ADAPTIVE OPERATOR SELECTION: Memilih operator terbaik berdasarkan performa
 *
 * PREVIOUS FEATURES V2:
 * - Overflow handling: Non-lab classes can use lab rooms when non-lab rooms are full
 * - Evening class optimization: Prioritize earlier start times (avoid 19:30)
 * - Exclusive room constraint: G5-LabAudioVisual only for "Fotografi Dasar" (DKV)
 * - Smart room allocation with priority system
 *
 * PREVIOUS FEATURES V1:
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
    class: string;
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
    checkNoLecturerConflict(schedule: ScheduleEntry[], entry: ScheduleEntry): boolean;
    checkNoRoomConflict(schedule: ScheduleEntry[], entry: ScheduleEntry): boolean;
    checkRoomCapacity(entry: ScheduleEntry): boolean;
    checkLabRequirement(entry: ScheduleEntry): number;
    checkNoClassConflictSameProdi(schedule: ScheduleEntry[], entry: ScheduleEntry): boolean;
    checkResearchDay(entry: ScheduleEntry): number;
    checkMaxDailyPeriods(schedule: ScheduleEntry[], entry: ScheduleEntry): boolean;
    checkClassTypeTime(entry: ScheduleEntry): boolean;
    checkSaturdayRestriction(entry: ScheduleEntry): boolean;
    checkFridayTimeRestriction(entry: ScheduleEntry): boolean;
    checkNotStartingDuringPrayerTime(entry: ScheduleEntry): boolean;
    checkExclusiveRoomConstraint(entry: ScheduleEntry): boolean;
    private isTimeOverlap;
    checkPreferredTime(entry: ScheduleEntry): number;
    checkPreferredRoom(entry: ScheduleEntry): number;
    checkTransitTime(schedule: ScheduleEntry[], entry: ScheduleEntry): number;
    checkCompactness(schedule: ScheduleEntry[], entry: ScheduleEntry): number;
    checkPrayerTimeOverlap(entry: ScheduleEntry): number;
    checkEveningClassPriority(entry: ScheduleEntry): number;
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
    reheatingThreshold: number;
    reheatingFactor: number;
    maxReheats: number;
    private operatorStats;
    private hardConstraintWeight;
    private softConstraintWeights;
    constructor(rooms: Room[], lecturers: Lecturer[], classes: ClassRequirement[]);
    /**
     * Helper: Check if adding an entry would cause prodi conflict (HC5)
     */
    private wouldCauseProdiConflict;
    /**
     * Helper: Check if adding an entry would cause lecturer conflict (HC1)
     */
    private wouldCauseLecturerConflict;
    /**
     * Helper: Check if entry has any hard constraint violation
     * NOTE: Research Day is now SC8 (soft constraint), removed from here
     */
    private hasAnyHardViolation;
    /**
     * Generate initial solution
     */
    private generateInitialSolution;
    /**
     * Calculate fitness
     */
    private calculateFitness;
    /**
     * Helper: Get indices of classes with hard constraint violations
     */
    private getViolatingClassIndices;
    /**
     * NEW: Generate neighbor with MOVE operator (IMPROVED - targets violations)
     */
    private generateNeighborMove;
    /**
     * NEW: Generate neighbor with SWAP operator
     * Menukar timeslot dan/atau room dari dua kelas
     */
    private generateNeighborSwap;
    /**
     * NEW: Adaptive neighbor generation
     * Memilih operator berdasarkan success rate
     */
    private generateNeighbor;
    /**
     * Acceptance probability
     */
    private acceptanceProbability;
    /**
     * NEW: Acceptance probability for Phase 1 (Hard Constraints Only)
     * Much stricter - only accept if hard violations decrease or stay same
     */
    private acceptanceProbabilityPhase1;
    /**
     * Helper: Count hard violations in a solution
     */
    private countHardViolations;
    /**
     * Main SA algorithm with SWAP operator and REHEATING
     */
    solve(): Solution;
}
export { SimulatedAnnealing, ConstraintChecker, loadData };
//# sourceMappingURL=index.d.ts.map