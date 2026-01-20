# BAB 2
# TINJAUAN PUSTAKA

## 2.1 University Course Timetabling Problem dan Kendala (Constraint)

University Course Timetabling Problem (UCTP) merupakan permasalahan optimasi penjadwalan yang secara luas dihadapi oleh institusi pendidikan tinggi di berbagai negara. UCTP secara formal didefinisikan sebagai masalah optimasi kombinatorial yang bertujuan mengalokasikan sumber daya berupa waktu, ruang, dosen, dan mata kuliah ke dalam slot waktu tertentu dengan tetap memenuhi kendala (constraint) yang ditetapkan institusi (Bashab et al., 2023).

Sebagai masalah NP-COP (Non-Polynomial Combinatorial Optimization Problem), UCTP memiliki karakteristik yang membedakannya dari masalah optimasi konvensional. Pertama, tidak terdapat algoritma yang mampu menyelesaikan UCTP dalam waktu polinomial yang wajar, sehingga pendekatan brute-force tidak feasible untuk kasus nyata. Kedua, waktu komputasi yang dibutuhkan untuk mencapai solusi feasible meningkat secara eksponensial seiring bertambahnya ukuran masalah, seperti jumlah dosen, kelas, ruang, dan kendala yang terlibat. Solusi optimal umumnya hanya dapat diperoleh untuk kasus berukuran kecil, sedangkan mayoritas kasus nyata memerlukan algoritma aproksimasi yang tidak menjamin optimalitas tetapi mampu menghasilkan solusi yang cukup baik (Bashab et al., 2023).

### Jenis-jenis Constraint dalam UCTP

Dalam konteks UCTP, kendala dapat dikategorikan menjadi dua kategori utama yaitu **hard constraints** dan **soft constraints**.

**Hard constraints** merupakan kendala yang wajib dipenuhi sepenuhnya agar jadwal yang dihasilkan valid dan dapat digunakan. Pelanggaran terhadap hard constraints menyebabkan jadwal tidak layak dipakai karena menimbulkan konflik fundamental, misalnya satu dosen mengajar di dua kelas berbeda pada waktu yang sama atau satu ruangan digunakan secara bersamaan oleh dua mata kuliah berbeda. Contoh hard constraints yang umum meliputi lecturer conflict (konflik jadwal dosen), room capacity conflict (kapasitas ruangan), daily SKS limit (batas SKS harian dosen), dan exclusive room constraint (ruang laboratorium eksklusif) (Wiktasari & Suseno, 2016).

**Soft constraints** merupakan kendala yang tidak wajib dipenuhi sepenuhnya, tetapi pelanggaran memberikan penalti yang mengurangi kualitas jadwal. Minimisasi pelanggaran soft constraints bertujuan meningkatkan kepuasan pengguna dengan mempertimbangkan preferensi dan kenyamanan. Contoh soft constraints meliputi teaching time preference (preferensi waktu mengajar), room preference (preferensi ruangan), transit time between classes (waktu perpindahan), dan schedule density optimization (kepadatan jadwal). Penelitian Bashab et al. (2023) menunjukkan bahwa semakin banyak kendala yang dipertimbangkan, semakin kompleks ruang solusi.

### Kompleksitas dan Tantangan UCTP

Kompleksitas UCTP meningkat secara signifikan dengan bertambahnya jumlah variabel dan kendala yang harus dipertimbangkan. Tantangan utama meliputi kebutuhan mengakomodasi preferensi berbagai pihak (dosen, mahasiswa, administrator), kompleksitas dataset berskala besar dengan ratusan kelas, puluhan dosen, dan puluhan ruangan, serta kebutuhan khusus institusional yang bersifat kontekstual seperti batasan religius atau jam istirahat fakultas (Bashab et al., 2023).

Pada konteks Universitas Internasional Semen Indonesia (UISI), UCTP memiliki kompleksitas tambahan berupa kendala spesifik seperti religious time prohibition (larangan penjadwalan pada jam sekitar Dzuhur/Maghrib dan periode Shalat Jumat) dan class category constraint (pembagian kategori kelas pagi dan sore yang harus dijadwalkan sesuai slot waktunya). Kompleksitas ini memerlukan pendekatan algoritmik yang canggih untuk menghasilkan jadwal yang feasible dan mendekati optimal dalam waktu komputasi yang wajar.


## 2.2 Decision Support System

Decision Support System (DSS) atau Sistem Pendukung Keputusan merupakan sistem informasi berbasis komputer yang membantu pengambil keputusan dalam memanfaatkan data, model analitis, dan alat komunikasi untuk mengidentifikasi dan memecahkan masalah (Uysal et al., 2025). DSS berbeda dari sistem informasi manajemen tradisional karena DSS fokus pada keputusan semi-terstruktur dan tidak terstruktur yang memerlukan judgment manusia, sedangkan sistem informasi manajemen tradisional lebih fokus pada keputusan terstruktur yang dapat diotomatisasi sepenuhnya.

Dalam konteks penjadwalan kuliah, DSS berfungsi sebagai alat bantu bagi bagian Administrasi Akademik untuk menghasilkan jadwal perkuliahan yang optimal. Sistem DSS untuk penjadwalan memungkinkan pengguna memasukkan parameter dan kendala yang diinginkan, menjalankan algoritma optimasi, dan menganalisis solusi yang dihasilkan untuk kemudian melakukan penyesuaian jika diperlukan. Penelitian Uysal et al. (2025) menunjukkan bahwa DSS berbasis web yang menggunakan algoritma Simulated Annealing dapat meningkatkan efisiensi proses penjadwalan secara signifikan dengan menghasilkan distribusi beban yang lebih seimbang dan meminimalkan konflik jadwal.

### Komponen Arsitektur DSS untuk Penjadwalan

Arsitektur DSS untuk sistem penjadwalan umumnya terdiri dari beberapa komponen utama yang bekerja secara terintegrasi:

**Database Management System** menyimpan data akademis seperti data dosen, mata kuliah, ruangan, dan mahasiswa. Komponen ini bertanggung jawab mengelola integritas data dan menyediakan akses data yang efisien untuk komponen lainnya.

**Model Management System** mengandung berbagai model matematika dan algoritma untuk optimasi penjadwalan. Dalam konteks penelitian ini, komponen ini mengimplementasikan algoritma Simulated Annealing dengan berbagai variasi dan konfigurasi.

**User Interface** memungkinkan interaksi antara pengguna dan sistem untuk memasukkan parameter, menjalankan algoritma, dan menampilkan hasil. Antarmuka yang ramah pengguna memungkinkan administrator dan faculty members untuk menggunakan sistem tanpa pelatihan khusus (Latpate et al., 2024).

**Communication System** menghubungkan semua komponen dan memfasilitasi pertukaran data. REST API menjadi pilihan populer karena memungkinkan integrasi modular dan skalabilitas tinggi (Romaguera et al., 2023).

Arsitektur DSS untuk penjadwalan umumnya menerapkan prinsip modularitas, di mana komponen database, model optimasi, antarmuka pengguna, dan sistem komunikasi dikembangkan secara terpisah tetapi terintegrasi. Modularitas ini memungkinkan pengembangan paralel, pemeliharaan yang lebih mudah, dan kemampuan untuk mengganti atau meningkatkan komponen tertentu tanpa memengaruhi komponen lainnya (Romaguera et al., 2023).


