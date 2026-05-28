# 📋 Dokumentasi Activity Diagram — Berkah Kajeng

### Diagram Aktivitas Sistem Manajemen Akuntansi Kayu

> **Versi**: 1.0.0
> **Ditulis**: 28 Mei 2026
> **Referensi**: Dokumentasi Aplikasi Berkah Kajeng v1.0.0

---

## 1. Gambaran Umum

Dokumen ini menyajikan **activity diagram** untuk setiap proses utama yang terdapat dalam sistem **Berkah Kajeng**. Activity diagram menggambarkan alur kerja dari sisi pengguna (aktor) beserta respons yang diberikan oleh sistem pada setiap langkah. Terdapat **9 proses utama** yang didokumentasikan, mencakup seluruh siklus operasional mulai dari **login**, **pembelian kayu**, **pengelolaan inventaris**, **penjualan**, **pencatatan pengeluaran**, **laporan keuangan**, **manajemen akun mandor**, **audit log**, hingga **edit profil pengguna**.

**Daftar Activity Diagram**

| # | Nama Proses | Aktor | Keterangan |
|:---:|---|---|---|
| 1 | Login | Owner / Mandor | Proses autentikasi pengguna ke dalam sistem |
| 2 | Manajemen Pembelian Kayu | Owner / Mandor | Pencatatan pembelian kayu dari supplier |
| 3 | Input Data Inventaris | Owner / Mandor | Pemantauan stok dan penambahan jenis kayu |
| 4 | Manajemen Penjualan | Owner / Mandor | Pencatatan penjualan kayu ke pelanggan |
| 5 | Manajemen Pengeluaran Operasional | Owner | Pencatatan biaya operasional harian |
| 6 | Laporan Keuangan | Owner | Rekapitulasi laba/rugi dan performa bisnis |
| 7 | Manajemen Akun Mandor | Owner | Registrasi dan pengelolaan akun mandor |
| 8 | Audit Log | Owner | Penelusuran jejak aktivitas pengguna |
| 9 | Edit Profil Pengguna | Owner / Mandor | Pembaruan data diri dan kata sandi |

---

## 2. Activity Diagram: Login

**Aktor**: Owner / Mandor

Proses login merupakan langkah pertama yang harus dilakukan oleh setiap pengguna sebelum dapat mengakses fitur-fitur dalam sistem Berkah Kajeng. Pengguna membuka aplikasi, lalu memasukkan **username** dan **password** pada halaman login. Sistem akan memverifikasi kredensial tersebut dengan data yang tersimpan di database. Apabila kredensial **tidak valid**, sistem menampilkan pesan kesalahan dan pengguna diminta mengulangi proses input. Apabila kredensial **valid**, sistem menerbitkan token autentikasi, mencatat aktivitas login, kemudian mengarahkan pengguna ke halaman dashboard sesuai dengan perannya — **Dashboard Owner** untuk pemilik usaha dengan akses penuh, atau **Dashboard Mandor** untuk staf operasional dengan akses terbatas.

**Tabel Alur Aktivitas**

| No | Aktivitas Aktor | Respons Sistem |
|:---:|---|---|
| 1 | Membuka aplikasi Berkah Kajeng | Menampilkan halaman login |
| 2 | Memasukkan username dan password | Menerima input kredensial pengguna |
| 3 | Menekan tombol "Masuk" | Memvalidasi kredensial dengan data di database |
| 4 | *(Jika gagal)* Memperbaiki input | Menampilkan pesan kesalahan "Username atau password salah" |
| 5 | — | *(Jika berhasil)* Menerbitkan token autentikasi |
| 6 | — | Mencatat aktivitas login ke dalam log sistem |
| 7 | — | Memeriksa peran pengguna (Owner atau Mandor) |
| 8 | Masuk ke halaman Dashboard | Mengarahkan pengguna ke dashboard sesuai perannya |

Sistem membatasi percobaan login sebanyak **10 kali dalam 15 menit** per alamat IP untuk menjaga keamanan.

