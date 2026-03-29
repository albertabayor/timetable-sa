# Documentation

Complete technical documentation for `timetable-sa` - a production-grade, generic Simulated Annealing optimization library for TypeScript.

## Overview

This documentation provides comprehensive coverage of the `timetable-sa` package, organized to support practitioners at all levels—from first-time users to advanced researchers implementing domain-specific optimization systems. The reference sections are aligned with the current implementation in `src/` so the docs can be used as an operational source of truth, not only as conceptual guidance.

### Documentation Philosophy

this documentation prioritizes:

- **Completeness**: Every public API, configuration option, and internal mechanism documented
- **Precision**: Technical accuracy with mathematical formalism where appropriate
- **Practicality**: Working examples, configuration profiles, and troubleshooting guidance
- **Extensibility**: Clear extension points for custom constraints, move generators, and policies

## Documentation Workflows

The documentation is structured around three primary user journeys:

### 1. Learn

Get started with the fundamentals and build your first working optimizer.

- **[Introduction](./introduction.md)** - Library overview, capabilities, and design philosophy
- **[Installation](./installation.md)** - Setup instructions for Node.js and Bun environments
- **[Quick Start](./quickstart.md)** - Complete 5-step walkthrough from state to solution
- **[Core Concepts](./core-concepts.md)** - Essential concepts: constraints, moves, fitness, phases, tabu search

**Time to first solution**: ~15 minutes

### 2. Configure

Tune solver behavior for production workloads and specific problem domains.

- **[Configuration Guide](./configuration.md)** - Complete configuration reference with tuning strategies
- **[Algorithm and Runtime Behavior](./advanced-features.md)** - Deep dive into phase lifecycles, acceptance rules, and reheating
- **[Examples](./examples.md)** - Domain-specific implementations and patterns
- **[Testing Guide](./testing-guide.md)** - Comprehensive testing strategies for constraints, moves, and solver configurations

**Recommended for**: Production deployments, performance tuning, custom implementations

### 3. Integrate

Understand internals for advanced customization and system integration.

- **[Internal Architecture](./architecture.md)** - System design, component interactions, and extension points
- **[API Reference](./api-reference.md)** - Complete API documentation with TypeScript signatures
- **[Migration Guide](./migration-guide.md)** - Version migration instructions
- **[Troubleshooting](./troubleshooting.md)** - Common issues and diagnostic procedures

**Recommended for**: Library contributors, framework builders, research applications

## Quick Navigation

### By Task

| Task | Documentation |
|------|---------------|
| First-time setup | [Installation](./installation.md) → [Quick Start](./quickstart.md) |
| Understanding concepts | [Introduction](./introduction.md) → [Core Concepts](./core-concepts.md) |
| Configuring solver | [Configuration Guide](./configuration.md) → [Advanced Features](./advanced-features.md) |
| Writing constraints | [Core Concepts](./core-concepts.md#constraints) → [API Reference](./api-reference.md#constrainttstate) → [Testing Guide](./testing-guide.md#unit-testing-constraints) |
| Writing move generators | [Core Concepts](./core-concepts.md#move-generators) → [API Reference](./api-reference.md#movegeneratortstate) → [Testing Guide](./testing-guide.md#unit-testing-move-generators) |
| Testing implementation | [Testing Guide](./testing-guide.md) |
| Debugging issues | [Troubleshooting](./troubleshooting.md) |
| Optimizing performance | [Configuration Guide](./configuration.md) → [Advanced Features](./advanced-features.md) |
| Understanding internals | [Internal Architecture](./architecture.md) |
| API details | [API Reference](./api-reference.md) |

### By Experience Level

**Beginner (New to optimization)**
1. [Introduction](./introduction.md)
2. [Installation](./installation.md)
3. [Quick Start](./quickstart.md)
4. [Core Concepts](./core-concepts.md)

**Intermediate (Building production systems)**
1. [Configuration Guide](./configuration.md)
2. [Advanced Features](./advanced-features.md)
3. [Testing Guide](./testing-guide.md)
4. [Examples](./examples.md)

**Advanced (Research and extension)**
1. [Internal Architecture](./architecture.md)
2. [API Reference](./api-reference.md)
3. Source code (TypeScript with comprehensive JSDoc)

## Reference Materials

### Configuration Profiles

Pre-configured parameter sets for common scenarios (from [Configuration Guide](./configuration.md)):

- **Quick Start**: Rapid prototyping, small problems
- **Quality**: Production optimization, high-quality solutions
- **Fast**: Time-constrained scenarios
- **Custom**: User-defined parameters

### Mathematical Foundations

Key algorithms and mathematical concepts:

- **Simulated Annealing**: Boltzmann acceptance probability, geometric cooling
- **Tabu Search**: Short-term memory with aspiration criteria
- **Adaptive Operator Selection**: Hybrid and roulette-wheel strategies
- **Multi-phase Optimization**: Phase 1 (hard), Phase 1.5 (intensification), Phase 2 (soft)

See [Advanced Features](./advanced-features.md) and [Internal Architecture](./architecture.md) for formal specifications.

## Contributing to Documentation

When contributing to this documentation:

1. **Keep it accurate**: Test all code examples before submitting
2. **Be precise**: Use exact TypeScript types and API signatures
3. **Include context**: Explain *why*, not just *how*
4. **Maintain consistency**: Follow existing formatting and structure
5. **Consider the audience**: Tailor technical depth to the intended reader

## Document Conventions

### Code Examples

All code examples are:
- **Runnable**: Can be copied and executed with minimal modification
- **Complete**: Include necessary imports and type definitions
- **Type-safe**: Valid TypeScript with proper type annotations
- **Practical**: Derived from real-world use cases

### Mathematical Notation

Mathematical descriptions use:
- **Pseudocode**: Clear algorithmic descriptions
- **Formal notation**: Set theory, probability, and optimization notation where appropriate
- **Complexity analysis**: Big-O notation for performance characteristics

### Cross-References

Related documentation is linked:
- Inline links: `[Configuration Guide](./configuration.md)`
- Section anchors: `[API Reference](./api-reference.md#constrainttstate)`
- See also sections at document conclusions

## Getting Help

If you can't find what you need:

1. Check [Troubleshooting](./troubleshooting.md) for common issues
2. Review [Examples](./examples.md) for similar use cases
3. Read the source code (extensively commented JSDoc)

---

**Documentation Version**: 1.0.0  
**Last Updated**: March 2026  
**Maintainer**: Benjamin Naphtali