## 2.3 Simulated Annealing

Simulated Annealing (SA) adalah algoritma metaheuristik yang terinspirasi oleh proses annealing dalam metalurgi, di mana material dipanaskan hingga suhu tinggi dan kemudian didinginkan secara perlahan untuk mencapai struktur kristal yang optimal. Algoritma ini pertama kali diperkenalkan oleh Kirkpatrick et al. (1983) dan sejak saat itu telah banyak digunakan untuk menyelesaikan berbagai masalah optimasi kombinatorial termasuk UCTP.

### Prinsip Dasar dan Mekanisme Algoritma

Simulated Annealing bekerja dengan cara mensimulasikan proses fisika annealing. Pada suhu tinggi, atom-atom dalam material bergerak secara acak dengan energi tinggi, memungkinkan mereka untuk keluar dari posisi lokal yang tidak optimal. Ketika suhu diturunkan secara bertahap, atom-atom mulai menetap pada konfigurasi dengan energi yang lebih rendah. Pada akhir proses, material mencapai konfigurasi ground state dengan energi minimum (Kirkpatrick et al., 1983).

Dalam konteks optimasi, konsep ini diterjemahkan sebagai berikut: solusi awal dihasilkan secara acak atau menggunakan heuristik tertentu. Kemudian, pada setiap iterasi, solusi saat ini dimodifikasi untuk menghasilkan solusi tetangga (neighbor solution). Jika solusi tetangga lebih baik (nilai objective function lebih rendah), maka solusi tersebut diterima. Jika solusi tetangga lebih buruk, maka solusi tersebut masih mungkin diterima dengan probabilitas tertentu yang bergantung pada perbedaan kualitas solusi dan suhu saat ini (Metropolis et al., 1953).

### Kriteria Penerimaan dan Metropolis Criterion

Probabilitas penerimaan solusi worse mengikuti fungsi Boltzmann yang dapat dirumuskan sebagai berikut (Geman & Geman, 1984):

$$P(accept) = \exp\left(-\frac{\Delta E}{T}\right)$$

Di mana:
- $P(accept)$ adalah probabilitas menerima solusi worse
- $\Delta E$ adalah perubahan nilai objective function ($\Delta E = f_{new} - f_{old}$)
- $T$ adalah suhu saat ini
- $\exp$ adalah fungsi eksponensial

Fungsi ini menunjukkan bahwa pada suhu tinggi, probabilitas menerima solusi worse menjadi lebih tinggi, memungkinkan algoritma untuk mengeksplorasi ruang solusi yang lebih luas. Ketika suhu menurun, probabilitas ini menurun secara dramatis, membuat algoritma lebih selektif dan fokus pada eksploitasi solusi-solusi yang berkualitas (Hajek, 1988).

Metropolis criterion adalah aturan penerimaan yang paling umum digunakan dalam SA (Metropolis et al., 1953). Aturan ini dapat dirumuskan sebagai:

- Jika $\Delta E \leq 0$ (solusi baru lebih baik atau sama), terima solusi baru
- Jika $\Delta E > 0$ (solusi baru lebih buruk), terima dengan probabilitas $P = \exp(-\Delta E/T)$

### Parameter Penting dalam Simulated Annealing

Beberapa parameter penting yang mempengaruhi performansi SA meliputi:

**Initial Temperature (T₀)**: Suhu awal menentukan tingkat eksplorasi pada awal algoritma. Suhu yang terlalu rendah dapat menyebabkan algoritma terjebak dalam local optimum terlalu cepat, sementara suhu yang terlalu tinggi akan memperlambat konvergensi. Penentuan suhu awal dapat dilakukan melalui dua pendekatan umum: (1) penentuan adaptif berdasarkan karakteristik masalah, seperti menghitung rata-rata perubahan fitness dari solusi acak sehingga diperoleh probabilitas penerimaan sekitar 50% untuk solusi yang lebih buruk; atau (2) penentuan eksperimental melalui trial-and-error untuk menemukan nilai yang optimal untuk masalah tertentu (Kirkpatrick et al., 1983; Xu et al., 2025).

**Cooling Rate (α)**: Faktor pendinginan menentukan seberapa cepat suhu menurun setiap iterasi. Scheduling pendinginan yang paling umum adalah geometric cooling (Kalivas, 1995):

$$T_{k+1} = \alpha \cdot T_k$$

Di mana $0.8 \leq \alpha \leq 0.99$ dan $k$ adalah iterasi saat ini. Nilai α yang lebih kecil akan menghasilkan pendinginan yang lebih cepat, sementara nilai yang lebih dekat dengan 1 akan menghasilkan pendinginan yang lebih gradual.

**Final Temperature**: Suhu minimum yang menandakan akhir algoritma. Ketika suhu mencapai nilai ini, algoritma dihentikan meskipun solusi optimal belum tentu telah ditemukan.

### Neighbourhood Structure dan Move Generation

Pemilihan struktur neighborhood sangat mempengaruhi performansi SA. Neighborhood structure mendefinisikan bagaimana solusi baru dihasilkan dari solusi saat ini. Xu et al. (2025) menunjukkan bahwa pemilihan move scheme yang tepat sangat penting untuk efisiensi SA. Mereka menemukan bahwa memindahkan hanya satu koordinat pada setiap iterasi memberikan performansi paling efisien untuk masalah high-dimensional.

Untuk UCTP, beberapa move operators yang umum digunakan meliputi:

**Swap Operation**: Menukar dua elemen dalam jadwal, seperti menukar slot waktu dua mata kuliah atau menukar ruangan dua kelas.

**Single Move**: Memindahkan satu event ke slot waktu atau ruangan yang berbeda (Goh et al., 2017).

Pemilihan neighborhood structure yang tepat dapat mempengaruhi acceptance rate dan kecepatan konvergensi algoritma. Xu et al. (2025) menunjukkan bahwa partial-coordinate updates dapat mempertahankan acceptance rate yang lebih tinggi dibandingkan full-coordinate updates dalam setting high-dimensional.

### Reheating dan Variasi SA

Reheating adalah teknik yang digunakan dalam SA untuk meningkatkan suhu secara sementara ketika algoritma menunjukkan tanda-tanda stagnasi, yaitu kondisi di mana tidak ada perbaikan signifikan pada fitness function dalam sejumlah iterasi tertentu. Hal ini memungkinkan algoritma untuk keluar dari local optimum yang mungkin telah terjebak dengan meningkatkan tingkat eksplorasi secara sementara sebelum pendinginan dilanjutkan kembali. Tanpa mekanisme reheating, SA memiliki kecenderan untuk konvergen terlalu cepat ke lokal optimum terdekat, terutama pada masalah optimasi dengan ruang solusi yang kompleks dan banyak lokal optimum (Xu et al., 2025).

