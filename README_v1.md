# timetable-sa

A powerful, modular solver for **University Course Timetabling Problem (UCTP)** using **Simulated Annealing** algorithm with TypeScript.

[![npm version](https://img.shields.io/npm/v/timetable-sa.svg)](https://www.npmjs.com/package/timetable-sa)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🎉 What's New in v1.2.0

**NEW: Flexible Constraints & Logging** - Take full control of your scheduling requirements!

```typescript
// Add custom constraints and enable logging
const solver = new SimulatedAnnealing(rooms, lecturers, classes, {
  constraints: {
    // Disable specific built-in constraints
    hardConstraints: { saturdayRestriction: false },

    // Add your own custom constraints
    customConstraints: [{
      name: "No Math After 2 PM",
      type: "hard",
      checkFunction: (schedule, entry) => {
        if (!entry.className.includes('Math')) return true;
        const hour = parseInt(entry.timeSlot.startTime.split(':')[0]);
        return hour < 14;
      }
    }]
  },
  logging: {
    enabled: true,
    level: 'info',
    output: 'both',
    filePath: './schedule.log'
  }
});
```

Features:
- ✨ **Enable/disable any built-in constraint** (10 hard + 8 soft constraints)
- 🎯 **Add custom constraints** with simple functions
- 📝 **Comprehensive logging** to console and/or file
- 🔍 **Debug mode** for detailed algorithm insights

**Also includes v1.1.0:**
- 🕐 **Flexible Time Slot Configuration** - Customize class schedules with merge or full custom modes

📚 [Constraint & Logging Docs](docs/FLEXIBLE-CONSTRAINTS-AND-LOGGING.md) | [Time Slot Docs](docs/TIMESLOT_CONFIG.md) | 📦 [npm package](https://www.npmjs.com/package/timetable-sa)

---

## Features

- **Advanced Simulated Annealing** with two-phase optimization (hard constraints → soft constraints)
- **Swap and Move operators** with adaptive selection based on performance
- **Reheating mechanism** to escape local minima
- **Comprehensive constraint checking** (10 hard constraints + 8 soft constraints)
- **Multiple input formats** (Excel, JSON, JavaScript objects)
- **Fully typed** with TypeScript for excellent IDE support
- **Modular architecture** - use individual components as needed
- **Configurable** - customize algorithm parameters and constraint weights
- **⭐ NEW in v1.2.0: Flexible Constraints** - enable/disable any constraint or add custom ones
- **⭐ NEW in v1.2.0: Comprehensive Logging** - debug and monitor optimization with detailed logs
- **⭐ v1.1.0: Flexible Time Slot Configuration** - customize class schedules with partial or full override modes

## Installation

```bash
npm install timetable-sa
```

## Quick Start

### Basic Usage

```typescript
import { SimulatedAnnealing, loadDataFromExcel } from 'timetable-sa';

// Load data from Excel file
const data = loadDataFromExcel('./timetable-data.xlsx');

// Create solver instance
const solver = new SimulatedAnnealing(
  data.rooms,
  data.lecturers,
  data.classes
);

// Run optimization
const solution = solver.solve();

// Access results
console.log(`Fitness: ${solution.fitness}`);
console.log(`Classes scheduled: ${solution.schedule.length}`);
console.log(`Hard violations: ${solution.violationReport?.summary.totalHardViolations}`);
```

### Excel File Format

The Excel file should contain three sheets:

1. **ruangan** (Rooms)
   - Code, Name, Type, Capacity

2. **dosen** (Lecturers)
   - Prodi Code, Code, Name, Prefered_Time, Research_Day, Transit_Time, Max_Daily_Periods, Prefered_Room

3. **kebutuhan_kelas** (Class Requirements)
   - Prodi, Kelas, Kode_Matakuliah, Mata_Kuliah, SKS, Jenis, Peserta, Kode_Dosen1, Kode_Dosen2, Kode_Dosen_Prodi_Lain1, Kode_Dosen_Prodi_Lain2, Class_Type, should_on_the_lab, rooms

### Custom Configuration

```typescript
import { SimulatedAnnealing, loadDataFromExcel } from 'timetable-sa';
import type { AlgorithmConfig } from 'timetable-sa';

const data = loadDataFromExcel('./timetable-data.xlsx');

// Customize algorithm parameters
const config: AlgorithmConfig = {
  initialTemperature: 15000,
  coolingRate: 0.995,
  maxIterations: 20000,
  reheatingThreshold: 1500,
  hardConstraintWeight: 150000,
  softConstraintWeights: {
    preferredTime: 15,
    transitTime: 25,
    compactness: 10,
  },
};

const solver = new SimulatedAnnealing(
  data.rooms,
  data.lecturers,
  data.classes,
  config
);

const solution = solver.solve();
```

### ⭐ NEW: Configurable Time Slots (v1.1.0)

Customize class schedules to match your institution's specific needs!

#### Mode 1: Merge with Defaults (Partial Override)

Override only specific settings while keeping the rest as defaults:

```typescript
import { SimulatedAnnealing, loadDataFromExcel } from 'timetable-sa';

const data = loadDataFromExcel('./timetable-data.xlsx');

const solver = new SimulatedAnnealing(
  data.rooms,
  data.lecturers,
  data.classes,
  {
    timeSlotConfig: {
      pagi: {
        startTime: "08:00",  // Change morning start time
        endTime: "16:00",    // Change morning end time
        slotDuration: 60     // 60-minute slots instead of 50
      },
      sore: {
        startTime: "16:00",  // Evening starts at 4 PM
        endTime: "20:00"     // Ends at 8 PM
        // slotDuration uses default (50 minutes)
      },
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]  // 5-day week
    }
  }
);

const solution = solver.solve();
```

#### Mode 2: Full Custom Override

Provide completely custom time slots:

```typescript
import { SimulatedAnnealing, loadDataFromExcel } from 'timetable-sa';
import type { TimeSlot } from 'timetable-sa';

const data = loadDataFromExcel('./timetable-data.xlsx');

// Define custom time slots (e.g., 90-minute blocks)
const customPagiSlots: TimeSlot[] = [
  { day: "Monday", startTime: "08:00", endTime: "09:30", period: 1 },
  { day: "Monday", startTime: "09:45", endTime: "11:15", period: 2 },
  { day: "Monday", startTime: "11:30", endTime: "13:00", period: 3 },
  // ... more slots
];

const solver = new SimulatedAnnealing(
  data.rooms,
  data.lecturers,
  data.classes,
  {
    customTimeSlots: {
      pagi: customPagiSlots,  // Use your custom slots
      // sore: customSoreSlots (optional)
    }
  }
);

const solution = solver.solve();
```

#### Common Use Cases

**8 AM Start (instead of 7:30 AM):**
```typescript
timeSlotConfig: {
  pagi: { startTime: "08:00" }
}
```

**4-Day Work Week:**
```typescript
timeSlotConfig: {
  days: ["Monday", "Tuesday", "Wednesday", "Thursday"]
}
```

**Block Scheduling (2-hour classes):**
```typescript
timeSlotConfig: {
  pagi: {
    startTime: "09:00",
    endTime: "17:00",
    slotDuration: 120  // 2-hour blocks
  }
}
```

**Evening Programs Only:**
```typescript
timeSlotConfig: {
  sore: {
    startTime: "17:00",
    endTime: "22:00",
    slotDuration: 90
  }
}
```

> 📚 **Full Documentation**: See [docs/TIMESLOT_CONFIG.md](docs/TIMESLOT_CONFIG.md) for complete guide and examples.

### Using JSON Input

```typescript
import { SimulatedAnnealing, loadDataFromJSON } from 'timetable-sa';

// From JSON file
const data = loadDataFromJSON('./timetable-data.json');

const solver = new SimulatedAnnealing(data.rooms, data.lecturers, data.classes);
const solution = solver.solve();
```

### Using JavaScript Objects

```typescript
import { SimulatedAnnealing, loadDataFromObject } from 'timetable-sa';
import type { TimetableInput } from 'timetable-sa';

// Useful for API integrations
const data: TimetableInput = {
  rooms: [
    { Code: "CM-101", Name: "Classroom 101", Type: "Regular", Capacity: 40 },
  ],
  lecturers: [
    {
      "Prodi Code": "IF",
      Code: "L001",
      Name: "Dr. John Doe",
      Prefered_Time: "08.00 - 10.00 monday",
      Research_Day: "Friday",
      Transit_Time: 15,
      Max_Daily_Periods: 8,
      Prefered_Room: "CM-101",
    },
  ],
  classes: [
    {
      Prodi: "INFORMATIKA",
      Kelas: "IF-1A",
      Kode_Matakuliah: "IF101",
      Mata_Kuliah: "Introduction to Programming",
      SKS: 3,
      Jenis: "Teori",
      Peserta: 35,
      Kode_Dosen1: "L001",
      Kode_Dosen2: "",
      Kode_Dosen_Prodi_Lain1: "",
      Kode_Dosen_Prodi_Lain2: "",
      Class_Type: "pagi",
      should_on_the_lab: "yes",
      rooms: "",
    },
  ],
};

const validatedData = loadDataFromObject(data);
const solver = new SimulatedAnnealing(
  validatedData.rooms,
  validatedData.lecturers,
  validatedData.classes
);

const solution = solver.solve();
```

## Constraints

### Hard Constraints (Must be satisfied)

1. **HC1**: No lecturer can teach two classes at the same time
2. **HC2**: No two classes can use the same room at the same time
3. **HC3**: Room capacity must accommodate all participants
4. **HC5**: No two classes from the same program can overlap
5. **HC7**: Lecturer cannot exceed maximum daily teaching periods
6. **HC8**: Class type must match time slot (morning/evening)
7. **HC9**: Only Magister Manajemen can have classes on Saturday
8. **HC10**: Friday time restrictions (cannot start at 11:00, 12:00, 13:00)
9. **HC11**: Classes cannot start during prayer time
10. **HC12**: Exclusive room constraints (certain rooms for specific courses)

### Soft Constraints (Preferably satisfied)

1. **SC1**: Prefer lecturer's preferred time slots
2. **SC2**: Prefer lecturer's preferred room
3. **SC3**: Ensure sufficient transit time between classes
4. **SC4**: Prefer compact schedules with minimal gaps
5. **SC5**: Minimize prayer time overlaps
6. **SC6**: Evening classes should start at preferred times
7. **SC7**: Minimize overflow (non-lab classes using lab rooms)
8. **SC8**: Avoid scheduling on lecturer's research day

## API Reference

### Main Classes

#### `SimulatedAnnealing`

Main solver class using Simulated Annealing algorithm.

```typescript
constructor(
  rooms: Room[],
  lecturers: Lecturer[],
  classes: ClassRequirement[],
  config?: AlgorithmConfig
)

solve(): Solution
```

#### `ConstraintChecker`

Validates constraints for timetable entries.

```typescript
constructor(rooms: Room[], lecturers: Lecturer[])

checkNoLecturerConflict(schedule: ScheduleEntry[], entry: ScheduleEntry): boolean
checkNoRoomConflict(schedule: ScheduleEntry[], entry: ScheduleEntry): boolean
// ... and more constraint methods
```

### Data Loading Functions

```typescript
loadDataFromExcel(filepath: string): TimetableInput
loadDataFromJSON(filepath: string): TimetableInput
loadDataFromObject(data: TimetableInput): TimetableInput
```

### Utility Functions

```typescript
timeToMinutes(time: string): number
minutesToTime(minutes: number): string
calculateEndTime(startTime: string, sks: number, day: string): { endTime: string; prayerTimeAdded: number }
isValidFridayStartTime(startTime: string): boolean
getAvailableRooms(/* ... */): string[]
// ... and more
```

### Configuration Types

```typescript
interface AlgorithmConfig {
  initialTemperature?: number;
  minTemperature?: number;
  coolingRate?: number;
  maxIterations?: number;
  reheatingThreshold?: number;
  reheatingFactor?: number;
  maxReheats?: number;
  hardConstraintWeight?: number;
  softConstraintWeights?: SoftConstraintWeights;

  // ⭐ NEW in v1.1.0
  timeSlotConfig?: TimeSlotConfig;      // Mode 1: Merge with defaults
  customTimeSlots?: CustomTimeSlots;    // Mode 2: Full custom override
}

interface SoftConstraintWeights {
  preferredTime?: number;
  preferredRoom?: number;
  transitTime?: number;
  compactness?: number;
  prayerTimeOverlap?: number;
  eveningClassPriority?: number;
  labRequirement?: number;
  overflowPenalty?: number;
}

// ⭐ NEW in v1.1.0
interface TimeSlotConfig {
  pagi?: {
    startTime?: string;      // Format: "HH:MM" (e.g., "08:00")
    endTime?: string;        // Format: "HH:MM" (e.g., "17:00")
    slotDuration?: number;   // Minutes per slot (e.g., 50, 60, 90)
  };
  sore?: {
    startTime?: string;
    endTime?: string;
    slotDuration?: number;
  };
  days?: string[];  // e.g., ["Monday", "Tuesday", "Wednesday"]
}

interface CustomTimeSlots {
  pagi?: TimeSlot[];
  sore?: TimeSlot[];
}

interface TimeSlot {
  day: string;        // "Monday", "Tuesday", etc.
  startTime: string;  // Format: "HH:MM"
  endTime: string;    // Format: "HH:MM"
  period: number;     // Period number (1, 2, 3, ...)
}
```

### Default Configuration

```typescript
import { DEFAULT_ALGORITHM_CONFIG } from 'timetable-sa';

console.log(DEFAULT_ALGORITHM_CONFIG);
// {
//   initialTemperature: 10000,
//   minTemperature: 0.0000001,
//   coolingRate: 0.997,
//   maxIterations: 15000,
//   reheatingThreshold: 1200,
//   reheatingFactor: 100,
//   maxReheats: 7,
//   hardConstraintWeight: 100000,
//   softConstraintWeights: { ... },
//   timeSlotConfig: {
//     pagi: { startTime: "07:30", endTime: "17:00", slotDuration: 50 },
//     sore: { startTime: "15:30", endTime: "21:00", slotDuration: 50 },
//     days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
//   }
// }
```

## Algorithm Details

### Two-Phase Optimization

1. **Phase 1 (60% of iterations)**: Focus on eliminating hard constraint violations
   - Strict acceptance criteria
   - Prioritizes reducing hard violations

2. **Phase 2 (40% of iterations)**: Optimize soft constraints
   - Standard acceptance criteria
   - Balances all objectives

### Adaptive Operator Selection

The algorithm dynamically chooses between two operators based on their success rates:

- **Move operator**: Changes time slot or room for a single class
- **Swap operator**: Swaps time slots and/or rooms between two classes

### Reheating Mechanism

When stuck in local minima (no improvement for N iterations), the algorithm increases temperature to escape and explore new solutions.

## Examples

Check the `examples/` directory for complete examples:

- `basic-usage.ts` - Simple usage with Excel input
- `custom-config.ts` - Customizing algorithm parameters
- `json-usage.ts` - Using JSON input
- **⭐ NEW:** `custom-timeslots.ts` - Time slot configuration examples (v1.1.0)

Run examples:

```bash
npm run example:basic
npm run example:custom
npm run example:json
```

## Development

### Build

```bash
npm run build
```

### Watch Mode

```bash
npm run build:watch
```

### Clean

```bash
npm run clean
```

## TypeScript Support

This package is written in TypeScript and includes type definitions. You get full IntelliSense and type checking in TypeScript projects.

```typescript
import type {
  Room,
  Lecturer,
  ClassRequirement,
  ScheduleEntry,
  Solution,
  AlgorithmConfig,
  TimetableInput,
  // ⭐ NEW in v1.1.0
  TimeSlot,
  TimeSlotConfig,
  CustomTimeSlots,
  TimeSlotGenerationConfig,
} from 'timetable-sa';
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Citation

If you use this package in your research, please cite:

```
@software{timetable-sa,
  title = {timetable-sa: A TypeScript Library for University Course Timetabling},
  author = {Albert A Bayor},
  year = {2025},
  url = {https://github.com/albertabayor/simulated-annealing-university-timetabling-course-problem}
}
```

## References

- Simulated Annealing Algorithm
- University Course Timetabling Problem (UCTP)
- Constraint Satisfaction Problems

## Support

For issues and questions, please open an issue on [GitHub](https://github.com/albertabayor/simulated-annealing-university-timetabling-course-problem/issues).

## Maintainers
- Albert A Bayor (<albertabayor30@gmail.com>)
- Firmansah Ade (<nafilie9@gmail.com>)