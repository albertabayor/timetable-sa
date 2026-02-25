BAB 3
METODE PENELITIAN
Penelitian ini mengadopsi pendekatan Prototyping sebagai kerangka kerja pengembangan perangkat lunak. Metode ini memfasilitasi komunikasi yang lebih efektif antara peneliti dan pengguna melalui visualisasi sistem sementara sebelum masuk ke tahap pengkodean penuh. Alur penelitian dimulai dari identifikasi masalah yang mendalam hingga pengujian sistem akhir, agar memastikan setiap fitur yang dikembangkan relevan dengan kebutuhan di lapangan. Gambaran menyeluruh mengenai prosedur dan langkah-langkah penelitian ini disajikan dalam Diagram Alur Penelitian pada Gambar 3.1 di bawah ini.
 
Gambar 3. 1 Diagram Alur Penelitian


3.1	Identifikasi Masalah
Tahap identifikasi masalah dilakukan untuk memahami kondisi riil di lapangan serta memetakan kendala yang memerlukan solusi teknis. Langkah awal yang dilakukan adalah observasi terhadap objek penelitian guna memperoleh gambaran komprehensif mengenai alur kerja yang sedang berjalan.

Observasi dilaksanakan dengan menganalisis sistem informasi pada portal Gapura Universitas Internasional Semen Indonesia (UISI), khususnya Sistem Informasi Akademik (Siakad) dan sistem peminjaman ruangan. Melalui pengamatan ini, diperoleh data mengenai mekanisme penjadwalan yang sedang berjalan, pola penggunaan ruangan, serta ketersediaan dataset yang dapat dimanfaatkan. Hal ini memungkinkan penulis untuk mengidentifikasi kesenjangan kebutuhan serta potensi optimalisasi pada sistem yang ada.

Guna memperkuat data hasil observasi, penulis juga melakukan wawancara mendalam dengan Ibu Ayu Ningsih selaku Administrator Akademik. Wawancara ini bertujuan untuk menggali permasalahan operasional secara lebih terperinci, menentukan kebutuhan fungsional sistem, serta memahami ekspektasi pengguna terhadap sistem yang akan dikembangkan. Hasil wawancara menegaskan bahwa diperlukannya sistem penjadwalan yang lebih efisien guna mengoptimalkan alokasi ruang kelas sekaligus meminimalkan terjadinya konflik jadwal.

Berdasarkan hasil observasi dan wawancara tersebut, dapat disimpulkan bahwa pihak klien membutuhkan sebuah aplikasi sistem penjadwalan yang mampu mengelola penggunaan ruangan secara otomatis, terstruktur, dan minim konflik, sebagai solusi atas permasalahan yang selama ini dihadapi..
3.2	Analisis Kebutuhan
Setelah melalui tahapan observasi, wawancara, dan studi literatur mengenai metode optimasi serta sistem penjadwalan, langkah krusial berikutnya adalah melakukan analisis kebutuhan sistem. Tahap ini bertujuan untuk memetakan kebutuhan fungsional yang selaras dengan ekspektasi calon pengguna, yakni bagian administrasi akademik dan admin program studi.

Dalam kerangka metodologi Software Development Life Cycle (SDLC) model Prototyping, analisis kebutuhan berperan sebagai fondasi utama sebelum proses perancangan prototype awal dilakukan. Mengingat sifatnya yang iteratif, kebutuhan yang diidentifikasi pada tahap ini akan menjadi acuan dalam membangun model sistem yang kemudian akan dievaluasi dan disempurnakan berdasarkan umpan balik pengguna hingga mencapai spesifikasi akhir yang optimal.

No	Kode	Fungsionalitas	Keterangan
1	KF-01	Autentikasi Pengguna	Sistem harus menyediakan fitur login bagi pengguna (administrator akademik) untuk mengakses sistem dengan keamanan yang memadai.
2	KF-02	Dashboard Sistem	Sistem harus menampilkan dashboard yang berisi ringkasan statistik seperti jumlah dosen, mata kuliah, ruangan, dan jadwal yang telah dibuat serta visualisasi data dalam bentuk grafik.
3	KF-03	Manajemen Data Dosen	Administrator dapat mengelola data dosen meliputi penambahan, pengeditan, dan penghapusan data dosen. Data dosen mencakup kode dosen, nama, program studi, waktu preferensi mengajar, hari riset, waktu transit, maksimum jam per hari, dan ruangan preferensi.
4	KF-04	Manajemen Data Mata Kuliah	Administrator dapat mengelola data mata kuliah meliputi penambahan, pengeditan, dan penghapusan data. Data mata kuliah mencakup program studi, kelas, kode mata kuliah, nama mata kuliah, SKS, jenis (wajib/pilihan), jumlah peserta, kode dosen pengampu, tipe kelas (pagi/sore), kebutuhan laboratorium, dan ruangan preferensi.
5	KF-05	Manajemen Data Ruangan	Administrator dapat mengelola data ruangan meliputi penambahan, pengeditan, dan penghapusan data ruangan. Data ruangan mencakup kode ruangan, nama ruangan, tipe ruangan (teori/laboratorium), dan kapasitas ruangan.
6	KF-06	Import Data dari Excel	Sistem harus menyediakan fitur import data massal untuk dosen, mata kuliah, dan ruangan dari file Excel (.xlsx) untuk mempermudah pengisian data awal demgan format yang sudah ditentukan.
7	KF-07	Export Data	Sistem harus dapat mengeksport data dosen, mata kuliah, dan ruangan ke dalam format Excel untuk keperluan dokumentasi dan backup.
8	KF-08	Penyusunan Jadwal Manual	Administrator dapat menyusun jadwal perkuliahan secara manual dengan fitur drag-and-drop untuk menempatkan mata kuliah ke slot waktu tertentu dengan visualisasi grid jadwal harian.
9	KF-09	Deteksi Konflik Jadwal	Sistem harus dapat mendeteksi dan memberikan peringatan adanya konflik jadwal seperti bentrok waktu dosen, bentrok ruangan, atau kapasitas ruangan yang tidak mencukupi secara real-time.
10	KF-10	Optimisasi Jadwal Otomatis	Sistem harus dapat melakukan optimisasi jadwal secara otomatis menggunakan algoritma metaheuristik (Simulated Annealing dan Tabu Search) untuk menghasilkan jadwal yang optimal dengan mempertimbangkan hard constraints dan soft constraints.
11	KF-11	Konfigurasi Parameter Optimisasi	Administrator dapat mengkonfigurasi parameter algoritma optimisasi seperti suhu awal, cooling rate, jumlah iterasi maksimum, dan parameter Tabu Search lainnya sebelum menjalankan proses optimisasi.
12	KF-12	Monitoring Proses Optimisasi	Sistem harus menampilkan progress dan status proses optimisasi secara real-time termasuk grafik perkembangan fitness value, suhu, dan jumlah constraint violations.
13	KF-13	Riwayat Optimisasi	Sistem harus menyimpan riwayat hasil optimisasi yang telah dilakukan beserta konfigurasi parameternya untuk dapat dibandingkan atau dijalankan ulang.
14	KF-14	Monitoring Performa Sistem	Sistem harus menyediakan halaman monitoring yang menampilkan statistik penggunaan CPU, memory, dan riwayat proses optimisasi yang telah dilakukan.
15	KF-15	Konfigurasi Aplikasi	Administrator dapat melakukan konfigurasi aplikasi seperti pengaturan tema tampilan (light/dark/system) .
16	KF-16	Validasi Jadwal	Sistem harus melakukan validasi jadwal untuk memastikan tidak ada konflik sebelum jadwal disimpan atau dirubah.
17	KF-17	Preview Jadwal	Sistem harus menyediakan fitur preview jadwal pada dashboard untuk melihat gambaran umum jadwal yang telah dibuat terakhir kali/yang terpilih terakhir kali.
18	KF-1	Navigasi Sidebar	Sistem harus menyediakan navigasi sidebar yang memudahkan pengguna berpindah antar modul (Dashboard, Dosen, Mata Kuliah, Ruangan, Jadwal, Optimisasi, Monitoring, dan Pengaturan).

