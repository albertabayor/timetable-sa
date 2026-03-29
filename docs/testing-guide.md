# Testing Guide

Comprehensive testing strategies for constraints, move generators, and solver
configurations. This guide reflects the current implementation contracts in
`src/`, including satisfaction-oriented constraint scores and mutation-friendly
move generators that operate on a solver-provided clone.

## Testing Philosophy

### Goals

1. **Correctness**: Constraints and moves behave as specified
2. **Contract Compliance**: All interfaces satisfy documented contracts
3. **Determinism**: Same inputs produce same outputs (where expected)
4. **Robustness**: Graceful handling of edge cases
5. **Performance**: Acceptable execution time and memory usage

### Testing Pyramid

```
        /\
       /  \
      / E2E \         Integration tests (full solve cycles)
     /________\
    /          \
   / Integration \    Component tests (constraints, moves)
  /______________\
 /                \
/    Unit Tests    \  Core logic, edge cases, contracts
/____________________\
```

### Recommended Tools

- **Jest** or **Vitest**: Unit and integration testing
- **fast-check**: Property-based testing
- **@types/jest**: TypeScript support

## Unit Testing Constraints

### Basic Structure

```typescript
import { Constraint } from 'timetable-sa';
import { describe, it, expect } from 'vitest';

describe('NoOverlapConstraint', () => {
  const constraint: Constraint<Timetable> = {
    name: 'no-overlap',
    type: 'hard',
    evaluate: (timetable) => {
      // Implementation
    }
  };

  describe('Contract Compliance', () => {
    it('should return values in [0, 1] range', () => {
      const testStates = generateTestStates(100);
      
      for (const state of testStates) {
        const score = constraint.evaluate(state);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
        expect(Number.isFinite(score)).toBe(true);
      }
    });

    it('should return 1 for valid states', () => {
      const validState = createValidTimetable();
      expect(constraint.evaluate(validState)).toBe(1);
    });

    it('should return <1 for invalid states', () => {
      const invalidState = createOverlappingTimetable();
      expect(constraint.evaluate(invalidState)).toBeLessThan(1);
    });

    it('should be deterministic', () => {
      const state = generateRandomState();
      const score1 = constraint.evaluate(state);
      const score2 = constraint.evaluate(state);
      const score3 = constraint.evaluate(state);
      
      expect(score1).toBe(score2);
      expect(score2).toBe(score3);
    });
  });

  describe('Functional Behavior', () => {
    it('should detect single overlap', () => {
        const state = createStateWithOverlap(1);
        const score = constraint.evaluate(state);
        expect(score).toBeLessThan(1);
        expect(score).toBeGreaterThan(0.8); // Small satisfaction loss
      });

    it('should detect multiple overlaps', () => {
        const state = createStateWithOverlap(5);
        const score = constraint.evaluate(state);
        expect(score).toBeLessThan(0.8);
      });

    it('should handle empty state', () => {
      const emptyState = { assignments: new Map() };
      expect(constraint.evaluate(emptyState)).toBe(1);
    });

    it('should handle maximum violations', () => {
      const worstState = createMaximallyOverlappingState();
      expect(constraint.evaluate(worstState)).toBe(0);
    });
  });

  describe('Optional Methods', () => {
    it('should provide meaningful description when violations exist', () => {
      const state = createOverlappingTimetable();
      const description = constraint.describe?.(state);
      
      expect(description).toBeDefined();
      expect(description?.length).toBeGreaterThan(0);
      expect(description).toContain('overlap'); // Domain-specific
    });

    it('should return undefined when no violations', () => {
      const validState = createValidTimetable();
      const description = constraint.describe?.(validState);
      expect(description).toBeUndefined();
    });

    it('should list specific violations', () => {
      const state = createOverlappingTimetable();
      const violations = constraint.getViolations?.(state);
      
      expect(violations).toBeDefined();
      expect(violations!.length).toBeGreaterThan(0);
      expect(violations![0]).toContain('exam'); // Domain-specific
    });
  });
});
```

### Edge Cases

