/**
 * Basic example: University course timetabling with v2 core
 *
 * This demonstrates how to use the generic timetable-sa v2 library
 * to solve university course timetabling problems.
 *
 * Run with: npm run example:timetabling
 */

import { SimulatedAnnealing } from "timetable-sa";
import type { SAConfig, Constraint, MoveGenerator } from "timetable-sa";
import type { TimetableState } from "./types/index.js";
import { loadDataFromExcel } from "./data/index.js";
import { generateInitialSolution } from "./utils/initial-solution.js";
import { NoFridayPrayConflict } from "./constraints/hard/NoFridayPrayConflit.js";
import fs from "fs";

import { NoLecturerConflict, NoRoomConflict, RoomCapacity, NoProdiConflict, MaxDailyPeriods, ClassTypeTime, SaturdayRestriction, FridayTimeRestriction, PrayerTimeStart, ExclusiveRoom } from "./constraints/hard/index.js";
import { Compactness, EveningClassPriority, OverflowPenalty, PrayerTimeOverlap, PreferredRoom, PreferredTime, ResearchDay, TransitTime } from "./constraints/soft/index.js";
import { ChangeTimeSlot, ChangeRoom, SwapClasses, ChangeTimeSlotAndRoom, FixFridayPrayerConflict, SwapFridayWithNonFriday, FixLecturerConflict, FixRoomConflict, FixMaxDailyPeriods, FixRoomCapacity } from "./moves/index.js";

console.log("=".repeat(70));
console.log("  UNIVERSITY COURSE TIMETABLING - Simulated Annealing v2.0");
console.log("=".repeat(70));

// 1. Load data from Excel
console.log("\n📂 Loading data from Excel file...");
const dataPath = "./data_uisi.xlsx";
const data = loadDataFromExcel(dataPath);

console.log(`✅ Data loaded successfully!`);
console.log(`   Rooms: ${data.rooms.length}`);
console.log(`   Lecturers: ${data.lecturers.length}`);
console.log(`   Classes: ${data.classes.length}`);

// 2. Generate initial solution using greedy algorithm
console.log("\n🏗️  Generating initial timetable (greedy algorithm)...");
const initialState = generateInitialSolution(data);

// Save initial solution for comparison
fs.writeFileSync(
  "initial-solution.json",
  JSON.stringify(initialState.schedule, null, 2)
);

// 3. Define constraints
console.log("\n⚖️  Setting up constraints...");

const constraints: Constraint<TimetableState>[] = [
  // Hard constraints (MUST be satisfied)
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

  // Soft constraints (preferences)
  new PreferredTime(10), // weight = 10
  new PreferredRoom(10),
  new TransitTime(5),
  new Compactness(15),
  new PrayerTimeOverlap(20),
  new EveningClassPriority(20),
  new ResearchDay(10),
  new OverflowPenalty(10),
];

const hardCount = constraints.filter(c => c.type === 'hard').length;
const softCount = constraints.filter(c => c.type === 'soft').length;
console.log(`   Hard constraints: ${hardCount}`);
console.log(`   Soft constraints: ${softCount}`);

// 4. Define move operators
console.log("\n🔄 Setting up move operators...");

const moveGenerators: MoveGenerator<TimetableState>[] = [
  // Targeted operators (higher priority - will be selected more often when violations exist)
  new FixFridayPrayerConflict(),
  new SwapFridayWithNonFriday(), // NEW: Advanced operator to break Friday deadlocks
  new FixLecturerConflict(),
  new FixRoomConflict(),
  new FixMaxDailyPeriods(),
  new FixRoomCapacity(),

  // General operators (for exploration and optimization)
  new ChangeTimeSlotAndRoom(), // ULTIMATE smart operator - changes both time AND room
  new ChangeTimeSlot(),
  new ChangeRoom(),
  new SwapClasses(),
];

console.log(`   Targeted operators: 6 (including Friday swap operator)`);
console.log(`   General operators: 4 (including smart time+room operator)`);
console.log(`   Total operators: ${moveGenerators.length}`);

// 5. Configure Simulated Annealing
console.log("\n⚙️  Configuring Simulated Annealing...");

const config: SAConfig<TimetableState> = {
  initialTemperature: 100000, // Higher for better exploration at start
  minTemperature: 0.0000001,
  coolingRate: 0.9998, // Slower cooling for thorough search
  maxIterations: 100000, // Increased for better convergence (15-30 min runtime)
  hardConstraintWeight: 100000, // Very high penalty for hard violations

  // State cloning function
  cloneState: (state) => JSON.parse(JSON.stringify(state)),

  // Reheating to escape local minima
  reheatingThreshold: 500, // Reheat if no improvement for 500 iterations
  reheatingFactor: 150, // Strong reheating boost
  maxReheats: 10,

  // Logging
  logging: {
    enabled: true,
    level: "info",
    logInterval: 500,
  },
};

console.log(`   Initial temperature: ${config.initialTemperature}`);
console.log(`   Cooling rate: ${config.coolingRate}`);
console.log(`   Max iterations: ${config.maxIterations}`);


// 6. Create solver and run optimization
console.log("\n🚀 Starting optimization...\n");
console.log("=".repeat(70));

const solver = new SimulatedAnnealing(initialState, constraints, moveGenerators, config);

const solution = solver.solve();

console.log("=".repeat(70));
console.log("\n✨ OPTIMIZATION COMPLETE!\n");

// 7. Display results
console.log("📊 RESULTS:");
console.log(`   Final fitness: ${solution.fitness.toFixed(2)}`);
console.log(`   Hard constraint violations: ${solution.hardViolations}`);
console.log(`   Soft constraint violations: ${solution.softViolations}`);
console.log(`   Total iterations: ${solution.iterations}`);
console.log(`   Reheating events: ${solution.reheats}`);
console.log(`   Final temperature: ${solution.finalTemperature.toFixed(4)}`);
console.log(`   Classes scheduled: ${solution.state.schedule.length}/${data.classes.length}`);

console.log("\n📈 OPERATOR STATISTICS:");
for (const [operatorName, stats] of Object.entries(solution.operatorStats)) {
  console.log(`   ${operatorName}:`);
  console.log(`      Attempts: ${stats.attempts}`);
  console.log(`      Improvements: ${stats.improvements}`);
  console.log(`      Success rate: ${(stats.successRate * 100).toFixed(2)}%`);
}

if (solution.violations.length > 0) {
  console.log(`\n⚠️  VIOLATIONS (${solution.violations.length}):`);
  solution.violations.slice(0, 10).forEach((v) => {
    console.log(`   - [${v.constraintType}] ${v.constraintName}: ${v.description || "No description"}`);
  });
  if (solution.violations.length > 10) {
    console.log(`   ... and ${solution.violations.length - 10} more`);
  }
} else {
  console.log("\n🎉 NO VIOLATIONS - Perfect timetable!");
}

console.log("\n" + "=".repeat(70));
console.log("✅ Example completed successfully!");
console.log("=".repeat(70) + "\n");

// Optional: Save results to JSON
import fs from "fs";
fs.writeFileSync(
  "timetable-result.json",
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

console.log("💾 Results saved to: timetable-result.json\n");
