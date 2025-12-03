/**
 * @packageDocumentation
 * Generic Simulated Annealing Library for Constraint Satisfaction Problems
 *
 * A powerful, unopinionated optimization library that can solve ANY constraint-satisfaction
 * problem using Simulated Annealing algorithm.
 *
 * @example
 * ```typescript
 * import { SimulatedAnnealing } from 'timetable-sa';
 * import type { Constraint, MoveGenerator, SAConfig } from 'timetable-sa';
 *
 * // Define your state type
 * interface MyState {
 *   // ... your domain-specific state structure
 * }
 *
 * // Define constraints
 * const constraints: Constraint<MyState>[] = [
 *   // ... your hard and soft constraints
 * ];
 *
 * // Define move generators
 * const moveGenerators: MoveGenerator<MyState>[] = [
 *   // ... your move operators
 * ];
 *
 * // Configure the algorithm
 * const config: SAConfig<MyState> = {
 *   initialTemperature: 1000,
 *   minTemperature: 0.01,
 *   coolingRate: 0.995,
 *   maxIterations: 50000,
 *   hardConstraintWeight: 10000,
 *   cloneState: (state) => JSON.parse(JSON.stringify(state)),
 * };
 *
 * // Create solver and run optimization
 * const solver = new SimulatedAnnealing(initialState, constraints, moveGenerators, config);
 * const solution = solver.solve();
 *
 * console.log(`Fitness: ${solution.fitness}`);
 * console.log(`Iterations: ${solution.iterations}`);
 * ```
 */
export { SimulatedAnnealing } from './core/index.js';
export type { Constraint, MoveGenerator, SAConfig, LoggingConfig, Solution, OperatorStats, Violation, } from './core/index.js';
//# sourceMappingURL=index.d.ts.map