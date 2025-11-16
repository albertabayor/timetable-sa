"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConstraintChecker = exports.SimulatedAnnealing = void 0;
exports.loadData = loadData;
const fs_1 = __importDefault(require("fs"));
const XLSX = __importStar(require("xlsx"));
// ============================================
// CONSTANTS
// ============================================
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
// Prayer times (in minutes from midnight for easier calculation)
const PRAYER_TIMES = {
    DZUHUR: { start: 11 * 60 + 40, end: 12 * 60 + 30, duration: 50 }, // 11:40-12:30
    ASHAR: { start: 15 * 60, end: 15 * 60 + 30, duration: 30 }, // 15:00-15:30
    MAGHRIB: { start: 18 * 60, end: 18 * 60 + 30, duration: 30 }, // 18:00-18:30
};
// Lab rooms
const LAB_ROOMS = ["CM-206", "CM-207", "CM-LabVirtual", "CM-Lab3", "G5-Lab1", "G5-Lab2", "G5-LabAudioVisual"];
// Non-lab rooms (primary rooms for regular classes)
const NON_LAB_ROOMS = [
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
    "G3-R3",
    "G3-R4",
    "G4-R1",
    "G4-R2",
    "G4-R3",
    "G4-R4",
];
// Exclusive room assignments - NEW
const EXCLUSIVE_ROOMS = {
    "G5-LabAudioVisual": {
        courses: ["Fotografi Dasar"],
        prodi: "DKV",
    },
};
const TIME_SLOTS_PAGI = [];
const TIME_SLOTS_SORE = [];
const TIME_SLOTS = [];
// Generate time slots for PAGI (07:30 - 17:00)
for (let day of DAYS) {
    let hour = 7;
    let minute = 30;
    let period = 1;
    while (hour < 17 || (hour === 17 && minute === 0)) {
        const startTime = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        // Add 50 minutes for class period
        let endHour = hour;
        let endMinute = minute + 50;
        if (endMinute >= 60) {
            endHour += Math.floor(endMinute / 60);
            endMinute = endMinute % 60;
        }
        const endTime = `${endHour.toString().padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}`;
        if (hour === 19 && minute === 20)
            break;
        const slot = { day, startTime, endTime, period };
        TIME_SLOTS_PAGI.push(slot);
        TIME_SLOTS.push(slot);
        minute = endMinute;
        if (minute === 50 && hour === 15) {
            minute -= 20; // Adjust to 15:30 for SORE
        }
        else if (hour === 18 && minute === 50) {
            minute -= 20; // Adjust to 18:30 for SORE
        }
        if (minute >= 60) {
            hour += Math.floor(minute / 60);
            minute = minute % 60;
        }
        else {
            hour = endHour;
        }
        period++;
    }
}
// Generate time slots for SORE (15:30 - 21:00) - NEW: Start from 15:30 for flexibility
for (let day of DAYS) {
    let hour = 15;
    let minute = 30;
    let period = 1;
    while (hour < 21 || (hour === 21 && minute === 0)) {
        const startTime = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        // Add 50 minutes for class period
        let endHour = hour;
        let endMinute = minute + 50;
        if (endMinute >= 60) {
            endHour += Math.floor(endMinute / 60);
            endMinute = endMinute % 60;
        }
        // Stop if end time exceeds 21:00
        if (endHour > 21 || (endHour === 21 && endMinute > 0)) {
            break;
        }
        if (hour === 19 && minute === 20)
            break;
        const endTime = `${endHour.toString().padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}`;
        const slot = { day, startTime, endTime, period };
        TIME_SLOTS_SORE.push(slot);
        // Only add to TIME_SLOTS if >= 18:30 (avoid duplicate with PAGI)
        if (hour >= 18 || (hour === 18 && minute >= 30)) {
            TIME_SLOTS.push(slot);
        }
        minute = endMinute;
        if (minute === 50 && hour === 15) {
            minute -= 20; // Adjust to 15:30 for SORE
        }
        else if (hour === 18 && minute === 50) {
            minute -= 20; // Adjust to 18:30 for SORE
        }
        if (minute >= 60) {
            hour += Math.floor(minute / 60);
            minute = minute % 60;
        }
        else {
            hour = endHour;
        }
        period++;
    }
}
// ============================================
// HELPER FUNCTIONS
// ============================================
/**
 * Convert time string to minutes from midnight
 */
function timeToMinutes(time) {
    const [hour, minute] = time.split(":").map(Number);
    return hour * 60 + minute;
}
/**
 * Convert minutes from midnight to time string
 */
function minutesToTime(minutes) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}
/**
 * Check if a time range overlaps with prayer time
 * Returns the prayer time duration to add (0 if no overlap)
 */
function getPrayerTimeOverlap(startTime, sks, day) {
    const startMinutes = timeToMinutes(startTime);
    const classMinutes = sks * 50; // without prayer time
    const endMinutes = startMinutes + classMinutes;
    let totalPrayerTime = 0;
    // Check Dzuhur (11:40-12:30) - 50 minutes
    if (startMinutes < PRAYER_TIMES.DZUHUR.end && endMinutes > PRAYER_TIMES.DZUHUR.start) {
        totalPrayerTime += PRAYER_TIMES.DZUHUR.duration;
    }
    // Check Ashar (15:00-15:30) - 30 minutes
    if (startMinutes < PRAYER_TIMES.ASHAR.end && endMinutes > PRAYER_TIMES.ASHAR.start) {
        totalPrayerTime += PRAYER_TIMES.ASHAR.duration;
    }
    // Check Maghrib (18:00-18:30) - 30 minutes
    if (startMinutes < PRAYER_TIMES.MAGHRIB.end && endMinutes > PRAYER_TIMES.MAGHRIB.start) {
        totalPrayerTime += PRAYER_TIMES.MAGHRIB.duration;
    }
    return totalPrayerTime;
}
/**
 * Calculate actual end time based on SKS and prayer times
 */
function calculateEndTime(startTime, sks, day) {
    const startMinutes = timeToMinutes(startTime);
    // Calculate class duration without prayer time
    const classMinutes = sks * 50;
    // Check for prayer time overlaps
    const prayerTimeAdded = getPrayerTimeOverlap(startTime, sks, day);
    // Total duration including prayer time
    const totalMinutes = classMinutes + prayerTimeAdded;
    const endMinutes = startMinutes + totalMinutes;
    return {
        endTime: minutesToTime(endMinutes),
        prayerTimeAdded,
    };
}
/**
 * Check if a start time is valid for Friday
 */
