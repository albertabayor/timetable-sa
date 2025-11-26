"use strict";
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
// Non-lab rooms
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
    "G3-R4",
    "G4-R1",
    "G4-R2",
    "G4-R3",
    "G4-R4",
];
// Exclusive room assignments
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
            minute -= 20;
        }
        else if (hour === 18 && minute === 50) {
            minute -= 20;
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
// Generate time slots for SORE (15:30 - 21:00)
for (let day of DAYS) {
    let hour = 15;
    let minute = 30;
    let period = 1;
    while (hour < 21 || (hour === 21 && minute === 0)) {
        const startTime = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        let endHour = hour;
        let endMinute = minute + 50;
        if (endMinute >= 60) {
            endHour += Math.floor(endMinute / 60);
            endMinute = endMinute % 60;
        }
        if (endHour > 21 || (endHour === 21 && endMinute > 0)) {
            break;
        }
        if (hour === 19 && minute === 20)
            break;
        const endTime = `${endHour.toString().padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}`;
        const slot = { day, startTime, endTime, period };
        TIME_SLOTS_SORE.push(slot);
        if (hour >= 18 || (hour === 18 && minute >= 30)) {
            TIME_SLOTS.push(slot);
        }
        minute = endMinute;
        if (minute === 50 && hour === 15) {
            minute -= 20;
        }
        else if (hour === 18 && minute === 50) {
            minute -= 20;
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
function timeToMinutes(time) {
    const [hour, minute] = time.split(":").map(Number);
    return hour * 60 + minute;
}
function minutesToTime(minutes) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}
function getPrayerTimeOverlap(startTime, sks, day) {
    const startMinutes = timeToMinutes(startTime);
    const classMinutes = sks * 50;
    const endMinutes = startMinutes + classMinutes;
    let totalPrayerTime = 0;
    if (startMinutes < PRAYER_TIMES.DZUHUR.end && endMinutes > PRAYER_TIMES.DZUHUR.start) {
        totalPrayerTime += PRAYER_TIMES.DZUHUR.duration;
    }
    if (startMinutes < PRAYER_TIMES.ASHAR.end && endMinutes > PRAYER_TIMES.ASHAR.start) {
        totalPrayerTime += PRAYER_TIMES.ASHAR.duration;
    }
    if (startMinutes < PRAYER_TIMES.MAGHRIB.end && endMinutes > PRAYER_TIMES.MAGHRIB.start) {
        totalPrayerTime += PRAYER_TIMES.MAGHRIB.duration;
    }
    return totalPrayerTime;
}
function calculateEndTime(startTime, sks, day) {
    const startMinutes = timeToMinutes(startTime);
    const classMinutes = sks * 50;
    const prayerTimeAdded = getPrayerTimeOverlap(startTime, sks, day);
    const totalMinutes = classMinutes + prayerTimeAdded;
    const endMinutes = startMinutes + totalMinutes;
    return {
        endTime: minutesToTime(endMinutes),
        prayerTimeAdded,
    };
}
function isValidFridayStartTime(startTime) {
    const hour = parseInt(startTime.split(":")[0]);
    return !(hour === 11 || hour === 12 || hour === 13);
}
function isStartingDuringPrayerTime(startTime) {
    const startMinutes = timeToMinutes(startTime);
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
function canUseExclusiveRoom(roomCode, courseName, prodi) {
    const exclusiveConfig = EXCLUSIVE_ROOMS[roomCode];
    if (!exclusiveConfig)
        return true;
    const courseMatch = exclusiveConfig.courses.some((c) => courseName.toLowerCase().includes(c.toLowerCase()));
    const prodiMatch = !exclusiveConfig.prodi || prodi.toLowerCase().includes(exclusiveConfig.prodi.toLowerCase());
    return courseMatch && prodiMatch;
}
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
            return false;
        }
    }
    return true;
}
function getAvailableRooms(allRooms, schedule, classReq, timeSlot, participants, needsLab, courseName, prodi) {
    const sks = classReq.SKS || 3;
    // Priority 1: Exclusive room
    for (const [roomCode, config] of Object.entries(EXCLUSIVE_ROOMS)) {
        if (canUseExclusiveRoom(roomCode, courseName, prodi)) {
            const room = allRooms.find((r) => r.Code === roomCode);
            if (room && room.Capacity >= participants) {
                if (isRoomAvailable(schedule, roomCode, timeSlot, sks)) {
                    return [roomCode];
                }
            }
        }
    }
    let roomCodes = [];
    // Priority 2: Specific rooms from requirement
    if (classReq.rooms) {
        roomCodes = classReq.rooms
            .split(",")
            .map((r) => r.trim())
            .filter((r) => {
            const room = allRooms.find((room) => room.Code === r);
            if (!room || room.Capacity < participants)
                return false;
            return isRoomAvailable(schedule, r, timeSlot, sks);
        });
    }
    if (roomCodes.length > 0)
        return roomCodes;
    // Priority 3: Lab rooms for lab classes
    if (needsLab) {
        roomCodes = allRooms
            .filter((r) => {
            if (!LAB_ROOMS.includes(r.Code))
                return false;
            if (r.Capacity < participants)
                return false;
            if (!canUseExclusiveRoom(r.Code, courseName, prodi))
                return false;
            return isRoomAvailable(schedule, r.Code, timeSlot, sks);
        })
            .map((r) => r.Code);
        if (roomCodes.length > 0)
            return roomCodes;
    }
    // Priority 4: Non-lab rooms for non-lab classes
    if (!needsLab) {
        roomCodes = allRooms
            .filter((r) => {
            if (!NON_LAB_ROOMS.includes(r.Code))
                return false;
            if (r.Capacity < participants)
                return false;
            return isRoomAvailable(schedule, r.Code, timeSlot, sks);
        })
            .map((r) => r.Code);
        if (roomCodes.length > 0)
            return roomCodes;
        // Priority 5: Overflow to lab
        roomCodes = allRooms
            .filter((r) => {
            if (!LAB_ROOMS.includes(r.Code))
                return false;
            if (r.Capacity < participants)
                return false;
            if (!canUseExclusiveRoom(r.Code, courseName, prodi))
                return false;
            return isRoomAvailable(schedule, r.Code, timeSlot, sks);
        })
            .map((r) => r.Code);
        return roomCodes;
    }
    // Priority 6: Any available room
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
// CONSTRAINT CHECKING CLASS
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
    // HARD CONSTRAINTS
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
    checkLabRequirement(entry) {
        if (!entry.needsLab) {
            if (LAB_ROOMS.includes(entry.room)) {
                return 0.7;
            }
            return 1;
        }
        const room = this.rooms.get(entry.room);
        if (!room)
            return 0;
        if (room.Type.toLowerCase().includes("lab") || LAB_ROOMS.includes(room.Code)) {
            return 1;
        }
        return 0.3;
    }
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
    // CHANGED: HC6 -> SC8 (Research Day is now a SOFT constraint)
    checkResearchDay(entry) {
        for (const lecturerCode of entry.lecturers) {
            const lecturer = this.lecturers.get(lecturerCode);
            if (lecturer && lecturer.Research_Day) {
                const researchDay = lecturer.Research_Day.trim();
                if ((researchDay && entry.timeSlot.day === researchDay) || researchDay.includes(entry.timeSlot.day)) {
                    this.addViolation({
                        classId: entry.classId,
                        className: entry.className,
                        constraintType: "SC8: Research Day",
                        reason: `Lecturer ${lecturerCode} has research day on ${researchDay}`,
                        severity: "soft",
                        details: { lecturer: lecturerCode, researchDay },
                    });
                    return 0.3; // Low score for violation, but not blocking
                }
            }
        }
        return 1; // Perfect score if no research day conflict
    }
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
    checkClassTypeTime(entry) {
        const hour = parseInt(entry.timeSlot.startTime.split(":")[0]);
        const minute = parseInt(entry.timeSlot.startTime.split(":")[1]);
        const startMinutes = hour * 60 + minute;
        if (entry.classType === "sore") {
            if (startMinutes < 15 * 60 + 30) {
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
    checkExclusiveRoomConstraint(entry) {
        const exclusiveConfig = EXCLUSIVE_ROOMS[entry.room];
        if (!exclusiveConfig)
            return true;
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
    // SOFT CONSTRAINTS
    checkPreferredTime(entry) {
        let totalScore = 0;
        let count = 0;
        for (const lecturerCode of entry.lecturers) {
            const lecturer = this.lecturers.get(lecturerCode);
            if (!lecturer || !lecturer.Prefered_Time) {
                continue;
            }
            const entryDay = entry.timeSlot.day.toLowerCase();
            const entryTimeStr = entry.timeSlot.startTime;
            const [entryHour, entryMinute] = entryTimeStr.split(":").map(Number);
            const entryTimeInMinutes = entryHour * 60 + entryMinute;
            const dailySchedules = lecturer.Prefered_Time.toLowerCase().split(", ");
            let isPreferred = false;
            for (const schedule of dailySchedules) {
                const [timeRange1, _, timeRange2, day] = schedule.trim().split(" ");
                const timeRange = `${timeRange1} ${_} ${timeRange2}`;
                if (day !== entryDay) {
                    continue;
                }
                const [startTime, endTime] = timeRange.split(" - ");
                const [startHour, startMinute] = startTime.split(".").map(Number);
                const [endHour, endMinute] = endTime.split(".").map(Number);
                const startTimeInMinutes = startHour * 60 + startMinute;
                const endTimeInMinutes = endHour * 60 + endMinute;
                if (entryTimeInMinutes >= startTimeInMinutes && entryTimeInMinutes < endTimeInMinutes) {
                    isPreferred = true;
                    break;
                }
            }
            count++;
            if (isPreferred) {
                totalScore += 1;
            }
        }
        return count > 0 ? totalScore / count : 1;
    }
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
                if (prevEndMins >= currentStartMins) {
                    continue;
                }
                const gapMinutes = currentStartMins - prevEndMins;
                if (gapMinutes < lecturer.Transit_Time) {
                    const score = Math.max(0, gapMinutes / lecturer.Transit_Time);
                    this.addViolation({
                        classId: entry.classId,
                        className: entry.className,
                        constraintType: "SC3: Transit Time",
                        reason: `Lecturer ${lecturerCode} has insufficient transit time (${gapMinutes} mins, required: ${lecturer.Transit_Time} mins) between class ${existing.classId} and ${entry.classId}`,
                        severity: "soft",
                        details: { lecturer: lecturerCode, gapMinutes, requiredTransitTime: lecturer.Transit_Time, previousClassId: existing.classId },
                    });
                    minScore = Math.min(minScore, score);
                }
            }
        }
        return minScore;
    }
    checkCompactness(schedule, entry) {
        const sameDayClasses = schedule.filter((s) => s.timeSlot.day === entry.timeSlot.day);
        if (sameDayClasses.length === 0)
            return 1;
        let minGap = Infinity;
        const currentStartMins = timeToMinutes(entry.timeSlot.startTime);
        const currentEndMins = timeToMinutes(calculateEndTime(entry.timeSlot.startTime, entry.sks, entry.timeSlot.day).endTime);
        for (const existing of sameDayClasses) {
            const existingEndMins = timeToMinutes(calculateEndTime(existing.timeSlot.startTime, existing.sks, existing.timeSlot.day).endTime);
            const existingStartMins = timeToMinutes(existing.timeSlot.startTime);
            if (existingEndMins <= currentStartMins) {
                const gap = currentStartMins - existingEndMins;
                minGap = Math.min(minGap, gap);
            }
            if (currentEndMins <= existingStartMins) {
                const gap = existingStartMins - currentEndMins;
                minGap = Math.min(minGap, gap);
            }
        }
        if (minGap === Infinity)
            return 1;
        return minGap <= 60 ? 1 : Math.max(0, 1 - (minGap - 60) / 180);
    }
    checkPrayerTimeOverlap(entry) {
        const prayerTime = getPrayerTimeOverlap(entry.timeSlot.startTime, entry.sks, entry.timeSlot.day);
        if (prayerTime === 0) {
            return 1;
        }
        // SPECIAL PENALTY for Friday 12:00 prayer time (Jumat prayer is critical!)
        let score = Math.max(0.5, 1 - prayerTime / 100);
        if (entry.timeSlot.day === "Friday") {
            const startMinutes = timeToMinutes(entry.timeSlot.startTime);
            const endTime = calculateEndTime(entry.timeSlot.startTime, entry.sks, entry.timeSlot.day).endTime;
            const endMinutes = timeToMinutes(endTime);
            // Check if class overlaps with Friday 12:00-13:00 (critical Jumat prayer time)
            const fridayPrayerStart = 12 * 60; // 12:00
            const fridayPrayerEnd = 13 * 60; // 13:00
            if (startMinutes < fridayPrayerEnd && endMinutes > fridayPrayerStart) {
                // CRITICAL violation: overlapping with Friday Jumat prayer
                score = 0.1; // Very low score (high penalty)
            }
        }
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
    checkEveningClassPriority(entry) {
        if (entry.classType !== "sore")
            return 1;
        const startMinutes = timeToMinutes(entry.timeSlot.startTime);
        if (startMinutes >= 15 * 60 + 30 && startMinutes < 16 * 60) {
            return 0.8;
        }
        else if (startMinutes >= 16 * 60 && startMinutes < 18 * 60) {
            return 0.8;
        }
        else if (startMinutes >= 18 * 60 && startMinutes < 18 * 60 + 30) {
            return 0.85;
        }
        else if (startMinutes === 18 * 60 + 30) {
            return 1.0;
        }
        else if (startMinutes >= 19 * 60 + 30) {
            this.addViolation({
                classId: entry.classId,
                className: entry.className,
                constraintType: "SC6: Late Evening Start",
                reason: `Evening class starting too late at ${entry.timeSlot.startTime} (should avoid 19:30+)`,
                severity: "soft",
                details: { startTime: entry.timeSlot.startTime },
            });
            return 0.1;
        }
        return 0.1;
    }
    checkOverflowPenalty(entry) {
        if (entry.isOverflowToLab) {
            this.addViolation({
                classId: entry.classId,
                className: entry.className,
                constraintType: "SC7: Overflow to Lab",
                reason: `Non-lab class using lab room ${entry.room} due to non-lab rooms being full`,
                severity: "soft",
                details: { room: entry.room },
            });
            return 0.7;
        }
        return 1;
    }
}
exports.ConstraintChecker = ConstraintChecker;
// ============================================
// SIMULATED ANNEALING SOLVER WITH SWAP & REHEATING
// ============================================
class SimulatedAnnealing {
    rooms;
    lecturers;
    classes;
    checker;
    initialTemperature = 10000;
    minTemperature = 0.0000001;
    coolingRate = 0.997; // FASTER - was 0.9995 (too slow)
    maxIterations = 15000; // INCREASED from 10000 to eliminate remaining HC5 conflicts
    // NEW: Reheating parameters
    reheatingThreshold = 1200; // SHORTER - was 1500 (more frequent reheating)
    reheatingFactor = 100; // STRONGER - was 80 (more aggressive escape from local minima)
    maxReheats = 7; // MORE chances - was 5 (more opportunities to find better solutions)
    // NEW: Operator tracking
    operatorStats = {
        move: { attempts: 0, improvements: 0, successRate: 0 },
        swap: { attempts: 0, improvements: 0, successRate: 0 },
    };
    // INCREASED hard constraint weight - make violations more expensive
    hardConstraintWeight = 100000; // Was 10000
    softConstraintWeights = {
        preferredTime: 10,
        preferredRoom: 5,
        transitTime: 20,
        compactness: 8,
        prayerTimeOverlap: 15,
        eveningClassPriority: 25,
        labRequirement: 10,
        overflowPenalty: 5,
    };
    constructor(rooms, lecturers, classes) {
        this.rooms = rooms;
        this.lecturers = lecturers;
        this.classes = classes;
        this.checker = new ConstraintChecker(rooms, lecturers);
    }
    /**
     * Helper: Check if adding an entry would cause prodi conflict (HC5)
     */
    wouldCauseProdiConflict(schedule, entry) {
        for (const existing of schedule) {
            if (existing.prodi === entry.prodi && existing.timeSlot.day === entry.timeSlot.day) {
                const calc1 = calculateEndTime(existing.timeSlot.startTime, existing.sks, existing.timeSlot.day);
                const calc2 = calculateEndTime(entry.timeSlot.startTime, entry.sks, entry.timeSlot.day);
                const start1 = timeToMinutes(existing.timeSlot.startTime);
                const end1 = timeToMinutes(calc1.endTime);
                const start2 = timeToMinutes(entry.timeSlot.startTime);
                const end2 = timeToMinutes(calc2.endTime);
                if (start1 < end2 && start2 < end1) {
                    return true;
                }
            }
        }
        return false;
    }
    /**
     * Helper: Check if adding an entry would cause lecturer conflict (HC1)
     */
    wouldCauseLecturerConflict(schedule, entry) {
        for (const existing of schedule) {
            if (existing.timeSlot.day === entry.timeSlot.day) {
                const calc1 = calculateEndTime(existing.timeSlot.startTime, existing.sks, existing.timeSlot.day);
                const calc2 = calculateEndTime(entry.timeSlot.startTime, entry.sks, entry.timeSlot.day);
                const start1 = timeToMinutes(existing.timeSlot.startTime);
                const end1 = timeToMinutes(calc1.endTime);
                const start2 = timeToMinutes(entry.timeSlot.startTime);
                const end2 = timeToMinutes(calc2.endTime);
                if (start1 < end2 && start2 < end1) {
                    for (const lecturer of entry.lecturers) {
                        if (existing.lecturers.includes(lecturer)) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }
    /**
     * Helper: Check if entry has any hard constraint violation
     * NOTE: Research Day is now SC8 (soft constraint), removed from here
     */
    hasAnyHardViolation(schedule, entry) {
        return (this.wouldCauseProdiConflict(schedule, entry) ||
            this.wouldCauseLecturerConflict(schedule, entry));
    }
    /**
     * Generate initial solution
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
            let availableTimeSlots = [];
            if (classType === "sore") {
                availableTimeSlots = TIME_SLOTS_SORE.slice().sort((a, b) => {
                    const aMinutes = timeToMinutes(a.startTime);
                    const bMinutes = timeToMinutes(b.startTime);
                    return aMinutes - bMinutes;
                });
            }
            else {
                availableTimeSlots = TIME_SLOTS_PAGI.slice();
            }
            const isMagisterManajemen = prodi.toLowerCase().includes("magister manajemen");
            if (!isMagisterManajemen) {
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
            if (availableTimeSlots.length === 0)
                continue;
            let placed = false;
            for (const timeSlot of availableTimeSlots) {
                const roomCodes = getAvailableRooms(this.rooms, schedule, classReq, timeSlot, participants, needsLab, courseName, prodi);
                if (roomCodes.length > 0) {
                    const selectedRoom = roomCodes[0];
                    const prayerTimeCalc = calculateEndTime(timeSlot.startTime, classReq.SKS || 3, timeSlot.day);
                    const isOverflow = !needsLab && LAB_ROOMS.includes(selectedRoom);
                    // Create temporary entry for validation
                    const tempEntry = {
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
                    };
                    // CHECK CRITICAL HARD CONSTRAINTS before adding
                    // Skip if would cause HC1 (Lecturer Conflict) or HC5 (Prodi Conflict)
                    // NOTE: Research Day is now SC8 (soft), so we don't block on it
                    if (this.wouldCauseProdiConflict(schedule, tempEntry)) {
                        continue; // Try next timeslot
                    }
                    if (this.wouldCauseLecturerConflict(schedule, tempEntry)) {
                        continue; // Try next timeslot
                    }
                    // All critical hard constraints passed - add to schedule
                    schedule.push(tempEntry);
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
     * Calculate fitness
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
            // REMOVED: checkResearchDay - now a soft constraint (SC8)
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
            softPenalty += (1 - this.checker.checkResearchDay(entry)) * 50; // NEW: SC8 Research Day with weight 50
        }
        return hardViolations * this.hardConstraintWeight + softPenalty;
    }
    /**
     * Helper: Get indices of classes with hard constraint violations
     */
    getViolatingClassIndices(schedule) {
        const violatingIndices = [];
        for (let i = 0; i < schedule.length; i++) {
            const entry = schedule[i];
            const scheduleBeforeEntry = schedule.slice(0, i);
            const scheduleAfterEntry = schedule.slice(i + 1);
            const scheduleWithoutEntry = [...scheduleBeforeEntry, ...scheduleAfterEntry];
            if (this.hasAnyHardViolation(scheduleWithoutEntry, entry)) {
                violatingIndices.push(i);
            }
        }
        return violatingIndices;
    }
    /**
     * NEW: Generate neighbor with MOVE operator (IMPROVED - targets violations)
     */
    generateNeighborMove(solution) {
        const newSchedule = JSON.parse(JSON.stringify(solution.schedule));
        // PRIORITIZE fixing hard violations: 80% target violating classes, 20% random
        const violatingIndices = this.getViolatingClassIndices(newSchedule);
        let randomIndex;
        if (violatingIndices.length > 0 && Math.random() < 0.8) {
            // Pick a violating class
            randomIndex = violatingIndices[Math.floor(Math.random() * violatingIndices.length)];
        }
        else {
            // Pick random class
            randomIndex = Math.floor(Math.random() * newSchedule.length);
        }
        const entry = newSchedule[randomIndex];
        const modType = Math.random();
        if (modType < 0.5) {
            // Change time slot - TRY TO AVOID HARD VIOLATIONS
            let availableTimeSlots = [];
            if (entry.classType === "sore") {
                availableTimeSlots = TIME_SLOTS_SORE.slice().sort((a, b) => {
                    const aMinutes = timeToMinutes(a.startTime);
                    const bMinutes = timeToMinutes(b.startTime);
                    return aMinutes - bMinutes;
                });
            }
            else {
                availableTimeSlots = TIME_SLOTS_PAGI.slice();
            }
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
                // Remove current entry temporarily
                const scheduleWithoutEntry = newSchedule.filter((_, idx) => idx !== randomIndex);
                // Try to find timeslots that don't violate hard constraints
                const validTimeSlots = [];
                for (const slot of availableTimeSlots) {
                    const tempEntry = { ...entry, timeSlot: slot };
                    const calc = calculateEndTime(slot.startTime, entry.sks, slot.day);
                    tempEntry.prayerTimeAdded = calc.prayerTimeAdded;
                    // Check if this timeslot would cause hard violations
                    if (!this.hasAnyHardViolation(scheduleWithoutEntry, tempEntry)) {
                        validTimeSlots.push(slot);
                    }
                }
                // Prefer valid timeslots (90%), but allow some randomness (10%)
                let newSlot;
                if (validTimeSlots.length > 0 && Math.random() < 0.9) {
                    newSlot = validTimeSlots[Math.floor(Math.random() * validTimeSlots.length)];
                }
                else {
                    newSlot = availableTimeSlots[Math.floor(Math.random() * availableTimeSlots.length)];
                }
                entry.timeSlot = newSlot;
                const calc = calculateEndTime(newSlot.startTime, entry.sks, newSlot.day);
                entry.prayerTimeAdded = calc.prayerTimeAdded;
            }
        }
        else {
            // Change room
            const classReq = this.classes.find((c) => c.Kode_Matakuliah === entry.classId);
            if (!classReq)
                return solution;
            const scheduleWithoutCurrent = newSchedule.filter((_, idx) => idx !== randomIndex);
            const roomCodes = getAvailableRooms(this.rooms, scheduleWithoutCurrent, classReq, entry.timeSlot, entry.participants, entry.needsLab, entry.className, entry.prodi);
            if (roomCodes.length > 0) {
                const newRoom = roomCodes[Math.floor(Math.random() * roomCodes.length)];
                entry.room = newRoom;
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
     * NEW: Generate neighbor with SWAP operator
     * Menukar timeslot dan/atau room dari dua kelas
     */
    generateNeighborSwap(solution) {
        const newSchedule = JSON.parse(JSON.stringify(solution.schedule));
        if (newSchedule.length < 2)
            return solution;
        // Pilih dua kelas random
        const idx1 = Math.floor(Math.random() * newSchedule.length);
        let idx2 = Math.floor(Math.random() * newSchedule.length);
        // Pastikan idx2 berbeda dari idx1
        while (idx2 === idx1) {
            idx2 = Math.floor(Math.random() * newSchedule.length);
        }
        const entry1 = newSchedule[idx1];
        const entry2 = newSchedule[idx2];
        // Swap strategy: pilih apa yang akan ditukar
        const swapType = Math.random();
        if (swapType < 0.33) {
            // SWAP TIMESLOT ONLY
            const tempTimeSlot = { ...entry1.timeSlot };
            entry1.timeSlot = { ...entry2.timeSlot };
            entry2.timeSlot = tempTimeSlot;
            // Recalculate prayer times
            const calc1 = calculateEndTime(entry1.timeSlot.startTime, entry1.sks, entry1.timeSlot.day);
            entry1.prayerTimeAdded = calc1.prayerTimeAdded;
            const calc2 = calculateEndTime(entry2.timeSlot.startTime, entry2.sks, entry2.timeSlot.day);
            entry2.prayerTimeAdded = calc2.prayerTimeAdded;
        }
        else if (swapType < 0.66) {
            // SWAP ROOM ONLY
            const tempRoom = entry1.room;
            entry1.room = entry2.room;
            entry2.room = tempRoom;
            // Update overflow flags
            entry1.isOverflowToLab = !entry1.needsLab && LAB_ROOMS.includes(entry1.room);
            entry2.isOverflowToLab = !entry2.needsLab && LAB_ROOMS.includes(entry2.room);
        }
        else {
            // SWAP BOTH TIMESLOT AND ROOM (complete swap)
            const tempTimeSlot = { ...entry1.timeSlot };
            const tempRoom = entry1.room;
            entry1.timeSlot = { ...entry2.timeSlot };
            entry1.room = entry2.room;
            entry2.timeSlot = tempTimeSlot;
            entry2.room = tempRoom;
            // Recalculate prayer times
            const calc1 = calculateEndTime(entry1.timeSlot.startTime, entry1.sks, entry1.timeSlot.day);
            entry1.prayerTimeAdded = calc1.prayerTimeAdded;
            const calc2 = calculateEndTime(entry2.timeSlot.startTime, entry2.sks, entry2.timeSlot.day);
            entry2.prayerTimeAdded = calc2.prayerTimeAdded;
            // Update overflow flags
            entry1.isOverflowToLab = !entry1.needsLab && LAB_ROOMS.includes(entry1.room);
            entry2.isOverflowToLab = !entry2.needsLab && LAB_ROOMS.includes(entry2.room);
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
     * NEW: Adaptive neighbor generation
     * Memilih operator berdasarkan success rate
     */
    generateNeighbor(solution) {
        // Update success rates
        if (this.operatorStats.move.attempts > 0) {
            this.operatorStats.move.successRate = this.operatorStats.move.improvements / this.operatorStats.move.attempts;
        }
        if (this.operatorStats.swap.attempts > 0) {
            this.operatorStats.swap.successRate = this.operatorStats.swap.improvements / this.operatorStats.swap.attempts;
        }
        // Adaptive selection: prefer operator with higher success rate
        // But maintain some randomness (30% random, 70% adaptive)
        let useSwap = false;
        if (Math.random() < 0.3) {
            // 30% random
            useSwap = Math.random() < 0.5;
        }
        else {
            // 70% adaptive based on success rate
            const moveRate = this.operatorStats.move.successRate;
            const swapRate = this.operatorStats.swap.successRate;
            // If both have no data, use 50-50
            if (moveRate === 0 && swapRate === 0) {
                useSwap = Math.random() < 0.5;
            }
            else {
                // Use probability based on success rates
                const totalRate = moveRate + swapRate;
                useSwap = Math.random() < swapRate / totalRate;
            }
        }
        const operator = useSwap ? "swap" : "move";
        const newSolution = useSwap ? this.generateNeighborSwap(solution) : this.generateNeighborMove(solution);
        return { solution: newSolution, operator };
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
     * NEW: Acceptance probability for Phase 1 (Hard Constraints Only)
     * Much stricter - only accept if hard violations decrease or stay same
     */
    acceptanceProbabilityPhase1(currentHardViolations, newHardViolations, currentFitness, newFitness, temperature) {
        // Always accept if hard violations decrease
        if (newHardViolations < currentHardViolations) {
            return 1.0;
        }
        // If hard violations stay same, use standard acceptance for fitness
        if (newHardViolations === currentHardViolations) {
            if (newFitness < currentFitness) {
                return 1.0;
            }
            return Math.exp((currentFitness - newFitness) / temperature);
        }
        // REJECT if hard violations increase (very strict)
        return 0.0;
    }
    /**
     * Helper: Count hard violations in a solution
     */
    countHardViolations(schedule) {
        this.checker.resetViolations();
        let hardViolations = 0;
        for (let i = 0; i < schedule.length; i++) {
            const entry = schedule[i];
            const scheduleBeforeEntry = schedule.slice(0, i);
            if (!this.checker.checkNoLecturerConflict(scheduleBeforeEntry, entry))
                hardViolations++;
            if (!this.checker.checkNoRoomConflict(scheduleBeforeEntry, entry))
                hardViolations++;
            if (!this.checker.checkRoomCapacity(entry))
                hardViolations++;
            if (!this.checker.checkNoClassConflictSameProdi(scheduleBeforeEntry, entry))
                hardViolations++;
            // REMOVED: checkResearchDay - now a soft constraint (SC8)
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
        }
        return hardViolations;
    }
    /**
     * Main SA algorithm with SWAP operator and REHEATING
     */
    solve() {
        console.log("🚀 Starting Enhanced Simulated Annealing V3 - TWO PHASE...");
        console.log("   PHASE 1: Eliminate hard constraints");
        console.log("   PHASE 2: Optimize soft constraints\n");
        let currentSolution = this.generateInitialSolution();
        let bestSolution = JSON.parse(JSON.stringify(currentSolution));
        let temperature = this.initialTemperature;
        let iteration = 0;
        // NEW: Reheating tracking
        let iterationsWithoutImprovement = 0;
        let reheatingCount = 0;
        // Count initial hard violations
        let currentHardViolations = this.countHardViolations(currentSolution.schedule);
        let bestHardViolations = currentHardViolations;
        console.log(`Initial fitness: ${currentSolution.fitness.toFixed(2)}`);
        console.log(`Initial hard violations: ${currentHardViolations}`);
        console.log(`Initial schedule size: ${currentSolution.schedule.length} classes\n`);
        // ========================================
        // PHASE 1: ELIMINATE HARD CONSTRAINTS
        // ========================================
        console.log("🎯 PHASE 1: Focusing on hard constraints...\n");
        const phase1MaxIterations = Math.floor(this.maxIterations * 0.6); // 60% of iterations
        let phase1Iteration = 0;
        while (temperature > this.initialTemperature / 10 && phase1Iteration < phase1MaxIterations && bestHardViolations > 0) {
            const { solution: newSolution, operator } = this.generateNeighbor(currentSolution);
            // Track operator usage
            if (operator === "move") {
                this.operatorStats.move.attempts++;
            }
            else {
                this.operatorStats.swap.attempts++;
            }
            // Count hard violations in new solution
            const newHardViolations = this.countHardViolations(newSolution.schedule);
            // PHASE 1: Strict acceptance - prioritize reducing hard violations
            const acceptProb = this.acceptanceProbabilityPhase1(currentHardViolations, newHardViolations, currentSolution.fitness, newSolution.fitness, temperature);
            if (Math.random() < acceptProb) {
                // Track improvements
                if (newSolution.fitness < currentSolution.fitness) {
                    if (operator === "move") {
                        this.operatorStats.move.improvements++;
                    }
                    else {
                        this.operatorStats.swap.improvements++;
                    }
                }
                currentSolution = newSolution;
                currentHardViolations = newHardViolations;
                if (newHardViolations < bestHardViolations || (newHardViolations === bestHardViolations && newSolution.fitness < bestSolution.fitness)) {
                    bestSolution = JSON.parse(JSON.stringify(currentSolution));
                    bestHardViolations = newHardViolations;
                    iterationsWithoutImprovement = 0;
                    console.log(`✨ [PHASE 1] Hard violations: ${bestHardViolations}, ` + `Iteration: ${phase1Iteration}, ` + `Temp: ${temperature.toFixed(2)}, ` + `Fitness: ${bestSolution.fitness.toFixed(2)}, ` + `Operator: ${operator.toUpperCase()}`);
                }
                else {
                    iterationsWithoutImprovement++;
                }
            }
            else {
                iterationsWithoutImprovement++;
            }
            // Reheating for Phase 1
            if (iterationsWithoutImprovement >= this.reheatingThreshold && reheatingCount < this.maxReheats && temperature < this.initialTemperature / 100) {
                temperature *= this.reheatingFactor;
                reheatingCount++;
                iterationsWithoutImprovement = 0;
                console.log(`🔥 [PHASE 1] REHEATING #${reheatingCount}! ` + `Temp: ${temperature.toFixed(2)}, ` + `Hard violations: ${bestHardViolations}`);
            }
            temperature *= this.coolingRate;
            phase1Iteration++;
            iteration++;
            if (phase1Iteration % 1000 === 0) {
                console.log(`⏳ [PHASE 1] Iteration ${phase1Iteration}, ` + `Temp: ${temperature.toFixed(2)}, ` + `Hard violations: ${currentHardViolations}, ` + `Best hard violations: ${bestHardViolations}`);
            }
        }
        console.log(`\n✅ PHASE 1 Complete! Hard violations: ${bestHardViolations}\n`);
        // ========================================
        // PHASE 2: OPTIMIZE SOFT CONSTRAINTS
        // ========================================
        console.log("🎯 PHASE 2: Optimizing soft constraints...\n");
        // Reset for phase 2
        currentSolution = JSON.parse(JSON.stringify(bestSolution));
        iterationsWithoutImprovement = 0;
        while (temperature > this.minTemperature && iteration < this.maxIterations) {
            const { solution: newSolution, operator } = this.generateNeighbor(currentSolution);
            // Track operator usage
            if (operator === "move") {
                this.operatorStats.move.attempts++;
            }
            else {
                this.operatorStats.swap.attempts++;
            }
            // PHASE 2: Standard acceptance - optimize overall fitness
            const acceptProb = this.acceptanceProbability(currentSolution.fitness, newSolution.fitness, temperature);
            if (Math.random() < acceptProb) {
                // Track improvements
                if (newSolution.fitness < currentSolution.fitness) {
                    if (operator === "move") {
                        this.operatorStats.move.improvements++;
                    }
                    else {
                        this.operatorStats.swap.improvements++;
                    }
                }
                currentSolution = newSolution;
                if (currentSolution.fitness < bestSolution.fitness) {
                    bestSolution = JSON.parse(JSON.stringify(currentSolution));
                    iterationsWithoutImprovement = 0;
                    console.log(`✨ [PHASE 2] New best! Iteration ${iteration}, ` + `Temp: ${temperature.toFixed(2)}, ` + `Fitness: ${bestSolution.fitness.toFixed(2)}, ` + `Operator: ${operator.toUpperCase()}`);
                }
                else {
                    iterationsWithoutImprovement++;
                }
            }
            else {
                iterationsWithoutImprovement++;
            }
            // Reheating for Phase 2
            if (iterationsWithoutImprovement >= this.reheatingThreshold && reheatingCount < this.maxReheats && temperature < this.initialTemperature / 100) {
                temperature *= this.reheatingFactor;
                reheatingCount++;
                iterationsWithoutImprovement = 0;
                console.log(`🔥 [PHASE 2] REHEATING #${reheatingCount}! ` + `Temp: ${temperature.toFixed(2)}, ` + `Fitness: ${bestSolution.fitness.toFixed(2)}`);
            }
            temperature *= this.coolingRate;
            iteration++;
            if (iteration % 1000 === 0) {
                console.log(`⏳ [PHASE 2] Iteration ${iteration}, ` + `Temp: ${temperature.toFixed(2)}, ` + `Current: ${currentSolution.fitness.toFixed(2)}, ` + `Best: ${bestSolution.fitness.toFixed(2)}`);
            }
        }
        console.log(`\n🎉 Optimization complete!`);
        console.log(`Final best fitness: ${bestSolution.fitness.toFixed(2)}`);
        console.log(`Total iterations: ${iteration}`);
        console.log(`Total reheating: ${reheatingCount}\n`);
        // Print operator statistics
        console.log("📊 Operator Statistics:");
        console.log(`   MOVE: ${this.operatorStats.move.attempts} attempts, ` + `${this.operatorStats.move.improvements} improvements, ` + `Success rate: ${(this.operatorStats.move.successRate * 100).toFixed(2)}%`);
        console.log(`   SWAP: ${this.operatorStats.swap.attempts} attempts, ` + `${this.operatorStats.swap.improvements} improvements, ` + `Success rate: ${(this.operatorStats.swap.successRate * 100).toFixed(2)}%\n`);
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
    console.log("ENHANCED SA V3 - UTCP SOLVER");
    console.log("University Timetabling Problem");
    console.log("With Swap Operator & Reheating");
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
    if (!fs_1.default.existsSync(outDir)) {
        fs_1.default.mkdirSync(outDir, { recursive: true });
    }
    fs_1.default.writeFileSync(`${outDir}/timetable_result_v3.json`, JSON.stringify(output, null, 2));
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
    fs_1.default.writeFileSync(`${outDir}/overflow_report_v3.json`, JSON.stringify(overflowReport, null, 2));
    // Save violation report
    if (solution.violationReport) {
        fs_1.default.writeFileSync(`${outDir}/violation_report_v3.json`, JSON.stringify(solution.violationReport, null, 2));
        // Create human-readable violation report
        let reportText = "==========================================\n";
        reportText += "CONSTRAINT VIOLATION REPORT V3\n";
        reportText += "With Swap Operator & Reheating\n";
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
        fs_1.default.writeFileSync(`${outDir}/violation_report_v3.txt`, reportText);
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
    XLSX.writeFile(wb, `${outDir}/timetable_result_v3.xlsx`);
    console.log("✅ Results saved to:");
    console.log(`   - ${outDir}/timetable_result_v3.json`);
    console.log(`   - ${outDir}/timetable_result_v3.xlsx`);
    console.log(`   - ${outDir}/overflow_report_v3.json`);
    console.log(`   - ${outDir}/violation_report_v3.json`);
    console.log(`   - ${outDir}/violation_report_v3.txt\n`);
    console.log("==========================================");
    console.log("PROCESS COMPLETE! 🎓");
    console.log("==========================================");
}
if (require.main === module) {
    main();
}
//# sourceMappingURL=sa-v3.js.map