A. Use Case Diagram
	Use case diagram pada sistem ini menggambarkan fungsionalitas sistem yang berpusat pada satu aktor utama, yaitu Administrator. Diagram ini menunjukkan bagaimana Administrator berinteraksi dengan modul manajemen data, mesin penjadwalan, dan kontrol sistem untuk menghasilkan jadwal perkuliahan yang optimal. Berikut Gambar 3.2 terkait use case diagram pada system tersebut.
 

B. Flowchart Proses
	Untuk memberikan gambaran yang lebih jelas mengenai alur interaksi pengguna dengan sistem yang dikembangkan, berikut disajikan diagram alur (flowchart) yang menggambarkan proses utama dalam penggunaan Sistem Informasi Penjadwalan UISI. Flowchart ini memvisualisasikan langkah-langkah yang dilalui oleh pengguna dalam mengoperasikan sistem, mulai dari proses autentikasi, pengelolaan data master, hingga proses inti optimasi jadwal menggunakan algoritma Simulated Annealing.

Gambar 3.3 merupakan diagram yang menunjukkan alur aktivitas pengguna secara umum di dalam sistem. Proses dimulai dengan halaman login, di mana sistem akan melakukan autentikasi kredensial pengguna. Jika autentikasi berhasil, pengguna akan diarahkan ke halaman Dashboard yang menjadi pusat navigasi untuk mengakses berbagai fitur utama sistem.
 
	Dalam sistem ini, terdapat beberapa modul utama yang dapat diakses oleh pengguna untuk menyusun jadwal perkuliahan yang optimal:

a)	Manajemen Data Master & Import: Pengguna dapat mengelola data entitas pendidikan yang meliputi data Dosen, Mata Kuliah, dan Ruangan melalui fungsi CRUD (Create, Read, Update, Delete). Selain input manual, sistem juga menyediakan fitur Import Data Excel untuk mempercepat proses penginputan data dalam jumlah besar ke dalam basis data.
b)	Proses Penyusunan Jadwal (Optimasi): Ini merupakan fitur inti dari sistem di mana pengguna melakukan konfigurasi parameter untuk menjalankan algoritma Simulated Annealing. Setelah algoritma selesai memproses data untuk meminimalkan clash atau pelanggaran batasan (constraints), sistem akan menampilkan hasil jadwal otomatis.
c)	Intervensi Manual: Meskipun jadwal dihasilkan secara otomatis, sistem memberikan fleksibilitas bagi pengguna untuk melakukan penyesuaian melalui fitur Susun Manual dengan antarmuka drag-and-drop. Setiap perubahan manual akan disimpan kembali ke dalam sistem untuk memastikan data jadwal tetap sinkron.
d)	Monitoring dan Pengaturan: Pengguna dapat melakukan pemantauan sistem secara berkala melalui menu Monitoring serta menyesuaikan preferensi aplikasi pada menu Settings.
Seluruh aktivitas ini bersifat repetitif di mana pengguna dapat berpindah antar menu selama sesi masih aktif. Proses berakhir ketika pengguna memilih untuk melakukan Logout, yang secara aman akan mengakhiri sesi akses pada website.

3.3	Pembuatan Protototype
Proses pembuatan prototype dilakukan untuk mentransformasikan kebutuhan sistem ke dalam rancangan antarmuka pengguna  yang menggambarkan visualisasi operasional sistem. Tahapan ini bertujuan untuk menentukan arah pengembangan sistem serta memberikan gambaran jelas mengenai interaksi pengguna di setiap halaman yang tersedia, mulai dari proses autentikasi hingga fungsionalitas utama seperti pengelolaan data dan optimasi jadwal.

Rancangan ini disusun dengan memperhatikan sudut pandang pengguna guna memastikan alur input hingga output berjalan secara intuitif. Melalui pembuatan prototype ini, pengembang dapat melakukan evaluasi dini dan penyesuaian fitur agar sesuai dengan spesifikasi teknis yang dibutuhkan sebelum masuk ke tahap implementasi kode. Berikut adalah detail rancangan antarmuka sistem yang dikembangkan.
a.	Halaman Login
	Halaman login merupakan pintu masuk utama bagi pengguna untuk mengakses sistem UCTP. Halaman ini dirancang dengan tampilan yang modern dan profesional, menampilkan informasi sistem di panel kiri dan form login di panel kanan. Pada panel kiri ditampilkan statistik sistem seperti jumlah mata kuliah (150+), dosen (45), dan ruangan (28) yang tersedia. Panel kanan berisi form login dengan field email dan password, dilengkapi fitur toggle show/hide password serta checkbox untuk mengingat sesi login. Terdapat juga informasi demo credentials untuk akses percobaan sistem.
 
b.	Halaman Dashboard
	Halaman dashboard berfungsi sebagai pusat kendali utama yang ditampilkan setelah pengguna berhasil masuk ke dalam sistem. Halaman ini menyajikan ringkasan komprehensif mengenai kondisi dan statistik sistem penjadwalan dalam satu tampilan yang terintegrasi. Terdapat banner selamat datang yang menampilkan informasi semester aktif (Semester Genap 2025/2026). Bagian statistik sistem menampilkan jumlah total courses, lecturers, rooms, dan classes dalam bentuk card yang informatif. Halaman ini juga dilengkapi dengan berbagai grafik visualisasi data seperti Fitness Chart untuk melihat riwayat nilai fitness optimasi, Room Utilization Chart untuk menampilkan tingkat pemanfaatan ruangan, Weekly Distribution Chart untuk distribusi jadwal per hari, serta tabel Recent Activity yang menampilkan aktivitas terbaru dalam sistem. Schedule Preview memberikan gambaran singkat jadwal yang telah dibuat. Seluruh elemen disusun dalam layout yang responsif dengan sidebar navigasi di sisi kiri untuk memudahkan pengguna berpindah antar menu.
 

