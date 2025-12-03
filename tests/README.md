# Test Suite Documentation

## Overview

This directory contains comprehensive unit and integration tests for the `timetable-sa` library.

## Test Structure

```
tests/
├── core/                          # Core library unit tests
│   ├── SimulatedAnnealing.test.ts        # Main SA engine tests
│   ├── acceptance-probability.test.ts    # Acceptance logic tests
│   └── fitness-calculation.test.ts       # Fitness calculation tests
│
├── integration/                   # Integration tests
│   └── simple-timetabling.test.ts       # End-to-end timetabling tests
│
└── README.md                      # This file
```

## Test Categories

### Core Unit Tests

#### 1. `SimulatedAnnealing.test.ts`
Tests the main SA optimization engine:
- Initialization and configuration
- Optimization loop execution
- Constraint evaluation
- Solution quality
- Operator statistics tracking
- Reheating mechanism
- Edge cases

**Coverage:** ~140 test cases covering all major functionality

#### 2. `acceptance-probability.test.ts`
Tests the critical acceptance probability logic:
- Phase 1: Hard constraint elimination strategy
- Phase 2: Strict hard constraint preservation
- Temperature-dependent acceptance (Metropolis criterion)
- Phase transition behavior

**Coverage:** ~25 test cases focusing on acceptance logic correctness

#### 3. `fitness-calculation.test.ts`
Tests fitness calculation and weighting:
- Basic fitness calculation
- Hard vs soft constraint weighting
- Partial satisfaction handling
- Multiple constraint aggregation
- Violation counting accuracy

**Coverage:** ~30 test cases ensuring correct penalty calculation

### Integration Tests

#### 4. `simple-timetabling.test.ts`
End-to-end tests with realistic timetabling problems:
- Feasible problem solving
- Operator effectiveness
- Constraint satisfaction verification
- Performance characteristics
- Scalability with larger problems

**Coverage:** ~15 test cases validating real-world usage

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test File
```bash
npm test SimulatedAnnealing.test.ts
```

### Run with Coverage
```bash
npm run test:coverage
```

### Run in Watch Mode (for development)
```bash
npm run test:watch
```

### Run with Verbose Output
```bash
npm run test:verbose
```

## Test Coverage Goals

| Component | Current Target | Status |
|-----------|----------------|--------|
| Core Engine | 80% | ✅ |
| Constraints | 75% | ✅ |
| Move Generators | 70% | ✅ |
| Utilities | 60% | ✅ |
| **Overall** | **75%+** | ✅ |

## Writing New Tests

### Test File Template

```typescript
import { describe, it, expect } from '@jest/globals';
import { SimulatedAnnealing } from '../../src/core/SimulatedAnnealing.js';

describe('Your Feature', () => {
  describe('Sub-feature', () => {
    it('should do something specific', () => {
      // Arrange
      const state = createTestState();
      const constraints = [/* ... */];
      const moves = [/* ... */];
      const config = createConfig();

      // Act
      const solver = new SimulatedAnnealing(state, constraints, moves, config);
      const solution = solver.solve();

      // Assert
      expect(solution.hardViolations).toBe(0);
    });
  });
});
```

### Best Practices

1. **Use Descriptive Test Names**
   - Good: `should reject moves that increase hard violations in Phase 2`
   - Bad: `test phase 2`

2. **Follow AAA Pattern**
   - Arrange: Set up test data
   - Act: Execute the code under test
   - Assert: Verify the results

3. **Test One Thing at a Time**
   - Each test should verify one specific behavior
   - Avoid testing multiple scenarios in one test

4. **Use Helper Functions**
   - Create reusable state/config builders
   - Keep tests DRY (Don't Repeat Yourself)

5. **Test Edge Cases**
   - Empty states
   - Single item states
   - Very large values
   - Boundary conditions

## Test Naming Conventions

### Test Suites (describe blocks)
- Use noun phrases: `"Acceptance Probability Logic"`, `"Fitness Calculation"`
- Group related tests together

### Test Cases (it blocks)
- Use "should" statements: `"should calculate fitness correctly"`
- Be specific about expected behavior

## Handling Randomness

Since Simulated Annealing is stochastic, some tests may have inherent randomness. We handle this by:

1. **Testing Invariants**: Properties that should always hold regardless of randomness
   ```typescript
   expect(solution.hardViolations).toBe(0); // Must be 0 for feasible problems
   ```

2. **Testing Bounds**: Values should be within expected ranges
   ```typescript
   expect(solution.fitness).toBeGreaterThanOrEqual(0);
   expect(solution.fitness).toBeLessThan(initialFitness);
   ```

3. **Statistical Properties**: Run multiple times and check averages (for performance tests)

4. **Controlled Randomness**: Use deterministic move generators in unit tests

## Debugging Failed Tests

### Common Issues

1. **Timeout Errors**
   ```
   Error: Timeout - Async callback was not invoked within the 5000ms timeout
   ```
   Solution: Reduce `maxIterations` in test configs or increase Jest timeout

2. **Floating Point Precision**
   ```
   Expected: 10.5
   Received: 10.500000000000002
   ```
   Solution: Use `toBeCloseTo(expected, precision)` instead of `toBe()`

3. **Flaky Tests (pass/fail randomly)**
   - Likely caused by randomness in SA
   - Make assertions less strict or test invariants instead

### Debug Mode

Run tests with detailed logging:
```bash
npm run test:verbose -- SimulatedAnnealing.test.ts
```

## CI/CD Integration

These tests are automatically run on:
- Every push to the repository
- Every pull request
- Before publishing to NPM

The CI pipeline requires:
- All tests passing
- Coverage threshold met (75%+)
- No failing assertions

## Performance Benchmarks

Integration tests include basic performance benchmarks:
- Small problems (3-5 classes): < 1 second
- Medium problems (10-20 classes): < 5 seconds
- Large problems (50+ classes): < 30 seconds

These are rough guidelines and may vary based on:
- SA configuration (iterations, cooling rate)
- Problem complexity (number of constraints)
- Hardware performance

## Contributing

When contributing new features:

1. Write tests FIRST (TDD approach)
2. Ensure tests pass locally
3. Maintain or improve coverage
4. Update this README if adding new test categories

## Questions?

If you have questions about:
- Writing tests for new features
- Understanding existing tests
- Debugging test failures

Please open an issue on GitHub or check the main README.md.

---

**Last Updated:** 2025-12-03
**Test Framework:** Jest 30.x
**TypeScript:** 5.x
