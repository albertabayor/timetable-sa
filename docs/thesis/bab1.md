# BAB I

# PENDAHULUAN

## 1.1 Latar Belakang

Penjadwalan perkuliahan merupakan aktivitas operasional yang bersifat krusial karena secara langsung memengaruhi efektivitas dan efisiensi proses belajar-mengajar di perguruan tinggi. Jadwal perkuliahan yang disusun secara kurang optimal berpotensi menimbulkan berbagai permasalahan, seperti konflik waktu, pemanfaatan sumber daya yang tidak efisien, serta menurunnya tingkat kepuasan dosen dan mahasiswa. Sebaliknya, penyusunan jadwal yang optimal menuntut pertimbangan terhadap berbagai faktor yang saling berinteraksi, antara lain ketersediaan dosen, kapasitas dan karakteristik ruang kelas, preferensi waktu mengajar, serta kebijakan akademik institusi.

Secara komputasional, permasalahan penjadwalan perkuliahan dikenal sebagai *University Course Timetabling Problem* (UCTP), yang tergolong sebagai permasalahan *Non-Polynomial Hard* (NP-Hard) dan *Combinatorial Optimization Problem* (COP) (Bashab et al., 2023). Karakteristik ini menunjukkan bahwa tidak terdapat algoritma eksak yang mampu menyelesaikan UCTP secara efisien dalam waktu polinomial untuk kasus berskala besar. Pendekatan *brute-force* menjadi tidak layak digunakan karena waktu komputasi yang dibutuhkan meningkat secara eksponensial seiring dengan bertambahnya ukuran masalah. Oleh karena itu, solusi optimal umumnya hanya dapat dicapai pada instance berukuran kecil, sedangkan pada kasus nyata diperlukan pendekatan aproksimasi atau heuristik yang tidak menjamin optimalitas global, tetapi mampu menghasilkan solusi yang layak dan berkualitas dalam waktu komputasi yang wajar (Bashab et al., 2023).

Berbagai penelitian terdahulu telah menunjukkan efektivitas metode optimasi berbasis metaheuristik dalam menyelesaikan UCTP. Berdasarkan *systematic literature review* yang dilakukan oleh Bashab et al. (2023), metode seperti *Simulated Annealing* (SA), *Genetic Algorithm* (GA), *Particle Swarm Optimization* (PSO), *Ant Colony Optimization* (ACO), serta pendekatan hibrida telah banyak diterapkan dan terbukti mampu menghasilkan solusi dengan kualitas yang baik. Analisis statistik pada publikasi-publikasi tersebut menunjukkan bahwa algoritma hibrida mendominasi penelitian terbaru, dengan proporsi mencapai 35% dari total publikasi.

Di antara berbagai metode tersebut, *Simulated Annealing* memiliki keunggulan kompetitif dari sisi kecepatan komputasi dan fleksibilitas dalam menangani *constraint* lokal yang spesifik pada suatu institusi. Dibandingkan dengan algoritma berbasis populasi yang memerlukan jumlah evaluasi fungsi objektif dalam skala besar, SA relatif lebih efisien karena bekerja pada satu solusi kandidat yang diperbaiki secara iteratif. Hal ini menjadikan SA sesuai untuk permasalahan UCTP berskala besar dengan keterbatasan waktu komputasi (Wiktasari & Suseno, 2016). Penelitian empiris oleh Wiktasari dan Suseno (2016) menunjukkan bahwa SA mampu mengoptimalkan penjadwalan dengan mempertimbangkan lima variabel utama, yaitu dosen, mata kuliah, slot waktu, hari, dan ruang kelas. Temuan ini diperkuat oleh Sukhoco et al. (2024) yang membuktikan efektivitas SA dalam konteks penjadwalan akademik di lingkungan perguruan tinggi Indonesia.

Perkembangan terkini dalam penelitian UCTP menunjukkan bahwa pendekatan hibrida yang mengombinasikan *Simulated Annealing* dan *Tabu Search* (TS) mampu memberikan performa yang lebih kompetitif. Muklason et al. (2024) mengembangkan algoritma *Tabu–Simulated Annealing Hyper-Heuristics* dan mengujinya menggunakan *Socha Dataset* sebagai *benchmark*. Hasil pengujian menunjukkan bahwa algoritma tersebut menempati peringkat kedua dari sepuluh algoritma yang diuji. Keunggulan utama dari pendekatan hibrida SA–TS terletak pada keseimbangan antara kemampuan *exploration* dan *exploitation*. *Tabu Search* unggul dalam *exploitation* melalui mekanisme *tabu list* untuk menghindari siklus lokal, sedangkan SA memiliki kemampuan *exploration* melalui penerimaan solusi yang lebih buruk secara probabilistik.

