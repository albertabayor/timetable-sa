# Timetabling SA+Tabu Comparison (2026-03-28)

## Objective

Mengecek apakah ada kejanggalan efektivitas SA+Tabu dari hasil run nyata, dan membandingkan:

- **Baseline**: config bawaan `example-basic` (reheatingFactor 150, intensification off)
- **Tuned-v1**: intensification on + reheating lebih konservatif

Eksperimen dijalankan dengan script:

`bun scripts/compare-timetabling-configs.ts --runs=<N> --iterations=<M>`

---

## Experiment A

Command:

`bun scripts/compare-timetabling-configs.ts --runs=5 --iterations=10000`

### Baseline

- Feasible runs (hard=0): **1/5 (20.00%)**
- Fitness median: **50026.46**
- Fitness avg: **43359.91**
- Hard violations median: **1.00**
- Soft violations median: **385.00**
- Runtime median: **32.07s**

### Tuned-v1

- Feasible runs (hard=0): **0/5 (0.00%)**
- Fitness median: **66692.90**
- Fitness avg: **68359.88**
- Hard violations median: **2.00**
- Soft violations median: **394.00**
- Runtime median: **55.23s**

### Operator inactivity pattern

- Banyak operator targeted sering tidak aktif di baseline:
  - Fix Friday Prayer Conflict: 4/5 run inactive
  - Swap Friday with Non-Friday: 4/5 run inactive
  - Fix Lecturer Conflict: 4/5 run inactive
  - Fix Room Conflict: 5/5 run inactive
  - Fix Room Capacity: 5/5 run inactive

---

## Experiment B

Command:

`bun scripts/compare-timetabling-configs.ts --runs=3 --iterations=20000`

### Baseline

- Feasible runs (hard=0): **1/3 (33.33%)**
- Fitness median: **50025.85**
- Hard violations median: **1.00**
- Soft violations median: **380.00**
- Runtime median: **62.77s**

### Tuned-v1

- Feasible runs (hard=0): **1/3 (33.33%)**
- Fitness median: **50026.36**
- Hard violations median: **1.00**
- Soft violations median: **384.00**
- Runtime median: **64.90s**

### Catatan

- Tuned-v1 belum menunjukkan perbaikan stabil terhadap baseline.
- Kinerja tetap fluktuatif tinggi antar run.

---

## Cross-check dari 5 log run manual

Folder log dianalisis:

- `examples/timetabling/log/timetable-optimization-20260328-205111.log`
- `examples/timetabling/log/timetable-optimization-20260328-205230.log`
- `examples/timetabling/log/timetable-optimization-20260328-205350.log`
- `examples/timetabling/log/timetable-optimization-20260328-205459.log`
- `examples/timetabling/log/timetable-optimization-20260328-205613.log`

Observasi:

- Hard violations akhir: `0, 0, 1, 4, 0` -> feasibility **3/5 (60%)**
- Operator targeted tertentu konsisten attempts=0 di banyak run.

---

## Diagnosis "yang janggal"

1. **Feasibility tidak stabil (high variance)**
   - Pada data dan max iteration sama, ada run hard=0 dan ada run hard>0 besar.

2. **Operator-target mismatch terhadap bottleneck hard constraints**
   - Dari log, hard violations awal dominan di:
     - `Max Daily Periods`
     - `Exclusive Room`
   - Operator khusus `FixMaxDailyPeriods` ada dan aktif.
   - **Tidak ada operator dedicated untuk `Exclusive Room`**, sehingga solver sering sulit menutup gap hard violations terakhir.

3. **Sebagian operator targeted hampir tidak pernah applicable**
   - `FixRoomConflict` dan `FixRoomCapacity` sering inactive, kemungkinan karena kondisi pelanggaran tersebut memang jarang muncul setelah initial greedy (bukan bug langsung, tetapi menunjukkan operator set kurang seimbang terhadap bottleneck aktual).