c.	Halaman View Schedule
	Halaman schedule merupakan tampilan utama untuk melihat dan mengelola jadwal kuliah dalam format tabel mingguan. Halaman ini menampilkan grid jadwal yang terorganisir berdasarkan hari (Senin-Sabtu) dan slot waktu, dengan dukungan fitur drag-and-drop untuk memindahkan jadwal secara interaktif. Terdapat badge status yang menunjukkan kondisi jadwal (Validated) dan informasi semester aktif. Bagian atas halaman dilengkapi dengan info banner yang memberikan tips penggunaan fitur drag-and-drop. Tabel jadwal dapat ditampilkan dalam mode fullscreen dengan kontrol zoom in/zoom out untuk memudahkan pengguna melihat detail jadwal. Setiap cell pada grid dapat menampung informasi mata kuliah, ruangan, dan dosen yang terjadwal. Sistem secara otomatis mendeteksi konflik jadwal ketika terjadi tumpang tindih. Tombol fullscreen memungkinkan pengguna untuk melihat jadwal dalam tampilan layar penuh yang lebih luas.
 
d.	Halaman View Schedule Simple
	Halaman schedule simple menyediakan tampilan jadwal yang lebih sederhana dan fokus pada per kelas. Halaman ini memungkinkan pengguna untuk memilih kelas tertentu dan melihat jadwal lengkap untuk kelas tersebut. Terdapat selector kelas yang menampilkan daftar semua kelas yang tersedia dalam sistem. Halaman ini mendukung dua mode tampilan: Grid View yang menampilkan jadwal dalam bentuk tabel interaktif dengan fitur drag-and-drop untuk mengedit jadwal, dan List View yang menampilkan jadwal dalam bentuk daftar yang terkelompok per hari. Setiap item jadwal menampilkan informasi lengkap seperti nama mata kuliah, program studi, waktu, ruangan, jumlah peserta, dan dosen pengajar. Mode Grid dilengkapi dengan color coding berdasarkan program studi untuk memudahkan identifikasi. Terdapat juga legenda program studi di bagian bawah yang menunjukkan pemetaan warna untuk setiap prodi. Fitur fullscreen dengan kontrol zoom tersedia untuk kenyamanan melihat jadwal dalam layar penuh.
 
e.	Halaman Manajemen Ruangan
	Halaman manajemen ruangan dirancang untuk mengelola data ruang kelas dan fasilitas yang tersedia di kampus. Halaman ini menampilkan tabel lengkap seluruh ruangan dengan informasi detail seperti kode ruangan, nama ruangan, tipe ruangan (Theory/Lab Multimedia), dan kapasitas. Setiap ruangan ditampilkan dalam card yang menampilkan ikon kapasitas dengan jumlah kursi. Terdapat fitur pencarian untuk memudahkan menemukan ruangan tertentu. Pada bagian atas halaman tersedia tombol aksi untuk Import data dari file Excel, Export data ke Excel, dan Add Room untuk menambah ruangan baru. Setiap baris tabel dilengkapi dengan tombol Edit untuk mengubah data ruangan dan Delete untuk menghapus ruangan. Halaman ini juga mendukung penghapusan bulk (multiple selection) untuk efisiensi pengelolaan data. Form tambah/edit ruangan ditampilkan dalam sheet panel samping yang berisi field kode ruangan, nama ruangan, tipe ruangan (dropdown), dan kapasitas. Dialog import Excel menyediakan template dan panduan field yang diperlukan untuk impor data massal.
 
f.	Halaman Manajemen Dosen
	Halaman manajemen dosen berfungsi sebagai pusat pengelolaan data tenaga pengajar atau faculty members. Halaman ini menampilkan daftar lengkap dosen dengan informasi yang komprehensif meliputi kode dosen, nama lengkap, program studi, hari riset (research day), dan batas maksimal jam mengajar per hari. Setiap dosen ditampilkan dengan avatar yang berisi inisial nama dan informasi jumlah mata kuliah yang diampu. Terdapat fitur pencarian untuk memfilter dosen berdasarkan nama, kode, atau program studi. Bagian atas halaman menyediakan tombol Import untuk mengimpor data dosen dari Excel, Export untuk mengekspor data, dan Add Lecturer untuk menambah dosen baru. Form pengelolaan dosen mencakup field yang detail seperti kode dosen, nama lengkap, program studi, hari riset (dropdown), waktu preferensi mengajar, waktu transit antar kelas, maksimal periode per hari, dan ruangan yang diprioritaskan. Setiap dosen dapat diedit atau dihapus melalui tombol aksi pada setiap baris tabel. Halaman ini memastikan data dosen terorganisir dengan baik untuk kebutuhan proses penjadwalan.
 
g.	Halaman Manajemen Mata Kuliah
	Halaman manajemen mata kuliah merupakan tampilan untuk mengelola seluruh data mata kuliah yang tersedia dalam sistem. Halaman ini menampilkan katalog lengkap mata kuliah dengan informasi detail seperti kode mata kuliah, nama mata kuliah, program studi, kelas, jumlah SKS, jenis (wajib/pilihan), jumlah peserta, dan dosen pengajar. Setiap mata kuliah ditampilkan dengan badge kode unik dan informasi apakah mata kuliah memerlukan laboratorium. Tabel dilengkapi dengan fitur pencarian untuk memudahkan menemukan mata kuliah tertentu. Tombol aksi tersedia untuk Import data massal, Export data, dan Add Course untuk menambah mata kuliah baru. Form pengelolaan mata kuliah sangat komprehensif mencakup field program studi, kode mata kuliah, nama kelas, nama mata kuliah, SKS, jumlah peserta, tipe kelas (pagi/sore), jenis mata kuliah, checkbox kebutuhan lab, dan section khusus untuk mengelola dosen pengajar (primary, secondary, dan external lecturers). Terdapat juga field untuk menentukan ruangan yang diprioritaskan. Setiap mata kuliah dapat diedit atau dihapus sesuai kebutuhan.
 
h.	Halaman Pengaturan
	Halaman pengaturan menyediakan antarmuka untuk mengkonfigurasi berbagai aspek aplikasi sesuai kebutuhan pengguna. Halaman ini terbagi dalam beberapa section yang terorganisir. Section Appearance memungkinkan pengguna untuk memilih tema tampilan antara Light, Dark, atau System yang mengikuti pengaturan perangkat. Section General Settings berisi konfigurasi semester aktif dan nama institusi. Section Notifications mengelola preferensi notifikasi seperti auto-save schedule, email notifications, dan optimization alerts yang dapat diaktifkan/nonaktifkan melalui toggle switch. Section Schedule Constraints memungkinkan pengaturan batasan penjadwalan seperti waktu mulai terawal, waktu selesai terakhir, izin kelas berturut-turut, dan preferensi sesi pagi. Setiap section disajikan dalam card yang jelas dengan ikon dan deskripsi yang informatif. Di bagian bawah terdapat tombol Reset to Defaults untuk mengembalikan pengaturan ke nilai awal dan Save Changes untuk menyimpan perubahan konfigurasi.
 
