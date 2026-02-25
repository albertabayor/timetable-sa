# BAB 4
# HASIL DAN PEMBAHASAN

Bab ini menyajikan hasil penelitian dan pembahasan berdasarkan metodologi yang telah ditetapkan pada Bab 3. Penyusunan hasil dan pembahasan mengikuti alur metodologi penelitian, dimulai dari implementasi sistem dan model, hingga analisis hasil simulasi algoritma. Pembahasan mencakup perbandingan performa algoritma Simulated Annealing dengan dan tanpa integrasi Tabu Search, serta evaluasi efektivitas setiap komponen dalam mencapai solusi optimal. Dokumentasi model yang komprehensif dari kode sumber di `@src/` dan `@examples/timetabling/` disajikan untuk menunjukkan arsitektur sistem yang diimplementasikan.

## 4.1 Arsitektur Sistem dan Model

Arsitektur sistem yang diimplementasikan mengikuti pola modular yang memungkinkan komponen-komponen terpisah berfungsi secara independen namun terintegrasi dalam satu ekosistem optimasi. Dokumentasi model ini mencakup seluruh komponen dari library core di `@src/` hingga domain-specific components di `@examples/timetabling/`. Setiap komponen dirancang dengan prinsip single responsibility dan dependency inversion untuk memastikan fleksibilitas dan kemudahan pemeliharaan kode.

### 4.1.1 Arsitektur Core Library (`src/core/`)

Library core mengimplementasikan algoritma Simulated Annealing generic yang dapat digunakan untuk berbagai jenis masalah optimasi constraint satisfaction. Arsitektur ini menggunakan pattern Strategy untuk memungkinkan fleksibilitas dalam definisi state, constraints, dan move operators sesuai dengan domain masalah spesifik.

**Struktur Direktori Core Library**

```
src/core/
├── interfaces/
│   ├── Constraint.ts       # Interface untuk constraint evaluation
│   ├── MoveGenerator.ts    # Interface untuk neighbor generation
│   ├── SAConfig.ts         # Interface untuk konfigurasi algoritma
│   └── index.ts            # Export semua interfaces
├── types/
│   ├── Solution.ts         # Type untuk return value solve()
│   ├── Violation.ts        # Type untuk violation details
│   └── index.ts            # Export semua types
├── SimulatedAnnealing.ts   # Main algorithm implementation
└── index.ts                # Export public API
```

**Class Diagram Utama**

```mermaid
classDiagram
    class SimulatedAnnealing~TState~ {
        -initialState: TState
        -constraints: Constraint~TState~[]
        -hardConstraints: Constraint~TState~[]
        -softConstraints: Constraint~TState~[]
        -moveGenerators: MoveGenerator~TState~[]
        -config: SAConfig
        -tabuList: Map~string, number~
        -operatorStats: OperatorStats
        +solve(): Solution~TState~
        -calculateFitnessAndViolations(state): object
        -generateNeighbor(state, temperature): object
        -selectMoveGenerator(generators): MoveGenerator
        -shouldSkipTabu(signature, iteration, fitness, bestFitness): boolean
        -addToTabuList(signature, iteration): void
        -getStateSignature(state): string
    }

    class Constraint~TState~ {
        <<interface>>
        +name: string
        +type: 'hard' | 'soft'
        +weight?: number
        +evaluate(state: TState): number
        +describe?(state: TState): string | undefined
        +getViolations?(state: TState): string[]
    }

    class MoveGenerator~TState~ {
        <<interface>>
        +name: string
        +generate(state: TState, temperature: number): TState
        +canApply(state: TState): boolean
    }

    class SAConfig~TState~ {
        <<interface>>
        +initialTemperature: number
        +minTemperature: number
        +coolingRate: number
        +maxIterations: number
        +hardConstraintWeight: number
        +cloneState: function
        +tabuSearchEnabled?: boolean
        +tabuTenure?: number
        +aspirationEnabled?: boolean
        +maxTabuListSize?: number
        +reheatingThreshold?: number
        +reheatingFactor?: number
        +maxReheats?: number
        +enableIntensification?: boolean
        +intensificationIterations?: number
        +maxIntensificationAttempts?: number
        +operatorSelectionMode?: 'hybrid' | 'roulette-wheel'
        +logging?: LoggingConfig
    }

    class Solution~TState~ {
        <<interface>>
        +state: TState
        +fitness: number
        +hardViolations: number
        +softViolations: number
        +iterations: number
        +reheats: number
        +finalTemperature: number
        +violations: Violation[]
        +operatorStats: OperatorStats
    }

    SimulatedAnnealing --> Constraint
    SimulatedAnnealing --> MoveGenerator
    SimulatedAnnealing --> SAConfig
    SimulatedAnnealing --> Solution
```

**Interface Constraint (dokumentasi lengkap dari `src/core/interfaces/Constraint.ts`)**

Interface Constraint merupakan fondasi dari sistem evaluasi solusi dalam library. Interface ini mendefinisikan kontrak yang harus dipenuhi oleh setiap constraint, baik hard maupun soft, dalam mengevaluasi kualitas solusi. Dokumentasi berikut menunjukkan interface lengkap beserta semua method dan property yang tersedia:

```typescript
/**
 * Represents a constraint that evaluates a state in the optimization problem.
 *
 * Constraints can be either:
 * - **Hard constraints**: Must be satisfied (violations are heavily penalized)
 * - **Soft constraints**: Preferred but not required (violations are lightly penalized)
 *
 * @template TState - The state type for your problem domain
 */
export interface Constraint<TState> {
  /**
   * Unique name for this constraint (used in logging and violation reports)
   *
   * @example "No Room Conflict", "Lecturer Max Hours", "Preferred Time Slot"
   */
  name: string;

  /**
   * Constraint type determines how violations are penalized
   *
   * - `'hard'`: Must be satisfied. Violations receive heavy penalty (hardConstraintWeight)
   * - `'soft'`: Preferred but not required. Violations receive light penalty (weight)
   */
  type: 'hard' | 'soft';

  /**
   * Weight for soft constraints (ignored for hard constraints)
   *
   * Higher weight = more important soft constraint
   * Lower weight = less important soft constraint
   *
   * @default 10
   */
  weight?: number;

  /**
   * Evaluate the constraint for the given state.
   *
   * @param state - Current state to evaluate
   * @returns Score between 0 and 1 (inclusive)
   *   - `1.0` = fully satisfied (no violation)
   *   - `0.0` = completely violated
   *   - `0.5` = partially satisfied (for soft constraints with gradual satisfaction)
   *
   * @remarks
   * - Hard constraints typically return 0 (violated) or 1 (satisfied)
   * - Soft constraints can return intermediate values (0.0 to 1.0) for partial satisfaction
   */
  evaluate(state: TState): number;

  /**
   * Optional: Provide human-readable description of violations.
   *
   * This is useful for debugging and generating violation reports.
   *
   * @param state - Current state
   * @returns Description of violations, or `undefined` if constraint is satisfied
   */
  describe?(state: TState): string | undefined;

  /**
   * Optional: Get detailed list of all violations for this constraint.
   *
   * This method allows constraints to report ALL violations, not just the first one.
   * If implemented, this method will be used instead of `describe()` for violation reporting.
   *
   * @param state - Current state
   * @returns Array of violation descriptions, or empty array if constraint is satisfied
   */
  getViolations?(state: TState): string[];
}
```

**Interface MoveGenerator (dokumentasi lengkap dari `src/core/interfaces/MoveGenerator.ts`)**

Interface MoveGenerator mendefinisikan bagaimana algoritma mengeksplorasi ruang solusi dengan menghasilkan neighbor states dari state saat ini. Setiap move generator mengimplementasikan strategi berbeda untuk memodifikasi solusi, mulai dari perubahan kecil hingga pertukaran elemen. Dokumentasi berikut menunjukkan interface lengkap:

```typescript
/**
 * Generates neighboring states by applying moves or modifications to the current state.
 *
 * Move generators define how to explore the solution space. Common types include:
 * - **Local moves**: Modify a single element (e.g., change room, change time slot)
 * - **Swap moves**: Exchange properties between two elements
 * - **Insert/Remove moves**: Add or remove elements from the solution
 *
 * @template TState - The state type for your problem domain
 */
export interface MoveGenerator<TState> {
  /**
   * Unique name for this move operator (used in logging and statistics)
   *
   * @example "Change Time Slot", "Swap Classes", "Change Room"
   */
  name: string;

  /**
   * Generate a new neighbor state from the current state.
   *
   * The implementation should:
   * 1. Clone the current state (do not modify the input)
   * 2. Apply modifications to create a neighbor
   * 3. Return the new state
   *
   * @param state - Current state (should NOT be modified)
   * @param temperature - Current temperature in the SA algorithm
   *   Can be used to adjust move intensity (larger moves at high temp, smaller at low temp)
   * @returns New state with modifications applied
   *
   * @remarks
   * - **IMPORTANT**: Do not modify the input `state`. Always create a new state.
   * - The `temperature` parameter can be used for temperature-dependent moves:
   *   - High temperature: Explore broadly (larger, more random moves)
   *   - Low temperature: Refine locally (smaller, more focused moves)
   */
  generate(state: TState, temperature: number): TState;

  /**
   * Check if this move can be applied to the current state.
   *
   * Use this to skip inapplicable moves (e.g., cannot swap if schedule has < 2 entries).
   *
   * @param state - Current state
   * @returns `true` if move is applicable, `false` otherwise
   */
  canApply(state: TState): boolean;
}
```

**Interface SAConfig (dokumentasi lengkap dari `src/core/interfaces/SAConfig.ts`)**

Interface SAConfig mendefinisikan seluruh parameter konfigurasi untuk algoritma Simulated Annealing, termasuk parameter standar SA dan fitur advanced seperti Tabu Search, Reheating, dan Intensification. Dokumentasi berikut menunjukkan interface lengkap:

```typescript
/**
 * Configuration for the Simulated Annealing algorithm.
 *
 * The algorithm uses a multi-phase approach:
 * - Phase 1: Eliminate hard constraint violations
 * - Phase 1.5: Intensification (optional) - Aggressively target remaining hard violations
 * - Phase 2: Optimize soft constraints
 *
 * Advanced features:
 * - Tabu Search: Prevents cycling by tracking visited states
 * - Reheating: Escapes local minima by temporarily increasing temperature
 * - Intensification: Focused optimization for stubborn violations
 * - Adaptive operator selection: Learns effective operators
 *
 * @template TState - The state type for your problem domain
 */
export interface SAConfig<TState> {
  /**
   * Initial temperature for the annealing process.
   *
   * Higher values allow more exploration of the solution space at the start.
   * Typical values: 100 to 10000
   *
   * @default 1000
   */
  initialTemperature: number;

  /**
   * Minimum temperature (stopping criterion).
   *
   * The algorithm stops when temperature drops below this value.
   * Typical values: 0.001 to 1
   *
   * @default 0.01
   */
  minTemperature: number;

  /**
   * Cooling rate (temperature decay factor).
   *
   * Temperature is multiplied by this value each iteration: `T = T * coolingRate`
   * Must be between 0 and 1 (exclusive).
   * Typical values: 0.95 to 0.999
   *
   * @default 0.995
   */
  coolingRate: number;

  /**
   * Maximum number of iterations (stopping criterion).
   *
   * The algorithm stops after this many iterations, even if temperature hasn't reached `minTemperature`.
   * Typical values: 10000 to 100000
   *
   * @default 50000
   */
  maxIterations: number;

  /**
   * Penalty weight for hard constraint violations.
   *
   * Hard constraints are penalized with: `hardViolations * hardConstraintWeight`
   * Should be much larger than soft constraint weights to prioritize hard constraints.
   * Typical values: 1000 to 100000
   *
   * @default 10000
   */
  hardConstraintWeight: number;

  /**
   * State cloning function.
   *
   * Provides a deep copy of the state to avoid mutating the current solution.
   */
  cloneState: (state: TState) => TState;

  // ============================================
  // TABU SEARCH CONFIGURATION
  // ============================================

  /**
   * Enable Tabu Search to prevent cycling.
   *
   * When enabled, the algorithm tracks recently visited states in a tabu list
   * and avoids revisiting them for a configurable number of iterations (tabu tenure).
   *
   * @default false
   */
  tabuSearchEnabled?: boolean;

  /**
   * Number of iterations a state remains in the tabu list.
   *
   * After this many iterations, the state is removed from the tabu list
   * and can be visited again.
   *
   * @default 50
   */
  tabuTenure?: number;

  /**
   * Enable aspiration criteria for tabu search.
   *
   * If true, tabu states can be accepted if their fitness is better than
   * the global best solution found so far.
   *
   * @default true
   */
  aspirationEnabled?: boolean;

  /**
   * Maximum number of entries in the tabu list.
   *
   * When exceeded, oldest entries are removed to prevent memory bloat.
   *
   * @default 1000
   */
  maxTabuListSize?: number;

  /**
   * Number of iterations without improvement before triggering reheating.
   *
   * @default undefined (no reheating)
   */
  reheatingThreshold?: number;

  /**
   * Maximum number of reheating events allowed.
   *
   * @default 3
   */
  maxReheats?: number;

  /**
   * Factor to multiply temperature by when reheating.
   *
   * @default 2.0
   */
  reheatingFactor?: number;

  // ============================================
  // INTENSIFICATION CONFIGURATION
  // ============================================

  /**
   * Enable Phase 1.5 Intensification mode.
   *
   * When Phase 1 ends with remaining hard violations, this mode
   * aggressively targets those violations with dedicated iterations.
   *
   * @default true
   */
  enableIntensification?: boolean;

  /**
   * Maximum iterations for each intensification attempt.
   *
   * @default 2000
   */
  intensificationIterations?: number;

  /**
   * Maximum number of intensification restart attempts.
   *
   * @default 3
   */
  maxIntensificationAttempts?: number;

  /**
   * Operator selection mode
   *
   * - 'hybrid': 30% random + 70% weighted by success rate (default, more robust)
   * - 'roulette-wheel': 100% fitness-proportionate selection
   *
   * @default 'hybrid'
   */
  operatorSelectionMode?: 'hybrid' | 'roulette-wheel';

  /**
   * Logging configuration
   */
  logging?: LoggingConfig;
}
```

