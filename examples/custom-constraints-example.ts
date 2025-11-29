/**
 * Example: Using Custom Constraints and Logging
 *
 * This example demonstrates how to:
 * 1. Add custom hard constraints
 * 2. Add custom soft constraints
 * 3. Disable built-in constraints
 * 4. Configure logging
 */

import { SimulatedAnnealing, CustomConstraint, ScheduleEntry, Room, Lecturer } from '../src/index.js';

// Example data (in practice, load this from your data source)
const rooms: Room[] = [
  { Code: 'CM-101', Name: 'Classroom 101', Type: 'Regular', Capacity: 40 },
  { Code: 'CM-Lab1', Name: 'Lab 1', Type: 'Lab', Capacity: 30 },
];

const lecturers: Lecturer[] = [
  {
    'Prodi Code': 'IF',
    Code: 'L001',
    Name: 'Dr. John',
    Prefered_Time: '08.00 - 10.00 monday',
    Research_Day: 'Friday',
    Transit_Time: 15,
    Max_Daily_Periods: 8,
    Prefered_Room: 'CM-101',
  },
];

const classes = [
  // Your class requirements here
];

// ============================================================================
// CUSTOM HARD CONSTRAINT: No mathematics classes after 2 PM
// ============================================================================
const noLateMathConstraint: CustomConstraint = {
  name: "No Late Math Classes",
  description: "Mathematics classes cannot start after 14:00",
  type: "hard",
  checkFunction: (schedule, entry, rooms, lecturers) => {
    // Only check math-related classes
    if (!entry.className.toLowerCase().includes('math') &&
        !entry.className.toLowerCase().includes('matematika')) {
      return true; // Constraint doesn't apply to non-math classes
    }

    // Parse hour from time string (e.g., "14:30" → 14)
    const [hour] = entry.timeSlot.startTime.split(':').map(Number);
    const startHour = hour!;

    // Math classes must start before 2 PM
    if (startHour >= 14) {
      console.log(`❌ Math class "${entry.className}" starts at ${entry.timeSlot.startTime} (after 2 PM)`);
      return false; // Violation
    }

    return true; // Satisfied
  },
};

// ============================================================================
// CUSTOM HARD CONSTRAINT: Lab classes only on specific days
// ============================================================================
const labDayRestriction: CustomConstraint = {
  name: "Lab Day Restriction",
  description: "Lab classes must be scheduled on Monday, Wednesday, or Friday",
  type: "hard",
  checkFunction: (schedule, entry, rooms, lecturers) => {
    // Only check if this is a lab class
    if (!entry.needsLab) {
      return true; // Not a lab class, constraint doesn't apply
    }

    const allowedDays = ['Monday', 'Wednesday', 'Friday'];
    const isAllowedDay = allowedDays.includes(entry.timeSlot.day);

    if (!isAllowedDay) {
      console.log(`❌ Lab class "${entry.className}" scheduled on ${entry.timeSlot.day} (must be Mon/Wed/Fri)`);
      return false;
    }

    return true;
  },
};

// ============================================================================
// CUSTOM SOFT CONSTRAINT: Prefer morning classes for undergraduate programs
// ============================================================================
const undergraduateMorningPreference: CustomConstraint = {
  name: "Undergraduate Morning Preference",
  description: "Undergraduate programs should have morning classes when possible",
  type: "soft",
  weight: 15, // Penalty weight (higher = stronger preference)
  checkFunction: (schedule, entry, rooms, lecturers) => {
    // Check if this is an undergraduate program (not magister/master)
    const isUndergrad = !entry.prodi.toLowerCase().includes('magister') &&
                       !entry.prodi.toLowerCase().includes('master');

    if (!isUndergrad) {
      return 1.0; // Perfect score for graduate programs (constraint doesn't apply)
    }

    // Get the hour from start time
    const [hour] = entry.timeSlot.startTime.split(':').map(Number);
    const startHour = hour!;

    // Score based on time of day
    if (startHour < 12) {
      return 1.0;  // Perfect: morning class (before noon)
    } else if (startHour < 15) {
      return 0.7;  // OK: early afternoon (12-3 PM)
    } else if (startHour < 17) {
      return 0.4;  // Poor: late afternoon (3-5 PM)
    } else {
      return 0.1;  // Very poor: evening (after 5 PM)
    }
  },
};

// ============================================================================
// CUSTOM SOFT CONSTRAINT: Group lecturer's classes on fewer days
// ============================================================================
const lecturerDayGrouping: CustomConstraint = {
  name: "Lecturer Day Grouping",
  description: "Prefer to group each lecturer's classes on fewer days of the week",
  type: "soft",
  weight: 12,
  checkFunction: (schedule, entry, rooms, lecturers) => {
    // Find all classes taught by any of this entry's lecturers
    const lecturerClasses = schedule.filter(scheduleEntry =>
      scheduleEntry.lecturers.some(lecturer => entry.lecturers.includes(lecturer))
    );

    // Count unique days (including the current entry)
    const uniqueDays = new Set(lecturerClasses.map(c => c.timeSlot.day));
    uniqueDays.add(entry.timeSlot.day);

    const dayCount = uniqueDays.size;

    // Better score for fewer days
    // Teaching on 1-2 days = perfect
    // Teaching on 3 days = good
    // Teaching on 4+ days = poor
    if (dayCount <= 2) return 1.0;
    if (dayCount === 3) return 0.7;
    if (dayCount === 4) return 0.4;
    return 0.2; // 5+ days
  },
};