Konsep reheating pertama kali diperkenalkan secara eksplisit dalam konteks penjadwalan oleh Goh et al. (2017) melalui Simulated Annealing with Improved Reheating and Learning (SAIRL). SAIRL menggunakan reheating berdasarkan kondisi stuck, yaitu ketika perbaikan solusi tidak terjadi setelah sejumlah iterasi tertentu. Suhu reheating dihitung menggunakan formula yang mempertimbangkan berbagai faktor. Hasil eksperimen pada Socha Dataset menunjukkan bahwa SAIRL mampu meningkatkan kemampuan escape dari local optimum dibandingkan dengan SA konvensional. Penelitian ini juga memperkenalkan penggunaan success rate untuk seleksi operator, di mana operator yang lebih sering menghasilkan perbaikan solusi akan memiliki probabilitas lebih tinggi untuk dipilih di iterasi berikutnya. Goh et al. mendokumentasikan penggunaan tabu tenure dalam konteks UCTP, dengan formula tabu_tenure = RANDOM[10) + |unplaced_events| yang mempertimbangkan jumlah event yang belum ditempatkan. Implementasi dalam penelitian ini mengadopsi konsep success rate tracking dan reheating dari SAIRL untuk meningkatkan performansi algoritma.

Penelitian Muklason et al. (2024) mengembangkan algoritma Tabu-Simulated Annealing Hyper-Heuristics yang menggabungkan Simulated Annealing, Tabu Search, dan konsep hyper-heuristics. Algoritma ini memanfaatkan mekanisme reheating dan tabu list secara simultan, sehingga mampu keluar dari local optimum ketika terjadi stagnasi pencarian solusi. Selain itu, mereka menerapkan pemilihan operator tetangga secara adaptif berbasis success rate, sehingga operator yang lebih sering menghasilkan perbaikan memiliki probabilitas pemilihan yang lebih besar. Hasil eksperimen pada Socha Dataset menunjukkan algoritma hibrida SA-TS dengan reheating mampu menghasilkan penalty score rata-rata 0 untuk small instances dan di bawah 200 untuk medium instances (Muklason et al., 2024).

Penelitian Kaviani et al. (2014) mengembangkan algoritma hibrida TABUSA yang menggabungkan Tabu Search dan Simulated Annealing untuk Quadratic Assignment Problem (QAP). Pendekatan hibrida ini menunjukkan bahwa menggabungkan reheating dengan mekanisme memori dari Tabu Search dapat menghasilkan algoritma yang lebih kuat dalam menyelesaikan masalah optimasi kombinatorial. TABUSA memanfaatkan keunggulan masing-masing metode: Tabu Search untuk exploitation melalui penggunaan tabu list, sementara Simulated Annealing memiliki kemampuan exploration yang baik melalui penerimaan solusi worse secara probabilistik dan reheating. Konsep ini menjadi dasar bagi pengembangan algoritma hybrid SA-TS selanjutnya (Kaviani et al., 2014).


### Keunggulan dan Kelemahan Simulated Annealing

**Keunggulan utama SA meliputi:**
- Kemampuan menghindari local optimum melalui penerimaan probabilistik solusi worse
- Implementasi yang relatif sederhana
- Fleksibilitas untuk berbagai jenis masalah optimasi
- Tidak memerlukan gradient dari fungsi objective
- Dapat menghasilkan solusi berkualitas baik dalam waktu komputasi yang wajar

**Kelemahan SA meliputi:**
- Memerlukan tuning parameter yang tepat untuk performansi optimal
- Waktu komputasi dapat menjadi panjang untuk masalah yang sangat kompleks
- Tidak menjamin menemukan solusi optimal global
- Performansi sangat bergantung pada cooling schedule yang dipilih (Xu et al., 2025)

### Pseudocode Simulated Annealing

Implementasi algoritma SA dengan Metropolis criterion dapat dituliskan sebagai pseudocode berikut (Wiktasari & Suseno, 2016):

```
1. Pilih solusi awal X₀ dan hitung f(X₀)
2. Tentukan suhu awal T₀
3. WHILE kriteria penghentian belum terpenuhi:
    a. Pilih solusi tetangga X' dari neighborhood(X)
    b. Hitung ΔE = f(X') - f(X)
    c. IF ΔE ≤ 0 THEN
        X ← X'
       ELSE
        IF exp(-ΔE/T) > random(0,1) THEN
            X ← X'
        END IF
    d. T ← α × T (update suhu)
4. RETURN solusi terbaik yang ditemukan
```

### Fungsi Fitness dan Perhitungan Kendala

Fungsi fitness merupakan komponen krusial dalam algoritma metaheuristik untuk optimasi UCTP. Fungsi fitness mengevaluasi kualitas solusi jadwal dengan mempertimbangkan pelanggaran terhadap hard constraints dan soft constraints. Penelitian Cruz-Rosales et al. (2022) mengembangkan model matematika komprehensif untuk fungsi fitness yang menggabungkan penalti untuk pelanggaran constraint dengan bobot yang sesuai.

#### Formulasi Matematika Fungsi Fitness

Formulasi matematika fungsi fitness dapat dituliskan sebagai berikut:

$$F(S) = \sum_{i=1}^{n} w_i \cdot HC_i(S) + \sum_{j=1}^{m} v_j \cdot SC_j(S)$$

Di mana:
- $F(S)$ adalah nilai fitness dari solusi jadwal $S$
- $HC_i(S)$ adalah pelanggaran hard constraint ke-$i$ dalam solusi $S$
- $SC_j(S)$ adalah pelanggaran soft constraint ke-$j$ dalam solusi $S$
- $w_i$ adalah bobot penalti untuk hard constraint ke-$i$ (diberikan nilai sangat tinggi)
- $v_j$ adalah bobot penalti untuk soft constraint ke-$j$
- $n$ adalah jumlah hard constraints
- $m$ adalah jumlah soft constraints


#### Bobot Constraint dan Penalty Score

Penentuan bobot untuk setiap constraint sangat penting untuk menghasilkan jadwal yang berkualitas. Cruz-Rosales et al. (2022) merekomendasikan pendekatan multi-objective dengan bobot yang proporsional terhadap tingkat kepentingan constraint. Untuk implementasi dalam penelitian ini, penentuan bobot menggunakan pendekatan:

$$w_{HC} \gg v_{SC}$$

Di mana $w_{HC}$ adalah bobot hard constraints yang diberikan nilai sangat tinggi (misalnya 100000) untuk memastikan pelanggaran hard constraints dihindari sepenuhnya, sementara $v_{SC}$ adalah bobot soft constraints yang lebih rendah (misalnya 1-20) untuk memberikan fleksibilitas dalam optimasi.

Dalam implementasi algoritma, hard constraints diberikan penalti melalui `hardConstraintWeight` yang dikalikan dengan total pelanggaran hard constraints. Nilai yang direkomendasikan adalah 100000 (100 kali lebih besar dari bobot soft constraint tertinggi), sehingga pelanggaran hard constraint tunggal akan menghasilkan penalti yang jauh lebih besar dibandingkan pelanggaran soft constraint apa pun.


## 2.4 Tabu Search

Tabu Search adalah algoritma metaheuristik yang dikembangkan oleh Fred Glover pada tahun 1986. Berbeda dengan Simulated Annealing yang menggunakan probabilitas untuk menghindari local optimum, Tabu Search menggunakan struktur memori untuk mengarahkan pencarian solusi-solusi yang belum dieksplorasi. Tabu Search secara sistematis mengeksplorasi ruang solusi dengan mempertimbangkan solusi-solusi tetangga dan menggunakan memori untuk menghindari kunjungan berulang ke solusi yang sama (Glover et al., 2007).

