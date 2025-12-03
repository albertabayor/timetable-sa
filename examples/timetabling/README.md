# University Course Timetabling Example

This example demonstrates how to use `timetable-sa` v2.0 to solve university course timetabling problems.

## Overview

This example shows how to build a complete timetabling solver using the generic core library. It includes:

- **Domain Types**: Room, Lecturer, ClassRequirement, TimeSlot, etc.
- **State Definition**: TimetableState with schedule and available resources
- **Constraints**: Hard and soft constraints specific to university timetabling
- **Move Operators**: Strategies for generating neighbor solutions
- **Utilities**: Time calculations, room availability, initial solution generation

## What This Example Teaches

1. How to define domain-specific types for your problem
2. How to implement custom constraints (hard and soft)
3. How to create effective move operators
4. How to generate a good initial solution
5. How to configure the SA algorithm for timetabling

## Important: This is Just ONE Way

**This example is NOT the only way to do timetabling!**

You can:
- Use different time slot structures
- Define different constraints
- Use different move operators
- Structure your state differently
- Use different data sources

This is a **reference implementation** showing best practices, not a rigid framework.

## Directory Structure

```
examples/timetabling/
├── types/
│   ├── Domain.ts      # Room, Lecturer, ClassRequirement, TimeSlot
│   ├── State.ts       # TimetableState, ScheduleEntry
│   └── index.ts
├── constraints/
│   ├── hard/          # Hard constraints (must be satisfied)
│   ├── soft/          # Soft constraints (preferences)
│   └── index.ts
├── moves/
│   ├── ChangeTimeSlot.ts
│   ├── ChangeRoom.ts
│   ├── SwapClasses.ts
│   └── index.ts
├── utils/
│   ├── time.ts                 # Time calculations
│   ├── timeslot-generator.ts   # Generate time slots
│   ├── initial-solution.ts     # Greedy initial solution
│   └── index.ts
├── data/
│   ├── loaders.ts     # Excel/JSON data loaders
│   └── index.ts
├── example-basic.ts   # Basic usage example
└── README.md          # This file
```

## Time Slot Flexibility

In this example, we define TimeSlot as:

```typescript
interface TimeSlot {
  day: string;        // "Monday", "Tuesday", etc.
  startTime: string;  // "08:00", "14:30", etc.
  endTime: string;
  period: number;
}
```

But YOU can define it however you want! For example:

```typescript
// 24-hour numeric format
interface TimeSlot {
  dayOfWeek: number;  // 0-6
  startHour: number;  // 0-23
  startMinute: number;
  durationMinutes: number;
}

// With breaks and meal times
interface TimeSlot {
  day: Day;
  startTime: Time;
  endTime: Time;
  isBreakTime: boolean;
  isMealTime: boolean;
}

// With building/campus info
interface TimeSlot {
  campus: string;
  building: string;
  day: string;
  timeRange: TimeRange;
}
```

The core library doesn't care - it just optimizes whatever state you define!

## Usage

### Basic Example

```typescript
import { SimulatedAnnealing } from 'timetable-sa';
import type { SAConfig } from 'timetable-sa';
import type { TimetableState } from './types';
import { loadData } from './data/loaders';
import { generateInitialSolution } from './utils/initial-solution';
import {
  NoRoomConflict,
  NoLecturerConflict,
  RoomCapacity,
} from './constraints/hard';
import {
  PreferredTime,
  Compactness,
} from './constraints/soft';
import {
  ChangeTimeSlot,
  ChangeRoom,
  SwapClasses,
} from './moves';

// 1. Load data
const data = loadData('./data/timetable.xlsx');

// 2. Generate initial solution
const initialState: TimetableState = generateInitialSolution(data);

// 3. Define constraints
const constraints = [
  // Hard constraints (must be satisfied)
  new NoRoomConflict(),
  new NoLecturerConflict(),
  new RoomCapacity(),

  // Soft constraints (preferences)
  new PreferredTime(10),  // weight = 10
  new Compactness(5),     // weight = 5
];

// 4. Define move operators
const moveGenerators = [
  new ChangeTimeSlot(),
  new ChangeRoom(),
  new SwapClasses(),
];

// 5. Configure SA
const config: SAConfig<TimetableState> = {
  initialTemperature: 1000,
  minTemperature: 0.01,
  coolingRate: 0.995,
  maxIterations: 50000,
  hardConstraintWeight: 10000,
  cloneState: (state) => JSON.parse(JSON.stringify(state)),
  reheatingThreshold: 5000,
  reheatingFactor: 2.0,
  maxReheats: 3,
  logging: {
    enabled: true,
    level: 'info',
    logInterval: 1000,
  },
};

// 6. Run optimization
const solver = new SimulatedAnnealing(
  initialState,
  constraints,
  moveGenerators,
  config
);

const solution = solver.solve();

console.log('Optimization complete!');
console.log(`Fitness: ${solution.fitness}`);
console.log(`Hard violations: ${solution.hardViolations}`);
console.log(`Soft violations: ${solution.softViolations}`);
console.log(`Schedule size: ${solution.state.schedule.length}`);
```

## Constraints

### Hard Constraints (Must be Satisfied)

- **NoRoomConflict**: No two classes can use the same room at the same time
- **NoLecturerConflict**: Lecturer cannot teach two classes simultaneously
- **RoomCapacity**: Room must accommodate all participants
- **NoProdiConflict**: Students from same program can't have overlapping classes
- **MaxDailyPeriods**: Lecturer doesn't exceed maximum teaching hours per day
- **ClassTypeTime**: Morning classes in morning slots, evening in evening slots
- **SaturdayRestriction**: Only certain programs can have Saturday classes
- **FridayTimeRestriction**: Friday prayer time restrictions
- **NotStartingDuringPrayerTime**: Classes don't start during prayer times
- **ExclusiveRoom**: Certain rooms reserved for specific courses

### Soft Constraints (Preferences)

- **PreferredTime**: Prefer lecturer's preferred time slots
- **PreferredRoom**: Prefer lecturer's preferred room
- **TransitTime**: Ensure sufficient time between consecutive classes
- **Compactness**: Minimize gaps in daily schedules
- **PrayerTimeOverlap**: Minimize class-prayer time overlaps
- **EveningClassPriority**: Evening classes at optimal times
- **LabRequirement**: Lab classes in lab rooms
- **ResearchDay**: Avoid scheduling on lecturer's research day

## Move Operators

- **ChangeTimeSlot**: Randomly change a class's time slot
- **ChangeRoom**: Randomly change a class's room
- **SwapClasses**: Swap time slots and/or rooms between two classes

## Customization

To adapt this example for your institution:

1. **Modify Types**: Edit `types/Domain.ts` to match your data structure
2. **Adjust Constraints**: Add/remove/modify constraints in `constraints/`
3. **Custom Time Slots**: Modify `utils/timeslot-generator.ts`
4. **Different Move Operators**: Add new operators in `moves/`
5. **Data Loading**: Modify `data/loaders.ts` for your data format

## License

This example is part of the `timetable-sa` package and follows the same MIT license.
