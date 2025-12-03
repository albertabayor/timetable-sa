# timetable-sa v2.0

**Generic, Unopinionated Simulated Annealing Library for Constraint Satisfaction Problems**

A powerful TypeScript library that solves ANY constraint-satisfaction and optimization problem using Simulated Annealing. Perfect for timetabling, scheduling, resource allocation, and custom optimization tasks.

[![npm version](https://img.shields.io/npm/v/timetable-sa.svg)](https://www.npmjs.com/package/timetable-sa)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What's New in v2.0

v2.0 is a complete rewrite that transforms `timetable-sa` from a university-specific timetabling solver into a **truly generic optimization library**:

- **Zero Domain Assumptions**: The core knows nothing about timetables, rooms, or any specific domain
- **User-Defined Everything**: You define your state, constraints, and move operators
- **Type-Safe & Generic**: Full TypeScript support with `<TState>` generics
- **Maximum Flexibility**: Solve scheduling, allocation, planning, or any optimization problem

## Features

- Two-phase optimization (hard constraints → soft constraints)
- Adaptive operator selection based on success rates
- Reheating mechanism to escape local minima
- Comprehensive logging and violation tracking
- Full TypeScript type safety
- Zero dependencies for core library

## Installation

```bash
npm install timetable-sa
```

## Quick Start

Here's a minimal example showing how to solve a simple constraint-satisfaction problem:

```typescript
import { SimulatedAnnealing } from 'timetable-sa';
import type { Constraint, MoveGenerator, SAConfig } from 'timetable-sa';

// 1. Define your state type
interface MyState {
  assignments: Array<{ task: string; worker: string; time: number }>;
}

// 2. Define constraints
class NoWorkerConflict implements Constraint<MyState> {
  name = 'No Worker Conflict';
  type = 'hard' as const;

  evaluate(state: MyState): number {
    // Check if any worker is assigned to multiple tasks at the same time
    const conflicts = new Set();
    for (let i = 0; i < state.assignments.length; i++) {
      for (let j = i + 1; j < state.assignments.length; j++) {
        const a = state.assignments[i];
        const b = state.assignments[j];
        if (a.worker === b.worker && a.time === b.time) {
          conflicts.add(i);
        }
      }
    }
    return conflicts.size === 0 ? 1 : 0; // 1 = satisfied, 0 = violated
  }
}

// 3. Define move operators
class ChangeTime implements MoveGenerator<MyState> {
  name = 'Change Time';

  canApply(state: MyState): boolean {
    return state.assignments.length > 0;
  }

  generate(state: MyState, temperature: number): MyState {
    const newState = JSON.parse(JSON.stringify(state));
    const randomIndex = Math.floor(Math.random() * newState.assignments.length);
    newState.assignments[randomIndex].time = Math.floor(Math.random() * 10);
    return newState;
  }
}

// 4. Configure and run
const initialState: MyState = {
  assignments: [
    { task: 'Task A', worker: 'Alice', time: 0 },
    { task: 'Task B', worker: 'Bob', time: 0 },
    { task: 'Task C', worker: 'Alice', time: 0 }, // Conflict!
  ],
};

const constraints = [new NoWorkerConflict()];
const moveGenerators = [new ChangeTime()];

const config: SAConfig<MyState> = {
  initialTemperature: 100,
  minTemperature: 0.01,
  coolingRate: 0.99,
  maxIterations: 10000,
  hardConstraintWeight: 1000,
  cloneState: (state) => JSON.parse(JSON.stringify(state)),
};

const solver = new SimulatedAnnealing(initialState, constraints, moveGenerators, config);
const solution = solver.solve();

console.log('Solution found!');
console.log(`Fitness: ${solution.fitness}`);
console.log(`Hard violations: ${solution.hardViolations}`);
console.log(`State:`, solution.state);
```

## Core Concepts

### 1. State

Your state represents the current solution. It can be ANY TypeScript type - including custom time slot definitions:

```typescript
// Example 1: Timetabling with custom time slots
interface TimetableState {
  schedule: ScheduleEntry[];
  availableTimeSlots: TimeSlot[];  // YOU define this structure
  rooms: Room[];
}

interface TimeSlot {
  day: string;        // or number, or Date
  startTime: string;  // "08:00", "14:30", etc. - your choice
  endTime: string;
  // Add ANY fields you need
  period?: number;
  isBreakTime?: boolean;
}

// Example 2: Hospital shifts (no "time slots", different concept)
interface ShiftState {
  shifts: Map<string, Shift[]>;
  employees: Employee[];
}
```

**You have complete freedom** to define what time slots mean in your domain, or not use them at all!

### 2. Constraints

Constraints evaluate how "good" a state is:

```typescript
interface Constraint<TState> {
  name: string;
  type: 'hard' | 'soft';  // Hard must be satisfied, soft are preferred
  weight?: number;        // For soft constraints (default: 10)
  evaluate(state: TState): number;  // Returns 0-1 (0 = violated, 1 = satisfied)
  describe?(state: TState): string | undefined;  // Optional violation description
}
```

See full documentation below for examples.

## Solution Output

The solver returns a comprehensive solution:

```typescript
interface Solution<TState> {
  state: TState;                 // Best state found
  fitness: number;               // Final fitness (lower is better)
  hardViolations: number;        // Number of hard constraint violations
  softViolations: number;        // Number of soft constraint violations
  iterations: number;            // Total iterations performed
  reheats: number;               // Number of reheating events
  finalTemperature: number;      // Final temperature
  violations: Violation[];       // Detailed list of violations
  operatorStats: OperatorStats;  // Performance of each move operator
}
```

## Use Cases

This library can solve ANY constraint-satisfaction problem:

- **Timetabling**: University courses, school schedules, exam scheduling (with YOUR custom time slot definitions)
- **Shift Scheduling**: Nurse rosters, employee shifts, security patrols
- **Resource Allocation**: Meeting rooms, equipment, vehicles
- **Planning**: Project tasks, delivery routes, production schedules
- **Assignment**: Jobs to workers, students to classes
- **Coloring**: Graph coloring, map coloring, frequency assignment
- **Packing**: Bin packing, container loading
- **Custom**: Any problem with constraints and objectives

## API Reference

### `SimulatedAnnealing<TState>`

```typescript
class SimulatedAnnealing<TState> {
  constructor(
    initialState: TState,
    constraints: Constraint<TState>[],
    moveGenerators: MoveGenerator<TState>[],
    config: SAConfig<TState>
  );

  solve(): Solution<TState>;
  getStats(): OperatorStats;
}
```

### Configuration

```typescript
interface SAConfig<TState> {
  // Core parameters
  initialTemperature: number;    // Starting temperature (e.g., 1000)
  minTemperature: number;        // Stopping temperature (e.g., 0.01)
  coolingRate: number;           // Cooling factor 0-1 (e.g., 0.995)
  maxIterations: number;         // Max iterations (e.g., 50000)
  hardConstraintWeight: number;  // Penalty for hard constraints (e.g., 10000)

  // State management
  cloneState: (state: TState) => TState;

  // Optional: Reheating (escape local minima)
  reheatingThreshold?: number;   // Iterations without improvement before reheating
  reheatingFactor?: number;      // Temperature multiplication factor (default: 2.0)
  maxReheats?: number;           // Maximum reheating events (default: 3)

  // Optional: Logging
  logging?: {
    enabled?: boolean;
    level?: 'debug' | 'info' | 'warn' | 'error' | 'none';
    logInterval?: number;
    output?: 'console' | 'file' | 'both';
    filePath?: string;
  };
}
```

## Two-Phase Optimization

The solver uses a two-phase approach:

1. **Phase 1**: Eliminate hard constraint violations
   - Focuses exclusively on satisfying hard constraints
   - Refuses moves that increase hard violations

2. **Phase 2**: Optimize soft constraints
   - Maintains hard constraint satisfaction
   - Optimizes soft constraint satisfaction

This ensures hard constraints are always satisfied before optimizing for preferences.

## Adaptive Operator Selection

The solver tracks success rates of each move operator and adaptively selects the most effective ones. Operators with higher success rates are selected more frequently (70% weighted selection + 30% random exploration).

## Documentation

Comprehensive documentation is available in the [`docs/`](./docs) directory:

- **[Getting Started](./docs/getting-started.md)** - Your first program with timetable-sa
- **[Core Concepts](./docs/core-concepts.md)** - Understanding states, constraints, and moves
- **[Configuration Guide](./docs/configuration.md)** - Detailed parameter tuning
- **[Advanced Features](./docs/advanced-features.md)** - Two-phase optimization, reheating, adaptive operators
- **[API Reference](./docs/api-reference.md)** - Complete API documentation
- **[Examples](./docs/examples.md)** - Complete working examples
- **[Migration Guide](./docs/migration-guide.md)** - Migrating from v1.x to v2.0

## Examples

See the [`examples/timetabling/`](./examples/timetabling) directory for a complete university timetabling implementation using v2.0.

Run the example:
```bash
npm run example:timetabling
```

## Migration from v1.x

v2.0 is a **complete rewrite** with breaking changes. The old v1 API is not compatible.

**Old v1 API (domain-specific):**
```typescript
const solver = new SimulatedAnnealing(rooms, lecturers, classes, config);
```

**New v2 API (generic):**
```typescript
const solver = new SimulatedAnnealing(initialState, constraints, moveGenerators, config);
```

In v2, **you** define:
- Your state structure (including time slots if needed)
- Your constraints (hard and soft)
- Your move operators
- Everything else specific to your domain

**See the [Migration Guide](./docs/migration-guide.md) for detailed instructions.**

## License

MIT

## Author

Emmanuel Alejandro Albert A Bayor

## Contributing

Contributions welcome! Please open an issue or PR on GitHub.