```typescript
describe('Edge Cases', () => {
  it('should handle null/undefined gracefully', () => {
    // If your state can have nullable fields
    const stateWithNulls = createStateWithNullFields();
    expect(() => constraint.evaluate(stateWithNulls)).not.toThrow();
  });

  it('should handle circular references safely', () => {
    const stateWithCycles = createStateWithCircularRefs();
    // Constraint evaluation itself should not depend on tabu serialization.
    expect(() => constraint.evaluate(stateWithCycles)).not.toThrow();
  });

  it('should handle very large states', () => {
    const largeState = createLargeState(10000);
    const startTime = Date.now();
    const score = constraint.evaluate(largeState);
    const duration = Date.now() - startTime;
    
    expect(score).toBeGreaterThanOrEqual(0);
    expect(duration).toBeLessThan(100); // Should be fast
  });

  it('should handle concurrent modifications', () => {
    const state = createValidTimetable();
    
    // Simulate concurrent access
    const promises = Array(10).fill(null).map(() => 
      Promise.resolve(constraint.evaluate(state))
    );
    
    return Promise.all(promises).then(scores => {
      // All should return same score
      expect(new Set(scores).size).toBe(1);
    });
  });
});
```

### Soft Constraint Testing

```typescript
describe('SoftConstraint', () => {
  const softConstraint: Constraint<Timetable> = {
    name: 'prefer-mornings',
    type: 'soft',
    weight: 0.5,
    evaluate: (t) => {
      const afternoonCount = countAfternoonExams(t);
      return afternoonCount / t.assignments.size;
    }
  };

  it('should respect weight parameter', () => {
    const state = createStateWithAfternoonExams(5);
    
    const unweighted = { ...softConstraint, weight: 1 };
    const weighted = { ...softConstraint, weight: 2 };
    
    const score1 = unweighted.evaluate(state) * (unweighted.weight || 1);
    const score2 = weighted.evaluate(state) * (weighted.weight || 1);
    
    expect(score2).toBe(score1 * 2);
  });

  it('should improve monotonically with better solutions', () => {
    const badState = createStateWithAfternoonExams(10);
    const mediumState = createStateWithAfternoonExams(5);
    const goodState = createStateWithAfternoonExams(0);
    
    const badScore = softConstraint.evaluate(badState);
    const mediumScore = softConstraint.evaluate(mediumState);
    const goodScore = softConstraint.evaluate(goodState);
    
    expect(badScore).toBeGreaterThan(mediumScore);
    expect(mediumScore).toBeGreaterThan(goodScore);
    expect(goodScore).toBe(0);
  });
});
```

## Unit Testing Move Generators

### Basic Structure

```typescript
import { MoveGenerator } from 'timetable-sa';

describe('SwapRoomsMove', () => {
  const move: MoveGenerator<Timetable> = {
    name: 'swap-rooms',
    canApply: (t) => t.assignments.size >= 2,
    generate: (t, temp) => {
      // Implementation
    }
  };

  describe('canApply', () => {
    it('should return false for empty state', () => {
      const emptyState = { assignments: new Map() };
      expect(move.canApply(emptyState)).toBe(false);
    });

    it('should return false for single assignment', () => {
      const singleState = { 
        assignments: new Map([['exam1', 'roomA']]) 
      };
      expect(move.canApply(singleState)).toBe(false);
    });

    it('should return true for multiple assignments', () => {
      const multiState = {
        assignments: new Map([
          ['exam1', 'roomA'],
          ['exam2', 'roomB']
        ])
      };
      expect(move.canApply(multiState)).toBe(true);
    });
  });

  describe('generate', () => {
    it('should produce valid neighboring state', () => {
      const initialState = createValidTimetable();
      const neighborState = move.generate(initialState, 100);
      
      // Should return a state
      expect(neighborState).toBeDefined();
      expect(neighborState.assignments).toBeDefined();
    });

    it('should be safe to mutate the provided working state', () => {
      const engineClone = deepClone(createValidTimetable());

      const neighborState = move.generate(engineClone, 100);

      expect(neighborState).toBeDefined();
    });

    it('should make actual changes', () => {
      const initialState = createValidTimetable();
      const neighborState = move.generate(deepClone(initialState), 100);
      
      // States should differ
      expect(areStatesEqual(initialState, neighborState)).toBe(false);
    });

    it('should preserve state invariants', () => {
      const initialState = createValidTimetable();
      const neighborState = move.generate(deepClone(initialState), 100);
      
      // Domain-specific invariants
      expect(hasValidAssignments(neighborState)).toBe(true);
      expect(allExamsScheduled(neighborState)).toBe(true);
    });
  });

  describe('temperature awareness', () => {
    it('should make larger changes at high temperature', () => {
      const state = createValidTimetable();
      
      const highTempMove = move.generate(deepClone(state), 1000);
      const lowTempMove = move.generate(deepClone(state), 1);
      
      const highTempDistance = calculateStateDistance(state, highTempMove);
      const lowTempDistance = calculateStateDistance(state, lowTempMove);
      
      // High temp should generally produce larger changes
      // (statistical test - run multiple times)
      const highTempDistances = Array(100).fill(0).map(() => {
        const newState = move.generate(deepClone(state), 1000);
        return calculateStateDistance(state, newState);
      });
      
      const lowTempDistances = Array(100).fill(0).map(() => {
        const newState = move.generate(deepClone(state), 1);
        return calculateStateDistance(state, newState);
      });
      
      const avgHigh = highTempDistances.reduce((a, b) => a + b, 0) / 100;
      const avgLow = lowTempDistances.reduce((a, b) => a + b, 0) / 100;
      
      expect(avgHigh).toBeGreaterThan(avgLow);
    });
  });
});
```