4. **Konfigurasi reheating sangat mempengaruhi dinamika**
   - Reheating terlalu agresif bisa meningkatkan noise.
   - Tetapi menurunkannya saja belum cukup untuk menyelesaikan masalah feasibility.

---

## Rekomendasi prioritas

1. **Tambah operator baru: `FixExclusiveRoom` (high priority)**
   - Target langsung hard constraint yang sering tersisa.

2. **Tambah constraint-aware operator scheduling**
   - Saat hard violations > 0, prioritize operator yang relevan dengan constraint hard yang paling sering violated.

3. **Instrumentasi progress per hard-constraint**
   - Log jumlah violation per hard constraint per interval agar bisa adaptive operator routing.

4. **A/B config tuning setelah operator baru ada**
   - Ulang eksperimen paired runs (>=20) untuk ukur feasibility rate dan median fitness.

5. **Pertimbangkan intensification berbasis constraint focus**
   - Intensification tidak generic random, tapi diarahkan ke constraint hard yang tersisa.

---

## Kesimpulan

Engine SA+Tabu berjalan benar secara mekanisme, tetapi pada kasus timetabling ini masalah utama bukan sekadar parameter temperatur/tabu. Kegagalan feasibility yang fluktuatif kuat mengarah ke **coverage move operator yang belum lengkap terhadap hard constraints dominan**, khususnya `Exclusive Room`.

---

## Update Setelah Implementasi Fix (2026-03-28, sesi lanjutan)

Perubahan yang diterapkan:

- menambah move operator baru `FixExclusiveRoom`
- menambah prioritas targeted operator pada Phase 1 saat hard violations masih ada

Eksperimen ulang:

Command:

`bun scripts/compare-timetabling-configs.ts --runs=5 --iterations=10000`

### Baseline (setelah patch engine + operator)

- Feasible runs (hard=0): **4/5 (80.00%)**
- Fitness median: **25.32**
- Hard violations median: **0.00**
- Soft violations median: **329.00**
- Runtime median: **32.37s**

### Tuned-v1 (setelah patch)

- Feasible runs (hard=0): **4/5 (80.00%)**
- Fitness median: **26.14**
- Hard violations median: **0.00**
- Soft violations median: **339.00**
- Runtime median: **33.26s**

### Dampak yang terlihat

- Feasibility rate naik signifikan dibanding hasil sebelumnya.
- `FixExclusiveRoom` sekarang aktif (inactive 0/5), menghilangkan blind spot utama pada constraint `Exclusive Room`.
- Untuk set ini, baseline patched sedikit lebih baik dari tuned-v1 di soft violation median.

---

## Update Lanjutan (2026-03-28, sesi berikutnya)

Perubahan tambahan yang diterapkan:

- menambah compound operator `FixFridayLecturerConflict`
- menambah hard-constraint-aware operator prioritization pada Phase 1
  - pemilihan operator fix menyesuaikan nama hard constraint yang masih violated (cached per interval)

Eksperimen ulang:

Command:

`bun scripts/compare-timetabling-configs.ts --runs=5 --iterations=10000`

### Baseline (setelah tambahan terbaru)

- Feasible runs (hard=0): **4/5 (80.00%)**
- Fitness median: **26.20**
- Hard violations median: **0.00**
- Soft violations median: **332.00**
- Runtime median: **32.13s**

### Tuned-v1 (setelah tambahan terbaru)

- Feasible runs (hard=0): **5/5 (100.00%)**
- Fitness median: **25.37**
- Hard violations median: **0.00**
- Soft violations median: **336.00**
- Runtime median: **31.83s**

### Interpretasi

- Target utama (stabilitas feasibility) membaik signifikan pada tuned-v1: dari variatif menjadi **100% feasible** pada sampel ini.
- `FixExclusiveRoom` tetap konsisten aktif (inactive 0/5), menunjukkan bottleneck hard constraint ini kini lebih tercover.
- Beberapa operator targeted lain tetap sering inactive; ini indikasi pattern pelanggaran data run tersebut memang tidak memicu operator itu, bukan selalu bug.