### Komponen Utama Tabu Search

**Tabu List**: Struktur data yang menyimpan informasi tentang solusi atau move yang telah dikunjungi recently dan tidak boleh dikunjungi kembali dalam beberapa iterasi berikutnya. Tabu list mencegah algoritma dari cycling (kembali ke solusi yang sama dalam siklus pendek) dan mendorong eksplorasi area baru dari ruang solusi. Ukuran tabu list (tabu tenure) biasanya dipilih berdasarkan karakteristik masalah. Untuk UCTP, Goh et al. (2017) menggunakan tabu tenure:

$$tabu\_tenure = RANDOM[10) + |unplaced\_events|$$

Di mana $|unplaced\_events|$ adalah jumlah event yang belum ditempatkan.

**Aspiration Criteria**: Mekanisme yang memungkinkan mengunjungi kembali solusi yang berada dalam tabu list jika solusi tersebut cukup menjanjikan, yaitu kualitasnya lebih baik dari solusi terbaik yang pernah ditemukan. Aspiration criteria membantu algoritma untuk tidak melewatkan solusi yang sangat baik hanya karena tabu status.

**Intensification dan Diversification**: Tabu Search menggunakan dua strategi pencarian. Intensification mendorong pencarian lebih intensif di area solusi yang menjanjikan, sementara diversification mendorong eksplorasi area baru dari ruang solusi yang belum dieksplorasi (Glover et al., 2007).

### Algoritma Tabu Search

Pseudo-code dasar Tabu Search dapat dituliskan sebagai berikut:

```
1. Pilih solusi awal X dan hitung f(X)
2. Inisialisasi tabu list kosong
3. WHILE kriteria penghentian belum terpenuhi:
    a. Generate candidate solutions dari neighborhood(X)
    b. SELECT solusi terbaik dari candidates yang tidak tabu
       (atau memenuhi aspiration criteria)
    c. UPDATE tabu list (tambahkan move yang digunakan,
       hapus move yang expired)
    d. IF f(candidate) < f(best) THEN
        best ← candidate
       END IF
    X ← candidate
4. RETURN solusi terbaik (best)
```

### Keunggulan Tabu Search

Keunggulan Tabu Search terletak pada kemampuannya untuk melakukan eksploitasi yang intensif pada daerah solusi yang menjanjikan. Dengan menggunakan tabu list, algoritma dapat menghindari kunjungan ke solusi yang sama secara berulang dan lebih fokus pada eksplorasi daerah solusi yang belum dieksplorasi. Tabu Search juga memiliki mekanisme aspirasi yang memungkinkan mengunjungi kembali solusi yang berada dalam tabu list jika solusi tersebut cukup menjanjikan.


## 2.5 Pendekatan Hybrid Simulated Annealing dan Tabu Search

Pengembangan terkini dalam literatur menunjukkan bahwa pendekatan hibrida yang menggabungkan Simulated Annealing dan Tabu Search memberikan performansi yang sangat kompetitif dalam menyelesaikan UCTP. Penelitian Muklason et al. (2024) mengembangkan algoritma Tabu-Simulated Annealing Hyper-Heuristics yang menggabungkan kedua metode tersebut dengan konsep hyper-heuristics. Studi mereka menggunakan Socha Dataset sebagai benchmark dan hasilnya menunjukkan bahwa algoritma yang dikembangkan menduduki peringkat kedua dari sepuluh algoritma yang diuji, dengan solusi terbaik pada 6 dari 11 dataset yang diuji.

### Alur Kerja Hybrid SA-TS

Algoritma hybrid yang dikembangkan dalam penelitian ini menggabungkan Simulated Annealing (SA) dan Tabu Search (TS) dengan pola interaksi sebagai berikut:

```
START
│
├─ Generasi Initial Solution (Greedy)
│
├─ Initialisasi Tabu List = kosong
│
└─ Mulai Loop Optimasi
│
│   ├─ Setiap Iterasi SA:
│   │   ├─ 1. Generate Solusi Tetangga (move operator)
│   │   ├─ 2. Cek Tabu Status
│   │   │   ├─ Jika TIDAK tabu → lanjut ke langkah 3
│   │   │   └─ Jika tabu → cek Aspiration Criteria
│   │   │       ├─ Jika memenuhi aspirasi → terima
│   │   │       └─ Jika tidak → tolak (generate baru)
│   │   ├─ 3. Hitung Fitness Baru
│   │   ├─ 4. Hitung Probabilitas Penerimaan (Metropolis Criterion)
│   │   ├─ 5. Cek Aspiration Criteria (jika tabu)
│   │   ├─ 6. Accept/Reject berdasarkan probabilitas
│   │   ├─ 7. Update Tabu List (jika diterima)
│   │   │   └─ Tambahkan signature solusi yang ditinggalkan
│   │   ├─ 8. Update Suhu (Cooling)
│   │   └─ 9. Cek Reheating (jika stagnasi)
│   │
│   └─ Kriteria Stop?
│       ├─ Ya → RETURN solusi terbaik
│       └─ Tidak → ulangi iterasi
```

**Keterangan Alur Kerja:**

1. **Generate Solusi Tetangga**: Pada setiap iterasi, SA menggunakan move operator (misalnya: SwapClasses, ChangeTimeSlot, dll) untuk menghasilkan solusi baru dari neighborhood solusi saat ini. TS **TIDAK** melakukan pencarian neighborhood terpisah, melainkan hanya mengecek apakah solusi yang dihasilkan SA termasuk tabu.

2. **Cek Tabu Status**: TS bertindak sebagai "filter" yang mencegah SA kembali ke solusi yang pernah dikunjungi. Solusi tetangga yang dihasilkan SA diperiksa:
   - Jika signature solusi **TIDAK** ada di tabu list → SA boleh lanjut mengevaluasi
   - Jika signature solusi **ADA** di tabu list → SA cek aspirasi

3. **Aspiration Criteria**: Jika solusi tabu memiliki fitness lebih baik dari global best solution, maka solusi tersebut **TIDAK DIANGGAP TABU** dan boleh diterima oleh SA. Ini memastikan solusi sangat baik tidak dilewatkan hanya karena status tabu.

4. **Metropolis Criterion**: SA menggunakan probabilitas penerimaan P = exp(-ΔE/T) untuk menentukan apakah solusi lebih buruk boleh diterima untuk exploration.

5. **Update Tabu List**: Jika solusi diterima oleh SA, solusi yang ditinggalkan ditambahkan ke tabu list untuk mencegah cycling kembali. Tabu list memiliki tenure (N iterasi) sehingga solusi bisa kembali dikunjungi setelah N iterasi.

6. **Update Suhu (Cooling)**: Setiap iterasi, suhu diturunkan secara geometric: T = α × T.

7. **Cek Reheating (jika stagnasi)**: Jika tidak ada perbaikan fitness dalam sejumlah iterasi tertentu, suhu ditingkatkan drastis untuk escape dari local optimum.

### Mekanisme Acceptance pada Hybrid SA-TS