### Move Diversity Testing

```typescript
describe('Move Diversity', () => {
  it('should explore different neighborhoods', () => {
    const state = createValidTimetable();
    const generatedStates = new Set<string>();
    
    // Generate many neighbors
    for (let i = 0; i < 1000; i++) {
      const neighbor = move.generate(state, 100);
      generatedStates.add(stateToString(neighbor));
    }
    
    // Should generate diverse states
    expect(generatedStates.size).toBeGreaterThan(100);
  });

  it('should eventually reach any valid state', () => {
    // This tests reachability of the move generator
    const startState = createStateA();
    const targetState = createStateB();
    
    let currentState = startState;
    let iterations = 0;
    const maxIterations = 10000;
    
    while (iterations < maxIterations) {
      if (areStatesEqual(currentState, targetState)) {
        break;
      }
      
      currentState = move.generate(currentState, 500);
      iterations++;
    }
    
    expect(iterations).toBeLessThan(maxIterations);
  });
});
```

## Integration Testing

### Full Solve Cycle

```typescript
import { SimulatedAnnealing } from 'timetable-sa';

describe('SimulatedAnnealing Integration', () => {
  const createSolver = (configOverrides = {}) => {
    const constraints = [
      noOverlapConstraint,
      roomCapacityConstraint,
      preferenceConstraint
    ];
    
    const moves = [
      swapRoomsMove,
      rescheduleMove,
      swapTimeSlotsMove
    ];
    
    const config = {
      initialTemperature: 100,
      minTemperature: 0.1,
      coolingRate: 0.99,
      maxIterations: 10000,
      hardConstraintWeight: 1000,
      cloneState: deepClone,
      logging: { enabled: false },
      ...configOverrides
    };
    
    return new SimulatedAnnealing(
      createInitialState(),
      constraints,
      moves,
      config
    );
  };

  it('should find feasible solution for solvable problem', async () => {
    const solver = createSolver();
    const solution = await solver.solve();
    
    expect(solution).toBeDefined();
    expect(solution.hardViolations).toBe(0);
    expect(solution.iterations).toBeGreaterThan(0);
    expect(solution.iterations).toBeLessThanOrEqual(10000);
  });

  it('should return solution metadata', async () => {
    const solver = createSolver();
    const solution = await solver.solve();
    
    expect(solution.state).toBeDefined();
    expect(typeof solution.fitness).toBe('number');
    expect(typeof solution.hardViolations).toBe('number');
    expect(typeof solution.softViolations).toBe('number');
    expect(typeof solution.iterations).toBe('number');
    expect(typeof solution.finalTemperature).toBe('number');
    expect(solution.violations).toBeInstanceOf(Array);
    expect(solution.operatorStats).toBeDefined();
  });

  it('should improve over random search', async () => {
    // Compare SA solution vs random sampling
    const solver = createSolver({ maxIterations: 5000 });
    const saSolution = await solver.solve();
    
    // Random baseline
    let bestRandomFitness = Infinity;
    for (let i = 0; i < 5000; i++) {
      const randomState = generateRandomState();
      const fitness = calculateFitness(randomState);
      bestRandomFitness = Math.min(bestRandomFitness, fitness);
    }
    
    expect(saSolution.fitness).toBeLessThan(bestRandomFitness);
  });

  it('should be deterministic with same seed', async () => {
    // Note: Currently library doesn't support seeding, but good to test
    // if you add deterministic random number generation
    const solver1 = createSolver();
    const solver2 = createSolver();
    
    const [solution1, solution2] = await Promise.all([
      solver1.solve(),
      solver2.solve()
    ]);
    
    // Without seeding, solutions will differ
    // With seeding, they should be identical
    // expect(solution1.fitness).toBe(solution2.fitness);
  });

  it('should handle progress callbacks', async () => {
    const progressCalls: number[] = [];
    
    const solver = createSolver({
      onProgress: (stats) => {
        progressCalls.push(stats.iteration);
      },
      onProgressMode: 'fire-and-forget'
    });
    
    await solver.solve();
    
    expect(progressCalls.length).toBeGreaterThan(0);
    expect(progressCalls[0]).toBeGreaterThanOrEqual(0);
    
    // Should be called multiple times
    expect(progressCalls.length).toBeGreaterThan(5);
  });

  it('should throw on concurrent solve attempts', async () => {
    const solver = createSolver({ maxIterations: 100000 });
    
    // Start first solve
    const solve1 = solver.solve();
    
    // Second solve should throw
    await expect(solver.solve()).rejects.toThrow('concurrent');
    
    // Wait for first to complete
    await solve1;
  });

  it('should provide operator statistics', async () => {
    const solver = createSolver({ maxIterations: 1000 });
    await solver.solve();
    
    const stats = solver.getStats();
    
    expect(Object.keys(stats).length).toBe(3); // 3 move generators
    
    for (const [name, data] of Object.entries(stats)) {
      expect(typeof data.attempts).toBe('number');
      expect(typeof data.improvements).toBe('number');
      expect(typeof data.accepted).toBe('number');
      expect(typeof data.successRate).toBe('number');
      expect(data.attempts).toBeGreaterThanOrEqual(data.improvements);
      expect(data.successRate).toBeGreaterThanOrEqual(0);
      expect(data.successRate).toBeLessThanOrEqual(1);
    }
  });
});
```