i.	Halaman Monitor
	Halaman monitor berfungsi untuk memantau performa sistem dan riwayat proses optimasi yang telah dilakukan. Halaman ini menampilkan grid statistik sistem real-time meliputi CPU Usage dengan progress bar, Memory usage dalam MB dengan persentase penggunaan, Uptime sistem sejak terakhir restart dengan indikator status running, dan Status kesehatan sistem (Healthy). Bagian Performance Metrics menampilkan metrik performa seperti average response time, database queries per second, active connections, dan cache hit rate dalam bentuk progress bar visual. Bagian Optimization History menampilkan riwayat lengkap proses optimasi yang telah berjalan dengan informasi tanggal/waktu, jumlah iterasi/generations, nilai fitness yang dicapai, durasi proses, dan status hasil. Setiap riwayat optimasi ditampilkan dalam card dengan color coding berdasarkan nilai fitness (hijau untuk >=85%, kuning untuk 75-85%, dan oranye untuk <75%). Halaman ini membantu pengguna dalam memantau kondisi sistem dan mengevaluasi hasil-hasil optimasi yang telah dilakukan.
 
j.	Halaman Optimasi
	Halaman optimasi merupakan pusat kendali untuk menjalankan dan mengkonfigurasi algoritma Simulated Annealing (SA) yang dikombinasikan dengan Tabu Search. Halaman ini terbagi dalam beberapa panel yang saling terintegrasi. Panel Optimization Control berisi kontrol utama untuk memulai/menghentikan proses optimasi dengan progress bar iterasi, serta menampilkan statistik real-time seperti Best Cost, Current Cost, Temperature, Hard Violations, Soft Violations, dan Tabu Hits. Panel Algorithm Parameters menyediakan konfigurasi parameter SA yang terbagi dalam beberapa collapsible section: Core SA Parameters (initial temperature, min temperature, cooling rate, max iterations, hard constraint weight), Reheating Configuration (threshold, factor, max reheats), Tabu Search Configuration (enable/disable, tabu tenure, max tabu list size, aspiration), dan Intensification Configuration. Panel Charts menampilkan visualisasi grafik proses optimasi dengan tab Cost, Temperature, Violations, dan Tabu yang diupdate secara real-time. Bagian bawah terdapat Results Table yang menampilkan riwayat hasil optimasi dengan kemampuan untuk memilih, menghapus, menjalankan ulang, dan mengekspor hasil ke format CSV atau JSON. Setiap hasil optimasi menampilkan metrik lengkap seperti final cost, improvement percentage, hard/soft violations, total iterations, dan duration.
 

3.4	Pembuatan Database
a. Tabel Users
Nama Kolom	Tipe Data	Keterangan
id	VARCHAR(36)	Primary Key
name	VARCHAR(255)	Nama lengkap user, NOT NULL
email	VARCHAR(255)	Alamat email user, NOT NULL, UNIQUE
email_verified	BOOLEAN	Status verifikasi email, NOT NULL, DEFAULT FALSE
image	TEXT	URL foto profil user
created_at	DATETIME	Waktu pembuatan record, NOT NULL, DEFAULT CURRENT_TIMESTAMP
updated_at	DATETIME	Waktu pembaruan record, NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

	Tabel user berfungsi untuk menyimpan informasi pengguna yang terdaftar dalam sistem. Atribut utamanya adalah id sebagai Primary Key yang berfungsi sebagai identitas unik setiap pengguna. Kolom name menyimpan nama lengkap user, sedangkan email digunakan untuk autentikasi dan harus bersifat unik. Kolom email_verified menandakan apakah email user sudah terverifikasi. Kolom image menyimpan URL foto profil user. Kolom created_at dan updated_at mencatat waktu pembuatan dan pembaruan data menggunakan format DATETIME MySQL dengan DEFAULT CURRENT_TIMESTAMP dan ON UPDATE CURRENT_TIMESTAMP.

b. Tabel Session
Nama Kolom	Tipe Data	Keterangan
id	VARCHAR(36)	Primary Key
expires_at	DATETIME	Waktu kedaluwarsa session, NOT NULL
token	VARCHAR(255)	Token session, NOT NULL, UNIQUE
created_at	DATETIME	Waktu pembuatan record, NOT NULL, DEFAULT CURRENT_TIMESTAMP
updated_at	DATETIME	Waktu pembaruan record, NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
ip_address	VARCHAR(255)	Alamat IP user
user_agent	TEXT	Informasi browser/user agent
user_id	VARCHAR(36)	Foreign key ke tabel user, NOT NULL

	Tabel session berfungsi untuk mengelola sesi login pengguna dalam sistem. Atribut utamanya adalah id sebagai Primary Key, token yang berisi token session unik untuk autentikasi, dan expires_at yang menentukan waktu kedaluwarsa session. Kolom user_id merupakan Foreign Key yang mereferensi ke tabel user dengan constraint ON DELETE CASCADE sehingga session akan terhapus otomatis jika user dihapus. Kolom ip_address dan user_agent menyimpan informasi teknis perangkat user untuk keamanan. Kolom created_at dan updated_at mencatat waktu pembuatan dan pembaruan session menggunakan format DATETIME MySQL dengan DEFAULT CURRENT_TIMESTAMP dan ON UPDATE CURRENT_TIMESTAMP.
c. Tabel Account
Nama Kolom	Tipe Data	Keterangan
id	VARCHAR(36)	Primary Key
account_id	VARCHAR(255)	ID akun dari provider OAuth, NOT NULL
provider_id	VARCHAR(255)	Nama provider OAuth, NOT NULL
user_id	VARCHAR(36)	Foreign key ke tabel user, NOT NULL
access_token	TEXT	Token akses OAuth
refresh_token	TEXT	Token refresh OAuth
id_token	TEXT	ID token dari OAuth
access_token_expires_at	DATETIME	Waktu kedaluwarsa access token
refresh_token_expires_at	DATETIME	Waktu kedaluwarsa refresh token
scope	TEXT	Scope/izin akses OAuth
password	VARCHAR(255)	Password terenkripsi (untuk login email/password)
created_at	DATETIME	Waktu pembuatan record, NOT NULL, DEFAULT CURRENT_TIMESTAMP
updated_at	DATETIME	Waktu pembaruan record, NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

	Tabel account berfungsi untuk menyimpan informasi akun OAuth dan kredensial login pengguna. Atribut utamanya adalah id sebagai Primary Key, user_id sebagai Foreign Key ke tabel user dengan constraint ON DELETE CASCADE, account_id dan provider_id yang mengidentifikasi akun di provider OAuth seperti Google atau GitHub. Kolom access_token, refresh_token, dan id_token menyimpan token autentikasi dari provider OAuth. Kolom access_token_expires_at dan refresh_token_expires_at mencatat waktu kedaluwarsa token. Kolom password digunakan untuk menyimpan password terenkripsi jika user menggunakan metode login email/password. Kolom created_at dan updated_at mencatat waktu pembuatan dan pembaruan akun menggunakan format DATETIME MySQL dengan DEFAULT CURRENT_TIMESTAMP dan ON UPDATE CURRENT_TIMESTAMP.


