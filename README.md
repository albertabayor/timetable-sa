# timetable-sa v2.4.0

**Generic, Unopinionated Simulated Annealing Library for Constraint Satisfaction Problems**

A powerful TypeScript library that solves ANY constraint-satisfaction and optimization problem using Simulated Annealing. Perfect for timetabling, scheduling, resource allocation, and custom optimization tasks.

[![npm version](https://img.shields.io/npm/v/timetable-sa.svg)](https://www.npmjs.com/package/timetable-sa)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What's New in v2.4.0

**Enhanced Progress Statistics**

- **New Fields in `ProgressStats`:**
  - `initialCost`: The cost at the start of optimization
  - `improvement`: Percentage improvement from initial to best cost
  - `tabuSize`: Current number of states in the tabu list
  - Improved `tabuHits`: Now correctly counts states rejected because they were tabu (not tabu list size)

**Breaking Change:** The `tabuHits` field behavior has been corrected. Previously it reported the tabu list size; now it correctly counts tabu rejections. Use `tabuSize` for the list size.

## What's New in v2.3.0

**Real-Time Progress Tracking with onProgress Callback**

- **onProgress Callback**: Real-time progress updates during optimization
  - Track iterations, cost, temperature, and violations in real-time
  - Support for async callbacks (WebSocket, database logging, etc.)
  - Triggers at iteration 0, every `logInterval`, phase transitions, and reheating events
  - Full TypeScript support with `ProgressStats` interface
  - Error handling - callback errors don't break optimization
  - Perfect for web applications, progress bars, and monitoring systems

- **Async solve()**: `solve()` now returns a `Promise<Solution<TState>>` to support async progress callbacks

**Example Usage:**
```typescript
const config: SAConfig<MyState> = {
  maxIterations: 20000,
  logInterval: 500,
  onProgress: async (iteration, cost, temp, state, stats) => {
    console.log(`[${stats.phase}] ${stats.progressPercent.toFixed(1)}%`);
    // Send to WebSocket, save to DB, update UI, etc.
  }
};

const solver = new SimulatedAnnealing(state, constraints, moves, config);
const solution = await solver.solve();
```

## What's New in v2.1.1

**Advanced Features for Better Solutions**

- **Tabu Search**: Prevents cycling by tracking recently visited states, helping escape local minima more effectively
- **Phase 1.5 Intensification**: Aggressively targets remaining hard violations when Phase 1 doesn't achieve zero violations
- **Enhanced Operator Statistics**: Better tracking of move operator performance with success rate metrics
- **Multi-Phase Optimization**: Automatic transition between Phase 1, Phase 1.5, and Phase 2
- **Performance Optimization**: Unified fitness calculation reduces constraint evaluation overhead by ~28%

**Benchmark Results:**
- **60% success rate** for achieving zero hard constraint violations
- **Average fitness: ~26.6** (lower is better) for successful runs
- **Best fitness: 26.54** achieved in testing
- See [`docs/OPTIMIZATION_SUMMARY.md`](./docs/OPTIMIZATION_SUMMARY.md) for detailed performance analysis

## What's New in v2.0

v2.0 is a complete rewrite that transforms `timetable-sa` from a university-specific timetabling solver into a **truly generic optimization library**:

- **Zero Domain Assumptions**: The core knows nothing about timetables, rooms, or any specific domain
- **User-Defined Everything**: You define your state, constraints, and move operators
- **Type-Safe & Generic**: Full TypeScript support with `<TState>` generics
- **Maximum Flexibility**: Solve scheduling, allocation, planning, or any optimization problem

## Features

- **Real-Time Progress Tracking**: `onProgress` callback for live optimization monitoring
- **Multi-Phase Optimization**: Phase 1 (hard constraints), Phase 1.5 (intensification), Phase 2 (soft constraints)
- **Tabu Search**: Prevents cycling and escapes local minima by tracking visited states
- **Adaptive Operator Selection**: Learns which operators work best and uses them more frequently (hybrid or roulette-wheel mode)
- **Configurable Selection Modes**: Choose between hybrid (30% random + 70% weighted) or pure roulette-wheel selection
- **Reheating Mechanism**: Escapes local minima by temporarily increasing temperature
- **Intensification**: Aggressively targets remaining hard violations with focused search
- **Performance Optimized**: Unified fitness calculation, efficient constraint evaluation
- **Comprehensive Logging**: Detailed progress tracking and violation reporting
- **Full TypeScript Type Safety**: Generic type support with `<TState>`
- **Zero Dependencies**: Core library has no external dependencies

## Performance

Based on benchmark testing with university course timetabling (356 classes, 11 hard constraints, 8 soft constraints):

| Metric | Value |
|--------|-------|
| Success Rate (0 hard violations) | 60% (3/5 runs average) |
| Best Fitness Achieved | 26.54 |
| Average Fitness (successful) | 26.6 |
| Average Execution Time | ~30 seconds per run |
| Recommended: Multiple Instances | Run 3-5 parallel instances for near 100% success |

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
  // Core parameters
  initialTemperature: 100,
  minTemperature: 0.01,
  coolingRate: 0.99,
  maxIterations: 10000,
  hardConstraintWeight: 1000,
  cloneState: (state) => JSON.parse(JSON.stringify(state)),

  // Advanced features (optional)
  tabuSearchEnabled: true,        // Prevent cycling
  enableIntensification: true,      // Aggressively fix violations
  reheatingThreshold: 500,         // Escape local minima
  reheatingFactor: 2.0,
  maxReheats: 2,
};

const solver = new SimulatedAnnealing(initialState, constraints, moveGenerators, config);
const solution = await solver.solve();

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

  solve(): Promise<Solution<TState>>;
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

  // Optional: Tabu Search (prevent cycling)
  tabuSearchEnabled?: boolean;     // Enable/disable (default: false)
  tabuTenure?: number;            // Tabu duration in iterations (default: 50)
  maxTabuListSize?: number;        // Max tabu entries (default: 1000)

  // Optional: Intensification (aggressive violation elimination)
  enableIntensification?: boolean;   // Enable/disable (default: true)
  intensificationIterations?: number; // Iterations per attempt (default: 2000)
  maxIntensificationAttempts?: number; // Max restart attempts (default: 3)

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

  // Optional: Progress Tracking
  onProgress?: (
    iteration: number,
    currentCost: number,
    temperature: number,
    state: TState | null,
    stats: ProgressStats
  ) => void | Promise<void>;

  // Optional: Operator Selection Mode
  operatorSelectionMode?: 'hybrid' | 'roulette-wheel';  // Default: 'hybrid'
}

