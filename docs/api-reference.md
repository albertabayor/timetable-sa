# API Reference

Complete API documentation for **timetable-sa** v2.3.0.

## Version History

**v2.3.0 - Real-Time Progress Tracking (Current)**
- `onProgress` callback for real-time optimization monitoring
- `ProgressStats` interface with comprehensive metrics
- Async `solve()` method to support async progress callbacks
- Error handling that prevents callback errors from breaking optimization

**v2.1.0 - Advanced Features**
- Tabu Search support for preventing cycling and escaping local minima
- Phase 1.5 Intensification for aggressive hard constraint violation resolution
- Enhanced operator statistics with success rate tracking

**v2.0.0 - Core Release**
- Multi-phase optimization (Phase 1: Hard, Phase 2: Soft)
- Adaptive operator selection
- Reheating mechanism
- Basic constraint and move generator interfaces

## Table of Contents

- [SimulatedAnnealing](#simulatedannealing)
- [Interfaces](#interfaces)
  - [Constraint](#constraint)
  - [MoveGenerator](#movegenerator)
  - [SAConfig](#saconfig)
  - [ProgressStats](#progressstats)
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
solve(): Promise<Solution<TState>>
```

**Returns:** `Promise<Solution<TState>>` - The best solution found

**Note:** Since v2.3.0, `solve()` returns a `Promise` to support async `onProgress` callbacks. Use `await` when calling.

**Example:**
```typescript
const solution = await solver.solve();

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

  // Optional: Tabu Search
  tabuSearchEnabled?: boolean;
  tabuTenure?: number;
  maxTabuListSize?: number;

  // Optional: Intensification
  enableIntensification?: boolean;
  intensificationIterations?: number;
  maxIntensificationAttempts?: number;

  // Optional: Logging
  logging?: LoggingConfig;

  // Optional: Progress Tracking
  onProgress?: OnProgressCallback<TState>;
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

#### Tabu Search Parameters (Optional)

**tabuSearchEnabled?: boolean**
- Enable Tabu Search to prevent cycling back to recently visited states
- When enabled, tracks recent moves and prevents revisiting same solutions
- Helps escape local minima by preventing the search from oscillating
- Typical values: `true` for complex problems, `false` for simpler ones
- Default: `false`

**tabuTenure?: number**
- Number of iterations a move stays in the tabu list
- Higher values = more diverse search but may miss good solutions
- Lower values = less diverse but faster convergence
- Typical values: 30 - 100
- Default: 50

**maxTabuListSize?: number**
- Maximum size of the tabu list for memory management
- When the list exceeds this size, oldest entries are removed
- Prevents unbounded memory usage during long runs
- Typical values: 500 - 5000
- Default: 1000

**Example: Tabu Search Configuration**
```typescript
const config: SAConfig<TimetableState> = {
  // ... core parameters
  
  // Enable tabu search
  tabuSearchEnabled: true,
  tabuTenure: 50,           // Remember moves for 50 iterations
  maxTabuListSize: 1000,    // Keep at most 1000 entries
};
```

#### Intensification Parameters (Optional)

**enableIntensification?: boolean**
- Enable Phase 1.5 Intensification mode
- When Phase 1 ends with remaining hard violations, aggressively targets them
- Runs dedicated iterations with focused operator selection to eliminate remaining violations
- Uses targeted operators (fix, swap, change) more frequently during intensification
- Typical values: `true` for problems with many constraints, `false` for simple problems
- Default: `true`

**intensificationIterations?: number**
- Maximum iterations for each intensification attempt
- Each intensification attempt runs this many iterations focusing on remaining violations
- Typical values: 1000 - 5000
- Default: 2000

**maxIntensificationAttempts?: number**
- Maximum number of intensification restart attempts
- Each attempt resets temperature and focuses on remaining violations
- Stops when either all hard violations eliminated or max attempts reached
- Typical values: 2 - 5
- Default: 3

**Example: Intensification Configuration**
```typescript
const config: SAConfig<TimetableState> = {
  // ... core parameters
  
  // Enable intensification for stubborn hard violations
  enableIntensification: true,
  intensificationIterations: 2000,      // 2000 iterations per attempt
  maxIntensificationAttempts: 3,         // Up to 3 attempts
};
```

**Intensification Behavior:**
1. **Triggered**: When Phase 1 ends with hard violations > 0
2. **Focused Selection**: Uses targeted operators (fix, swap, change) 70% of time
3. **Acceptance Logic**: Heavily favors reducing hard violations
4. **Reheating**: Reheats if stagnation detected (no improvement for 300 iterations)
5. **Stops Early**: When all hard violations eliminated or max attempts reached

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

#### Progress Tracking Parameters (Optional)

**onProgress?: OnProgressCallback<TState>**
- Callback function invoked at regular intervals during optimization
- Provides real-time progress updates for monitoring, UI updates, database logging, etc.
- Can be synchronous or asynchronous (returns `void` or `Promise<void>`)
- Called at iteration 0, every `logInterval` iterations, on phase transitions, and during reheating
- Errors in callback are caught and logged but don't break optimization
- See [ProgressStats](#progressstats) for the data structure

**Example: WebSocket Progress Updates**
```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

const config: SAConfig<MyState> = {
  // ... core parameters
  
  onProgress: async (iteration, cost, temp, state, stats) => {
    // Send to frontend via WebSocket
    socket.emit('optimization-progress', {
      iteration,
      progress: stats.progressPercent,
      cost,
      temperature: temp,
      hardViolations: stats.hardViolations,
      phase: stats.phase,
    });
    
    // Also save to database
    await db.optimizationProgress.create({
      data: { iteration, cost, stats },
    });
  },
};
```

**Example: CLI Progress Bar**
```typescript
import { SingleBar, Presets } from 'cli-progress';

const progressBar = new SingleBar({}, Presets.shades_classic);
progressBar.start(100, 0);

const config: SAConfig<MyState> = {
  // ... core parameters
  logInterval: 100,
  
  onProgress: (iteration, cost, temp, state, stats) => {
    progressBar.update(stats.progressPercent, {
      cost: cost.toFixed(2),
      temp: temp.toFixed(0),
    });
  },
};

const solver = new SimulatedAnnealing(state, constraints, moves, config);
const solution = await solver.solve();
progressBar.stop();
```

---

### ProgressStats

Comprehensive statistics provided to the `onProgress` callback.

```typescript
interface ProgressStats {
  iteration: number;
  currentCost: number;
  bestCost: number;
  temperature: number;
  hardViolations: number;
  softViolations: number;
  tabuHits: number;
  phase: 'phase1' | 'phase15' | 'phase2' | 'initial';
  reheatingCount: number;
  acceptedMoves: number;
  rejectedMoves: number;
  stagnationCount: number;
  bestCostIteration: number;
  progressPercent: number;
  timestamp: number;
}
```

#### Properties

**iteration: number**
- Current iteration number
- Range: 0 to `maxIterations`

**currentCost: number**
- Current cost/fitness value
- Lower is better

**bestCost: number**
- Best cost found so far
- Updated whenever a better solution is discovered

**temperature: number**
- Current temperature in the annealing process
- Decreases over time (with occasional reheating)

**hardViolations: number**
- Number of hard constraint violations in current state
- Should reach 0 for a feasible solution

**softViolations: number**
- Number of soft constraint violations in current state
- Lower is better but not required to be 0

**tabuHits: number**
- Number of moves that were skipped due to Tabu Search
- Only meaningful when `tabuSearchEnabled: true`

**phase: 'phase1' | 'phase15' | 'phase2' | 'initial'**
- Current optimization phase:
  - `'initial'`: Before optimization starts
  - `'phase1'`: Eliminating hard constraint violations
  - `'phase15'`: Intensification phase (optional)
  - `'phase2'`: Optimizing soft constraints

**reheatingCount: number**
- Number of reheating events that have occurred
- 0 if reheating disabled or not triggered

**acceptedMoves: number**
- Total number of moves accepted so far

**rejectedMoves: number**
- Total number of moves rejected so far

**stagnationCount: number**
- Iterations without improvement
- Resets when a better solution is found

**bestCostIteration: number**
- Iteration number where the best cost was found

**progressPercent: number**
- Progress percentage (0-100)
- Calculated as `(iteration / maxIterations) * 100`

**timestamp: number**
- Unix timestamp when this progress was recorded (milliseconds)
- Use `Date.now()` format

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

  // Tabu Search
  tabuSearchEnabled: true,
  tabuTenure: 50,
  maxTabuListSize: 1000,

  // Intensification
  enableIntensification: true,
  intensificationIterations: 2000,
  maxIntensificationAttempts: 3,

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