d. Tabel Verification
Nama Kolom	Tipe Data	Keterangan
id	VARCHAR(36)	Primary Key
identifier	VARCHAR(255)	Identifier email/telepon, NOT NULL
value	VARCHAR(255)	Kode OTP/token verifikasi, NOT NULL
expires_at	DATETIME	Waktu kedaluwarsa verifikasi, NOT NULL
created_at	DATETIME	Waktu pembuatan record, NOT NULL, DEFAULT CURRENT_TIMESTAMP
updated_at	DATETIME	Waktu pembaruan record, NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

	Tabel verification berfungsi untuk menyimpan data verifikasi email atau nomor telepon pengguna. Atribut utamanya adalah id sebagai Primary Key, identifier yang berisi email atau nomor telepon yang akan diverifikasi, dan value yang menyimpan kode OTP atau token verifikasi. Kolom expires_at menentukan batas waktu berlaku kode verifikasi agar tidak dapat digunakan setelah waktu tertentu. Kolom created_at dan updated_at mencatat waktu pembuatan dan pembaruan data verifikasi menggunakan format DATETIME MySQL dengan DEFAULT CURRENT_TIMESTAMP dan ON UPDATE CURRENT_TIMESTAMP. Tabel ini mendukung proses verifikasi identitas user saat registrasi atau perubahan data kontak.



e. Tabel ProgramStudi
Nama Kolom	Tipe Data	Constraint	Keterangan
id	VARCHAR(36)	PRIMARY KEY, NOT NULL	Primary Key
code	VARCHAR(10)	UNIQUE, NOT NULL	Kode program studi
name	VARCHAR(255)	NOT NULL	Nama program studi
createdAt	DATETIME	DEFAULT NOW()	Tanggal pembuatan
updatedAt	DATETIME	DEFAULT NOW()	Tanggal update

	Tabel ProgramStudi berfungsi untuk mengelola data program studi yang ada di universitas. Atribut utamanya adalah id sebagai Primary Key yang berfungsi sebagai identitas unik setiap program studi. Kolom code menyimpan kode unik program studi seperti TI untuk Teknik Informatika, SI untuk Sistem Informasi, dan harus bersifat unik. Kolom name berisi nama lengkap program studi. Kolom createdAt dan updatedAt mencatat waktu pembuatan dan pembaruan data menggunakan format DATETIME MySQL dengan DEFAULT NOW(). Tabel ini menjadi referensi utama untuk tabel-tabel lain seperti Course dan Lecturer.

f. Tabel Course
Nama Kolom	Tipe Data	Constraint	Keterangan
id	VARCHAR(36)	PRIMARY KEY, NOT NULL	UUID unique identifier
prodiId	VARCHAR(36)	FOREIGN KEY - ProgramStudi.id	Program studi pemilik MK
kelas	VARCHAR(20)	NOT NULL	Kelas (A, B, Reguler)
code	VARCHAR(20)	NOT NULL	Kode mata kuliah
name	VARCHAR(255)	NOT NULL	Nama mata kuliah
sks	INT	NOT NULL	Jumlah SKS (1-6)
jenis	ENUM('WAJIB', 'PILIHAN')	DEFAULT 'WAJIB'	Jenis mata kuliah

peserta	INT	NOT NULL	Jumlah peserta/pendaftar
classType	ENUM('PAGI', 'SORE')	DEFAULT 'PAGI'	Tipe kelas
shouldOnTheLab	BOOLEAN	DEFAULT FALSE	Apakah memerlukan lab
createdAt	DATETIME	DEFAULT NOW()	Tanggal pembuatan
updatedAt	DATETIME	DEFAULT NOW()	Tanggal update
createdBy	VARCHAR(36)	FOREIGN KEY - User.id	User yang membuat
updatedBy	VARCHAR(36)	FOREIGN KEY - User.id	User yang terakhir update

	Tabel Course berfungsi untuk mengelola data mata kuliah yang ditawarkan oleh setiap program studi. Atribut utamanya adalah id sebagai Primary Key yang berfungsi sebagai identitas unik setiap mata kuliah. Kolom prodiId merupakan Foreign Key yang mereferensi ke tabel ProgramStudi untuk mengetahui program studi pemilik mata kuliah tersebut. Kolom kelas menyimpan informasi kelas seperti A, B, atau Reguler. Kolom code berisi kode mata kuliah yang bersifat unik dalam satu program studi. Kolom name menyimpan nama lengkap mata kuliah. Kolom sks menunjukkan jumlah SKS mata kuliah (1-6). Kolom jenis menggunakan ENUM dengan nilai WAJIB atau PILIHAN untuk mengkategorikan jenis mata kuliah. Kolom peserta menyimpan jumlah mahasiswa yang mendaftar mata kuliah tersebut. Kolom classType menggunakan ENUM dengan nilai PAGI atau SORE untuk menentukan shift kelas. Kolom shouldOnTheLab bertipe BOOLEAN dengan DEFAULT FALSE untuk menandai apakah mata kuliah memerlukan ruangan laboratorium. Kolom createdBy dan updatedBy merupakan Foreign Key ke tabel User untuk melacak siapa yang membuat dan memperbarui data.
g. Tabel Lecturer
Nama Kolom	Tipe Data	Constraint	Keterangan
id	VARCHAR(36)	PRIMARY KEY, NOT NULL	UUID unique identifier
code	VARCHAR(20)	UNIQUE, NOT NULL	Kode dosen (DS001)
name	VARCHAR(255)	NOT NULL	Nama lengkap dosen
prodiId	VARCHAR(36)	FOREIGN KEY - ProgramStudi.id	Homebase prodi
transitTime	INT	DEFAULT 0	Waktu transit (menit)
maxDailyPeriods	INT	DEFAULT 8	Maksimum slot per hari
preferredRoom	VARCHAR(255)	NULL	Kode ruangan preferensi
createdAt	DATETIME	DEFAULT NOW()	Tanggal pembuatan
updatedAt	DATETIME	DEFAULT NOW()	Tanggal update
createdBy	VARCHAR(36)	FOREIGN KEY - User.id	User yang membuat
updatedBy	VARCHAR(36)	FOREIGN KEY - User.id	User yang terakhir update

	Tabel Lecturer berfungsi untuk mengelola data dosen yang mengajar di universitas. Atribut utamanya adalah id sebagai Primary Key yang berfungsi sebagai identitas unik setiap dosen. Kolom code berisi kode dosen yang bersifat unik seperti DS001, DS002, dan digunakan sebagai identifier. Kolom name menyimpan nama lengkap dosen. Kolom prodiId merupakan Foreign Key yang mereferensi ke tabel ProgramStudi untuk mengetahui homebase program studi dosen tersebut. Kolom transitTime bertipe INT dengan DEFAULT 0 untuk menyimpan waktu transit antar kampus dalam menit. Kolom maxDailyPeriods bertipe INT dengan DEFAULT 8 untuk membatasi jumlah slot waktu mengajar maksimum per hari bagi dosen tersebut. Kolom preferredRoom menyimpan kode ruangan preferensi dosen jika ada. Kolom createdBy dan updatedBy merupakan Foreign Key ke tabel User untuk melacak siapa yang membuat dan memperbarui data.
