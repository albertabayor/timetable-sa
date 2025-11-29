# V2.0 Architecture Plan - Unopinionated Simulated Annealing Library

## Vision

Transform `timetable-sa` from a university-timetabling-specific solver into a **truly generic, unopinionated constraint-satisfaction optimization library** that can solve ANY scheduling, allocation, or optimization problem using Simulated Annealing.

## Core Philosophy

1. **Zero Domain Assumptions**: The core library knows nothing about timetables, rooms, lecturers, or any specific domain
2. **User-Defined Everything**: Users define their state, constraints, and move operators
3. **Type-Safe & Generic**: Full TypeScript generics for compile-time safety
4. **Examples as Documentation**: Show best practices through comprehensive examples

## Architecture Overview

### Directory Structure

```
src/
├── core/
│   ├── SimulatedAnnealing.ts          # Generic SA engine <TState>
│   ├── interfaces/
│   │   ├── Constraint.ts              # Constraint interface
│   │   ├── MoveGenerator.ts           # Move operator interface
│   │   ├── SAConfig.ts                # Configuration interface
│   │   └── index.ts                   # Interface exports
│   ├── types/
│   │   ├── Solution.ts                # Solution type
│   │   ├── Violation.ts               # Violation tracking
│   │   └── index.ts                   # Type exports
│   └── index.ts                       # Core exports
├── examples/
│   ├── timetabling/                   # University timetabling example
│   │   ├── types/
│   │   │   ├── State.ts               # TimetableState
│   │   │   ├── Domain.ts              # Room, Lecturer, etc.
│   │   │   └── index.ts
│   │   ├── constraints/
│   │   │   ├── hard/                  # Hard constraints
│   │   │   │   ├── NoLecturerConflict.ts
│   │   │   │   ├── NoRoomConflict.ts
│   │   │   │   ├── RoomCapacity.ts
│   │   │   │   └── index.ts
│   │   │   ├── soft/                  # Soft constraints
│   │   │   │   ├── PreferredTime.ts
│   │   │   │   ├── Compactness.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── moves/
│   │   │   ├── ChangeTimeSlot.ts      # Move operator
│   │   │   ├── ChangeRoom.ts          # Move operator
│   │   │   ├── SwapClasses.ts         # Swap operator
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   ├── time.ts                # Time utilities
│   │   │   ├── timeslot-generator.ts  # Generate time slots
│   │   │   ├── initial-solution.ts    # Greedy initial solution
│   │   │   └── index.ts
│   │   ├── data/
│   │   │   ├── loaders.ts             # Excel/JSON loaders
│   │   │   └── index.ts
│   │   ├── example-basic.ts           # Basic usage example
│   │   ├── example-custom-timeslots.ts # Custom time slots
│   │   └── README.md                  # Timetabling example docs
│   ├── nurse-scheduling/              # Future example
│   └── resource-allocation/           # Future example
├── index.ts                           # Main export (core only)
└── package.json
```

## Core Interfaces

### 1. Constraint Interface

```typescript
/**
 * Represents a constraint that evaluates a state
 * @template TState - The state type for your problem domain
 */
export interface Constraint<TState> {
  /**
   * Unique name for this constraint (e.g., "No Room Conflict")
   */
  name: string;

  /**
   * Constraint type
   * - 'hard': Must be satisfied (violations heavily penalized)
   * - 'soft': Preferred but not required (violations lightly penalized)
   */
  type: 'hard' | 'soft';

  /**
   * Weight for soft constraints (ignored for hard constraints)
   * Higher weight = more important
   * @default 10
   */
  weight?: number;

  /**
   * Evaluate the constraint for the given state
   * @param state - Current state to evaluate
   * @returns Score between 0 and 1
   *   - 1.0 = fully satisfied
   *   - 0.0 = completely violated
   *   - 0.5 = partially satisfied
   */
  evaluate(state: TState): number;

  /**
   * Optional: Provide human-readable description of violations
   * @param state - Current state
   * @returns Description of violations, or undefined if satisfied
   */
  describe?(state: TState): string | undefined;
}
```

### 2. Move Generator Interface

```typescript
/**
 * Generates neighboring states by applying moves/modifications
 * @template TState - The state type for your problem domain
 */
export interface MoveGenerator<TState> {
  /**
   * Unique name for this move operator (e.g., "Swap Classes", "Change Room")
   */
  name: string;

  /**
   * Generate a new neighbor state from the current state
   * @param state - Current state (will not be modified)
   * @param temperature - Current temperature (for temperature-dependent moves)
   * @returns New state with modifications applied
   */
  generate(state: TState, temperature: number): TState;

  /**
   * Check if this move can be applied to the current state
   * @param state - Current state
   * @returns true if move is applicable
   */
  canApply(state: TState): boolean;
}
```

### 3. SA Configuration