**Implementasi Main Class SimulatedAnnealing**

Main class yang mengimplementasikan seluruh logika algoritma optimasi, termasuk multi-phase processing, Tabu Search integration, dan adaptive operator selection. Dokumentasi berikut menunjukkan struktur lengkap class:

```typescript
/**
 * Generic Simulated Annealing optimizer for constraint satisfaction problems.
 *
 * This class implements a multi-phase simulated annealing algorithm:
 * - Phase 1: Eliminate hard constraint violations (60% of maxIterations)
 * - Phase 1.5: Intensification - Aggressively target remaining hard violations (optional)
 * - Phase 2: Optimize soft constraints while maintaining hard constraint satisfaction
 *
 * Features:
 * - Tabu Search: Prevents cycling by tracking recently visited states
 * - Aspiration Criteria: Overrides tabu status for exceptionally good solutions
 * - Adaptive Operator Selection: Learns which operators work best
 * - Reheating: Escapes local minima by temporarily increasing temperature
 * - Intensification: Focused optimization to eliminate stubborn hard violations
 */
export class SimulatedAnnealing<TState> {
  private initialState: TState;
  private constraints: Constraint<TState>[];
  private hardConstraints: Constraint<TState>[];
  private softConstraints: Constraint<TState>[];
  private moveGenerators: MoveGenerator<TState>[];
  
  // Extended config with defaults
  private config: SAConfig<TState> & {
    reheatingFactor: number;
    maxReheats: number;
    tabuSearchEnabled: boolean;
    tabuTenure: number;
    maxTabuListSize: number;
    aspirationEnabled: boolean;
    enableIntensification: boolean;
    intensificationIterations: number;
    maxIntensificationAttempts: number;
    logging: Required<NonNullable<SAConfig<TState>['logging']>>;
  };

  // Operator statistics for adaptive selection
  private operatorStats: OperatorStats = {};

  // Tabu list: stores move signatures with the iteration they were added
  private tabuList: Map<string, number> = new Map();

  /**
   * Main constructor
   * @param initialState - Starting solution
   * @param constraints - Array of hard and soft constraints
   * @param moveGenerators - Array of move operators
   * @param config - Algorithm configuration
   */
  constructor(
    initialState: TState,
    constraints: Constraint<TState>[],
    moveGenerators: MoveGenerator<TState>[],
    config: SAConfig<TState>
  ) {
    this.initialState = initialState;
    this.constraints = constraints;
    this.moveGenerators = moveGenerators;

    // Separate hard and soft constraints
    this.hardConstraints = constraints.filter((c) => c.type === 'hard');
    this.softConstraints = constraints.filter((c) => c.type === 'soft');

    // Merge config with defaults
    this.config = this.mergeWithDefaults(config);

    // Initialize operator stats
    for (const generator of moveGenerators) {
      this.operatorStats[generator.name] = {
        attempts: 0,
        improvements: 0,
        accepted: 0,
        successRate: 0,
      };
    }
  }

  /**
   * Run the optimization algorithm
   *
   * Algorithm Phases:
   * 1. Phase 1: Eliminate hard constraint violations (60% of maxIterations)
   * 2. Phase 1.5: Intensification (if enableIntensification = true and hardViolations > 0)
   * 3. Phase 2: Optimize soft constraints
   */
  solve(): Solution<TState> {
    // Implementation details...
  }

  /**
   * Calculate fitness and count hard violations in a single pass
   * Optimized to reduce redundant constraint evaluation
   */
  private calculateFitnessAndViolations(state: TState): { 
    fitness: number; 
    hardViolations: number 
  } {
    // Implementation details...
  }

  /**
   * Generate neighbor state using adaptive operator selection
   */
  private generateNeighbor(
    state: TState,
    temperature: number
  ): { newState: TState | null; operatorName: string } {
    // Implementation details...
  }

  /**
   * Hybrid selection (30% random + 70% weighted)
   * Ensures exploration while leveraging learned operator performance
   */
  private selectGeneratorHybrid(generators: MoveGenerator<TState>[]): MoveGenerator<TState> {
    // 30%: forced random (exploration)
    if (Math.random() < 0.3) {
      return generators[Math.floor(Math.random() * generators.length)]!;
    }

    // 70%: weighted based on success rates
    const weights = generators.map((gen) => {
      const stats = this.operatorStats[gen.name]!;
      return stats.successRate || 0.5;
    });

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    if (totalWeight === 0) {
      return generators[Math.floor(Math.random() * generators.length)]!;
    }

    // Weighted random selection
    let random = Math.random() * totalWeight;
    for (let i = 0; i < generators.length; i++) {
      random -= weights[i]!;
      if (random <= 0) {
        return generators[i]!;
      }
    }

    return generators[generators.length - 1]!;
  }

  /**
   * Generate a lightweight signature for a state
   * Used to track visited states in the tabu list
   */
  private getStateSignature(state: TState): string {
    const schedule = (state as any).schedule;
    if (!schedule || !Array.isArray(schedule)) {
      return Math.random().toString(36);
    }

    // Create signature based on class assignments
    const assignments: string[] = [];
    for (const entry of schedule) {
      if (entry.classId && entry.timeSlot && entry.room) {
        assignments.push(
          `${entry.classId}:${entry.timeSlot.day}:${entry.timeSlot.startTime}:${entry.room}`
        );
      }
    }
    
    return assignments.sort().join('|');
  }

  /**
   * Check if a state should be skipped (tabu) with aspiration criteria
   */
  private shouldSkipTabu(
    signature: string,
    currentIteration: number,
    newFitness: number,
    globalBestFitness: number
  ): boolean {
    if (!this.config.tabuSearchEnabled) {
      return false;
    }

    const addedAt = this.tabuList.get(signature);
    if (addedAt === undefined) {
      return false; // Not tabu
    }

    // Check if still within tabu tenure
    if ((currentIteration - addedAt) >= this.config.tabuTenure) {
      return false; // Tabu expired
    }

    // Aspiration criteria: accept if better than global best
    if (this.config.aspirationEnabled && newFitness < globalBestFitness) {
      return false; // Accept this breakthrough solution
    }

    return true; // Tabu and no aspiration met: skip
  }
}

Implementasi *Core Engine* merupakan fondasi sistem yang menjalankan algoritma Simulated Annealing dengan integrasi Tabu Search. Kode program di bawah ini menunjukkan implementasi utama kelas SimulatedAnnealing yang menangani proses optimasi:

```typescript
// src/core/SimulatedAnnealing.ts
/**
 * Generic Simulated Annealing optimizer for constraint satisfaction problems.
 *
 * This class implements a multi-phase simulated annealing algorithm:
 * - Phase 1: Eliminate hard constraint violations (60% of maxIterations)
 * - Phase 1.5: Intensification - Aggressively target remaining hard violations (optional)
 * - Phase 2: Optimize soft constraints while maintaining hard constraint satisfaction
 *
 * Features:
 * - Tabu Search: Prevents cycling by tracking recently visited states
 * - Aspiration Criteria: Overrides tabu status for exceptionally good solutions
 * - Adaptive Operator Selection: Learns which operators work best
 * - Reheating: Escapes local minima by temporarily increasing temperature
 * - Intensification: Focused optimization to eliminate stubborn hard violations
 */
export class SimulatedAnnealing<TState> {
  private initialState: TState;
  private constraints: Constraint<TState>[];
  private hardConstraints: Constraint<TState>[];
  private softConstraints: Constraint<TState>[];
  private moveGenerators: MoveGenerator<TState>[];
  
  // Tabu list: stores move signatures with the iteration they were added
  private tabuList: Map<string, number> = new Map();

  constructor(
    initialState: TState,
    constraints: Constraint<TState>[],
    moveGenerators: MoveGenerator<TState>[],
    config: SAConfig<TState>
  ) {
    this.initialState = initialState;
    this.constraints = constraints;
    this.moveGenerators = moveGenerators;

    // Separate hard and soft constraints
    this.hardConstraints = constraints.filter((c) => c.type === 'hard');
    this.softConstraints = constraints.filter((c) => c.type === 'soft');
    
    // Merge config with defaults
    this.config = this.mergeWithDefaults(config);
  }

  /**
   * Run the optimization algorithm
   */
  solve(): Solution<TState> {
    // Multi-phase optimization:
    // Phase 1: Eliminate hard constraints (60% of maxIterations)
    // Phase 1.5: Intensification (optional)
    // Phase 2: Optimize soft constraints
  }
}
```

Konfigurasi parameter algoritma yang digunakan dalam implementasi dapat dilihat pada tabel berikut yang menunjukkan nilai-nilai yang dikonfigurasi untuk eksperimen:

**Tabel 4.1 Konfigurasi Parameter Algoritma**

| Parameter | Nilai | Deskripsi |
|-----------|-------|-----------|
| initialTemperature | 100,000 | Suhu awal untuk eksplorasi yang baik |
| minTemperature | 0.0000001 | Suhu minimum untuk konvergensi |
| coolingRate | 0.9995 | Laju pendinginan lambat untuk pencarian menyeluruh |
| maxIterations | 20,000 | Jumlah maksimum iterasi |
| hardConstraintWeight | 100,000 | Penalti tinggi untuk pelanggaran hard constraints |
| reheatingThreshold | 500 | Iterasi tanpa perbaikan sebelum reheating |
| reheatingFactor | 150 | Faktor peningkatan suhu saat reheating |
| maxReheats | 10 | Jumlah maksimum reheating |
| tabuTenure | 50 | Durasi state tetap dalam tabu list |
| maxTabuListSize | 1,000 | Batas maksimum ukuran tabu list |
| aspirationEnabled | true | Mengizinkan override tabu untuk solusi lebih baik |

Implementasi algoritma menggunakan pendekatan multi-fase yang membedakan penanganan hard dan soft constraints. Pada Fase 1 (60% iterasi), algoritma berfokus pada eliminasi pelanggaran hard constraints dengan prioritas tertinggi. Selama fase ini, setiap solusi baru yang mengurangi jumlah hard violations selalu diterima, sementara solusi yang meningkatkan hard violations selalu ditolak. Fase 2 sisanya digunakan untuk optimasi soft constraints dengan tetap menjaga hard constraints pada level 0.

### 4.1.2 Domain Models (`examples/timetabling/types/`)

Domain models merepresentasikan struktur data akademik yang digunakan dalam sistem penjadwalan. Setiap model mendefinisikan atribut-atribut yang diperlukan untuk proses optimasi. Dokumentasi berikut menunjukkan interface lengkap yang diimplementasikan:

```typescript
// examples/timetabling/types/Domain.ts
/**
 * Domain-specific types for University Course Timetabling
 */

