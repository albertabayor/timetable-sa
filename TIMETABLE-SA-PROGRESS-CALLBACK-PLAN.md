# Real-Time Optimization Progress Tracking

## Problem Statement

Saat ini, library `timetable-sa` (Simulated Annealing) hanya menyediakan **logging** sebagai cara tracking progress. Namun, logging tidak memungkinkan aplikasi untuk mendapatkan data real-time selama proses optimasi berjalan.

### Current Behavior

```typescript
const solver = new SimulatedAnnealing(initialState, constraints, moves, {
  maxIterations: 20000,
  logging: {
    enabled: true,
    level: 'info',
    logInterval: 1000,  // Log setiap 1000 iterasi
  }
});

// solve() adalah synchronous dan blocking
const solution = solver.solve();

// Hanya setelah solve() selesai, kita bisa akses solution
console.log(solution.iterations);      // 20000
console.log(solution.fitness);         // Final fitness
console.log(solution.hardViolations);  // Final violations
```

**Problem:**
- `solve()` memblok thread sampai selesai
- Tidak ada cara untuk mendapatkan data iteration ke-500, 1000, 1500, dst saat proses berjalan
- Frontend web harus menunggu sampai 100% selesai untuk melihat progress
- Tidak bisa update chart, metrics, atau status real-time

### Use Case

**SIJAKU Web Application** perlu menampilkan:
- Progress bar yang update real-time (setiap 500-1000 iterasi)
- Chart cost convergence (current cost vs best cost)
- Chart temperature decay
- Chart violations (hard & soft) over time
- Tabu hits statistics
- ETA estimation

Contoh UI yang diinginkan:
```
Iteration 8,500 / 20,000 (42.5%)
Temperature: 15,234
Current Cost: 32.45
Best Cost: 28.12
Hard Violations: 0
Soft Violations: 342
Tabu Hits: 1,234
```

## Root Cause Analysis

Library `timetable-sa` (v2.1.1) tidak memiliki callback mechanism untuk progress updates:

1. **No callback interface** - Tidak ada `onProgress` atau event emitter
2. **Synchronous solve()** - Method `solve()` blocking sampai completion
3. **Logging only** - Progress hanya tersedia via console/file output
4. **No hooks** - Tidak ada way untuk inject custom logic mid-execution

## Proposed Solution: onProgress Callback

### Overview

Tambahkan **optional callback** `onProgress` ke `SAConfig` interface. Callback ini akan dipanggil setiap `logInterval` iterasi dengan data progress terkini.

**Design Philosophy:**
- **Library Pure**: Library hanya definisikan interface, tidak aware infrastructure (Redis, WS, DB)
- **Framework Agnostic**: Bisa digunakan dengan Redis, WebSocket, Database, atau apapun
- **Backward Compatible**: Optional callback, tidak breaking existing code
- **Async Support**: Callback bisa sync atau async (Promise)

### API Design

```typescript
// ====================
// LIBRARY (timetable-sa)
// ====================

export interface ProgressStats {
  /** Jumlah iterasi saat ini */
  iteration: number;
  
  /** Current cost/fitness */
  currentCost: number;
  
  /** Best cost yang ditemukan sejauh ini */
  bestCost: number;
  
  /** Temperature saat ini */
  temperature: number;
  
  /** Jumlah hard constraint violations */
  hardViolations: number;
  
  /** Jumlah soft constraint violations */
  softViolations: number;
  
  /** Jumlah tabu hits (jika Tabu Search enabled) */
  tabuHits: number;
  
  /** Fase optimasi saat ini */
  phase: 'phase1' | 'phase15' | 'phase2';
  
  /** Jumlah reheating events yang sudah terjadi */
  reheatingCount: number;
  
  /** Jumlah accepted moves sejauh ini */
  acceptedMoves: number;
  
  /** Jumlah rejected moves sejauh ini */
  rejectedMoves: number;
  
  /** Stagnation count (iterations tanpa improvement) */
  stagnationCount: number;
  
  /** Iterasi dimana best cost ditemukan */
  bestCostIteration: number;
  
  /** Persentase progress (0-100) */
  progressPercent: number;
}

export interface SAConfig<TState> {
  // ... existing config options ...
  
  /**
   * Callback yang dipanggil setiap logInterval iterasi.
   * 
   * Enable real-time progress tracking untuk aplikasi.
   * Callback dipanggil dengan data terkini tentang state optimasi.
   * 
   * @param iteration - Nomor iterasi saat ini
   * @param currentCost - Current cost/fitness
   * @param temperature - Temperature saat ini
   * @param state - State lengkap (opsional, bisa null jika cloneState expensive)
   * @param stats - Statistik progress
   * 
   * @example
   * ```typescript
   * const config: SAConfig<MyState> = {
   *   maxIterations: 20000,
   *   logInterval: 500,
   *   onProgress: async (iteration, cost, temp, state, stats) => {
   *     console.log(`Progress: ${stats.progressPercent}%`);
   *     await saveToDatabase({ iteration, cost, stats });
   *   }
   * };
   * ```
   */
  onProgress?: (
    iteration: number,
    currentCost: number,
    temperature: number,
    state: TState | null,
    stats: ProgressStats
  ) => void | Promise<void>;
}
```

