/**
 * Simulated Annealing algorithm for University Course Timetabling Problem (UCTP)
 *
 * Features:
 * - Two-phase optimization (hard constraints → soft constraints)
 * - Swap and move operators with adaptive selection
 * - Reheating mechanism to escape local minima
 * - Comprehensive constraint checking
 */

import type {
  Room,
  Lecturer,
  ClassRequirement,
  ScheduleEntry,
  Solution,
  TimeSlot,
  OperatorStats,
  AlgorithmConfig,
  ViolationReport,
} from "../types/index.js";
import { ConstraintChecker } from "../constraints/index.js";
import {
  TIME_SLOTS_PAGI,
  TIME_SLOTS_SORE,
  LAB_ROOMS,
  EXCLUSIVE_ROOMS,
  initializeTimeSlots,
  setCustomTimeSlots,
} from "../constants/index.js";
import fs from "fs";
import path from "path";
import {
  calculateEndTime,
  timeToMinutes,
  isValidFridayStartTime,
  isStartingDuringPrayerTime,
  getAvailableRooms,
  hasClassOverlap,
} from "../utils/index.js";
import { mergeConfig } from "./config.js";
import { Logger } from "../utils/logger.js";

export class SimulatedAnnealing {
  private rooms: Room[];
  private lecturers: Lecturer[];
  private classes: ClassRequirement[];
  private checker: ConstraintChecker;
  private logger: Logger;

  // Algorithm parameters (with defaults)
  private initialTemperature: number;
  private minTemperature: number;
  private coolingRate: number;
  private maxIterations: number;
  private reheatingThreshold: number;
  private reheatingFactor: number;
  private maxReheats: number;
  private hardConstraintWeight: number;
  private softConstraintWeights: Required<AlgorithmConfig>["softConstraintWeights"];

  // Operator tracking
  private operatorStats: OperatorStats = {
    move: { attempts: 0, improvements: 0, successRate: 0 },
    swap: { attempts: 0, improvements: 0, successRate: 0 },
  };

  constructor(
    rooms: Room[],
    lecturers: Lecturer[],
    classes: ClassRequirement[],
    config?: AlgorithmConfig
  ) {
    this.rooms = rooms;
    this.lecturers = lecturers;
    this.classes = classes;

    // Merge user config with defaults
    const mergedConfig = mergeConfig(config);

    // Initialize logger
    this.logger = new Logger(mergedConfig.logging);
    this.logger.info("Initializing Simulated Annealing algorithm");

    // Initialize constraint checker with configuration
    this.checker = new ConstraintChecker(
      rooms,
      lecturers,
      mergedConfig.constraints.hardConstraints,
      mergedConfig.constraints.softConstraints,
      mergedConfig.constraints.customConstraints
    );

    this.initialTemperature = mergedConfig.initialTemperature;
    this.minTemperature = mergedConfig.minTemperature;
    this.coolingRate = mergedConfig.coolingRate;
    this.maxIterations = mergedConfig.maxIterations;
    this.reheatingThreshold = mergedConfig.reheatingThreshold;
    this.reheatingFactor = mergedConfig.reheatingFactor;
    this.maxReheats = mergedConfig.maxReheats;
    this.hardConstraintWeight = mergedConfig.hardConstraintWeight;
    this.softConstraintWeights = mergedConfig.softConstraintWeights;

    // Initialize time slots based on configuration
    // Priority: customTimeSlots > timeSlotConfig > defaults
    if (mergedConfig.customTimeSlots) {
      // Mode 2: Full custom override
      console.log("🕐 Using custom time slots (full override mode)");
      setCustomTimeSlots(
        mergedConfig.customTimeSlots.pagi,
        mergedConfig.customTimeSlots.sore
      );
    } else if (config?.timeSlotConfig) {
      // Mode 1: Merge with defaults
      console.log("🕐 Using configurable time slots (merge mode)");
      initializeTimeSlots(
        mergedConfig.timeSlotConfig.pagi,
        mergedConfig.timeSlotConfig.sore,
        mergedConfig.timeSlotConfig.days
      );
    } else {
      // Use defaults (already initialized by time-slots.ts)
      console.log("🕐 Using default time slots");
    }
  }

