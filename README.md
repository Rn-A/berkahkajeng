# Sistem Akuntansi Kayu - Berkah Kajeng

Berkah Kajeng adalah aplikasi sistem informasi akuntansi dan manajemen inventaris yang dikembangkan khusus untuk bisnis pengelolaan kayu. Aplikasi ini dirancang untuk mempermudah pencatatan penjualan, pembelian, inventaris, pengeluaran, dan pelaporan keuangan bisnis secara digital.

## 🌟 Fitur Utama

- 📊 **Dashboard Terpusat**: Menampilkan ringkasan performa bisnis, grafik penjualan bulan berjalan, aktivitas terbaru, dan peringatan stok menipis.
- 🛒 **Manajemen Pembelian (Purchase)**: Modul untuk mencatat pemasokan kayu dari pihak supplier, mengkalkulasi total volume (m³) dan harga beli secara otomatis.
- 📦 **Manajemen Penjualan (Sales)**: Pencatatan faktur dan transaksi penjualan kayu ke pelanggan yang otomatis terintegrasi untuk mengurangi stok gudang.
- 🪵 **Inventaris (Stok Gudang)**: Pemantauan ketersediaan kayu berdasarkan parameter spesifik: jenis kayu, ukuran panjang, kondisi fisik, dan rentang diameter.
- 💰 **Pengeluaran (Expenses)**: Pencatatan biaya operasional harian yang akan dihitung sebagai beban saat pelaporan.
- 📈 **Laporan Keuangan (Reports)**: Generator laporan yang bisa difilter berdasarkan periode (harian, mingguan, bulanan, tahunan). Menyajikan perhitungan Pendapatan Kotor, Harga Pokok Penjualan (HPP), Total Operasional, Margin Keuntungan, serta ringkasan rata-rata harga beli/jual kayu per meter kubik.
- 👥 **Mitra Bisnis**: Database khusus untuk menyimpan kontak dan riwayat *Supplier* (pemasok) dan *Customer* (pelanggan).
- 🔐 **Manajemen Pengguna & Keamanan**:
  - Dukungan Multi-Role: **Owner** (akses penuh) & **Mandor** (hanya akses pencatatan barang).
  - Autentikasi sesi yang aman menggunakan **JSON Web Tokens (JWT)** dan kata sandi yang di-*hash* via **Bcrypt**.
  - Fitur **Audit Log** untuk melacak setiap jejak aktivitas pengguna demi akuntabilitas data.

## 🛠️ Teknologi Utama

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Recharts (untuk visualisasi data), Lucide React (Ikon), Framer Motion (animasi UI).
- **Backend**: Node.js, Express, MySQL2, Helmet, Express Rate Limit.

## ⚙️ Persyaratan Sistem Lokal

Pastikan Anda memiliki piranti lunak berikut:
- **Node.js** (v18+)
- **NPM** (Node Package Manager)
- **MySQL Database Server**

## 🚀 Panduan Instalasi & Eksekusi

### 1. Persiapan Proyek
Masuk ke direktori proyek dan jalankan perintah pemasangan dependensi:
```bash
npm install
```

### 2. Konfigurasi Lingkungan
Buat berkas `.env` dari *template* yang telah disediakan:
```bash
cp .env.example .env
```
Lalu, isi variabel konfigurasi yang relevan seperti detail koneksi database dan *JWT secret key*.

### 3. Memulai Database (Opsional)
Aplikasi ini memiliki fitur *auto-init* database yang akan mendeteksi dan membuat tabel yang diperlukan jika database tujuan kosong. Pastikan hanya kredensial `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, dan `DB_NAME` sudah terisi dengan benar di file `.env`.

### 4. Eksekusi Server Pengembangan (Development)
Untuk menjalankan frontend maupun backend server secara serentak (menggunakan *tsx* dan *vite*):
```bash
npm run dev
```
Secara otomatis:
- Backend berjalan pada `http://localhost:4000`
- Aplikasi Web (*Frontend*) berjalan pada `http://localhost:3000`

### 5. Kompilasi & Produksi
Apabila sistem hendak diunggah ke server operasional publik (*Production*):
```bash
# Melakukan kompilasi untuk frontend React
npm run build:client

# Melakukan kompilasi untuk backend TypeScript
npm run build:server

# Menjalankan server hasil kompilasi
npm start
```

## 📄 Ringkasan Arsitektur Direktori

```text
Berkah_Kajeng/
├── public/                 # Berkas publik & aset web statis (logo, gambar)
├── src/                    # Kode inti aplikasi antarmuka (Frontend)
│   ├── components/         # Halaman View (Dashboard, SalesView, ReportsView, dll)
│   ├── lib/                # Fungsi utilitas modular (perhitungan uang/kubikasi)
│   ├── App.tsx             # Titik masuk rute navigasi dan konfigurasi UI utama
│   └── main.tsx            # Pemasangan (mount) library React
├── server.ts               # Titik mula server Node.js dan definisi rute-rute API backend
├── package.json            # Daftar daftar pustaka pihak ketiga dan skrip runner
└── README.md               # Dokumentasi sistem ini
```

---
© 2026 Berkah Kajeng. Hak cipta dilindungi undang-undang.
