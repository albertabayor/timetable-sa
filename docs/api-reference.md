# API Reference

Complete API documentation for **timetable-sa** v2.0.

## Table of Contents

- [SimulatedAnnealing](#simulatedannealing)
- [Interfaces](#interfaces)
  - [Constraint](#constraint)
  - [MoveGenerator](#movegenerator)
  - [SAConfig](#saconfig)
- [Types](#types)
  - [Solution](#solution)
  - [Violation](#violation)
  - [OperatorStats](#operatorstats)

## SimulatedAnnealing

The main class that implements the Simulated Annealing algorithm.

### Constructor

```typescript
new SimulatedAnnealing<TState>(
  initialState: TState,
  constraints: Constraint<TState>[],
  moveGenerators: MoveGenerator<TState>[],
  config: SAConfig<TState>
)
```

**Type Parameters:**
- `TState` - The type of your problem state

**Parameters:**
- `initialState: TState` - Initial candidate solution (can have violations)
- `constraints: Constraint<TState>[]` - Array of hard and soft constraints
- `moveGenerators: MoveGenerator<TState>[]` - Array of move operators
- `config: SAConfig<TState>` - Algorithm configuration

**Example:**
```typescript
const solver = new SimulatedAnnealing(
  initialState,
  [new NoRoomConflict(), new PreferMorningSlots()],
  [new ChangeTimeSlot(), new SwapClasses()],
  {
    initialTemperature: 1000,
    minTemperature: 0.01,
    coolingRate: 0.995,
    maxIterations: 50000,
    hardConstraintWeight: 10000,
    cloneState: (state) => ({ ...state, schedule: [...state.schedule] }),
  }
);
```

### Methods

#### solve()

Run the optimization algorithm and return the best solution found.

```typescript
solve(): Solution<TState>
```

**Returns:** `Solution<TState>` - The best solution found

**Example:**
```typescript
const solution = solver.solve();

console.log('Fitness:', solution.fitness);
console.log('Hard violations:', solution.hardViolations);
console.log('Soft violations:', solution.softViolations);
console.log('Iterations:', solution.iterations);
```

#### getStats()

Get current operator statistics (updated during and after solving).

```typescript
getStats(): OperatorStats
```

**Returns:** `OperatorStats` - Performance statistics for each move operator

**Example:**
```typescript
const stats = solver.getStats();

for (const [operatorName, operatorStats] of Object.entries(stats)) {
  console.log(`${operatorName}:`);
  console.log(`  Attempts: ${operatorStats.attempts}`);
  console.log(`  Success Rate: ${(operatorStats.successRate * 100).toFixed(2)}%`);
}
```

## Interfaces

### Constraint

Interface for defining constraints that evaluate states.

```typescript
interface Constraint<TState> {
  name: string;
  type: 'hard' | 'soft';
  weight?: number;
  evaluate(state: TState): number;
  describe?(state: TState): string | undefined;
  getViolations?(state: TState): string[];
}
```

#### Properties

**name: string**
- Unique identifier for the constraint
- Used in logging and violation reports
- Example: `"No Room Conflict"`, `"Prefer Morning Slots"`

**type: 'hard' | 'soft'**
- `'hard'` - Must be satisfied (heavily penalized if violated)
- `'soft'` - Preferred but not required (lightly penalized if violated)

**weight?: number** (optional)
- Importance weight for soft constraints
- Only applies to soft constraints (ignored for hard)
- Default: `10`
- Higher values = more important
- Example: `weight: 50` for high priority, `weight: 1` for low priority

#### Methods

**evaluate(state: TState): number**

Evaluate how well the constraint is satisfied.

**Parameters:**
- `state: TState` - State to evaluate

**Returns:** `number` - Satisfaction score
- `1.0` = fully satisfied (no violation)
- `0.0` = completely violated
- Values between 0 and 1 for partial satisfaction (soft constraints)

**Example:**
```typescript
evaluate(state: TimetableState): number {
  const violations = this.countViolations(state);
  return violations === 0 ? 1 : 0; // Binary for hard constraints
}

// Or for soft constraints (gradual)
evaluate(state: TimetableState): number {
  const qualityScore = this.calculateQuality(state);
  return Math.max(0, Math.min(1, qualityScore)); // Clamp to [0, 1]
}
```

**describe?(state: TState): string | undefined** (optional)

Provide human-readable description of violations.

**Parameters:**
- `state: TState` - State to describe

**Returns:** `string | undefined`
- Description of violation(s) if constraint is violated
- `undefined` if constraint is satisfied

**Example:**
```typescript
describe(state: TimetableState): string | undefined {
  const conflict = this.findFirstConflict(state);
  if (conflict) {
    return `Room ${conflict.roomId} has overlapping classes at ${conflict.time}`;
  }
  return undefined;
}
```

**getViolations?(state: TState): string[]** (optional)

Get detailed list of ALL violations (preferred over `describe()`).

**Parameters:**
- `state: TState` - State to analyze

**Returns:** `string[]`
- Array of violation descriptions
- Empty array if constraint is satisfied
- Used for comprehensive violation reporting

**Example:**
```typescript
getViolations(state: TimetableState): string[] {
  const violations: string[] = [];

  for (const conflict of this.findAllConflicts(state)) {
    violations.push(
      `Room ${conflict.roomId} on ${conflict.day} at ${conflict.time}: ` +
      `${conflict.class1} conflicts with ${conflict.class2}`
    );
  }

  return violations;
}
```

### MoveGenerator

Interface for defining move operators that generate neighbor states.

```typescript
interface MoveGenerator<TState> {
  name: string;
  canApply(state: TState): boolean;
  generate(state: TState, temperature: number): TState;
}
```

#### Properties

**name: string**
- Unique identifier for the move operator
- Used in logging and statistics
- Example: `"Change Time Slot"`, `"Swap Classes"`

#### Methods

**canApply(state: TState): boolean**

Check if this move can be applied to the current state.

**Parameters:**
- `state: TState` - Current state

**Returns:** `boolean`
- `true` if move is applicable
- `false` if move should be skipped

**Example:**
```typescript
canApply(state: TimetableState): boolean {
  // Can only swap if there are at least 2 classes
  return state.schedule.length >= 2;
}
```

**generate(state: TState, temperature: number): TState**

Generate a new neighbor state by applying the move.

**IMPORTANT:** Must NOT modify the input state - create a new state instead.

**Parameters:**
- `state: TState` - Current state (DO NOT MODIFY)
- `temperature: number` - Current temperature (can be used for adaptive moves)

**Returns:** `TState` - New neighbor state with modifications applied

**Example:**
```typescript
generate(state: TimetableState, temperature: number): TimetableState {
  // Clone state (don't modify input)
  const newState = {
    ...state,
    schedule: state.schedule.map(e => ({ ...e })),
  };

  // Apply modification
  const randomIndex = Math.floor(Math.random() * newState.schedule.length);
  newState.schedule[randomIndex].timeSlot = this.getRandomTimeSlot();

  return newState;
}

// Temperature-dependent move
generate(state: TimetableState, temperature: number): TimetableState {
  const newState = cloneState(state);

  // High temp: large changes, Low temp: small refinements
  const numChanges = temperature > 100 ? 3 : 1;

  for (let i = 0; i < numChanges; i++) {
    const randomIndex = Math.floor(Math.random() * newState.schedule.length);
    newState.schedule[randomIndex].timeSlot = this.getRandomTimeSlot();
  }

  return newState;
}
```

### SAConfig

Configuration interface for the Simulated Annealing algorithm.

```typescript
interface SAConfig<TState> {
  // Core parameters
  initialTemperature: number;
  minTemperature: number;
  coolingRate: number;
  maxIterations: number;
  hardConstraintWeight: number;
  cloneState: (state: TState) => TState;

  // Optional: Reheating
  reheatingThreshold?: number;
  reheatingFactor?: number;
  maxReheats?: number;

  // Optional: Logging
  logging?: LoggingConfig;
}

interface LoggingConfig {
  enabled?: boolean;
  level?: 'debug' | 'info' | 'warn' | 'error' | 'none';
  logInterval?: number;
  output?: 'console' | 'file' | 'both';
  filePath?: string;
}
```

#### Core Parameters

**initialTemperature: number**
- Starting temperature for the annealing process
- Higher = more initial exploration
- Typical values: 100 - 10,000
- Recommended: 1000

**minTemperature: number**
- Stopping criterion (algorithm stops when T < minTemperature)
- Lower = more iterations
- Typical values: 0.001 - 1
- Recommended: 0.01

**coolingRate: number**
- Temperature decay factor: `T_new = T_old * coolingRate`
- Must be between 0 and 1 (exclusive)
- Higher (closer to 1) = slower cooling = more iterations
- Typical values: 0.95 - 0.999
- Recommended: 0.995

**maxIterations: number**
- Maximum iterations (hard limit)
- Algorithm stops after this many iterations even if T > minTemperature
- Typical values: 10,000 - 200,000
- Recommended: 50,000

**hardConstraintWeight: number**
- Penalty multiplier for hard constraint violations
- Must be much larger than soft constraint weights
- Typical values: 1,000 - 100,000
- Recommended: 10,000 (100x typical soft weight)

**cloneState: (state: TState) => TState**
- Function to create a deep copy of the state
- MUST create independent copy (modifications to clone shouldn't affect original)
- Avoid `JSON.parse(JSON.stringify(...))` for large states (slow)

Example:
```typescript
cloneState: (state) => ({
  ...state,
  schedule: state.schedule.map(entry => ({ ...entry })),
})
```

#### Reheating Parameters (Optional)

**reheatingThreshold?: number**
- Number of iterations without improvement before triggering reheat
- Typical values: 1000 - 5000
- Default: `undefined` (disabled)

**reheatingFactor?: number**
- Temperature multiplication factor during reheat: `T = T * reheatingFactor`
- Typical values: 1.5 - 3.0
- Default: 2.0

**maxReheats?: number**
- Maximum number of reheating events allowed
- Prevents infinite reheating loops
- Typical values: 2 - 5
- Default: 3

#### Logging Parameters (Optional)

**logging.enabled?: boolean**
- Enable or disable logging
- Default: `true`

**logging.level?: 'debug' | 'info' | 'warn' | 'error' | 'none'**
- Logging verbosity level
- `'debug'` - Very detailed (every improvement)
- `'info'` - Progress updates (recommended)
- `'warn'` - Warnings only
- `'error'` - Errors only
- `'none'` - Silent
- Default: `'info'`

**logging.logInterval?: number**
- Log progress every N iterations
- Default: 1000

**logging.output?: 'console' | 'file' | 'both'**
- Where to output logs
- Default: `'console'`

**logging.filePath?: string**
- File path for file-based logging (when output is `'file'` or `'both'`)
- Default: `'./sa-optimization.log'`

## Types

### Solution

Result type returned by `solve()`.

```typescript
interface Solution<TState> {
  state: TState;
  fitness: number;
  hardViolations: number;
  softViolations: number;
  iterations: number;
  reheats: number;
  finalTemperature: number;
  violations: Violation[];
  operatorStats: OperatorStats;
}
```

#### Properties

**state: TState**
- Best state found during optimization
- This is your solution

**fitness: number**
- Final fitness score (lower is better)
- Calculation: `(hardViolations * hardConstraintWeight) + softPenalty`
- Fitness of 0 = all constraints satisfied

**hardViolations: number**
- Number of hard constraint violations in final solution
- Ideally should be 0

**softViolations: number**
- Number of soft constraint violations in final solution
- Constraints with satisfaction < 1.0

**iterations: number**
- Total number of iterations performed
- Useful for performance analysis

**reheats: number**
- Number of reheating events that occurred
- 0 if reheating disabled or not triggered

**finalTemperature: number**
- Temperature when optimization stopped
- Useful for understanding convergence

**violations: Violation[]**
- Detailed list of all constraint violations
- See [Violation](#violation)

**operatorStats: OperatorStats**
- Performance statistics for each move operator
- See [OperatorStats](#operatorstats)

### Violation

Represents a single constraint violation.

```typescript
interface Violation {
  constraintName: string;
  constraintType: 'hard' | 'soft';
  score: number;
  description?: string;
}
```

#### Properties

**constraintName: string**
- Name of the violated constraint
- Matches `constraint.name`

**constraintType: 'hard' | 'soft'**
- Type of constraint violated

**score: number**
- Satisfaction score (0.0 to 1.0)
- Lower = more severe violation

**description?: string**
- Human-readable description of the violation
- Provided by `constraint.describe()` or `constraint.getViolations()`

### OperatorStats

Statistics about move operator performance.

```typescript
interface OperatorStats {
  [operatorName: string]: {
    attempts: number;
    improvements: number;
    accepted: number;
    successRate: number;
  };
}
```

#### Properties

For each operator (keyed by `moveGenerator.name`):

**attempts: number**
- Number of times this operator was attempted

**improvements: number**
- Number of times this operator led to fitness improvement

**accepted: number**
- Number of times this operator's move was accepted
- Includes worse moves accepted due to SA probability

**successRate: number**
- Ratio of improvements to attempts: `improvements / attempts`
- Used for adaptive operator selection

## Usage Examples

### Basic Usage

```typescript
import { SimulatedAnnealing } from 'timetable-sa';
import type { Constraint, MoveGenerator, SAConfig } from 'timetable-sa';

// Define state
interface MyState {
  items: Item[];
}

// Create solver
const solver = new SimulatedAnnealing<MyState>(
  initialState,
  constraints,
  moveGenerators,
  config
);

// Solve
const solution = solver.solve();

// Check results
if (solution.hardViolations === 0) {
  console.log('Valid solution found!');
} else {
  console.log('No valid solution found');
  console.log('Violations:', solution.violations);
}
```

### With All Features

```typescript
const config: SAConfig<TimetableState> = {
  // Core parameters
  initialTemperature: 5000,
  minTemperature: 0.001,
  coolingRate: 0.998,
  maxIterations: 100000,
  hardConstraintWeight: 10000,
  cloneState: (state) => ({
    ...state,
    schedule: state.schedule.map(e => ({ ...e })),
  }),

  // Reheating
  reheatingThreshold: 2000,
  reheatingFactor: 2.5,
  maxReheats: 5,

  // Logging
  logging: {
    enabled: true,
    level: 'info',
    logInterval: 1000,
    output: 'console',
  },
};

const solver = new SimulatedAnnealing(
  initialState,
  [
    new NoRoomConflict(),
    new NoLecturerConflict(),
    new PreferMorningSlots({ weight: 50 }),
    new MinimizeGaps({ weight: 20 }),
  ],
  [
    new ChangeTimeSlot(),
    new ChangeRoom(),
    new SwapClasses(),
    new FixConflict(),
  ],
  config
);

const solution = solver.solve();

// Comprehensive result analysis
console.log('=== SOLUTION ===');
console.log('Fitness:', solution.fitness);
console.log('Hard violations:', solution.hardViolations);
console.log('Soft violations:', solution.softViolations);
console.log('Iterations:', solution.iterations);
console.log('Reheats:', solution.reheats);

// Operator statistics
console.log('\n=== OPERATOR PERFORMANCE ===');
for (const [name, stats] of Object.entries(solution.operatorStats)) {
  console.log(`${name}:`);
  console.log(`  Success Rate: ${(stats.successRate * 100).toFixed(2)}%`);
  console.log(`  Attempts: ${stats.attempts}`);
}

// Violations
if (solution.violations.length > 0) {
  console.log('\n=== VIOLATIONS ===');
  for (const violation of solution.violations) {
    console.log(`${violation.constraintName} (${violation.constraintType}):`);
    console.log(`  Score: ${violation.score.toFixed(2)}`);
    if (violation.description) {
      console.log(`  ${violation.description}`);
    }
  }
}
```

## Next Steps

- [Getting Started](./getting-started.md) - Quick start guide
- [Core Concepts](./core-concepts.md) - Understand the fundamentals
- [Examples](./examples.md) - Complete working examples