  /**
   * Check if adding an entry would cause prodi conflict (HC5)
   */
  private wouldCauseProdiConflict(schedule: ScheduleEntry[], entry: ScheduleEntry): boolean {
    for (const existing of schedule) {
      // Check if same prodi, same day, and overlapping classes
      if (existing.prodi === entry.prodi && existing.timeSlot.day === entry.timeSlot.day && hasClassOverlap(existing.class, entry.class)) {
        const calc1 = calculateEndTime(existing.timeSlot.startTime, existing.sks, existing.timeSlot.day);
        const calc2 = calculateEndTime(entry.timeSlot.startTime, entry.sks, entry.timeSlot.day);

        const start1 = timeToMinutes(existing.timeSlot.startTime);
        const end1 = timeToMinutes(calc1.endTime);
        const start2 = timeToMinutes(entry.timeSlot.startTime);
        const end2 = timeToMinutes(calc2.endTime);

        // Check if time overlaps
        if (start1 < end2 && start2 < end1) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Check if adding an entry would cause lecturer conflict (HC1)
   */
  private wouldCauseLecturerConflict(schedule: ScheduleEntry[], entry: ScheduleEntry): boolean {
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
   * Check if entry has any hard constraint violation
   */
  private hasAnyHardViolation(schedule: ScheduleEntry[], entry: ScheduleEntry): boolean {
    return this.wouldCauseProdiConflict(schedule, entry) || this.wouldCauseLecturerConflict(schedule, entry);
  }

  /**
   * Generate initial solution using greedy approach
   */
  private generateInitialSolution(): Solution {
    const schedule: ScheduleEntry[] = [];
    const skippedClasses: { reason: string; class: string; code: string }[] = [];

    let i = 0;
    for (const classReq of this.classes) {
      if (!classReq.Kode_Matakuliah) {
        skippedClasses.push({
          reason: 'Missing course code',
          class: classReq.Mata_Kuliah || 'Unknown',
          code: 'N/A',
        });
        continue;
      }

      const lecturers: string[] = [];      
      if (classReq.Kode_Dosen1) lecturers.push(classReq.Kode_Dosen1);
      if (classReq.Kode_Dosen2) lecturers.push(classReq.Kode_Dosen2);
      if (classReq.Kode_Dosen_Prodi_Lain1) lecturers.push(classReq.Kode_Dosen_Prodi_Lain1);
      if (classReq.Kode_Dosen_Prodi_Lain2) lecturers.push(classReq.Kode_Dosen_Prodi_Lain2);

      if (lecturers.length === 0) {
        skippedClasses.push({
          reason: 'No lecturers assigned',
          class: classReq.Mata_Kuliah || 'Unknown',
          code: classReq.Kode_Matakuliah,
        });
        continue;
      }      

      const participants = classReq.Peserta || 30;
      const needsLab = classReq.should_on_the_lab?.toLowerCase() === "yes";
      const classType = classReq.Class_Type?.toLowerCase() || "pagi";
      const prodi = classReq.Prodi || "Unknown";
      const courseName = classReq.Mata_Kuliah || "Unknown";

      let availableTimeSlots: TimeSlot[] = [];

      if (classType === "sore") {
        availableTimeSlots = TIME_SLOTS_SORE.slice().sort((a, b) => {
          const aMinutes = timeToMinutes(a.startTime);
          const bMinutes = timeToMinutes(b.startTime);          
          return aMinutes - bMinutes;
        });

      } else {
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

      if (availableTimeSlots.length === 0) {
        skippedClasses.push({
          reason: 'No valid time slots available (after filtering)',
          class: classReq.Mata_Kuliah || 'Unknown',
          code: classReq.Kode_Matakuliah,
        });
        continue;
      }

      let placed = false;
      for (const timeSlot of availableTimeSlots) {
        const roomCodes = getAvailableRooms(
          this.rooms,
          schedule,
          classReq,
          timeSlot,
          participants,
          needsLab,
          courseName,
          prodi
        );

        if (roomCodes.length > 0) {
          const selectedRoom = roomCodes[0]!;
          const sks = classReq.SKS || 3;
          const prayerTimeCalc = calculateEndTime(timeSlot.startTime, sks, timeSlot.day);
          const isOverflow = !needsLab && LAB_ROOMS.includes(selectedRoom);

          // Create time slot with correct end time based on SKS
          const actualTimeSlot: TimeSlot = {
            ...timeSlot,
            endTime: prayerTimeCalc.endTime,  // Use calculated end time based on SKS
          };

          const tempEntry: ScheduleEntry = {
            classId: classReq.Kode_Matakuliah,
            className: courseName,
            class: classReq.Kelas || "A",
            prodi,
            lecturers,
            room: selectedRoom,
            timeSlot: actualTimeSlot,  // Use updated time slot with correct endTime
            sks,
            needsLab,
            participants,
            classType,
            prayerTimeAdded: prayerTimeCalc.prayerTimeAdded,
            isOverflowToLab: isOverflow,
          };

          if (this.wouldCauseProdiConflict(schedule, tempEntry)) {
            continue;
          }

          if (this.wouldCauseLecturerConflict(schedule, tempEntry)) {
            continue;
          }

          schedule.push(tempEntry);
          placed = true;
          break;
        }
      }

      if (!placed) {
        console.log(courseName, classReq); 
        
        skippedClasses.push({
          reason: 'Could not find valid room/time slot combination',
          class: courseName,
          code: classReq.Kode_Matakuliah,
        });
        console.warn(`⚠️  Could not place class: ${classReq.Kode_Matakuliah} - ${courseName}`);
      }
    }

    // Log summary of skipped classes
    if (skippedClasses.length > 0) {
      console.log(`\n⚠️  SCHEDULING SUMMARY:`);
      console.log(`   Total classes to schedule: ${this.classes.length}`);
      console.log(`   Successfully scheduled: ${schedule.length}`);
      console.log(`   Skipped/Failed: ${skippedClasses.length}\n`);

      // Group by reason
      const byReason: { [key: string]: typeof skippedClasses } = {};
      for (const skip of skippedClasses) {
        if (!byReason[skip.reason]) {
          byReason[skip.reason] = [];
        }
        byReason[skip.reason]!.push(skip);
      }

      console.log(`📊 Breakdown by reason:`);
      for (const [reason, classes] of Object.entries(byReason)) {
        console.log(`\n   ${reason}: ${classes.length} classes`);
        classes.slice(0, 5).forEach((c) => {
          console.log(`     - ${c.code}: ${c.class}`);
        });
        if (classes.length > 5) {
          console.log(`     ... and ${classes.length - 5} more`);
        }
      }
      console.log();

      // Save to file for detailed review
      const logPath = path.join(process.cwd(), 'unscheduled-classes.json');
      fs.writeFileSync(logPath, JSON.stringify({
        summary: {
          totalClasses: this.classes.length,
          scheduled: schedule.length,
          unscheduled: skippedClasses.length,
        },
        skippedClasses,
        byReason: Object.entries(byReason).map(([reason, classes]) => ({
          reason,
          count: classes.length,
          classes,
        })),
      }, null, 2));
      console.log(`📝 Detailed report saved to: ${logPath}\n`);
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
   * Calculate fitness score for a schedule
   */
  private calculateFitness(schedule: ScheduleEntry[]): number {
    this.checker.resetViolations();

    let hardViolations = 0;
    let softPenalty = 0;

    for (let i = 0; i < schedule.length; i++) {
      const entry = schedule[i]!;
      const scheduleBeforeEntry = schedule.slice(0, i);

      // HARD CONSTRAINTS
      if (!this.checker.checkNoLecturerConflict(scheduleBeforeEntry, entry)) hardViolations++;
      if (!this.checker.checkNoRoomConflict(scheduleBeforeEntry, entry)) hardViolations++;
      if (!this.checker.checkRoomCapacity(entry)) hardViolations++;
      if (!this.checker.checkNoClassConflictSameProdi(scheduleBeforeEntry, entry)) hardViolations++;
      if (!this.checker.checkMaxDailyPeriods(scheduleBeforeEntry, entry)) hardViolations++;
      if (!this.checker.checkClassTypeTime(entry)) hardViolations++;
      if (!this.checker.checkSaturdayRestriction(entry)) hardViolations++;
      if (!this.checker.checkFridayTimeRestriction(entry)) hardViolations++;
      if (!this.checker.checkNotStartingDuringPrayerTime(entry)) hardViolations++;
      if (!this.checker.checkExclusiveRoomConstraint(entry)) hardViolations++;

      // SOFT CONSTRAINTS
      softPenalty += (1 - this.checker.checkPreferredTime(entry)) * this.softConstraintWeights.preferredTime!;
      softPenalty += (1 - this.checker.checkPreferredRoom(entry)) * this.softConstraintWeights.preferredRoom!;
      softPenalty += (1 - this.checker.checkTransitTime(scheduleBeforeEntry, entry)) * this.softConstraintWeights.transitTime!;
      softPenalty += (1 - this.checker.checkCompactness(scheduleBeforeEntry, entry)) * this.softConstraintWeights.compactness!;
      softPenalty += (1 - this.checker.checkLabRequirement(entry)) * this.softConstraintWeights.labRequirement!;
      softPenalty += (1 - this.checker.checkPrayerTimeOverlap(entry)) * this.softConstraintWeights.prayerTimeOverlap!;
      softPenalty += (1 - this.checker.checkEveningClassPriority(entry)) * this.softConstraintWeights.eveningClassPriority!;
      softPenalty += (1 - this.checker.checkOverflowPenalty(entry)) * this.softConstraintWeights.overflowPenalty!;
      softPenalty += (1 - this.checker.checkResearchDay(entry)) * 50; // SC8 Research Day

      // CUSTOM CONSTRAINTS
      const customResult = this.checker.checkCustomConstraints(scheduleBeforeEntry, entry);
      hardViolations += customResult.hardViolations;
      softPenalty += customResult.softPenalty;
    }

    const fitness = hardViolations * this.hardConstraintWeight + softPenalty;

    this.logger.debug("Fitness calculated", {
      hardViolations,
      softPenalty,
      fitness,
    });

    return fitness;
  }

  /**
   * Get indices of classes with hard constraint violations
   */
  private getViolatingClassIndices(schedule: ScheduleEntry[]): number[] {
    const violatingIndices: number[] = [];

    for (let i = 0; i < schedule.length; i++) {
      const entry = schedule[i]!;
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
   * Generate neighbor using MOVE operator
   */
  private generateNeighborMove(solution: Solution): Solution {
    const newSchedule = JSON.parse(JSON.stringify(solution.schedule)) as ScheduleEntry[];

    // Return unchanged if no schedule entries
    if (newSchedule.length === 0) {
      return solution;
    }

    // Prioritize fixing hard violations
    const violatingIndices = this.getViolatingClassIndices(newSchedule);
    let randomIndex: number;

    if (violatingIndices.length > 0 && Math.random() < 0.8) {
      randomIndex = violatingIndices[Math.floor(Math.random() * violatingIndices.length)]!;
    } else {
      randomIndex = Math.floor(Math.random() * newSchedule.length);
    }

    const entry = newSchedule[randomIndex]!;
    const modType = Math.random();

    if (modType < 0.5) {
      // Change time slot
      let availableTimeSlots: TimeSlot[] = [];

      if (entry.classType === "sore") {
        availableTimeSlots = TIME_SLOTS_SORE.slice().sort((a, b) => {
          const aMinutes = timeToMinutes(a.startTime);
          const bMinutes = timeToMinutes(b.startTime);
          return aMinutes - bMinutes;
        });
      } else {
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
        const scheduleWithoutEntry = newSchedule.filter((_, idx) => idx !== randomIndex);

        const validTimeSlots: TimeSlot[] = [];
        for (const slot of availableTimeSlots) {
          const tempEntry = { ...entry, timeSlot: slot };
          const calc = calculateEndTime(slot.startTime, entry.sks, slot.day);
          tempEntry.prayerTimeAdded = calc.prayerTimeAdded;

          if (!this.hasAnyHardViolation(scheduleWithoutEntry, tempEntry)) {
            validTimeSlots.push(slot);
          }
        }

        let newSlot: TimeSlot;
        if (validTimeSlots.length > 0 && Math.random() < 0.9) {
          newSlot = validTimeSlots[Math.floor(Math.random() * validTimeSlots.length)]!;
        } else {
          newSlot = availableTimeSlots[Math.floor(Math.random() * availableTimeSlots.length)]!;
        }

        // Calculate actual end time based on SKS
        const calc = calculateEndTime(newSlot.startTime, entry.sks, newSlot.day);
        entry.timeSlot = {
          ...newSlot,
          endTime: calc.endTime,  // Use calculated end time
        };
        entry.prayerTimeAdded = calc.prayerTimeAdded;
      }
    } else {
      // Change room
      let requiresExclusiveRoom = false;
      for (const [roomCode, config] of Object.entries(EXCLUSIVE_ROOMS)) {
        const courseMatch = config.courses.some((c) => entry.className.toLowerCase().includes(c.toLowerCase()));
        const prodiMatch = !config.prodi || entry.prodi.toLowerCase().includes(config.prodi.toLowerCase());
        if (courseMatch && prodiMatch) {
          requiresExclusiveRoom = true;
          break;
        }
      }

      if (!requiresExclusiveRoom) {
        const classReq = this.classes.find((c) => c.Kode_Matakuliah === entry.classId);
        if (classReq) {
          const scheduleWithoutCurrent = newSchedule.filter((_, idx) => idx !== randomIndex);
          const roomCodes = getAvailableRooms(
            this.rooms,
            scheduleWithoutCurrent,
            classReq,
            entry.timeSlot,
            entry.participants,
            entry.needsLab,
            entry.className,
            entry.prodi
          );

          if (roomCodes.length > 0) {
            const newRoom = roomCodes[Math.floor(Math.random() * roomCodes.length)]!;
            entry.room = newRoom;
            entry.isOverflowToLab = !entry.needsLab && LAB_ROOMS.includes(newRoom);
          }
        }
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
   * Generate neighbor using SWAP operator
   */
  private generateNeighborSwap(solution: Solution): Solution {
    const newSchedule = JSON.parse(JSON.stringify(solution.schedule)) as ScheduleEntry[];

    if (newSchedule.length < 2) return solution;

    const idx1 = Math.floor(Math.random() * newSchedule.length);
    let idx2 = Math.floor(Math.random() * newSchedule.length);

    while (idx2 === idx1) {
      idx2 = Math.floor(Math.random() * newSchedule.length);
    }

    const entry1 = newSchedule[idx1]!;
    const entry2 = newSchedule[idx2]!;

    // Check exclusive room requirements
    let entry1RequiresExclusiveRoom = false;
    let entry2RequiresExclusiveRoom = false;

    for (const [roomCode, config] of Object.entries(EXCLUSIVE_ROOMS)) {
      const entry1Match = config.courses.some((c) => entry1.className.toLowerCase().includes(c.toLowerCase()));
      const entry1ProdiMatch = !config.prodi || entry1.prodi.toLowerCase().includes(config.prodi.toLowerCase());
      if (entry1Match && entry1ProdiMatch) {
        entry1RequiresExclusiveRoom = true;
      }

      const entry2Match = config.courses.some((c) => entry2.className.toLowerCase().includes(c.toLowerCase()));
      const entry2ProdiMatch = !config.prodi || entry2.prodi.toLowerCase().includes(config.prodi.toLowerCase());
      if (entry2Match && entry2ProdiMatch) {
        entry2RequiresExclusiveRoom = true;
      }
    }

    const canSwapRooms = !entry1RequiresExclusiveRoom && !entry2RequiresExclusiveRoom;
    const swapType = Math.random();

    if (swapType < 0.33) {
      // SWAP TIMESLOT ONLY
      const tempTimeSlot = { ...entry1.timeSlot };

      // Swap and recalculate end times based on each class's SKS
      const calc1 = calculateEndTime(entry2.timeSlot.startTime, entry1.sks, entry2.timeSlot.day);
      entry1.timeSlot = {
        ...entry2.timeSlot,
        endTime: calc1.endTime,  // Recalculate for entry1's SKS
      };
      entry1.prayerTimeAdded = calc1.prayerTimeAdded;

      const calc2 = calculateEndTime(tempTimeSlot.startTime, entry2.sks, tempTimeSlot.day);
      entry2.timeSlot = {
        ...tempTimeSlot,
        endTime: calc2.endTime,  // Recalculate for entry2's SKS
      };
      entry2.prayerTimeAdded = calc2.prayerTimeAdded;
    } else if (swapType < 0.66) {
      // SWAP ROOM ONLY
      if (canSwapRooms) {
        const tempRoom = entry1.room;
        entry1.room = entry2.room;
        entry2.room = tempRoom;

        entry1.isOverflowToLab = !entry1.needsLab && LAB_ROOMS.includes(entry1.room);
        entry2.isOverflowToLab = !entry2.needsLab && LAB_ROOMS.includes(entry2.room);
      } else {
        // Fall back to timeslot swap
        const tempTimeSlot = { ...entry1.timeSlot };

        const calc1 = calculateEndTime(entry2.timeSlot.startTime, entry1.sks, entry2.timeSlot.day);
        entry1.timeSlot = {
          ...entry2.timeSlot,
          endTime: calc1.endTime,
        };
        entry1.prayerTimeAdded = calc1.prayerTimeAdded;

        const calc2 = calculateEndTime(tempTimeSlot.startTime, entry2.sks, tempTimeSlot.day);
        entry2.timeSlot = {
          ...tempTimeSlot,
          endTime: calc2.endTime,
        };
        entry2.prayerTimeAdded = calc2.prayerTimeAdded;
      }
    } else {
      // SWAP BOTH
      const tempTimeSlot = { ...entry1.timeSlot };

      const calc1 = calculateEndTime(entry2.timeSlot.startTime, entry1.sks, entry2.timeSlot.day);
      entry1.timeSlot = {
        ...entry2.timeSlot,
        endTime: calc1.endTime,
      };
      entry1.prayerTimeAdded = calc1.prayerTimeAdded;

      const calc2 = calculateEndTime(tempTimeSlot.startTime, entry2.sks, tempTimeSlot.day);
      entry2.timeSlot = {
        ...tempTimeSlot,
        endTime: calc2.endTime,
      };
      entry2.prayerTimeAdded = calc2.prayerTimeAdded;

      if (canSwapRooms) {
        const tempRoom = entry1.room;
        entry1.room = entry2.room;
        entry2.room = tempRoom;

        entry1.isOverflowToLab = !entry1.needsLab && LAB_ROOMS.includes(entry1.room);
        entry2.isOverflowToLab = !entry2.needsLab && LAB_ROOMS.includes(entry2.room);
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
   * Adaptive neighbor generation (chooses between move and swap)
   */
  private generateNeighbor(solution: Solution): { solution: Solution; operator: "move" | "swap" } {
    if (this.operatorStats.move.attempts > 0) {
      this.operatorStats.move.successRate = this.operatorStats.move.improvements / this.operatorStats.move.attempts;
    }
    if (this.operatorStats.swap.attempts > 0) {
      this.operatorStats.swap.successRate = this.operatorStats.swap.improvements / this.operatorStats.swap.attempts;
    }

    let useSwap = false;

    if (Math.random() < 0.3) {
      useSwap = Math.random() < 0.5;
    } else {
      const moveRate = this.operatorStats.move.successRate;
      const swapRate = this.operatorStats.swap.successRate;

      if (moveRate === 0 && swapRate === 0) {
        useSwap = Math.random() < 0.5;
      } else {
        const totalRate = moveRate + swapRate;
        useSwap = Math.random() < swapRate / totalRate;
      }
    }

    const operator = useSwap ? "swap" : "move";
    const newSolution = useSwap ? this.generateNeighborSwap(solution) : this.generateNeighborMove(solution);

    return { solution: newSolution, operator };
  }

  /**
   * Acceptance probability for standard SA
   */
  private acceptanceProbability(currentFitness: number, newFitness: number, temperature: number): number {
    if (newFitness < currentFitness) {
      return 1.0;
    }
    return Math.exp((currentFitness - newFitness) / temperature);
  }

  /**
   * Acceptance probability for Phase 1 (strict on hard constraints)
   */
  private acceptanceProbabilityPhase1(
    currentHardViolations: number,
    newHardViolations: number,
    currentFitness: number,
    newFitness: number,
    temperature: number
  ): number {
    if (newHardViolations < currentHardViolations) {
      return 1.0;
    }

    if (newHardViolations === currentHardViolations) {
      if (newFitness < currentFitness) {
        return 1.0;
      }
      return Math.exp((currentFitness - newFitness) / temperature);
    }

    return 0.0;
  }

  /**
   * Count hard violations in a solution
   */
  private countHardViolations(schedule: ScheduleEntry[]): number {
    this.checker.resetViolations();
    let hardViolations = 0;

    for (let i = 0; i < schedule.length; i++) {
      const entry = schedule[i]!;
      const scheduleBeforeEntry = schedule.slice(0, i);

      if (!this.checker.checkNoLecturerConflict(scheduleBeforeEntry, entry)) hardViolations++;
      if (!this.checker.checkNoRoomConflict(scheduleBeforeEntry, entry)) hardViolations++;
      if (!this.checker.checkRoomCapacity(entry)) hardViolations++;
      if (!this.checker.checkNoClassConflictSameProdi(scheduleBeforeEntry, entry)) hardViolations++;
      if (!this.checker.checkMaxDailyPeriods(scheduleBeforeEntry, entry)) hardViolations++;
      if (!this.checker.checkClassTypeTime(entry)) hardViolations++;
      if (!this.checker.checkSaturdayRestriction(entry)) hardViolations++;
      if (!this.checker.checkFridayTimeRestriction(entry)) hardViolations++;
      if (!this.checker.checkNotStartingDuringPrayerTime(entry)) hardViolations++;
      if (!this.checker.checkExclusiveRoomConstraint(entry)) hardViolations++;
    }

    return hardViolations;
  }

  /**
   * Main solve method using two-phase Simulated Annealing
   */
  solve(): Solution {
    console.log("🚀 Starting Enhanced Simulated Annealing V3 - TWO PHASE...");
    console.log("   PHASE 1: Eliminate hard constraints");
    console.log("   PHASE 2: Optimize soft constraints\n");

    this.logger.info("Starting Simulated Annealing optimization");
    this.logger.info("Algorithm configuration", {
      initialTemperature: this.initialTemperature,
      minTemperature: this.minTemperature,
      coolingRate: this.coolingRate,
      maxIterations: this.maxIterations,
    });

    let currentSolution = this.generateInitialSolution();
    let bestSolution = JSON.parse(JSON.stringify(currentSolution));


    let temperature = this.initialTemperature;
    let iteration = 0;

    let iterationsWithoutImprovement = 0;
    let reheatingCount = 0;

    let currentHardViolations = this.countHardViolations(currentSolution.schedule);
    let bestHardViolations = currentHardViolations;

    console.log(`Initial fitness: ${currentSolution.fitness.toFixed(2)}`);
    console.log(`Initial hard violations: ${currentHardViolations}`);
    console.log(`Initial schedule size: ${currentSolution.schedule.length} classes\n`);

    this.logger.info("Initial solution generated", {
      fitness: currentSolution.fitness,
      hardViolations: currentHardViolations,
      scheduleSize: currentSolution.schedule.length,
    });

    // PHASE 1: ELIMINATE HARD CONSTRAINTS
    console.log("🎯 PHASE 1: Focusing on hard constraints...\n");
    this.logger.logPhaseChange(1, "Eliminate hard constraints");
    const phase1MaxIterations = Math.floor(this.maxIterations * 0.6);
    let phase1Iteration = 0;

    while (temperature > this.initialTemperature / 10 && phase1Iteration < phase1MaxIterations && bestHardViolations > 0) {
      const { solution: newSolution, operator } = this.generateNeighbor(currentSolution);

      if (operator === "move") {
        this.operatorStats.move.attempts++;
      } else {
        this.operatorStats.swap.attempts++;
      }

      const newHardViolations = this.countHardViolations(newSolution.schedule);
      const acceptProb = this.acceptanceProbabilityPhase1(
        currentHardViolations,
        newHardViolations,
        currentSolution.fitness,
        newSolution.fitness,
        temperature
      );

      if (Math.random() < acceptProb) {
        if (newSolution.fitness < currentSolution.fitness) {
          if (operator === "move") {
            this.operatorStats.move.improvements++;
          } else {
            this.operatorStats.swap.improvements++;
          }
        }

        currentSolution = newSolution;
        currentHardViolations = newHardViolations;

        if (
          newHardViolations < bestHardViolations ||
          (newHardViolations === bestHardViolations && newSolution.fitness < bestSolution.fitness)
        ) {
          bestSolution = JSON.parse(JSON.stringify(currentSolution));
          bestHardViolations = newHardViolations;
          iterationsWithoutImprovement = 0;

          console.log(
            `✨ [PHASE 1] Hard violations: ${bestHardViolations}, ` +
            `Iteration: ${phase1Iteration}, ` +
            `Temp: ${temperature.toFixed(2)}, ` +
            `Fitness: ${bestSolution.fitness.toFixed(2)}, ` +
            `Operator: ${operator.toUpperCase()}`
          );
        } else {
          iterationsWithoutImprovement++;
        }
      } else {
        iterationsWithoutImprovement++;
      }

      if (
        iterationsWithoutImprovement >= this.reheatingThreshold &&
        reheatingCount < this.maxReheats &&
        temperature < this.initialTemperature / 100
      ) {
        temperature *= this.reheatingFactor;
        reheatingCount++;
        iterationsWithoutImprovement = 0;

        console.log(
          `🔥 [PHASE 1] REHEATING #${reheatingCount}! ` +
          `Temp: ${temperature.toFixed(2)}, ` +
          `Hard violations: ${bestHardViolations}`
        );
      }

      temperature *= this.coolingRate;
      phase1Iteration++;
      iteration++;

      if (phase1Iteration % 1000 === 0) {
        console.log(
          `⏳ [PHASE 1] Iteration ${phase1Iteration}, ` +
          `Temp: ${temperature.toFixed(2)}, ` +
          `Hard violations: ${currentHardViolations}, ` +
          `Best hard violations: ${bestHardViolations}`
        );
      }
    }

    console.log(`\n✅ PHASE 1 Complete! Hard violations: ${bestHardViolations}\n`);

    this.logger.info("Phase 1 completed", {
      hardViolations: bestHardViolations,
      iterations: phase1Iteration,
      bestFitness: bestSolution.fitness,
    });

    // PHASE 2: OPTIMIZE SOFT CONSTRAINTS
    console.log("🎯 PHASE 2: Optimizing soft constraints...\n");
    this.logger.logPhaseChange(2, "Optimize soft constraints");

    currentSolution = JSON.parse(JSON.stringify(bestSolution));
    iterationsWithoutImprovement = 0;

    while (temperature > this.minTemperature && iteration < this.maxIterations) {
      const { solution: newSolution, operator } = this.generateNeighbor(currentSolution);

      if (operator === "move") {
        this.operatorStats.move.attempts++;
      } else {
        this.operatorStats.swap.attempts++;
      }

      const acceptProb = this.acceptanceProbability(currentSolution.fitness, newSolution.fitness, temperature);

      if (Math.random() < acceptProb) {
        if (newSolution.fitness < currentSolution.fitness) {
          if (operator === "move") {
            this.operatorStats.move.improvements++;
          } else {
            this.operatorStats.swap.improvements++;
          }
        }

        currentSolution = newSolution;

        if (currentSolution.fitness < bestSolution.fitness) {
          bestSolution = JSON.parse(JSON.stringify(currentSolution));
          iterationsWithoutImprovement = 0;

          console.log(
            `✨ [PHASE 2] New best! Iteration ${iteration}, ` +
            `Temp: ${temperature.toFixed(2)}, ` +
            `Fitness: ${bestSolution.fitness.toFixed(2)}, ` +
            `Operator: ${operator.toUpperCase()}`
          );
        } else {
          iterationsWithoutImprovement++;
        }
      } else {
        iterationsWithoutImprovement++;
      }

      if (
        iterationsWithoutImprovement >= this.reheatingThreshold &&
        reheatingCount < this.maxReheats &&
        temperature < this.initialTemperature / 100
      ) {
        temperature *= this.reheatingFactor;
        reheatingCount++;
        iterationsWithoutImprovement = 0;

        console.log(
          `🔥 [PHASE 2] REHEATING #${reheatingCount}! ` +
          `Temp: ${temperature.toFixed(2)}, ` +
          `Fitness: ${bestSolution.fitness.toFixed(2)}`
        );
      }

      temperature *= this.coolingRate;
      iteration++;

      if (iteration % 1000 === 0) {
        console.log(
          `⏳ [PHASE 2] Iteration ${iteration}, ` +
          `Temp: ${temperature.toFixed(2)}, ` +
          `Current: ${currentSolution.fitness.toFixed(2)}, ` +
          `Best: ${bestSolution.fitness.toFixed(2)}`
        );
      }
    }

    console.log(`\n🎉 Optimization complete!`);
    console.log(`Final best fitness: ${bestSolution.fitness.toFixed(2)}`);
    console.log(`Total iterations: ${iteration}`);
    console.log(`Total reheating: ${reheatingCount}\n`);

    this.logger.info("Optimization completed", {
      finalFitness: bestSolution.fitness,
      totalIterations: iteration,
      totalReheats: reheatingCount,
      temperature: temperature,
    });

    console.log("📊 Operator Statistics:");
    console.log(
      `   MOVE: ${this.operatorStats.move.attempts} attempts, ` +
      `${this.operatorStats.move.improvements} improvements, ` +
      `Success rate: ${(this.operatorStats.move.successRate * 100).toFixed(2)}%`
    );
    console.log(
      `   SWAP: ${this.operatorStats.swap.attempts} attempts, ` +
      `${this.operatorStats.swap.improvements} improvements, ` +
      `Success rate: ${(this.operatorStats.swap.successRate * 100).toFixed(2)}%\n`
    );

    this.logger.logOperatorStats({
      operator: "MOVE",
      attempts: this.operatorStats.move.attempts,
      improvements: this.operatorStats.move.improvements,
      successRate: this.operatorStats.move.successRate,
    });

    this.logger.logOperatorStats({
      operator: "SWAP",
      attempts: this.operatorStats.swap.attempts,
      improvements: this.operatorStats.swap.improvements,
      successRate: this.operatorStats.swap.successRate,
    });

    // Generate final violation report
    this.calculateFitness(bestSolution.schedule);
    const violations = this.checker.getViolations();

    const hardViolations = violations.filter((v) => v.severity === "hard");
    const softViolations = violations.filter((v) => v.severity === "soft");

    const violationsByType: { [key: string]: number } = {};
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

    this.logger.info("Final violation report", {
      hardViolations: hardViolations.length,
      softViolations: softViolations.length,
      violationsByType,
    });

    // Close logger file stream
    this.logger.close();

    return bestSolution;
  }
}
