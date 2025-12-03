# Documentation

Welcome to the **timetable-sa** documentation! This library provides a generic, unopinionated Simulated Annealing implementation for solving constraint satisfaction problems.

## Quick Navigation

### Getting Started
- **[Getting Started Guide](./getting-started.md)** - Your first program with timetable-sa
- **[Core Concepts](./core-concepts.md)** - Understanding states, constraints, and moves

### Configuration & Tuning
- **[Configuration Guide](./configuration.md)** - Detailed parameter tuning
- **[Advanced Features](./advanced-features.md)** - Two-phase optimization, reheating, adaptive operators

### Reference
- **[API Reference](./api-reference.md)** - Complete API documentation
- **[Examples](./examples.md)** - Complete working examples for common use cases

### Migration
- **[Migration Guide](./migration-guide.md)** - Migrating from v1.x to v2.0

## What is timetable-sa?

**timetable-sa** is a TypeScript library that uses Simulated Annealing to solve constraint-satisfaction and optimization problems. Unlike most SA libraries, it's completely generic - you can solve ANY optimization problem by defining:

1. Your **state** structure (how to represent a solution)
2. Your **constraints** (what makes a solution valid or desirable)
3. Your **move operators** (how to modify a solution)

## What Can You Build?

- **Timetabling**: University courses, school schedules, exam scheduling
- **Shift Scheduling**: Employee shifts, nurse rosters, security patrols
- **Resource Allocation**: Meeting rooms, equipment, vehicles
- **Planning**: Project tasks, delivery routes, production schedules
- **Graph Problems**: Coloring, frequency assignment
- **Packing**: Bin packing, container loading
- **And more**: Any problem with constraints and objectives

## Documentation Structure

### For Beginners

1. Start with [Getting Started](./getting-started.md)
2. Read [Core Concepts](./core-concepts.md)
3. Try the [Examples](./examples.md)

### For Advanced Users

1. Review [Configuration Guide](./configuration.md) for tuning
2. Explore [Advanced Features](./advanced-features.md)
3. Reference the [API Documentation](./api-reference.md)

### For v1.x Users

- Read the [Migration Guide](./migration-guide.md)

## Quick Example

```typescript
import { SimulatedAnnealing } from 'timetable-sa';
import type { Constraint, MoveGenerator, SAConfig } from 'timetable-sa';

// 1. Define your state
interface MyState {
  assignments: Array<{ task: string; worker: string; time: number }>;
}

// 2. Define constraints
class NoWorkerConflict implements Constraint<MyState> {
  name = 'No Worker Conflict';
  type = 'hard' as const;
  evaluate(state: MyState): number {
    // Return 1 if satisfied, 0 if violated
  }
}

// 3. Define move operators
class ChangeTime implements MoveGenerator<MyState> {
  name = 'Change Time';
  canApply(state: MyState): boolean { return true; }
  generate(state: MyState, temperature: number): MyState {
    // Return modified state
  }
}

// 4. Configure and solve
const solver = new SimulatedAnnealing(
  initialState,
  [new NoWorkerConflict()],
  [new ChangeTime()],
  {
    initialTemperature: 100,
    minTemperature: 0.01,
    coolingRate: 0.99,
    maxIterations: 10000,
    hardConstraintWeight: 1000,
    cloneState: (state) => JSON.parse(JSON.stringify(state)),
  }
);

const solution = solver.solve();
```

## Key Features

- **Two-Phase Optimization**: First satisfies hard constraints, then optimizes soft constraints
- **Adaptive Operator Selection**: Learns which move operators are most effective
- **Reheating**: Escapes local minima by temporarily increasing temperature
- **Type-Safe**: Full TypeScript support with generics
- **Comprehensive Logging**: Track progress and debug issues
- **Zero Dependencies**: Core library has no dependencies

## Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/albertabayor/simulated-annealing-university-timetabling-course-problem/issues)
- **Examples**: Check the `examples/` directory in the repository
- **Documentation**: You're reading it!

## Contributing

Contributions are welcome! Please open an issue or PR on GitHub.

## License

MIT

---

**Ready to get started?** → [Getting Started Guide](./getting-started.md)