h. Tabel Room
Nama Kolom	Tipe Data	Constraint	Keterangan
id	VARCHAR(36)	PRIMARY KEY, NOT NULL	UUID unique identifier
code	VARCHAR(20)	UNIQUE, NOT NULL	Kode ruangan (R101)
name	VARCHAR(255)	NOT NULL	Nama ruangan
type	ENUM('THEORY', 'LAB_MULTIMEDIA')	DEFAULT 'THEORY'	Tipe ruangan
capacity	INT	NOT NULL	Kapasitas mahasiswa
isActive	BOOLEAN	DEFAULT TRUE	Status aktif ruangan
createdAt	DATETIME	DEFAULT NOW()	Tanggal pembuatan
updatedAt	DATETIME	DEFAULT NOW()	Tanggal update
createdBy	VARCHAR(36)	FOREIGN KEY - User.id	User yang membuat
updatedBy	VARCHAR(36)	FOREIGN KEY - User.id	User yang terakhir update

	Tabel Room berfungsi untuk mengelola data ruangan yang digunakan untuk kegiatan perkuliahan. Atribut utamanya adalah id sebagai Primary Key yang berfungsi sebagai identitas unik setiap ruangan. Kolom code berisi kode ruangan yang bersifat unik seperti R101, R102, atau LAB01. Kolom name menyimpan nama lengkap ruangan. Kolom type menggunakan ENUM dengan nilai THEORY untuk ruang teori atau LAB_MULTIMEDIA untuk laboratorium multimedia. Kolom capacity bertipe INT untuk menyimpan kapasitas maksimum mahasiswa yang dapat menempati ruangan tersebut. Kolom isActive bertipe BOOLEAN dengan DEFAULT TRUE untuk mengindikasikan status aktif atau non-aktif ruangan. Kolom createdBy dan updatedBy merupakan Foreign Key ke tabel User untuk melacak siapa yang membuat dan memperbarui data.

i. Tabel LecturerResearchDay
Nama Kolom	Tipe Data	Constraint	Keterangan
id	VARCHAR(36)	PRIMARY KEY, NOT NULL	UUID unique identifier
lecturerId	VARCHAR(36)	FOREIGN KEY - Lecturer.id	Referensi ke dosen
day	ENUM	NOT NULL	Hari riset
createdAt	DATETIME	DEFAULT NOW()	Tanggal pembuatan

	Tabel LecturerResearchDay berfungsi untuk menyimpan hari-hari riset atau hari di mana dosen tidak dapat mengajar untuk setiap dosen. Atribut utamanya adalah id sebagai Primary Key yang berfungsi sebagai identitas unik setiap record. Kolom lecturerId merupakan Foreign Key yang mereferensi ke tabel Lecturer untuk mengetahui dosen yang bersangkutan. Kolom day menggunakan ENUM untuk menyimpan nama hari seperti SENIN, SELASA, RABU, KAMIS, JUMAT, SABTU, atau MINGGU yang merupakan hari riset dosen tersebut. Kolom createdAt mencatat waktu pembuatan data menggunakan format DATETIME MySQL dengan DEFAULT NOW(). Tabel ini digunakan sebagai hard constraint dalam algoritma penjadwalan untuk memastikan dosen tidak dijadwalkan mengajar pada hari riset mereka.
j. Tabel LecturerPreferredTime
Nama Kolom	Tipe Data	Constraint	Keterangan
id	VARCHAR(36)	PRIMARY KEY, NOT NULL	UUID unique identifier
lecturerId	VARCHAR(36)	FOREIGN KEY - Lecturer.id	Referensi ke dosen
day	ENUM	NOT NULL	Hari
startTime	TIME	NOT NULL	Jam mulai preferensi
endTime	TIME	NOT NULL	Jam selesai preferensi
createdAt	DATETIME	DEFAULT NOW()	Tanggal pembuatan

	Tabel LecturerPreferredTime berfungsi untuk menyimpan preferensi waktu mengajar dosen dalam bentuk slot waktu tertentu. Atribut utamanya adalah id sebagai Primary Key yang berfungsi sebagai identitas unik setiap record. Kolom lecturerId merupakan Foreign Key yang mereferensi ke tabel Lecturer untuk mengetahui dosen yang bersangkutan. Kolom day menggunakan ENUM untuk menyimpan nama hari preferensi. Kolom startTime dan endTime bertipe TIME untuk menentukan rentang waktu preferensi mengajar. Kolom preferenceLevel menggunakan ENUM dengan nilai HIGH, MEDIUM, atau LOW untuk menentukan tingkat prioritas preferensi tersebut. Kolom createdAt mencatat waktu pembuatan data menggunakan format DATETIME MySQL dengan DEFAULT NOW(). Tabel ini digunakan sebagai soft constraint dalam algoritma penjadwalan untuk mengoptimalkan penempatan jadwal sesuai keinginan dosen.
k. Tabel CourseLecturer
Nama Kolom	Tipe Data	Constraint	Keterangan
id	VARCHAR(36)	PRIMARY KEY, NOT NULL	UUID unique identifier
courseId	VARCHAR(36)	FOREIGN KEY - Course.id	Referensi ke mata kuliah
lecturerId	VARCHAR(36)	FOREIGN KEY - Lecturer.id	Referensi ke mata dosen
lecturerType	ENUM	NOT NULL	Tipe pengajar
createdAt	DATETIME	DEFAULT NOW()	Tanggal pembuatan

	Tabel CourseLecturer berfungsi sebagai tabel junction untuk menangani relasi many-to-many antara tabel Course dan Lecturer, yang memungkinkan satu mata kuliah dapat diajar oleh beberapa dosen dan satu dosen dapat mengajar beberapa mata kuliah. Atribut utamanya adalah id sebagai Primary Key. Kolom courseId merupakan Foreign Key yang mereferensi ke tabel Course untuk mengetahui mata kuliah yang bersangkutan. Kolom lecturerId merupakan Foreign Key yang mereferensi ke tabel Lecturer untuk mengetahui dosen pengajar. Kolom lecturerType menggunakan ENUM dengan nilai PRIMARY_1, PRIMARY_2, EXTERNAL_1, atau EXTERNAL_2 untuk mengidentifikasi tipe pengajar dan urutan prioritasnya. Terdapat UNIQUE constraint pada kombinasi courseId, lecturerId, dan lecturerType untuk mencegah duplikasi data. Kolom createdAt mencatat waktu pembuatan data menggunakan format DATETIME MySQL dengan DEFAULT NOW().