### Configuration Testing

```typescript
describe('Configuration Validation', () => {
  it('should reject invalid temperatures', () => {
    expect(() => {
      new SimulatedAnnealing(state, constraints, moves, {
        ...validConfig,
        initialTemperature: -100
      });
    }).toThrow();
  });

  it('should reject invalid cooling rate', () => {
    expect(() => {
      new SimulatedAnnealing(state, constraints, moves, {
        ...validConfig,
        coolingRate: 1.5
      });
    }).toThrow();
  });

  it('currently allows empty constraints arrays', () => {
    expect(() => {
      new SimulatedAnnealing(state, [], moves, validConfig);
    }).not.toThrow();
  });

  it('currently allows empty move-generator arrays', () => {
    expect(() => {
      new SimulatedAnnealing(state, constraints, [], validConfig);
    }).not.toThrow();
  });

  it('currently does not reject duplicate constraint names', () => {
    const duplicateConstraints = [
      { name: 'overlap', type: 'hard', evaluate: () => 1 },
      { name: 'overlap', type: 'hard', evaluate: () => 1 }
    ];
    
    expect(() => {
      new SimulatedAnnealing(state, duplicateConstraints, moves, validConfig);
    }).not.toThrow();
  });
});
```

## Property-Based Testing

Using `fast-check` for generative testing:

