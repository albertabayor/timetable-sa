# SA+Tabu Improvement Plan (timetable-sa)

Tanggal analisis: 2026-03-28  
Branch kerja: `analysis/sa-tabu-improvement-plan`

## Scope

- Package core yang dianalisis: `src/core/SimulatedAnnealing.ts` + interface/type di `src/core/interfaces` dan `src/core/types`.
- Verifikasi runtime:
  - `npm test -- --runInBand`
  - `bun examples/timetabling/example-basic.ts`

## Ringkasan Eksekusi Runtime

### 1) Hasil `bun examples/timetabling/example-basic.ts`

- **Tidak ada crash/fatal error** pada engine SA+Tabu.
- Optimisasi selesai hingga 20000 iterasi, hard violations = 0.
- Ada 15 kelas yang tidak terjadwal sejak greedy initialization (warning "No lecturers") -> ini terlihat sebagai isu data/input domain, bukan crash engine.
- Soft violations masih tinggi (391), tetapi proses stabil dan selesai normal.

### 2) Hasil `npm test -- --runInBand`

- 3 suite gagal, 3 suite lolos.
- Penyebab utama kegagalan yang terlihat: beberapa test memanggil `solve()` **tanpa `await`**, sehingga yang di-assert adalah `Promise` (nilai menjadi `undefined`).
- Ini issue test harness (API async mismatch), bukan fatal runtime di solver core.

## Temuan BUG/CWE/Celah/Improvement Probability

## [HIGH] Bug logika aspiration memakai fitness yang salah

- Lokasi:
  - `src/core/SimulatedAnnealing.ts:428`
  - `src/core/SimulatedAnnealing.ts:728`
  - Kontrak method: `src/core/SimulatedAnnealing.ts:1146`
- Gejala:
  - `shouldSkipTabu(signature, iteration, currentFitness, bestFitness)` dipanggil dengan `currentFitness`.
  - Secara kontrak/dokumen, parameter ketiga harus `newFitness` (fitness kandidat tetangga).
- Dampak:
  - Aspiration criteria bisa salah terpicu atau tidak terpicu.
  - Kualitas pencarian Tabu+SA bisa turun, acceptance decision bias.
- CWE mapping: **CWE-697** (Incorrect Comparison / wrong value in decision logic).
- Improvement probability: **Sangat tinggi**.

### Rekomendasi

- Hitung fitness kandidat terlebih dulu, lalu panggil `shouldSkipTabu(..., newFitness, bestFitness)`.
- Atau ubah urutan blok: evaluasi `newState` -> hitung `newFitness` -> baru cek tabu+aspiration.

## [HIGH] State solver tidak di-reset antar `solve()` call

- Lokasi state mutable instance:
  - `tabuList`: `src/core/SimulatedAnnealing.ts:50`
  - `operatorStats`: `src/core/SimulatedAnnealing.ts:47`
  - `progressStats`: `src/core/SimulatedAnnealing.ts:53`
- Gejala:
  - Tidak ada reset eksplisit di awal `solve()`.
  - Jika instance dipakai ulang, run berikutnya bisa terkontaminasi run sebelumnya.
- Dampak:
  - Hasil non-reproducible, statistik menipu, tabu carry-over antar run.
  - Potensi race jika `solve()` dipanggil paralel pada instance yang sama.
- CWE mapping: **CWE-362** (Race Condition) untuk concurrent usage; juga bug lifecycle state.
- Improvement probability: **Sangat tinggi**.

### Rekomendasi

- Tambahkan reset state di awal `solve()`:
  - `this.tabuList.clear()`
  - reset seluruh counter `progressStats`
  - reset `operatorStats` attempts/improvements/accepted/successRate.
- Tambahkan guard re-entrancy (`isSolving` boolean) untuk menolak concurrent solve pada instance yang sama.

## [HIGH] Validasi numerik config belum memblokir NaN/Infinity

- Lokasi validasi config: `src/core/SimulatedAnnealing.ts:125-180`.
- Gejala:
  - Validasi hanya berbasis komparasi `<=`, `>=`.
  - Nilai `NaN` dapat lolos (karena komparasi dengan NaN bernilai false).
