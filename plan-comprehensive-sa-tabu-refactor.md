# Comprehensive Deep Plan: SA + Tabu Engine Hardening & Refactor

Tanggal: 2026-03-28  
Branch: `analysis/sa-tabu-improvement-plan`  
Scope utama: `src/core/SimulatedAnnealing.ts` + interface/type terkait di `src/core/interfaces` dan `src/core/types`

---

## 1) Tujuan Strategis

Plan ini fokus pada 4 target besar:

1. **Correctness algoritmik**: memastikan implementasi benar-benar konsisten dengan prinsip Simulated Annealing + Tabu Search (termasuk aspiration, reheating, intensification, adaptive operator policy).
2. **Readability & maintainability**: memecah file monolitik menjadi modul yang lebih kecil, jelas tanggung jawabnya, dan lebih mudah di-test.
3. **Reliability engineering**: memperkuat validasi kontrak, observability, dan deterministic behavior untuk edge cases.
4. **Performance engineering**: mengurangi overhead evaluasi constraint/logging/signature, serta menambah benchmark repeatable.

---

## 2) Ringkasan Kondisi Saat Ini

### Sudah bagus

- Engine memiliki fase jelas: `phase1` -> `phase1.5` (opsional) -> `phase2`.
- Ada SA core mechanism (temperature, cooling, metropolis acceptance).
- Ada Tabu memory + tenure + aspiration criteria.
- Ada runtime validation config (finite/range) dan validation hasil `Constraint.evaluate()` di [0..1].
- Ada re-entrancy guard `isSolving` + reset state antar `solve()`.

### Gap utama yang masih ada

- **Adaptive operator selection belum benar-benar adaptif saat runtime** (success rate dipakai saat select, tapi update success rate baru di akhir solve).
- **Tabu skip path tidak mendinginkan temperatur** (iterasi maju, cooling tidak selalu maju).
- **Monolithic class (~1700+ LOC)**: terlalu banyak concern dalam 1 file.
- **API logging `output: 'file'` belum real implemented** (kontrak config > implementasi).
- **`getStats()` mengembalikan mutable reference**.
- **Validasi `constraint.weight` (soft) belum strict**.

---

## 3) Prinsip Desain Refactor

### A. Single Responsibility per modul

- Engine orchestration jangan bercampur dengan policy detail (tabu, acceptance, selection, logging).

### B. Behavior-preserving refactor dulu

- Tahap awal: pindah kode tanpa ubah output mayor.
- Perubahan behavior (mis. cooling on tabu skip, adaptive update online) dilakukan terpisah dengan test regresi khusus.

### C. Determinism first untuk debugging

- Tambah random source abstraction (opsional) agar test bisa deterministic (seeded RNG).

### D. Test pyramid yang sehat

- Unit test policy kecil.
- Integration test engine loop.
- Scenario/benchmark test untuk kasus timetabling besar.

---

## 4) Target Arsitektur Baru (Proposed)

Struktur target:

```text
src/core/
  SimulatedAnnealing.ts              # Orchestrator tipis (flow antar phase)
  engine/
    EngineRuntimeState.ts            # runtime counters, phase state
    EngineTypes.ts                   # internal resolved config/types
  phases/
    runPhase1.ts
    runIntensification.ts
    runPhase2.ts
  policies/
    AcceptancePolicy.ts              # phase1/phase2 acceptance
    OperatorSelectionPolicy.ts       # hybrid/roulette + online stats update
  tabu/
    TabuMemory.ts                    # add/contains/cleanup/aspiration logic
    StateSignature.ts                # default + stable stringify
  telemetry/
    ProgressReporter.ts              # onProgress trigger/interval/stats
    Logger.ts                        # sanitization + sink routing
  validation/
    ConfigValidator.ts
    ConstraintValidator.ts
```

Catatan: ini bisa dikerjakan bertahap, tidak harus semua langsung.

---

## 5) Rencana Implementasi Bertahap

## Phase 0 — Baseline & Safety Net

### Objective

Membuat baseline performa & kualitas agar perubahan berikutnya bisa diukur objektif.

### Task

- Tambah script benchmark internal (mis. `scripts/benchmark-sa.ts`) untuk:
  - runtime total,
  - best fitness,
  - hard/soft violations,
  - acceptance rate,
  - tabu hit ratio.
- Simpan baseline minimal 10 run (median, p95).
- Tambah test invariant:
  - progress monotonicity,
  - no hard-violation regression di phase2,
  - no re-entrancy race.

