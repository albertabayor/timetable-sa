# Advanced Features

This guide covers advanced features and techniques for using **timetable-sa** effectively.

## Table of Contents

- [Two-Phase Optimization](#two-phase-optimization)
- [Adaptive Operator Selection](#adaptive-operator-selection)
- [Reheating Mechanism](#reheating-mechanism)
- [Custom Violation Reporting](#custom-violation-reporting)
- [Performance Optimization](#performance-optimization)
- [Analyzing Results](#analyzing-results)
- [Advanced Constraint Patterns](#advanced-constraint-patterns)
- [Advanced Move Patterns](#advanced-move-patterns)

## Two-Phase Optimization

The algorithm uses a two-phase approach to ensure hard constraints are satisfied before optimizing soft constraints.

### Phase 1: Hard Constraint Satisfaction

**Goal:** Find a feasible solution (all hard constraints satisfied)

**Behavior:**
- Focuses exclusively on reducing hard violations
- Uses 60% of max iterations (by default)
- **Always accepts** moves that reduce hard violations
- **Never accepts** moves that increase hard violations
- Uses standard SA for same hard violation count

```typescript
// Phase 1 acceptance logic
if (newHardViolations < currentHardViolations) {
  accept(); // Always accept improvement
} else if (newHardViolations === currentHardViolations) {
  acceptWithProbability(temperature); // Standard SA
} else {
  reject(); // Never accept worse
}
```

### Phase 2: Soft Constraint Optimization

**Goal:** Find the best feasible solution

**Behavior:**
- Maintains hard constraint satisfaction
- Optimizes soft constraints
- **STRICTLY enforces** hard constraints (never violates them)
- Uses remaining iterations

```typescript
// Phase 2 acceptance logic (STRICT)
if (newHardViolations > bestHardViolations) {
  reject(); // NEVER accept hard violations
} else {
  acceptWithProbability(temperature); // Standard SA for soft
}
```

### Monitoring Phases

```typescript
// Enable debug logging to see phase transitions
const config: SAConfig<MyState> = {
  // ... other config
  logging: {
    level: 'debug',
    logInterval: 500,
  },
};

// Output:
// [INFO] Phase 1: Eliminating hard constraint violations
// [DEBUG] [Phase 1] New best: Hard violations = 5, Fitness = 5000.00
// [DEBUG] [Phase 1] New best: Hard violations = 3, Fitness = 3000.00
// [INFO] Phase 1 complete: Hard violations = 0
// [INFO] Phase 2: Optimizing soft constraints
// [DEBUG] [Phase 2] New best: Fitness = 15.50, Hard violations = 0
```

## Adaptive Operator Selection

The algorithm learns which move operators are most effective and uses them more often.

### How It Works

1. **Track Statistics**: Records attempts, improvements, and success rate for each operator
2. **Weighted Selection**: 70% of the time, selects based on success rate
3. **Random Exploration**: 30% of the time, selects randomly

```typescript
// Success rate calculation
successRate = improvements / attempts

// Operator with higher success rate is selected more often
```

### Viewing Operator Stats

```typescript
const solution = solver.solve();

// Detailed operator statistics
console.log('Operator Statistics:');
for (const [name, stats] of Object.entries(solution.operatorStats)) {
  console.log(`${name}:`);
  console.log(`  Attempts: ${stats.attempts}`);
  console.log(`  Improvements: ${stats.improvements}`);
  console.log(`  Accepted: ${stats.accepted}`);
  console.log(`  Success Rate: ${(stats.successRate * 100).toFixed(2)}%`);
}
```

### Example Output

```
Operator Statistics:
  Change Time Slot: Attempts = 15234, Improvements = 856, Accepted = 3421, Success Rate = 5.62%
  Change Room: Attempts = 12456, Improvements = 1234, Accepted = 4567, Success Rate = 9.91%
  Swap Classes: Attempts = 18903, Improvements = 2345, Accepted = 6789, Success Rate = 12.41%
  Fix Lecturer Conflict: Attempts = 3407, Improvements = 1203, Accepted = 2104, Success Rate = 35.31%
```

**Interpretation:**
- "Fix Lecturer Conflict" has highest success rate (35.31%) → Will be used more often
- "Change Time Slot" has lower success rate (5.62%) → Still used, but less often
- This adaptive behavior improves convergence speed

### Designing Effective Operators

**General operators** (low success rate, but always applicable):
```typescript
class ChangeTimeSlot implements MoveGenerator<TimetableState> {
  name = 'Change Time Slot';
  canApply(state: TimetableState): boolean {
    return state.schedule.length > 0;
  }
  generate(state: TimetableState, temperature: number): TimetableState {
    // Random time slot change
  }
}
```

**Targeted operators** (high success rate, specific purpose):
```typescript
class FixLecturerConflict implements MoveGenerator<TimetableState> {
  name = 'Fix Lecturer Conflict';
  canApply(state: TimetableState): boolean {
    return this.hasLecturerConflict(state);
  }
  generate(state: TimetableState, temperature: number): TimetableState {
    // Specifically target and fix lecturer conflicts
  }
}
```

**Recommendation:** Combine both types for best results!

## Reheating Mechanism

Reheating helps escape local minima when the algorithm gets stuck.

### When Reheating Occurs

```typescript
if (iterationsWithoutImprovement >= reheatingThreshold &&
    reheats < maxReheats &&
    temperature < initialTemperature / 100) {

  temperature *= reheatingFactor;
  reheats++;
  iterationsWithoutImprovement = 0;
}
```

### Configuration

```typescript
const config: SAConfig<MyState> = {
  // ... other config
  reheatingThreshold: 2000,  // Reheat after 2000 iterations without improvement
  reheatingFactor: 2.5,      // Multiply temperature by 2.5
  maxReheats: 3,             // Allow up to 3 reheats
};
```

### Monitoring Reheating

```typescript
// Solution includes reheating count
console.log('Reheats:', solution.reheats);

// Log output shows when reheating occurs
// [INFO] [Phase 1] Reheating #1: Temperature = 25.00, Hard violations = 3
// [INFO] [Phase 2] Reheating #2: Temperature = 15.00, Fitness = 45.50
```

### Reheating Strategies

**Conservative** (few reheats, small increase):
```typescript
reheatingThreshold: 3000,
reheatingFactor: 1.5,
maxReheats: 2,
```

**Aggressive** (frequent reheats, large increase):
```typescript
reheatingThreshold: 1000,
reheatingFactor: 3.0,
maxReheats: 5,
```

**Disabled**:
```typescript
// Omit reheating parameters or set threshold to undefined
reheatingThreshold: undefined,
```

## Custom Violation Reporting

### Using `getViolations()` for Detailed Reports

Instead of `describe()`, implement `getViolations()` to report ALL violations:

```typescript
class NoRoomConflict implements Constraint<TimetableState> {
  name = 'No Room Conflict';
  type = 'hard' as const;

  evaluate(state: TimetableState): number {
    const conflicts = this.findAllConflicts(state);
    if (conflicts.length === 0) return 1.0;
    return 1.0 / (1.0 + conflicts.length);
  }

  // Detailed violation reporting
  getViolations(state: TimetableState): string[] {
    const violations: string[] = [];

    for (let i = 0; i < state.schedule.length; i++) {
      for (let j = i + 1; j < state.schedule.length; j++) {
        const a = state.schedule[i];
        const b = state.schedule[j];

        if (this.hasConflict(a, b)) {
          violations.push(
            `Room ${a.roomId} on ${a.day} at ${a.startTime}: ` +
            `${a.classId} conflicts with ${b.classId}`
          );
        }
      }
    }

    return violations;
  }

  private findAllConflicts(state: TimetableState) {
    // Implementation...
  }

  private hasConflict(a: ScheduleEntry, b: ScheduleEntry): boolean {
    // Implementation...
  }
}
```

### Generating Reports

```typescript
const solution = solver.solve();

if (solution.hardViolations > 0) {
  console.log('\n=== HARD CONSTRAINT VIOLATIONS ===');
  const hardViolations = solution.violations.filter(v => v.constraintType === 'hard');

  for (const violation of hardViolations) {
    console.log(`\n${violation.constraintName}:`);
    console.log(`  Score: ${violation.score.toFixed(2)}`);
    if (violation.description) {
      console.log(`  ${violation.description}`);
    }
  }
}

if (solution.softViolations > 0) {
  console.log('\n=== SOFT CONSTRAINT VIOLATIONS ===');
  const softViolations = solution.violations.filter(v => v.constraintType === 'soft');

  for (const violation of softViolations) {
    console.log(`\n${violation.constraintName}:`);
    console.log(`  Score: ${violation.score.toFixed(2)}`);
    if (violation.description) {
      console.log(`  ${violation.description}`);
    }
  }
}
```

## Performance Optimization

### 1. Efficient State Cloning

**Bad** (slow):
```typescript
cloneState: (state) => JSON.parse(JSON.stringify(state))
```

**Good** (fast):
```typescript
cloneState: (state) => ({
  schedule: state.schedule.map(e => ({ ...e })),
  rooms: [...state.rooms],
  lecturers: [...state.lecturers],
})
```

**Better** (fastest, if applicable):
```typescript
// Only if schedule entries don't need deep cloning
cloneState: (state) => ({
  ...state,
  schedule: [...state.schedule],
})
```

### 2. Constraint Evaluation

Cache expensive computations:

```typescript
class EfficientConstraint implements Constraint<TimetableState> {
  name = 'Efficient Constraint';
  type = 'hard' as const;

  private cache = new WeakMap<TimetableState, number>();

  evaluate(state: TimetableState): number {
    // Use cache if available
    if (this.cache.has(state)) {
      return this.cache.get(state)!;
    }

    // Compute score
    const score = this.computeScore(state);
    this.cache.set(state, score);
    return score;
  }

  private computeScore(state: TimetableState): number {
    // Expensive computation
  }
}
```

**Warning:** Cache only works if state objects are reused. With cloning, each state is new!

### 3. Early Exit in Constraints

Stop checking once violation is found (for binary constraints):

```typescript
evaluate(state: TimetableState): number {
  for (let i = 0; i < state.schedule.length; i++) {
    for (let j = i + 1; j < state.schedule.length; j++) {
      if (hasConflict(state.schedule[i], state.schedule[j])) {
        return 0; // Early exit - violation found
      }
    }
  }
  return 1; // No violations
}
```

### 4. Limit Move Generator Complexity

```typescript
// Bad: O(n²) move generation
generate(state: TimetableState, temperature: number): TimetableState {
  const newState = cloneState(state);
  // Check all pairs... slow!
  for (let i = 0; i < state.schedule.length; i++) {
    for (let j = 0; j < state.schedule.length; j++) {
      // ...
    }
  }
  return newState;
}

// Good: O(1) or O(n) move generation
generate(state: TimetableState, temperature: number): TimetableState {
  const newState = cloneState(state);
  const randomIndex = Math.floor(Math.random() * state.schedule.length);
  newState.schedule[randomIndex].timeSlot = getRandomTimeSlot();
  return newState;
}
```

## Analyzing Results

### Understanding the Solution Object

```typescript
interface Solution<TState> {
  state: TState;              // Best state found
  fitness: number;            // Final fitness (lower is better)
  hardViolations: number;     // Count of hard violations
  softViolations: number;     // Count of soft violations
  iterations: number;         // Total iterations performed
  reheats: number;            // Number of reheating events
  finalTemperature: number;   // Final temperature
  violations: Violation[];    // Detailed violation list
  operatorStats: OperatorStats; // Operator performance
}
```

### Quality Assessment

```typescript
const solution = solver.solve();

// 1. Check feasibility
if (solution.hardViolations === 0) {
  console.log('✓ Valid solution found');
} else {
  console.log(`✗ Invalid: ${solution.hardViolations} hard violations`);
}

// 2. Check soft constraint satisfaction
const softSatisfactionRate =
  (constraints.filter(c => c.type === 'soft').length - solution.softViolations) /
  constraints.filter(c => c.type === 'soft').length * 100;
console.log(`Soft constraint satisfaction: ${softSatisfactionRate.toFixed(1)}%`);

// 3. Check convergence
console.log(`Used ${solution.iterations} of ${config.maxIterations} iterations`);
if (solution.iterations >= config.maxIterations) {
  console.log('⚠ Warning: Hit iteration limit. May need more time.');
}

// 4. Check operator effectiveness
const mostEffectiveOperator = Object.entries(solution.operatorStats)
  .sort((a, b) => b[1].successRate - a[1].successRate)[0];
console.log(`Most effective operator: ${mostEffectiveOperator[0]} (${(mostEffectiveOperator[1].successRate * 100).toFixed(2)}%)`);
```

## Advanced Constraint Patterns

### Gradual Soft Constraints

Return scores between 0 and 1 for partial satisfaction:

```typescript
class PreferCompactSchedule implements Constraint<TimetableState> {
  name = 'Prefer Compact Schedule';
  type = 'soft' as const;
  weight = 20;

  evaluate(state: TimetableState): number {
    const avgGapSize = this.calculateAverageGap(state);
    const maxAcceptableGap = 120; // minutes

    if (avgGapSize === 0) return 1.0; // Perfect
    if (avgGapSize >= maxAcceptableGap) return 0.0; // Completely violated

    // Gradual: smaller gaps = higher score
    return 1.0 - (avgGapSize / maxAcceptableGap);
  }

  private calculateAverageGap(state: TimetableState): number {
    // Calculate average gap between classes
  }
}
```

### Composite Constraints

Combine multiple checks in one constraint:

```typescript
class RoomSuitability implements Constraint<TimetableState> {
  name = 'Room Suitability';
  type = 'soft' as const;
  weight = 15;

  evaluate(state: TimetableState): number {
    let satisfiedCount = 0;
    let totalChecks = 0;

    for (const entry of state.schedule) {
      const room = this.getRoom(entry.roomId, state);
      const classInfo = this.getClassInfo(entry.classId);

      // Check 1: Capacity
      totalChecks++;
      if (room.capacity >= classInfo.studentCount) satisfiedCount++;

      // Check 2: Equipment
      totalChecks++;
      if (this.hasRequiredEquipment(room, classInfo)) satisfiedCount++;

      // Check 3: Location preference
      totalChecks++;
      if (this.isPreferredLocation(room, classInfo)) satisfiedCount++;
    }

    return totalChecks > 0 ? satisfiedCount / totalChecks : 1.0;
  }
}
```

## Advanced Move Patterns

### Targeted Repair Moves

Moves that specifically fix known violations:

```typescript
class FixRoomCapacityViolation implements MoveGenerator<TimetableState> {
  name = 'Fix Room Capacity';

  canApply(state: TimetableState): boolean {
    return this.findCapacityViolations(state).length > 0;
  }

  generate(state: TimetableState, temperature: number): TimetableState {
    const newState = cloneState(state);
    const violations = this.findCapacityViolations(state);

    if (violations.length > 0) {
      const randomViolation = violations[Math.floor(Math.random() * violations.length)];

      // Find a suitable room with enough capacity
      const suitableRoom = this.findSuitableRoom(randomViolation, state);
      if (suitableRoom) {
        const entryIndex = state.schedule.findIndex(e => e.classId === randomViolation.classId);
        newState.schedule[entryIndex].roomId = suitableRoom.id;
      }
    }

    return newState;
  }

  private findCapacityViolations(state: TimetableState) {
    // Find all classes where room capacity < student count
  }

  private findSuitableRoom(violation: any, state: TimetableState) {
    // Find available room with sufficient capacity
  }
}
```

### Compound Moves

Change multiple attributes simultaneously:

```typescript
class RelocateClass implements MoveGenerator<TimetableState> {
  name = 'Relocate Class';

  canApply(state: TimetableState): boolean {
    return state.schedule.length > 0;
  }

  generate(state: TimetableState, temperature: number): TimetableState {
    const newState = cloneState(state);
    const randomIndex = Math.floor(Math.random() * state.schedule.length);

    // Change day, time, AND room simultaneously
    newState.schedule[randomIndex].day = this.getRandomDay();
    newState.schedule[randomIndex].startTime = this.getRandomTime();
    newState.schedule[randomIndex].roomId = this.getRandomRoom(state);

    return newState;
  }
}
```

## Next Steps

- [Examples](./examples.md) - See these features in action
- [API Reference](./api-reference.md) - Complete API documentation
- [Configuration Guide](./configuration.md) - Fine-tune parameters