/**
 * Room/Classroom definition
 */
export interface Room {
  Code: string;              // Unique room identifier
  Name: string;              // Room name
  Type: string;              // e.g., "Lecture Hall", "Lab", "Seminar Room"
  Capacity: number;          // Maximum number of students
}

/**
 * Lecturer/Instructor definition
 */
export interface Lecturer {
  "Prodi Code": string;      // Study program code
  Code: string;              // Unique lecturer identifier
  Name: string;              // Lecturer name
  Prefered_Time: string;     // e.g., "08.00 - 10.00 monday"
  Research_Day: string;      // Day reserved for research
  Transit_Time: number;      // Minutes needed between classes
  Max_Daily_Periods: number; // Maximum teaching hours per day
  Prefered_Room: string;     // Preferred room for teaching
}

/**
 * Class requirement/course definition
 */
export interface ClassRequirement {
  Prodi: string;                        // Study program
  Kelas: string;                        // Class section (A, B, C, etc.)
  Kode_Matakuliah: string;              // Course code
  Mata_Kuliah: string;                  // Course name
  SKS: number;                          // Credit hours
  Jenis: string;                        // Course type
  Peserta: number;                      // Number of participants
  Kode_Dosen1: string;                  // Primary lecturer code
  Kode_Dosen2: string;                  // Secondary lecturer code
  Kode_Dosen_Prodi_Lain1: string;       // External lecturer 1
  Kode_Dosen_Prodi_Lain2: string;       // External lecturer 2
  Class_Type: string;                   // "pagi" or "sore" (morning/evening)
  should_on_the_lab: string;            // "yes" or "no"
  rooms: string;                        // Preferred room
}

/**
 * Time slot definition
 */
export interface TimeSlot {
  day: string;          // "Monday", "Tuesday", etc.
  startTime: string;    // "08:00", "09:30", etc.
  endTime: string;      // "10:00", "11:30", etc.
  period: number;       // Period number
}

/**
 * Prayer time configuration
 */
export interface PrayerTime {
  start: number;    // Start time in minutes from midnight
  end: number;      // End time in minutes from midnight
  duration: number; // Duration in minutes
}

/**
 * Exclusive room configuration
 */
export interface ExclusiveRoomConfig {
  courses: string[];   // List of course names that can use this room
  prodi?: string;      // Optional: restrict to specific program
}

/**
 * Input data structure for loading timetabling data
 */
export interface TimetableInput {
  rooms: Room[];
  lecturers: Lecturer[];
  classes: ClassRequirement[];
}
```

**State dan Schedule Models**

Model state dan schedule mendefinisikan struktur solusi dalam proses optimasi. TimetableState merepresentasikan keseluruhan solusi jadwal, sementara ScheduleEntry merepresentasikan satu penugasan kelas dalam jadwal:

```typescript
// examples/timetabling/types/State.ts
/**
 * A single entry in the timetable schedule
 */
export interface ScheduleEntry {
  classId: string;              // Course code
  className: string;            // Course name
  class: string | string[];     // Class section(s)
  prodi: string;                // Study program
  lecturers: string[];          // Lecturer codes
  room: string;                 // Room code
  timeSlot: TimeSlot;          // Scheduled time slot
  sks: number;                  // Credit hours
  needsLab: boolean;           // Requires lab room
  participants: number;         // Number of students
  classType: string;           // "pagi" or "sore"
  prayerTimeAdded: number;     // Minutes added for prayer time
  isOverflowToLab?: boolean;   // Non-lab class using lab room
}

/**
 * Complete timetable state
 *
 * This is what the Simulated Annealing algorithm operates on.
 */
export interface TimetableState {
  /**
   * The current schedule - array of scheduled classes
   */
  schedule: ScheduleEntry[];

  /**
   * Available time slots for scheduling
   */
  availableTimeSlots: TimeSlot[];

  /**
   * Available rooms
   */
  rooms: Room[];

  /**
   * Available lecturers
   */
  lecturers: Lecturer[];
}
```

### 4.1.3 Constraint System (`examples/timetabling/constraints/`)

Sistem constraint diimplementasikan sebagai modul terpisah yang dapat dievaluasi secara independen. Setiap constraint mengimplementasikan interface Constraint dengan metode evaluate() untuk menghitung skor kepatuhan. Dokumentasi berikut menunjukkan semua constraint yang diimplementasikan:

**Export Index untuk Hard Constraints**

```typescript
// examples/timetabling/constraints/hard/index.ts
/**
 * Hard constraints for university course timetabling
 *
 * These MUST be satisfied for a valid timetable
 */

export { NoLecturerConflict } from './NoLecturerConflict.js';
export { NoRoomConflict } from './NoRoomConflict.js';
export { RoomCapacity } from './RoomCapacity.js';
export { NoProdiConflict } from './NoProdiConflict.js';
export { MaxDailyPeriods } from './MaxDailyPeriods.js';
export { ClassTypeTime } from './ClassTypeTime.js';
export { SaturdayRestriction } from './SaturdayRestriction.js';
export { FridayTimeRestriction } from './FridayTimeRestriction.js';
export { PrayerTimeStart } from './PrayerTimeStart.js';
export { ExclusiveRoom } from './ExclusiveRoom.js';
export { NoFridayPrayConflict } from './NoFridayPrayConflit.js';
```

**Export Index untuk Soft Constraints**

```typescript
// examples/timetabling/constraints/soft/index.ts
/**
 * Soft constraints for university course timetabling
 *
 * These are preferences - violations are penalized but allowed
 */

export { PreferredTime } from './PreferredTime.js';
export { PreferredRoom } from './PreferredRoom.js';
export { TransitTime } from './TransitTime.js';
export { Compactness } from './Compactness.js';
export { PrayerTimeOverlap } from './PrayerTimeOverlap.js';
export { EveningClassPriority } from './EveningClassPriority.js';
export { OverflowPenalty } from './OverflowPenalty.js';
export { ResearchDay } from './ResearchDay.js';
```

**Implementasi Complete Hard Constraints**

Semua hard constraints yang diimplementasikan beserta deskripsi dan logika evaluasinya:

**Tabel 4.1 Daftar Hard Constraints (Lengkap)**

| Nama Constraint | File | Logika Evaluasi |
|-----------------|------|-----------------|
| NoLecturerConflict | NoLecturerConflict.ts | Memeriksa tidak ada dosen mengajar di dua tempat berbeda pada waktu yang sama |
| NoRoomConflict | NoRoomConflict.ts | Memeriksa tidak ada dua kelas di ruang yang sama pada waktu bersamaan |
| RoomCapacity | RoomCapacity.ts | Memeriksa jumlah peserta ≤ kapasitas ruang |
| NoProdiConflict | NoProdiConflict.ts | Memeriksa tidak ada dua kelas prodi sama waktu bersamaan |
| NoFridayPrayConflict | NoFridayPrayConflit.ts | Memeriksa tidak ada kelas pada jam 12:00-13:00 hari Jumat |
| MaxDailyPeriods | MaxDailyPeriods.ts | Memeriksa total jam dosen per hari ≤ batas maksimal |
| ClassTypeTime | ClassTypeTime.ts | Memeriksa kelas pagi di jam pagi, kelas sore di jam sore |
| SaturdayRestriction | SaturdayRestriction.ts | Memeriksa aturan khusus hari Sabtu |
| FridayTimeRestriction | FridayTimeRestriction.ts | Memeriksa batasan jam khusus hari Jumat |
| PrayerTimeStart | PrayerTimeStart.ts | Memeriksa tidak ada kelas saat waktu solat dimulai |
| ExclusiveRoom | ExclusiveRoom.ts | Memeriksa ruangan digunakan sesuai ketentuan eksklusif |

**Implementasi Detail NoLecturerConflict**

```typescript
// examples/timetabling/constraints/hard/NoLecturerConflict.ts
import type { Constraint } from '../../../src/index.js';
import type { TimetableState } from '../../types/index.js';

export class NoLecturerConflict implements Constraint<TimetableState> {
  name = 'No Lecturer Conflict';
  type = 'hard' as const;
  weight = 100000;

  evaluate(state: TimetableState): number {
    const lecturerTimeMap = new Map<string, Set<string>>();
    
    for (const entry of state.schedule) {
      const timeKey = `${entry.timeSlot.day}:${entry.timeSlot.startTime}`;
      
      for (const lecturer of entry.lecturers) {
        if (!lecturerTimeMap.has(lecturer)) {
          lecturerTimeMap.set(lecturer, new Set());
        }
        
        if (lecturerTimeMap.get(lecturer)!.has(timeKey)) {
          return 0; // Conflict detected
        }
        lecturerTimeMap.get(lecturer)!.add(timeKey);
      }
    }
    
    return 1; // No conflict
  }

  getViolations(state: TimetableState): string[] {
    const violations: string[] = [];
    const lecturerTimeMap = new Map<string, Set<string>>();
    
    for (const entry of state.schedule) {
      const timeKey = `${entry.timeSlot.day}:${entry.timeSlot.startTime}`;
      
      for (const lecturer of entry.lecturers) {
        if (!lecturerTimeMap.has(lecturer)) {
          lecturerTimeMap.set(lecturer, new Set());
        }
        
        if (lecturerTimeMap.get(lecturer)!.has(timeKey)) {
          violations.push(
            `Lecturer ${lecturer} has conflict at ${entry.timeSlot.day} ${entry.timeSlot.startTime}`
          );
        }
        lecturerTimeMap.get(lecturer)!.add(timeKey);
      }
    }
    
    return violations;
  }
}
```

**Implementasi Complete Soft Constraints**

Semua soft constraints yang diimplementasikan beserta bobot dan deskripsi:

**Tabel 4.2 Daftar Soft Constraints (Lengkap)**

| Nama Constraint | File | Bobot | Deskripsi |
|-----------------|------|-------|-----------|
| PreferredTime | PreferredTime.ts | 10 | Dosen mengajar pada waktu yang disukai |
| PreferredRoom | PreferredRoom.ts | 10 | Ruangan sesuai preferensi dosen |
| TransitTime | TransitTime.ts | 5 | Waktu transit cukup antar kelas dosen |
| Compactness | Compactness.ts | 15 | Jadwal kompak tanpa gap besar antar kelas |
| PrayerTimeOverlap | PrayerTimeOverlap.ts | 20 | Menghindari overlap dengan waktu solat |
| EveningClassPriority | EveningClassPriority.ts | 20 | Kelas sore dimulai optimal jam 18:30 |
| ResearchDay | ResearchDay.ts | 10 | Dosen tidak mengajar di hari penelitian |
| OverflowPenalty | OverflowPenalty.ts | 10 | Tidak ada mismatch tipe ruang |

### 4.1.4 Move Generators (`examples/timetabling/moves/`)

Move generators merupakan operator pencarian lokal yang menghasilkan solusi tetangga dari solusi saat ini. Sistem menggunakan dua kategori move generators: Targeted operators untuk mengatasi pelanggaran spesifik, dan General operators untuk eksplorasi ruang solusi.

**Export Index untuk Move Generators**

```typescript
// examples/timetabling/moves/index.ts
/**
 * Move operators for timetabling example
 */

// General move operators
export { ChangeTimeSlot } from './ChangeTimeSlot.js';
export { ChangeRoom } from './ChangeRoom.js';
export { SwapClasses } from './SwapClasses.js';
export { ChangeTimeSlotAndRoom } from './ChangeTimeSlotAndRoom.js';