### Deliverable

- `docs/benchmarks/baseline-YYYYMMDD.md`
- test tambahan invariant pass.

---

## Phase 1 — Correctness Fixes (Behavioral)

### Objective

Merapikan perilaku algoritmik yang berdampak langsung ke kualitas solusi.

### Task utama

1. **Online operator adaptation**
   - Update success rate incremental saat iteration berjalan (bukan hanya akhir solve).
   - Gunakan smoothing untuk early-stage stability, misalnya:
     - `score = (improvements + alpha) / (attempts + beta)`.
2. **Cooling consistency on tabu skip**
   - Pastikan setiap “logical iteration” menerapkan cooling secara konsisten, termasuk path tabu-skip.
3. **Weight validation**
   - Validasi `constraint.weight` finite dan >= 0 untuk soft constraint.
4. **Numerical stability guard**
   - Safe guard `Math.exp` input ekstrem (clamp exponent), mencegah overflow/underflow noise.

### Acceptance Criteria

- Tidak ada penurunan quality median vs baseline > threshold yang disepakati.
- Hard violations tetap 0 pada fase final untuk skenario feasible.
- Test baru untuk tabu-skip cooling + online adaptive pass.

---

## Phase 2 — Structural Refactor (Behavior-preserving)

### Objective

Membuat codebase lebih readable, modular, dan maintainable tanpa mengubah output signifikan.

### Task utama

1. Ekstrak `TabuMemory` (contains + aspiration + cleanup).
2. Ekstrak `StateSignature` (custom/default/stable stringify).
3. Ekstrak `ProgressReporter` + `Logger`.
4. Ekstrak `ConfigValidator` + `ConstraintValidator`.
5. Jadikan `SimulatedAnnealing` sebagai orchestrator tipis.

### Refactor Rules

- Tidak ada perubahan API publik package.
- Jaga backward compatibility config.
- Pertahankan semua test existing + tambah snapshot test untuk hasil summary output.

### Acceptance Criteria

- `src/core/SimulatedAnnealing.ts` turun signifikan (< 700 LOC target awal).
- Kompleksitas method besar menurun.
- Seluruh test pass + benchmark tidak regress signifikan.

---

## Phase 3 — Observability & API Hardening

### Objective

Meningkatkan reliability operasional dan ergonomi API.

### Task utama

1. **Implement file log sink beneran** untuk `logging.output: 'file' | 'both'`.
2. **Immutable stats exposure**:
   - `getStats()` return clone/readonly snapshot, bukan reference internal.
3. **Error taxonomy**:
   - error code/kelas khusus (`SAConfigError`, `ConstraintValidationError`, dst).
4. **Progress callback QoS**:
   - optional non-blocking mode (mis. `onProgressMode: 'await' | 'fire-and-forget'`).

### Acceptance Criteria

- Logging config sesuai kontrak dokumentasi.
- Konsumen tidak bisa mutate state internal via `getStats()`.

---

## Phase 4 — Advanced Optimization (Opsional)

### Objective

Meningkatkan convergence quality pada problem besar.

### Kandidat Task

- Add `RNG` injection/seed support untuk reproducible experiments.
- Add candidate list strategy (sampling beberapa neighbor per iteration, pilih terbaik parsial).
- Add reheating schedule variants (adaptive reheating berdasarkan stagnation profile).
- Add aspiration variants (global-best, phase-best, frequency-based tabu).

---

## 6) Test Plan Komprehensif

### Unit Tests baru

- `OperatorSelectionPolicy`:
  - roulette/hybrid selection sanity,
  - online adaptation update,
  - zero-success handling.
- `TabuMemory`:
  - tenure expiry,
  - aspiration override,
  - cleanup oldest entries.
- `StateSignature`:
  - deterministic output,
  - circular object handling,
  - custom signature fallback behavior.
- `AcceptancePolicy`:
  - phase1/phase2 invariants,
  - numeric stability around extreme temperatures.

### Integration Tests

- End-to-end solve untuk:
  - feasible problem,
  - unsatisfiable hard constraints,
  - no move generator,
  - all move generator inapplicable,
  - repeated solve same instance.

### Property-based / invariant tests (opsional)

- Hard constraints tidak memburuk di phase2.
- progressPercent non-decreasing terhadap iteration.
- tabu skip tidak menyebabkan state corruption.

### Benchmark Tests

