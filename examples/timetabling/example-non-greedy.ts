/**
 * Non-greedy example: University course timetabling with random initial state
 *
 * This mirrors example-basic.ts but uses a non-greedy initializer
 * (random slot+room placement without conflict checks) to compare convergence behavior.
 *
 * Run with: bun run example:timetabling:non-greedy
 */

import type {
  SAConfig,
  Constraint,
  MoveGenerator,
  ProgressStats,
} from "../../src/index.js";
import type {
  TimetableState,
  ScheduleEntry,
  TimetableInput,
  TimeSlot,
  ClassRequirement,
  Room,
} from "./types/index.js";
import { loadDataFromExcel } from "./data/index.js";
import { NoFridayPrayConflict } from "./constraints/hard/NoFridayPrayConflit.js";
import fs from "fs";
import { SimulatedAnnealing } from "../../src/index.js";
import {
  calculateEndTime,
  TIME_SLOTS_PAGI,
  TIME_SLOTS_SORE,
  initializeTimeSlots,
  getCacheStats,
} from "./utils/index.js";

import {
  NoLecturerConflict,
  NoRoomConflict,
  RoomCapacity,
  NoProdiConflict,
  MaxDailyPeriods,
  ClassTypeTime,
  SaturdayRestriction,
  FridayTimeRestriction,
  PrayerTimeStart,
  ExclusiveRoom,
} from "./constraints/hard/index.js";
import {
  Compactness,
  EveningClassPriority,
  OverflowPenalty,
  PrayerTimeOverlap,
  PreferredRoom,
  PreferredTime,
  ResearchDay,
  TransitTime,
} from "./constraints/soft/index.js";
import {
  ChangeTimeSlot,
  ChangeRoom,
  SwapClasses,
  ChangeTimeSlotAndRoom,
  FixFridayPrayerConflict,
  FixFridayLecturerConflict,
  FixLecturerConflict,
  FixRoomConflict,
  FixMaxDailyPeriods,
  FixRoomCapacity,
  FixExclusiveRoom,
} from "./moves/index.js";
import { SwapFridayWithNonFriday } from "./moves/SwapFridayWithNonFriday.js";

function pickRandom<T>(items: T[]): T | null {
  if (items.length === 0) return null;
  const index = Math.floor(Math.random() * items.length);
  return items[index] ?? null;
}

function getLecturerCodes(classReq: ClassRequirement): string[] {
  const lecturerCodes: string[] = [];
  if (classReq.Kode_Dosen1) lecturerCodes.push(classReq.Kode_Dosen1);
  if (classReq.Kode_Dosen2) lecturerCodes.push(classReq.Kode_Dosen2);
  if (classReq.Kode_Dosen_Prodi_Lain1) lecturerCodes.push(classReq.Kode_Dosen_Prodi_Lain1);
  if (classReq.Kode_Dosen_Prodi_Lain2) lecturerCodes.push(classReq.Kode_Dosen_Prodi_Lain2);
  return lecturerCodes;
}

function filterSuitableRooms(
  rooms: Room[],
  participants: number,
  needsLab: boolean
): Room[] {
  return rooms.filter((room) => {
    if (room.Capacity < participants) return false;
    if (needsLab && !room.Type.toLowerCase().includes("lab")) return false;
    return true;
  });
}