---

## 3. Activity Diagram: Manajemen Pembelian Kayu

**Aktor**: Owner / Mandor

Proses pembelian kayu digunakan untuk mencatat setiap transaksi pembelian kayu gelondongan dari supplier. Setiap pembelian disebut sebagai **"Set"**, yang dapat berisi satu atau lebih **Kategori Kayu**. Masing-masing kategori memiliki beberapa **batang kayu individual** dengan diameter dan volume masing-masing.

Pengguna membuka modul Pembelian, lalu menekan tombol **"Tambah"** untuk memulai pencatatan set baru. Sistem menampilkan formulir yang harus diisi dengan **nama supplier** dan **tanggal pembelian**. Selanjutnya pengguna menambahkan kategori kayu dengan mengisi **jenis kayu**, **panjang**, **kondisi**, dan **harga per meter kubik**. Untuk setiap kategori, pengguna memasukkan **diameter per batang kayu**, dan sistem akan secara otomatis menghitung volume berdasarkan rumus yang telah ditentukan. Setelah seluruh data terisi lengkap, pengguna menekan **"Simpan Pembelian"**. Sistem menyimpan data ke database, memperbarui stok di inventaris, serta mencatat transaksi ke dalam log aktivitas.

**Tabel Alur Aktivitas**

| No | Aktivitas Aktor | Respons Sistem |
|:---:|---|---|
| 1 | Membuka modul Pembelian dan menekan "Tambah" | Menyajikan formulir set pembelian baru |
| 2 | Mengisi nama supplier dan tanggal pembelian | Menerima data header set pembelian |
| 3 | Menambahkan kategori kayu (jenis, panjang, kondisi, harga/m³) | Menyiapkan kategori dalam set pembelian |
| 4 | Memasukkan diameter per batang kayu | Menghitung volume secara otomatis |
| 5 | Meninjau total volume dan total biaya | Menampilkan kalkulasi secara real-time |
| 6 | Menekan "Simpan Pembelian" | Menyimpan seluruh data set ke database |
| 7 | — | Menambahkan stok ke inventaris secara otomatis |
| 8 | — | Mencatat transaksi pembelian ke log aktivitas |
| 9 | Melihat set baru di daftar riwayat | Memperbarui tabel riwayat pembelian |

**Aturan Bisnis**

Terdapat beberapa ketentuan khusus dalam proses pembelian kayu:

- Kayu dengan kondisi **"X"** memiliki volume yang dihitung sebagai nol, baik di inventaris maupun di laporan.
- Batang kayu dengan diameter **kurang dari 10 cm** memiliki volume nol dan dikenakan harga tetap sebesar **Rp 1.000 per batang**.
- Total harga pembelian selalu **dibulatkan ke Rp 1.000 terdekat**.

---

## 4. Activity Diagram: Input Data Inventaris

**Aktor**: Owner / Mandor

Modul inventaris berfungsi untuk memantau ketersediaan stok kayu secara keseluruhan serta mengelola master data jenis kayu. Ketika pengguna membuka menu **Inventaris**, sistem mengambil seluruh data stok dari database dan menyajikannya dalam bentuk **tabel stok** serta **grafik komposisi kayu**.

Pengguna dapat melakukan dua hal utama pada halaman ini. **Pertama**, menambahkan jenis kayu baru ke dalam master data dengan mengisi nama jenis kayu pada form yang disediakan, lalu menyimpannya. **Kedua**, menggunakan fitur **filter** berdasarkan jenis kayu, kelompok diameter, dan panjang untuk menyaring tampilan data stok secara langsung.

Data inventaris yang ditampilkan meliputi **jenis kayu**, **kelompok diameter** (10–14, 15–19, 20–24, 25–29, 30+), **panjang**, **kondisi**, **jumlah batang**, **total volume**, **harga rata-rata per m³**, serta **total nilai dalam Rupiah**.

**Tabel Alur Aktivitas**

