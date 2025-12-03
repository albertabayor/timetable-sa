# Getting Started

Welcome to **timetable-sa** - a generic, unopinionated Simulated Annealing library for solving constraint satisfaction problems.

## What Can You Build?

This library can solve ANY optimization problem with constraints:

- **Timetabling**: University courses, school schedules, exam scheduling
- **Shift Scheduling**: Nurse rosters, employee shifts, security patrols
- **Resource Allocation**: Meeting rooms, equipment, vehicles
- **Planning**: Project tasks, delivery routes, production schedules
- **Assignment**: Jobs to workers, students to classes
- **Graph Problems**: Coloring, frequency assignment
- **Packing**: Bin packing, container loading
- And many more...

## Installation

```bash
npm install timetable-sa
```

## Your First Program

Let's solve a simple task assignment problem where workers cannot work on two tasks at the same time.

### Step 1: Define Your State

```typescript
import { SimulatedAnnealing } from 'timetable-sa';
import type { Constraint, MoveGenerator, SAConfig } from 'timetable-sa';

// Define what your problem looks like
interface TaskAssignment {
  assignments: Array<{
    task: string;
    worker: string;
    timeSlot: number;
  }>;
}
```

### Step 2: Create Constraints

Constraints define what makes a solution valid (hard) or desirable (soft).

```typescript
// Hard constraint: Workers cannot be assigned to multiple tasks simultaneously
class NoWorkerConflict implements Constraint<TaskAssignment> {
  name = 'No Worker Conflict';
  type = 'hard' as const;

  evaluate(state: TaskAssignment): number {
    const conflicts = new Set<number>();

    for (let i = 0; i < state.assignments.length; i++) {
      for (let j = i + 1; j < state.assignments.length; j++) {
        const a = state.assignments[i];
        const b = state.assignments[j];

        if (a.worker === b.worker && a.timeSlot === b.timeSlot) {
          conflicts.add(i);
        }
      }
    }

    // Return 1 if satisfied, 0 if violated
    return conflicts.size === 0 ? 1 : 0;
  }

  describe(state: TaskAssignment): string | undefined {
    // Provide helpful error messages
    for (let i = 0; i < state.assignments.length; i++) {
      for (let j = i + 1; j < state.assignments.length; j++) {
        const a = state.assignments[i];
        const b = state.assignments[j];

        if (a.worker === b.worker && a.timeSlot === b.timeSlot) {
          return `Worker ${a.worker} assigned to both ${a.task} and ${b.task} at time ${a.timeSlot}`;
        }
      }
    }
    return undefined;
  }
}
```

### Step 3: Create Move Generators

Move generators define how to explore the solution space.

```typescript
// Move: Change the time slot for a random task
class ChangeTimeSlot implements MoveGenerator<TaskAssignment> {
  name = 'Change Time Slot';

  canApply(state: TaskAssignment): boolean {
    return state.assignments.length > 0;
  }

  generate(state: TaskAssignment, temperature: number): TaskAssignment {
    // Clone the state (don't modify the original)
    const newState: TaskAssignment = {
      assignments: state.assignments.map(a => ({ ...a }))
    };

    // Pick a random assignment and change its time slot
    const randomIndex = Math.floor(Math.random() * newState.assignments.length);
    newState.assignments[randomIndex].timeSlot = Math.floor(Math.random() * 8); // 8 time slots

    return newState;
  }
}
```

### Step 4: Configure and Solve

```typescript
// Create initial state (can have violations)
const initialState: TaskAssignment = {
  assignments: [
    { task: 'Task A', worker: 'Alice', timeSlot: 0 },
    { task: 'Task B', worker: 'Bob', timeSlot: 0 },
    { task: 'Task C', worker: 'Alice', timeSlot: 0 }, // Conflict!
  ],
};

// Set up constraints and moves
const constraints = [new NoWorkerConflict()];
const moveGenerators = [new ChangeTimeSlot()];

// Configure the algorithm
const config: SAConfig<TaskAssignment> = {
  initialTemperature: 100,
  minTemperature: 0.01,
  coolingRate: 0.99,
  maxIterations: 10000,
  hardConstraintWeight: 1000,
  cloneState: (state) => ({
    assignments: state.assignments.map(a => ({ ...a }))
  }),
};

// Solve!
const solver = new SimulatedAnnealing(initialState, constraints, moveGenerators, config);
const solution = solver.solve();

// Check results
console.log('Solution found!');
console.log(`Fitness: ${solution.fitness}`);
console.log(`Hard violations: ${solution.hardViolations}`);
console.log(`Iterations: ${solution.iterations}`);
console.log('Assignments:', solution.state.assignments);

if (solution.hardViolations > 0) {
  console.log('Violations:', solution.violations);
}
```

## Expected Output

```
[INFO] Simulated Annealing initialized
[INFO] Starting optimization...
[INFO] Phase 1: Eliminating hard constraint violations
[INFO] Initial state { fitness: 1000.00, hardViolations: 1 }
[DEBUG] [Phase 1] New best: Hard violations = 0, Fitness = 0.00, Operator = Change Time Slot
[INFO] Phase 1 complete: Hard violations = 0
[INFO] Phase 2: Optimizing soft constraints
[INFO] Optimization complete
Solution found!
Fitness: 0
Hard violations: 0
Iterations: 1247
Assignments: [
  { task: 'Task A', worker: 'Alice', timeSlot: 3 },
  { task: 'Task B', worker: 'Bob', timeSlot: 0 },
  { task: 'Task C', worker: 'Alice', timeSlot: 5 }
]
```

## Next Steps

- [Core Concepts](./core-concepts.md) - Deep dive into states, constraints, and moves
- [Configuration Guide](./configuration.md) - Tune the algorithm for best results
- [Examples](./examples.md) - See more complete examples
- [API Reference](./api-reference.md) - Complete API documentation

## Common Patterns

### Multiple Move Operators

Combine different move strategies for better exploration:

```typescript
const moveGenerators = [
  new ChangeTimeSlot(),
  new ChangeWorker(),
  new SwapAssignments(),
];
```

The algorithm will adaptively select the most effective operators.

### Soft Constraints

Add preferences that are desirable but not required:

```typescript
class PreferMorningSlots implements Constraint<TaskAssignment> {
  name = 'Prefer Morning Slots';
  type = 'soft' as const;
  weight = 5; // Less important than other soft constraints

  evaluate(state: TaskAssignment): number {
    let morningCount = 0;
    for (const assignment of state.assignments) {
      if (assignment.timeSlot < 4) morningCount++;
    }

    // Return score 0-1 based on how many tasks are in morning slots
    return morningCount / state.assignments.length;
  }
}
```

### Custom State Cloning

For better performance, implement custom cloning:

```typescript
const config: SAConfig<TaskAssignment> = {
  // ... other config
  cloneState: (state) => ({
    assignments: state.assignments.map(a => ({ ...a })),
    // Clone other fields if needed
  }),
};
```

Avoid `JSON.parse(JSON.stringify(...))` for large states - it's slow!

## Tips for Success

1. **Start Simple**: Begin with one hard constraint and one move operator
2. **Test Constraints**: Verify your constraints work correctly on known inputs
3. **Add Gradually**: Add more constraints and moves incrementally
4. **Monitor Violations**: Use `solution.violations` to debug what's not working
5. **Tune Parameters**: Adjust temperature and cooling rate if not finding good solutions

Ready to build something? Check out the [Core Concepts](./core-concepts.md) guide!