### Implementation Details

**When to Call:**
- Panggil `onProgress` setiap `logInterval` iterasi (reuse existing logging interval)
- Pertama kali di iterasi 1 (untuk initial state)
- Setiap kali reheating terjadi
- Setiap kali phase berubah (Phase 1 → Phase 1.5 → Phase 2)

**Data Structure:**
```typescript
// Contoh data yang dikirim di iterasi 5000
{
  iteration: 5000,
  currentCost: 32.45,
  temperature: 15234.67,
  state: null,  // atau state lengkap jika user butuh
  stats: {
    iteration: 5000,
    currentCost: 32.45,
    bestCost: 28.12,
    temperature: 15234.67,
    hardViolations: 0,
    softViolations: 342,
    tabuHits: 1234,
    phase: 'phase2',
    reheatingCount: 1,
    acceptedMoves: 12345,
    rejectedMoves: 8765,
    stagnationCount: 234,
    bestCostIteration: 3421,
    progressPercent: 25.0
  }
}
```

**Implementation in SimulatedAnnealing class:**

```typescript
// Pseudocode - Core Implementation

class SimulatedAnnealing<TState> {
  private config: SAConfig<TState>;
  private stats: RunningStats;
  
  async solve(): Promise<Solution<TState>> {
    // ... initialization ...
    
    for (let iteration = 0; iteration < this.config.maxIterations; iteration++) {
      // ... perform iteration ...
      
      // Update internal stats
      this.updateStats(iteration, currentCost, temperature);
      
      // Check if we should call onProgress
      if (this.shouldTriggerProgress(iteration)) {
        await this.triggerProgressCallback(iteration, currentCost, temperature);
      }
      
      // ... existing logging (keep for backward compatibility) ...
    }
    
    return this.buildSolution();
  }
  
  private shouldTriggerProgress(iteration: number): boolean {
    // Trigger every logInterval iterations
    if (iteration % this.config.logInterval === 0) return true;
    
    // Always trigger at iteration 1
    if (iteration === 1) return true;
    
    // Trigger on phase changes
    if (this.isPhaseChanged()) return true;
    
    // Trigger on reheating
    if (this.isReheatingJustHappened()) return true;
    
    return false;
  }
  
  private async triggerProgressCallback(
    iteration: number,
    currentCost: number,
    temperature: number
  ): Promise<void> {
    if (!this.config.onProgress) return;
    
    const stats: ProgressStats = {
      iteration,
      currentCost,
      bestCost: this.bestCost,
      temperature,
      hardViolations: this.hardViolations,
      softViolations: this.softViolations,
      tabuHits: this.tabuList?.size ?? 0,
      phase: this.currentPhase,
      reheatingCount: this.reheatingCount,
      acceptedMoves: this.acceptedMoves,
      rejectedMoves: this.rejectedMoves,
      stagnationCount: this.stagnationCount,
      bestCostIteration: this.bestCostIteration,
      progressPercent: (iteration / this.config.maxIterations) * 100
    };
    
    try {
      // Support both sync and async callbacks
      await this.config.onProgress(
        iteration,
        currentCost,
        temperature,
        null,  // state bisa null untuk performance, atau clone jika user butuh
        stats
      );
    } catch (error) {
      // Don't let callback errors break optimization
      // But log them for debugging
      console.error('onProgress callback error:', error);
    }
  }
}
```