```typescript
export interface SAConfig<TState> {
  // Core SA parameters
  initialTemperature: number;
  minTemperature: number;
  coolingRate: number;
  maxIterations: number;

  // Reheating (escape local minima)
  reheatingThreshold?: number;
  reheatingFactor?: number;
  maxReheats?: number;

  // Constraint weighting
  hardConstraintWeight: number;

  // State cloning function
  cloneState: (state: TState) => TState;

  // Logging
  logging?: {
    enabled: boolean;
    level: 'debug' | 'info' | 'warn' | 'error';
    logInterval?: number; // Log every N iterations
  };
}
```

### 4. Main Solver Class

```typescript
export class SimulatedAnnealing<TState> {
  constructor(
    initialState: TState,
    constraints: Constraint<TState>[],
    moveGenerators: MoveGenerator<TState>[],
    config: SAConfig<TState>
  );

  /**
   * Run the optimization algorithm
   * @returns Best solution found
   */
  solve(): Solution<TState>;

  /**
   * Get statistics about the optimization process
   */
  getStats(): OptimizationStats;
}

export interface Solution<TState> {
  state: TState;
  fitness: number;
  hardViolations: number;
  softViolations: number;
  iterations: number;
  violations: Violation[];
}
```

## Example: Timetabling Domain

### User-Defined State

```typescript
// examples/timetabling/types/State.ts
export interface TimetableState {
  schedule: ScheduleEntry[];
  availableTimeSlots: TimeSlot[];
  rooms: Room[];
  lecturers: Lecturer[];
}

export interface ScheduleEntry {
  classId: string;
  className: string;
  lecturers: string[];
  room: string;
  timeSlot: TimeSlot;
  sks: number;
  participants: number;
}

export interface TimeSlot {
  day: string;
  startTime: string;
  endTime: string;
}

// User defines their domain types
export interface Room {
  code: string;
  name: string;
  capacity: number;
  type: string;
}

export interface Lecturer {
  code: string;
  name: string;
  preferredTime?: string;
  maxDailyPeriods?: number;
}
```

### User-Defined Constraint

```typescript
// examples/timetabling/constraints/hard/NoRoomConflict.ts
import { Constraint } from 'timetable-sa';
import type { TimetableState } from '../../types';

export class NoRoomConflict implements Constraint<TimetableState> {
  name = 'No Room Conflict';
  type = 'hard' as const;

  evaluate(state: TimetableState): number {
    const { schedule } = state;

    for (let i = 0; i < schedule.length; i++) {
      for (let j = i + 1; j < schedule.length; j++) {
        const entry1 = schedule[i];
        const entry2 = schedule[j];

        // Check if same room and overlapping time
        if (entry1.room === entry2.room && this.isTimeOverlap(entry1, entry2)) {
          return 0; // Violation found
        }
      }
    }

    return 1; // No violations
  }

  describe(state: TimetableState): string | undefined {
    // Return violation details if any
    const { schedule } = state;

    for (let i = 0; i < schedule.length; i++) {
      for (let j = i + 1; j < schedule.length; j++) {
        const entry1 = schedule[i];
        const entry2 = schedule[j];

        if (entry1.room === entry2.room && this.isTimeOverlap(entry1, entry2)) {
          return `Room ${entry1.room} has conflict between ${entry1.classId} and ${entry2.classId}`;
        }
      }
    }

    return undefined;
  }

  private isTimeOverlap(entry1: ScheduleEntry, entry2: ScheduleEntry): boolean {
    if (entry1.timeSlot.day !== entry2.timeSlot.day) return false;

    const start1 = this.timeToMinutes(entry1.timeSlot.startTime);
    const end1 = this.timeToMinutes(entry1.timeSlot.endTime);
    const start2 = this.timeToMinutes(entry2.timeSlot.startTime);
    const end2 = this.timeToMinutes(entry2.timeSlot.endTime);

    return start1 < end2 && start2 < end1;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
}
```

### User-Defined Move Operator

```typescript
// examples/timetabling/moves/ChangeTimeSlot.ts
import { MoveGenerator } from 'timetable-sa';
import type { TimetableState } from '../types';

export class ChangeTimeSlot implements MoveGenerator<TimetableState> {
  name = 'Change Time Slot';

  canApply(state: TimetableState): boolean {
    return state.schedule.length > 0 && state.availableTimeSlots.length > 0;
  }

  generate(state: TimetableState, temperature: number): TimetableState {
    // Clone state (deep copy)
    const newState = this.cloneState(state);

    // Pick random schedule entry
    const randomIndex = Math.floor(Math.random() * newState.schedule.length);
    const entry = newState.schedule[randomIndex];

    // Pick random time slot
    const randomSlotIndex = Math.floor(Math.random() * newState.availableTimeSlots.length);
    const newTimeSlot = newState.availableTimeSlots[randomSlotIndex];

    // Apply move
    entry.timeSlot = { ...newTimeSlot };

    return newState;
  }

  private cloneState(state: TimetableState): TimetableState {
    return JSON.parse(JSON.stringify(state));
  }
}
```

### Usage Example

