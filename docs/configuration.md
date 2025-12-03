# Configuration Guide

This guide helps you configure the Simulated Annealing algorithm for optimal results.

## Table of Contents

- [Basic Configuration](#basic-configuration)
- [Temperature Parameters](#temperature-parameters)
- [Iteration Control](#iteration-control)
- [Constraint Weights](#constraint-weights)
- [State Cloning](#state-cloning)
- [Reheating](#reheating)
- [Logging](#logging)
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
// Solution: Add reheating, check constraints are feasible
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
// Solution: Higher initial temperature
initialTemperature: 5000, // was 1000
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
  logging: { level: 'info', logInterval: 2000 },
};
```

## Next Steps

- [Advanced Features](./advanced-features.md) - Deep dive into algorithm features
- [Examples](./examples.md) - See complete configurations in action
- [API Reference](./api-reference.md) - Full API documentation