## Usage Examples

### Example 1: Basic Console Logging

```typescript
import { SimulatedAnnealing, SAConfig } from 'timetable-sa';

const config: SAConfig<MyState> = {
  maxIterations: 20000,
  logInterval: 1000,
  
  onProgress: (iteration, cost, temp, state, stats) => {
    console.log(`[${stats.phase}] Iter ${iteration}: Cost=${cost.toFixed(2)}, Temp=${temp.toFixed(2)}`);
  }
};

const solver = new SimulatedAnnealing(state, constraints, moves, config);
const solution = await solver.solve();
```

### Example 2: Web Application (SIJAKU)

```typescript
import { SimulatedAnnealing, SAConfig } from 'timetable-sa';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');
const optimizationId = 'opt-123';

const config: SAConfig<MyState> = {
  maxIterations: 20000,
  logInterval: 500,  // Update setiap 500 iterasi (2.5%)
  
  onProgress: async (iteration, cost, temp, state, stats) => {
    // Kirim ke server via WebSocket
    socket.emit('optimization-progress', {
      optimizationId,
      data: {
        iteration,
        currentCost: cost,
        bestCost: stats.bestCost,
        temperature: temp,
        hardViolations: stats.hardViolations,
        softViolations: stats.softViolations,
        tabuHits: stats.tabuHits,
        progress: stats.progressPercent
      }
    });
    
    // Simpan ke Redis (jika running di worker)
    await redisClient.setex(
      `optimization:progress:${optimizationId}`,
      3600,
      JSON.stringify({ iteration, cost, temp, stats })
    );
  }
};

const solver = new SimulatedAnnealing(state, constraints, moves, config);
const solution = await solver.solve();
```

### Example 3: Progress Bar CLI

```typescript
import { SimulatedAnnealing, SAConfig } from 'timetable-sa';
import { SingleBar, Presets } from 'cli-progress';

const progressBar = new SingleBar({}, Presets.shades_classic);
progressBar.start(20000, 0);

const config: SAConfig<MyState> = {
  maxIterations: 20000,
  logInterval: 100,
  
  onProgress: (iteration, cost, temp, state, stats) => {
    progressBar.update(iteration, {
      cost: cost.toFixed(2),
      temp: temp.toFixed(0)
    });
  }
};

const solver = new SimulatedAnnealing(state, constraints, moves, config);
const solution = await solver.solve();

progressBar.stop();
```

### Example 4: Database Logging

```typescript
import { SimulatedAnnealing, SAConfig } from 'timetable-sa';
import { db } from './database';

const config: SAConfig<MyState> = {
  maxIterations: 20000,
  logInterval: 1000,
  
  onProgress: async (iteration, cost, temp, state, stats) => {
    await db.insert('optimization_history', {
      run_id: 'run-001',
      iteration,
      cost,
      temperature: temp,
      hard_violations: stats.hardViolations,
      soft_violations: stats.softViolations,
      timestamp: new Date()
    });
  }
};

const solver = new SimulatedAnnealing(state, constraints, moves, config);
const solution = await solver.solve();
```

## Alternative Solutions Considered

### 1. Log Parsing (Rejected)

**Approach:** Override `console.log`, parse string output dari library.

```typescript
const originalLog = console.log;
console.log = (...args) => {
  const msg = args.join(' ');
  const match = msg.match(/Iteration (\d+):.*Temp = ([\d.]+)/);
  if (match) {
    // Parse and send to Redis
  }
  originalLog.apply(console, args);
};
```

**Cons:**
- Fragile (breaks if log format changes)
- Hard to maintain
- String parsing overhead
- Can't access structured data

### 2. Event Emitter (Rejected)

**Approach:** Gunakan EventEmitter pattern.

