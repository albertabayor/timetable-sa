# Point-Point PPT Seminar Proposal Skripsi

## Slide 1: Judul
**SISTEM INFORMASI PENJADWALAN PADA KAMPUS UISI DENGAN MENGGUNAKAN ALGORITMA SIMULATED ANNEALING YANG DIBANGUN MENGGUNAKAN REST API DAN WEB**

- Nama: Ade Nafil Firmansah
- NIM: 3012210002
- Dosen Pembimbing: Yohanes Indra Riskajaya, S.Kom., M.Kom., MTA, MCE
- Departemen Informatika, Universitas Internasional Semen Indonesia
- Tahun 2026

---

## Slide 2: Pendahuluan - Latar Belakang
- Penjadwalan perkuliahan = masalah optimasi kombinatorial kompleks (NP-Hard)
- Proses penjadwalan di UISI masih semi-otomatis
- Masalah yang dihadapi:
  - Rentan terhadap human error
  - Memakan waktu lama
  - Kurang fleksibel terhadap perubahan mendadak
- Solusi: Decision Support System (DSS) berbasis web dengan algoritma hibrida

---

## Slide 3: Rumusan Masalah
1. Bagaimana merancang dan membangun Sistem Pendukung Keputusan berbasis web untuk penjadwalan perkuliahan di Kampus UISI?
2. Bagaimana mengimplementasikan algoritma hibrida Simulated Annealing dan Tabu Search dengan Greedy Algorithm sebagai solusi awal?
3. Apakah DSS yang dikembangkan dapat menghasilkan jadwal kuliah yang valid dan feasible?
4. Bagaimana membangun sistem dengan arsitektur REST API dan web interface yang mudah digunakan?

---

## Slide 4: Tujuan Penelitian
1. Merancang dan membangun Sistem Pendukung Keputusan berbasis web untuk penjadwalan perkuliahan di Kampus UISI
2. Mengimplementasikan algoritma hibrida Simulated Annealing dan Tabu Search dengan Greedy Algorithm sebagai initial solution
3. Menghasilkan jadwal kuliah yang valid dan feasible (bebas hard constraints violation)
4. Mengoptimalkan pemenuhan soft constraints sesuai preferensi dosen dan kebijakan akademik UISI
5. Memastikan sistem dapat menghasilkan jadwal kuliah dengan kualitas yang baik

---

## Slide 5: Manfaat Penelitian
- **Teoritis**: Menambah literatur tentang optimasi penjadwalan akademik dengan metaheuristik hibrida SA-TS dan Greedy
- **Praktis**:
  - Membantu bagian Administrasi Akademik UISI
  - Mempercepat proses penyusunan jadwal
  - Mengurangi human error
  - Menghasilkan jadwal yang konsisten dan berkualitas
  - Proof-of-concept implementasi DSS untuk UCTP dengan arsitektur REST API

---

## Slide 6: University Course Timetabling Problem (UCTP)
- Masalah optimasi kombinatorial (NP-COP)
- Waktu komputasi meningkat eksponensial seiring ukuran masalah
- **Hard Constraints** (wajib dipenuhi):
  - Konflik jadwal dosen
  - Kapasitas ruangan
  - Batas SKS harian dosen
  - Ruang laboratorium eksklusif
- **Soft Constraints** (preferensi):
  - Preferensi waktu mengajar dosen
  - Preferensi ruangan
  - Waktu perpindahan antar kelas
  - Kepadatan jadwal

---

## Slide 7: Simulated Annealing (SA)
- Algoritma metaheuristik terinspirasi dari proses annealing metalurgi
- **Prinsip kerja**:
  - Menerima solusi lebih baik secara otomatis
  - Menerima solusi lebih buruk dengan probabilitas: P(accept) = exp(-ΔE/T)
- **Keunggulan**: Efisien dalam komputasi, fleksibel untuk constraint lokal
- **Parameter kunci**: Initial temperature, cooling rate, final temperature

---

## Slide 8: Tabu Search (TS)
- Algoritma metaheuristik dengan struktur memori
- **Komponen utama**:
  - **Tabu List**: Mencegah cycling (kembali ke solusi yang sama)
  - **Aspiration Criteria**: Memungkinkan mengunjungi solusi tabu jika cukup baik
  - **Intensifikasi**: Mengeksplorasi area solusi yang menjanjikan
  - **Diversifikasi**: Mengeksplorasi area baru
- **Keunggulan**: Efektif dalam exploitation untuk menghindari local optimum

---

## Slide 9: Algoritma Hibrida SA-TS + Greedy
**Three-Phase Approach**:
1. **Fase 1 - Greedy Algorithm**: Menghasilkan solusi awal feasible (bebas hard constraints)
2. **Fase 2 - Simulated Annealing**: Eksplorasi global dengan penerimaan solusi buruk secara probabilistik
3. **Fase 3 - Tabu Search**: Eksploitasi lokal dengan menghindari siklus dan memperkuat pencarian

**Hyper-Heuristic dengan Roulette Wheel Selection**:
- Memilih operator (swap/move) berdasarkan performansi historis
- Seimbang antara eksplorasi dan eksploitasi

---

## Slide 10: Penelitian Terdahulu
| Peneliti (Tahun) | Metode | Hasil |
|------------------|--------|-------|
| Kaviani et al. (2014) | Hybrid TABUSA | RPD lebih rendah |
| Sari & Suseno (2016) | SA | 77.79% mencapai solusi optimal |
| Muklason et al. (2024) | Tabu-SA Hyper-Heuristics | Peringkat 2 dari 10 algoritma |
| Uysal et al. (2025) | Web-based DSS dengan SA | Peningkatan efisiensi bandwidth |

---