function generateRandomInitialSolution(data: TimetableInput): TimetableState {
  const { rooms, lecturers, classes } = data;
  initializeTimeSlots();

  const schedule: ScheduleEntry[] = [];
  const availableTimeSlots: TimeSlot[] = [...TIME_SLOTS_PAGI, ...TIME_SLOTS_SORE];

  console.log(`\nGenerating NON-GREEDY initial solution for ${classes.length} classes...`);
  console.log(`   🎲 Random slot+room assignment without conflict pre-check`);

  let successCount = 0;
  let failCount = 0;

  for (const classReq of classes) {
    const lecturerCodes = getLecturerCodes(classReq);
    if (lecturerCodes.length === 0) {
      console.warn(
        `  ⚠️  Skipping ${classReq.Kode_Matakuliah}: No lecturers on class ${classReq.Mata_Kuliah}`
      );
      failCount++;
      continue;
    }

    const participants = classReq.Peserta || 30;
    const needsLab = classReq.should_on_the_lab?.toLowerCase() === "yes";
    const classType = classReq.Class_Type?.toLowerCase() || "pagi";
    const prodi = classReq.Prodi || "Unknown";
    const sks = classReq.SKS || 3;

    let slots = classType === "sore" ? [...TIME_SLOTS_SORE] : [...TIME_SLOTS_PAGI];
    const isMM = prodi.toLowerCase().includes("magister manajemen");
    if (!isMM) {
      slots = slots.filter((slot) => slot.day !== "Saturday");
    }

    const suitableRooms = filterSuitableRooms(rooms, participants, needsLab);
    const slot = pickRandom(slots);
    const room = pickRandom(suitableRooms);

    if (!slot || !room) {
      console.warn(
        `  ⚠️  Could not place ${classReq.Kode_Matakuliah}: No slot/room candidate`
      );
      failCount++;
      continue;
    }

    const calc = calculateEndTime(slot.startTime, sks, slot.day);
    schedule.push({
      classId: classReq.Kode_Matakuliah,
      className: classReq.Mata_Kuliah || "Unknown",
      class: classReq.Kelas || "A",
      prodi,
      lecturers: lecturerCodes,
      room: room.Code,
      timeSlot: {
        period: slot.period,
        day: slot.day,
        startTime: slot.startTime,
        endTime: calc.endTime,
      },
      sks,
      needsLab,
      participants,
      classType,
      prayerTimeAdded: calc.prayerTimeAdded,
      isOverflowToLab: false,
    });
    successCount++;
  }

  console.log(`\n✅ NON-GREEDY initial solution generated:`);
  console.log(`   Successfully placed: ${successCount}/${classes.length}`);
  console.log(`   Failed to place: ${failCount}/${classes.length}\n`);

  fs.writeFileSync("initial-solution-non-greedy.json", JSON.stringify(schedule, null, 2));

  return {
    schedule,
    availableTimeSlots,
    rooms,
    lecturers,
  };
}

console.log("=".repeat(70));
console.log("  UNIVERSITY COURSE TIMETABLING - Simulated Annealing v2.0");
console.log("  NON-GREEDY INITIALIZATION MODE");
console.log("=".repeat(70));