```typescript
import fc from 'fast-check';

describe('Property-Based Tests', () => {
  describe('Constraint Properties', () => {
    it('should always return valid score for any state', () => {
      fc.assert(
        fc.property(
          arbitraryTimetable(),
          (state) => {
            const score = noOverlapConstraint.evaluate(state);
            return score >= 0 && score <= 1 && Number.isFinite(score);
          }
        ),
        { numRuns: 1000 }
      );
    });

    it('should be monotonic with respect to violations', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 10 }),
          fc.integer({ min: 0, max: 10 }),
          (violations1, violations2) => {
            const state1 = createStateWithOverlaps(violations1);
            const state2 = createStateWithOverlaps(violations2);
            
            const score1 = noOverlapConstraint.evaluate(state1);
            const score2 = noOverlapConstraint.evaluate(state2);
            
            if (violations1 < violations2) {
              return score1 >= score2;
            } else if (violations1 > violations2) {
              return score1 <= score2;
            } else {
              return score1 === score2;
            }
          }
        ),
        { numRuns: 500 }
      );
    });
  });

  describe('Move Generator Properties', () => {
    it('should always produce valid state', () => {
      fc.assert(
        fc.property(
          arbitraryValidTimetable(),
          fc.integer({ min: 0, max: 1000 }),
          (state, temperature) => {
            const newState = swapRoomsMove.generate(state, temperature);
            return isValidTimetable(newState) && 
                   newState.assignments.size === state.assignments.size;
          }
        ),
        { numRuns: 1000 }
      );
    });

    it('should be reversible with complementary moves', () => {
      // If you have inverse moves, test they undo each other
      fc.assert(
        fc.property(
          arbitraryValidTimetable(),
          (state) => {
            const afterSwap = swapRoomsMove.generate(state, 100);
            const afterUndo = undoSwapMove.generate(afterSwap, 100);
            return areStatesEqual(state, afterUndo);
          }
        ),
        { numRuns: 500 }
      );
    });
  });

  describe('Solver Properties', () => {
    it('should never produce worse solution than initial', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryValidTimetable(),
          async (initialState) => {
            const initialFitness = calculateFitness(initialState);
            
            const solver = new SimulatedAnnealing(
              initialState,
              constraints,
              moves,
              {
                ...testConfig,
                maxIterations: 1000,
                logging: { enabled: false }
              }
            );
            
            const solution = await solver.solve();
            return solution.fitness <= initialFitness;
          }
        ),
        { numRuns: 50 } // Keep lower due to solve time
      );
    });

    it('should always terminate within iteration limit', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 100, max: 5000 }),
          async (maxIterations) => {
            const solver = new SimulatedAnnealing(
              initialState,
              constraints,
              moves,
              {
                ...testConfig,
                maxIterations,
                logging: { enabled: false }
              }
            );
            
            const solution = await solver.solve();
            return solution.iterations <= maxIterations;
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});

// Arbitraries for fast-check
function arbitraryTimetable(): fc.Arbitrary<Timetable> {
  return fc.record({
    assignments: fc.dictionary(
      fc.string({ minLength: 1 }),
      fc.string({ minLength: 1 }),
      { minKeys: 0, maxKeys: 100 }
    )
  }).map(assignments => ({ 
    assignments: new Map(Object.entries(assignments)) 
  }));
}

function arbitraryValidTimetable(): fc.Arbitrary<Timetable> {
  return arbitraryTimetable().filter(isValidTimetable);
}
```

## Contract Testing

```typescript
describe('Contract Tests', () => {
  describe('Constraint Contract', () => {
    const testConstraintContract = <T>(
      constraint: Constraint<T>,
      arbitraryState: fc.Arbitrary<T>
    ) => {
      describe(`${constraint.name} contract`, () => {
        it('evaluate returns finite number', () => {
          fc.assert(
            fc.property(arbitraryState, (state) => {
              const score = constraint.evaluate(state);
              return Number.isFinite(score);
            })
          );
        });

        it('evaluate returns value in [0, 1]', () => {
          fc.assert(
            fc.property(arbitraryState, (state) => {
              const score = constraint.evaluate(state);
              return score >= 0 && score <= 1;
            })
          );
        });

        it('describe returns string or undefined', () => {
          if (!constraint.describe) return;
          
          fc.assert(
            fc.property(arbitraryState, (state) => {
              const description = constraint.describe!(state);
              return description === undefined || typeof description === 'string';
            })
          );
        });

        it('getViolations returns array of strings', () => {
          if (!constraint.getViolations) return;
          
          fc.assert(
            fc.property(arbitraryState, (state) => {
              const violations = constraint.getViolations!(state);
              return Array.isArray(violations) && 
                     violations.every(v => typeof v === 'string');
            })
          );
        });
      });
    };

    testConstraintContract(noOverlapConstraint, arbitraryTimetable());
    testConstraintContract(roomCapacityConstraint, arbitraryTimetable());
  });

  describe('MoveGenerator Contract', () => {
    const testMoveGeneratorContract = <T>(
      move: MoveGenerator<T>,
      arbitraryState: fc.Arbitrary<T>,
      cloneState: (s: T) => T
    ) => {
      describe(`${move.name} contract`, () => {
        it('canApply returns boolean', () => {
          fc.assert(
            fc.property(arbitraryState, (state) => {
              const result = move.canApply(state);
              return typeof result === 'boolean';
            })
          );
        });

        it('generate returns valid state when canApply is true', () => {
          fc.assert(
            fc.property(
              arbitraryState.filter(s => move.canApply(s)),
              fc.integer({ min: 0, max: 1000 }),
              (state, temp) => {
                const newState = move.generate(state, temp);
                return newState !== null && newState !== undefined;
              }
            )
          );
        });

        it('generate returns a usable state when given a solver-style clone', () => {
          fc.assert(
            fc.property(
              arbitraryState.filter(s => move.canApply(s)),
              fc.integer({ min: 0, max: 1000 }),
              (state, temp) => {
                const workingCopy = cloneState(state);
                const generated = move.generate(workingCopy, temp);
                return generated !== null && generated !== undefined;
              }
            )
          );
        });
      });
    };

    testMoveGeneratorContract(
      swapRoomsMove, 
      arbitraryValidTimetable(),
      deepClone
    );
  });
});
```