| No | Aktivitas Aktor | Respons Sistem |
|:---:|---|---|
| 1 | Memilih menu Inventaris dari sidebar | Mengambil data stok kayu dari database |
| 2 | — | Menampilkan tabel stok beserta grafik komposisi |
| 3 | *(Opsional)* Mengisi form jenis kayu baru | Menampilkan modal input jenis kayu |
| 4 | Menekan "Simpan Jenis Kayu" | Menyimpan master jenis kayu baru ke database |
| 5 | Menggunakan filter (jenis, diameter, panjang) | Memproses filter data stok secara langsung |
| 6 | Memantau grafik distribusi volume kayu | Menyajikan visualisasi distribusi stok |

Stok inventaris diperbarui **secara otomatis** setiap kali terjadi transaksi pembelian (stok bertambah) maupun penjualan (stok berkurang). Hanya item dengan jumlah batang lebih dari nol yang ditampilkan di halaman ini.

---

## 5. Activity Diagram: Manajemen Penjualan

**Aktor**: Owner / Mandor

Modul penjualan digunakan untuk mencatat setiap transaksi penjualan kayu kepada pelanggan, lengkap dengan kalkulasi laba otomatis. Pengguna membuka modul Penjualan, lalu menekan tombol **"Catat"** untuk memulai pencatatan baru. Sistem menampilkan formulir yang harus diisi dengan **nama pelanggan** dan **tanggal penjualan**.

Selanjutnya, pengguna memilih **item kayu dari stok inventaris** yang tersedia. Sistem secara otomatis menampilkan **harga modal** berdasarkan harga rata-rata di inventaris. Pengguna memasukkan **harga jual per meter kubik** dan **volume** yang akan dijual. Sistem menghitung **pendapatan**, **biaya modal**, dan **keuntungan** secara real-time.

Sebelum transaksi disimpan, sistem memeriksa kecukupan stok. Jika stok **tidak mencukupi**, sistem menampilkan pesan kesalahan dan pengguna diminta mengubah volume. Jika stok **mencukupi**, transaksi disimpan ke database, stok inventaris dikurangi secara otomatis, dan aktivitas dicatat ke dalam log sistem.

**Tabel Alur Aktivitas**

| No | Aktivitas Aktor | Respons Sistem |
|:---:|---|---|
| 1 | Membuka modul Penjualan dan menekan "Catat" | Menyajikan formulir penjualan baru |
| 2 | Memilih pelanggan dan tanggal penjualan | Menerima data header penjualan |
| 3 | Memilih item kayu dari stok inventaris | Menampilkan harga modal secara otomatis |
| 4 | Memasukkan harga jual per m³ dan volume | Menghitung pendapatan, biaya modal, dan keuntungan |
| 5 | — | Memeriksa kecukupan stok di inventaris |
| 6 | *(Jika stok kurang)* Mengubah volume | Menampilkan pesan "Stok tidak mencukupi" |
| 7 | Menekan "Simpan Penjualan" | Menyimpan transaksi dan mengurangi stok inventaris |
| 8 | — | Mencatat transaksi penjualan ke log aktivitas |
| 9 | Melihat riwayat penjualan yang telah diperbarui | Memperbarui tabel riwayat penjualan |

**Ketentuan Khusus**

- Kayu dengan kondisi **"X"** atau diameter di bawah 10 cm dijual menggunakan satuan **per batang**, bukan per meter kubik.
- Apabila stok mendekati nol setelah penjualan, sistem secara otomatis mengosongkan sisa stok.
- Apabila transaksi penjualan dihapus, stok akan **dikembalikan** ke inventaris secara otomatis.

---

## 6. Activity Diagram: Manajemen Pengeluaran Operasional

**Aktor**: Owner *(hanya dapat diakses oleh Owner)*

Modul pengeluaran operasional digunakan untuk mencatat seluruh biaya operasional harian yang dikeluarkan dalam menjalankan usaha pangkalan kayu. Hanya pengguna dengan peran **Owner** yang dapat mengakses modul ini.