Dalam implementasi hybrid SA-TS, terdapat dua mekanisme penerimaan yang bekerja secara bersamaan:

**1. Metropolis Criterion (SA)**:
Solusi lebih buruk boleh diterima dengan probabilitas:
P(accept) = exp(-ΔE/T)

Fungsi: Meningkatkan exploration dengan menerima solusi yang lebih buruk secara probabilistik.

**2. Aspiration Criteria (TS)**:
Solusi yang berada dalam tabu list TETAPI memiliki fitness lebih baik dari global best solution DITERIMA meskipun tabu.

Fungsi: Memastikan solusi sangat baik tidak dilewatkan hanya karena status tabu.

**Perbedaan Mendasar:**
- Metropolis Criterion bekerja berdasarkan probabilitas stochastic
- Aspiration Criteria bekerja berdasarkan threshold deterministik (fitness < global best)

**Kombinasi dalam Implementasi:**
Pada setiap iterasi SA, kedua mekanisme ini dievaluasi secara bersamaan:
- Jika solusi TIDAK tabu → hanya Metropolis Criterion yang dievaluasi
- Jika solusi tabu DAN memenuhi aspirasi → solusi DITERIMA (override tabu)
- Jika solusi tabu DAN TIDAK memenuhi aspirasi → solusi DITOLAK (generate baru)

Ilustrasi:
```
Solusi yang dihasilkan SA:
├─ TIDAK tabu → Dievaluasi dengan Metropolis Criterion
│   └─ Lebih baik → Accept (P=1.0)
│   └─ Lebih buruk → Accept dengan P=exp(-ΔE/T)
└─ Ada di tabu list → Cek Aspiration Criteria
    ├─ Fitness < globalBest → Accept (override tabu)
    └─ Fitness ≥ globalBest → Reject (generate baru)
```

### Integrasi dengan Reheating

Ketika algoritma mengalami stagnasi (tidak ada perbaikan dalam sejumlah iterasi tertentu), mekanisme reheating diaktifkan untuk meningkatkan suhu secara drastis. Peningkatan suhu ini memberikan efek berikut:

1. **Meningkatkan P(accept)**: Suhu yang lebih tinggi membuat probabilitas penerimaan solusi lebih buruk menjadi lebih besar, memungkinkan escape dari local optimum.

2. **Mengatasi Aspiration Criteria**: Dengan suhu yang lebih tinggi, solusi yang lebih baik dapat ditemukan lebih cepat, memicu activation lebih sering dari aspiration criteria.

3. **Reset Partial Exploration**: Peningkatan suhu memberikan kesempatan kedua untuk algoritma mengeksplorasi area baru yang mungkin belum terjangkau sebelumnya.

Penting: Reheating tidak mengubah tabu list. Solusi yang masih dalam tenure tetap dianggap tabu kecuali memenuhi aspiration criteria.

**Kesimpulan Interaksi**: SA adalah algoritma utama yang melakukan exploration dan exploitation. TS berperan sebagai fitur tambahan untuk mencegah cycling dengan memori (tabu list) dan aspiration criteria untuk memastikan solusi sangat baik tidak dilewatkan. TS **TIDAK** melakukan pencarian terpisah atau neighborhood search sendiri.

### Keunggulan Pendekatan Hybrid

Keunggulan utama dari pendekatan hybrid SA-TS adalah keseimbangan antara exploitation dan exploration dalam proses pencarian solusi. Tabu Search memiliki kemampuan exploitation yang kuat melalui penggunaan tabu list untuk menghindari kunjungan ke solusi yang sama secara berulang. Sementara Simulated Annealing memiliki kemampuan exploration yang baik melalui penerimaan solusi worse secara probabilistik untuk menghindari local optima. Kombinasi kedua metode ini memungkinkan algoritma untuk secara efektif mencari solusi optimal dalam ruang solusi yang kompleks (Muklason et al., 2024).

Penelitian tersebut juga menggunakan Greedy Algorithm untuk menghasilkan solusi awal sebelum dilakukan optimasi dengan SA-TS hybrid. Penggunaan greedy initial solution memberikan titik awal yang berkualitas dan mempercepat konvergensi algoritma. Hasil eksperimen menunjukkan bahwa algoritma hibrida SA-TS mampu menghasilkan penalty score yang rendah, dengan rata-rata penalty 0 untuk small instances dan rata-rata penalty di bawah 200 untuk medium instances (Muklason et al., 2024).


## 2.6 Roulette Wheel Selection dalam Hyper-Heuristic

Roulette Wheel Selection, juga dikenal sebagai Fitness Proportionate Selection, adalah metode seleksi yang digunakan dalam algoritma evolusioner dan hyper-heuristic untuk memilih solusi atau operator berdasarkan probabilitas yang proporsional dengan nilai fitness-nya. Dalam konteks hyper-heuristic untuk UCTP, Roulette Wheel Selection digunakan untuk memilih operator neighborhood yang akan diterapkan pada solusi saat ini pada setiap iterasi (Muklason et al., 2024).

### Prinsip Dasar Roulette Wheel Selection

Dalam konteks hyper-heuristic untuk UCTP, terdapat perbedaan penting dalam menginterpretasikan nilai "fitness" sebagai nilai kualitas solusi atau sebagai nilai penalti. 

**Dalam Roulette Wheel Selection standar (saat digunakan untuk memilih solusi di algoritma evolusioner)**, nilai fitness yang lebih tinggi merefleksikan solusi yang lebih baik (lebih dekat ke optimal), sehingga solusi dengan fitness tinggi memiliki probabilitas pemilihan yang lebih besar.

**Namun dalam implementasi hyper-heuristic untuk UCTP ini (seperti yang dikembangkan dalam penelitian Muklason et al., 2024)**, yang digunakan adalah **success_rate** dari operator neighborhood, bukan nilai fitness solusi. Success_rate dihitung sebagai rasio antara jumlah perbaikan (improvements) dan jumlah percobaan (attempts), dengan nilai antara 0 hingga 1:
- Success rate tinggi = operator yang sering menghasilkan perbaikan solusi → lebih efektif
- Success rate rendah = operator yang jarang menghasilkan perbaikan → kurang efektif

Oleh karena itu, formula Roulette Wheel yang digunakan dalam implementasi ini adalah:

$$P(i) = \frac{success\_rate(i)}{\sum_{j=1}^{n} success\_rate(j)}$$

Di mana:
- $success\_rate(i)$ adalah rasio keberhasilan operator $i$
- $n$ adalah jumlah total operator yang tersedia

### Pseudocode Roulette Wheel Selection

Pseudo-code Roulette Wheel Selection dapat dituliskan sebagai berikut:

```
1. Hitung total success rate dari semua operator
2. Generate bilangan random r dalam interval [0, total_success_rate)
3. Akumulasikan success rate operator hingga akumulasi ≥ r
4. Pilih operator pada titik akumulasi tersebut
5. RETURN operator yang dipilih
```

### Keunggulan Roulette Wheel Selection

Keunggulan Roulette Wheel Selection dalam hyper-heuristic adalah kemampuannya untuk menyeimbangkan antara exploitation (memilih operator yang terbukti efektif) dan exploration (memberikan kesempatan kepada operator lain). Hal ini sangat relevan dalam konteks UCTP di mana karakteristik ruang solusi dapat berubah seiring proses optimasi berlangsung (Muklason et al., 2024).