## Test Utilities

```typescript
// test-utils.ts

/**
 * Deep equality check for complex objects
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Deep clone function
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Generate random integer in range [min, max]
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Select random element from array
 */
export function randomElement<T>(array: T[]): T {
  return array[randomInt(0, array.length - 1)];
}

/**
 * Select random pair of distinct elements
 */
export function randomPair<T>(array: T[]): [T, T] {
  if (array.length < 2) {
    throw new Error('Array must have at least 2 elements');
  }
  
  const i = randomInt(0, array.length - 1);
  let j = randomInt(0, array.length - 1);
  while (j === i) {
    j = randomInt(0, array.length - 1);
  }
  
  return [array[i], array[j]];
}

/**
 * Calculate Hamming distance between two states
 */
export function calculateStateDistance<T>(
  state1: T, 
  state2: T
): number {
  const str1 = JSON.stringify(state1);
  const str2 = JSON.stringify(state2);
  
  let distance = 0;
  const maxLen = Math.max(str1.length, str2.length);
  
  for (let i = 0; i < maxLen; i++) {
    if (str1[i] !== str2[i]) {
      distance++;
    }
  }
  
  return distance;
}

/**
 * Assert that two states are equal
 */
export function expectStatesEqual<T>(
  actual: T, 
  expected: T, 
  message?: string
): void {
  expect(actual, message).toEqual(expected);
}

/**
 * Assert that constraint contract is satisfied
 */
export function expectValidConstraintScore(score: number): void {
  expect(Number.isFinite(score)).toBe(true);
  expect(score).toBeGreaterThanOrEqual(0);
  expect(score).toBeLessThanOrEqual(1);
}

/**
 * Generate test coverage report for constraints
 */
export function generateConstraintCoverageReport(
  constraints: Constraint<unknown>[]
): string {
  const lines = ['Constraint Coverage Report', '='.repeat(50)];
  
  for (const c of constraints) {
    lines.push(`\n${c.name} (${c.type})`);
    lines.push(`  - evaluate: implemented`);
    lines.push(`  - weight: ${c.weight ?? 'default (1.0)'}`);
    lines.push(`  - describe: ${c.describe ? 'implemented' : 'missing'}`);
    lines.push(`  - getViolations: ${c.getViolations ? 'implemented' : 'missing'}`);
  }
  
  return lines.join('\n');
}

/**
 * Async test wrapper with timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(message)), timeoutMs)
    )
  ]);
}
```

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- constraints.test.ts

# Run with coverage
npm test -- --coverage

# Run with performance profiling
node --prof node_modules/.bin/vitest run

# Generate coverage report
npm test -- --coverage --reporter=json > coverage.json
```

## CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run unit tests
        run: npm test
        
      - name: Generate coverage report
        run: npm test -- --coverage
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

## Summary

This testing guide provides comprehensive coverage of:

1. **Unit Testing**: Individual constraint and move generator validation
2. **Integration Testing**: Full solver workflows
3. **Property-Based Testing**: Generative testing with `fast-check`
4. **Performance Testing**: Benchmarks and scalability validation
5. **Contract Testing**: Interface compliance verification
6. **Test Utilities**: Helper functions for common testing tasks

Following these practices ensures robust, reliable optimization systems suitable for production deployment.