Ketika Owner membuka modul Pengeluaran, sistem terlebih dahulu memverifikasi hak akses pengguna. Setelah terverifikasi, sistem menampilkan **daftar pengeluaran** yang telah tercatat beserta **grafik statistik bulanan**. Owner menekan tombol **"Tambah Pengeluaran"** untuk membuka formulir input yang berisi **kategori** (Transportasi, Gaji, Perawatan, dan lain-lain), **deskripsi**, **nominal**, serta **tanggal** pengeluaran. Setelah mengisi seluruh data, Owner menekan **"Simpan"**. Sistem memvalidasi bahwa nominal harus berupa angka positif, menyimpan data ke database, mencatat aktivitas ke log, dan memperbarui tampilan halaman.

**Tabel Alur Aktivitas**

| No | Aktivitas Aktor | Respons Sistem |
|:---:|---|---|
| 1 | Membuka modul Pengeluaran | Memverifikasi hak akses peran Owner |
| 2 | — | Menampilkan tabel pengeluaran dan grafik bulanan |
| 3 | Menekan "Tambah Pengeluaran" | Menampilkan formulir input pengeluaran |
| 4 | Mengisi kategori, deskripsi, nominal, dan tanggal | Menerima isian formulir |
| 5 | Menekan "Simpan" | Memvalidasi bahwa nominal berupa angka positif |
| 6 | — | Menyimpan catatan pengeluaran ke database |
| 7 | — | Mencatat aktivitas pengeluaran ke log sistem |
| 8 | Melihat data pengeluaran yang telah diperbarui | Memperbarui tabel dan grafik statistik |

Selain menambah pengeluaran baru, Owner juga dapat **mengedit** maupun **menghapus** catatan pengeluaran yang sudah ada.

---

## 7. Activity Diagram: Laporan Keuangan

**Aktor**: Owner *(hanya dapat diakses oleh Owner)*

Modul laporan keuangan menyajikan **rekapitulasi performa keuangan** bisnis secara menyeluruh. Hanya pengguna dengan peran **Owner** yang dapat mengakses modul ini.

Ketika Owner mengakses menu Laporan, sistem memverifikasi hak akses terlebih dahulu. Setelah terverifikasi, sistem menampilkan halaman laporan keuangan. Owner memilih **filter periode** yang diinginkan — dapat berupa harian, mingguan, bulanan, atau tahunan — lalu menerapkan filter tersebut. Sistem akan menarik data dari seluruh tabel transaksi dan melakukan kalkulasi terhadap beberapa metrik keuangan utama. Hasil kalkulasi ditampilkan dalam bentuk **grafik tren** dan **tabel ringkasan keuangan**. Owner juga dapat mencetak atau mengunduh laporan tersebut.

**Metrik Keuangan yang Ditampilkan**

| Metrik | Keterangan |
|--------|------------|
| Pendapatan Kotor | Akumulasi total penjualan |
| Harga Pokok Penjualan (HPP) | Harga modal dari biaya pembelian kayu |
| Total Pengeluaran | Akumulasi seluruh biaya operasional |
| Laba Bersih | Pendapatan Kotor − HPP − Pengeluaran |
| Rata-rata Harga Beli/m³ | Harga rata-rata pembelian kayu per meter kubik |
| Rata-rata Harga Jual/m³ | Harga rata-rata penjualan kayu per meter kubik |

**Tabel Alur Aktivitas**

| No | Aktivitas Aktor | Respons Sistem |
|:---:|---|---|
| 1 | Mengakses menu Laporan | Memverifikasi hak akses peran Owner |
| 2 | Memilih filter periode (harian/mingguan/bulanan/tahunan) | Menarik data dari seluruh tabel transaksi |
| 3 | Menerapkan filter periode | Menghitung pendapatan, HPP, dan laba bersih |
| 4 | — | Menampilkan grafik tren dan tabel ringkasan keuangan |
| 5 | Menganalisis grafik performa bisnis | Menyajikan rincian data akuntansi secara terstruktur |
| 6 | Menekan "Cetak Laporan" | Memproses ekspor berkas laporan |