```typescript
const solver = new SimulatedAnnealing(...);
solver.on('progress', (data) => { ... });
```

**Cons:**
- Adds complexity (class inheritance)
- Less straightforward than callback
- Memory leak potential if not cleaned up

### 3. Generator Function (Rejected)

**Approach:** Return generator yang yield setiap iterasi.

```typescript
const solver = new SimulatedAnnealing(...);
for (const progress of solver.solveGenerator()) {
  console.log(progress);
}
```

**Cons:**
- Complex API (users must handle iteration)
- Harder to understand
- Breaking change (completely different API)

## Comparison: Why onProgress is Best

| Feature | onProgress Callback | Log Parsing | Event Emitter | Generator |
|---------|-------------------|-------------|---------------|-----------|
| **Clean API** | ✅ Simple | ❌ Hacky | ⚠️ Complex | ⚠️ Complex |
| **Performance** | ✅ Direct call | ❌ String parse | ⚠️ Overhead | ⚠️ Iteration overhead |
| **Flexibility** | ✅ User decides what to do | ❌ Limited | ✅ Good | ✅ Good |
| **Backward Compatible** | ✅ Optional | ✅ No change | ✅ Optional | ❌ Breaking |
| **Type Safety** | ✅ Full TS support | ❌ String parsing | ✅ TS support | ✅ TS support |
| **Async Support** | ✅ Promise | ⚠️ Sync only | ✅ Promise | ❌ Sync only |
| **Maintainability** | ✅ Standard pattern | ❌ Fragile | ⚠️ Cleanup needed | ✅ Clean |

## Implementation Checklist

### Phase 1: Core Implementation

- [ ] Define `ProgressStats` interface
- [ ] Add `onProgress` to `SAConfig` interface
- [ ] Implement `shouldTriggerProgress()` logic
- [ ] Implement `triggerProgressCallback()` method
- [ ] Handle async callbacks properly
- [ ] Error handling (don't break optimization on callback error)

### Phase 2: Integration Points

- [ ] Call onProgress at iteration 1 (initial state)
- [ ] Call onProgress every `logInterval` iterations
- [ ] Call onProgress on phase transitions
- [ ] Call onProgress on reheating events
- [ ] Call onProgress when new best solution found (optional)

### Phase 3: Data Population

- [ ] Track `acceptedMoves` count
- [ ] Track `rejectedMoves` count
- [ ] Track `stagnationCount`
- [ ] Track `bestCostIteration`
- [ ] Calculate `progressPercent`
- [ ] Populate all stats fields

### Phase 4: Testing

- [ ] Unit test: onProgress called correct number of times
- [ ] Unit test: onProgress receives correct data
- [ ] Unit test: async onProgress works
- [ ] Unit test: onProgress errors don't break solve()
- [ ] Integration test: WebSocket example
- [ ] Integration test: Database logging example

### Phase 5: Documentation

- [ ] JSDoc untuk onProgress interface
- [ ] README section: Real-time Progress Tracking
- [ ] Example: Web Application
- [ ] Example: CLI Progress Bar
- [ ] Example: Database Logging
- [ ] Migration guide (if any)

## Similar Libraries/Patterns

This pattern is similar to:

1. **Winston Logger** - Transport/callback system untuk logging
2. **Express Middleware** - Callback pattern untuk request handling  
3. **Node.js Streams** - Data events via callbacks
4. **TensorFlow.js** - `callbacks` parameter untuk training progress
5. **Jest Test Runner** - Reporter callbacks untuk test progress

## Conclusion

**Recommendation:** Implement `onProgress` callback di `SAConfig`.

**Benefits:**
1. Clean, standard pattern
2. Framework agnostic (pure TypeScript)
3. Backward compatible
4. Supports async operations
5. Full type safety
6. User has complete control

**Next Steps:**
1. Review proposal ini
2. Diskusikan API design (ada yang perlu ditambah/dikurangi?)
3. Implementasi di library
4. Update SIJAKU worker untuk menggunakan callback
5. Test di environment production

---

**Author:** SIJAKU Development Team  
**Date:** 2024-03-09  
**Status:** Proposal - Awaiting Review