function isValidFridayStartTime(startTime) {
    const hour = parseInt(startTime.split(":")[0]);
    // Cannot start at 11:00, 12:00, or 13:00
    return !(hour === 11 || hour === 12 || hour === 13);
}
/**
 * Check if start time is during prayer time (not allowed)
 */
function isStartingDuringPrayerTime(startTime) {
    const startMinutes = timeToMinutes(startTime);
    // Check if starting exactly during prayer times
    if (startMinutes >= PRAYER_TIMES.DZUHUR.start && startMinutes < PRAYER_TIMES.DZUHUR.end) {
        return true;
    }
    if (startMinutes >= PRAYER_TIMES.ASHAR.start && startMinutes < PRAYER_TIMES.ASHAR.end) {
        return true;
    }
    if (startMinutes >= PRAYER_TIMES.MAGHRIB.start && startMinutes < PRAYER_TIMES.MAGHRIB.end) {
        return true;
    }
    return false;
}
/**
 * Check if a class can use exclusive room - NEW
 */
function canUseExclusiveRoom(roomCode, courseName, prodi) {
    const exclusiveConfig = EXCLUSIVE_ROOMS[roomCode];
    if (!exclusiveConfig)
        return true; // Not an exclusive room
    // Check if course matches
    const courseMatch = exclusiveConfig.courses.some((c) => courseName.toLowerCase().includes(c.toLowerCase()));
    // Check if prodi matches (if specified)
    const prodiMatch = !exclusiveConfig.prodi || prodi.toLowerCase().includes(exclusiveConfig.prodi.toLowerCase());
    return courseMatch && prodiMatch;
}
/**
 * Check if room is available at given time - NEW
 */
function isRoomAvailable(schedule, room, timeSlot, sks) {
    for (const entry of schedule) {
        if (entry.room !== room)
            continue;
        if (entry.timeSlot.day !== timeSlot.day)
            continue;
        const calc1 = calculateEndTime(entry.timeSlot.startTime, entry.sks, entry.timeSlot.day);
        const calc2 = calculateEndTime(timeSlot.startTime, sks, timeSlot.day);
        const start1 = timeToMinutes(entry.timeSlot.startTime);
        const end1 = timeToMinutes(calc1.endTime);
        const start2 = timeToMinutes(timeSlot.startTime);
        const end2 = timeToMinutes(calc2.endTime);
        if (start1 < end2 && start2 < end1) {
            return false; // Overlap found
        }
    }
    return true; // Room is available
}
/**
 * Get available rooms with smart allocation - NEW
 */