---

## 8. Activity Diagram: Manajemen Akun Mandor

**Aktor**: Owner *(hanya dapat diakses oleh Owner)*

Modul manajemen akun mandor memungkinkan Owner untuk mendaftarkan dan mengelola akun staf operasional (Mandor) yang akan menggunakan sistem. Hanya pengguna dengan peran **Owner** yang dapat mengakses modul ini.

Ketika Owner membuka modul Akun Mandor, sistem menampilkan **daftar seluruh akun mandor** yang telah terdaftar. Owner menekan tombol **"Tambah Mandor Baru"** untuk membuka formulir registrasi. Formulir ini memuat **username** (wajib unik), **nama lengkap**, **email** (wajib unik), dan **password awal**. Setelah mengisi seluruh data, sistem memeriksa apakah username dan email belum pernah digunakan. Jika **terdapat duplikat**, sistem menampilkan pesan kesalahan dan Owner diminta mengubah input. Jika **data unik**, sistem mengenkripsi password, menyimpan akun baru dengan peran Mandor, mencatat pembuatan akun ke dalam log aktivitas, dan memperbarui daftar mandor di halaman.

**Persyaratan Password**

Password yang digunakan harus memenuhi kriteria keamanan berikut: **minimal 8 karakter**, mengandung **minimal 1 huruf besar**, **minimal 1 huruf kecil**, **minimal 1 angka**, dan **minimal 1 karakter spesial**.

**Tabel Alur Aktivitas**

| No | Aktivitas Aktor | Respons Sistem |
|:---:|---|---|
| 1 | Membuka modul Akun Mandor | Menampilkan daftar semua akun mandor |
| 2 | Menekan "Tambah Mandor Baru" | Menampilkan formulir registrasi |
| 3 | Mengisi username, nama lengkap, email, dan password | Menerima data kredensial baru |
| 4 | — | Memeriksa keunikan username dan email di database |
| 5 | *(Jika duplikat)* Mengubah input | Menampilkan pesan "Username/Email sudah digunakan" |
| 6 | Menekan "Daftarkan Mandor" | Mengenkripsi password dan menyimpan akun baru |
| 7 | — | Menyimpan akun dengan peran Mandor ke database |
| 8 | — | Mencatat pembuatan akun ke log aktivitas |
| 9 | Melihat daftar mandor yang telah diperbarui | Memperbarui tabel daftar mandor |

Selain mendaftarkan akun baru, Owner juga dapat **mengedit data mandor**, **mereset password**, maupun **menghapus akun mandor** yang sudah ada.

---

## 9. Activity Diagram: Audit Log

**Aktor**: Owner *(hanya dapat diakses oleh Owner)*

Modul audit log berfungsi sebagai catatan jejak aktivitas seluruh pengguna dalam sistem. Fitur ini membantu Owner dalam memantau dan menelusuri setiap tindakan yang dilakukan oleh pengguna. Hanya pengguna dengan peran **Owner** yang dapat mengakses modul ini.

Ketika Owner membuka modul Audit Log, sistem mengambil **100 catatan aktivitas terbaru** dari database dan menampilkannya dalam bentuk tabel. Tabel memuat informasi berupa **nama pengguna**, **jenis aksi**, **detail aktivitas**, dan **waktu kejadian**. Owner dapat melakukan pencarian dengan mengetikkan kata kunci pada kolom pencarian. Sistem akan menyaring data secara langsung dan menampilkan hasil yang sesuai.

**Jenis Aktivitas yang Dicatat**

