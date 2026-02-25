After reviewing the code in `src/` and `examples/timetabling/`, here are my findings:

## Bugs Found

### 1. **Critical Bug: State Mutation in Move Generators**

In [`FixFridayPrayerConflict.ts`](examples/timetabling/moves/FixFridayPrayerConflict.ts:157) and [`ChangeTimeSlot.ts`](examples/timetabling/moves/ChangeTimeSlot.ts:22), the comment says "SA engine already clones state" but this is **dangerous and incorrect**:

```typescript
// Line 157 in FixFridayPrayerConflict.ts
generate(state: TimetableState, temperature: number): TimetableState {
  // SA engine already clones state, so we work directly on the passed state
  // ... modifies state directly
  return state;
}
```
<b>Investagation Result:</b>
You're absolutely right to be confused - I made an error in my explanation. Let me clarify:

## The Correct Flow

**The engine clones BEFORE calling `generate()`** ([`SimulatedAnnealing.ts:587`](src/core/SimulatedAnnealing.ts:587)):

```typescript
const clonedState = this.config.cloneState(state);  // Engine clones
const newState = selectedGenerator.generate(clonedState, temperature);  // Passes clone
```

So when `generate()` receives the state, it's **already a clone**. The move generator CAN safely modify it directly.

## Where I Was Wrong

I said the comment was "misleading" and that users should clone again - that's **incorrect and redundant**. Double-cloning would waste performance.

## The Real Issue

The **interface documentation** ([`MoveGenerator.ts:45`](src/core/interfaces/MoveGenerator.ts:45)) says:

```typescript
/**
 * The implementation should:
 * 1. Clone the current state (do not modify the input)
 */
```

But the **example implementations** ([`FixFridayPrayerConflict.ts:158`](examples/timetabling/moves/FixFridayPrayerConflict.ts:158)) say:

```typescript
// SA engine already clones state, so we work directly on the passed state
```

## The Actual Bug

The **interface documentation is wrong**, not the examples. The interface says "you should clone" but the engine already clones. This creates confusion:

- If you follow the **interface docs**: You clone twice (wasteful)
- If you follow the **example comments**: You work correctly

## What Should Be Fixed

The [`MoveGenerator.ts`](src/core/interfaces/MoveGenerator.ts:45) interface documentation should be updated to:

```typescript
/**
 * Generate a new neighbor state from the current state.
 * 
 * @param state - Current state (ALREADY CLONED by the SA engine, safe to modify)
 * 
 * The implementation should:
 * 1. Modify the passed state directly (it's already a clone)
 * 2. Return the modified state
 */
```

## Summary

| What | Current Status |
|------|---------------|
| Engine behavior | ✅ Correctly clones before calling `generate()` |
| Example implementations | ✅ Correctly modify directly |
| Interface documentation | ❌ Wrong - says to clone when you shouldn't |

**The fix is to update the interface documentation**, not the examples. The examples are right.



**Problem**: The SA engine does NOT clone before passing to `generate()`. Looking at [`SimulatedAnnealing.ts:587-588`](src/core/SimulatedAnnealing.ts:587):

```typescript
const clonedState = this.config.cloneState(state); 
const newState = selectedGenerator.generate(clonedState, temperature);
```

The engine clones ONCE, then passes that clone to `generate()`. If `generate()` mutates and returns the same reference, it's fine. But if the user implements their own move generator following this comment pattern, they might mutate the original. The comment is misleading.

### 2. **Potential Division by Zero in Fitness Calculation**

In [`SimulatedAnnealing.ts:551`](src/core/SimulatedAnnealing.ts:551):

```typescript
const inferredCount = Math.round((1 / score) - 1);
```

If `score` is 0, this causes division by zero. While constraints typically return scores > 0, a malformed constraint could return 0.

### 3. **Tabu List Memory Leak Risk**

In [`SimulatedAnnealing.ts:803-831`](src/core/SimulatedAnnealing.ts:803), the cleanup only happens when `tabuList.size > maxTabuListSize`, but entries are never proactively removed during normal operation. For long-running optimizations, this could accumulate memory.

## Improvements

### 1. **Constraint Interface - Missing `getViolations` in Type Definition**

The [`Constraint.ts`](src/core/interfaces/Constraint.ts:126) interface defines `getViolations?` as optional, but [`SimulatedAnnealing.ts:545-547`](src/core/SimulatedAnnealing.ts:545) uses it without checking if it exists properly in all paths.

### 2. **Type Safety Issue in State Signature**

In [`SimulatedAnnealing.ts:716-733`](src/core/SimulatedAnnealing.ts:716):

```typescript
private getStateSignature(state: TState): string {
  const schedule = (state as any).schedule;  // Unsafe type cast
```

This generic method assumes a `schedule` property exists. For non-timetable states, it falls back to random. This breaks Tabu Search for non-timetable domains.

### 3. **Hardcoded Values in Intensification**

In [`SimulatedAnnealing.ts:264`](src/core/SimulatedAnnealing.ts:264):

```typescript
const stagnationLimit = 300;  // Hardcoded, should be configurable
```

### 4. **Missing Input Validation**

No validation for:
- `coolingRate` not in (0, 1) range
- `initialTemperature <= 0`
- `maxIterations <= 0`
- Empty `moveGenerators` array

### 5. **Code Style Issues**

- Inconsistent indentation (mixed 2-space and 4-space in some files)
- Some methods are very long (e.g., `solve()` is ~400 lines) - could be broken down
- Magic numbers scattered throughout (e.g., 0.7, 0.3 for hybrid selection)

## Recommendations

1. **Fix the misleading comment** in move generators about state cloning
2. **Add input validation** in `SimulatedAnnealing` constructor
3. **Make `getStateSignature` truly generic** - perhaps accept a custom hash function in config
4. **Add defensive check** for division by zero in fitness calculation
5. **Consider extracting** the three phases (Phase 1, Intensification, Phase 2) into separate methods for better readability