function getAvailableRooms(allRooms, schedule, classReq, timeSlot, participants, needsLab, courseName, prodi) {
    const sks = classReq.SKS || 3;
    // Priority 1: Check if exclusive room requirement
    for (const [roomCode, config] of Object.entries(EXCLUSIVE_ROOMS)) {
        if (canUseExclusiveRoom(roomCode, courseName, prodi)) {
            const room = allRooms.find((r) => r.Code === roomCode);
            if (room && room.Capacity >= participants) {
                if (isRoomAvailable(schedule, roomCode, timeSlot, sks)) {
                    return [roomCode]; // Exclusive match
                }
            }
        }
    }
    // Get room capacity requirements
    let roomCodes = [];
    // Priority 2: Check specific rooms from class requirement
    if (classReq.rooms) {
        roomCodes = classReq.rooms
            .split(",")
            .map((r) => r.trim())
            .filter((r) => {
            const room = allRooms.find((room) => room.Code === r);
            if (!room || room.Capacity < participants)
                return false;
            // Check if room is available at this time
            return isRoomAvailable(schedule, r, timeSlot, sks);
        });
    }
    if (roomCodes.length > 0)
        return roomCodes;
    // Priority 3: For lab classes, get lab rooms first
    if (needsLab) {
        roomCodes = allRooms
            .filter((r) => {
            if (!LAB_ROOMS.includes(r.Code))
                return false;
            if (r.Capacity < participants)
                return false;
            // Skip exclusive rooms that don't match
            if (!canUseExclusiveRoom(r.Code, courseName, prodi))
                return false;
            // Check availability
            return isRoomAvailable(schedule, r.Code, timeSlot, sks);
        })
            .map((r) => r.Code);
        if (roomCodes.length > 0)
            return roomCodes;
    }
    // Priority 4: For non-lab classes, get non-lab rooms
    if (!needsLab) {
        roomCodes = allRooms
            .filter((r) => {
            if (!NON_LAB_ROOMS.includes(r.Code))
                return false;
            if (r.Capacity < participants)
                return false;
            // Check availability
            return isRoomAvailable(schedule, r.Code, timeSlot, sks);
        })
            .map((r) => r.Code);
        if (roomCodes.length > 0)
            return roomCodes;
        // Priority 5: OVERFLOW - Non-lab classes can use lab rooms if non-lab rooms are full
        roomCodes = allRooms
            .filter((r) => {
            if (!LAB_ROOMS.includes(r.Code))
                return false;
            if (r.Capacity < participants)
                return false;
            // Skip exclusive rooms that don't match
            if (!canUseExclusiveRoom(r.Code, courseName, prodi))
                return false;
            // Check availability
            return isRoomAvailable(schedule, r.Code, timeSlot, sks);
        })
            .map((r) => r.Code);
        return roomCodes; // May use lab as overflow
    }
    // Priority 6: Last resort - any available room with capacity
    roomCodes = allRooms
        .filter((r) => {
        if (r.Capacity < participants)
            return false;
        if (!canUseExclusiveRoom(r.Code, courseName, prodi))
            return false;
        return isRoomAvailable(schedule, r.Code, timeSlot, sks);
    })
        .map((r) => r.Code);
    return roomCodes;
}
// ============================================
// DATA LOADING
// ============================================
function loadData(filepath) {
    const workbook = XLSX.readFile(filepath);
    const roomsSheet = workbook.Sheets["ruangan"];
    const lecturersSheet = workbook.Sheets["dosen"];
    const classesSheet = workbook.Sheets["kebutuhan_kelas"];
    const rooms = XLSX.utils.sheet_to_json(roomsSheet);
    const lecturers = XLSX.utils.sheet_to_json(lecturersSheet);
    const classes = XLSX.utils.sheet_to_json(classesSheet);
    return { rooms, lecturers, classes };
}
// ============================================
// CONSTRAINT CHECKING FUNCTIONS
// ============================================
class ConstraintChecker {
    rooms;
    lecturers;
    violations = [];
    constructor(rooms, lecturers) {
        this.rooms = new Map(rooms.map((r) => [r.Code, r]));
        this.lecturers = new Map(lecturers.map((l) => [l.Code, l]));
    }
    resetViolations() {
        this.violations = [];
    }
    getViolations() {
        return this.violations;
    }
    addViolation(violation) {
        this.violations.push(violation);
    }
    // ============================================
    // HARD CONSTRAINTS
    // ============================================
    /**
     * HC1: No lecturer conflict
     */
    checkNoLecturerConflict(schedule, entry) {
        for (const existing of schedule) {
            if (this.isTimeOverlap(existing, entry)) {
                for (const lecturer of entry.lecturers) {
                    if (existing.lecturers.includes(lecturer)) {
                        this.addViolation({
                            classId: entry.classId,
                            className: entry.className,
                            constraintType: "HC1: Lecturer Conflict",
                            reason: `Lecturer ${lecturer} has conflict with class ${existing.classId} on ${entry.timeSlot.day} at ${entry.timeSlot.startTime}`,
                            severity: "hard",
                            details: { conflictsWith: existing.classId, lecturer },
                        });
                        return false;
                    }
                }
            }
        }
        return true;
    }
    /**
     * HC2: No room conflict
     */
    checkNoRoomConflict(schedule, entry) {
        for (const existing of schedule) {
            if (existing.room === entry.room && this.isTimeOverlap(existing, entry)) {
                this.addViolation({
                    classId: entry.classId,
                    className: entry.className,
                    constraintType: "HC2: Room Conflict",
                    reason: `Room ${entry.room} is already occupied by class ${existing.classId} on ${entry.timeSlot.day} at ${entry.timeSlot.startTime}`,
                    severity: "hard",
                    details: { conflictsWith: existing.classId, room: entry.room },
                });
                return false;
            }
        }
        return true;
    }
    /**
     * HC3: Room capacity
     */
    checkRoomCapacity(entry) {
        const room = this.rooms.get(entry.room);
        if (!room) {
            this.addViolation({
                classId: entry.classId,
                className: entry.className,
                constraintType: "HC3: Room Capacity",
                reason: `Room ${entry.room} not found`,
                severity: "hard",
            });
            return false;
        }
        if (room.Capacity < entry.participants) {
            this.addViolation({
                classId: entry.classId,
                className: entry.className,
                constraintType: "HC3: Room Capacity",
                reason: `Room ${entry.room} capacity (${room.Capacity}) is less than participants (${entry.participants})`,
                severity: "hard",
                details: { roomCapacity: room.Capacity, participants: entry.participants },
            });
            return false;
        }
        return true;
    }
    /**
     * HC4: Lab requirement (SOFT - can fallback with penalty)
     */
    checkLabRequirement(entry) {
        if (!entry.needsLab) {
            // Non-lab class
            if (LAB_ROOMS.includes(entry.room)) {
                // Using lab room for non-lab class (overflow scenario)
                return 0.7; // Small penalty but acceptable
            }
            return 1; // Perfect - non-lab in non-lab room
        }
        const room = this.rooms.get(entry.room);
        if (!room)
            return 0;
        // Lab class - check if it's in lab room
        if (room.Type.toLowerCase().includes("lab") || LAB_ROOMS.includes(room.Code)) {
            return 1; // Perfect! Lab class in lab room
        }
        // Lab class not in lab room - bigger penalty
        return 0.3;
    }
    /**
     * HC5: No class conflict same prodi
     */
    checkNoClassConflictSameProdi(schedule, entry) {
        for (const existing of schedule) {
            if (existing.prodi === entry.prodi && this.isTimeOverlap(existing, entry)) {
                this.addViolation({
                    classId: entry.classId,
                    className: entry.className,
                    constraintType: "HC5: Prodi Conflict",
                    reason: `Same program (${entry.prodi}) has class ${existing.classId} at the same time on ${entry.timeSlot.day}`,
                    severity: "hard",
                    details: { conflictsWith: existing.classId, prodi: entry.prodi },
                });
                return false;
            }
        }
        return true;
    }
    /**
     * HC6: Research day
     */
    checkResearchDay(entry) {
        for (const lecturerCode of entry.lecturers) {
            const lecturer = this.lecturers.get(lecturerCode);
            if (lecturer && lecturer.Research_Day) {
                const researchDay = lecturer.Research_Day.trim();
                // console.dir(lecturer, { depth: null });
                if (researchDay && entry.timeSlot.day === researchDay || researchDay.includes(entry.timeSlot.day)) {
                    console.dir(lecturer, { depth: null });
                    console.log(`${researchDay} && ${entry.timeSlot.day} === ${researchDay}`);
                    console.log(`result is = ${researchDay && entry.timeSlot.day === researchDay || researchDay.includes(entry.timeSlot.day)}`);
                    this.addViolation({
                        classId: entry.classId,
                        className: entry.className,
                        constraintType: "HC6: Research Day",
                        reason: `Lecturer ${lecturerCode} has research day on ${researchDay}`,
                        severity: "hard",
                        details: { lecturer: lecturerCode, researchDay },
                    });
                    return false;
                }
            }
        }
        return true;
    }
    /**
     * HC7: Max daily periods
     */
    checkMaxDailyPeriods(schedule, entry) {
        for (const lecturerCode of entry.lecturers) {
            const lecturer = this.lecturers.get(lecturerCode);
            if (!lecturer || !lecturer.Max_Daily_Periods)
                continue;
            let periodsCount = 0;
            for (const existing of schedule) {
                if (existing.timeSlot.day === entry.timeSlot.day && existing.lecturers.includes(lecturerCode)) {
                    periodsCount += existing.sks;
                }
            }
            periodsCount += entry.sks;
            if (periodsCount > lecturer.Max_Daily_Periods) {
                this.addViolation({
                    classId: entry.classId,
                    className: entry.className,
                    constraintType: "HC7: Max Daily Periods",
                    reason: `Lecturer ${lecturerCode} exceeds max daily periods (${lecturer.Max_Daily_Periods}) on ${entry.timeSlot.day}`,
                    severity: "hard",
                    details: { lecturer: lecturerCode, periods: periodsCount, max: lecturer.Max_Daily_Periods },
                });
                return false;
            }
        }
        return true;
    }
    /**
     * HC8: Class type time (MODIFIED - stricter evening class timing)
     */
    checkClassTypeTime(entry) {
        const hour = parseInt(entry.timeSlot.startTime.split(":")[0]);
        const minute = parseInt(entry.timeSlot.startTime.split(":")[1]);
        const startMinutes = hour * 60 + minute;
        if (entry.classType === "sore") {
            // Evening classes: prefer 15:30-18:30, allow up to 19:30 with penalty
            if (startMinutes < 15 * 60 + 30) {
                // Too early for evening class
                this.addViolation({
                    classId: entry.classId,
                    className: entry.className,
                    constraintType: "HC8: Class Type Time",
                    reason: `Evening class starting too early at ${entry.timeSlot.startTime}`,
                    severity: "hard",
                });
                return false;
            }
            return true;
        }
        else {
            // Morning classes must be < 18:30
            if (hour >= 18 && minute >= 30) {
                this.addViolation({
                    classId: entry.classId,
                    className: entry.className,
                    constraintType: "HC8: Class Type Time",
                    reason: `Morning class starting too late at ${entry.timeSlot.startTime}`,
                    severity: "hard",
                });
                return false;
            }
            return true;
        }
    }
    /**
     * HC9: Saturday restriction
     */
    checkSaturdayRestriction(entry) {
        if (entry.timeSlot.day !== "Saturday") {
            return true;
        }
        const isMagisterManajemen = entry.prodi.toLowerCase().includes("magister manajemen");
        if (!isMagisterManajemen) {
            this.addViolation({
                classId: entry.classId,
                className: entry.className,
                constraintType: "HC9: Saturday Restriction",
                reason: `Only Magister Manajemen allowed on Saturday, but class is from ${entry.prodi}`,
                severity: "hard",
                details: { prodi: entry.prodi },
            });
        }
        return isMagisterManajemen;
    }
    /**
     * HC10: Friday time restriction
     */
    checkFridayTimeRestriction(entry) {
        if (entry.timeSlot.day !== "Friday") {
            return true;
        }
        if (!isValidFridayStartTime(entry.timeSlot.startTime)) {
            this.addViolation({
                classId: entry.classId,
                className: entry.className,
                constraintType: "HC10: Friday Time Restriction",
                reason: `Cannot start class at ${entry.timeSlot.startTime} on Friday (prohibited: 11:00, 12:00, 13:00)`,
                severity: "hard",
                details: { startTime: entry.timeSlot.startTime },
            });
            return false;
        }
        return true;
    }
    /**
     * HC11: Not starting during prayer time
     */
    checkNotStartingDuringPrayerTime(entry) {
        if (isStartingDuringPrayerTime(entry.timeSlot.startTime)) {
            this.addViolation({
                classId: entry.classId,
                className: entry.className,
                constraintType: "HC11: Prayer Time Start",
                reason: `Class cannot start during prayer time at ${entry.timeSlot.startTime}`,
                severity: "hard",
                details: { startTime: entry.timeSlot.startTime },
            });
            return false;
        }
        return true;
    }
    /**
     * HC12: Exclusive room constraint - NEW
     */
    checkExclusiveRoomConstraint(entry) {
        const exclusiveConfig = EXCLUSIVE_ROOMS[entry.room];
        if (!exclusiveConfig)
            return true; // Not an exclusive room
        if (!canUseExclusiveRoom(entry.room, entry.className, entry.prodi)) {
            this.addViolation({
                classId: entry.classId,
                className: entry.className,
                constraintType: "HC12: Exclusive Room",
                reason: `Room ${entry.room} is exclusive for ${exclusiveConfig.courses.join(", ")} from ${exclusiveConfig.prodi || "any prodi"}`,
                severity: "hard",
                details: { room: entry.room, allowedCourses: exclusiveConfig.courses },
            });
            return false;
        }
        return true;
    }
    /**
     * Helper: Check time overlap considering actual durations with prayer time
     */
    isTimeOverlap(entry1, entry2) {
        if (entry1.timeSlot.day !== entry2.timeSlot.day)
            return false;
        const calc1 = calculateEndTime(entry1.timeSlot.startTime, entry1.sks, entry1.timeSlot.day);
        const calc2 = calculateEndTime(entry2.timeSlot.startTime, entry2.sks, entry2.timeSlot.day);
        const start1 = timeToMinutes(entry1.timeSlot.startTime);
        const end1 = timeToMinutes(calc1.endTime);
        const start2 = timeToMinutes(entry2.timeSlot.startTime);
        const end2 = timeToMinutes(calc2.endTime);
        return start1 < end2 && start2 < end1;
    }
    // ============================================
    // SOFT CONSTRAINTS
    // ============================================
    /**
     * SC1: Preferred time
     */
    checkPreferredTime(entry) {
        let totalScore = 0;
        let count = 0;
        for (const lecturerCode of entry.lecturers) {
            const lecturer = this.lecturers.get(lecturerCode);
            if (!lecturer || !lecturer.Prefered_Time)
                continue;
            const preferredTime = lecturer.Prefered_Time.toLowerCase();
            const hour = parseInt(entry.timeSlot.startTime.split(":")[0]);
            count++;
            if (preferredTime === "pagi" && hour >= 7 && hour < 12) {
                totalScore += 1;
            }
            else if (preferredTime === "siang" && hour >= 12 && hour < 15) {
                totalScore += 1;
            }
            else if (preferredTime === "sore" && hour >= 15 && hour < 18) {
                totalScore += 1;
            }
            else if (preferredTime === "malam" && hour >= 18) {
                totalScore += 1;
            }
        }
        return count > 0 ? totalScore / count : 1;
    }
    /**
     * SC2: Preferred room
     */
    checkPreferredRoom(entry) {
        let totalScore = 0;
        let count = 0;
        for (const lecturerCode of entry.lecturers) {
            const lecturer = this.lecturers.get(lecturerCode);
            if (!lecturer || !lecturer.Prefered_Room)
                continue;
            count++;
            if (lecturer.Prefered_Room === entry.room) {
                totalScore += 1;
            }
        }
        return count > 0 ? totalScore / count : 1;
    }
    /**
     * SC3: Transit time
     */
    checkTransitTime(schedule, entry) {
        let minScore = 1;
        for (const lecturerCode of entry.lecturers) {
            const lecturer = this.lecturers.get(lecturerCode);
            if (!lecturer || !lecturer.Transit_Time)
                continue;
            for (const existing of schedule) {
                if (existing.timeSlot.day !== entry.timeSlot.day)
                    continue;
                if (!existing.lecturers.includes(lecturerCode))
                    continue;
                const calc = calculateEndTime(existing.timeSlot.startTime, existing.sks, existing.timeSlot.day);
                const prevEndMins = timeToMinutes(calc.endTime);
                const currentStartMins = timeToMinutes(entry.timeSlot.startTime);
                const gapMinutes = currentStartMins - prevEndMins;
                if (gapMinutes < lecturer.Transit_Time) {
                    const score = Math.max(0, gapMinutes / lecturer.Transit_Time);
                    minScore = Math.min(minScore, score);
                }
            }
        }
        return minScore;
    }
    /**
     * SC4: Compactness
     */
    checkCompactness(schedule, entry) {
        const sameDayClasses = schedule.filter((s) => s.timeSlot.day === entry.timeSlot.day);
        if (sameDayClasses.length === 0)
            return 1;
        let minGap = Infinity;
        const currentStartMins = timeToMinutes(entry.timeSlot.startTime);
        for (const existing of sameDayClasses) {
            const calc = calculateEndTime(existing.timeSlot.startTime, existing.sks, existing.timeSlot.day);
            const existingEndMins = timeToMinutes(calc.endTime);
            const existingStartMins = timeToMinutes(existing.timeSlot.startTime);
            if (existingEndMins <= currentStartMins) {
                const gap = currentStartMins - existingEndMins;
                minGap = Math.min(minGap, gap);
            }
            const currentCalc = calculateEndTime(entry.timeSlot.startTime, entry.sks, entry.timeSlot.day);
            const currentEndMins = timeToMinutes(currentCalc.endTime);
            if (currentEndMins <= existingStartMins) {
                const gap = existingStartMins - currentEndMins;
                minGap = Math.min(minGap, gap);
            }
        }
        if (minGap === Infinity)
            return 1;
        return minGap <= 60 ? 1 : Math.max(0, 1 - (minGap - 60) / 180);
    }
    /**
     * SC5: Avoid prayer time overlap
     */
    checkPrayerTimeOverlap(entry) {
        const prayerTime = getPrayerTimeOverlap(entry.timeSlot.startTime, entry.sks, entry.timeSlot.day);
        if (prayerTime === 0) {
            return 1; // Perfect, no overlap
        }
        // Penalty based on how much prayer time is overlapped
        const score = Math.max(0.5, 1 - prayerTime / 100);
        this.addViolation({
            classId: entry.classId,
            className: entry.className,
            constraintType: "SC5: Prayer Time Overlap",
            reason: `Class overlaps with ${prayerTime} minutes of prayer time`,
            severity: "soft",
            details: { prayerTimeMinutes: prayerTime },
        });
        return score;
    }
    /**
     * SC6: Evening class priority - MODIFIED: Penalize late starts (19:30)
     */
    checkEveningClassPriority(entry) {
        if (entry.classType !== "sore")
            return 1;
        const startMinutes = timeToMinutes(entry.timeSlot.startTime);
        const hour = parseInt(entry.timeSlot.startTime.split(":")[0]);
        // Prioritize earlier start times
        if (startMinutes >= 15 * 60 + 30 && startMinutes < 16 * 60) {
            return 1.0; // 15:30-16:00 - Excellent
        }
        else if (startMinutes >= 16 * 60 && startMinutes < 18 * 60) {
            return 0.95; // 16:00-18:00 - Very good
        }
        else if (startMinutes >= 18 * 60 && startMinutes < 18 * 60 + 30) {
            return 0.9; // 18:00-18:30 - Good
        }
        else if (startMinutes === 18 * 60 + 30) {
            return 0.85; // 18:30 - Standard evening time
        }
        else if (startMinutes > 18 * 60 + 30 && startMinutes < 19 * 60 + 30) {
            return 0.6; // 18:30-19:30 - Acceptable but not ideal
        }
        else if (startMinutes >= 19 * 60 + 30) {
            // 19:30 or later - Heavy penalty to avoid this
            this.addViolation({
                classId: entry.classId,
                className: entry.className,
                constraintType: "SC6: Late Evening Start",
                reason: `Evening class starting too late at ${entry.timeSlot.startTime} (should avoid 19:30+)`,
                severity: "soft",
                details: { startTime: entry.timeSlot.startTime },
            });
            return 0.3; // Strong penalty
        }
        return 0.5;
    }
    /**
     * SC7: Overflow penalty - NEW: Penalize non-lab classes using lab rooms
     */
    checkOverflowPenalty(entry) {
        if (entry.isOverflowToLab) {
            // Non-lab class is using lab room due to overflow
            this.addViolation({
                classId: entry.classId,
                className: entry.className,
                constraintType: "SC7: Overflow to Lab",
                reason: `Non-lab class using lab room ${entry.room} due to non-lab rooms being full`,
                severity: "soft",
                details: { room: entry.room },
            });
            return 0.7; // Acceptable with small penalty
        }
        return 1;
    }
}
exports.ConstraintChecker = ConstraintChecker;
// ============================================
// SIMULATED ANNEALING SOLVER
// ============================================
class SimulatedAnnealing {
    rooms;
    lecturers;
    classes;
    checker;
    initialTemperature = 1000000000000;
    minTemperature = 0.1;
    coolingRate = 0.995;
    maxIterations = 500000;
    hardConstraintWeight = 10000;
    softConstraintWeights = {
        preferredTime: 10,
        preferredRoom: 5,
        transitTime: 20,
        compactness: 8,
        prayerTimeOverlap: 15,
        eveningClassPriority: 25, // INCREASED: Strong preference for early evening starts
        labRequirement: 10,
        overflowPenalty: 5, // NEW: Small penalty for overflow
    };
    constructor(rooms, lecturers, classes) {
        this.rooms = rooms;
        this.lecturers = lecturers;
        this.classes = classes;
        this.checker = new ConstraintChecker(rooms, lecturers);
    }
    /**
     * Generate initial solution with smart room allocation
     */
    generateInitialSolution() {
        const schedule = [];
        for (const classReq of this.classes) {
            if (!classReq.Kode_Matakuliah)
                continue;
            const lecturers = [];
            if (classReq.Kode_Dosen1)
                lecturers.push(classReq.Kode_Dosen1);
            if (classReq.Kode_Dosen2)
                lecturers.push(classReq.Kode_Dosen2);
            if (classReq.Kode_Dosen_Prodi_Lain1)
                lecturers.push(classReq.Kode_Dosen_Prodi_Lain1);
            if (classReq.Kode_Dosen_Prodi_Lain2)
                lecturers.push(classReq.Kode_Dosen_Prodi_Lain2);
            if (lecturers.length === 0)
                continue;
            const participants = classReq.Peserta || 30;
            const needsLab = classReq.should_on_the_lab?.toLowerCase() === "yes";
            const classType = classReq.Class_Type?.toLowerCase() || "pagi";
            const prodi = classReq.Prodi || "Unknown";
            const courseName = classReq.Mata_Kuliah || "Unknown";
            // Select time slots based on class type and constraints
            let availableTimeSlots = [];
            if (classType === "sore") {
                // Evening classes: prioritize 15:30-18:30, allow later as fallback
                availableTimeSlots = TIME_SLOTS_SORE.slice().sort((a, b) => {
                    const aMinutes = timeToMinutes(a.startTime);
                    const bMinutes = timeToMinutes(b.startTime);
                    // Prioritize earlier times
                    return aMinutes - bMinutes;
                });
            }
            else {
                availableTimeSlots = TIME_SLOTS_PAGI.slice();
            }
            // Filter by day constraints
            const isMagisterManajemen = prodi.toLowerCase().includes("magister manajemen");
            if (!isMagisterManajemen) {
                availableTimeSlots = availableTimeSlots.filter((slot) => slot.day !== "Saturday");
            }
            // Filter Friday time restrictions
            availableTimeSlots = availableTimeSlots.filter((slot) => {
                if (slot.day === "Friday") {
                    return isValidFridayStartTime(slot.startTime);
                }
                return true;
            });
            // Filter out prayer time starts
            availableTimeSlots = availableTimeSlots.filter((slot) => {
                return !isStartingDuringPrayerTime(slot.startTime);
            });
            if (availableTimeSlots.length === 0)
                continue;
            // Try to find available room and time slot
            let placed = false;
            for (const timeSlot of availableTimeSlots) {
                const roomCodes = getAvailableRooms(this.rooms, schedule, classReq, timeSlot, participants, needsLab, courseName, prodi);
                if (roomCodes.length > 0) {
                    const selectedRoom = roomCodes[0]; // Take first available
                    const prayerTimeCalc = calculateEndTime(timeSlot.startTime, classReq.SKS || 3, timeSlot.day);
                    // Check if this is overflow case
                    const isOverflow = !needsLab && LAB_ROOMS.includes(selectedRoom);
                    schedule.push({
                        classId: classReq.Kode_Matakuliah,
                        className: courseName,
                        class: classReq.Kelas || "A",
                        prodi,
                        lecturers,
                        room: selectedRoom,
                        timeSlot: timeSlot,
                        sks: classReq.SKS || 3,
                        needsLab,
                        participants,
                        classType,
                        prayerTimeAdded: prayerTimeCalc.prayerTimeAdded,
                        isOverflowToLab: isOverflow,
                    });
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                console.warn(`⚠️  Could not place class: ${classReq.Kode_Matakuliah} - ${courseName}`);
            }
        }
        const fitness = this.calculateFitness(schedule);
        return {
            schedule,
            fitness: isNaN(fitness) ? 999999 : fitness,
            hardViolations: 0,
            softViolations: 0,
        };
    }
    /**
     * Calculate fitness with violation tracking
     */
    calculateFitness(schedule) {
        this.checker.resetViolations();
        let hardViolations = 0;
        let softPenalty = 0;
        for (let i = 0; i < schedule.length; i++) {
            const entry = schedule[i];
            const scheduleBeforeEntry = schedule.slice(0, i);
            // HARD CONSTRAINTS
            if (!this.checker.checkNoLecturerConflict(scheduleBeforeEntry, entry))
                hardViolations++;
            if (!this.checker.checkNoRoomConflict(scheduleBeforeEntry, entry))
                hardViolations++;
            if (!this.checker.checkRoomCapacity(entry))
                hardViolations++;
            if (!this.checker.checkNoClassConflictSameProdi(scheduleBeforeEntry, entry))
                hardViolations++;
            if (!this.checker.checkResearchDay(entry))
                hardViolations++;
            if (!this.checker.checkMaxDailyPeriods(scheduleBeforeEntry, entry))
                hardViolations++;
            if (!this.checker.checkClassTypeTime(entry))
                hardViolations++;
            if (!this.checker.checkSaturdayRestriction(entry))
                hardViolations++;
            if (!this.checker.checkFridayTimeRestriction(entry))
                hardViolations++;
            if (!this.checker.checkNotStartingDuringPrayerTime(entry))
                hardViolations++;
            if (!this.checker.checkExclusiveRoomConstraint(entry))
                hardViolations++;
            // SOFT CONSTRAINTS
            softPenalty += (1 - this.checker.checkPreferredTime(entry)) * this.softConstraintWeights.preferredTime;
            softPenalty += (1 - this.checker.checkPreferredRoom(entry)) * this.softConstraintWeights.preferredRoom;
            softPenalty += (1 - this.checker.checkTransitTime(scheduleBeforeEntry, entry)) * this.softConstraintWeights.transitTime;
            softPenalty += (1 - this.checker.checkCompactness(scheduleBeforeEntry, entry)) * this.softConstraintWeights.compactness;
            softPenalty += (1 - this.checker.checkLabRequirement(entry)) * this.softConstraintWeights.labRequirement;
            softPenalty += (1 - this.checker.checkPrayerTimeOverlap(entry)) * this.softConstraintWeights.prayerTimeOverlap;
            softPenalty += (1 - this.checker.checkEveningClassPriority(entry)) * this.softConstraintWeights.eveningClassPriority;
            softPenalty += (1 - this.checker.checkOverflowPenalty(entry)) * this.softConstraintWeights.overflowPenalty;
        }
        return hardViolations * this.hardConstraintWeight + softPenalty;
    }
    /**
     * Generate neighbor solution
     */
    generateNeighbor(solution) {
        const newSchedule = JSON.parse(JSON.stringify(solution.schedule));
        const modType = Math.random();
        const randomIndex = Math.floor(Math.random() * newSchedule.length);
        const entry = newSchedule[randomIndex];
        if (modType < 0.5) {
            // Change time slot
            let availableTimeSlots = [];
            if (entry.classType === "sore") {
                // Evening: prioritize earlier times
                availableTimeSlots = TIME_SLOTS_SORE.slice().sort((a, b) => {
                    const aMinutes = timeToMinutes(a.startTime);
                    const bMinutes = timeToMinutes(b.startTime);
                    return aMinutes - bMinutes;
                });
            }
            else {
                availableTimeSlots = TIME_SLOTS_PAGI.slice();
            }
            // Apply constraints
            const isMM = entry.prodi.toLowerCase().includes("magister manajemen");
            if (!isMM) {
                availableTimeSlots = availableTimeSlots.filter((slot) => slot.day !== "Saturday");
            }
            availableTimeSlots = availableTimeSlots.filter((slot) => {
                if (slot.day === "Friday") {
                    return isValidFridayStartTime(slot.startTime);
                }
                return true;
            });
            availableTimeSlots = availableTimeSlots.filter((slot) => {
                return !isStartingDuringPrayerTime(slot.startTime);
            });
            if (availableTimeSlots.length > 0) {
                const newSlot = availableTimeSlots[Math.floor(Math.random() * availableTimeSlots.length)];
                entry.timeSlot = newSlot;
                // Recalculate prayer time
                const calc = calculateEndTime(newSlot.startTime, entry.sks, newSlot.day);
                entry.prayerTimeAdded = calc.prayerTimeAdded;
            }
        }
        else {
            // Change room with smart allocation
            const classReq = this.classes.find((c) => c.Kode_Matakuliah === entry.classId);
            if (!classReq)
                return solution;
            const scheduleWithoutCurrent = newSchedule.filter((_, idx) => idx !== randomIndex);
            const roomCodes = getAvailableRooms(this.rooms, scheduleWithoutCurrent, classReq, entry.timeSlot, entry.participants, entry.needsLab, entry.className, entry.prodi);
            if (roomCodes.length > 0) {
                const newRoom = roomCodes[Math.floor(Math.random() * roomCodes.length)];
                entry.room = newRoom;
                // Update overflow flag
                entry.isOverflowToLab = !entry.needsLab && LAB_ROOMS.includes(newRoom);
            }
        }
        const fitness = this.calculateFitness(newSchedule);
        return {
            schedule: newSchedule,
            fitness: isNaN(fitness) ? 999999 : fitness,
            hardViolations: 0,
            softViolations: 0,
        };
    }
    /**
     * Acceptance probability
     */
    acceptanceProbability(currentFitness, newFitness, temperature) {
        if (newFitness < currentFitness) {
            return 1.0;
        }
        return Math.exp((currentFitness - newFitness) / temperature);
    }
    /**
     * Main SA algorithm
     */
    solve() {
        console.log("🚀 Starting Enhanced Simulated Annealing V2...\n");
        let currentSolution = this.generateInitialSolution();
        let bestSolution = JSON.parse(JSON.stringify(currentSolution));
        let temperature = this.initialTemperature;
        let iteration = 0;
        console.log(`Initial fitness: ${currentSolution.fitness.toFixed(2)}`);
        console.log(`Initial schedule size: ${currentSolution.schedule.length} classes\n`);
        while (temperature > this.minTemperature && iteration < this.maxIterations) {
            const newSolution = this.generateNeighbor(currentSolution);
            const acceptProb = this.acceptanceProbability(currentSolution.fitness, newSolution.fitness, temperature);
            if (Math.random() < acceptProb) {
                currentSolution = newSolution;
                if (currentSolution.fitness < bestSolution.fitness) {
                    bestSolution = JSON.parse(JSON.stringify(currentSolution));
                    console.log(`✨ New best! Iteration ${iteration}, ` + `Temperature: ${temperature.toFixed(2)}, ` + `Fitness: ${bestSolution.fitness.toFixed(2)}`);
                }
            }
            temperature *= this.coolingRate;
            iteration++;
            if (iteration % 1000 === 0) {
                console.log(`⏳ Iteration ${iteration}, ` + `Temperature: ${temperature.toFixed(2)}, ` + `Current Fitness: ${currentSolution.fitness.toFixed(2)}`);
            }
        }
        console.log(`\n🎉 Optimization complete!`);
        console.log(`Final best fitness: ${bestSolution.fitness.toFixed(2)}`);
        console.log(`Total iterations: ${iteration}\n`);
        // Generate final violation report
        this.calculateFitness(bestSolution.schedule);
        const violations = this.checker.getViolations();
        const hardViolations = violations.filter((v) => v.severity === "hard");
        const softViolations = violations.filter((v) => v.severity === "soft");
        const violationsByType = {};
        for (const v of violations) {
            violationsByType[v.constraintType] = (violationsByType[v.constraintType] || 0) + 1;
        }
        bestSolution.violationReport = {
            hardConstraintViolations: hardViolations,
            softConstraintViolations: softViolations,
            summary: {
                totalHardViolations: hardViolations.length,
                totalSoftViolations: softViolations.length,
                violationsByType,
            },
        };
        return bestSolution;
    }
}
exports.SimulatedAnnealing = SimulatedAnnealing;
// ============================================
// MAIN EXECUTION
// ============================================
function main() {
    console.log("==========================================");
    console.log("ENHANCED SA V2 - UTCP SOLVER");
    console.log("University Timetabling Problem");
    console.log("With Overflow Handling & Exclusive Rooms");
    console.log("==========================================\n");
    const dataPath = process.argv[2] || "/home/aikano/ade-belajar/timetable-sa/src/data_uisi.xlsx";
    const { rooms, lecturers, classes } = loadData(dataPath);
    console.log(`✅ Loaded ${rooms.length} rooms`);
    console.log(`   - Lab rooms: ${LAB_ROOMS.length}`);
    console.log(`   - Non-lab rooms: ${NON_LAB_ROOMS.length}`);
    console.log(`   - Exclusive rooms: ${Object.keys(EXCLUSIVE_ROOMS).length}`);
    console.log(`✅ Loaded ${lecturers.length} lecturers`);
    console.log(`✅ Loaded ${classes.filter((c) => c.Kode_Matakuliah).length} classes\n`);
    const sa = new SimulatedAnnealing(rooms, lecturers, classes);
    const solution = sa.solve();
    console.log("💾 Saving results...\n");
    // Analyze room usage
    const roomUsage = {};
    const overflowClasses = [];
    for (const entry of solution.schedule) {
        roomUsage[entry.room] = (roomUsage[entry.room] || 0) + 1;
        if (entry.isOverflowToLab) {
            overflowClasses.push(entry);
        }
    }
    console.log("📊 Room Usage Statistics:");
    console.log(`   Total classes scheduled: ${solution.schedule.length}`);
    console.log(`   Non-lab classes using lab rooms (overflow): ${overflowClasses.length}`);
    console.log(`   Exclusive room (G5-LabAudioVisual) usage: ${roomUsage["G5-LabAudioVisual"] || 0} classes\n`);
    // Convert to readable format
    const output = solution.schedule.map((entry) => {
        const calc = calculateEndTime(entry.timeSlot.startTime, entry.sks, entry.timeSlot.day);
        console.log(entry);
        return {
            "Class ID": entry.classId,
            "Class Name": entry.className,
            Class: entry.class,
            Program: entry.prodi,
            Lecturers: entry.lecturers.join(", "),
            Room: entry.room,
            "Room Type": LAB_ROOMS.includes(entry.room) ? "Lab" : "Non-Lab",
            "Is Overflow": entry.isOverflowToLab ? "Yes" : "No",
            Day: entry.timeSlot.day,
            "Start Time": entry.timeSlot.startTime,
            "End Time": calc.endTime,
            SKS: entry.sks,
            "Base Duration (minutes)": entry.sks * 50,
            "Prayer Time Added (minutes)": entry.prayerTimeAdded,
            "Total Duration (minutes)": entry.sks * 50 + entry.prayerTimeAdded,
            Participants: entry.participants,
            "Class Type": entry.classType,
            "Needs Lab": entry.needsLab ? "Yes" : "No",
        };
    });
    const outDir = "/home/aikano/ade-belajar/timetable-sa/out";
    // Create output directory
    if (!fs_1.default.existsSync(outDir)) {
        fs_1.default.mkdirSync(outDir, { recursive: true });
    }
    fs_1.default.writeFileSync(`${outDir}/timetable_result_v2.json`, JSON.stringify(output, null, 2));
    // Save overflow report
    const overflowReport = {
        summary: {
            totalOverflowClasses: overflowClasses.length,
            totalScheduledClasses: solution.schedule.length,
            overflowPercentage: ((overflowClasses.length / solution.schedule.length) * 100).toFixed(2) + "%",
        },
        overflowClasses: overflowClasses.map((entry) => ({
            classId: entry.classId,
            className: entry.className,
            prodi: entry.prodi,
            room: entry.room,
            day: entry.timeSlot.day,
            startTime: entry.timeSlot.startTime,
            participants: entry.participants,
        })),
    };
    fs_1.default.writeFileSync(`${outDir}/overflow_report.json`, JSON.stringify(overflowReport, null, 2));
    // Save violation report
    if (solution.violationReport) {
        fs_1.default.writeFileSync(`${outDir}/violation_report_v2.json`, JSON.stringify(solution.violationReport, null, 2));
        // Create human-readable violation report
        let reportText = "==========================================\n";
        reportText += "CONSTRAINT VIOLATION REPORT V2\n";
        reportText += "==========================================\n\n";
        reportText += `📊 SUMMARY:\n`;
        reportText += `   Total Hard Violations: ${solution.violationReport.summary.totalHardViolations}\n`;
        reportText += `   Total Soft Violations: ${solution.violationReport.summary.totalSoftViolations}\n\n`;
        reportText += `📊 OVERFLOW STATISTICS:\n`;
        reportText += `   Non-lab classes using lab rooms: ${overflowClasses.length}\n`;
        reportText += `   Percentage: ${overflowReport.summary.overflowPercentage}\n\n`;
        reportText += `📋 VIOLATIONS BY TYPE:\n`;
        for (const [type, count] of Object.entries(solution.violationReport.summary.violationsByType)) {
            reportText += `   ${type}: ${count}\n`;
        }
        reportText += "\n";
        if (solution.violationReport.hardConstraintViolations.length > 0) {
            reportText += `🚫 HARD CONSTRAINT VIOLATIONS:\n`;
            for (const v of solution.violationReport.hardConstraintViolations.slice(0, 20)) {
                reportText += `   • ${v.classId} (${v.className})\n`;
                reportText += `     ${v.constraintType}: ${v.reason}\n\n`;
            }
            if (solution.violationReport.hardConstraintViolations.length > 20) {
                reportText += `   ... and ${solution.violationReport.hardConstraintViolations.length - 20} more\n\n`;
            }
        }
        if (solution.violationReport.softConstraintViolations.length > 0) {
            reportText += `⚠️  SOFT CONSTRAINT VIOLATIONS (Sample):\n`;
            for (const v of solution.violationReport.softConstraintViolations.slice(0, 10)) {
                reportText += `   • ${v.classId}: ${v.reason}\n`;
            }
            if (solution.violationReport.softConstraintViolations.length > 10) {
                reportText += `   ... and ${solution.violationReport.softConstraintViolations.length - 10} more\n`;
            }
        }
        fs_1.default.writeFileSync(`${outDir}/violation_report_v2.txt`, reportText);
    }
    // Create Excel output
    const ws = XLSX.utils.json_to_sheet(output);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Timetable");
    // Add overflow sheet
    const overflowWs = XLSX.utils.json_to_sheet(overflowClasses.map((entry) => ({
        "Class ID": entry.classId,
        "Class Name": entry.className,
        Program: entry.prodi,
        Room: entry.room,
        Day: entry.timeSlot.day,
        "Start Time": entry.timeSlot.startTime,
        Participants: entry.participants,
    })));
    XLSX.utils.book_append_sheet(wb, overflowWs, "Overflow Classes");
    XLSX.writeFile(wb, `${outDir}/timetable_result_v2.xlsx`);
    console.log("✅ Results saved to:");
    console.log(`   - ${outDir}/timetable_result_v2.json`);
    console.log(`   - ${outDir}/timetable_result_v2.xlsx`);
    console.log(`   - ${outDir}/overflow_report.json`);
    console.log(`   - ${outDir}/violation_report_v2.json`);
    console.log(`   - ${outDir}/violation_report_v2.txt\n`);
    console.log("==========================================");
    console.log("PROCESS COMPLETE! 🎓");
    console.log("==========================================");
}
if (require.main === module) {
    main();
}
//# sourceMappingURL=index.js.map