l. Tabel CourseRoom
Nama Kolom	Tipe Data	Constraint	Keterangan
id	VARCHAR(36)	PRIMARY KEY, NOT NULL	UUID unique identifier
courseId	VARCHAR(36)	FOREIGN KEY - Course.id	Referensi ke mata kuliah
roomId	VARCHAR(36)	FOREIGN KEY - Room.id	Referensi ke ruangan
priority	INT	DEFAULT 1	Prioritas ruangan (1-5)
createdAt	DATETIME	DEFAULT NOW()	Tanggal pembuatan

	Tabel CourseRoom berfungsi sebagai tabel junction untuk menangani relasi many-to-many antara tabel Course dan Room, yang memungkinkan satu mata kuliah dapat menggunakan beberapa ruangan alternatif dengan tingkat prioritas berbeda. Atribut utamanya adalah id sebagai Primary Key. Kolom courseId merupakan Foreign Key yang mereferensi ke tabel Course untuk mengetahui mata kuliah yang bersangkutan. Kolom roomId merupakan Foreign Key yang mereferensi ke tabel Room untuk mengetahui ruangan yang tersedia. Kolom priority bertipe INT dengan DEFAULT 1 untuk menentukan prioritas ruangan, dimana nilai lebih rendah menunjukkan prioritas lebih tinggi (skala 1-5). Terdapat UNIQUE constraint pada kombinasi courseId dan roomId untuk mencegah duplikasi data. Kolom createdAt mencatat waktu pembuatan data menggunakan format DATETIME MySQL dengan DEFAULT NOW(). Tabel ini digunakan oleh algoritma optimasi untuk memilih ruangan terbaik berdasarkan kapasitas dan prioritas.
m. Tabel ScheduleEntry
Nama Kolom	Tipe Data	Constraint	Keterangan
id	VARCHAR(36)	PRIMARY KEY, NOT NULL	UUID unique identifier
courseId	VARCHAR(36)	FOREIGN KEY - Course.id	Referensi ke mata kuliah
lecturerId	VARCHAR(36)	FOREIGN KEY - Lecturer.id	Dosen yang mengajar
roomId	VARCHAR(36)	FOREIGN KEY - Room.id	Ruangan
day	ENUM	NOT NULL	Hari
startTime	TIME	NOT NULL	Jam mulai
endTime	TIME	NOT NULL	Jam selesai
isOptimized	BOOLEAN	DEFAULT TRUE	Dari hasil optimasi atau manual
isManualEdit	BOOLEAN	DEFAULT FALSE	Sudah diedit manual
optimizationId	VARCHAR(36)	FOREIGN KEY - OptimizationResult.id	Sumber optimasi
conflictInfo	JSON	NULL	Info konflik (jika ada)
createdAt	DATETIME	DEFAULT NOW()	Tanggal pembuatan
updatedAt	DATETIME	DEFAULT NOW()	Tanggal update
createdBy	VARCHAR(36)	FOREIGN KEY - User.id	User pembuat
updatedBy	VARCHAR(36)	FOREIGN KEY - User.id	User update

	Tabel ScheduleEntry berfungsi untuk menyimpan entry jadwal kuliah yang telah di-assign baik secara manual oleh admin maupun hasil dari proses optimasi algoritma. Atribut utamanya adalah id sebagai Primary Key. Kolom courseId merupakan Foreign Key ke tabel Course untuk mengetahui mata kuliah yang dijadwalkan. Kolom lecturerId merupakan Foreign Key ke tabel Lecturer untuk mengetahui dosen pengajar. Kolom roomId merupakan Foreign Key ke tabel Room untuk mengetahui ruangan yang digunakan. Kolom day menggunakan ENUM untuk menyimpan hari perkuliahan. Kolom startTime dan endTime bertipe TIME untuk menentukan rentang waktu perkuliahan. Kolom isOptimized bertipe BOOLEAN dengan DEFAULT TRUE untuk menandai apakah jadwal berasal dari hasil optimasi atau input manual. Kolom isManualEdit bertipe BOOLEAN dengan DEFAULT FALSE untuk menandai apakah jadwal sudah pernah diubah secara manual setelah optimasi. Kolom optimizationId merupakan Foreign Key ke tabel OptimizationResult untuk melacak sumber optimasi. Kolom conflictInfo bertipe JSON untuk menyimpan informasi konflik jika terjadi bentrok jadwal. Kolom createdBy dan updatedBy merupakan Foreign Key ke tabel User untuk melacak siapa yang membuat dan memperbarui data.

n. Tabel OptimizationResult
Nama Kolom	Tipe Data	Constraint	Keterangan
id	VARCHAR(36)	PRIMARY KEY, NOT NULL	UUID unique identifier
userId	VARCHAR(36)	FOREIGN KEY - User.id	User yang menjalankan
name	VARCHAR(36)	NOT NULL	Nama/keterangan optimasi
parameters	JSON	NOT NULL	Parameter optimasi
initialCost	DECIMAL(10,4)	NULL	Cost awal
finalCost	DECIMAL(10,4)	NULL	Cost akhir
improvement	DECIMAL(5,2)	NULL	Persentase perbaikan
hardViolations	INT	DEFAULT 0	Jumlah hard constraint violation
softViolations	INT	DEFAULT 0	Jumlah soft constraint violation
executionTime	INT	NULL	Waktu eksekusi (ms)
iterations	INT	NULL	Total iterasi
status	ENUM	NULL	Status optimasi
errorMessage	TEXT	NULL	Pesan error (jika gagal)
appliedToSchedule	BOOLEAN	DEFAULT FALSE	Sudah diterapkan ke jadwal
appliedAt	DATETIME	NULL	Waktu diterapkan
createdAt	DATETIME	DEFAULT NOW()	Tanggal pembuatan
updatedAt	DATETIME	DEFAULT NOW()	Tanggal update

	Tabel OptimizationResult berfungsi untuk menyimpan hasil dan konfigurasi proses optimasi jadwal kuliah yang dilakukan menggunakan algoritma Simulated Annealing, Tabu Search, atau Hybrid. Atribut utamanya adalah id sebagai Primary Key. Kolom userId merupakan Foreign Key ke tabel User untuk melacat siapa yang menjalankan proses optimasi. Kolom name berisi nama atau keterangan dari proses optimasi tersebut. Kolom algorithmType menggunakan ENUM dengan nilai SA (Simulated Annealing), TS (Tabu Search), atau HYBRID untuk menentukan tipe algoritma yang digunakan. Kolom parameters bertipe JSON untuk menyimpan parameter konfigurasi algoritma seperti temperature awal, cooling rate, dan tabu list size. Kolom initialCost dan finalCost bertipe DECIMAL untuk menyimpan nilai cost sebelum dan sesudah optimasi. Kolom improvement bertipe DECIMAL untuk menyimpan persentase perbaikan cost. Kolom hardViolations dan softViolations bertipe INT untuk menghitung jumlah pelanggaran hard constraint dan soft constraint. Kolom executionTime bertipe INT untuk mencatat waktu eksekusi dalam milidetik. Kolom iterations bertipe INT untuk mencatat total iterasi yang dijalankan. Kolom status menggunakan ENUM dengan nilai RUNNING, COMPLETED, FAILED, atau CANCELLED untuk mengetahui status proses optimasi. Kolom errorMessage bertipe TEXT untuk menyimpan pesan error jika optimasi gagal. Kolom appliedToSchedule bertipe BOOLEAN dengan DEFAULT FALSE untuk menandai apakah hasil optimasi sudah diterapkan ke jadwal. Kolom appliedAt bertipe DATETIME untuk mencatat waktu penerapan hasil optimasi.