**Perbedaan Pendekatan:**
- **Roulette Wheel Standar**: Menggunakan fitness solusi (lebih tinggi = lebih baik)
- **Implementasi Hybrid**: Menggunakan success_rate operator (tinggi = lebih efektif)

### Modifikasi Hybrid Selection

Implementasi dalam penelitian ini mengadopsi modifikasi dari Roulette Wheel Selection murni yang disebut Hybrid Selection, yang terinspirasi oleh penelitian Cowling et al. (2002). Modifikasi ini bertujuan untuk meningkatkan robustnes algoritma dengan mempertahankan tingkat exploration yang memadai bahkan ketika beberapa operator mendominasi dalam hal success rate.

**Hybrid Selection menggabungkan dua mekanisme:**
- **70% Weighted Selection**: Pemilihan operator berdasarkan probabilitas proporsional dengan success rate (mirip Roulette Wheel murni)
- **30% Random Selection**: Pemilihan operator secara acak untuk mempertahankan diversitas pencarian

**Formula untuk Hybrid Selection:**

$$
P(i) = 
\begin{cases} 
0.7 \times \frac{success\_rate(i)}{\sum_{j=1}^{n} success\_rate(j)} + 0.3 \times \frac{1}{n} & \text{if selected} \\
0 & \text{otherwise}
\end{cases}
$$

**Keunggulan modifikasi Hybrid Selection:**
1. Mencegah konvergensi prematur ke lokal optimum
2. Memberikan kesempatan kepada operator yang kurang efektif untuk pulih ketika kondisi berubah
3. Lebih robust terhadap variasi dalam karakteristik masalah

**Implementasi menyediakan dua mode seleksi yang dapat dikonfigurasi pengguna:**
- `hybrid` (default): Modifikasi Hybrid Selection dengan 70% weighted + 30% random
- `roulette-wheel`: Roulette Wheel Selection murni sesuai formula teoritis

Pemilihan mode bergantung pada karakteristik masalah dan prioritas optimasi. Untuk masalah dengan lanskap solusi yang kompleks dan banyak lokal optimum, mode hybrid direkomendasikan. Untuk masalah yang well-understood dengan konvergensi cepat sebagai prioritas, mode roulette-wheel dapat digunakan.


## 2.7 Greedy Algorithm sebagai Initial Solution

Greedy Algorithm adalah pendekatan algoritma yang membuat pilihan optimal lokal pada setiap langkah dengan harapan dapat mencapai solusi optimal global. Dalam konteks UCTP, Greedy Algorithm dapat digunakan untuk menghasilkan solusi awal yang berkualitas tinggi sebelum dilakukan optimasi dengan algoritma metaheuristik seperti SA-TS hybrid. Penggunaan Greedy Algorithm sebagai initial solution memberikan beberapa keuntungan, yaitu memberikan titik awal yang berkualitas yang dapat mempercepat konvergensi algoritma dan mengurangi jumlah iterasi yang diperlukan untuk mencapai solusi yang baik (Muklason et al., 2024).

Dalam penelitian ini, Greedy Algorithm digunakan untuk menghasilkan solusi awal dengan langkah-langkah berikut:

1. Urutkan mata kuliah berdasarkan prioritas (misalnya: jumlah mahasiswa, jumlah SKS, atau kategori)
2. Untuk setiap mata kuliah dalam urutan tersebut:
   a. Cari slot waktu dan ruangan yang tersedia yang tidak melanggar kendala keras
   b. Pilih slot yang paling sesuai berdasarkan preferensi atau kendala lunak
   c. Assign mata kuliah ke slot tersebut

Pendekatan greedy ini sangat cepat dalam menghasilkan solusi awal karena tidak memerlukan iterasi ekstensif seperti metaheuristik. Namun, solusi yang dihasilkan mungkin bukan solusi optimal karena keputusan lokal yang optimal tidak menjamin solusi global yang optimal.


## 2.8 Arsitektur REST API dan Stack Teknologi

REST (Representational State Transfer) API merupakan arsitektur perangkat lunak yang memungkinkan komunikasi antara client dan server melalui protokol HTTP. REST API telah menjadi standar de facto untuk pengembangan layanan web karena kemudahan implementasi, skalabilitas tinggi, dan fleksibilitas lintas platform. Dalam konteks DSS untuk penjadwalan, REST API memungkinkan akses modular terhadap algoritma optimasi yang dapat dipanggil oleh berbagai jenis client seperti web application, mobile application, atau sistem lain yang memerlukan kemampuan penjadwalan (Romaguera et al., 2023).


## 2.9 Penelitian Terdahulu

Penelitian tentang optimasi penjadwalan perkuliahan telah berkembang secara signifikan selama beberapa dekade terakhir. Berbagai pendekatan telah diterapkan untuk menyelesaikan University Course Timetabling Problem (UCTP), mulai dari metode eksak hingga pendekatan metaheuristik. Pemahaman terhadap penelitian-penelitian terdahulu menjadi fondasi penting dalam pengembangan solusi yang lebih efektif dan efisien.

Berdasarkan kajian literatur yang sistematis, metode optimasi untuk penjadwalan dapat dikategorikan menjadi beberapa kelompok utama. Metode eksak seperti Integer Linear Programming dan Constraint Programming dapat memberikan solusi optimal untuk masalah berukuran kecil, namun menjadi tidak feasible untuk masalah berskala besar karena kompleksitas waktu komputasi yang eksponensial (Bashab et al., 2023). Oleh karena itu, pendekatan heuristik dan metaheuristik menjadi lebih populer untuk menyelesaikan UCTP dalam konteks praktis.

Pada subbab ini, dibahas penelitian-penelitian terdahulu yang relevan dan berkontribusi signifikan terhadap pengembangan algoritma optimasi untuk penjadwalan perkuliahan. Pembahasan difokuskan pada penelitian yang menggunakan pendekatan metaheuristik seperti Simulated Annealing, Tabu Search, Greedy Algorithm, serta pendekatan hybrid yang menggabungkan berbagai metode. Berikut adalah pembahasan komprehensif berdasarkan urutan kronologis.

### Kaviani et al. (2014) - Algoritma Hybrid TABUSA

Pada tahun 2014, Kaviani et al. mengembangkan algoritma hibrida TABUSA yang menggabungkan Tabu Search dan Simulated Annealing untuk menyelesaikan Quadratic Assignment Problem (QAP). Hasil eksperimen menunjukkan bahwa algoritma TABUSA mampu menemukan solusi optimal pada sebagian besar kasus QAP dan memberikan relative percentage deviation (RPD) yang lebih rendah dibandingkan dengan Tabu Search murni. Keunggulan utama pendekatan hybrid SA-TS adalah keseimbangan antara exploitation dan exploration dalam proses pencarian solusi (Kaviani et al., 2014).

### Wiktasari dan Suseno (2016) - Simulated Annealing untuk UCTP Indonesia