const now = new Date();
const pad2 = (value: number) => String(value).padStart(2, "0");
const timestamp = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(
  now.getDate()
)}-${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}`;
const logFilePath = `./examples/timetabling/log/timetable-optimization-non-greedy-${timestamp}.log`;

console.log("\n📂 Loading data from Excel file...");
const dataPath = "./data_uisi.xlsx";
const data = loadDataFromExcel(dataPath);

console.log(`✅ Data loaded successfully!`);
console.log(`   Rooms: ${data.rooms.length}`);
console.log(`   Lecturers: ${data.lecturers.length}`);
console.log(`   Classes: ${data.classes.length}`);

console.log("\n🏗️  Generating initial timetable (NON-greedy random assignment)...");
const initialState = generateRandomInitialSolution(data);
console.log(`✅ Initial timetable generated!`);
fs.writeFileSync("initial-state-non-greedy.json", JSON.stringify(initialState, null, 2));

console.log("\n⚖️  Setting up constraints...");
const constraints: Constraint<TimetableState>[] = [
  new NoLecturerConflict(),
  new NoRoomConflict(),
  new RoomCapacity(),
  new NoProdiConflict(),
  new NoFridayPrayConflict(),
  new MaxDailyPeriods(),
  new ClassTypeTime(),
  new SaturdayRestriction(),
  new FridayTimeRestriction(),
  new PrayerTimeStart(),
  new ExclusiveRoom(),
  new PreferredTime(10),
  new PreferredRoom(10),
  new TransitTime(5),
  new Compactness(15),
  new PrayerTimeOverlap(20),
  new EveningClassPriority(20),
  new ResearchDay(10),
  new OverflowPenalty(10),
];

const hardCount = constraints.filter((c) => c.type === "hard").length;
const softCount = constraints.filter((c) => c.type === "soft").length;
console.log(`   Hard constraints: ${hardCount}`);
console.log(`   Soft constraints: ${softCount}`);

console.log("\n🔄 Setting up move operators...");
const moveGenerators: MoveGenerator<TimetableState>[] = [
  new FixFridayPrayerConflict(),
  new FixFridayLecturerConflict(),
  new SwapFridayWithNonFriday(),
  new FixLecturerConflict(),
  new FixRoomConflict(),
  new FixMaxDailyPeriods(),
  new FixRoomCapacity(),
  new FixExclusiveRoom(),
  new ChangeTimeSlotAndRoom(),
  new ChangeTimeSlot(),
  new ChangeRoom(),
  new SwapClasses(),
];

const TARGETED_REPAIR_OPERATORS = [
  "Fix Friday Prayer Conflict",
  "Fix Friday Lecturer Conflict",
  "Swap Friday with Non-Friday",
  "Fix Lecturer Conflict",
  "Fix Room Conflict",
  "Fix Max Daily Periods",
  "Fix Room Capacity",
  "Fix Exclusive Room",
];

console.log(
  `   Targeted operators: 8 (FixFridayPrayerConflict, FixFridayLecturerConflict, FixExclusiveRoom, etc.)`
);
console.log(`   General operators: 4 (including high-success ChangeTimeSlotAndRoom)`);
console.log(`   Total operators: ${moveGenerators.length}`);

console.log("\n⚙️  Configuring Simulated Annealing...");
const config: SAConfig<TimetableState> = {
  initialTemperature: 100000,
  minTemperature: 0.0000001,
  coolingRate: 0.9995,
  maxIterations: 1_000_000,
  hardConstraintWeight: 100000,
  cloneState: (state) => ({
    ...state,
    schedule: state.schedule.map((entry: ScheduleEntry) => ({ ...entry })),
  }),
  reheatingThreshold: 500,
  reheatingFactor: 150,
  maxReheats: 10,
  tabuSearchEnabled: true,
  tabuTenure: 200,
  maxTabuListSize: 1000,
  aspirationEnabled: true,
  enableIntensification: true,
  intensificationIterations: 2000,
  maxIntensificationAttempts: 3,
  intensificationStagnationLimit: 300,
  intensificationStartTemperatureMode: "phase1-end",
  intensificationStartTempMultiplier: 1.0,
  intensificationStartTempCapRatio: 1.0,
  intensificationUseTabu: true,
  intensificationTargetedOperatorNames: TARGETED_REPAIR_OPERATORS,
  intensificationTargetedSelectionRate: 0.7,
  intensificationEarlyStopNoBestImproveIterations: 800,
  intensificationBudgetFractionOfMaxIterations: 0.25,
  operatorSelectionMode: "hybrid",
  logging: {
    enabled: true,
    level: "info",
    logInterval: 500,
    output: "file",
    filePath: logFilePath,
  },
  onProgress: (
    iteration: number,
    cost: number,
    temperature: number,
    state: TimetableState | null,
    stats: ProgressStats
  ) => {},
};

console.log(`   Initial temperature: ${config.initialTemperature}`);
console.log(`   Cooling rate: ${config.coolingRate}`);
console.log(`   Max iterations: ${config.maxIterations}`);
console.log(`   Log file: ${logFilePath}`);

console.log("\n🚀 Starting optimization...\n");
console.log("=".repeat(70));

const solver = new SimulatedAnnealing(initialState, constraints, moveGenerators, config);
const solution = await solver.solve();

console.log("=".repeat(70));
console.log("\n✨ OPTIMIZATION COMPLETE!\n");
console.log("Cache stats:", getCacheStats());

console.log("📊 RESULTS:");
console.log(`   Final fitness: ${solution.fitness.toFixed(2)}`);
console.log(`   Hard constraint violations: ${solution.hardViolations}`);
console.log(`   Soft constraint violations: ${solution.softViolations}`);
console.log(`   Total iterations: ${solution.iterations}`);
console.log(`   Reheating events: ${solution.reheats}`);
console.log(`   Final temperature: ${solution.finalTemperature.toFixed(4)}`);
console.log(`   Classes scheduled: ${solution.state.schedule.length}/${data.classes.length}`);

console.log("\n" + "=".repeat(70));
console.log("✅ Non-greedy example completed successfully!");
console.log("=".repeat(70) + "\n");

fs.writeFileSync(
  "timetable-result-non-greedy.json",
  JSON.stringify(
    {
      fitness: solution.fitness,
      hardViolations: solution.hardViolations,
      softViolations: solution.softViolations,
      iterations: solution.iterations,
      schedule: solution.state.schedule,
      violation: solution.violations,
    },
    null,
    2
  )
);

console.log("💾 Results saved to: timetable-result-non-greedy.json\n");