o. Tabel OptimizationIteration
Nama Kolom	Tipe Data	Constraint	Keterangan
id	VARCHAR(36)	PRIMARY KEY, NOT NULL	UUID unique identifier
optimizationId	VARCHAR(36)	FOREIGN KEY - OptimizationResult.id	Referensi ke hasil
iteration	INT	NOT NULL	Nomor iterasi
cost	DECIMAL(10,4)	NULL	Cost pada iterasi ini
temperature	DECIMAL(10,4)	null	Temperature (untuk SA)
hardViolations	INT	DEFAULT 0	Hard violations
softViolations	INT	DEFAULT 0	Soft violations
tabuHits	INT	DEFAULT 0	Tabu list hits
acceptedMove	BOOLEAN	NULL	Apakah move diterima
moveType	VARCHAR(50)	NULL	Tipe move yang dilakukan
createdAt	INT	DEFAULT NOW()	Tanggal pembuatan

	Tabel OptimizationIteration berfungsi untuk menyimpan data per iterasi selama proses optimasi berlangsung, yang digunakan untuk visualisasi grafik konvergensi algoritma dan analisis performa. Atribut utamanya adalah id sebagai Primary Key. Kolom optimizationId merupakan Foreign Key ke tabel OptimizationResult untuk menghubungkan iterasi dengan proses optimasi tertentu. Kolom iteration bertipe INT untuk menyimpan nomor iterasi saat ini. Kolom cost bertipe DECIMAL untuk mencatat nilai cost pada iterasi tersebut. Kolom temperature bertipe DECIMAL untuk mencatat nilai temperature saat ini (khusus untuk algoritma Simulated Annealing). Kolom hardViolations dan softViolations bertipe INT untuk mencatat jumlah pelanggaran pada iterasi tersebut. Kolom tabuHits bertipe INT untuk mencatat berapa kali move terkena tabu list (khusus untuk algoritma Tabu Search). Kolom acceptedMove bertipe BOOLEAN untuk menandai apakah move pada iterasi tersebut diterima atau ditolak. Kolom moveType bertipe VARCHAR untuk menyimpan tipe move yang dilakukan seperti swap, move, atau insert. Terdapat UNIQUE constraint pada kombinasi optimizationId dan iteration untuk memastikan tidak ada duplikasi nomor iterasi. Tabel ini memungkinkan analisis detail terhadap perilaku algoritma dan membantu dalam tuning parameter.


3.5	Perancangan Sistem
Sistem Informasi Penjadwalan pada Kampus UISI ini dikembangkan menggunakan React 19 sebagai frontend, TanStack Start sebagai framework full-stack, serta database MySQL dengan Prisma ORM sebagai basis penyimpanan data. React 19 dipilih karena kemampuannya dalam menyediakan model pemrograman yang deklaratif dan modern, seperti concurrent rendering yang menjaga aplikasi tetap responsif, serta komponen-based architecture yang memudahkan pengembangan fitur penjadwalan yang kompleks. Dengan TanStack Start, pengembangan API dapat dilakukan secara efisien melalui server functions yang mendukung komunikasi antara frontend dan backend dengan type-safety yang ketat, sekaligus menyediakan fitur server-side rendering untuk performa loading yang optimal.
Sementara itu, untuk pengelolaan tampilan antarmuka, digunakan Tailwind CSS sebagai framework styling utility-first yang menghasilkan tampilan yang konsisten dan responsif, serta Shadcn UI yang menyediakan komponen-komponen siap pakai seperti dialog, calendar, dan table yang relevan untuk kebutuhan sistem penjadwalan. TanStack Query juga digunakan untuk manajemen data dari server secara deklaratif, mencakup caching, sinkronisasi, dan pembaruan data secara otomatis sehingga interaksi pengguna menjadi lebih responsif.
Untuk sistem basis data, MySQL dipilih karena keandalannya dalam menangani volume data yang besar serta kompatibilitasnya dengan Prisma ORM yang menyederhanakan akses dan pengelolaan database. Prisma menyediakan type-safe database client yang digenerate otomatis dari schema definition, memastikan setiap query terdokumentasi dengan baik dan menjaga integritas data penjadwalan. Selain itu, NestJS digunakan sebagai framework backend utama yang menyediakan arsitektur modular dan scalable, sementara Better Auth digunakan untuk menangani autentikasi dan otorisasi pengguna dengan mengikuti security best practices. Dengan arsitektur teknologi ini, Sistem Informasi Penjadwalan pada Kampus UISI diharapkan dapat memberikan pengalaman pengguna yang optimal, meningkatkan efisiensi dalam proses penjadwalan, serta memastikan sistem dapat berjalan dengan performa yang tinggi dan keamanan yang terjamin.
3.6	Pengujian Sistem

Pengujian sistem dilakukan dengan menggunakan Black Box Testing dan User Acceptance Test (UAT), yang bertujuan untuk mengevaluasi apakah sistem telah memenuhi ekspektasi pengguna akhir dan dapat digunakan secara efektif dalam lingkungan yang sesungguhnya.
Black Box Testing dilakukan untuk menguji fungsionalitas sistem tanpa melihat struktur internal kode program, berfokus pada input dan output untuk memastikan setiap fitur berjalan sesuai spesifikasi yang telah ditentukan. Skenario pengujian mencakup 15 fitur utama, meliputi autentikasi, manajemen dosen, manajemen mata kuliah, manajemen ruangan, optimasi jadwal, penyusunan manual, deteksi konflik, export data, riwayat optimasi, dan konfigurasi sistem. Seluruh skenario pengujian menghasilkan status Pass sesuai hasil yang diharapkan.
Dalam proses UAT, pengguna dari bagian Administrasi Akademik UISI diberikan akses penuh ke sistem untuk menguji berbagai fitur dan fungsionalitas yang telah dikembangkan. Tahapan pengujian mencakup berbagai skenario penggunaan, mulai dari autentikasi pengguna, import data master, konfigurasi parameter algoritma, proses optimasi jadwal, hingga penyesuaian manual dan export hasil jadwal. Setiap skenario diuji untuk memastikan bahwa sistem merespons dengan benar terhadap input yang diberikan dan tidak mengalami kesalahan yang dapat menghambat kinerja sistem. Jika ditemukan bug atau ketidaksesuaian dengan kebutuhan pengguna, maka dilakukan perbaikan dan iterasi ulang hingga sistem dianggap stabil dan siap digunakan.
Hasil pengujian menunjukkan bahwa sistem mampu menangani seluruh skenario yang diuji, menghasilkan jadwal yang bebas dari pelanggaran hard constraints dengan pelanggaran soft constraints yang minimal. Pengguna menyatakan bahwa sistem dapat membantu mempercepat proses penyusunan jadwal perkuliahan dan mengurangi terjadinya konflik jadwal dibandingkan metode manual yang sebelumnya digunakan.