Pada tahun 2016, Wiktasari dan Suseno mendemonstrasikan penerapan Simulated Annealing untuk optimasi penjadwalan perkuliahan di perguruan tinggi Indonesia. Penelitian ini sangat relevan karena menggunakan konteks yang serupa dengan penelitian ini, yaitu lingkungan akademik Indonesia. Wiktasari dan Suseno menggunakan lima variabel utama dalam optimasi: dosen, mata kuliah, slot waktu, hari, dan ruang kelas. Parameter algoritma yang digunakan meliputi initial temperature, minimum temperature, cooling rate, dan maximum iterations. Hasil penelitian menunjukkan bahwa Simulated Annealing mampu menghasilkan jadwal dengan rata-rata 77,791% dari data dapat mencapai solusi optimal dengan standar deviasi 3,93. Hasil ini memvalidasi efektivitas metode Simulated Annealing untuk masalah penjadwalan perkuliahan di Indonesia. Penelitian ini juga memberikan panduan praktis dalam penentuan parameter SA yang sesuai dengan karakteristik data Indonesia. Selain itu, Wiktasari dan Suseno mendokumentasikan hard constraints yang relevan untuk konteks Indonesia, termasuk konflik dosen, kapasitas ruangan, dan batas SKS harian dosen. Kontribusi penelitian ini sangat berharga karena memberikan baseline dan validasi bahwa SA dapat diterapkan secara efektif dalam konteks akademik Indonesia.

### Goh et al. (2017) - SAIRL dengan Improved Reheating

Pada tahun 2017, Goh, Kendall, dan Sabar mengembangkan Simulated Annealing with Improved Reheating and Learning (SAIRL) untuk menyelesaikan Post-Enrolment Course Timetabling Problem. Kontribusi utama penelitian ini terletak pada pengembangan teknik reheating yang lebih baik untuk membantu algoritma keluar dari local optimum. SAIRL menggunakan reheating berdasarkan kondisi stuck, yaitu ketika perbaikan solusi tidak terjadi setelah sejumlah iterasi tertentu. Suhu reheating dihitung menggunakan formula yang mempertimbangkan nilai fitness saat ini, rata-rata perubahan biaya dari move uphill dan downhill, serta koefisien yang dapat disesuaikan. Hasil eksperimen pada Socha Dataset menunjukkan bahwa SAIRL mampu meningkatkan kemampuan escape dari local optimum dibandingkan dengan SA konvensional. Penelitian ini juga memperkenalkan penggunaan success rate untuk seleksi operator, di mana operator yang lebih sering menghasilkan perbaikan solusi akan memiliki probabilitas lebih tinggi untuk dipilih di iterasi berikutnya. Goh et al. juga mendokumentasikan penggunaan tabu tenure dalam konteks UCTP, dengan formula tabu_tenure = RANDOM[10) + |unplaced_events| yang mempertimbangkan jumlah event yang belum ditempatkan. Implementasi dalam penelitian ini mengadopsi konsep success rate tracking dan reheating dari SAIRL untuk meningkatkan performansi algoritma.

### Coşar et al. (2022) - Greedy-CB-CTT untuk Curriculum-based Course Timetabling

Pada tahun 2022, Coşar, Say, dan Dökeroğlu mengembangkan algoritma Greedy-CB-CTT untuk menyelesaikan Curriculum-based Course Timetabling Problem. Penelitian ini fokus pada penggunaan Greedy Algorithm sebagai metode yang efektif untuk menghasilkan solusi awal berkualitas tinggi. Coşar et al. mengembangkan berbagai heuristik untuk Greedy Algorithm, yaitu Largest-First (mengurutkan mata kuliah berdasarkan jumlah mahasiswa), Smallest-First (mengurutkan berdasarkan jumlah mahasiswa terkecil), Best-Fit (memilih slot yang paling sesuai berdasarkan ketersediaan), Average-weight first (berdasarkan bobot rata-rata), dan Highest Unavailable course-first (memprioritaskan mata kuliah dengan constraint paling ketat). Hasil eksperimen pada 21 problem instance dari benchmark set ITC-2007 menunjukkan bahwa algoritma greedy yang diusulkan dapat menghasilkan solusi feasible dengan zero hard constraint violations pada 18 problem instance dari 21 instance yang diuji. Ini menunjukkan bahwa Greedy Algorithm mampu memberikan solusi awal berkualitas tinggi dalam waktu komputasi yang sangat singkat. Penelitian ini memvalidasi efektivitas penggunaan Greedy Algorithm sebagai initial solution sebelum dilakukan optimasi dengan algoritma metaheuristik. Dalam konteks penelitian ini, hasil Coşar et al. menjadi justifikasi untuk menggunakan Greedy Algorithm sebagai starting point dalam proses optimasi dengan Simulated Annealing.

### Cruz-Rosales et al. (2022) - Metaheuristik dengan Cooperative Processes

Pada tahun 2022, Cruz-Rosales, Cruz-Chávez, dan kolega mengembangkan pendekatan metaheuristik dengan cooperative processes untuk menyelesaikan University Course Timetabling Problem. Kontribusi utama penelitian ini terletak pada pengembangan model matematika komprehensif untuk fungsi fitness yang menggabungkan penalti untuk pelanggaran constraint dengan bobot yang sesuai. Cruz-Rosales et al. merumuskan fungsi fitness sebagai penjumlahan dari hard constraints penalty dan soft constraints penalty dengan bobot yang berbeda. Model ini mempertimbangkan hierarki antara hard constraints dan soft constraints, di mana hard constraints diberikan bobot yang sangat tinggi untuk memastikan pelanggaran hard constraints dihindari sepenuhnya. Formulasi matematika yang dikembangkan Cruz-Rosales et al. menjadi referensi penting dalam pendefinisian fungsi fitness untuk penelitian ini. Penelitian ini juga mendemonstrasikan efektivitas pendekatan multi-objective dengan bobot yang proporsional terhadap tingkat kepentingan constraint. Hasil eksperimen menunjukkan bahwa dengan model fungsi fitness yang tepat, algoritma metaheuristik dapat menghasilkan jadwal yang memenuhi semua hard constraints sambil meminimalkan pelanggaran soft constraints.

### Sukhoco et al. (2024) - Simulated Annealing untuk Penjadwalan Akademik Kompleks

Pada tahun 2024, Sukhoco, Lanvino, Yudhistyra, Permana, dan Ukar melakukan penelitian tentang penerapan Simulated Annealing untuk optimasi penjadwalan akademik di lingkungan kampus dengan kompleksitas data yang tinggi. Studi ini memperkuat temuan penelitian sebelumnya bahwa Simulated Annealing sangat sesuai diterapkan pada studi kasus penjadwalan akademik. Sukhoco et al. mendemonstrasikan bahwa SA dapat menangani kompleksitas data yang tinggi, termasuk jumlah mata kuliah, dosen, ruangan, dan constraint yang besar. Hasil penelitian menunjukkan bahwa dengan parameter yang tepat, SA mampu menghasilkan jadwal yang feasible dan berkualitas dalam waktu yang reasonable. Penelitian ini juga mengidentifikasi tantangan-tantangan spesifik dalam implementasi SA untuk penjadwalan di Indonesia, termasuk karakteristik dataset lokal dan constraint khusus institusi. Kontribusi Sukhoco et al. sangat relevan karena memberikan validasi tambahan bahwa pendekatan SA dapat diterapkan secara efektif dalam konteks akademik Indonesia dengan karakteristik data yang kompleks.