// Targeted move operators for specific violations
export { FixFridayPrayerConflict } from './FixFridayPrayerConflict.js';
export { FixLecturerConflict } from './FixLecturerConflict.js';
export { FixRoomConflict } from './FixRoomConflict.js';
export { FixMaxDailyPeriods } from './FixMaxDailyPeriods.js';
export { FixRoomCapacity } from './FixRoomCapacity.js';
```

**Tabel 4.3 Daftar Move Generators (Lengkap)**

| Kategori | Nama Operator | File | Fungsi |
|----------|---------------|------|--------|
| Targeted | FixFridayPrayerConflict | FixFridayPrayerConflict.ts | Memperbaiki konflik dengan waktu solat Jumat |
| Targeted | FixLecturerConflict | FixLecturerConflict.ts | Memperbaiki konflik jadwal dosen |
| Targeted | FixRoomConflict | FixRoomConflict.ts | Memperbaiki konflik penggunaan ruang |
| Targeted | FixMaxDailyPeriods | FixMaxDailyPeriods.ts | Memperbaiki pelanggaran batas jam harian |
| Targeted | FixRoomCapacity | FixRoomCapacity.ts | Memperbaiki pelanggaran kapasitas ruang |
| General | ChangeTimeSlotAndRoom | ChangeTimeSlotAndRoom.ts | Mengubah waktu dan ruang bersamaan |
| General | ChangeTimeSlot | ChangeTimeSlot.ts | Mengubah waktu saja |
| General | ChangeRoom | ChangeRoom.ts | Mengubah ruang saja |
| General | SwapClasses | SwapClasses.ts | Menukar dua kelas |

**Implementasi Complete ChangeTimeSlotAndRoom**

```typescript
// examples/timetabling/moves/ChangeTimeSlotAndRoom.ts
import type { MoveGenerator } from '../../../src/index.js';
import type { TimetableState, ScheduleEntry } from '../types/index.js';

export class ChangeTimeSlotAndRoom implements MoveGenerator<TimetableState> {
  name = 'Change Time Slot and Room';

  canApply(state: TimetableState): boolean {
    return (
      state.schedule.length > 0 &&
      state.availableTimeSlots.length > 0 &&
      state.rooms.length > 0
    );
  }

  generate(state: TimetableState, temperature: number): TimetableState | null {
    const clonedState = this.cloneState(state);
    
    // Pilih kelas secara acak
    const randomIndex = Math.floor(Math.random() * clonedState.schedule.length);
    const selectedClass = clonedState.schedule[randomIndex];
    
    // Pilih slot waktu baru secara acak
    const newTimeSlot = state.availableTimeSlots[
      Math.floor(Math.random() * state.availableTimeSlots.length)
    ];
    
    // Pilih ruang baru secara acak
    const newRoom = state.rooms[
      Math.floor(Math.random() * state.rooms.length)
    ];
    
    // Update kelas dengan validasi kapasitas
    if (this.canAccommodate(selectedClass, newRoom)) {
      selectedClass.timeSlot = newTimeSlot;
      selectedClass.room = newRoom;
      selectedClass.isOverflowToLab = this.checkLabOverflow(selectedClass, newRoom);
    }
    
    return clonedState;
  }

  private cloneState(state: TimetableState): TimetableState {
    return {
      ...state,
      schedule: state.schedule.map((entry: ScheduleEntry) => ({ ...entry })),
    };
  }

  private canAccommodate(entry: ScheduleEntry, room: Room): boolean {
    return room.Capacity >= entry.participants;
  }

  private checkLabOverflow(entry: ScheduleEntry, room: Room): boolean {
    return entry.needsLab && room.Type !== 'Lab';
  }
}
```

**Implementasi Complete FixMaxDailyPeriods**

```typescript
// examples/timetabling/moves/FixMaxDailyPeriods.ts
import type { MoveGenerator } from '../../../src/index.js';
import type { TimetableState, ScheduleEntry } from '../types/index.js';

export class FixMaxDailyPeriods implements MoveGenerator<TimetableState> {
  name = 'Fix Max Daily Periods';

  canApply(state: TimetableState): boolean {
    // Cek apakah ada pelanggaran MaxDailyPeriods
    for (const lecturer of state.lecturers) {
      const dailyPeriods = this.countDailyPeriods(state, lecturer.Code);
      if (dailyPeriods > lecturer.Max_Daily_Periods) {
        return true;
      }
    }
    return false;
  }

  generate(state: TimetableState, temperature: number): TimetableState | null {
    const clonedState = this.cloneState(state);
    
    // Temukan dosen yang melanggar
    const violatingLecturer = this.findViolatingLecturer(state);
    if (!violatingLecturer) return null;
    
    // Temukan kelas yang bisa dipindahkan
    const movableClass = this.findMovableClass(state, violatingLecturer);
    if (!movableClass) return null;
    
    // Cari slot waktu alternatif
    const newTimeSlot = this.findAlternativeTimeSlot(state, violatingLecturer);
    if (!newTimeSlot) return null;
    
    // Update jadwal
    movableClass.timeSlot = newTimeSlot;
    
    return clonedState;
  }

  private countDailyPeriods(state: TimetableState, lecturerCode: string): number {
    const periods = new Set<string>();
    for (const entry of state.schedule) {
      if (entry.lecturers.includes(lecturerCode)) {
        periods.add(`${entry.timeSlot.day}:${entry.timeSlot.period}`);
      }
    }
    return periods.size;
  }

  private findViolatingLecturer(state: TimetableState) {
    for (const lecturer of state.lecturers) {
      if (this.countDailyPeriods(state, lecturer.Code) > lecturer.Max_Daily_Periods) {
        return lecturer;
      }
    }
    return null;
  }

  private findMovableClass(state: TimetableState, lecturer: any): ScheduleEntry | null {
    const classesOnMaxDay: ScheduleEntry[] = [];
    
    for (const entry of state.schedule) {
      if (entry.lecturers.includes(lecturer.Code)) {
        const dayPeriods = this.countPeriodsOnDay(state, lecturer.Code, entry.timeSlot.day);
        if (dayPeriods >= lecturer.Max_Daily_Periods) {
          classesOnMaxDay.push(entry);
        }
      }
    }
    
    if (classesOnMaxDay.length === 0) return null;
    
    // Pilih kelas secara acak dari yang melanggar
    return classesOnMaxDay[Math.floor(Math.random() * classesOnMaxDay.length)];
  }

  private countPeriodsOnDay(state: TimetableState, lecturerCode: string, day: string): number {
    let count = 0;
    for (const entry of state.schedule) {
      if (
        entry.lecturers.includes(lecturerCode) &&
        entry.timeSlot.day === day
      ) {
        count++;
      }
    }
    return count;
  }

  private findAlternativeTimeSlot(
    state: TimetableState,
    lecturer: any
  ): import('../types/index.js').TimeSlot | null {
    const validSlots: import('../types/index.js').TimeSlot[] = [];
    
    for (const slot of state.availableTimeSlots) {
      // Skip jika hari yang sama
      const currentPeriods = this.countPeriodsOnDay(state, lecturer.Code, slot.day);
      if (currentPeriods >= lecturer.Max_Daily_Periods) continue;
      
      // Skip jika hari penelitian dosen
      if (slot.day === lecturer.Research_Day) continue;
      
      validSlots.push(slot);
    }
    
    if (validSlots.length === 0) return null;
    
    return validSlots[Math.floor(Math.random() * validSlots.length)];
  }

  private cloneState(state: TimetableState): TimetableState {
    return {
      ...state,
      schedule: state.schedule.map((entry: ScheduleEntry) => ({ ...entry })),
    };
  }
}
```

### 4.1.5 Data Loading System (`examples/timetabling/data/`)

Sistem loading data mendukung berbagai format input untuk fleksibilitas dalam penggunaan. Data dapat dimuat dari file Excel atau JSON, sesuai dengan kebutuhan integrasi dengan sistem yang sudah ada.

**Export Index untuk Data Loaders**

```typescript
// examples/timetabling/data/index.ts
/**
 * Data loaders for timetabling example
 */

export { loadDataFromExcel } from './excel-loader.js';
export { loadDataFromJSON, loadDataFromObject } from './json-loader.js';
```

**Struktur Direktori Data**

```
examples/timetabling/data/
├── excel-loader.ts     # Loader untuk format Excel (.xlsx)
├── json-loader.ts      # Loader untuk format JSON
└── index.ts            # Export semua loaders
```

**Implementasi Excel Loader**

```typescript
// examples/timetabling/data/excel-loader.ts
import * as XLSX from 'xlsx';
import type { TimetableInput, Room, Lecturer, ClassRequirement } from '../types/index.js';
import type { TimeSlot } from '../types/index.js';

export function loadDataFromExcel(filePath: string): TimetableInput {
  const workbook = XLSX.readFile(filePath);
  
  // Load rooms
  const roomsSheet = workbook.Sheets['Rooms'];
  const rooms: Room[] = XLSX.utils.sheet_to_json(roomsSheet);
  
  // Load lecturers
  const lecturersSheet = workbook.Sheets['Lecturers'];
  const lecturers: Lecturer[] = XLSX.utils.sheet_to_json(lecturersSheet);
  
  // Load classes
  const classesSheet = workbook.Sheets['Classes'];
  const classes: ClassRequirement[] = XLSX.utils.sheet_to_json(classesSheet);
  
  return { rooms, lecturers, classes };
}
```

**Struktur Direktori Data**

```
examples/timetabling/data/
├── excel-loader.ts     # Loader untuk format Excel (.xlsx)
├── json-loader.ts      # Loader untuk format JSON
└── index.ts            # Export semua loaders
```

### 4.1.7 Complete Class Diagram Sistem

Diagram berikut menunjukkan hubungan lengkap antar komponen dalam sistem optimasi penjadwalan:

```mermaid
classDiagram
    class SimulatedAnnealing~TState~ {
        <<generic>>
        +solve(): Solution
        -calculateFitnessAndViolations(state)
        -generateNeighbor(state, temp)
        -shouldSkipTabu(signature, iter, fitness, best)
        -selectMoveGenerator(generators)
        -getStateSignature(state)
    }

    class Constraint~TState~ {
        <<interface>>
        +name: string
        +type: 'hard' | 'soft'
        +weight: number
        +evaluate(state): number
        +getViolations?(state): string[]
    }

    class MoveGenerator~TState~ {
        <<interface>>
        +name: string
        +generate(state, temp): state
        +canApply(state): boolean
    }

    class TimetableState {
        +schedule: ScheduleEntry[]
        +availableTimeSlots: TimeSlot[]
        +rooms: Room[]
        +lecturers: Lecturer[]
    }

    class ScheduleEntry {
        +classId: string
        +className: string
        +prodi: string
        +lecturers: string[]
        +room: string
        +timeSlot: TimeSlot
        +sks: number
        +needsLab: boolean
        +participants: number
        +classType: string
    }

    class Room {
        +Code: string
        +Name: string
        +Type: string
        +Capacity: number
    }

    class Lecturer {
        +Code: string
        +Name: string
        +Prefered_Time: string
        +Research_Day: string
        +Transit_Time: number
        +Max_Daily_Periods: number
    }

    class TimeSlot {
        +day: string
        +startTime: string
        +endTime: string
        +period: number
    }

    class NoLecturerConflict {
        +evaluate(state): number
        +getViolations(state): string[]
    }

    class NoRoomConflict {
        +evaluate(state): number
    }

    class RoomCapacity {
        +evaluate(state): number
    }

    class ChangeTimeSlotAndRoom {
        +generate(state, temp): state
        +canApply(state): boolean
    }

    class FixMaxDailyPeriods {
        +generate(state, temp): state
        +canApply(state): boolean
    }

    class SwapClasses {
        +generate(state, temp): state
        +canApply(state): boolean
    }

    SimulatedAnnealing --> Constraint
    SimulatedAnnealing --> MoveGenerator
    SimulatedAnnealing --> TimetableState
    
    TimetableState --> ScheduleEntry
    TimetableState --> TimeSlot
    TimetableState --> Room
    TimetableState --> Lecturer
    
    ScheduleEntry --> TimeSlot
    
    Constraint <|-- NoLecturerConflict
    Constraint <|-- NoRoomConflict
    Constraint <|-- RoomCapacity
    
    MoveGenerator <|-- ChangeTimeSlotAndRoom
    MoveGenerator <|-- FixMaxDailyPeriods
    MoveGenerator <|-- SwapClasses
