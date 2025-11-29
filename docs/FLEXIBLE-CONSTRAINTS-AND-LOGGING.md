# Flexible Constraints and Logging

This document explains the flexible constraint system and logging features added to the timetable scheduler.

## Table of Contents

1. [Overview](#overview)
2. [Flexible Constraints](#flexible-constraints)
   - [Enable/Disable Built-in Constraints](#enabledisable-built-in-constraints)
   - [Custom Constraints](#custom-constraints)
3. [Logging System](#logging-system)
4. [Examples](#examples)
5. [API Reference](#api-reference)

---

## Overview

The flexible constraints and logging system allows you to:

- **Enable/disable any built-in hard or soft constraint**
- **Add custom constraints** (both hard and soft)
- **Configure logging** to console and/or file
- **Control log levels** (debug, info, warn, error, none)
- **Track algorithm progress** with detailed logs

All features are **backward compatible** - if you don't configure anything, the system works exactly as before.

---

## Flexible Constraints

### Enable/Disable Built-in Constraints

You can selectively enable or disable any of the 10 hard constraints and 8 soft constraints.

#### Hard Constraints

| Constraint ID | Name | Description | Default |
|---------------|------|-------------|---------|
| `lecturerConflict` | HC1 | No lecturer can teach two classes simultaneously | `true` |
| `roomConflict` | HC2 | No two classes can use same room at same time | `true` |
| `roomCapacity` | HC3 | Room capacity must accommodate all participants | `true` |
| `prodiConflict` | HC5 | Same program can't have overlapping classes | `true` |
| `maxDailyPeriods` | HC7 | Lecturer cannot exceed max daily teaching periods | `true` |
| `classTypeTime` | HC8 | Morning/evening classes must match time slots | `true` |
| `saturdayRestriction` | HC9 | Only Magister Manajemen allowed on Saturday | `true` |
| `fridayTimeRestriction` | HC10 | Cannot start at 11:00, 12:00, 13:00 on Friday | `true` |
| `prayerTimeStart` | HC11 | Classes cannot start during prayer times | `true` |
| `exclusiveRoom` | HC12 | Certain rooms reserved for specific courses | `true` |

#### Soft Constraints

| Constraint ID | Name | Description | Default |
|---------------|------|-------------|---------|
| `preferredTime` | SC1 | Prefer lecturer's preferred time slots | `true` |
| `preferredRoom` | SC2 | Prefer lecturer's preferred room | `true` |
| `transitTime` | SC3 | Ensure sufficient transit time between classes | `true` |
| `compactness` | SC4 | Prefer compact schedules with minimal gaps | `true` |
| `prayerTimeOverlap` | SC5 | Minimize prayer time overlaps | `true` |
| `eveningClassPriority` | SC6 | Evening classes should start at preferred times | `true` |
| `overflowPenalty` | SC7 | Penalty for non-lab classes using lab rooms | `true` |
| `researchDay` | SC8 | Avoid scheduling on lecturer's research day | `true` |

#### Example: Disable Specific Constraints

```typescript
import { SimulatedAnnealing } from 'timetable-sa';

const solver = new SimulatedAnnealing(rooms, lecturers, classes, {
  constraints: {
    hardConstraints: {
      saturdayRestriction: false,  // Allow any program on Saturday
      fridayTimeRestriction: false, // Allow classes at any time on Friday
    },
    softConstraints: {
      preferredRoom: false,  // Don't optimize for preferred rooms
      researchDay: false,    // Don't avoid research days
    },
  },
});

const solution = solver.solve();
```

### Custom Constraints

You can add your own custom hard or soft constraints using simple functions.

#### Custom Hard Constraint

Hard constraints must return `boolean` (`true` = satisfied, `false` = violated).

```typescript
import { CustomConstraint, ScheduleEntry, Room, Lecturer } from 'timetable-sa';

// Example: No math classes after 2 PM
const noLateMathConstraint: CustomConstraint = {
  name: "No Late Math Classes",
  description: "Mathematics classes cannot start after 14:00",
  type: "hard",
  checkFunction: (schedule, entry, rooms, lecturers) => {
    // Only check math-related classes
    if (!entry.className.toLowerCase().includes('math')) {
      return true; // Constraint doesn't apply
    }

    const [hour] = entry.timeSlot.startTime.split(':').map(Number);
    return hour! < 14; // Must start before 2 PM
  },
};

// Use the custom constraint
const solver = new SimulatedAnnealing(rooms, lecturers, classes, {
  constraints: {
    customConstraints: [noLateMathConstraint],
  },
});
```

#### Custom Soft Constraint

Soft constraints must return a `number` between `0` and `1` (`1` = perfect, `0` = worst).

```typescript
// Example: Prefer morning classes for undergraduate programs
const undergraduateMorningPreference: CustomConstraint = {
  name: "Undergraduate Morning Preference",
  description: "Undergraduate classes should preferably be in the morning",
  type: "soft",
  weight: 15, // Penalty weight
  checkFunction: (schedule, entry, rooms, lecturers) => {
    // Check if this is an undergraduate program
    const isUndergrad = !entry.prodi.toLowerCase().includes('magister');

    if (!isUndergrad) {
      return 1; // Constraint doesn't apply
    }

    // Check if it's a morning time slot
    const [hour] = entry.timeSlot.startTime.split(':').map(Number);

    if (hour! < 12) {
      return 1.0;  // Perfect: morning class
    } else if (hour! < 15) {
      return 0.7;  // OK: early afternoon
    } else {
      return 0.3;  // Poor: late afternoon/evening
    }
  },
};

const solver = new SimulatedAnnealing(rooms, lecturers, classes, {
  constraints: {
    customConstraints: [undergraduateMorningPreference],
  },
});
```

#### Combining Multiple Custom Constraints

```typescript
const solver = new SimulatedAnnealing(rooms, lecturers, classes, {
  constraints: {
    customConstraints: [
      noLateMathConstraint,
      undergraduateMorningPreference,
      // Add more custom constraints here
    ],
  },
});
```

---

## Logging System

The logging system provides detailed insights into the algorithm's execution.

### Configuration Options

```typescript
interface LoggingConfig {
  enabled?: boolean;           // Enable/disable logging (default: false)
  level?: LogLevel;            // 'debug' | 'info' | 'warn' | 'error' | 'none' (default: 'info')
  output?: LogOutput;          // 'console' | 'file' | 'both' (default: 'console')
  filePath?: string;           // Log file path (default: './timetable-scheduler.log')
  includeTimestamp?: boolean;  // Include timestamps (default: true)
  includeLevel?: boolean;      // Include log level labels (default: true)
}
```

### Log Levels

- `debug`: Detailed information for debugging (fitness calculations, progress updates)
- `info`: General informational messages (phase transitions, completion)
- `warn`: Warning messages
- `error`: Error messages
- `none`: Disable all logging

### Examples

#### Console Logging Only

```typescript
const solver = new SimulatedAnnealing(rooms, lecturers, classes, {
  logging: {
    enabled: true,
    level: 'info',
    output: 'console',
  },
});
```

#### File Logging Only

```typescript
const solver = new SimulatedAnnealing(rooms, lecturers, classes, {
  logging: {
    enabled: true,
    level: 'debug',
    output: 'file',
    filePath: './logs/schedule-optimization.log',
  },
});
```

#### Both Console and File

```typescript
const solver = new SimulatedAnnealing(rooms, lecturers, classes, {
  logging: {
    enabled: true,
    level: 'info',
    output: 'both',
    filePath: './logs/schedule.log',
    includeTimestamp: true,
    includeLevel: true,
  },
});
```

### What Gets Logged

The logger captures:

- **Initialization**: Algorithm configuration and parameters
- **Initial solution**: Fitness, hard violations, schedule size
- **Phase transitions**: Phase 1 (hard constraints) → Phase 2 (soft constraints)
- **Progress updates**: Fitness values, violations, temperature (debug level)
- **Operator statistics**: Success rates for MOVE and SWAP operators
- **Final results**: Best fitness, total iterations, violation report

---

## Examples

### Example 1: Custom Scheduling Rules

```typescript
import { SimulatedAnnealing, CustomConstraint } from 'timetable-sa';

// Custom rule: Lab classes must be on Monday, Wednesday, or Friday
const labDayRestriction: CustomConstraint = {
  name: "Lab Day Restriction",
  description: "Lab classes must be scheduled on Mon, Wed, or Fri",
  type: "hard",
  checkFunction: (schedule, entry, rooms, lecturers) => {
    if (!entry.needsLab) return true;

    const allowedDays = ['Monday', 'Wednesday', 'Friday'];
    return allowedDays.includes(entry.timeSlot.day);
  },
};

// Custom rule: Prefer to group classes for the same lecturer on consecutive days
const lecturerDayGrouping: CustomConstraint = {
  name: "Lecturer Day Grouping",
  description: "Group same lecturer's classes on consecutive days",
  type: "soft",
  weight: 12,
  checkFunction: (schedule, entry, rooms, lecturers) => {
    // Count how many different days this lecturer teaches
    const lecturerClasses = schedule.filter(s =>
      s.lecturers.some(l => entry.lecturers.includes(l))
    );

    const uniqueDays = new Set(lecturerClasses.map(c => c.timeSlot.day));
    uniqueDays.add(entry.timeSlot.day);

    // Fewer days = better score
    const dayCount = uniqueDays.size;
    if (dayCount <= 2) return 1.0;
    if (dayCount === 3) return 0.7;
    if (dayCount === 4) return 0.4;
    return 0.2;
  },
};

const solver = new SimulatedAnnealing(rooms, lecturers, classes, {
  constraints: {
    customConstraints: [labDayRestriction, lecturerDayGrouping],
  },
  logging: {
    enabled: true,
    level: 'info',
    output: 'both',
    filePath: './custom-schedule.log',
  },
});

const solution = solver.solve();
```

### Example 2: Minimal Constraints for Maximum Flexibility

```typescript
// Disable most constraints for a very flexible schedule
const solver = new SimulatedAnnealing(rooms, lecturers, classes, {
  constraints: {
    hardConstraints: {
      // Keep only the most critical constraints
      lecturerConflict: true,
      roomConflict: true,
      roomCapacity: true,
      // Disable all others
      prodiConflict: false,
      maxDailyPeriods: false,
      classTypeTime: false,
      saturdayRestriction: false,
      fridayTimeRestriction: false,
      prayerTimeStart: false,
      exclusiveRoom: false,
    },
    softConstraints: {
      // Disable all soft constraints for maximum speed
      preferredTime: false,
      preferredRoom: false,
      transitTime: false,
      compactness: false,
      prayerTimeOverlap: false,
      eveningClassPriority: false,
      overflowPenalty: false,
      researchDay: false,
    },
  },
});
```

---

## API Reference

### AlgorithmConfig Interface

```typescript
interface AlgorithmConfig {
  // Existing algorithm parameters
  initialTemperature?: number;
  minTemperature?: number;
  coolingRate?: number;
  maxIterations?: number;
  // ... other parameters

  // NEW: Constraint configuration
  constraints?: ConstraintsConfig;

  // NEW: Logging configuration
  logging?: LoggingConfig;
}
```

### ConstraintsConfig Interface

```typescript
interface ConstraintsConfig {
  hardConstraints?: HardConstraintsConfig;
  softConstraints?: SoftConstraintsConfig;
  customConstraints?: CustomConstraint[];
}
```

### CustomConstraint Interface

```typescript
interface CustomConstraint {
  name: string;
  description: string;
  type: "hard" | "soft";
  weight?: number;  // Only for soft constraints
  checkFunction: CustomHardConstraintFunction | CustomSoftConstraintFunction;
}

type CustomHardConstraintFunction = (
  schedule: ScheduleEntry[],
  entry: ScheduleEntry,
  rooms: Map<string, Room>,
  lecturers: Map<string, Lecturer>
) => boolean;  // true = satisfied, false = violated

type CustomSoftConstraintFunction = (
  schedule: ScheduleEntry[],
  entry: ScheduleEntry,
  rooms: Map<string, Room>,
  lecturers: Map<string, Lecturer>
) => number;  // 0-1 score (1 = perfect, 0 = worst)
```

---

## Backward Compatibility

All features are **fully backward compatible**:

- If you don't provide any constraint configuration, all built-in constraints remain enabled
- If you don't provide logging configuration, logging is disabled by default
- Existing code works without any modifications

```typescript
// This still works exactly as before
const solver = new SimulatedAnnealing(rooms, lecturers, classes);
const solution = solver.solve();
```

---

## Tips and Best Practices

1. **Start with defaults**: Begin with all constraints enabled, then disable specific ones as needed
2. **Test custom constraints**: Always test custom constraints with small datasets first
3. **Use appropriate weights**: For soft constraints, higher weights = stronger penalties
4. **Log during development**: Enable debug logging when developing custom constraints
5. **Profile performance**: Custom constraints are called thousands of times - keep them fast
6. **Document your rules**: Add clear descriptions to custom constraints

---

## Troubleshooting

### Custom Constraint Not Working

- Check that `checkFunction` signature matches the expected type
- For hard constraints: ensure it returns `boolean`
- For soft constraints: ensure it returns a number between `0` and `1`
- Enable debug logging to see constraint violations

### Log File Not Created

- Check that the directory exists (create it manually if needed)
- Verify file path permissions
- Ensure `logging.enabled` is `true`

### Performance Issues

- Reduce custom constraint complexity
- Use debug logging sparingly in production
- Consider disabling non-critical soft constraints

---

## Support

For issues or questions about flexible constraints and logging, please open an issue on GitHub.
