# Core Concepts

This guide explains the fundamental concepts in **timetable-sa** and how they work together to solve optimization problems.

## Table of Contents

- [State](#state)
- [Constraints](#constraints)
- [Move Generators](#move-generators)
- [The Algorithm](#the-algorithm)
- [Fitness Calculation](#fitness-calculation)

## State

The **state** represents a candidate solution to your problem. It can be ANY TypeScript type.

### Defining Your State

```typescript
// Example 1: Timetabling
interface TimetableState {
  schedule: ScheduleEntry[];
  rooms: Room[];
  lecturers: Lecturer[];
}

interface ScheduleEntry {
  classId: string;
  roomId: string;
  lecturerId: string;
  day: string;
  startTime: string;
  duration: number;
}

// Example 2: Shift scheduling
interface ShiftState {
  shifts: Map<string, Shift[]>;
  employees: Employee[];
}

// Example 3: Graph coloring
interface GraphState {
  nodeColors: Map<string, number>;
  edges: Edge[];
}
```

### State Guidelines

1. **Immutability**: Never modify the state in constraints or move generators
2. **Completeness**: State should contain all information needed to evaluate constraints
3. **Simplicity**: Keep it simple - complex nested structures can slow down cloning
4. **Flexibility**: You define the structure - no restrictions from the library

## Constraints

Constraints evaluate how "good" a state is. There are two types:

### Hard Constraints

**Hard constraints MUST be satisfied.** They represent non-negotiable requirements.

Examples:
- No room can be used by two classes at the same time
- Workers cannot exceed maximum hours
- Graph nodes connected by an edge must have different colors

```typescript
class NoRoomConflict implements Constraint<TimetableState> {
  name = 'No Room Conflict';
  type = 'hard' as const;

  evaluate(state: TimetableState): number {
    const violations = new Set<number>();

    for (let i = 0; i < state.schedule.length; i++) {
      for (let j = i + 1; j < state.schedule.length; j++) {
        const a = state.schedule[i];
        const b = state.schedule[j];

        // Check if same room at overlapping times
        if (a.roomId === b.roomId && a.day === b.day) {
          const aEnd = addMinutes(a.startTime, a.duration);
          const bEnd = addMinutes(b.startTime, b.duration);

          if (timesOverlap(a.startTime, aEnd, b.startTime, bEnd)) {
            violations.add(i);
          }
        }
      }
    }

    // Return 1 (satisfied) or 0 (violated)
    return violations.size === 0 ? 1 : 0;
  }

  describe(state: TimetableState): string | undefined {
    // Return description of first violation found
    for (let i = 0; i < state.schedule.length; i++) {
      for (let j = i + 1; j < state.schedule.length; j++) {
        // ... check for conflicts
        if (hasConflict) {
          return `Room ${a.roomId} has conflict: ${a.classId} and ${b.classId} at ${a.day} ${a.startTime}`;
        }
      }
    }
    return undefined;
  }
}
```

### Soft Constraints

**Soft constraints are preferences** - desirable but not required.

Examples:
- Prefer morning time slots
- Minimize gaps between classes
- Balance workload across workers

```typescript
class PreferMorningSlots implements Constraint<TimetableState> {
  name = 'Prefer Morning Slots';
  type = 'soft' as const;
  weight = 10; // Importance (default is 10)

  evaluate(state: TimetableState): number {
    let morningClasses = 0;
    let totalClasses = state.schedule.length;

    for (const entry of state.schedule) {
      const hour = parseInt(entry.startTime.split(':')[0]);
      if (hour < 12) morningClasses++;
    }

    // Return satisfaction score 0.0 to 1.0
    return morningClasses / totalClasses;
  }
}
```

### Constraint Interface

```typescript
interface Constraint<TState> {
  // Unique name for logging
  name: string;

  // 'hard' or 'soft'
  type: 'hard' | 'soft';

  // Weight for soft constraints (optional, default: 10)
  weight?: number;

  // Evaluate the constraint
  // Returns: 1.0 = fully satisfied, 0.0 = violated
  evaluate(state: TState): number;

  // Optional: Describe violations for debugging
  describe?(state: TState): string | undefined;

  // Optional: Get all violations (for detailed reporting)
  getViolations?(state: TState): string[];
}
```

### Advanced: Multiple Violations

Use `getViolations()` to report ALL violations, not just the first one:

```typescript
class NoRoomConflict implements Constraint<TimetableState> {
  name = 'No Room Conflict';
  type = 'hard' as const;

  evaluate(state: TimetableState): number {
    const violations = this.findConflicts(state);
    return violations.length === 0 ? 1 : 1 / (1 + violations.length);
  }

  getViolations(state: TimetableState): string[] {
    const violations: string[] = [];

    for (let i = 0; i < state.schedule.length; i++) {
      for (let j = i + 1; j < state.schedule.length; j++) {
        // Check for conflict
        if (hasConflict(state.schedule[i], state.schedule[j])) {
          violations.push(
            `Room ${a.roomId}: ${a.classId} at ${a.startTime} conflicts with ${b.classId} at ${b.startTime}`
          );
        }
      }
    }

    return violations;
  }

  private findConflicts(state: TimetableState) {
    // ... implementation
  }
}
```

## Move Generators

Move generators define how to explore the solution space by creating **neighbor states**.

### Types of Moves

**Local Moves**: Modify a single element
```typescript
class ChangeTimeSlot implements MoveGenerator<TimetableState> {
  name = 'Change Time Slot';

  canApply(state: TimetableState): boolean {
    return state.schedule.length > 0;
  }

  generate(state: TimetableState, temperature: number): TimetableState {
    const newState = cloneState(state);
    const randomIndex = Math.floor(Math.random() * newState.schedule.length);

    // Change to a random time slot
    newState.schedule[randomIndex].startTime = getRandomTimeSlot();

    return newState;
  }
}
```

**Swap Moves**: Exchange properties between two elements
```typescript
class SwapTimeSlots implements MoveGenerator<TimetableState> {
  name = 'Swap Time Slots';

  canApply(state: TimetableState): boolean {
    return state.schedule.length >= 2;
  }

  generate(state: TimetableState, temperature: number): TimetableState {
    const newState = cloneState(state);

    // Pick two random classes
    const i = Math.floor(Math.random() * newState.schedule.length);
    let j = Math.floor(Math.random() * newState.schedule.length);
    while (j === i) j = Math.floor(Math.random() * newState.schedule.length);

    // Swap their time slots
    const temp = newState.schedule[i].startTime;
    newState.schedule[i].startTime = newState.schedule[j].startTime;
    newState.schedule[j].startTime = temp;

    return newState;
  }
}
```

**Multi-attribute Moves**: Change multiple properties at once
```typescript
class ChangeTimeAndRoom implements MoveGenerator<TimetableState> {
  name = 'Change Time and Room';

  canApply(state: TimetableState): boolean {
    return state.schedule.length > 0 && state.rooms.length > 0;
  }

  generate(state: TimetableState, temperature: number): TimetableState {
    const newState = cloneState(state);
    const randomIndex = Math.floor(Math.random() * newState.schedule.length);

    // Change both time and room
    newState.schedule[randomIndex].startTime = getRandomTimeSlot();
    newState.schedule[randomIndex].roomId = getRandomRoom(state.rooms);

    return newState;
  }
}
```

### Temperature-Dependent Moves

Use temperature to adjust exploration intensity:

```typescript
class AdaptiveSwap implements MoveGenerator<TimetableState> {
  name = 'Adaptive Swap';

  canApply(state: TimetableState): boolean {
    return state.schedule.length >= 2;
  }

  generate(state: TimetableState, temperature: number): TimetableState {
    const newState = cloneState(state);

    // High temperature: swap distant classes (more exploration)
    // Low temperature: swap nearby classes (fine-tuning)
    const maxDistance = temperature > 50 ? Infinity : 5;

    const [i, j] = this.pickClassesToSwap(state, maxDistance);

    // Swap
    const temp = newState.schedule[i].startTime;
    newState.schedule[i].startTime = newState.schedule[j].startTime;
    newState.schedule[j].startTime = temp;

    return newState;
  }

  private pickClassesToSwap(state: TimetableState, maxDistance: number) {
    // Implementation...
  }
}
```

### Move Generator Interface

```typescript
interface MoveGenerator<TState> {
  // Unique name for logging
  name: string;

  // Check if move is applicable
  canApply(state: TState): boolean;

  // Generate a neighbor state
  // temperature: current temperature (use for adaptive moves)
  generate(state: TState, temperature: number): TState;
}
```

### Best Practices

1. **Don't Modify Input**: Always clone the state before modifying
2. **Use canApply**: Skip moves that don't make sense for the current state
3. **Combine Strategies**: Use multiple move types for better exploration
4. **Start Simple**: Begin with basic moves, add complex ones later
5. **Performance**: Efficient cloning is critical (avoid `JSON.parse/stringify` if possible)

## The Algorithm

timetable-sa uses a **two-phase simulated annealing** approach:

### Phase 1: Eliminate Hard Constraints

Goal: Find a **feasible** solution (all hard constraints satisfied)

- Focus exclusively on reducing hard constraint violations
- Reject moves that increase hard violations
- Continue until hard violations reach 0 or phase 1 iteration limit

### Phase 2: Optimize Soft Constraints

Goal: Find the **best** feasible solution

- Maintain hard constraint satisfaction (NEVER accept moves that violate hard constraints)
- Optimize soft constraint satisfaction
- Continue until temperature reaches minimum or max iterations

### Adaptive Operator Selection

The algorithm tracks which move operators are most effective:

- **70%** of the time: Select operators based on success rate (weighted random)
- **30%** of the time: Random selection (exploration)

This ensures effective operators are used more often while still exploring alternatives.

### Reheating

When stuck in a local minimum, the algorithm can "reheat":

1. Detects: No improvement for N iterations
2. Response: Multiply temperature by reheating factor
3. Effect: Temporarily increase exploration to escape local minimum
4. Limit: Maximum number of reheats (default: 3)

## Fitness Calculation

The fitness function combines hard and soft constraint penalties:

```
fitness = (hardPenalty × hardConstraintWeight) + softPenalty
```

Where:
- `hardPenalty = sum((1 - score) for each hard constraint)`
- `softPenalty = sum((1 - score) × weight for each soft constraint)`

### Example

Given:
- Hard constraint weight: 10000
- 1 hard constraint violated (score = 0): penalty = 1
- 2 soft constraints partially satisfied (scores = 0.6, 0.8, weights = 10, 5)

```
hardPenalty = (1 - 0) = 1
softPenalty = (1 - 0.6) × 10 + (1 - 0.8) × 5 = 4 + 1 = 5
fitness = 1 × 10000 + 5 = 10005
```

The large hard constraint weight ensures hard constraints are prioritized.

## Putting It All Together

```typescript
// 1. Define your state
interface MyState { /* ... */ }

// 2. Create constraints
const constraints: Constraint<MyState>[] = [
  new HardConstraint1(),
  new HardConstraint2(),
  new SoftConstraint1(),
  new SoftConstraint2(),
];

// 3. Create move generators
const moveGenerators: MoveGenerator<MyState>[] = [
  new Move1(),
  new Move2(),
  new Move3(),
];

// 4. Configure
const config: SAConfig<MyState> = {
  initialTemperature: 1000,
  minTemperature: 0.01,
  coolingRate: 0.995,
  maxIterations: 50000,
  hardConstraintWeight: 10000,
  cloneState: (state) => /* clone implementation */,
};

// 5. Solve
const solver = new SimulatedAnnealing(initialState, constraints, moveGenerators, config);
const solution = solver.solve();

// 6. Check results
if (solution.hardViolations === 0) {
  console.log('Valid solution found!');
  console.log('Soft violations:', solution.softViolations);
} else {
  console.log('Could not find valid solution');
  console.log('Violations:', solution.violations);
}
```

## Next Steps

- [Configuration Guide](./configuration.md) - Tune the algorithm
- [Advanced Features](./advanced-features.md) - Reheating, logging, custom operators
- [Examples](./examples.md) - Complete working examples