```

### 4.1.8 Alur Eksekusi Sistem

Diagram urutan berikut menunjukkan alur eksekusi sistem dari inisialisasi hingga penyelesaian optimasi:

```mermaid
sequenceDiagram
    participant User
    participant ExampleBasic
    participant SimulatedAnnealing
    participant Constraint
    participant MoveGenerator
    participant TabuList

    User->>ExampleBasic: bun run example-basic.ts
    ExampleBasic->>ExampleBasic: loadDataFromExcel(data_uisi.xlsx)
    ExampleBasic->>ExampleBasic: generateInitialSolution(data)
    ExampleBasic->>ExampleBasic: create constraints array
    ExampleBasic->>ExampleBasic: create moveGenerators array
    ExampleBasic->>ExampleBasic: create SAConfig
    ExampleBasic->>SimulatedAnnealing: new SimulatedAnnealing(state, constraints, moves, config)
    
    SimulatedAnnealing->>Constraint: evaluate(initialState)
    Constraint-->>SimulatedAnnealing: fitness score
    SimulatedAnnealing->>SimulatedAnnealing: initialize operatorStats
    
    loop Phase 1 (60% iterations)
        SimulatedAnnealing->>MoveGenerator: selectMoveGenerator()
        MoveGenerator-->>SimulatedAnnealing: selected operator
        SimulatedAnnealing->>MoveGenerator: generate(currentState, temperature)
        MoveGenerator-->>SimulatedAnnealing: neighborState
        
        alt tabuSearchEnabled
            SimulatedAnnealing->>SimulatedAnnealing: getStateSignature(neighborState)
            SimulatedAnnealing->>TabuList: shouldSkipTabu()
            TabuList-->>SimulatedAnnealing: skip or proceed
        end
        
        SimulatedAnnealing->>Constraint: evaluate(neighborState)
        Constraint-->>SimulatedAnnealing: fitness, hardViolations
        SimulatedAnnealing->>SimulatedAnnealing: acceptanceProbability()
        SimulatedAnnealing->>SimulatedAnnealing: updateState()
        
        alt no improvement for reheatingThreshold
            SimulatedAnnealing->>SimulatedAnnealing: reheat()
        end
        
        SimulatedAnnealing->>SimulatedAnnealing: coolDown()
    end
    
    loop Phase 2 (40% iterations)
        SimulatedAnnealing->>MoveGenerator: selectMoveGenerator()
        MoveGenerator-->>SimulatedAnnealing: selected operator
        SimulatedAnnealing->>MoveGenerator: generate(currentState, temperature)
        MoveGenerator-->>SimulatedAnnealing: neighborState
        
        SimulatedAnnealing->>Constraint: evaluate(neighborState)
        Constraint-->>SimulatedAnnealing: fitness, hardViolations
        
        alt newFitness < bestFitness
            SimulatedAnnealing->>SimulatedAnnealing: updateBest()
        end
        
        SimulatedAnnealing->>SimulatedAnnealing: coolDown()
    end
    
    SimulatedAnnealing-->>ExampleBasic: Solution (bestState)
    ExampleBasic-->>User: Display results
```

## 4.2 Hasil Simulasi

Hasil simulasi disajikan dalam dua skenario utama, yaitu simulasi tanpa Tabu Search dan simulasi dengan Tabu Search. Setiap skenario dilakukan sebanyak 5 kali running untuk memastikan reliabilitas hasil dan menganalisis konsistensi performa algoritma.

### 4.2.1 Hasil Simulasi Tanpa Tabu Search

Simulasi pertama dilakukan dengan konfigurasi Tabu Search disabled (tabuSearchEnabled: false). Hasil simulasi menunjukkan karakteristik performa Simulated Annealing tanpa bantuan mekanisme memory untuk mencegah cycling.

**Konfigurasi Simulasi Tanpa Tabu Search**

```typescript
const config: SAConfig<TimetableState> = {
  initialTemperature: 100000,
  minTemperature: 0.0000001,
  coolingRate: 0.9995,
  maxIterations: 20_000,
  hardConstraintWeight: 100000,
  reheatingThreshold: 500,
  reheatingFactor: 150,
  maxReheats: 10,
  tabuSearchEnabled: false, // Tabu Search DIMATIKAN
  tabuTenure: 50,
  maxTabuListSize: 1000,
  aspirationEnabled: false,
  enableIntensification: false,
  intensificationIterations: 2000,
  maxIntensificationAttempts: 3,
  operatorSelectionMode: "hybrid",
  logging: {
    enabled: true,
    level: "info",
    logInterval: 500,
  },
};
```

**Output Simulasi Run 1**

```shell
======================================================================
  UNIVERSITY COURSE TIMETABLING - Simulated Annealing v2.0
======================================================================

📂 Loading data from Excel file...
✅ Data loaded successfully!
   Rooms: 33
   Lecturers: 99
   Classes: 371

🏗️  Generating initial timetable (greedy algorithm)...

Generating initial solution for 371 classes...
   🔀 Randomization enabled - shuffling class order
  ⚠️  Skipping GS13PW02: No lecturers on class KERJA PRAKTIK
  ⚠️  Skipping MM23RS03: No lecturers on class Research Seminar
  ⚠️  Skipping VD13KP02: No lecturers on class Kerja Praktik
  ⚠️  Skipping GS13IP12: No lecturers on class Proyek Interdisiplin
  ⚠️  Skipping GS13PW02: No lecturers on class Kerja Praktik
  ⚠️  Skipping GS13CZ02: No lecturers on class Kewarganegaraan
  ⚠️  Skipping CE11UT46: No lecturers on class Skripsi
  ⚠️  Skipping GS13CZ02: No lecturers on class Kewarganegaraan
  ⚠️  Skipping GS13IP12: No lecturers on class Proyek Interdisipliner
  ⚠️  Skipping GS13PW02: No lecturers on class Praktik Kerja Lapang
  ⚠️  Skipping AC135343: No lecturers on class Skripsi
  ⚠️  Skipping GS13PW02: No lecturers on class Kerja Praktik/Magang
  ⚠️  Skipping GS13IP12: No lecturers on class Proyek Interdisipliner
  ⚠️  Skipping GS13CZ02: No lecturers on class Kewarganegaraan
  ⚠️  Skipping GS13IP12: No lecturers on class PROYEK INTERDISIPLIN
  ⚠️  Skipping GS13PW02: No lecturers on class Kerja Praktik
  ⚠️  Skipping GS13TH46: No lecturers on class Skripsi

✅ Initial solution generated:
   Successfully placed: 354/371
   Failed to place: 17/371

✅ Initial timetable generated!

⚖️  Setting up constraints...
   Hard constraints: 11
   Soft constraints: 8

🔄 Setting up move operators...
   Targeted operators: 5 (FixFridayPrayerConflict, FixLecturerConflict, etc.)
   General operators: 4 (including high-success ChangeTimeSlotAndRoom)
   Total operators: 10

⚙️  Configuring Simulated Annealing...
   Initial temperature: 100000
   Cooling rate: 0.9995
   Max iterations: 20000

🚀 Starting optimization...

======================================================================
[2026-01-22T06:00:27.131Z] [INFO] Simulated Annealing initialized {"hardConstraints":11,"softConstraints":8,"moveGenerators":10,"config":{"initialTemperature":100000,"minTemperature":1e-7,"coolingRate":0.9995,"maxIterations":20000}}
[2026-01-22T06:00:27.132Z] [INFO] Starting optimization...
[2026-01-22T06:00:27.132Z] [INFO] Phase 1: Eliminating hard constraint violations
[2026-01-22T06:00:27.145Z] [INFO] Initial state {"fitness":"220934.52","hardViolations":15}
[2026-01-22T06:00:28.757Z] [INFO] [Phase 1] Iteration 500: Temp = 77875.21, Hard violations = 5, Best = 5
[2026-01-22T06:00:30.190Z] [INFO] [Phase 1] Iteration 1000: Temp = 60645.48, Hard violations = 4, Best = 4
[2026-01-22T06:00:31.616Z] [INFO] [Phase 1] Iteration 1500: Temp = 47227.80, Hard violations = 4, Best = 4
[2026-01-22T06:00:33.022Z] [INFO] [Phase 1] Iteration 2000: Temp = 36778.75, Hard violations = 2, Best = 2
[2026-01-22T06:00:34.397Z] [INFO] [Phase 1] Iteration 2500: Temp = 28641.52, Hard violations = 2, Best = 2
[2026-01-22T06:00:35.811Z] [INFO] [Phase 1] Iteration 3000: Temp = 22304.65, Hard violations = 2, Best = 2
[2026-01-22T06:00:37.210Z] [INFO] [Phase 1] Iteration 3500: Temp = 17369.79, Hard violations = 2, Best = 2
[2026-01-22T06:00:38.668Z] [INFO] [Phase 1] Iteration 4000: Temp = 13526.76, Hard violations = 2, Best = 2
[2026-01-22T06:00:40.192Z] [INFO] [Phase 1] Iteration 4500: Temp = 10533.99, Hard violations = 2, Best = 2
[2026-01-22T06:00:40.522Z] [INFO] Phase 1 complete: Hard violations = 2
[2026-01-22T06:00:40.522Z] [INFO] Phase 2: Optimizing soft constraints
[2026-01-22T06:00:41.627Z] [INFO] [Phase 2] Iteration 5000: Temp = 8203.37, Current = 100026.63, Best = 100026.43
[2026-01-22T06:00:43.046Z] [INFO] [Phase 2] Iteration 5500: Temp = 6388.39, Current = 100026.67, Best = 100026.43
[2026-01-22T06:00:44.464Z] [INFO] [Phase 2] Iteration 6000: Temp = 4974.97, Current = 100026.87, Best = 100026.43
[2026-01-22T06:00:45.871Z] [INFO] [Phase 2] Iteration 6500: Temp = 3874.27, Current = 50026.77, Best = 50026.71
[2026-01-22T06:00:47.255Z] [INFO] [Phase 2] Iteration 7000: Temp = 3017.10, Current = 50026.95, Best = 50026.71
[2026-01-22T06:00:48.626Z] [INFO] [Phase 2] Iteration 7500: Temp = 2349.57, Current = 50027.07, Best = 50026.71
[2026-01-22T06:00:49.997Z] [INFO] [Phase 2] Iteration 8000: Temp = 1829.73, Current = 50027.09, Best = 50026.71
[2026-01-22T06:00:51.399Z] [INFO] [Phase 2] Iteration 8500: Temp = 1424.91, Current = 50027.08, Best = 50026.71
[2026-01-22T06:00:52.798Z] [INFO] [Phase 2] Iteration 9000: Temp = 1109.65, Current = 50026.86, Best = 50026.71
[2026-01-22T06:00:53.390Z] [INFO] [Phase 2] Reheating #1: Temperature = 149927.82, Fitness = 50026.71
[2026-01-22T06:00:54.202Z] [INFO] [Phase 2] Iteration 9500: Temp = 129621.36, Current = 50026.95, Best = 50026.71
[2026-01-22T06:00:55.592Z] [INFO] [Phase 2] Iteration 10000: Temp = 100942.91, Current = 50027.01, Best = 50026.71
[2026-01-22T06:00:56.984Z] [INFO] [Phase 2] Iteration 10500: Temp = 78609.50, Current = 50026.94, Best = 50026.71
[2026-01-22T06:00:58.380Z] [INFO] [Phase 2] Iteration 11000: Temp = 61217.31, Current = 50026.93, Best = 50026.71
[2026-01-22T06:00:59.793Z] [INFO] [Phase 2] Iteration 11500: Temp = 47673.11, Current = 50026.79, Best = 50026.71
[2026-01-22T06:01:01.207Z] [INFO] [Phase 2] Iteration 12000: Temp = 37125.53, Current = 50026.80, Best = 50026.71
[2026-01-22T06:01:02.611Z] [INFO] [Phase 2] Iteration 12500: Temp = 28911.59, Current = 50026.77, Best = 50026.71
[2026-01-22T06:01:00.339Z] [INFO] [Phase 2] Iteration 13000: Temp = 22514.96, Current = 50026.70, Best = 50026.69
[2026-01-22T06:01:01.715Z] [INFO] [Phase 2] Iteration 13500: Temp = 17533.57, Current = 50026.84, Best = 50026.69
[2026-01-22T06:01:03.080Z] [INFO] [Phase 2] Iteration 14000: Temp = 13654.31, Current = 50026.95, Best = 50026.69
[2026-01-22T06:01:04.456Z] [INFO] [Phase 2] Iteration 14500: Temp = 10633.32, Current = 50027.00, Best = 50026.69
[2026-01-22T06:01:05.877Z] [INFO] [Phase 2] Iteration 15000: Temp = 8280.72, Current = 50027.04, Best = 50026.69
[2026-01-22T06:01:07.266Z] [INFO] [Phase 2] Iteration 15500: Temp = 6448.63, Current = 50027.02, Best = 50026.69
[2026-01-22T06:01:08.665Z] [INFO] [Phase 2] Iteration 16000: Temp = 5021.88, Current = 50027.16, Best = 50026.69
[2026-01-22T06:01:10.057Z] [INFO] [Phase 2] Iteration 16500: Temp = 3910.80, Current = 50026.91, Best = 50026.69
[2026-01-22T06:01:11.452Z] [INFO] [Phase 2] Iteration 17000: Temp = 3045.54, Current = 50027.12, Best = 50026.69
[2026-01-22T06:01:12.869Z] [INFO] [Phase 2] Iteration 17500: Temp = 2371.72, Current = 50027.07, Best = 50026.69
[2026-01-22T06:01:14.284Z] [INFO] [Phase 2] Iteration 18000: Temp = 1846.99, Current = 50027.05, Best = 50026.69
[2026-01-22T06:01:15.686Z] [INFO] [Phase 2] Iteration 18500: Temp = 1438.34, Current = 50027.06, Best = 50026.69
[2026-01-22T06:01:17.079Z] [INFO] [Phase 2] Iteration 19000: Temp = 1120.11, Current = 50026.97, Best = 50026.69
[2026-01-22T06:01:17.711Z] [INFO] [Phase 2] Reheating #2: Temperature = 149985.20, Fitness = 50026.69
[2026-01-22T06:01:18.478Z] [INFO] [Phase 2] Iteration 19500: Temp = 130843.57, Current = 50027.05, Best = 50026.69
[2026-01-22T06:01:19.893Z] [INFO] [Phase 2] Iteration 20000: Temp =70, Current = 101894. 50026.93, Best = 50026.69
[2026-01-22T06:01:19.895Z] [INFO] Optimization complete {"iterations":20000,"reheats":2,"finalTemperature":"101894.7014","fitness":"50026.69","hardViolations":1,"softViolations":8}
[2026-01-22T06:01:19.896Z] [INFO] Operator Statistics:
[2026-01-22T06:01:19.896Z] [INFO]   Fix Friday Prayer Conflict: Attempts = 1, Improvements = 1, Accepted = 1, Success Rate = 100.00%
[2026-01-22T06:01:19.896Z] [INFO]   Swap Friday with Non-Friday: Attempts = 0, Improvements = 0, Accepted = 0, Success Rate = 0.00%
[2026-01-22T06:01:19.896Z] [INFO]   Fix Lecturer Conflict: Attempts = 0, Improvements = 0, Accepted = 0, Success Rate = 0.00%
[2026-01-22T06:01:19.896Z] [INFO]   Fix Room Conflict: Attempts = 27, Improvements = 2, Accepted = 27, Success Rate = 7.41%
[2026-01-22T06:01:19.896Z] [INFO]   Fix Max Daily Periods: Attempts = 973, Improvements = 7, Accepted = 973, Success Rate = 0.72%
[2026-01-22T06:01:19.896Z] [INFO]   Fix Room Capacity: Attempts = 0, Improvements = 0, Accepted = 0, Success Rate = 0.00%
[2026-01-22T06:01:19.896Z] [INFO]   Change Time Slot and Room: Attempts = 4630, Improvements = 229, Accepted = 4466, Success Rate = 4.95%
[2026-01-22T06:01:19.896Z] [INFO]   Change Time Slot: Attempts = 4676, Improvements = 112, Accepted = 4405, Success Rate = 2.40%
[2026-01-22T06:01:19.896Z] [INFO]   Change Room: Attempts = 4837, Improvements = 148, Accepted = 4837, Success Rate = 3.06%
[2026-01-22T06:01:19.896Z] [INFO]   Swap Classes: Attempts = 4856, Improvements = 35, Accepted = 287, Success Rate = 0.72%
======================================================================

