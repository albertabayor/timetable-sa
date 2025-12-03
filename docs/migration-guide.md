# Migration Guide: v1.x → v2.0

This guide helps you migrate from **timetable-sa v1.x** (domain-specific) to **v2.0** (generic, unopinionated).

## Overview of Changes

### v1.x (Domain-Specific)

v1.x was designed specifically for university timetabling:

```typescript
// v1.x - Domain-specific API
const solver = new SimulatedAnnealing(
  rooms,       // Room objects
  lecturers,   // Lecturer objects
  classes,     // Class objects
  config       // Configuration
);
```

**Problems with v1.x:**
- Limited to university timetabling only
- Time slots were hardcoded
- Couldn't customize constraints easily
- Couldn't solve other types of problems

### v2.0 (Generic & Unopinionated)

v2.0 is a complete rewrite that works for ANY constraint-satisfaction problem:

```typescript
// v2.0 - Generic API
const solver = new SimulatedAnnealing<TState>(
  initialState,    // YOUR state structure
  constraints,     // YOUR constraints
  moveGenerators,  // YOUR move operators
  config          // Configuration
);
```

**Benefits of v2.0:**
- Works for any optimization problem
- You define your own state structure
- You define your own constraints
- You define your own move operators
- No domain assumptions

## Breaking Changes

### 1. Constructor Signature

**v1.x:**
```typescript
new SimulatedAnnealing(rooms, lecturers, classes, config)
```

**v2.0:**
```typescript
new SimulatedAnnealing<TState>(initialState, constraints, moveGenerators, config)
```

### 2. State Structure

**v1.x:** State was predefined internally

**v2.0:** YOU define your state structure

```typescript
// You can define it however you want
interface MyTimetableState {
  schedule: ScheduleEntry[];
  rooms: Room[];
  lecturers: Lecturer[];
  classes: Class[];
  // Add anything else you need
}
```

### 3. Constraints

**v1.x:** Constraints were built-in and couldn't be easily customized

**v2.0:** You implement your own constraints

```typescript
class NoRoomConflict implements Constraint<MyTimetableState> {
  name = 'No Room Conflict';
  type = 'hard' as const;

  evaluate(state: MyTimetableState): number {
    // Your logic
    return hasConflict ? 0 : 1;
  }
}
```

### 4. Time Slots

**v1.x:** Time slots were hardcoded in the library

