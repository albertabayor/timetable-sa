# Plan: Bab 4. Hasil dan Pembahasan - Analisis Hasil Eksperimen

## Status
✅ Data terkumpul lengkap (5 runs tanpa tabu + 5 runs dengan tabu)
📍 Lokasi sumber: `docs/thesis/pemodelan/result.md`

## Ringkasan Data yang Dianalisis

### Eksperimen Tanpa Tabu Search
| Run | Fitness | Hard Viol | Soft Viol | Reheats |
|-----|---------|------------|-----------|----------|
| 1 | 50,026.69 | 1 | 8 | 2 |
| 2 | 27.26 | 0 | 8 | 2 |
| 3 | 26.68 | 0 | 8 | 2 |
| 4 | 26.78 | 0 | 8 | 2 |
| 5 | 27.18 | 0 | 8 | 2 |

**Statistik:**
- Rata-rata: 10,008.82
- Terbaik: 26.68
- Terburuk: 50,026.69
- Std Dev: 20,000.66 (sangat tinggi!)
- Feasibility: 80% (4/5 run feasible)

### Eksperimen Dengan Tabu Search
| Run | Fitness | Hard Viol | Soft Viol | Reheats |
|-----|---------|------------|-----------|----------|
| 1 | 26.73 | 0 | 8 | 1 |
| 2 | 26.67 | 0 | 8 | 1 |
| 3 | 26.68 | 0 | 8 | 1 |
| 4 | 26.19 | 0 | 8 | 1 |
| 5 | 26.75 | 0 | 8 | 1 |

**Statistik:**
- Rata-rata: 26.60
- Terbaik: 26.19
- Terburuk: 26.75
- Std Dev: 0.21 (sangat rendah!)
- Feasibility: 100% (5/5 run feasible)

## Temuan Utama

### 1. Peningkatan Konsistensi (99.999%)
- **Tanpa Tabu**: Std Dev 20,000.66 → Hasil sangat bervariasi
- **Dengan Tabu**: Std Dev 0.21 → Hasil sangat konsisten
- **Analisis**: Tabu search mencegah cycling dan local optima

### 2. Peningkatan Feasibility
- **Tanpa Tabu**: 80% feasible (1 run gagal dengan hard violation)
- **Dengan Tabu**: 100% feasible (semua run sukses)

### 3. Peningkatan Rata-rata Fitness
- Rata-rata fitness meningkat dari 10,008.82 → 26.60
- Peningkatan: 99.7%

### 4. Peningkatan Efisiensi Operator

| Operator | Tanpa Tabu | Dengan Tabu | Peningkatan |
|----------|--------------|--------------|--------------|
| Change Time Slot and Room | 4.96% | 11.72% | +136% |
| Change Time Slot | 2.23% | 7.03% | +215% |
| Change Room | 3.52% | 6.62% | +88% |
| Fix Max Daily Periods | 1.29% | 4.29% | +232% |

**Kesimpulan**: Tabu search meningkatkan efisiensi semua operator secara signifikan!

### 5. Pengurangan Reheating
- **Tanpa Tabu**: Rata-rata 2 reheats per run
- **Dengan Tabu**: Rata-rata 1 reheat per run
- **Analisis**: Tabu list mengurangi kebutuhan reheating sebesar 50%

### 6. Trade-off: Waktu Komputasi
- **Tanpa Tabu**: ~52 detik per run
- **Dengan Tabu**: ~163 detik per run
- **Penambahan**: ~3.1x lebih lama

## Struktur Dokumen untuk Bab 4

### 4.1 Konfigurasi Eksperimen
- 4.1.1 Parameter Simulated Annealing (sudah ada di result.md)
- 4.1.2 Parameter Tabu Search (sudah ada di result.md)
- 4.1.3 Data Input (33 ruang, 99 dosen, 371 kelas)

### 4.2 Hasil Tanpa Tabu Search
- 4.2.1 Ringkasan 5 runs dengan tabel
- 4.2.2 Statistik operator
- 4.2.3 Analisis konvergensi

### 4.3 Hasil Dengan Tabu Search
- 4.3.1 Ringkasan 5 runs dengan tabel
- 4.3.2 Statistik operator
- 4.3.3 Analisis konvergensi

### 4.4 Perbandingan
- 4.4.1 Perbandingan fitness (tabel + grafik)
- 4.4.2 Perbandingan feasibility (tabel pie chart)
- 4.4.3 Perbandingan operator efficiency (tabel bar chart)
- 4.4.4 Perbandingan reheating (tabel)

### 4.5 Pembahasan
- 4.5.1 Efektivitas tabu search (konsistensi, feasibility, efisiensi operator)
- 4.5.2 Trade-off (waktu vs kualitas)
- 4.5.3 Analisis operator (mana yang paling efektif dan mengapa)
- 4.5.4 Analisis konvergensi (local vs global optimum)
- 4.5.5 Role of aspiration criteria

### 4.6 Kesimpulan
- 5 poin kesimpulan utama

### 4.7 Referensi Implementasi
- Model yang digunakan (core algorithm, domain models, constraints, move generators)

## Model yang Perlu Didokumentasikan

### 1. Core Algorithm (`src/core/SimulatedAnnealing.ts`)
- Multi-phase SA (Phase 1, 1.5, 2)
- Tabu search implementation
- Reheating mechanism
- Adaptive operator selection (hybrid mode)

### 2. Domain Models (`examples/timetabling/types/`)
- Room, Lecturer, ClassRequirement, TimeSlot
- ScheduleEntry, TimetableState

### 3. Constraints (`examples/timetabling/constraints/`)
- **11 Hard Constraints**: NoLecturerConflict, NoRoomConflict, RoomCapacity, dll
- **8 Soft Constraints**: PreferredTime, PreferredRoom, TransitTime, dll

### 4. Move Generators (`examples/timetabling/moves/`)
- **6 Targeted Operators**: FixFridayPrayerConflict, SwapFridayWithNonFriday, FixLecturerConflict, dll
- **4 General Operators**: ChangeTimeSlotAndRoom, ChangeTimeSlot, ChangeRoom, SwapClasses

## Rekomendasi Penulisan

1. **Bahasa**: Gunakan bahasa Indonesia formal/akademik
2. **Format**: Gunakan tabel untuk perbandingan, grafik untuk visualisasi
3. **Analisis**: Selalu sertasi "mengapa" dan "bagaimana" untuk setiap temuan
4. **Referensi**: Kutip log output dari result.md sebagai bukti
5. **Struktur**: Ikuti struktur universitas Bab 4 (Hasil dan Pembahasan)

## Tugas Berikutnya

Setelah user menyetujui plan ini:
1. Tulis lengkap dokumen `docs/thesis/pemodelan/analisis-result.md`
2. (Optional) Buat grafik visualisasi untuk perbandingan
3. (Optional) Buat tabel ringkas satu halaman untuk referensi cepat