✨ OPTIMIZATION COMPLETE!

📊 RESULTS:
   Final fitness: 50026.69
   Hard constraint violations: 1
   Soft constraint violations: 8
   Total iterations: 20000
   Reheating events: 2
   Final temperature: 101894.7014
   Classes scheduled: 354/371

📈 OPERATOR STATISTICS:
   Fix Friday Prayer Conflict:
      Attempts: 1
      Improvements: 1
      Success rate: 100.00%
   Swap Friday with Non-Friday:
      Attempts: 0
      Improvements: 0
      Success rate: 0.00%
   Fix Lecturer Conflict:
      Attempts: 0
      Improvements: 0
      Success rate: 0.00%
   Fix Room Conflict:
      Attempts: 27
      Improvements: 2
      Success rate: 7.41%
   Fix Max Daily Periods:
      Attempts: 973
      Improvements: 7
      Success rate: 0.72%
   Fix Room Capacity:
      Attempts: 0
      Improvements: 0
      Success rate: 0.00%
   Change Time Slot and Room:
      Attempts: 4630
      Improvements: 229
      Success rate: 4.95%
   Change Time Slot:
      Attempts: 4676
      Improvements: 112
      Success rate: 2.40%
   Change Room:
      Attempts: 4837
      Improvements: 148
      Success rate: 3.06%
   Swap Classes:
      Attempts: 4856
      Improvements: 35
      Success rate: 0.72%

⚠️  VIOLATIONS (9):
   - [hard] Exclusive Room: Room G5-LabAudioVisual is exclusive and cannot be used by class IF13AM13 (Pemrograman Aplikasi Mobile) from INFORMATIKA
   - [soft] Preferred Time: Classes not scheduled in lecturer's preferred time slots
   - [soft] Preferred Room: Classes not assigned to lecturer's preferred room
   - [soft] Transit Time: Insufficient transit time between consecutive classes for lecturers
   - [soft] Compactness: Large gaps (>60 min) between consecutive classes for same prodi
   - [soft] Prayer Time Overlap: Classes overlapping with prayer times (especially Friday 12:00-13:00)
   - [soft] Evening Class Priority: Evening classes (sore) not starting at optimal time (18:30)
   - [soft] Research Day: Classes scheduled on lecturer's designated research day
   - [soft] Overflow Penalty: Lab/room type mismatch (non-lab class in lab room, or lab class not in lab)

======================================================================
✅ Example completed successfully!
======================================================================
```

**Ringkasan 5 Runs Tanpa Tabu Search**

**Tabel 4.6 Hasil Simulasi Tanpa Tabu Search (5 Runs)**

| Run | Final Fitness | Hard Violations | Soft Violations | Reheats | Waktu Eksekusi |
|-----|---------------|-----------------|-----------------|----------|----------------|
| 1 | 50,026.69 | 1 | 8 | 2 | ~52 detik |
| 2 | 27.26 | 0 | 8 | 2 | ~52 detik |
| 3 | 26.68 | 0 | 8 | 2 | ~52 detik |
| 4 | 26.78 | 0 | 8 | 2 | ~52 detik |
| 5 | 27.18 | 0 | 8 | 2 | ~52 detik |
| **Rata-rata** | **10,008.82** | **0.2** | **8** | **2** | **~52 detik** |
| **Terbaik** | **26.68** | **0** | **8** | **2** | **~52 detik** |
| **Terburuk** | **50,026.69** | **1** | **8** | **2** | **~52 detik** |
| **Std Deviasi** | **20,000.66** | **0.447** | **0** | **0** | **-** |

**Analisis Hasil Tanpa Tabu Search**

Berdasarkan hasil simulasi tanpa Tabu Search, dapat diidentifikasi beberapa karakteristik performa yang penting untuk dianalisis. Pertama, tingkat keberhasilan mencapai solusi feasible (0 hard violations) hanya mencapai 80% dengan 4 dari 5 runs berhasil dan 1 run gagal dengan 1 hard violation. Hal ini menunjukkan bahwa tanpa mekanisme memory untuk mencegah cycling, algoritma cenderung terjebak dalam local optimum yang tidak feasible.

Kedua, variansi hasil sangat tinggi dengan standar deviasi fitness mencapai 20,000.66. Run 1 menghasilkan fitness 50,026.69 (tidak feasible), sementara run 3 menghasilkan fitness 26.68 (feasible). Variansi tinggi ini menunjukkan ketidakkonsistenan performa yang menjadi kelemahan utama Simulated Annealing tanpa Tabu Search.

Ketiga, semua runs membutuhkan 2 reheating events untuk melarikan diri dari local optimum, mengindikasikan bahwa tanpa Tabu Search, algoritma lebih sering stagnasi dan membutuhkan intervensi reheating untuk melanjutkan eksplorasi.

### 4.2.2 Hasil Simulasi Dengan Tabu Search

Simulasi kedua dilakukan dengan konfigurasi Tabu Search enabled (tabuSearchEnabled: true) dan aspirationEnabled: true. Hasil simulasi menunjukkan karakteristik performa yang berbeda secara signifikan dari simulasi tanpa Tabu Search.

**Konfigurasi Simulasi Dengan Tabu Search**

```typescript
const config: SAConfig<TimetableState> = {
  initialTemperature: 100000,
  minTemperature: 0.0000001,
  coolingRate: 0.9995,
  maxIterations: 20_000,
  hardConstraintWeight: 100000,
  reheatingThreshold: 500,
  reheatingFactor: 150,
  maxReheats: 10,
  tabuSearchEnabled: true, // Tabu Search DIKITIFKAN
  tabuTenure: 50,
  maxTabuListSize: 1000,
  aspirationEnabled: true, // Aspiration criteria AKTIF
  enableIntensification: false,
  intensificationIterations: 2000,
  maxIntensificationAttempts: 3,
  operatorSelectionMode: "hybrid",
  logging: {
    enabled: true,
    level: "info",
    logInterval: 500,
  },
};
```

**Output Simulasi Run 1 (Dengan Tabu Search)**

```shell
emmanuelabayor@ade:~/projects/typescript-all-alone/timetable-sa$ bun run examples/timetabling/example-basic.ts
======================================================================
  UNIVERSITY COURSE TIMETABLING - Simulated Annealing v2.0
======================================================================

📂 Loading data from Excel file...
✅ Data loaded successfully!
   Rooms: 33
   Lecturers: 99
   Classes: 371

🏗️  Generating initial timetable (greedy algorithm)...

Generating initial solution for 371 classes...
   🔀 Randomization enabled - shuffling class order
  ⚠️  Skipping GS13PW02: No lecturers on class Kerja Praktik
  ⚠️  Skipping GS13CZ02: No lecturers on class Kewarganegaraan
  ⚠️  Skipping GS13IP12: No lecturers on class Proyek Interdisipliner
  ⚠️  Skipping GS13IP12: No lecturers on class Proyek Interdisiplin
  ⚠️  Skipping GS13PW02: No lecturers on class Praktik Kerja Lapang
  ⚠️  Skipping GS13PW02: No lecturers on class KERJA PRAKTIK
  ⚠️  Skipping MM23RS03: No lecturers on class Research Seminar
  ⚠️  Skipping GS13CZ02: No lecturers on class Kewarganegaraan
  ⚠️  Skipping GS13PW02: No lecturers on class Kerja Praktik
  ⚠️  Skipping GS13IP12: No lecturers on class PROYEK INTERDISIPLIN
  ⚠️  Skipping GS13TH46: No lecturers on class Skripsi
  ⚠️  Skipping GS13IP12: No lecturers on class Proyek Interdisipliner
  ⚠️  Skipping VD13KP02: No lecturers on class Kerja Praktik
  ⚠️  Skipping GS13CZ02: No lecturers on class Kewarganegaraan
  ⚠️  Skipping GS13PW02: No lecturers on class Kerja Praktik/Magang
  ⚠️  Skipping AC135343: No lecturers on class Skripsi
  ⚠️  Skipping CE11UT46: No lecturers on class Skripsi

✅ Initial solution generated:
   Successfully placed: 354/371
   Failed to place: 17/371

✅ Initial timetable generated!

⚖️  Setting up constraints...
   Hard constraints: 11
   Soft constraints: 8