| Jenis Aksi | Keterangan |
|------------|------------|
| LOGIN | Pengguna berhasil masuk ke sistem |
| LOGOUT | Pengguna keluar dari sistem |
| LOGIN_FAILED | Percobaan masuk yang gagal |
| PURCHASE | Pencatatan set pembelian kayu baru |
| DELETE_PURCHASE | Penghapusan set pembelian kayu |
| SALE | Pencatatan transaksi penjualan baru |
| DELETE_SALE | Penghapusan transaksi penjualan |
| EXPENSE | Pencatatan pengeluaran operasional baru |
| EDIT_EXPENSE | Perubahan data pengeluaran operasional |
| DELETE_EXPENSE | Penghapusan catatan pengeluaran |
| USER_CREATED | Pembuatan akun mandor baru |
| USER_UPDATED | Perubahan data akun mandor |
| USER_DELETED | Penghapusan akun mandor |
| PROFILE_UPDATED | Perubahan data profil pengguna |

**Tabel Alur Aktivitas**

| No | Aktivitas Aktor | Respons Sistem |
|:---:|---|---|
| 1 | Membuka modul Audit Log | Mengambil 100 catatan aktivitas terbaru dari database |
| 2 | — | Menampilkan tabel log: nama pengguna, aksi, detail, waktu |
| 3 | Mengetikkan kata kunci pada kolom pencarian | Menyaring data log secara langsung |
| 4 | — | Menampilkan hasil pencarian yang sesuai |
| 5 | Mengamati catatan log dan menyelesaikan audit | — |

Data audit log bersifat **hanya-baca** dan tidak dapat diubah maupun dihapus oleh siapapun. Sistem menampilkan maksimal **100 catatan terbaru**.

---

## 10. Activity Diagram: Edit Profil Pengguna

**Aktor**: Owner / Mandor

Modul edit profil memungkinkan setiap pengguna untuk memperbarui data diri dan mengganti kata sandi akun mereka. Modul ini dapat diakses oleh seluruh pengguna, baik **Owner** maupun **Mandor**.

Ketika pengguna membuka menu **"Profil Saya"**, sistem menampilkan data profil yang sedang aktif, meliputi **nama lengkap**, **username**, dan **email**. Pengguna dapat mengubah data-data tersebut sesuai kebutuhan. Secara opsional, pengguna juga dapat mengganti password dengan mengisi **password saat ini** dan **password baru**.

Setelah selesai, pengguna menekan tombol **"Simpan Perubahan"**. Sistem memvalidasi password lama yang dimasukkan. Jika pengguna mengisi password baru, sistem juga memvalidasi kekuatan password baru tersebut (minimal 8 karakter, mengandung huruf, angka, dan simbol). Apabila validasi **gagal**, sistem menampilkan pesan kesalahan yang spesifik. Apabila validasi **berhasil**, sistem menyimpan perubahan ke database, memperbarui sesi autentikasi, mencatat perubahan profil ke dalam log aktivitas, dan menampilkan notifikasi **"Profil berhasil diperbarui!"**.

**Tabel Alur Aktivitas**

| No | Aktivitas Aktor | Respons Sistem |
|:---:|---|---|
| 1 | Membuka menu "Profil Saya" | Menampilkan data profil pengguna yang aktif |
| 2 | Mengubah nama lengkap, username, atau email | Menerima perubahan data |
| 3 | *(Opsional)* Mengisi password saat ini dan password baru | Menunggu konfirmasi perubahan |
| 4 | Menekan "Simpan Perubahan" | Memvalidasi password lama yang dimasukkan |
| 5 | — | Memvalidasi kekuatan password baru |
| 6 | *(Jika gagal validasi)* Memperbaiki input | Menampilkan pesan kesalahan yang spesifik |
| 7 | — | Menyimpan perubahan profil ke database |
| 8 | — | Memperbarui sesi autentikasi pengguna |
| 9 | — | Mencatat perubahan profil ke log aktivitas |
| 10 | Melihat notifikasi "Profil berhasil diperbarui!" | Menampilkan notifikasi keberhasilan |

---

> Dokumentasi activity diagram ini disusun berdasarkan analisis sistem aplikasi Berkah Kajeng pada tanggal 28 Mei 2026. Seluruh alur aktivitas telah disesuaikan dengan implementasi aktual pada sistem.