Selain itu, kualitas solusi awal (*initial solution*) juga berperan penting dalam kinerja algoritma metaheuristik. Penggunaan *Greedy Algorithm* sebagai solusi awal telah terbukti efektif dalam meminimalkan pelanggaran *hard constraints*. Coşar et al. (2022) melaporkan bahwa algoritma greedy mampu menghasilkan solusi dengan nol pelanggaran *hard constraints* pada 18 dari 21 instance ITC-2007. Berdasarkan temuan tersebut, pendekatan hibrida SA–TS yang diawali dengan *Greedy Algorithm* sebagai *initial solution* dinilai sebagai strategi yang tepat untuk menyelesaikan UCTP.

Dari sisi implementasi sistem, pengembangan *Decision Support System* (DSS) berbasis web untuk penjadwalan perkuliahan menunjukkan tren yang semakin signifikan. Uysal et al. (2025) mengembangkan DSS berbasis web dengan algoritma SA yang mampu meningkatkan efisiensi penggunaan bandwidth serta pengelolaan koneksi secara simultan. Romaguera et al. (2023) mengembangkan sistem penjadwalan menggunakan *Enhanced Genetic Algorithm* dengan *heuristic mutation*, sedangkan Latpate et al. (2024) mengimplementasikan *AI-based automatic timetable generator* berbasis React yang mampu menghasilkan jadwal dalam hitungan menit dengan antarmuka yang intuitif.

Pada konteks Universitas Internasional Semen Indonesia (UISI), proses penyusunan jadwal perkuliahan masih bersifat semiotomatis dan terfragmentasi dalam beberapa tahapan manual. Proses tersebut meliputi pengumpulan preferensi dosen melalui pertemuan dan formulir manual, input data ke perangkat lunak penjadwalan, ekspor jadwal ke dalam format tabel atau *spreadsheet*, serta input ulang ke sistem akademik internal dan aplikasi manajemen ruang. Karakteristik UCTP yang bersifat NP-Hard dan NP-COP dalam konteks UISI menimbulkan berbagai kendala praktis, seperti risiko *human error*, waktu penyusunan jadwal yang relatif lama, minimnya integrasi sistem, serta rendahnya fleksibilitas terhadap perubahan jadwal secara mendadak.

Berdasarkan permasalahan tersebut, penelitian ini berfokus pada pengembangan *Decision Support System* berbasis web untuk penjadwalan perkuliahan di Kampus UISI. DSS ini dirancang sebagai alat bantu bagi bagian Administrasi Akademik dalam menghasilkan jadwal perkuliahan yang optimal. Sistem dikembangkan sebagai aplikasi *standalone* yang tidak terintegrasi secara langsung dengan sistem akademik internal, namun mampu menghasilkan solusi penjadwalan yang dapat diimplementasikan secara manual. Arsitektur sistem dibangun menggunakan *REST API* dan antarmuka web untuk memudahkan akses serta penggunaan oleh pihak-pihak terkait.

UISI memiliki karakteristik kendala yang bersifat unik dan memerlukan pendekatan algoritmik khusus, antara lain *religious time prohibition* (larangan penjadwalan pada waktu sekitar salat Dzuhur, Maghrib, dan periode Salat Jumat), *class category constraint* (pembagian kelas pagi dan sore), serta berbagai *hard constraints* dan *soft constraints* lainnya.

Berdasarkan kajian literatur yang telah dipaparkan, terdapat beberapa aspek yang memerlukan kajian lebih lanjut dalam konteks optimasi penjadwalan perkuliahan. Aspek pertama berkaitan dengan integrasi *Greedy Algorithm* sebagai *initial solution* dalam algoritma hibrida SA–TS yang dioptimalkan untuk karakteristik dataset institusi pendidikan tinggi di Indonesia. Mayoritas penelitian terdahulu memanfaatkan *dataset benchmark* internasional, seperti *Socha Dataset* atau ITC-2007, yang memiliki karakteristik berbeda dengan *dataset* riil di Indonesia. Implementasi algoritma pada konteks lokal Indonesia, termasuk konfigurasi parameter yang sesuai, masih memerlukan eksplorasi lebih mendalam (Muklason et al., 2024).

Aspek kedua menyangkut keterbatasan dokumentasi terkait *performance metrics* dan proses *parameter tuning* pada implementasi algoritma metaheuristik untuk penjadwalan akademik di Indonesia. Parameter kunci pada SA, seperti *initial temperature*, *cooling rate*, dan *tabu tenure*, sangat bergantung pada karakteristik *dataset* spesifik, termasuk jumlah *event*, kompleksitas *constraints*, serta preferensi lokal institusi. Dokumentasi yang komprehensif mengenai hal ini masih relatif terbatas, sehingga menyulitkan proses replikasi dan implementasi algoritma secara efektif.

