# Examples and Tutorials

This guide provides complete, working examples for common use cases.

## Table of Contents

- [University Timetabling](#university-timetabling)
- [Employee Shift Scheduling](#employee-shift-scheduling)
- [Meeting Room Allocation](#meeting-room-allocation)
- [Graph Coloring](#graph-coloring)
- [Job Shop Scheduling](#job-shop-scheduling)

## University Timetabling

Complete example of a university course scheduling system.

### Problem Description

Schedule university classes with:
- Multiple rooms with different capacities
- Lecturers who teach multiple classes
- Programs (Prodi) that cannot have overlapping classes
- Time slot preferences
- Room capacity constraints

### State Definition

```typescript
interface TimetableState {
  schedule: ScheduleEntry[];
  rooms: Room[];
  lecturers: Lecturer[];
  classes: Class[];
}

interface ScheduleEntry {
  classId: string;
  roomId: string;
  day: string;      // 'Monday', 'Tuesday', etc.
  startTime: string; // '08:00', '09:30', etc.
  duration: number;  // minutes
}

interface Room {
  id: string;
  name: string;
  capacity: number;
  building: string;
}

interface Lecturer {
  id: string;
  name: string;
}

interface Class {
  id: string;
  name: string;
  lecturerId: string;
  prodiId: string;
  studentCount: number;
  duration: number;
}
```

### Hard Constraints

```typescript
// 1. No room conflicts
class NoRoomConflict implements Constraint<TimetableState> {
  name = 'No Room Conflict';
  type = 'hard' as const;

  evaluate(state: TimetableState): number {
    const conflicts = new Set<number>();

    for (let i = 0; i < state.schedule.length; i++) {
      for (let j = i + 1; j < state.schedule.length; j++) {
        const a = state.schedule[i];
        const b = state.schedule[j];

        if (a.roomId === b.roomId && a.day === b.day) {
          if (this.timesOverlap(a, b)) {
            conflicts.add(i);
          }
        }
      }
    }

    return conflicts.size === 0 ? 1 : 0;
  }

  private timesOverlap(a: ScheduleEntry, b: ScheduleEntry): boolean {
    const aStart = this.timeToMinutes(a.startTime);
    const aEnd = aStart + a.duration;
    const bStart = this.timeToMinutes(b.startTime);
    const bEnd = bStart + b.duration;

    return aStart < bEnd && bStart < aEnd;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  getViolations(state: TimetableState): string[] {
    const violations: string[] = [];

    for (let i = 0; i < state.schedule.length; i++) {
      for (let j = i + 1; j < state.schedule.length; j++) {
        const a = state.schedule[i];
        const b = state.schedule[j];

        if (a.roomId === b.roomId && a.day === b.day && this.timesOverlap(a, b)) {
          const classA = state.classes.find(c => c.id === a.classId)!;
          const classB = state.classes.find(c => c.id === b.classId)!;
          violations.push(
            `Room ${a.roomId} on ${a.day} at ${a.startTime}: ` +
            `${classA.name} conflicts with ${classB.name}`
          );
        }
      }
    }

    return violations;
  }
}

// 2. No lecturer conflicts
class NoLecturerConflict implements Constraint<TimetableState> {
  name = 'No Lecturer Conflict';
  type = 'hard' as const;

  evaluate(state: TimetableState): number {
    const conflicts = new Set<number>();

    for (let i = 0; i < state.schedule.length; i++) {
      for (let j = i + 1; j < state.schedule.length; j++) {
        const classA = this.getClass(state.schedule[i].classId, state);
        const classB = this.getClass(state.schedule[j].classId, state);

        if (classA.lecturerId === classB.lecturerId) {
          const a = state.schedule[i];
          const b = state.schedule[j];

          if (a.day === b.day && this.timesOverlap(a, b)) {
            conflicts.add(i);
          }
        }
      }
    }

    return conflicts.size === 0 ? 1 : 0;
  }

  private getClass(classId: string, state: TimetableState): Class {
    return state.classes.find(c => c.id === classId)!;
  }

  private timesOverlap(a: ScheduleEntry, b: ScheduleEntry): boolean {
    // Same as above
  }
}

// 3. Room capacity sufficient
class RoomCapacity implements Constraint<TimetableState> {
  name = 'Room Capacity';
  type = 'hard' as const;

  evaluate(state: TimetableState): number {
    for (const entry of state.schedule) {
      const room = state.rooms.find(r => r.id === entry.roomId)!;
      const classInfo = state.classes.find(c => c.id === entry.classId)!;

      if (room.capacity < classInfo.studentCount) {
        return 0;
      }
    }

    return 1;
  }

  getViolations(state: TimetableState): string[] {
    const violations: string[] = [];

    for (const entry of state.schedule) {
      const room = state.rooms.find(r => r.id === entry.roomId)!;
      const classInfo = state.classes.find(c => c.id === entry.classId)!;

      if (room.capacity < classInfo.studentCount) {
        violations.push(
          `Room ${room.name} (capacity ${room.capacity}) too small for ` +
          `${classInfo.name} (${classInfo.studentCount} students)`
        );
      }
    }

    return violations;
  }
}
```

### Soft Constraints

```typescript
// 1. Prefer morning slots
class PreferMorningSlots implements Constraint<TimetableState> {
  name = 'Prefer Morning Slots';
  type = 'soft' as const;
  weight = 10;

  evaluate(state: TimetableState): number {
    let morningCount = 0;

    for (const entry of state.schedule) {
      const hour = parseInt(entry.startTime.split(':')[0]);
      if (hour < 12) morningCount++;
    }

    return morningCount / state.schedule.length;
  }
}

// 2. Minimize gaps between classes
class MinimizeGaps implements Constraint<TimetableState> {
  name = 'Minimize Gaps';
  type = 'soft' as const;
  weight = 20;

  evaluate(state: TimetableState): number {
    const avgGapSize = this.calculateAverageGap(state);
    const maxAcceptableGap = 120; // minutes

    if (avgGapSize === 0) return 1.0;
    if (avgGapSize >= maxAcceptableGap) return 0.0;

    return 1.0 - (avgGapSize / maxAcceptableGap);
  }

  private calculateAverageGap(state: TimetableState): number {
    // Group by lecturer and day
    const lecturerSchedules = new Map<string, ScheduleEntry[]>();

    for (const entry of state.schedule) {
      const classInfo = state.classes.find(c => c.id === entry.classId)!;
      const key = `${classInfo.lecturerId}-${entry.day}`;

      if (!lecturerSchedules.has(key)) {
        lecturerSchedules.set(key, []);
      }
      lecturerSchedules.get(key)!.push(entry);
    }

    let totalGap = 0;
    let gapCount = 0;

    // Calculate gaps for each lecturer-day combination
    for (const entries of lecturerSchedules.values()) {
      if (entries.length < 2) continue;

      // Sort by time
      entries.sort((a, b) => {
        const aMinutes = this.timeToMinutes(a.startTime);
        const bMinutes = this.timeToMinutes(b.startTime);
        return aMinutes - bMinutes;
      });

      // Calculate gaps
      for (let i = 0; i < entries.length - 1; i++) {
        const endTime = this.timeToMinutes(entries[i].startTime) + entries[i].duration;
        const nextStartTime = this.timeToMinutes(entries[i + 1].startTime);
        const gap = nextStartTime - endTime;

        if (gap > 0) {
          totalGap += gap;
          gapCount++;
        }
      }
    }

    return gapCount > 0 ? totalGap / gapCount : 0;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
}
```

### Move Generators

```typescript
// 1. Change time slot
class ChangeTimeSlot implements MoveGenerator<TimetableState> {
  name = 'Change Time Slot';

  private timeSlots = [
    '08:00', '09:30', '11:00', '13:00', '14:30', '16:00'
  ];
  private days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  canApply(state: TimetableState): boolean {
    return state.schedule.length > 0;
  }

  generate(state: TimetableState, temperature: number): TimetableState {
    const newState = this.cloneState(state);

    const randomIndex = Math.floor(Math.random() * newState.schedule.length);
    newState.schedule[randomIndex].day = this.days[Math.floor(Math.random() * this.days.length)];
    newState.schedule[randomIndex].startTime = this.timeSlots[Math.floor(Math.random() * this.timeSlots.length)];

    return newState;
  }

  private cloneState(state: TimetableState): TimetableState {
    return {
      ...state,
      schedule: state.schedule.map(e => ({ ...e })),
    };
  }
}

// 2. Change room
class ChangeRoom implements MoveGenerator<TimetableState> {
  name = 'Change Room';

  canApply(state: TimetableState): boolean {
    return state.schedule.length > 0 && state.rooms.length > 0;
  }

  generate(state: TimetableState, temperature: number): TimetableState {
    const newState = this.cloneState(state);

    const randomIndex = Math.floor(Math.random() * newState.schedule.length);
    const randomRoom = state.rooms[Math.floor(Math.random() * state.rooms.length)];
    newState.schedule[randomIndex].roomId = randomRoom.id;

    return newState;
  }

  private cloneState(state: TimetableState): TimetableState {
    return {
      ...state,
      schedule: state.schedule.map(e => ({ ...e })),
    };
  }
}

// 3. Swap two classes
class SwapClasses implements MoveGenerator<TimetableState> {
  name = 'Swap Classes';

  canApply(state: TimetableState): boolean {
    return state.schedule.length >= 2;
  }

  generate(state: TimetableState, temperature: number): TimetableState {
    const newState = this.cloneState(state);

    const i = Math.floor(Math.random() * newState.schedule.length);
    let j = Math.floor(Math.random() * newState.schedule.length);
    while (j === i) j = Math.floor(Math.random() * newState.schedule.length);

    // Swap time slots and rooms
    const tempDay = newState.schedule[i].day;
    const tempTime = newState.schedule[i].startTime;
    const tempRoom = newState.schedule[i].roomId;

    newState.schedule[i].day = newState.schedule[j].day;
    newState.schedule[i].startTime = newState.schedule[j].startTime;
    newState.schedule[i].roomId = newState.schedule[j].roomId;

    newState.schedule[j].day = tempDay;
    newState.schedule[j].startTime = tempTime;
    newState.schedule[j].roomId = tempRoom;

    return newState;
  }

  private cloneState(state: TimetableState): TimetableState {
    return {
      ...state,
      schedule: state.schedule.map(e => ({ ...e })),
    };
  }
}
```

### Complete Example

```typescript
import { SimulatedAnnealing } from 'timetable-sa';
import type { SAConfig } from 'timetable-sa';

// Create initial state (can be random)
function createInitialState(): TimetableState {
  const rooms: Room[] = [
    { id: 'R1', name: 'Room A', capacity: 50, building: 'Main' },
    { id: 'R2', name: 'Room B', capacity: 30, building: 'Main' },
    { id: 'R3', name: 'Lab 1', capacity: 25, building: 'Lab' },
  ];

  const lecturers: Lecturer[] = [
    { id: 'L1', name: 'Dr. Smith' },
    { id: 'L2', name: 'Prof. Johnson' },
    { id: 'L3', name: 'Dr. Williams' },
  ];

  const classes: Class[] = [
    { id: 'C1', name: 'Math 101', lecturerId: 'L1', prodiId: 'P1', studentCount: 40, duration: 90 },
    { id: 'C2', name: 'Physics 101', lecturerId: 'L2', prodiId: 'P1', studentCount: 35, duration: 90 },
    { id: 'C3', name: 'CS 101', lecturerId: 'L3', prodiId: 'P2', studentCount: 20, duration: 90 },
    // ... more classes
  ];

  // Create random initial schedule
  const schedule: ScheduleEntry[] = classes.map(cls => ({
    classId: cls.id,
    roomId: rooms[Math.floor(Math.random() * rooms.length)].id,
    day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'][Math.floor(Math.random() * 5)],
    startTime: ['08:00', '09:30', '11:00', '13:00', '14:30'][Math.floor(Math.random() * 5)],
    duration: cls.duration,
  }));

  return { schedule, rooms, lecturers, classes };
}

// Set up and solve
const initialState = createInitialState();

const constraints = [
  // Hard constraints
  new NoRoomConflict(),
  new NoLecturerConflict(),
  new RoomCapacity(),

  // Soft constraints
  new PreferMorningSlots(),
  new MinimizeGaps(),
];

const moveGenerators = [
  new ChangeTimeSlot(),
  new ChangeRoom(),
  new SwapClasses(),
];

const config: SAConfig<TimetableState> = {
  initialTemperature: 1000,
  minTemperature: 0.01,
  coolingRate: 0.995,
  maxIterations: 50000,
  hardConstraintWeight: 10000,
  cloneState: (state) => ({
    ...state,
    schedule: state.schedule.map(e => ({ ...e })),
  }),
  reheatingThreshold: 2000,
  reheatingFactor: 2.0,
  maxReheats: 3,
  logging: {
    level: 'info',
    logInterval: 1000,
  },
};

const solver = new SimulatedAnnealing(initialState, constraints, moveGenerators, config);
const solution = solver.solve();

// Check results
console.log('=== RESULTS ===');
console.log('Hard violations:', solution.hardViolations);
console.log('Soft violations:', solution.softViolations);
console.log('Fitness:', solution.fitness);
console.log('Iterations:', solution.iterations);

if (solution.hardViolations === 0) {
  console.log('\n✓ Valid timetable found!');

  // Print schedule
  for (const entry of solution.state.schedule) {
    const classInfo = solution.state.classes.find(c => c.id === entry.classId)!;
    const room = solution.state.rooms.find(r => r.id === entry.roomId)!;
    console.log(`${classInfo.name}: ${entry.day} ${entry.startTime} in ${room.name}`);
  }
} else {
  console.log('\n✗ Could not find valid timetable');
  console.log('Violations:', solution.violations);
}
```

## Employee Shift Scheduling

Schedule employee shifts with preferences and constraints.

```typescript
interface ShiftState {
  assignments: ShiftAssignment[];
  employees: Employee[];
  shifts: Shift[];
}

interface ShiftAssignment {
  shiftId: string;
  employeeId: string;
}

interface Employee {
  id: string;
  name: string;
  maxHoursPerWeek: number;
  unavailableDays: string[];
}

interface Shift {
  id: string;
  day: string;
  startTime: string;
  duration: number; // hours
  requiredSkill: string;
}

// Hard constraint: No employee works more than max hours
class MaxHoursPerWeek implements Constraint<ShiftState> {
  name = 'Max Hours Per Week';
  type = 'hard' as const;

  evaluate(state: ShiftState): number {
    for (const employee of state.employees) {
      const totalHours = this.calculateHours(employee.id, state);
      if (totalHours > employee.maxHoursPerWeek) {
        return 0;
      }
    }
    return 1;
  }

  private calculateHours(employeeId: string, state: ShiftState): number {
    let hours = 0;
    for (const assignment of state.assignments) {
      if (assignment.employeeId === employeeId) {
        const shift = state.shifts.find(s => s.id === assignment.shiftId)!;
        hours += shift.duration;
      }
    }
    return hours;
  }
}

// Soft constraint: Balance workload
class BalanceWorkload implements Constraint<ShiftState> {
  name = 'Balance Workload';
  type = 'soft' as const;
  weight = 15;

  evaluate(state: ShiftState): number {
    const hours = state.employees.map(e => this.calculateHours(e.id, state));
    const avg = hours.reduce((a, b) => a + b, 0) / hours.length;
    const variance = hours.reduce((sum, h) => sum + Math.pow(h - avg, 2), 0) / hours.length;
    const stdDev = Math.sqrt(variance);

    // Lower standard deviation = more balanced
    const maxAcceptableStdDev = 10;
    return Math.max(0, 1 - (stdDev / maxAcceptableStdDev));
  }

  private calculateHours(employeeId: string, state: ShiftState): number {
    // Same as above
  }
}
```

## Graph Coloring

Color graph nodes such that no adjacent nodes have the same color.

```typescript
interface GraphState {
  nodeColors: Map<string, number>;
  edges: Edge[];
}

interface Edge {
  from: string;
  to: string;
}

// Hard constraint: No adjacent nodes with same color
class NoAdjacentSameColor implements Constraint<GraphState> {
  name = 'No Adjacent Same Color';
  type = 'hard' as const;

  evaluate(state: GraphState): number {
    for (const edge of state.edges) {
      const colorFrom = state.nodeColors.get(edge.from);
      const colorTo = state.nodeColors.get(edge.to);

      if (colorFrom === colorTo) {
        return 0;
      }
    }
    return 1;
  }
}

// Soft constraint: Minimize number of colors used
class MinimizeColors implements Constraint<GraphState> {
  name = 'Minimize Colors';
  type = 'soft' as const;
  weight = 10;

  evaluate(state: GraphState): number {
    const uniqueColors = new Set(state.nodeColors.values());
    const numColors = uniqueColors.size;
    const maxColors = state.nodeColors.size;

    return 1 - (numColors / maxColors);
  }
}

// Move: Change color of random node
class ChangeNodeColor implements MoveGenerator<GraphState> {
  name = 'Change Node Color';

  private maxColors = 10;

  canApply(state: GraphState): boolean {
    return state.nodeColors.size > 0;
  }

  generate(state: GraphState, temperature: number): GraphState {
    const newState = {
      nodeColors: new Map(state.nodeColors),
      edges: state.edges,
    };

    const nodes = Array.from(state.nodeColors.keys());
    const randomNode = nodes[Math.floor(Math.random() * nodes.length)];
    const newColor = Math.floor(Math.random() * this.maxColors);

    newState.nodeColors.set(randomNode, newColor);

    return newState;
  }
}
```

## Real-Time Progress Tracking

Monitor optimization progress in real-time using the `onProgress` callback. This is useful for web applications, APIs, and monitoring systems.

### Basic Progress Logging

```typescript
import { SimulatedAnnealing } from 'timetable-sa';

const config = {
  maxIterations: 10000,
  logInterval: 1000,
  
  onProgress: (iteration, cost, temp, state, stats) => {
    console.log(
      `[${stats.phase}] ${stats.progressPercent.toFixed(1)}% | ` +
      `Cost: ${cost.toFixed(2)} | Hard: ${stats.hardViolations}`
    );
  },
};

const solver = new SimulatedAnnealing(state, constraints, moves, config);
const solution = await solver.solve();
```

### Web Application with React

```typescript
import { useState } from 'react';
import { SimulatedAnnealing } from 'timetable-sa';

function OptimizationComponent() {
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState(null);
  
  const runOptimization = async () => {
    const config = {
      maxIterations: 20000,
      logInterval: 500,
      
      onProgress: (iteration, cost, temp, state, progressStats) => {
        setProgress(progressStats.progressPercent);
        setStats(progressStats);
      },
    };
    
    const solver = new SimulatedAnnealing(initialState, constraints, moves, config);
    const solution = await solver.solve();
    
    console.log('Complete!', solution);
  };
  
  return (
    <div>
      <progress value={progress} max={100} />
      <span>{progress.toFixed(1)}%</span>
      {stats && (
        <div>
          <p>Phase: {stats.phase}</p>
          <p>Cost: {stats.currentCost.toFixed(2)}</p>
          <p>Best: {stats.bestCost.toFixed(2)}</p>
        </div>
      )}
      <button onClick={runOptimization}>Start</button>
    </div>
  );
}
```

### Server with WebSocket

```typescript
import { Server } from 'socket.io';
import { SimulatedAnnealing } from 'timetable-sa';

const io = new Server(server);

io.on('connection', (socket) => {
  socket.on('optimize', async (data) => {
    const { jobId, initialState } = data;
    
    const config = {
      maxIterations: 20000,
      logInterval: 1000,
      
      onProgress: async (iteration, cost, temp, state, stats) => {
        // Send to client
        socket.emit('progress', {
          jobId,
          iteration,
          progress: stats.progressPercent,
          cost,
          hardViolations: stats.hardViolations,
          phase: stats.phase,
        });
        
        // Save to database
        await db.progress.create({
          jobId,
          iteration,
          stats,
        });
      },
    };
    
    const solver = new SimulatedAnnealing(initialState, constraints, moves, config);
    const solution = await solver.solve();
    
    socket.emit('complete', { jobId, solution });
  });
});
```

### CLI Progress Bar

```typescript
import { SingleBar, Presets } from 'cli-progress';
import { SimulatedAnnealing } from 'timetable-sa';

const progressBar = new SingleBar({}, Presets.shades_classic);
progressBar.start(100, 0);

const config = {
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
console.log(`Complete! Fitness: ${solution.fitness}`);
```

## Best Practices

1. **Start Simple**: Begin with basic constraints and moves, add complexity gradually
2. **Test Constraints**: Verify constraints work correctly on known inputs
3. **Efficient Cloning**: Use manual cloning for better performance
4. **Monitor Stats**: Check operator statistics to see what's working
5. **Iterate**: Tune parameters based on results

## More Examples

See the `examples/` directory in the repository for:
- Complete university timetabling implementation
- Custom time slot definitions
- Advanced constraint patterns
- Performance-optimized implementations

## Next Steps

- [Core Concepts](./core-concepts.md) - Understand the fundamentals
- [Advanced Features](./advanced-features.md) - Deep dive into features
- [Configuration Guide](./configuration.md) - Tune for best results