**v2.0:** You define time slots however you want (or don't use them at all!)

```typescript
// Option 1: Simple string times
interface ScheduleEntry {
  day: string;
  startTime: string; // "08:00", "14:30", etc.
  duration: number;
}

// Option 2: Numeric slots
interface ScheduleEntry {
  dayIndex: number;  // 0 = Monday, etc.
  timeSlot: number;  // 0-11 for different time periods
}

// Option 3: Use Date objects
interface ScheduleEntry {
  startDateTime: Date;
  endDateTime: Date;
}

// Your choice!
```

### 5. Configuration

**v1.x:**
```typescript
const config = {
  initialTemperature: 1000,
  coolingRate: 0.995,
  // ... other params
};
```

**v2.0:**
```typescript
const config: SAConfig<MyTimetableState> = {
  initialTemperature: 1000,
  minTemperature: 0.01,
  coolingRate: 0.995,
  maxIterations: 50000,
  hardConstraintWeight: 10000,
  cloneState: (state) => /* your clone function */,
};
```

## Migration Steps

### Step 1: Define Your State

Decide how to represent your problem.

**For timetabling:**
```typescript
interface TimetableState {
  schedule: ScheduleEntry[];
  rooms: Room[];
  lecturers: Lecturer[];
  classes: Class[];
}

interface ScheduleEntry {
  classId: string;
  roomId: string;
  day: string;
  startTime: string;
  duration: number;
}

interface Room {
  id: string;
  name: string;
  capacity: number;
}

interface Lecturer {
  id: string;
  name: string;
}

interface Class {
  id: string;
  name: string;
  lecturerId: string;
  studentCount: number;
  duration: number;
}
```

### Step 2: Implement Hard Constraints

Recreate the constraints you had in v1.x.

**Example: No Room Conflict**

```typescript
class NoRoomConflict implements Constraint<TimetableState> {
  name = 'No Room Conflict';
  type = 'hard' as const;

  evaluate(state: TimetableState): number {
    const conflicts = new Set<number>();

    for (let i = 0; i < state.schedule.length; i++) {
      for (let j = i + 1; j < state.schedule.length; j++) {
        const a = state.schedule[i];
        const b = state.schedule[j];

        // Same room and day
        if (a.roomId === b.roomId && a.day === b.day) {
          // Check time overlap
          if (this.timesOverlap(a, b)) {
            conflicts.add(i);
          }
        }
      }
    }

    return conflicts.size === 0 ? 1 : 0;
  }

  private timesOverlap(a: ScheduleEntry, b: ScheduleEntry): boolean {
    const aStart = this.timeToMinutes(a.startTime);
    const aEnd = aStart + a.duration;
    const bStart = this.timeToMinutes(b.startTime);
    const bEnd = bStart + b.duration;

    return aStart < bEnd && bStart < aEnd;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  getViolations(state: TimetableState): string[] {
    const violations: string[] = [];

    // Same logic as evaluate(), but collect all violations
    for (let i = 0; i < state.schedule.length; i++) {
      for (let j = i + 1; j < state.schedule.length; j++) {
        const a = state.schedule[i];
        const b = state.schedule[j];

        if (a.roomId === b.roomId && a.day === b.day && this.timesOverlap(a, b)) {
          const classA = state.classes.find(c => c.id === a.classId)!;
          const classB = state.classes.find(c => c.id === b.classId)!;

          violations.push(
            `Room ${a.roomId} on ${a.day} at ${a.startTime}: ` +
            `${classA.name} conflicts with ${classB.name}`
          );
        }
      }
    }

    return violations;
  }
}
```

**Common hard constraints for timetabling:**
- No room conflicts
- No lecturer conflicts
- No program (Prodi) conflicts
- Room capacity sufficient

### Step 3: Implement Soft Constraints

Add preferences.

```typescript
class PreferMorningSlots implements Constraint<TimetableState> {
  name = 'Prefer Morning Slots';
  type = 'soft' as const;
  weight = 10;

  evaluate(state: TimetableState): number {
    let morningCount = 0;

    for (const entry of state.schedule) {
      const hour = parseInt(entry.startTime.split(':')[0]);
      if (hour < 12) morningCount++;
    }

    return morningCount / state.schedule.length;
  }
}
```

### Step 4: Implement Move Generators

Define how to modify the state.

```typescript
// Basic move: Change time slot
class ChangeTimeSlot implements MoveGenerator<TimetableState> {
  name = 'Change Time Slot';

  private timeSlots = ['08:00', '09:30', '11:00', '13:00', '14:30', '16:00'];
  private days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  canApply(state: TimetableState): boolean {
    return state.schedule.length > 0;
  }

  generate(state: TimetableState, temperature: number): TimetableState {
    // Clone state
    const newState: TimetableState = {
      ...state,
      schedule: state.schedule.map(e => ({ ...e })),
    };

    // Modify random entry
    const randomIndex = Math.floor(Math.random() * newState.schedule.length);
    newState.schedule[randomIndex].day = this.days[Math.floor(Math.random() * this.days.length)];
    newState.schedule[randomIndex].startTime = this.timeSlots[Math.floor(Math.random() * this.timeSlots.length)];

    return newState;
  }
}

// Move: Change room
class ChangeRoom implements MoveGenerator<TimetableState> {
  name = 'Change Room';

  canApply(state: TimetableState): boolean {
    return state.schedule.length > 0 && state.rooms.length > 0;
  }

  generate(state: TimetableState, temperature: number): TimetableState {
    const newState: TimetableState = {
      ...state,
      schedule: state.schedule.map(e => ({ ...e })),
    };

    const randomIndex = Math.floor(Math.random() * newState.schedule.length);
    const randomRoom = state.rooms[Math.floor(Math.random() * state.rooms.length)];
    newState.schedule[randomIndex].roomId = randomRoom.id;

    return newState;
  }
}

// Move: Swap two classes
class SwapClasses implements MoveGenerator<TimetableState> {
  name = 'Swap Classes';

  canApply(state: TimetableState): boolean {
    return state.schedule.length >= 2;
  }

  generate(state: TimetableState, temperature: number): TimetableState {
    const newState: TimetableState = {
      ...state,
      schedule: state.schedule.map(e => ({ ...e })),
    };

    const i = Math.floor(Math.random() * newState.schedule.length);
    let j = Math.floor(Math.random() * newState.schedule.length);
    while (j === i) j = Math.floor(Math.random() * newState.schedule.length);

    // Swap time slots and rooms
    const tempDay = newState.schedule[i].day;
    const tempTime = newState.schedule[i].startTime;
    const tempRoom = newState.schedule[i].roomId;

    newState.schedule[i].day = newState.schedule[j].day;
    newState.schedule[i].startTime = newState.schedule[j].startTime;
    newState.schedule[i].roomId = newState.schedule[j].roomId;

    newState.schedule[j].day = tempDay;
    newState.schedule[j].startTime = tempTime;
    newState.schedule[j].roomId = tempRoom;

    return newState;
  }
}
```

### Step 5: Create Initial State

In v1.x, the library created the initial state. In v2.0, you create it.

```typescript
function createInitialState(
  rooms: Room[],
  lecturers: Lecturer[],
  classes: Class[]
): TimetableState {
  const timeSlots = ['08:00', '09:30', '11:00', '13:00', '14:30', '16:00'];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  // Create random initial schedule
  const schedule: ScheduleEntry[] = classes.map(cls => ({
    classId: cls.id,
    roomId: rooms[Math.floor(Math.random() * rooms.length)].id,
    day: days[Math.floor(Math.random() * days.length)],
    startTime: timeSlots[Math.floor(Math.random() * timeSlots.length)],
    duration: cls.duration,
  }));

  return {
    schedule,
    rooms,
    lecturers,
    classes,
  };
}
```

### Step 6: Configure and Solve

```typescript
import { SimulatedAnnealing } from 'timetable-sa';
import type { SAConfig } from 'timetable-sa';

// Create initial state
const initialState = createInitialState(rooms, lecturers, classes);

// Set up constraints
const constraints = [
  new NoRoomConflict(),
  new NoLecturerConflict(),
  new NoProdiConflict(),
  new RoomCapacity(),
  new PreferMorningSlots(),
  new MinimizeGaps(),
];

// Set up move generators
const moveGenerators = [
  new ChangeTimeSlot(),
  new ChangeRoom(),
  new SwapClasses(),
];

// Configure
const config: SAConfig<TimetableState> = {
  initialTemperature: 1000,
  minTemperature: 0.01,
  coolingRate: 0.995,
  maxIterations: 50000,
  hardConstraintWeight: 10000,
  cloneState: (state) => ({
    ...state,
    schedule: state.schedule.map(e => ({ ...e })),
  }),
  logging: {
    level: 'info',
    logInterval: 1000,
  },
};

// Solve!
const solver = new SimulatedAnnealing(initialState, constraints, moveGenerators, config);
const solution = solver.solve();

// Check results
if (solution.hardViolations === 0) {
  console.log('Valid timetable found!');
  console.log('Schedule:', solution.state.schedule);
} else {
  console.log('No valid solution found');
  console.log('Violations:', solution.violations);
}
```

## Advantages of v2.0

### 1. Complete Flexibility

```typescript
// You can use ANY time representation
interface MyState {
  schedule: Array<{
    start: Date;      // Use Date objects
    end: Date;
  }>;
}

// Or simple strings
interface MyState {
  schedule: Array<{
    time: string;     // "Monday 08:00-09:30"
  }>;
}

// Or numbers
interface MyState {
  schedule: Array<{
    slot: number;     // 0-59 for 60 possible slots
  }>;
}
```

### 2. Custom Constraints

Easily add domain-specific constraints:

```typescript
// University-specific: No classes during prayer time
class NoPrayerTimeConflict implements Constraint<TimetableState> {
  name = 'No Prayer Time Conflict';
  type = 'hard' as const;

  evaluate(state: TimetableState): number {
    for (const entry of state.schedule) {
      if (entry.day === 'Friday' && this.overlapsPrayerTime(entry)) {
        return 0;
      }
    }
    return 1;
  }

  private overlapsPrayerTime(entry: ScheduleEntry): boolean {
    // Your logic
  }
}
```

### 3. Targeted Move Operators

Create operators that specifically fix known issues:

```typescript
class FixRoomCapacityViolation implements MoveGenerator<TimetableState> {
  name = 'Fix Room Capacity';

  canApply(state: TimetableState): boolean {
    // Only applicable if there are capacity violations
    return this.hasCapacityViolations(state);
  }

  generate(state: TimetableState, temperature: number): TimetableState {
    const newState = this.cloneState(state);

    // Find a class in a too-small room
    const violation = this.findCapacityViolation(state);

    if (violation) {
      // Move to larger room
      const suitableRoom = this.findSuitableRoom(violation, state);
      if (suitableRoom) {
        const index = newState.schedule.findIndex(e => e.classId === violation.classId);
        newState.schedule[index].roomId = suitableRoom.id;
      }
    }

    return newState;
  }

  // Helper methods...
}
```

## Common Pitfalls

### 1. Not Cloning State

❌ **Wrong:**
```typescript
generate(state: TimetableState, temperature: number): TimetableState {
  state.schedule[0].roomId = 'R1'; // Modifies original!
  return state;
}
```

✅ **Correct:**
```typescript
generate(state: TimetableState, temperature: number): TimetableState {
  const newState = {
    ...state,
    schedule: state.schedule.map(e => ({ ...e })),
  };
  newState.schedule[0].roomId = 'R1';
  return newState;
}
```

### 2. Incorrect Constraint Scores

❌ **Wrong:**
```typescript
evaluate(state: TimetableState): number {
  return hasViolation ? 1 : 0; // Backwards!
}
```

✅ **Correct:**
```typescript
evaluate(state: TimetableState): number {
  return hasViolation ? 0 : 1; // 0 = violated, 1 = satisfied
}
```

### 3. Forgetting cloneState in Config

❌ **Wrong:**
```typescript
const config = {
  // ... other params
  // Missing cloneState!
};
```

✅ **Correct:**
```typescript
const config: SAConfig<TimetableState> = {
  // ... other params
  cloneState: (state) => ({
    ...state,
    schedule: state.schedule.map(e => ({ ...e })),
  }),
};
```

## Need Help?

- Check the [examples directory](../examples/timetabling/) for a complete timetabling implementation
- Read the [Getting Started](./getting-started.md) guide
- See [Examples](./examples.md) for more complete examples

## Summary

v2.0 requires more setup code but gives you:
- Complete control over your problem domain
- Ability to solve ANY optimization problem
- Custom constraints and moves
- Better performance through optimized cloning
- Type safety with TypeScript generics

The extra work is worth it for the flexibility and power you gain!