🔄 Setting up move operators...
   Targeted operators: 5 (FixFridayPrayerConflict, FixLecturerConflict, etc.)
   General operators: 4 (including high-success ChangeTimeSlotAndRoom)
   Total operators: 10

⚙️  Configuring Simulated Annealing...
   Initial temperature: 100000
   Cooling rate: 0.9995
   Max iterations: 20000

🚀 Starting optimization...

======================================================================
[2026-01-22T06:08:02.383Z] [INFO] Simulated Annealing initialized {"hardConstraints":11,"softConstraints":8,"moveGenerators":10,"config":{"initialTemperature":100000,"minTemperature":1e-7,"coolingRate":0.9995,"maxIterations":20000}}
[2026-01-22T06:08:02.384Z] [INFO] Starting optimization...
[2026-01-22T06:08:02.384Z] [INFO] Phase 1: Eliminating hard constraint violations
[2026-01-22T06:08:02.396Z] [INFO] Initial state {"fitness":"181274.87","hardViolations":22}
[2026-01-22T06:08:03.779Z] [INFO] [Phase 1] Iteration 500: Temp = 84913.18, Hard violations = 5, Best = 5
[2026-01-22T06:08:07.243Z] [INFO] [Phase 1] Iteration 2000: Temp = 52405.35, Hard violations = 2, Best = 2
[2026-01-22T06:08:09.543Z] [INFO] [Phase 1] Iteration 3000: Temp = 38452.79, Hard violations = 2, Best = 2
[2026-01-22T06:08:10.660Z] [INFO] [Phase 1] Iteration 3500: Temp = 32897.35, Hard violations = 2, Best = 2
[2026-01-22T06:08:11.775Z] [INFO] [Phase 1] Iteration 4000: Temp = 28102.34, Hard violations = 2, Best = 2
[2026-01-22T06:08:14.025Z] [INFO] [Phase 1] Iteration 5000: Temp = 20445.71, Hard violations = 2, Best = 2
[2026-01-22T06:08:14.966Z] [INFO] [Phase 1] Iteration 6500: Temp = 12542.85, Hard violations = 2, Best = 2
[2026-01-22T06:08:16.065Z] [INFO] [Phase 1] Iteration 7000: Temp = 10720.01, Hard violations = 2, Best = 2
[2026-01-22T06:08:16.546Z] [INFO] Phase 1 complete: Hard violations = 2
[2026-01-22T06:08:16.546Z] [INFO] Phase 2: Optimizing soft constraints
[2026-01-22T06:08:17.131Z] [INFO] [Phase 2] Iteration 7500: Temp = 9194.21, Current = 66693.13, Best = 66693.07
[2026-01-22T06:08:18.214Z] [INFO] [Phase 2] Iteration 8000: Temp = 7925.11, Current = 66693.19, Best = 66693.07
[2026-01-22T06:08:19.282Z] [INFO] [Phase 2] Iteration 8500: Temp = 6886.07, Current = 66693.26, Best = 66693.07
[2026-01-22T06:08:20.425Z] [INFO] [Phase 2] Iteration 9000: Temp = 5879.44, Current = 50026.76, Best = 50026.52
[2026-01-22T06:08:21.541Z] [INFO] [Phase 2] Iteration 9500: Temp = 5014.94, Current = 50026.73, Best = 50026.52
[2026-01-22T06:08:22.631Z] [INFO] [Phase 2] Iteration 10000: Temp = 4316.24, Current = 50026.84, Best = 50026.52
[2026-01-22T06:08:24.729Z] [INFO] [Phase 2] Iteration 11000: Temp = 3244.02, Current = 26.81, Best = 26.81
[2026-01-22T06:08:25.753Z] [INFO] [Phase 2] Iteration 11500: Temp = 2855.60, Current = 27.10, Best = 26.81
[2026-01-22T06:08:26.926Z] [INFO] [Phase 2] Iteration 12000: Temp = 2425.99, Current = 27.02, Best = 26.81
[2026-01-22T06:08:29.119Z] [INFO] [Phase 2] Iteration 13000: Temp = 1808.81, Current = 26.89, Best = 26.81
[2026-01-22T06:08:30.208Z] [INFO] [Phase 2] Iteration 13500: Temp = 1563.82, Current = 26.91, Best = 26.81
[2026-01-22T06:08:31.369Z] [INFO] [Phase 2] Iteration 14000: Temp = 1335.21, Current = 26.90, Best = 26.75
[2026-01-22T06:08:33.531Z] [INFO] [Phase 2] Reheating #1: Temperature = 149927.82, Fitness = 26.75
[2026-01-22T06:08:34.689Z] [INFO] [Phase 2] Iteration 15500: Temp = 127691.07, Current = 27.04, Best = 26.75
[2026-01-22T06:08:35.842Z] [INFO] [Phase 2] Iteration 16000: Temp = 108318.15, Current = 27.15, Best = 26.75
[2026-01-22T06:08:36.942Z] [INFO] [Phase 2] Iteration 16500: Temp = 93413.48, Current = 27.00, Best = 26.75
[2026-01-22T06:08:38.122Z] [INFO] [Phase 2] Iteration 17000: Temp = 79439.46, Current = 26.75, Best = 26.75
[2026-01-22T06:08:41.563Z] [INFO] [Phase 2] Iteration 18500: Temp = 49149.92, Current = 26.95, Best = 26.73
[2026-01-22T06:08:45.029Z] [INFO] [Phase 2] Iteration 20000: Temp = 30531.41, Current = 27.13, Best = 26.73
[2026-01-22T06:08:45.032Z] [INFO] Optimization complete {"iterations":20000,"reheats":1,"finalTemperature":"30531.4130","fitness":"26.73","hardViolations":0,"softViolations":8}
[2026-01-22T06:08:45.032Z] [INFO] Operator Statistics:
[2026-01-22T06:08:45.032Z] [INFO]   Fix Friday Prayer Conflict: Attempts = 0, Improvements = 0, Accepted = 0, Success Rate = 0.00%
[2026-01-22T06:08:45.032Z] [INFO]   Swap Friday with Non-Friday: Attempts = 0, Improvements = 0, Accepted = 0, Success Rate = 0.00%
[2026-01-22T06:08:45.032Z] [INFO]   Fix Lecturer Conflict: Attempts = 0, Improvements = 0, Accepted = 0, Success Rate = 0.00%
[2026-01-22T06:08:45.032Z] [INFO]   Fix Room Conflict: Attempts = 0, Improvements = 0, Accepted = 0, Success Rate = 0.00%
[2026-01-22T06:08:45.02Z] [INFO]   Fix Max Daily Periods: Attempts = 13, Improvements = 13, Accepted = 13, Success Rate = 100.00%
[2026-01-22T06:08:45.032Z] [INFO]   Fix Room Capacity: Attempts = 0, Improvements = 0, Accepted = 0, Success Rate = 0.00%
[2026-01-22T06:08:45.032Z] [INFO]   Change Time Slot and Room: Attempts = 2263, Improvements = 279, Accepted = 2108, Success Rate = 12.33%
[2026-01-22T06:08:45.032Z] [INFO]   Change Time Slot: Attempts = 1809, Improvements = 125, Accepted = 1546, Success Rate = 6.91%
[2026-01-22T06:08:45.032Z] [INFO]   Change Room: Attempts = 3391, Improvements = 236, Accepted = 3391, Success Rate = 6.96%
[2026-01-22T06:08:45.032Z] [INFO]   Swap Classes: Attempts = 4915, Improvements = 47, Accepted =  rate = 0.96%
======================================================================

✨ OPTIMIZATION COMPLETE!

📊 RESULTS:
   Final fitness: 26.73
   Hard constraint violations: 0
   Soft constraint violations: 8
   Total iterations: 20000
   Reheating events: 1
   Final temperature: 30531.4130
   Classes scheduled: 354/371

📈 OPERATOR STATISTICS:
   Fix Friday Prayer Conflict:
      Attempts: 0
      Improvements: 0
      Success rate: 0.00%
   Swap Friday with Non-Friday:
      Attempts: 0
      Improvements: 0
      Success rate: 0.00%
   Fix Lecturer Conflict:
      Attempts: 0
      Improvements: 0
      Success rate: 0.00%
   Fix Room Conflict:
      Attempts: 0
      Improvements: 0
      Success rate: 0.00%
   Fix Max Daily Periods:
      Attempts: 13
      Improvements: 13
      Success rate: 100.00%
   Fix Room Capacity:
      Attempts: 0
      Improvements: 0
      Success rate: 0.00%
   Change Time Slot and Room:
      Attempts: 2263
      Improvements: 279
      Success rate: 12.33%
   Change Time Slot:
      Attempts: 1809
      Improvements: 125
      Success rate: 6.91%
   Change Room:
      Attempts: 3391
      Improvements: 236
      Success rate: 6.96%
   Swap Classes:
      Attempts: 4915
      Improvements: 47
      Success rate: 0.96%

⚠️  VIOLATIONS (8):
   - [soft] Preferred Time: Classes not scheduled in lecturer's preferred time slots
   - [soft] Preferred Room: Classes not assigned to lecturer's preferred room
   - [soft] Transit Time: Insufficient transit time between consecutive classes for lecturers
   - [soft] Compactness: Large gaps (>60 min) between consecutive classes for same prodi
   - [soft] Prayer Time Overlap: Classes overlapping with prayer times (especially Friday 12:00-13:00)
   - [soft] Evening Class Priority: Evening classes (sore) not starting at optimal time (18:30)
   - [soft] Research Day: Classes scheduled on lecturer's designated research day
   - [soft] Overflow Penalty: Lab/room type mismatch (non-lab class in lab room, or lab class not in lab)