- fixed dataset + N runs + median/p95 comparison.
- gate regressi: runtime <= +10%, quality >= baseline (atau sesuai target).

---

## 7) KPI / Metrik Keberhasilan

- **Correctness KPI**
  - 0 failing tests.
  - Tidak ada violation invariant utama.
- **Maintainability KPI**
  - File utama berkurang drastis ukuran/kompleksitas.
  - Coverage unit policy meningkat.
- **Performance KPI**
  - Runtime median minimal sama atau lebih baik dari baseline.
  - Tidak ada memory growth abnormal (tabu list bounded).
- **Quality KPI**
  - Best fitness median stabil/lebih baik.
  - Varians antar-run lebih terkendali (jika seeded RNG diaktifkan).

---

## 8) Risiko & Mitigasi

- **Risiko**: Refactor modular mengubah perilaku secara tidak sengaja.  
  **Mitigasi**: behavior-preserving phase + golden tests + benchmark gate.

- **Risiko**: Online adaptation memperburuk exploration (premature exploitation).  
  **Mitigasi**: smoothing + epsilon exploration floor + A/B mode flag.

- **Risiko**: Logging file sink menambah overhead I/O.  
  **Mitigasi**: buffered write / configurable frequency.

- **Risiko**: Signature deterministik mahal untuk state besar.  
  **Mitigasi**: strongly recommend `getStateSignature` custom untuk domain besar.

---

## 9) Roadmap Eksekusi Praktis (Commit-level)

1. `chore: add benchmark baseline and invariant tests`
2. `fix: apply online operator adaptation and tabu-skip cooling consistency`
3. `refactor: extract tabu memory and state signature utilities`
4. `refactor: extract progress reporter and logger sinks`
5. `refactor: extract validators and simplify orchestrator`
6. `feat: immutable stats snapshot and logging file sink`
7. `docs: update API/config reference and migration notes`

---

## 10) Catatan tentang Skill/MCP/Context7

- Untuk plan ini, **belum wajib** library eksternal atau referensi API pihak ketiga.
- Jika nanti ingin menambah RNG seeded yang battle-tested, bisa evaluasi dependency eksternal, tapi saat ini masih bisa diselesaikan internal tanpa menambah dependency.

---

## 11) Definisi Selesai (Definition of Done)

Plan dianggap selesai dieksekusi bila:

- Semua phase 1-3 minimal completed.
- Test suite pass penuh.
- Benchmark baseline vs after dipublikasikan.
- Dokumentasi API sesuai implementasi (tidak ada config "dummy").
- Struktur code modular dan lebih mudah di-review/test.

---

## 12) Status Eksekusi (2026-03-28)

### Phase 0 — Completed

- Added benchmark runner: `scripts/benchmark-sa.ts`
- Added npm/bun script: `benchmark`
- Added baseline report: `docs/benchmarks/baseline-20260328.md`
- Added invariant tests: `tests/core/invariants.test.ts`

### Phase 1 — Completed

- Online operator adaptation now updated per-iteration (runtime online updates).
- Cooling consistency fixed on tabu-skip path (temperature cools on skip).
- Soft constraint weight validation hardened (`weight >= 0`, finite).
- Numerical stability guard added for exponential acceptance (`safeExp`).

### Phase 2 — Completed (major extraction)

- Extracted modules:
  - `src/core/policies/AcceptancePolicy.ts`
  - `src/core/policies/OperatorSelectionPolicy.ts`
  - `src/core/tabu/TabuMemory.ts`
  - `src/core/tabu/StateSignature.ts`
  - `src/core/telemetry/Logger.ts`
  - `src/core/telemetry/ProgressReporter.ts`
  - `src/core/validation/ConfigValidator.ts`
  - `src/core/validation/ConstraintValidator.ts`
  - `src/core/engine/EngineTypes.ts`
- `SimulatedAnnealing.ts` reduced significantly from previous monolithic size.

### Phase 3 — Completed

- File sink logging implemented for `logging.output: 'file' | 'both'`.
- `getStats()` now returns immutable snapshot clone.
- Error taxonomy introduced:
  - `SAError`
  - `SAConfigError`
  - `ConstraintValidationError`
  - `SolveConcurrencyError`
- Added progress callback QoS mode: `onProgressMode: 'await' | 'fire-and-forget'`.

### Verification

- `bun run test -- --runInBand` => pass
- `bun run build` => pass
- `bun run benchmark` => pass
- `bun examples/timetabling/example-basic.ts` => pass (no crash)