// ============================================================================
// CUSTOM SOFT CONSTRAINT: Avoid back-to-back classes in different buildings
// ============================================================================
const buildingTransitionPenalty: CustomConstraint = {
  name: "Building Transition Penalty",
  description: "Penalize back-to-back classes that require building changes for lecturers",
  type: "soft",
  weight: 20,
  checkFunction: (schedule, entry, rooms, lecturers) => {
    // Helper: extract building code from room code (e.g., "CM-101" → "CM")
    const getBuilding = (roomCode: string): string => {
      return roomCode.split('-')[0] || roomCode;
    };

    const currentBuilding = getBuilding(entry.room);

    // Check each of this entry's lecturers
    for (const lecturerCode of entry.lecturers) {
      // Find previous class on the same day for this lecturer
      const previousClasses = schedule.filter(s =>
        s.timeSlot.day === entry.timeSlot.day &&
        s.lecturers.includes(lecturerCode) &&
        s.timeSlot.endTime === entry.timeSlot.startTime // Back-to-back
      );

      for (const prevClass of previousClasses) {
        const prevBuilding = getBuilding(prevClass.room);

        // If different buildings, penalize
        if (prevBuilding !== currentBuilding) {
          return 0.3; // Poor score for building transition
        }
      }
    }

    return 1.0; // No building transition issues
  },
};

// ============================================================================
// CREATE SOLVER WITH CUSTOM CONSTRAINTS AND LOGGING
// ============================================================================
console.log('🚀 Creating solver with custom constraints...\n');

const solver = new SimulatedAnnealing(rooms, lecturers, classes, {
  // Algorithm parameters
  maxIterations: 10000,
  initialTemperature: 10000,
  coolingRate: 0.997,

  // Constraint configuration
  constraints: {
    // Disable some built-in hard constraints we don't need
    hardConstraints: {
      saturdayRestriction: false,      // Allow classes on Saturday for all programs
      fridayTimeRestriction: false,    // Allow all start times on Friday
    },

    // Disable some soft constraints to simplify
    softConstraints: {
      preferredRoom: false,            // Don't optimize for lecturer room preferences
      eveningClassPriority: false,     // Don't optimize evening class start times
    },

    // Add our custom constraints
    customConstraints: [
      // Hard constraints
      noLateMathConstraint,
      labDayRestriction,

      // Soft constraints
      undergraduateMorningPreference,
      lecturerDayGrouping,
      buildingTransitionPenalty,
    ],
  },

  // Logging configuration
  logging: {
    enabled: true,
    level: 'info',                     // Options: 'debug', 'info', 'warn', 'error', 'none'
    output: 'both',                    // Options: 'console', 'file', 'both'
    filePath: './custom-schedule.log',
    includeTimestamp: true,
    includeLevel: true,
  },
});

// ============================================================================
// RUN THE SOLVER
// ============================================================================
console.log('⚙️  Running optimization...\n');

const solution = solver.solve();

// ============================================================================
// DISPLAY RESULTS
// ============================================================================
console.log('\n📊 SOLUTION SUMMARY');
console.log('='.repeat(60));
console.log(`Final Fitness: ${solution.fitness.toFixed(2)}`);
console.log(`Hard Violations: ${solution.hardViolations}`);
console.log(`Soft Violations: ${solution.softViolations}`);
console.log(`Scheduled Classes: ${solution.schedule.length}`);

if (solution.violationReport) {
  console.log('\n📋 VIOLATION REPORT');
  console.log('='.repeat(60));
  console.log(`Total Hard Violations: ${solution.violationReport.summary.totalHardViolations}`);
  console.log(`Total Soft Violations: ${solution.violationReport.summary.totalSoftViolations}`);

  if (solution.violationReport.summary.totalHardViolations > 0) {
    console.log('\n⚠️  Hard Constraint Violations:');
    for (const [type, count] of Object.entries(solution.violationReport.summary.violationsByType)) {
      if (type.includes('Hard')) {
        console.log(`   - ${type}: ${count}`);
      }
    }
  }

  if (solution.violationReport.summary.totalSoftViolations > 0) {
    console.log('\n📝 Soft Constraint Violations:');
    for (const [type, count] of Object.entries(solution.violationReport.summary.violationsByType)) {
      if (type.includes('Soft') || type.includes('SC')) {
        console.log(`   - ${type}: ${count}`);
      }
    }
  }
}

console.log('\n✅ Optimization complete! Check ./custom-schedule.log for detailed logs.');

// ============================================================================
// TIPS FOR WRITING CUSTOM CONSTRAINTS
// ============================================================================
/*
TIPS FOR WRITING EFFECTIVE CUSTOM CONSTRAINTS:

1. HARD CONSTRAINTS (return boolean):
   - Return true if satisfied, false if violated
   - Keep logic simple and fast (called thousands of times)
   - Use early returns to skip checks when constraint doesn't apply
   - Add console.log for debugging (but remove in production)

2. SOFT CONSTRAINTS (return 0-1 number):
   - Return 1.0 for perfect satisfaction
   - Return 0.0 for worst case
   - Return values in between for partial satisfaction
   - Choose appropriate weights (higher = stronger preference)

3. PERFORMANCE:
   - Avoid expensive operations (nested loops, large data structures)
   - Cache computations when possible
   - Use early exits to avoid unnecessary work

4. DEBUGGING:
   - Enable debug logging to see all constraint checks
   - Add temporary console.log statements
   - Test with small datasets first

5. COMMON PATTERNS:
   - Check if constraint applies (return perfect score if not)
   - Parse time strings: entry.timeSlot.startTime.split(':')
   - Check day: entry.timeSlot.day
   - Check room: entry.room, entry.needsLab
   - Check lecturer: entry.lecturers.includes(code)
   - Check program: entry.prodi, entry.className

6. ACCESS TO DATA:
   - schedule: All scheduled entries before this one
   - entry: The entry being checked
   - rooms: Map of room code → Room object
   - lecturers: Map of lecturer code → Lecturer object
*/

export { solver, solution };
