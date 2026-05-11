# Berkah Kajeng - Sistem Akuntansi Kayu

Aplikasi manajemen dan akuntansi terpadu untuk pangkalan kayu **Berkah Kajeng**. Dibangun untuk mempermudah pencatatan penjualan, pembelian, inventaris, pengeluaran, dan laporan keuangan secara digital.

## Fitur Utama

- 📦 **Inventaris** – Manajemen stok kayu gelondongan secara real-time
- 🛒 **Penjualan & Pembelian** – Pencatatan transaksi dan kalkulasi kubikasi otomatis
- 💰 **Pengeluaran** – Pencatatan biaya operasional harian
- 📊 **Laporan** – Ringkasan keuangan dan grafik performa bisnis
- 👥 **Pelanggan & Supplier** – Database mitra bisnis
- 🔐 **Login Aman** – Autentikasi berbasis JWT

## Cara Menjalankan Lokal

**Prasyarat:** Node.js v18+, MySQL

1. Install dependensi:
   ```bash
   npm install
   ```
2. Salin file `.env.example` menjadi `.env` dan isi konfigurasi database:
   ```bash
   cp .env.example .env
   ```
3. Import database:
   ```bash
   mysql -u root -p berkah_kajeng < database.sql
   ```
4. Jalankan aplikasi:
   ```bash
   npm run dev
   ```

## Teknologi

- **Frontend:** React + TypeScript + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** MySQL

---

© 2026 Berkah Kajeng. Hak cipta dilindungi.