Aspek ketiga berkaitan dengan ketersediaan *Decision Support System* yang secara khusus mengintegrasikan algoritma hibrida SA–TS dengan arsitektur REST API dan antarmuka modern. Sistem penjadwalan yang tersedia umumnya bersifat *proprietary*, kurang fleksibel untuk dikustomisasi, atau tidak menyediakan akses independen bagi pengambil keputusan di tingkat institusi. Pengembangan sistem yang sesuai dengan kebutuhan spesifik institusi, khususnya UISI, masih menjadi peluang yang dapat dikembangkan lebih lanjut.

Aspek keempat berkaitan dengan *constraint set* yang bersifat unik pada UISI, seperti *religious time prohibition* dan *class category constraint*. Kedua *constraints* tersebut, meskipun relevan dengan konteks institusi pendidikan di Indonesia, belum banyak dijadikan fokus utama dalam penelitian penjadwalan perkuliahan pada publikasi ilmiah. Pengembangan algoritma yang sensitif terhadap konteks lokal, termasuk pertimbangan aspek religius dan kebijakan institusi, menjadi salah satu potensi kontribusi yang dapat diberikan melalui penelitian ini. Dengan demikian, penelitian ini diharapkan dapat memberikan kontribusi nyata melalui pengembangan DSS berbasis web yang mengimplementasikan algoritma hibrida SA–TS dengan *Greedy Algorithm* sebagai *initial solution*, yang dioptimalkan untuk karakteristik *dataset* UISI.

## 1.2 Rumusan Masalah

Berdasarkan latar belakang di atas, permasalahan yang dibahas dalam penelitian ini dirumuskan sebagai berikut:

1. Bagaimana merancang dan membangun Sistem Pendukung Keputusan berbasis web untuk penjadwalan perkuliahan di Kampus UISI?

2. Bagaimana mengimplementasikan algoritma hibrida Simulated Annealing dan Tabu Search dengan Greedy Algorithm sebagai initial solution untuk menyelesaikan UCTP?

3. Bagaimana mengukur dan memvalidasi kualitas jadwal berdasarkan metrik pelanggaran hard constraints dan soft constraints?

4. Bagaimana membangun sistem dengan arsitektur REST API dan web interface yang mudah digunakan?

5. Apakah DSS dapat menghasilkan jadwal kuliah dengan kualitas yang baik dalam waktu komputasi yang wajar?

## 1.3 Tujuan Penelitian

Tujuan dari penelitian ini adalah:

1. Merancang dan membangun Sistem Pendukung Keputusan berbasis web untuk penjadwalan perkuliahan di Kampus UISI.

2. Mengimplementasikan algoritma hibrida Simulated Annealing dan Tabu Search dengan Greedy Algorithm sebagai initial solution.

3. Mengukur dan memvalidasi kualitas jadwal berdasarkan metrik pelanggaran hard constraints dan soft constraints.

4. Mengoptimalkan pemenuhan soft constraints sesuai dengan preferensi dosen dan kebijakan akademik UISI.

5. Memastikan sistem dapat menghasilkan jadwal kuliah dengan kualitas yang baik dalam waktu komputasi yang wajar.

## 1.4 Batasan Masalah

Batasan masalah dari penelitian ini adalah:

1. Dataset penjadwalan yang digunakan merupakan data institusional spesifik milik Universitas Internasional Semen Indonesia (UISI).

2. Algoritma optimasi yang diimplementasikan adalah algoritma hibrida Simulated Annealing dan Tabu Search dengan Greedy Algorithm sebagai initial solution.

3. Sistem dibangun sebagai Decision Support System yang beroperasi secara independen, bukan sebagai integrasi langsung dengan sistem akademik internal UISI.

4. Frontend dikembangkan menggunakan React.js dan backend menggunakan arsitektur REST API.

5. Penelitian ini fokus pada penjadwalan untuk satu semester akademik penuh.

## 1.5 Manfaat Penelitian

Manfaat dari penelitian ini adalah:

1. Menambah literatur dalam bidang optimasi penjadwalan akademik dengan metaheuristik hibrida SA-TS dan Greedy initial solution.

2. Memberikan kontribusi praktis berupa Sistem Pendukung Keputusan yang dapat membantu bagian Administrasi Akademik UISI.

3. Mempercepat proses penyusunan jadwal perkuliahan.

4. Mengurangi terjadinya human error dalam proses timetabling.

5. Menghasilkan jadwal yang lebih konsisten dan berkualitas.

6. Memberikan proof-of-concept implementasi DSS untuk UCTP dengan arsitektur REST API dan web.

7. Berguna sebagai referensi pada penelitian di masa depan.