### Muklason et al. (2024) - Tabu-Simulated Annealing Hyper-Heuristics

Pada tahun 2024, Muklason, Marom, dan Premananda mengembangkan algoritma Tabu-Simulated Annealing Hyper-Heuristics yang menggabungkan kedua metode metaheuristik dengan konsep hyper-heuristics. Penelitian ini merupakan kontribusi paling relevan dan terkini untuk penelitian ini. Algoritma yang dikembangkan menggunakan hyper-heuristic untuk secara otomatis memilih dan mengaplikasikan operator neighborhood yang tepat pada setiap iterasi. Studi Muklason et al. menggunakan Socha Dataset sebagai benchmark standar internasional dan hasilnya menunjukkan bahwa algoritma yang dikembangkan menduduki peringkat kedua dari sepuluh algoritma yang diuji, dengan solusi terbaik pada 6 dari 11 dataset yang diuji. Hasil eksperimen menunjukkan bahwa algoritma hibrida SA-TS mampu menghasilkan penalty score yang rendah, dengan rata-rata penalty 0 untuk small instances dan rata-rata penalty di bawah 200 untuk medium instances. Penelitian ini juga mengembangkan mekanisme Roulette Wheel Selection untuk memilih operator neighborhood berdasarkan performansi historisnya. Operator yang secara konsisten menghasilkan peningkatan solusi akan memiliki probabilitas pemilihan yang lebih tinggi, sementara operator yang kurang efektif akan tetap memiliki kesempatan untuk dipilih untuk mempertahankan diversitas pencarian. Implementasi dalam penelitian ini mengadopsi konsep hyper-heuristic dan Roulette Wheel Selection dari Muklason et al. sebagai dasar untuk adaptive operator selection.

### Xu et al. (2025) - Dampak Move Schemes terhadap Performa Simulated Annealing

Pada tahun 2025, Xu, Liu, dan Zhou melakukan penelitian komprehensif tentang dampak berbagai move schemes terhadap performansi Simulated Annealing untuk optimasi high-dimensional. Meskipun penelitian ini tidak secara spesifik membahas UCTP, kontribusinya sangat relevan karena memberikan panduan praktis dalam pemilihan neighborhood structure untuk SA. Xu et al. menunjukkan bahwa pemilihan move scheme yang tepat sangat penting untuk efisiensi SA. Mereka menemukan bahwa memindahkan hanya satu koordinat pada setiap iterasi memberikan performansi paling efisien untuk masalah high-dimensional, dibandingkan dengan melakukan perubahan koordinat secara bersamaan (full-coordinate updates). Partial-coordinate updates dapat mempertahankan acceptance rate yang lebih tinggi dibandingkan full-coordinate updates dalam setting high-dimensional. Hal ini penting karena acceptance rate yang tinggi memungkinkan algoritma untuk terus mengeksplorasi ruang solusi bahkan pada suhu rendah. Penelitian Xu et al. memberikan justifikasi teoretis untuk penggunaan single move dalam implementasi SA untuk UCTP. Dalam penelitian ini, single move diadopsi sebagai move operator utama dengan pertimbangan efisiensi dan acceptance rate yang lebih tinggi.

### Uysal et al. (2025) - Web-based DSS dengan Simulated Annealing

Pada tahun 2025, Uysal, Ceran, Tanrıverdi, Özdoğan, dan Üstündağ mengembangkan web-based Decision Support System yang menggunakan algoritma Simulated Annealing untuk optimasi penjadwalan kursus online. Penelitian ini mendemonstrasikan implementasi praktis SA dalam sistem informasi berbasis web. Sistem yang dibangun memungkinkan koordinasi program untuk melakukan penyesuaian yang diperlukan, sementara mahasiswa dan dosen mengakses jadwal mereka melalui antarmuka yang ramah pengguna. Hasil eksperimen menunjukkan peningkatan substansial dalam distribusi koneksi concurrent dan efisiensi bandwidth. Kontribusi penelitian ini relevan dalam dua aspek: pertama, memvalidasi bahwa SA dapat diimplementasikan dalam sistem berbasis web dengan antarmuka pengguna yang ramah; kedua, menunjukkan bahwa SA dapat diterapkan untuk optimasi penjadwalan dalam konteks pendidikan online yang memiliki karakteristik khusus. Uysal et al. juga mendemonstrasikan pentingnya integrasi antara algoritma optimasi dan antarmuka pengguna dalam sistem DSS yang efektif. Implementasi dalam penelitian ini mengadopsi prinsip-prinsip yang dikembangkan Uysal et al. untuk memastikan sistem yang dibangun dapat diakses dan digunakan dengan mudah oleh pengguna akhir.

### Tabel Ringkasan Penelitian Terdahulu

**Tabel 2.1 Ringkasan Penelitian Terdahulu terkait Optimasi Penjadwalan**

| No. | Peneliti (Tahun) | Metode | Jenis Masalah | Dataset/Benchmark | Hasil Utama | Keterangan |
|-----|------------------|--------|---------------|-------------------|-------------|------------|
| 1 | Kaviani et al. (2014) | TABUSA (Hybrid TS-SA) | Quadratic Assignment Problem (QAP) | Benchmark QAP | RPD lebih rendah dibanding pure Tabu Search | Pendekatan hybrid SA-TS pertama |
| 2 | Wiktasari & Suseno (2016) | Simulated Annealing | UCTP Indonesia | Data perguruan tinggi Indonesia | 77.791% data mencapai solusi optimal, SD=3.93 | Validasi SA untuk konteks Indonesia |
| 3 | Goh et al. (2017) | SAIRL (SA dengan Improved Reheating) | Post-Enrolment Course Timetabling | Socha Dataset | Meningkatkan kemampuan escape dari local optimum | Variasi SA dengan reheating |
| 4 | Coşar et al. (2022) | Greedy Algorithm (Greedy-CB-CTT) | Curriculum-based Course Timetabling | ITC-2007 (21 instances) | Zero hard constraint violations pada 18/21 instance | Efektif sebagai initial solution |
| 5 | Cruz-Rosales et al. (2022) | Metaheuristic dengan Cooperative Processes | UCTP | - | Model matematika fungsi fitness dengan bobot penalti | Cooperative processes approach |
| 6 | Sukhoco et al. (2024) | Simulated Annealing | UCTP | Data kampus Indonesia | SA sesuai untuk penjadwalan akademik kompleks | Penelitian SA terkini Indonesia |
| 7 | Muklason et al. (2024) | Tabu-Simulated Annealing Hyper-Heuristics | UCTP | Socha Dataset | Peringkat 2 dari 10 algoritma, solusi terbaik 6/11 dataset | Hybrid SA-TS dengan Hyper-Heuristics |
| 8 | Xu et al. (2025) | Simulated Annealing | High-Dimensional Optimization | Synthetic high-dim data | Partial-coordinate updates lebih efisien | Move Schemes Impact on SA |
| 9 | Uysal et al. (2025) | Web-based DSS dengan SA | Online Course Timetabling | Data online education | Peningkatan distribusi koneksi concurrent dan efisiensi bandwidth | DSS berbasis web |


