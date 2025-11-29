/**
 * Basic usage example for timetable-sa package
 */

import { SimulatedAnnealing, loadDataFromExcel } from "../index.js";
import fs from "fs";

async function main() {
  console.log("=".repeat(50));
  console.log("Timetable-SA: Basic Usage Example");
  console.log("=".repeat(50));

  // Load data from Excel file
  const dataPath = process.argv[2] || "/home/aikano/ade-belajar/timetable-sa/data_uisi.xlsx";
  console.log(`\nLoading data from: ${dataPath}`);

  const { rooms, lecturers, classes } = loadDataFromExcel(dataPath);

  console.log(`✅ Loaded ${rooms.length} rooms`);
  console.log(`✅ Loaded ${lecturers.length} lecturers`);
  console.log(`✅ Loaded ${classes.length} classes\n`);

  // i want to create custom config constraint, that is there is no class on friday between 10:50 to 13:00


  // Create solver with default configuration
  const solver = new SimulatedAnnealing(rooms, lecturers, classes, {
    constraints: {
      customConstraints: [
        {
          name: "No Classes on Friday 10:50-13:00",
          description: "Ensures that no classes are scheduled on Fridays between 10:50 and 13:00.",
          type: "hard",
          checkFunction: (scheduleEntry, entry) => {            
            const day = entry.timeSlot.day;
            const startTime = entry.timeSlot.startTime;
            const endTime = entry.timeSlot.endTime;

            if (day === "Friday") {
              const startHour = parseInt(startTime.split(":")[0], 10);
              const startMinute = parseInt(startTime.split(":")[1], 10);
              const endHour = parseInt(endTime.split(":")[0], 10);
              const endMinute = parseInt(endTime.split(":")[1], 10);

              const classStart = startHour * 60 + startMinute;
              const classEnd = endHour * 60 + endMinute;
              const forbiddenStart = 10 * 60 + 50; // 10:50 in minutes
              const forbiddenEnd = 13 * 60; // 13:00 in minutes

              // Check if class overlaps with forbidden time
              if (classStart < forbiddenEnd && classEnd > forbiddenStart) {
                return false; // Violation
              }
            }
            return true; // No violation
          }
        }, 
      ]
    }
  });

  // Or with custom configuration:
  // const solver = new SimulatedAnnealing(rooms, lecturers, classes, {
  //   maxIterations: 20000,
  //   coolingRate: 0.995,
  //   initialTemperature: 15000,
  // });

  // Run the optimization
  const solution = solver.solve();

  // Display results
  console.log("\n" + "=".repeat(50));
  console.log("RESULTS");
  console.log("=".repeat(50));
  console.log(`Final fitness score: ${solution.fitness.toFixed(2)}`);
  console.log(`Classes scheduled: ${solution.schedule.length}`);

  if (solution.violationReport) {
    console.log(`\nHard constraint violations: ${solution.violationReport.summary.totalHardViolations}`);
    console.log(`Soft constraint violations: ${solution.violationReport.summary.totalSoftViolations}`);

    console.log("\nViolations by type:");
    for (const [type, count] of Object.entries(solution.violationReport.summary.violationsByType)) {
      console.log(`  ${type}: ${count}`);
    }
  }

  console.log("\nSample schedule entries:");
  for (let i = 0; i < Math.min(5, solution.schedule.length); i++) {
    const entry = solution.schedule[i]!;
    console.log(`\n  ${i + 1}. ${entry.className} (${entry.classId})`);
    console.log(`     Room: ${entry.room}`);
    console.log(`     Time: ${entry.timeSlot.day} ${entry.timeSlot.startTime}`);
    console.log(`     Lecturers: ${entry.lecturers.join(", ")}`);
  }

  // save solution on out folder
  fs.writeFileSync("/home/aikano/ade-belajar/timetable-sa/src/examples/result/solution.json", JSON.stringify(solution, null, 2));
  console.log("\n✅ Solution saved to /home/aikano/ade-belajar/timetable-sa/src/examples/result/solution.json");

  console.log("\n" + "=".repeat(50));
}

main().catch(console.error);
