# Configuration Guide

This guide helps you configure the Simulated Annealing algorithm for optimal results.

## Table of Contents

- [Basic Configuration](#basic-configuration)
- [Temperature Parameters](#temperature-parameters)
- [Iteration Control](#iteration-control)
- [Constraint Weights](#constraint-weights)
- [State Cloning](#state-cloning)
- [Reheating](#reheating)
- [Tabu Search](#tabu-search)
- [Intensification](#intensification)
- [Logging](#logging)
- [Progress Tracking](#progress-tracking)
- [Operator Selection](#operator-selection)
- [Tuning Guide](#tuning-guide)

## Basic Configuration

The minimum configuration requires these parameters:

```typescript
const config: SAConfig<MyState> = {
  initialTemperature: 1000,      // Starting temperature
  minTemperature: 0.01,          // Stopping temperature
  coolingRate: 0.995,            // Temperature decay rate
  maxIterations: 50000,          // Maximum iterations
  hardConstraintWeight: 10000,   // Penalty for hard violations
  cloneState: (state) => /* clone function */,
};
```

## Temperature Parameters

### Initial Temperature

**What it does:** Controls how much exploration happens at the start.

**Typical values:** 100 - 10,000

**Guidelines:**
- **Too high (>10000)**: Wastes iterations on random exploration
- **Too low (<50)**: Gets stuck in local minima quickly
- **Recommended**: Start with 1000 and adjust based on problem size

```typescript
const config = {
  // Small problems (< 100 variables)
  initialTemperature: 100,

  // Medium problems (100 - 1000 variables)
  initialTemperature: 1000,

  // Large problems (> 1000 variables)
  initialTemperature: 5000,
};
```

### Minimum Temperature

**What it does:** Stopping criterion - algorithm stops when temperature drops below this.

**Typical values:** 0.001 - 1

**Guidelines:**
- Lower values = more iterations = potentially better solutions
- Higher values = faster convergence = potentially worse solutions
- **Recommended**: 0.01 for most problems

```typescript
const config = {
  // Fast results
  minTemperature: 0.1,

  // Balanced (recommended)
  minTemperature: 0.01,

  // High quality (slow)
  minTemperature: 0.001,
};
```

### Cooling Rate

**What it does:** How fast temperature decreases. `T_new = T_old * coolingRate`

**Valid range:** 0 < coolingRate < 1

**Typical values:** 0.95 - 0.999

**Guidelines:**
- **Too low (<0.9)**: Cools too fast, may miss optimal solution
- **Too high (>0.999)**: Very slow, may waste time
- **Formula for iterations**: `iterations ≈ log(T_min/T_initial) / log(coolingRate)`

```typescript
// Calculate cooling rate for target iterations
function calculateCoolingRate(initialTemp: number, minTemp: number, targetIterations: number): number {
  return Math.exp(Math.log(minTemp / initialTemp) / targetIterations);
}

// Example: 50,000 iterations from T=1000 to T=0.01
const coolingRate = calculateCoolingRate(1000, 0.01, 50000);
console.log(coolingRate); // ≈ 0.995
```

**Recommended values:**
```typescript
const config = {
  // Fast cooling (10,000 - 20,000 iterations)
  coolingRate: 0.99,

  // Medium cooling (30,000 - 50,000 iterations)
  coolingRate: 0.995,

  // Slow cooling (100,000+ iterations)
  coolingRate: 0.998,
};
```

## Iteration Control

### Max Iterations

**What it does:** Hard limit on iterations (even if temperature hasn't reached minimum).

**Typical values:** 10,000 - 100,000

**Guidelines:**
- Set higher than expected iterations from cooling rate
- Acts as safety net to prevent infinite loops
- Monitor actual iterations used: if hitting max iterations, increase limit or adjust cooling

```typescript
const config = {
  // Quick testing
  maxIterations: 10000,

  // Production (small problems)
  maxIterations: 50000,

  // Production (large problems)
  maxIterations: 100000,
};
```

## Constraint Weights

### Hard Constraint Weight

**What it does:** Penalty multiplier for hard constraint violations.

**Typical values:** 1,000 - 100,000

**Guidelines:**
- Must be MUCH larger than soft constraint weights
- Ensures hard constraints are satisfied before optimizing soft constraints
- **Formula**: `hardConstraintWeight >> max(softConstraintWeight) * 10`

```typescript
const config = {
  // If max soft weight is 10
  hardConstraintWeight: 1000,  // 100x larger

  // If max soft weight is 100
  hardConstraintWeight: 10000, // 100x larger
};
```

### Soft Constraint Weights

Set individual weights for soft constraints based on importance:

```typescript
class HighPrioritySoft implements Constraint<MyState> {
  name = 'High Priority';
  type = 'soft' as const;
  weight = 50; // Very important

  evaluate(state: MyState): number { /* ... */ }
}

class MediumPrioritySoft implements Constraint<MyState> {
  name = 'Medium Priority';
  type = 'soft' as const;
  weight = 10; // Default importance

  evaluate(state: MyState): number { /* ... */ }
}

class LowPrioritySoft implements Constraint<MyState> {
  name = 'Low Priority';
  type = 'soft' as const;
  weight = 1; // Nice to have

  evaluate(state: MyState): number { /* ... */ }
}
```

**Guidelines:**
- Use relative weights (e.g., 1, 5, 10, 50, 100)
- Default weight is 10
- Higher weight = more important
- Keep weights reasonable (< 1000 to avoid numerical issues)

## State Cloning

The `cloneState` function must create a **deep copy** of your state.

### Option 1: JSON-based (Simple but Slow)

```typescript
const config: SAConfig<MyState> = {
  // ... other config
  cloneState: (state) => JSON.parse(JSON.stringify(state)),
};
```

**Pros:**
- Simple
- Works for most structures

**Cons:**
- SLOW for large states
- Loses functions, Dates, Maps, Sets

### Option 2: Manual Clone (Fast)

```typescript
const config: SAConfig<TimetableState> = {
  // ... other config
  cloneState: (state) => ({
    schedule: state.schedule.map(entry => ({ ...entry })),
    rooms: state.rooms.map(room => ({ ...room })),
    lecturers: state.lecturers.map(lecturer => ({ ...lecturer })),
  }),
};
```

**Pros:**
- Fast (3-10x faster than JSON)
- Handles complex types

**Cons:**
- More code
- Must update if state structure changes

### Option 3: Shallow Clone (Fastest, Careful!)

```typescript
// Only if state has ONE array and no nested objects
const config: SAConfig<SimpleState> = {
  cloneState: (state) => ({
    ...state,
    items: [...state.items], // Clone array
  }),
};
```

**Warning:** Only use if your array items are primitives or don't need deep cloning!

### Performance Comparison

```typescript
// Benchmark: Clone state with 1000 schedule entries
// JSON:          ~50ms
// Manual:        ~5ms
// Shallow:       ~1ms

// Over 50,000 iterations:
// JSON:          2500s (42 minutes!)
// Manual:        250s (4 minutes)
// Shallow:       50s (1 minute)
```

**Recommendation:** Use manual cloning for production use!

## Tabu Search

Tabu Search prevents the algorithm from cycling back to recently visited states.

### Enable Tabu Search

```typescript
const config: SAConfig<MyState> = {
  // ... other config
  tabuSearchEnabled: true,    // Enable tabu search
  tabuTenure: 50,              // Keep states tabu for 50 iterations
  maxTabuListSize: 1000,       // Maximum 1000 tabu entries
};
```

### Parameters

**tabuSearchEnabled**
- Enable/disable Tabu Search
- Default: `false`
- Recommended for complex problems with many local minima

**tabuTenure**
- Number of iterations a state stays in the tabu list
- Higher: more diverse search, less cycling
- Lower: faster convergence, may cycle
- Default: 50
- Typical range: 30 - 100

**maxTabuListSize**
- Maximum number of tabu entries stored
- Prevents unbounded memory usage
- Default: 1000
- Typical range: 500 - 5000

### When to Use Tabu Search

**Enable when:**
- Seeing oscillation in fitness values
- Getting stuck in local minima repeatedly
- Problem has many similar states
- Long optimization runs (50,000+ iterations)

**Disable when:**
- Problem is simple/convex
- Quick testing or prototyping
- Memory is very limited
- Problem has extremely large state space

### Configuration Examples

```typescript
// Conservative tabu search (minimal cycling prevention)
{
  tabuSearchEnabled: true,
  tabuTenure: 30,              // Remember for 30 iterations
  maxTabuListSize: 500,        // Keep up to 500 entries
}
```

### Custom State Signatures

By default, the algorithm uses a built-in signature generator that works well for timetabling problems. For non-timetabling problems or custom state structures, you can provide your own signature function.

**Why custom signatures matter:**
- Tabu Search needs to uniquely identify states
- Default signature may not work correctly for your domain
- Custom signatures can improve performance and accuracy

```typescript
// For timetabling problems (uses schedule property)
const config: SAConfig<TimetableState> = {
  // ... other config
  tabuSearchEnabled: true,
  // Uses default: extracts classId, day, time, room from schedule array
};

// For custom problems (provide your own signature)
const config: SAConfig<JobSchedulingState> = {
  // ... other config
  tabuSearchEnabled: true,
  getStateSignature: (state) => {
    // Create unique signature based on job assignments
    return state.jobs
      .map(job => `${job.id}:${job.machine}:${job.startTime}`)
      .sort()
      .join('|');
  },
};

// For simple states (JSON serialization)
const config: SAConfig<SimpleState> = {
  // ... other config
  tabuSearchEnabled: true,
  getStateSignature: (state) => JSON.stringify(state),
};
```

**Signature Requirements:**
- Must return a **string**
- Same state must produce **same signature**
- Different states should produce **different signatures**
- Should be **deterministic** (no random values)
- Should be **fast** to compute (called every iteration)

**Performance Tips:**
- Avoid expensive operations in signature function
- Sort arrays for consistency
- Use simple string concatenation
- For large states, hash only the essential properties

```typescript
// Good: Fast and deterministic
getStateSignature: (state) => {
  return state.items
    .map(item => `${item.id}:${item.value}`)
    .sort()
    .join(',');
}

// Avoid: Slow and non-deterministic
getStateSignature: (state) => {
  // Don't use JSON.stringify for large objects
  // Don't include timestamps or random values
  return JSON.stringify({ ...state, timestamp: Date.now() });
}
```

## Intensification

Intensification is an aggressive phase (Phase 1.5) that targets remaining hard violations when Phase 1 doesn't achieve zero violations.

### Enable Intensification

```typescript
const config: SAConfig<MyState> = {
  // ... other config
  enableIntensification: true,        // Enable intensification (default)
  intensificationIterations: 2000,    // 2000 iterations per attempt
  maxIntensificationAttempts: 3,       // Up to 3 restart attempts
};
```

### Parameters

**enableIntensification**
- Enable/disable Phase 1.5 intensification
- Default: `true`
- Recommended for problems with complex, conflicting constraints

**intensificationIterations**
- Number of iterations per intensification attempt
- Higher: more thorough search of remaining violations
- Lower: faster but may miss solutions
- Default: 2000
- Typical range: 1000 - 5000

**maxIntensificationAttempts**
- Maximum number of restart attempts
- Each attempt resets temperature and focuses on remaining violations
- Default: 3
- Typical range: 2 - 5

**intensificationStagnationLimit** (v2.2.0+)
- Number of iterations without improvement before triggering reheating
- Reheating increases temperature to escape local minima
- Default: 300
- Typical range: 100 - 500

```typescript
const config: SAConfig<MyState> = {
  // ... other config
  enableIntensification: true,
  intensificationIterations: 2000,
  maxIntensificationAttempts: 3,
  intensificationStagnationLimit: 300,  // Reheat after 300 iterations without improvement
};
```

**When to adjust:**
- **Lower (100-200)**: More aggressive reheating, faster exploration
- **Higher (400-500)**: More patient search, better for complex constraint landscapes

### How Intensification Works

1. **Trigger**: Phase 1 ends with `hardViolations > 0`
2. **Focused Selection**: Uses targeted operators (fix, swap, change) 70% of time
3. **Aggressive Acceptance**: Heavily favors moves reducing hard violations
4. **Multiple Attempts**: Up to `maxIntensificationAttempts` restarts
5. **Early Exit**: Stops when all hard violations eliminated

### When to Use Intensification

**Enable (default) when:**
- Phase 1 frequently ends with violations
- Problem has many complex constraints
- Hard constraints are difficult to satisfy
- You need guaranteed feasibility

**Disable when:**
- Phase 1 consistently reaches zero violations
- Problem is simple
- Looking for quick approximate solutions
- Soft constraints are more important

### Configuration Examples

```typescript
// Standard intensification (default)
{
  enableIntensification: true,
  intensificationIterations: 2000,    // 2000 iterations per attempt
  maxIntensificationAttempts: 3,       // Up to 3 attempts
}

// Aggressive intensification (for very difficult problems)
{
  enableIntensification: true,
  intensificationIterations: 5000,    // 5000 iterations per attempt
  maxIntensificationAttempts: 5,       // Up to 5 attempts
}

// Quick intensification (for faster runs)
{
  enableIntensification: true,
  intensificationIterations: 1000,    // 1000 iterations per attempt
  maxIntensificationAttempts: 2,       // Up to 2 attempts
}

// Disabled (for simple problems)
{
  enableIntensification: false,       // Skip Phase 1.5
}
```

### Monitoring Intensification

```typescript
const config: SAConfig<MyState> = {
  // ... other config
  logging: {
    level: 'debug',
    logInterval: 500,
  },
};

// Output shows intensification progress:
// [INFO] Phase 1 complete: Hard violations = 3
// [INFO] Phase 1.5: Intensification - targeting remaining hard violations
// [INFO] [Intensification] Attempt 1/3
// [DEBUG] [Intensification] New best: Hard violations = 2
// [DEBUG] [Intensification] New best: Hard violations = 0
// [INFO] [Intensification] SUCCESS! All hard violations eliminated in attempt 1
```

## Reheating

Reheating helps escape local minima by temporarily increasing temperature.

### Enable Reheating

```typescript
const config: SAConfig<MyState> = {
  // ... basic config
  reheatingThreshold: 2000,    // Reheat after 2000 iterations without improvement
  reheatingFactor: 2.0,        // Multiply temperature by 2
  maxReheats: 3,               // Maximum 3 reheating events
};
```

### Parameters

**reheatingThreshold**
- Iterations without improvement before reheating
- Too low: Reheats too often (wastes time)
- Too high: May not escape local minima
- **Recommended**: 1000 - 5000

**reheatingFactor**
- Temperature multiplier during reheat
- Too low: Not enough to escape
- Too high: Loses progress
- **Recommended**: 1.5 - 3.0

**maxReheats**
- Maximum reheating events
- Prevents infinite loops
- **Recommended**: 3 - 5

### When to Use Reheating

**Use reheating when:**
- Getting stuck in local minima
- Hard constraints partially satisfied but can't reach 0
- Solution quality plateaus early

**Skip reheating when:**
- Finding good solutions quickly
- Limited computation time
- Problem has smooth fitness landscape

### Example

```typescript
// Problem: Often gets stuck with 1-2 hard violations

const config: SAConfig<MyState> = {
  initialTemperature: 1000,
  minTemperature: 0.01,
  coolingRate: 0.995,
  maxIterations: 50000,
  hardConstraintWeight: 10000,
  cloneState: manualClone,

  // Enable reheating
  reheatingThreshold: 2000,
  reheatingFactor: 2.5,
  maxReheats: 5,
};
```

## Logging

Control what information is printed during optimization.

### Basic Logging

```typescript
const config: SAConfig<MyState> = {
  // ... other config
  logging: {
    enabled: true,
    level: 'info',
    logInterval: 1000,
  },
};
```

### Log Levels

```typescript
// Debug: Very detailed (every best solution found)
logging: { level: 'debug' }

// Info: Progress updates (recommended)
logging: { level: 'info' }

// Warn: Only warnings
logging: { level: 'warn' }

// Error: Only errors
logging: { level: 'error' }

// None: Silent
logging: { level: 'none' }
```

### Log Interval

```typescript
// Log every 100 iterations (verbose)
logging: { logInterval: 100 }

// Log every 1000 iterations (default, recommended)
logging: { logInterval: 1000 }

// Log every 5000 iterations (quiet)
logging: { logInterval: 5000 }
```

### Disable Logging

```typescript
logging: { enabled: false }
```

## Progress Tracking

Monitor optimization progress in real-time using the `onProgress` callback. This is useful for:

- **Web Applications**: Update progress bars in the frontend
- **APIs**: Send progress updates to clients via WebSocket
- **Monitoring**: Log progress to databases or metrics systems
- **Debugging**: Track optimization behavior

### Basic Usage

```typescript
const config: SAConfig<MyState> = {
  // ... other config
  logInterval: 500,  // Callback frequency (iterations)
  
  onProgress: (iteration, cost, temp, state, stats) => {
    console.log(`[${stats.phase}] Iter ${iteration}: Cost=${cost.toFixed(2)}`);
  },
};

const solver = new SimulatedAnnealing(state, constraints, moves, config);
const solution = await solver.solve();
```

### Progress Stats

The `stats` parameter provides comprehensive optimization metrics:

```typescript
onProgress: (iteration, cost, temp, state, stats) => {
  console.log({
    iteration: stats.iteration,
    progress: `${stats.progressPercent.toFixed(1)}%`,
    phase: stats.phase,
    cost: stats.currentCost,
    bestCost: stats.bestCost,
    temperature: stats.temperature,
    hardViolations: stats.hardViolations,
    softViolations: stats.softViolations,
    tabuHits: stats.tabuHits,
    reheatingCount: stats.reheatingCount,
    acceptedMoves: stats.acceptedMoves,
    rejectedMoves: stats.rejectedMoves,
    stagnationCount: stats.stagnationCount,
    timestamp: new Date(stats.timestamp).toISOString(),
  });
}
```

### Async Callbacks

The callback can be async, perfect for database writes or API calls:

```typescript
onProgress: async (iteration, cost, temp, state, stats) => {
  // Save to database
  await db.optimizationProgress.create({
    data: {
      runId: 'run-001',
      iteration,
      cost,
      temperature: temp,
      hardViolations: stats.hardViolations,
      progress: stats.progressPercent,
    },
  });
  
  // Send to monitoring service
  await metrics.send('optimization.progress', {
    iteration,
    cost,
    violations: stats.hardViolations,
  });
}
```

### WebSocket Example

Update frontend in real-time:

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');
const optimizationId = 'opt-123';

const config: SAConfig<MyState> = {
  maxIterations: 20000,
  logInterval: 500,
  
  onProgress: (iteration, cost, temp, state, stats) => {
    socket.emit('optimization-progress', {
      optimizationId,
      data: {
        iteration,
        progress: stats.progressPercent,
        currentCost: cost,
        bestCost: stats.bestCost,
        temperature: temp,
        hardViolations: stats.hardViolations,
        softViolations: stats.softViolations,
        tabuHits: stats.tabuHits,
        phase: stats.phase,
      },
    });
  },
};
```

### CLI Progress Bar

```typescript
import { SingleBar, Presets } from 'cli-progress';

const progressBar = new SingleBar({
  format: 'Progress |{bar}| {percentage}% | Cost: {cost} | Temp: {temp}',
}, Presets.shades_classic);

progressBar.start(100, 0);

const config: SAConfig<MyState> = {
  maxIterations: 10000,
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
console.log(`Optimization complete! Best cost: ${solution.fitness}`);
```

### When Callback is Triggered

The `onProgress` callback is called at:

1. **Iteration 0**: Initial state before optimization starts
2. **Every `logInterval` iterations**: Regular progress updates
3. **Phase transitions**: When moving between phase1 → phase1.5 → phase2
4. **Reheating events**: When temperature is increased to escape local minima

### Error Handling

Errors in the callback don't break optimization:

```typescript
onProgress: (iteration, cost, temp, state, stats) => {
  // This error will be caught and logged, but optimization continues
  if (iteration === 100) {
    throw new Error('Test error');
  }
  
  console.log(`Progress: ${stats.progressPercent}%`);
}
```

### Performance Considerations

- Callback frequency is controlled by `logInterval`
- Lower `logInterval` = more frequent updates but higher overhead
- For async callbacks, optimization waits for callback to complete
- State parameter is always `null` for performance (avoid expensive cloning)

```typescript
// High frequency updates (more overhead)
logInterval: 100  // Called every 100 iterations

// Low frequency updates (less overhead)
logInterval: 5000 // Called every 5000 iterations
```

## Operator Selection

The algorithm uses adaptive operator selection to choose which move generator to apply at each iteration. Two selection modes are available.

### Selection Modes

**hybrid (default)**
- 30% random selection for exploration
- 70% weighted selection by success rate for exploitation
- More robust, balances exploration and exploitation
- Based on research by Cowling et al. (2002)

**roulette-wheel**
- 100% fitness-proportionate selection
- Pure Roulette Wheel Selection matching the Muklason et al. (2024) thesis formula
- Higher exploitation, less exploration
- May converge faster but risks missing good solutions

```typescript
const config: SAConfig<MyState> = {
  // ... other config
  operatorSelectionMode: 'hybrid',  // Default - balanced exploration/exploitation
};

// Use pure roulette-wheel for higher exploitation
const config2: SAConfig<MyState> = {
  // ... other config
  operatorSelectionMode: 'roulette-wheel',
};
```

### When to Use Each Mode

**Use hybrid when:**
- Problem has many local minima
- You want robust performance across different instances
- Exploration is more important than rapid convergence

**Use roulette-wheel when:**
- Problem is well-understood with smooth fitness landscape
- Rapid convergence is important
- You want strict adherence to the theoretical formula

### How Operator Success is Tracked

The algorithm tracks success rate for each operator:
- A move is "successful" if it produces a better solution OR is accepted despite being worse
- Success rates are updated continuously during optimization
- More successful operators get higher selection probability

```typescript
// Example: After solving, check operator performance
const solver = new SimulatedAnnealing(initialState, constraints, moveGenerators, config);
const solution = solver.solve();

const stats = solver.getStats();
console.log('Operator performance:');
for (const [name, data] of Object.entries(stats)) {
  console.log(`${name}: ${data.successRate.toFixed(2)} success rate`);
}
```

## Tuning Guide

### Step 1: Start with Defaults

```typescript
const config: SAConfig<MyState> = {
  initialTemperature: 1000,
  minTemperature: 0.01,
  coolingRate: 0.995,
  maxIterations: 50000,
  hardConstraintWeight: 10000,
  cloneState: manualClone,
};
```

### Step 2: Run and Observe

```typescript
const solution = solver.solve();
console.log('Iterations used:', solution.iterations);
console.log('Hard violations:', solution.hardViolations);
console.log('Fitness:', solution.fitness);
```

### Step 3: Adjust Based on Results

**Problem: Hitting max iterations**
```typescript
// Solution: Increase cooling rate or max iterations
coolingRate: 0.998,  // was 0.995
maxIterations: 100000, // was 50000
```

**Problem: Too slow**
```typescript
// Solution: Decrease max iterations or increase cooling rate
coolingRate: 0.99,  // was 0.995
maxIterations: 20000, // was 50000
```

**Problem: Can't satisfy hard constraints**
```typescript
// Solution: Enable intensification, add reheating, check constraints are feasible
enableIntensification: true,
intensificationIterations: 2000,
maxIntensificationAttempts: 5,
reheatingThreshold: 2000,
reheatingFactor: 2.5,
maxReheats: 5,
```

**Problem: Hard constraints satisfied but poor soft constraint satisfaction**
```typescript
// Solution: More iterations, slower cooling
coolingRate: 0.998,  // was 0.995
maxIterations: 100000, // was 50000
```

**Problem: Converges too early**
```typescript
// Solution: Higher initial temperature, enable tabu search
initialTemperature: 5000, // was 1000
tabuSearchEnabled: true,
tabuTenure: 50,
```

**Problem: Fitness oscillating between values**
```typescript
// Solution: Enable tabu search to prevent cycling
tabuSearchEnabled: true,
tabuTenure: 50,
maxTabuListSize: 1000,
```

**Problem: Phase 1 always ends with violations**
```typescript
// Solution: Increase intensification iterations and attempts
enableIntensification: true,
intensificationIterations: 4000,  // was 2000
maxIntensificationAttempts: 5,      // was 3
```

### Step 4: Fine-tune Weights

```typescript
// Balance soft constraint importance
constraints = [
  new CriticalSoft({ weight: 100 }),
  new ImportantSoft({ weight: 50 }),
  new NormalSoft({ weight: 10 }),
  new NiceToHaveSoft({ weight: 1 }),
];
```

## Configuration Templates

### Fast Prototyping

```typescript
const config: SAConfig<MyState> = {
  initialTemperature: 100,
  minTemperature: 0.1,
  coolingRate: 0.99,
  maxIterations: 10000,
  hardConstraintWeight: 1000,
  cloneState: (state) => JSON.parse(JSON.stringify(state)),
  logging: { level: 'info', logInterval: 500 },
};
```

### Production - Balanced

```typescript
const config: SAConfig<MyState> = {
  initialTemperature: 1000,
  minTemperature: 0.01,
  coolingRate: 0.995,
  maxIterations: 50000,
  hardConstraintWeight: 10000,
  cloneState: manualCloneFunction,
  reheatingThreshold: 2000,
  reheatingFactor: 2.0,
  maxReheats: 3,
  tabuSearchEnabled: true,
  tabuTenure: 50,
  maxTabuListSize: 1000,
  enableIntensification: true,
  intensificationIterations: 2000,
  maxIntensificationAttempts: 3,
  logging: { level: 'info', logInterval: 1000 },
};
```

### Production - High Quality

```typescript
const config: SAConfig<MyState> = {
  initialTemperature: 5000,
  minTemperature: 0.001,
  coolingRate: 0.998,
  maxIterations: 200000,
  hardConstraintWeight: 10000,
  cloneState: manualCloneFunction,
  reheatingThreshold: 5000,
  reheatingFactor: 2.5,
  maxReheats: 5,
  tabuSearchEnabled: true,
  tabuTenure: 100,
  maxTabuListSize: 2000,
  enableIntensification: true,
  intensificationIterations: 5000,
  maxIntensificationAttempts: 5,
  logging: { level: 'info', logInterval: 2000 },
};
```

### Production - Maximum Features

```typescript
const config: SAConfig<MyState> = {
  // Temperature settings
  initialTemperature: 10000,
  minTemperature: 0.0001,
  coolingRate: 0.999,
  maxIterations: 500000,

  // Constraint weight
  hardConstraintWeight: 50000,

  // State cloning
  cloneState: manualCloneFunction,

  // Reheating - escape local minima
  reheatingThreshold: 3000,
  reheatingFactor: 3.0,
  maxReheats: 5,

  // Tabu Search - prevent cycling
  tabuSearchEnabled: true,
  tabuTenure: 150,
  maxTabuListSize: 3000,

  // Intensification - target stubborn violations
  enableIntensification: true,
  intensificationIterations: 8000,
  maxIntensificationAttempts: 5,

  // Logging
  logging: {
    enabled: true,
    level: 'debug',
    logInterval: 1000,
    output: 'console',
  },
};
```

Use this configuration for:
- Very large, complex problems
- When solution quality is critical
- Problems with many local minima
- When you have time for longer optimization runs


## Next Steps

- [Advanced Features](./advanced-features.md) - Deep dive into algorithm features
- [Examples](./examples.md) - See complete configurations in action
- [API Reference](./api-reference.md) - Full API documentation