## Slide 11: Karakteristik UISI
**Constraint Set yang Unik**:
- Larangan penjadwalan waktu salat Dzuhur, Maghrib
- Periode Salat Jumat
- Pembagian kelas pagi dan sore
- Hard & soft constraints khusus institusi

**Kebutuhan Sistem**:
- Standalone application (tidak terintegrasi langsung dengan sistem akademik)
- Dapat menghasilkan solusi untuk diimplementasikan manual
- Arsitektur REST API dengan antarmuka React

---

## Slide 12: Metode Penelitian - SDLC Prototyping
**Alur Penelitian**:
1. Identifikasi Masalah (observasi + wawancara)
2. Analisis Kebutuhan (17 kebutuhan fungsional)
3. Pembuatan Prototype
4. Pembuatan Database
5. Perancangan Sistem
6. Pengujian Sistem

**Metode**: Prototyping (iteratif dan interaktif dengan pengguna)

---

## Slide 13: Analisis Kebutuhan Fungsional
**Fitur Utama**:
- Autentikasi Pengguna
- Dashboard dengan statistik & visualisasi
- Manajemen Data (Dosen, Mata Kuliah, Ruangan)
- Import/Export Excel
- Penyusunan Jadwal Manual (drag-and-drop)
- Deteksi Konflik Real-time
- **Optimasi Otomatis** (SA + TS)
- Konfigurasi Parameter Optimasi
- Monitoring Proses Real-time
- Riwayat Optimisasi

---

## Slide 14: Use Case & Flowchart
**Aktor**: Administrator

**Modul Utama**:
1. Manajemen Data Master & Import
2. Proses Penyusunan Jadwal (Optimasi SA)
3. Intervensi Manual
4. Monitoring dan Pengaturan

**Alur**: Login → Dashboard → Manajemen Data → Optimasi → Hasil Jadwal

---

## Slide 15: Desain Antarmuka (Prototype)
**Halaman Utama**:
- **Login**: Modern dengan statistik sistem
- **Dashboard**: Ringkasan statistik, grafik fitness, room utilization
- **View Schedule**: Grid jadwal mingguan dengan drag-and-drop
- **Manajemen**: Dosen, Mata Kuliah, Ruangan (CRUD + Import/Export)
- **Optimasi**: Panel kontrol SA dengan parameter tuning real-time
- **Monitor**: CPU, Memory, Riwayat Optimisasi
- **Settings**: Tema, Notifikasi, Constraint

---

## Slide 16: Arsitektur Sistem
**Tech Stack**:
- **Frontend**: React-based interface
- **Backend**: REST API
- **Database**: MySQL
- **Algoritma**: Simulated Annealing + Tabu Search + Greedy

**Keunggulan Arsitektur**:
- Modular dan scalable
- Kemudahan penggunaan
- Real-time monitoring
- Flexible parameter configuration

---

## Slide 17: Skema Database (High Level)
**Tabel Utama**:
- Users, Session, Account, Verification
- Dosen (kode, nama, preferensi, constraint)
- Mata Kuliah (kode, SKS, dosen, peserta, kebutuhan lab)
- Ruangan (kode, tipe, kapasitas)
- Jadwal (slot waktu, assignment)
- Riwayat Optimisasi (parameter, hasil, fitness)

---

## Slide 18: Parameter Algoritma SA-TS
**Core SA Parameters**:
- Initial Temperature
- Minimum Temperature
- Cooling Rate (α)
- Maximum Iterations
- Hard Constraint Weight

**Reheating Configuration**:
- Threshold & Factor
- Maximum Reheats

**Tabu Search Configuration**:
- Tabu Tenure
- Max Tabu List Size
- Aspiration Criteria

---

## Slide 19: Batasan Masalah
1. Dataset khusus milik UISI
2. Algoritma: SA + TS + Greedy (hibrida)
3. Standalone DSS (tidak terintegrasi langsung dengan Siakad)
4. Fokus pada satu semester akademik penuh
5. Target pengguna: Administrator Akademik

---

## Slide 20: Timeline & Rencana Kerja
**Tahapan Pengembangan**:
1. Analisis Kebutuhan (2 minggu)
2. Desain Database & Arsitektur (2 minggu)
3. Implementasi Backend/REST API (4 minggu)
4. Implementasi Frontend (4 minggu)
5. Implementasi Algoritma SA-TS (4 minggu)
6. Integrasi & Testing (3 minggu)
7. Dokumentasi & Penulisan (3 minggu)

---

## Slide 21: Harapan Hasil
- Sistem DSS berbasis web yang fungsional
- Algoritma hibrida SA-TS yang terimplementasi dengan baik
- Jadwal kuliah yang:
  - Valid (bebas hard constraints)
  - Feasible (dapat diimplementasikan)
  - Optimal (minimal soft constraints violation)
  - Sesuai karakteristik UISI
- Dokumentasi parameter tuning untuk konteks Indonesia

---

## Slide 22: Kontribusi Penelitian
1. Implementasi algoritma hibrida SA-TS + Greedy untuk dataset Indonesia
2. DSS dengan arsitektur REST API dan web interface modern
3. Penanganan constraint unik UISI (waktu salat, dll)
4. Dokumentasi komprehensif parameter tuning untuk UCTP lokal
5. Sistem yang dapat menjadi referensi untuk institusi serupa

---

## Slide 23: Penutup
**Terima Kasih**

**Pertanyaan & Diskusi**

---

## Tips Presentasi:
- **Slide 1-5**: 5-7 menit (Pendahuluan)
- **Slide 6-11**: 10-12 menit (Kajian Pustaka & Landasan Teori)
- **Slide 12-18**: 10-12 menit (Metode Penelitian)
- **Slide 19-23**: 3-5 menit (Batasan, Timeline, Penutup)
- **Total**: 30-35 menit presentasi + 10-15 menit tanya jawab