```typescript
// examples/timetabling/example-basic.ts
import { SimulatedAnnealing } from 'timetable-sa';
import { TimetableState } from './types';
import {
  NoRoomConflict,
  NoLecturerConflict,
  RoomCapacity
} from './constraints/hard';
import {
  PreferredTime,
  Compactness
} from './constraints/soft';
import {
  ChangeTimeSlot,
  ChangeRoom,
  SwapClasses
} from './moves';
import { generateInitialSolution } from './utils/initial-solution';
import { loadDataFromExcel } from './data/loaders';

// Load data
const data = loadDataFromExcel('./timetable-data.xlsx');

// Generate initial state
const initialState: TimetableState = generateInitialSolution(data);

// Define constraints
const constraints = [
  // Hard constraints
  new NoRoomConflict(),
  new NoLecturerConflict(),
  new RoomCapacity(),

  // Soft constraints
  new PreferredTime(10), // weight = 10
  new Compactness(5),    // weight = 5
];

// Define move generators
const moveGenerators = [
  new ChangeTimeSlot(),
  new ChangeRoom(),
  new SwapClasses(),
];

// Configure SA
const config = {
  initialTemperature: 1000,
  minTemperature: 0.01,
  coolingRate: 0.995,
  maxIterations: 50000,
  hardConstraintWeight: 10000,
  cloneState: (state: TimetableState) => JSON.parse(JSON.stringify(state)),
  logging: {
    enabled: true,
    level: 'info' as const,
    logInterval: 1000,
  },
};

// Run optimization
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
console.log(`Iterations: ${solution.iterations}`);
```

## Key Benefits

### For Users

1. **Complete Flexibility**: Define ANY problem domain
2. **No Assumptions**: Library doesn't assume time slots, rooms, or any domain concept
3. **Type Safety**: Full TypeScript support with generics
4. **Composable**: Mix and match constraints and moves
5. **Testable**: Test constraints and moves independently

### For Maintainers

1. **Small Core**: Core library is ~500 lines, not 1000+
2. **Zero Domain Logic**: No need to update for different use cases
3. **Examples as Tests**: Examples validate the API design
4. **Clear Separation**: Core vs. domain logic is explicit

## Migration Path

This is a **breaking change** from v1 to v2. We will:

1. Keep v1 on `main` branch (for existing users)
2. Develop v2 on `v2-unopinionated` branch
3. Publish v2 as a major version bump (2.0.0)
4. Provide migration examples (not automatic migration)

## Implementation Phases

### Phase 1: Core Implementation ✓ NEXT
- [ ] Core interfaces (Constraint, MoveGenerator, SAConfig)
- [ ] Generic SimulatedAnnealing<TState> class
- [ ] Solution and Violation types
- [ ] Adaptive operator selection
- [ ] Two-phase optimization (hard → soft)

### Phase 2: Timetabling Example
- [ ] Migrate current types to examples/timetabling/types/
- [ ] Convert built-in constraints to example constraints
- [ ] Implement move operators
- [ ] Create initial solution generator
- [ ] Add data loaders (Excel/JSON)

### Phase 3: Documentation
- [ ] Core API documentation
- [ ] Timetabling example documentation
- [ ] Migration conceptual guide
- [ ] Additional example domains

### Phase 4: Testing & Release
- [ ] Unit tests for core
- [ ] Integration tests with examples
- [ ] Performance benchmarks
- [ ] Publish v2.0.0

## Design Decisions

### Why Generic `<TState>` instead of Interface?

Using TypeScript generics allows users to define ANY state structure without inheritance or adapters. The core algorithm operates on `TState` without knowing its shape.

### Why Separate Hard/Soft via `type` field?

Users can mix hard and soft constraints in one array. The core separates them internally based on the `type` field. This is simpler than requiring two separate arrays.

### Why `cloneState` in config?

Different domains may have different cloning strategies (deep copy, structural sharing, etc.). Users provide the most efficient cloning for their state type.

### Why `evaluate()` returns 0-1 instead of boolean?

Allows for **partial satisfaction** in soft constraints. Hard constraints can still return 0 or 1, but soft constraints can express gradations (0.5 = half satisfied).

### Why separate `MoveGenerator` instead of function?

- Named operators for logging/stats
- `canApply()` for conditional moves
- Stateful operators if needed (track history, adapt parameters)
- Better organization in complex domains

## Future Enhancements (Post v2.0)

- [ ] Built-in move generators (swap, insert, remove)
- [ ] Parallel SA (multiple runs, pick best)
- [ ] Visualization utilities
- [ ] More example domains
- [ ] Constraint composition helpers
- [ ] Performance optimizations

## Success Criteria

V2 is successful if:

1. ✅ Core library is domain-agnostic
2. ✅ Users can solve non-timetabling problems easily
3. ✅ Timetabling example matches v1 functionality
4. ✅ Type safety is maintained throughout
5. ✅ Documentation is clear and comprehensive

---

**Ready to implement Phase 1!**