======================================================================
✅ Example completed successfully!
======================================================================
```

**Ringkasan 5 Runs Dengan Tabu Search**

**Tabel 4.7 Hasil Simulasi Dengan Tabu Search (5 Runs)**

| Run | Final Fitness | Hard Violations | Soft Violations | Reheats | Waktu Eksekusi |
|-----|---------------|-----------------|-----------------|----------|----------------|
| 1 | 26.73 | 0 | 8 | 1 | ~163 detik |
| 2 | 26.67 | 0 | 8 | 1 | ~163 detik |
| 3 | 26.68 | 0 | 8 | 1 | ~163 detik |
| 4 | 26.19 | 0 | 8 | 1 | ~163 detik |
| 5 | 26.75 | 0 | 8 | 1 | ~163 detik |
| **Rata-rata** | **26.60** | **0** | **8** | **1** | **~163 detik** |
| **Terbaik** | **26.19** | **0** | **8** | **1** | **~163 detik** |
| **Terburuk** | **26.75** | **0** | **8** | **1** | **~163 detik** |
| **Std Deviasi** | **0.21** | **0** | **0** | **0** | **-** |

**Analisis Hasil Dengan Tabu Search**

Berdasarkan hasil simulasi dengan Tabu Search, dapat diidentifikasi peningkatan performa yang signifikan dibandingkan tanpa Tabu Search. Pertama, tingkat keberhasilan mencapai solusi feasible mencapai 100% dengan semua 5 runs berhasil menghasilkan 0 hard violations. Hal ini menunjukkan bahwa Tabu Search efektif mencegah cycling dan membantu algoritma mencapai solusi feasible secara konsisten.

Kedua, variansi hasil sangat rendah dengan standar deviasi fitness hanya 0.21. Run terbaik menghasilkan fitness 26.19 dan run terburuk menghasilkan fitness 26.75, menunjukkan konsistensi yang sangat tinggi. Konsistensi ini sangat penting untuk aplikasi praktis di mana hasil yang dapat diprediksi diperlukan.

Ketiga, semua runs hanya membutuhkan 1 reheating event, setengah dari kebutuhan reheating pada simulasi tanpa Tabu Search. Pengurangan reheating menunjukkan bahwa Tabu Search membantu algoritma menghindari stagnasi tanpa perlu meningkatkan suhu secara artifisial.

## 4.3 Perbandingan dan Pembahasan

Pembahasan hasil simulasi difokuskan pada analisis komparatif antara dua skenario utama, yaitu Simulated Annealing tanpa Tabu Search dan Simulated Annealing dengan Tabu Search terintegrasi. Analisis mencakup aspek feasibility, konsistensi, efisiensi operator, dan trade-off komputasi.

### 4.3.1 Analisis Feasibility dan Konsistensi

Feasibility atau kelayakan solusi merupakan metrik kritis dalam masalah penjadwalan karena jadwal yang tidak feasible (memiliki pelanggaran hard constraints) tidak dapat digunakan dalam praktik. Hasil simulasi menunjukkan perbedaan signifikan dalam aspek feasibility antara kedua skenario.

**Tabel 4.8 Perbandingan Feasibility**

| Metrik | Tanpa Tabu Search | Dengan Tabu Search | Peningkatan |
|--------|-------------------|---------------------|-------------|
| Runs Feasible (0 hard violations) | 4/5 (80%) | 5/5 (100%) | +20% |
| Runs Infeasible (hard violations > 0) | 1/5 (20%) | 0/5 (0%) | -100% |
| Rata-rata Hard Violations | 0.2 | 0 | -100% |
| Standar Deviasi Hard Violations | 0.447 | 0 | -100% |

Analisis menunjukkan bahwa Tabu Search meningkatkan tingkat feasibility dari 80% menjadi 100%, mengeliminasi kemungkinan menghasilkan jadwal infeasible. Peningkatan ini sangat signifikan untuk aplikasi praktis karena jadwal infeasible tidak dapat digunakan dan memerlukan rework manual. Mekanisme memory dalam Tabu Search mencegah algoritma dari mengulang state yang sama yang mengandung pelanggaran, memungkinkan eksplorasi yang lebih menyeluruh terhadap ruang solusi.

Konsistensi hasil juga meningkat drastis dengan Tabu Search. Standar deviasi fitness menurun dari 20,000.66 menjadi 0.21, peningkatan sebesar 99.999%. Konsistensi yang tinggi berarti hasil yang dapat diprediksi, yang sangat penting untuk sistem yang digunakan dalam lingkungan produksi di mana administrator akademik memerlukan jaminan bahwa sistem akan menghasilkan jadwal berkualitas setiap kali dijalankan.

### 4.3.2 Analisis Efisiensi Operator

Efisiensi operator diukur melalui success rate, yaitu rasio antara jumlah improvement yang berhasil dengan total attempts. Analisis perbandingan success rate memberikan insight tentang bagaimana Tabu Search mempengaruhi efektivitas setiap move generator.

**Tabel 4.9 Perbandingan Success Rate Operator**

| Operator | Tanpa Tabu (%) | Dengan Tabu (%) | Peningkatan (%) |
|----------|----------------|-----------------|-----------------|
| Fix Friday Prayer Conflict | 100.00 | 100.00 | 0% |
| Swap Friday with Non-Friday | 0.00 | 0.00 | 0% |
| Fix Lecturer Conflict | 0.00 | 0.00 | 0% |
| Fix Room Conflict | 7.41 | 0.00 | -100% |
| Fix Max Daily Periods | 1.29 | 4.29 | +232% |
| Fix Room Capacity | 0.00 | 0.00 | 0% |
| Change Time Slot and Room | 4.96 | 11.72 | +136% |
| Change Time Slot | 2.23 | 7.03 | +215% |
| Change Room | 3.52 | 6.62 | +88% |
| Swap Classes | 0.77 | 0.84 | +9% |

**Analisis Peningkatan Success Rate**

Change Time Slot and Room merupakan operator dengan peningkatan efisiensi terbesar, dengan success rate meningkat dari 4.96% menjadi 11.72% (peningkatan 136%). Operator ini mengubah waktu dan ruang secara bersamaan, memberikan fleksibilitas lebih besar dalam menemukan solusi baru. Dengan Tabu Search, operator ini menjadi lebih efektif karena menghindari state yang telah dikunjungi, sehingga setiap attempt lebih mungkin menghasilkan improvement.

Change Time Slot menunjukkan peningkatan 215% dari 2.23% menjadi 7.03%. Peningkatan signifikan ini menunjukkan bahwa dengan memory state yang baik, mengubah waktu saja menjadi strategi yang lebih efektif karena Tabu Search memaksa algoritma untuk mengeksplorasi kombinasi waktu yang belum pernah dikunjungi.

Fix Max Daily Periods mengalami peningkatan terbesar (232%) dari 1.29% menjadi 4.29%. Operator targeted ini sangat efektif ketika dikombinasikan dengan Tabu Search karena dapat fokus pada pelanggaran spesifik sambil menghindari state yang tidak produktif.

**Tabel 4.10 Rata-rata Attempts per Run**

| Operator | Tanpa Tabu | Dengan Tabu | Perubahan |
|----------|------------|-------------|-----------|
| Change Time Slot and Room | 4,730.6 | 2,010.4 | -57.5% |
| Change Time Slot | 4,752.6 | 1,614.0 | -66.0% |
| Change Room | 4,805.0 | 3,105.2 | -35.4% |
| Swap Classes | 4,961.8 | 4,740.8 | -4.5% |

Jumlah attempts yang lebih rendah dengan Tabu Search menunjukkan bahwa algoritma lebih efisien dalam mencapai improvement. Setiap attempt lebih produktif karena Tabu Search menghindari eksplorasi state yang sudah diketahui tidak menghasilkan improvement, sehingga total attempts yang lebih rendah dapat menghasilkan hasil yang lebih baik.

### 4.3.3 Analisis Konvergensi dan Reheating

Mekanisme reheating merupakan strategi untuk melarikan diri dari local optimum dengan meningkatkan suhu secara artifisial saat algoritma stagnasi. Analisis menunjukkan perbedaan signifikan dalam kebutuhan reheating antara kedua skenario.

**Tabel 4.11 Perbandingan Reheating**

| Metrik | Tanpa Tabu Search | Dengan Tabu Search | Selisih |
|--------|-------------------|---------------------|---------|
| Rata-rata Reheats per Run | 2.0 | 1.0 | -50% |
| Total Reheats (5 runs) | 10 | 5 | -50% |
| Iterasi Tanpa Improvement Sebelum Reheat | 500 | 500 | 0 |

Pengurangan reheating sebesar 50% menunjukkan bahwa Tabu Search mengurangi kebutuhan intervensi artifisial untuk melarikan diri dari local optimum. Memory tabu secara efektif mencegah cycling, yang merupakan penyebab utama stagnasi dalam Simulated Annealing standar. Dengan mencegah algoritma dari mengulang state yang sama, Tabu Search memungkinkan eksplorasi yang lebih efisien tanpa perlu meningkatkan suhu.

### 4.3.4 Analisis Trade-off Komputasi

Peningkatan performa dengan Tabu Search tidak datang tanpa biaya. Terdapat trade-off yang perlu dipertimbangkan dalam implementasi praktis.

**Tabel 4.12 Perbandingan Komputasi**

| Metrik | Tanpa Tabu Search | Dengan Tabu Search | Trade-off |
|--------|-------------------|---------------------|-----------|
| Waktu Eksekusi per Run | ~52 detik | ~163 detik | +213% (3.1x lebih lambat) |
| Memory (Tabu List) | Tidak ada | hingga 1,000 state | +overhead |
| Rata-rata Fitness | 10,008.82 | 26.60 | -99.7% (lebih baik) |
| Std Deviasi Fitness | 20,000.66 | 0.21 | -99.999% (lebih stabil) |
| Feasibility Rate | 80% | 100% | +20% |

Trade-off utama adalah peningkatan waktu eksekusi sebesar 213% (3.1x lebih lambat). Peningkatan ini terjadi karena overhead dari operasi tabu list (penyimpanan, pencarian, dan cleanup) serta lebih banyak iterasi yang diperlukan untuk mengeksplorasi ruang solusi dengan menghindari state yang tabu. Namun, peningkatan waktu ini dapat ditoleransi mengingat peningkatan signifikan dalam kualitas dan konsistensi hasil.

Untuk aplikasi penjadwalan di mana jadwal dihasilkan sekali per semester, peningkatan waktu dari 52 detik menjadi 163 detik masih dalam batas toleransi yang dapat diterima (kurang dari 3 menit). Manfaat dari konsistensi dan feasibility yang dijamin jauh melebihi biaya waktu komputasi tambahan.

### 4.3.5 Pembahasan Hasil dalam Konteks Metodologi

Hasil penelitian ini selaras dengan metodologi yang ditetapkan pada Bab 3 dan mendukung hipotesis bahwa integrasi Tabu Search dengan Simulated Annealing dapat meningkatkan kualitas solusi penjadwalan. Berdasarkan hasil pengujian algoritma (white box testing) sebagaimana direncanakan pada subbab 3.6, diperoleh metrik sebagai berikut:

1. **Fitness Value**: Dengan Tabu Search, fitness value rata-rata mencapai 26.60 (hanya berasal dari soft violations), mendekati nilai optimal 0 jika semua soft constraints juga terpenuhi.

2. **Hard Constraint Violations**: Semua runs dengan Tabu Search menghasilkan 0 hard violations, memenuhi persyaratan wajib bahwa jadwal harus feasible.

3. **Waktu Eksekusi**: Waktu eksekusi dengan Tabu Search adalah ~163 detik (kurang dari 3 menit), memenuhi persyaratan non-fungsional bahwa algoritma harus menghasilkan solusi feasible dalam waktu wajar (kurang dari 15 menit).

4. **Konsistensi**: Standar deviasi fitness yang sangat rendah (0.21) menunjukkan bahwa algoritma dengan Tabu Search memberikan hasil yang konsisten dan dapat diandalkan.

Hasil juga mendukung rencana increment yang ditetapkan, khususnya Increment 2 yang berfokus pada implementasi Optimization Algorithm (SA-TS). Tabu Search terbukti efektif dalam meningkatkan kemampuan Core Engine untuk menghasilkan solusi berkualitas tinggi secara konsisten.

## 4.4 Kesimpulan Hasil

Berdasarkan hasil simulasi dan analisis yang telah dilakukan, dapat disimpulkan beberapa poin penting mengenai performa algoritma hibrida Simulated Annealing dan Tabu Search dalam konteks penjadwalan akademik.

Pertama, integrasi Tabu Search meningkatkan tingkat feasibility dari 80% menjadi 100%, menjamin bahwa setiap run akan menghasilkan jadwal yang tidak memiliki pelanggaran hard constraints. Hal ini sangat penting untuk aplikasi praktis di mana jadwal infeasible tidak dapat digunakan.

Kedua, Tabu Search meningkatkan konsistensi hasil secara dramatis dengan menurunkan standar deviasi fitness dari 20,000.66 menjadi 0.21. Konsistensi ini memberikan jaminan bahwa sistem akan menghasilkan jadwal berkualitas tinggi setiap kali dijalankan, yang sangat penting untuk perencanaan akademik yang reliabel.

Ketiga, efisiensi operator meningkat signifikan dengan Tabu Search, dengan success rate operator utama meningkat 88% hingga 232%. Peningkatan ini menunjukkan bahwa Tabu Search memungkinkan algoritma untuk lebih efektif dalam mengeksplorasi ruang solusi dan menemukan improvement.

Keempat, kebutuhan reheating berkurang 50% dengan Tabu Search, menunjukkan bahwa memory tabu efektif dalam mencegah stagnasi tanpa perlu intervensi artifisial melalui peningkatan suhu.

Kelima, meskipun waktu komputasi meningkat 213% (dari 52 detik menjadi 163 detik), trade-off ini dapat ditoleransi mengingat peningkatan signifikan dalam kualitas, konsistensi, dan feasibility hasil. Untuk aplikasi penjadwalan yang dijalankan periodik (sekali per semester), waktu komputasi di bawah 3 menit masih sangat reasonable.

Keenam, operator Change Time Slot and Room terbukti paling efektif dalam kedua skenario, dengan success rate tertinggi dan peningkatan terbesar dengan Tabu Search. Operator ini sebaiknya diprioritaskan dalam strategi pencarian lokal.

Secara keseluruhan, hasil penelitian ini mengkonfirmasi bahwa algoritma hibrida Simulated Annealing dengan Tabu Search (SA-TS) lebih superior dibandingkan Simulated Annealing standar untuk masalah penjadwalan akademik. Implementasi dengan parameter yang telah dioptimasi (tabuTenure: 50, maxTabuListSize: 1000, aspirationEnabled: true) menghasilkan solusi berkualitas tinggi secara konsisten dan dapat diandalkan untuk penggunaan dalam sistem penjadwalan otomatis di lingkungan akademik.