- Dampak:
  - Fitness/temperature/acceptance bisa jadi NaN, perilaku loop diam-diam invalid.
- CWE mapping: **CWE-20** (Improper Input Validation).
- Improvement probability: **Sangat tinggi**.

### Rekomendasi

- Tambah `Number.isFinite(...)` untuk semua parameter numerik config.
- Validasi rentang eksplisit untuk tiap field.

## [MEDIUM] Kontrak `Constraint.evaluate()` tidak divalidasi runtime

- Lokasi penggunaan score:
  - `src/core/SimulatedAnnealing.ts:909-933`
  - `src/core/SimulatedAnnealing.ts:1318-1320`
- Gejala:
  - Engine mengasumsikan score valid [0..1], tetapi tidak enforce.
  - Jika score NaN/Infinity/<0/>1, penalty bisa rusak atau violation tidak terhitung.
- CWE mapping: **CWE-20**.
- Improvement probability: **Tinggi**.

### Rekomendasi

- Tambah guard runtime untuk hasil `evaluate(state)`:
  - finite
  - berada di range [0,1]
- Jika invalid, throw error yang jelas berisi nama constraint.

## [MEDIUM] Fallback signature Tabu menggunakan random string

- Lokasi: `src/core/SimulatedAnnealing.ts:1101-1107`.
- Gejala:
  - Saat serialisasi state gagal, signature fallback menggunakan `Math.random()`.
- Dampak:
  - Tabu search efektif nonaktif untuk state tersebut, debugging sulit.
- CWE mapping: tidak langsung security critical, lebih ke correctness/robustness.
- Improvement probability: **Menengah**.

### Rekomendasi

- Ganti fallback random dengan deterministic fallback (mis. stable hash dari subset properti yang tersedia) atau throw error instructive agar user wajib `getStateSignature` custom.

## [LOW-MEDIUM] Potensi information exposure via logging data mentah

- Lokasi: `src/core/SimulatedAnnealing.ts:1538-1544`.
- Gejala:
  - `JSON.stringify(data)` langsung dilog.
- Dampak:
  - Bila data callback/error berisi informasi sensitif, bisa ikut tercetak/logged.
- CWE mapping: **CWE-532**.
- Improvement probability: **Menengah** (tergantung konteks penggunaan).

### Rekomendasi

- Tambah redaction/sanitization layer pada logger.
- Pertimbangkan whitelist field yang boleh dilog.

## Prioritas Implementasi (Action Plan)

1. **Fix aspiration bug** (`currentFitness` -> `newFitness`) + unit test khusus regression.
2. **Reset state per `solve()`** + lock re-entrancy (`isSolving`).
3. **Hard validation config numeric** (`Number.isFinite`, range checks).
4. **Validate evaluate() return domain** [0..1] finite.
5. Perbaiki fallback signature tabu agar deterministic / fail-fast terarah.
6. Hardening logger (redaction policy).
7. Rapikan test async (`await solver.solve()`) di file test yang masih sync-style.

## Status Implementasi (Sudah Dikerjakan)

- [x] Fix aspiration bug (`currentFitness` -> `newFitness`) pada call site tabu check.
- [x] Reset state runtime per `solve()` + lock re-entrancy (`isSolving`).
- [x] Hard validation numeric config (`Number.isFinite`, integer/range checks).
- [x] Validasi runtime return `Constraint.evaluate()` (finite + range [0,1]).
- [x] Fallback signature tabu jadi deterministic (`stableStringify`) dan fail-fast terarah jika gagal.
- [x] Hardening logger dengan sanitization/redaction untuk key sensitif.
- [x] Rapikan test async yang sebelumnya tidak `await`.
- [x] Tambah regression tests untuk aspiration call-site, lifecycle safety, dan validation guards.

## Keterangan tambahan dari run contoh

- Warning "No lecturers" saat initial greedy bukan fatal error SA+Tabu.
- Ini menunjukkan kualitas/kelengkapan data input mempengaruhi `classes scheduled`.
- Jika target bisnis adalah 100% kelas terjadwal, perlu tahap pre-validation data dan/atau operator khusus untuk unscheduled classes.