### ProgressStats Interface

When using the `onProgress` callback, you receive a `ProgressStats` object with comprehensive optimization metrics:

```typescript
interface ProgressStats {
  iteration: number;              // Current iteration
  currentCost: number;            // Current cost/fitness
  bestCost: number;               // Best cost found so far
  initialCost: number;            // Cost at the start of optimization
  improvement: number;            // Percentage improvement from initial to best
  temperature: number;            // Current temperature
  hardViolations: number;         // Number of hard constraint violations
  softViolations: number;         // Number of soft constraint violations
  tabuHits: number;               // States rejected because they were tabu
  tabuSize: number;               // Current number of states in tabu list
  phase: 'phase1' | 'phase15' | 'phase2' | 'initial';  // Current phase
  reheatingCount: number;         // Number of reheating events
  acceptedMoves: number;          // Total accepted moves
  rejectedMoves: number;          // Total rejected moves
  stagnationCount: number;        // Iterations without improvement
  bestCostIteration: number;      // Iteration where best cost was found
  progressPercent: number;        // Progress percentage (0-100)
  timestamp: number;              // Timestamp (Date.now())
}
```

## Multi-Phase Optimization

The solver uses a multi-phase approach to find high-quality solutions:

1. **Phase 1**: Eliminate hard constraint violations (60% of maxIterations)
   - Focuses exclusively on satisfying hard constraints
   - Refuses moves that increase hard violations
   - Uses Tabu Search if enabled to prevent cycling

2. **Phase 1.5**: Intensification (optional, if enabled)
   - Triggered when Phase 1 ends with remaining hard violations
   - Aggressively targets remaining violations with focused operator selection
   - Multiple restart attempts with temperature reset
   - Stops early when all hard violations eliminated

3. **Phase 2**: Optimize soft constraints
   - Maintains hard constraint satisfaction (strict enforcement)
   - Optimizes soft constraint satisfaction
   - Uses Tabu Search if enabled to prevent cycling

This ensures hard constraints are satisfied before optimizing for preferences, with additional mechanisms to handle difficult constraint sets.

## Adaptive Operator Selection

The solver tracks success rates of each move operator and adaptively selects the most effective ones. Two selection modes are available:

- **hybrid (default)**: 70% weighted selection by success rate + 30% random exploration (balanced, more robust)
- **roulette-wheel**: 100% fitness-proportionate selection (pure theoretical formula, higher exploitation)

Configure via `operatorSelectionMode` config option.

## Documentation

Comprehensive documentation is available in the [`docs/`](./docs) directory:

- **[Getting Started](./docs/getting-started.md)** - Your first program with timetable-sa
- **[Core Concepts](./docs/core-concepts.md)** - Understanding states, constraints, and moves
- **[Configuration Guide](./docs/configuration.md)** - Detailed parameter tuning
- **[Advanced Features](./docs/advanced-features.md)** - Multi-phase optimization, tabu search, intensification, reheating
- **[API Reference](./docs/api-reference.md)** - Complete API documentation
- **[Examples](./docs/examples.md)** - Complete working examples
- **[Migration Guide](./docs/migration-guide.md)** - Migrating from v1.x to v2.0

## Examples

See the [`examples/timetabling/`](./examples/timetabling) directory for a complete university timetabling implementation using v2.1.0.

Run the example:
```bash
npm run example:timetabling
```

### Build Standalone Binary (NEW!)

Compile the timetabling example to a standalone executable using Bun:

```bash
# Build for current platform
npm run build:binary

# Build for all platforms (Linux, macOS, Windows)
npm run build:binary:all

# Or specific platforms
npm run build:binary:linux
npm run build:binary:macos
npm run build:binary:windows
```

See [`docs/BUILD_BINARY.md`](./docs/BUILD_BINARY.md) for detailed instructions.


## Migration from v1.x

v2.0 is a **complete rewrite** with breaking changes. The old v1 API is not compatible.

**v2.1.0** adds advanced features while maintaining full API compatibility with v2.0.</think>

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
