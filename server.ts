import express from "express";
import type { Request, Response, NextFunction } from "express";
// import { createServer as createViteServer } from "vite"; // Removed static import for Vercel compatibility
import mysql from "mysql2/promise";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from 'express-rate-limit';
import nodemailer from "nodemailer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

dotenv.config();

export const app = express();
const PORT = 3000;
const SERVER_ID = Math.random().toString(36).substring(7);
const JWT_SECRET = process.env.JWT_SECRET || "berkah-kajeng-strong-secret-placeholder-2024-change-me";
const PAGINATION_LIMIT = 50; // Default limit for pagination

/**
 * Custom Rounding: Round to 1000. 
 * Rule: <= 500 rounds DOWN, > 500 rounds UP.
 */
const roundPrice = (price: number): number => {
  const remainder = price % 1000;
  if (remainder <= 500) {
    return Math.floor(price / 1000) * 1000;
  } else {
    return Math.ceil(price / 1000) * 1000;
  }
};

// Konfigurasi CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.set('trust proxy', 1); // Trust Vercel proxy
app.use(express.json());

app.use(express.json());



// MySQL connection pool
let pool: mysql.Pool | null = null;
let dbConnected = false;



// Helper to initialize database schema
export async function initDB() {
  try {
    // 1. Create a temporary connection without database to ensure DB exists
    const setupConn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || "3306"),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      ssl: process.env.DB_HOST?.includes('tidbcloud.com') ? {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: false
      } : undefined
    });
    await setupConn.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'berkah_kajeng'}\``);
    await setupConn.end();

    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || "3306"),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'berkah_kajeng',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 10000,
      ssl: process.env.DB_HOST?.includes('tidbcloud.com') ? {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: false
      } : undefined
    });

    // Test connection
    const connection = await pool.getConnection();

    await connection.query(`CREATE TABLE IF NOT EXISTS wood_sets (id VARCHAR(36) PRIMARY KEY, supplierName VARCHAR(255), date DATE, total_volume FLOAT DEFAULT 0, total_value DECIMAL(15, 2) DEFAULT 0, synced BOOLEAN DEFAULT FALSE, INDEX(date))`);
    await connection.query(`CREATE TABLE IF NOT EXISTS wood_categories (id VARCHAR(36) PRIMARY KEY, set_id VARCHAR(36), woodType VARCHAR(100), length FLOAT, condition_val VARCHAR(50), pricePerM3 DECIMAL(15, 2), FOREIGN KEY (set_id) REFERENCES wood_sets(id) ON DELETE CASCADE)`);
    await connection.query(`CREATE TABLE IF NOT EXISTS log_entries (id VARCHAR(36) PRIMARY KEY, category_id VARCHAR(36), diameter INT, volume FLOAT, FOREIGN KEY (category_id) REFERENCES wood_categories(id) ON DELETE CASCADE)`);
    await connection.query(`CREATE TABLE IF NOT EXISTS inventory (id INT AUTO_INCREMENT PRIMARY KEY, wood_type VARCHAR(100), diameter_group VARCHAR(50), length FLOAT, condition_val VARCHAR(50) DEFAULT 'Umum', total_logs INT DEFAULT 0, total_volume FLOAT DEFAULT 0, avg_price DECIMAL(15, 2) DEFAULT 0, total_value DECIMAL(15, 2) DEFAULT 0, UNIQUE KEY inventory_unique_group (wood_type, diameter_group, length, condition_val), INDEX(wood_type))`);
    
    try {
      await connection.query(`ALTER TABLE inventory ADD UNIQUE KEY inventory_unique_group (wood_type, diameter_group, length, condition_val)`);
    } catch (e) { /* ignore */ }

    await connection.query(`CREATE TABLE IF NOT EXISTS sales (id VARCHAR(36) PRIMARY KEY, customer_name VARCHAR(255), date DATE, total_revenue DECIMAL(15, 2) DEFAULT 0, total_cost DECIMAL(15, 2) DEFAULT 0, total_profit DECIMAL(15, 2) DEFAULT 0, INDEX(date))`);
    await connection.query(`CREATE TABLE IF NOT EXISTS sales_items (id VARCHAR(36) PRIMARY KEY, sale_id VARCHAR(36), wood_type VARCHAR(100), diameter_group VARCHAR(50), length FLOAT, condition_val VARCHAR(50), volume FLOAT, logs_deducted INT DEFAULT 1, sale_price_per_m3 DECIMAL(15, 2), cost_price_per_m3 DECIMAL(15, 2), subtotal_revenue DECIMAL(15, 2), subtotal_cost DECIMAL(15, 2), profit DECIMAL(15, 2), FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE)`);
    
    try { await connection.query(`ALTER TABLE sales_items ADD COLUMN condition_val VARCHAR(50)`); } catch (e) { }
    try { await connection.query(`ALTER TABLE sales_items ADD COLUMN logs_deducted INT DEFAULT 1`); } catch (e) { }

    await connection.query(`CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(50) UNIQUE NOT NULL, password VARCHAR(255) NOT NULL, role ENUM('owner', 'mandor') NOT NULL, full_name VARCHAR(100), email VARCHAR(255) UNIQUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    
    const [columns]: any = await connection.query(`SHOW COLUMNS FROM users LIKE 'email'`);
    if (columns.length === 0) {
      await connection.query(`ALTER TABLE users ADD COLUMN email VARCHAR(255)`);
      try { await connection.query(`ALTER TABLE users ADD UNIQUE INDEX idx_user_email (email)`); } catch (e) { }
    }

    await connection.query(`CREATE TABLE IF NOT EXISTS password_resets (id INT AUTO_INCREMENT PRIMARY KEY, email VARCHAR(255) NOT NULL, token VARCHAR(255) NOT NULL, expires_at TIMESTAMP NOT NULL, INDEX(email), INDEX(token))`);
    await connection.query(`CREATE TABLE IF NOT EXISTS suppliers (id VARCHAR(36) PRIMARY KEY, name VARCHAR(255) NOT NULL, phone VARCHAR(20), address TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await connection.query(`CREATE TABLE IF NOT EXISTS customers (id VARCHAR(36) PRIMARY KEY, name VARCHAR(255) NOT NULL, phone VARCHAR(20), address TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await connection.query(`CREATE TABLE IF NOT EXISTS expenses (id VARCHAR(36) PRIMARY KEY, category VARCHAR(100) NOT NULL, description TEXT, amount DECIMAL(15, 2) NOT NULL, date DATE NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX(date))`);
    await connection.query(`CREATE TABLE IF NOT EXISTS audit_logs (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT, action VARCHAR(255), details TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL, INDEX(created_at))`);
    
    try { await connection.query(`ALTER TABLE audit_logs ADD INDEX idx_audit_created_at (created_at)`); } catch (e) { }
    
    await connection.query(`CREATE TABLE IF NOT EXISTS wood_types (name VARCHAR(100) PRIMARY KEY, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);

    // Isi data awal jenis kayu
    const [existingWoodTypes]: any = await connection.query("SELECT * FROM wood_types");
    if (existingWoodTypes.length === 0) {
      const defaultTypes = ['Jati', 'Mahoni', 'Sengon', 'Pinus', 'Albasia'];
      for (const type of defaultTypes) {
        await connection.query("INSERT IGNORE INTO wood_types (name) VALUES (?)", [type]);
      }
    }

    // Insert or repair default users
    const [existingUsers]: any = await connection.query("SELECT * FROM users");

    // Map of known default passwords per username
    const defaultPasswords: Record<string, string> = {
      owner: "admin123",
      mandor: "mandor123"
    };

    // Ensure default users exist
    const defaultUsers = [
      { username: 'owner', role: 'owner', full_name: 'Pemilik Pangkalan', password: 'admin123' },
      { username: 'mandor', role: 'mandor', full_name: 'Mandor Lapangan', password: 'mandor123' }
    ];

    for (const defUser of defaultUsers) {
      const [rows]: any = await connection.query("SELECT * FROM users WHERE username = ?", [defUser.username]);
      if (rows.length === 0) {
        // Create if missing
        const hashed = await bcrypt.hash(defUser.password, 10);
        await connection.query(
          "INSERT INTO users (username, password, role, full_name) VALUES (?, ?, ?, ?)",
          [defUser.username, hashed, defUser.role, defUser.full_name]
        );
        console.log(`[${SERVER_ID}] ✅ Default user created: ${defUser.username}`);
      } else {
        // Repair if exists but password is plain text
        const user = rows[0];
        if (user.password === defUser.password) {
          const hashed = await bcrypt.hash(defUser.password, 10);
          await connection.query("UPDATE users SET password = ? WHERE id = ?", [hashed, user.id]);
          console.log(`[${SERVER_ID}] ⚠️  Fixed plain-text password for "${user.username}"`);
        }
      }
    }

    connection.release();
    dbConnected = true;
    console.log(`✅ Berhasil terhubung ke MySQL Database '${process.env.DB_NAME || 'berkah_kajeng'}' di host '${process.env.DB_HOST || 'localhost'}'`);
  } catch (error: any) {
    dbConnected = false;
    console.error(`❌ GAGAL terhubung ke MySQL Database:`, error.message);
  }
}

// Start DB init immediately
initDB().catch(err => console.error("Immediate DB Init Error:", err));
// Diameter grouping helper
function getDiameterGroup(diameter: number): string {
  if (diameter < 15) return "10-14";
  if (diameter < 20) return "15-19";
  if (diameter < 25) return "20-24";
  if (diameter < 30) return "25-29";
  return "30+";
}

// Middleware to check DB connection
const checkDB = (req: any, res: any, next: any) => {
  if (!dbConnected || !pool) {
    return res.status(503).json({
      error: "Database MySQL tidak terdeteksi. Silakan jalankan MySQL di XAMPP terlebih dahulu."
    });
  }
  next();
};

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Token required" });
  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
};

async function logAudit(userId: number, action: string, details: string) {
  if (!pool) return;
  try {
    await pool.query("INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)", [userId, action, details]);
  } catch (e) {
    console.error("Audit Log Error:", e);
  }
}

// API Routes
const apiRouter = express.Router();

// Helper Terbilang
function terbilang(n: number): string {
  if (n < 0) return "Minus " + terbilang(-n);
  const words = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
  let res = "";
  if (n < 12) res = words[n];
  else if (n < 20) res = terbilang(n - 10) + " Belas";
  else if (n < 100) res = terbilang(Math.floor(n / 10)) + " Puluh " + terbilang(n % 10);
  else if (n < 200) res = "Seratus " + terbilang(n - 100);
  else if (n < 1000) res = terbilang(Math.floor(n / 100)) + " Ratus " + terbilang(n % 100);
  else if (n < 2000) res = "Seribu " + terbilang(n - 1000);
  else if (n < 1000000) res = terbilang(Math.floor(n / 1000)) + " Ribu " + terbilang(n % 1000);
  else if (n < 1000000000) res = terbilang(Math.floor(n / 1000000)) + " Juta " + terbilang(n % 1000000);
  return res.trim();
}

// API Jenis Kayu
apiRouter.get("/wood-types", authenticateToken, async (req, res) => {
  if (dbConnected && pool) {
    const [rows] = await pool.query("SELECT * FROM wood_types ORDER BY name");
    res.json(rows);
  } else {
    res.json([]);
  }
});

apiRouter.post("/wood-types", authenticateToken, async (req, res) => {
  const { name } = req.body;
  if (!name || name.trim().length < 2) return res.status(400).json({ error: 'Nama jenis kayu tidak valid' });
  if (dbConnected && pool) {
    await pool.query("INSERT INTO wood_types (name) VALUES (?) ON DUPLICATE KEY UPDATE name = name", [name.trim()]);
    await logAudit(req.user.id, "ADD_WOOD_TYPE", `Tambah jenis kayu: ${name}`);
  }
  res.status(201).json({ name });
});

apiRouter.delete("/wood-types/:name", authenticateToken, async (req, res) => {
  const { name } = req.params;
  if (dbConnected && pool) {
    await pool.query("DELETE FROM wood_types WHERE name = ?", [name]);
    await logAudit(req.user.id, "DELETE_WOOD_TYPE", `Hapus jenis kayu: ${name}`);
  }
  res.json({ message: "Success" });
});

// Rate limiting untuk login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Terlalu banyak percobaan login. Silakan coba lagi dalam 15 menit.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Login API
apiRouter.post("/login", loginLimiter, async (req, res) => {
  console.log(`[${SERVER_ID}] Login route hit: ${req.method} ${req.url}`);
  let { username, password } = req.body;

  // Trim whitespace
  username = username?.trim();
  password = password?.trim();

  console.log(`[${SERVER_ID}] Login attempt - Username: "${username}", DB Connected: ${dbConnected}`);

  // Direct Database Authentication
  // Fallback to mock data if DB is not connected is handled below

  try {
    console.log(`[${SERVER_ID}] Querying database for user: ${username}`);

    let user: any = null;

    if (dbConnected && pool) {
      const [users]: any = await pool.query("SELECT * FROM users WHERE username = ?", [username]);
      if (users.length > 0) user = users[0];
    } 

    if (user) {
      console.log(`[${SERVER_ID}] User found in DB. Comparing password...`);
      let validPass = await bcrypt.compare(password, user.password);

      // EMERGENCY FALLBACK: If bcrypt fails, check if the password in DB is plain-text "admin123"
      if (!validPass && password === user.password) {
        console.log(`[${SERVER_ID}] FIXED: Detected plain-text password match. Upgrading to hash...`);
        const hashed = await bcrypt.hash(password, 10);
        await pool.query("UPDATE users SET password = ? WHERE id = ?", [hashed, user.id]);
        validPass = true; // Allow login
      }

      if (!validPass) {
        console.log(`[${SERVER_ID}] DB Login FAILED: Password mismatch for ${username}`);
        await logAudit(null as any, "LOGIN_FAILED", `Percobaan login gagal untuk username: ${username}`);
        return res.status(401).json({ error: "Password salah." });
      }

      console.log(`[${SERVER_ID}] DB Login SUCCESS for ${username}`);
      const token = jwt.sign({ id: user.id, username: user.username, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

      await logAudit(user.id, "LOGIN", `User ${username} logged in`);

      res.json({
        id: user.id,
        username: user.username,
        role: user.role,
        full_name: user.full_name,
        email: user.email,
        token
      });
    } else {
      console.log(`[${SERVER_ID}] DB Login FAILED: Username not found: ${username}`);
      await logAudit(null as any, "LOGIN_FAILED", `Percobaan login gagal - username tidak ditemukan: ${username}`);
      res.status(401).json({ error: "Username tidak ditemukan." });
    }
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Audit Logout
apiRouter.post("/logout", authenticateToken, async (req, res) => {
  await logAudit(req.user.id, "LOGOUT", `User ${req.user.username} logged out`);
  res.json({ message: "Logged out successfully" });
});

apiRouter.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Backend is running", timestamp: new Date().toISOString() });
});

// SMTP Transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Forgot Password API
apiRouter.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email diperlukan" });

  try {
    if (pool) {
      const [users]: any = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
      if (users.length === 0) {
        // Jangan beri tahu jika email tidak ada demi keamanan (prevent email harvesting)
        // Tapi tetap kirim respon sukses seolah-olah email dikirim
        return res.json({ message: "Jika email terdaftar, instruksi reset akan dikirim." });
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 600000); // 10 menit

      await pool.query("DELETE FROM password_resets WHERE email = ?", [email]);
      await pool.query("INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)", [email, otp, expiresAt]);
      
      const mailOptions = {
        from: process.env.SMTP_FROM || '"Berkah Kajeng" <no-reply@berkahkanjeng.com>',
        to: email,
        subject: "Kode OTP Reset Kata Sandi - Berkah Kajeng",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; text-align: center;">
            <h2 style="color: #2563eb;">Kode Keamanan Anda</h2>
            <p>Halo,</p>
            <p>Gunakan kode OTP di bawah ini untuk mereset kata sandi akun Berkah Kajeng Anda:</p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 10px; margin: 20px 0;">
              <h1 style="letter-spacing: 10px; font-size: 40px; margin: 0; color: #111827;">${otp}</h1>
            </div>
            <p style="color: #666; font-size: 14px;">Kode ini hanya berlaku selama 10 menit. Jangan berikan kode ini kepada siapapun.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #888;">Ini adalah email otomatis dari sistem Berkah Kajeng.</p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      res.json({ message: "Instruksi reset kata sandi telah dikirim ke email Anda." });
    } else {
      res.status(503).json({ error: "Sistem database sedang menyiapkan koneksi. Silakan coba lagi dalam beberapa detik." });
    }
  } catch (error) {
    console.error("Forgot Password Error:", error);
    res.status(500).json({ error: "Gagal memproses permintaan reset kata sandi" });
  }
});

// Reset Password API
apiRouter.post("/reset-password", async (req, res) => {
  const { email, token, newPassword } = req.body;
  if (!email || !token || !newPassword) return res.status(400).json({ error: "Data tidak lengkap" });

  try {
    if (pool) {
      const [resets]: any = await pool.query("SELECT * FROM password_resets WHERE email = ? AND token = ? AND expires_at > NOW()", [email, token]);
      if (resets.length === 0) {
        return res.status(400).json({ error: "Token tidak valid atau sudah kedaluwarsa" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await pool.query("UPDATE users SET password = ? WHERE email = ?", [hashedPassword, email]);
      await pool.query("DELETE FROM password_resets WHERE email = ?", [email]);
      res.json({ message: "Kata sandi berhasil diperbarui. Silakan login kembali." });
    } else {
      res.status(503).json({ error: "Sistem database sedang menyiapkan koneksi. Silakan coba lagi." });
    }
  } catch (error) {
    console.error("Reset Password Error:", error);
    res.status(500).json({ error: "Gagal memperbarui kata sandi" });
  }
});

// Ping/Debug
apiRouter.get("/ping", (req, res) => {
  res.json({ message: "pong", timestamp: new Date().toISOString(), server_id: SERVER_ID });
});

apiRouter.get("/debug", (req, res) => {
  res.json({
    server_id: SERVER_ID,
    node_env: process.env.NODE_ENV,
    db_connected: dbConnected,
    url: req.url,
    originalUrl: req.originalUrl,
    path: req.path
  });
});

// Database required routes middleware
apiRouter.use(async (req, res, next) => {
  // Always allow in mock mode if DB is not connected
  next();
});

apiRouter.get("/sets", authenticateToken, async (req, res) => {
  try {
    if (dbConnected && pool) {
      // 1. Get all sets
      const [sets]: any = await pool!.query("SELECT * FROM wood_sets ORDER BY date DESC");
      if (sets.length === 0) return res.json([]);

      const setIds = sets.map((s: any) => s.id);
      
      // 2. Get all categories for these sets in one query
      const [allCategories]: any = await pool!.query("SELECT * FROM wood_categories WHERE set_id IN (?)", [setIds]);
      const catIds = allCategories.map((c: any) => c.id);

      // 3. Get all logs for these categories in one query (if any categories exist)
      let allLogs: any[] = [];
      if (catIds.length > 0) {
        [allLogs] = await pool!.query("SELECT * FROM log_entries WHERE category_id IN (?)", [catIds]) as any;
      }

      // 4. Organize data efficiently using Maps
      const logsByCategory = new Map();
      allLogs.forEach(log => {
        if (!logsByCategory.has(log.category_id)) logsByCategory.set(log.category_id, []);
        logsByCategory.get(log.category_id).push(log);
      });

      const categoriesBySet = new Map();
      allCategories.forEach(cat => {
        if (!categoriesBySet.has(cat.set_id)) categoriesBySet.set(cat.set_id, []);
        categoriesBySet.get(cat.set_id).push({
          ...cat,
          condition: cat.condition_val,
          logs: logsByCategory.get(cat.id) || []
        });
      });

      const detailedSets = sets.map((set: any) => {
        let d = set.date instanceof Date ? set.date : new Date(set.date);
        let dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return {
          ...set,
          date: dateStr,
          categories: categoriesBySet.get(set.id) || []
        };
      });

      res.json(detailedSets);
    } else {
      res.json([]);
    }
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

apiRouter.post("/sets", authenticateToken, async (req, res) => {
  const set = req.body;

  // Validasi Input
  if (!set.supplierName || set.supplierName.trim().length < 2) {
    return res.status(400).json({ error: 'Nama supplier tidak valid' });
  }
  if (!set.date || isNaN(new Date(set.date).getTime())) {
    return res.status(400).json({ error: 'Tanggal tidak valid' });
  }
  if (!set.categories || !Array.isArray(set.categories) || set.categories.length === 0) {
    return res.status(400).json({ error: 'Kategori kayu tidak boleh kosong' });
  }

  if (!dbConnected || !pool) {
    // Mock Success for demo
    return res.status(201).json({ message: "Success (Mock Mode)" });
  }
  const connection = await pool!.getConnection();
  try {
    await connection.beginTransaction();

    // Check if set already exists (Update mode)
    const [existing]: any = await connection.query("SELECT * FROM wood_sets WHERE id = ?", [set.id]);
    if (existing.length > 0) {
      // Reverse old inventory impact before applying new one
      const [oldCategories]: any = await connection.query("SELECT * FROM wood_categories WHERE set_id = ?", [set.id]);
      for (const cat of oldCategories) {
        const [oldLogs]: any = await connection.query("SELECT * FROM log_entries WHERE category_id = ?", [cat.id]);
        const oldGroups: Record<string, { count: number, volume: number, value: number }> = {};
        for (const log of oldLogs) {
          const group = getDiameterGroup(log.diameter);
          if (!oldGroups[group]) oldGroups[group] = { count: 0, volume: 0, value: 0 };

          const isX = cat.condition_val === 'X' || log.diameter < 10;
          const vol = isX ? 0 : log.volume;
          const val = (log.diameter < 10) ? 1000 : (log.volume * cat.pricePerM3);

          oldGroups[group].count += 1;
          oldGroups[group].volume += vol;
          oldGroups[group].value += val;
        }
        for (const [group, data] of Object.entries(oldGroups)) {
          await connection.query(`
            UPDATE inventory 
            SET total_logs = GREATEST(0, total_logs - ?), 
                total_volume = GREATEST(0, total_volume - ?), 
                total_value = GREATEST(0, total_value - ?)
            WHERE wood_type = ? AND diameter_group = ? AND length = ? AND condition_val = ?
          `, [data.count, data.volume, data.value, cat.woodType, group, cat.length, (group === 'X' ? 'X' : (cat.condition_val || 'Umum'))]);
        }
        // Delete old logs and categories to prevent primary key conflicts or orphaned data
        await connection.query("DELETE FROM log_entries WHERE category_id = ?", [cat.id]);
      }
      await connection.query("DELETE FROM wood_categories WHERE set_id = ?", [set.id]);
      await connection.query("DELETE FROM wood_sets WHERE id = ?", [set.id]);
    }

    let totalVolume = 0, totalValue = 0;
    for (const cat of set.categories) {
      let catVol = 0;
      let catVal = 0;
      for (const log of cat.logs) {
        // According to user request: Category X has 0 volume in inventory/reports
        // According to UI logic: logs < 10cm have 0 volume and flat price of 1000
        const isX = cat.condition === 'X' || log.diameter < 10;
        const vol = isX ? 0 : log.volume;
        catVol += vol;
        catVal += (log.diameter < 10) ? 1000 : (log.volume * cat.pricePerM3);
      }
      totalVolume += catVol;
      totalValue += catVal;
    }
    totalValue = roundPrice(totalValue);
    await connection.query("INSERT INTO wood_sets (id, supplierName, date, total_volume, total_value, synced) VALUES (?, ?, ?, ?, ?, ?)", [set.id, set.supplierName, set.date, totalVolume, totalValue, true]);
    for (const cat of set.categories) {
      await connection.query("INSERT INTO wood_categories (id, set_id, woodType, length, condition_val, pricePerM3) VALUES (?, ?, ?, ?, ?, ?)", [cat.id, set.id, cat.woodType, cat.length, cat.condition, cat.pricePerM3]);
      
      const logGroups: Record<string, { count: number, volume: number, value: number }> = {};
      const logValues = [];

      for (const log of cat.logs) {
        logValues.push([log.id, cat.id, log.diameter, log.volume]);
        const group = getDiameterGroup(log.diameter);
        if (!logGroups[group]) logGroups[group] = { count: 0, volume: 0, value: 0 };

        const isX = cat.condition === 'X' || log.diameter < 10;
        const vol = isX ? 0 : log.volume;
        const val = (log.diameter < 10) ? 1000 : (log.volume * cat.pricePerM3);

        logGroups[group].count += 1;
        logGroups[group].volume += vol;
        logGroups[group].value += val;
      }

      if (logValues.length > 0) {
        await connection.query("INSERT INTO log_entries (id, category_id, diameter, volume) VALUES ?", [logValues]);
      }

      for (const [group, data] of Object.entries(logGroups)) {
        await connection.query(`
          INSERT INTO inventory (wood_type, diameter_group, length, condition_val, total_logs, total_volume, avg_price, total_value)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            total_logs = total_logs + VALUES(total_logs),
            total_volume = total_volume + VALUES(total_volume),
            total_value = total_value + VALUES(total_value),
            avg_price = IF((total_volume + VALUES(total_volume)) > 0, (total_value + VALUES(total_value)) / (total_volume + VALUES(total_volume)), 0)
        `, [cat.woodType, group, cat.length, (group === 'X' ? 'X' : (cat.condition || 'Umum')), data.count, data.volume, (data.volume > 0 ? data.value / data.volume : 0), data.value]);
      }
    }
    await connection.commit();
    await logAudit(req.user.id, "PURCHASE", `Added wood set ${set.id} from ${set.supplierName}`);
    res.status(201).json({ message: "Success" });
  } catch (e) {
    await connection.rollback();
    res.status(500).json({ error: (e as Error).message });
  } finally {
    connection.release();
  }
});

apiRouter.delete("/sets/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  if (!dbConnected || !pool) {
    return res.json({ message: "Success (Mock Mode)" });
  }
  const connection = await pool!.getConnection();
  try {
    await connection.beginTransaction();

    // Get categories to reverse inventory
    const [categories]: any = await connection.query("SELECT * FROM wood_categories WHERE set_id = ?", [id]);

    for (const cat of categories) {
      const [logs]: any = await connection.query("SELECT * FROM log_entries WHERE category_id = ?", [cat.id]);
      const logGroups: Record<string, { count: number, volume: number, value: number }> = {};
      for (const log of logs) {
        const group = getDiameterGroup(log.diameter);
        if (!logGroups[group]) logGroups[group] = { count: 0, volume: 0, value: 0 };

        const isX = cat.condition_val === 'X' || log.diameter < 10;
        const vol = isX ? 0 : log.volume;
        const val = (log.diameter < 10) ? 1000 : (log.volume * cat.pricePerM3);

        logGroups[group].count += 1;
        logGroups[group].volume += vol;
        logGroups[group].value += val;
      }

      for (const [group, data] of Object.entries(logGroups)) {
        await connection.query(`
          UPDATE inventory 
          SET total_logs = GREATEST(0, total_logs - ?), 
              total_volume = GREATEST(0, total_volume - ?), 
              total_value = GREATEST(0, total_value - ?)
          WHERE wood_type = ? AND diameter_group = ? AND length = ? AND condition_val = ?
        `, [data.count, data.volume, data.value, cat.woodType, group, cat.length, (group === 'X' ? 'X' : (cat.condition_val || 'Umum'))]);
      }
    }

    await connection.query("DELETE FROM wood_sets WHERE id = ?", [id]);

    await connection.commit();
    await logAudit(req.user.id, "DELETE_PURCHASE", `Deleted wood set ${id}`);
    res.json({ message: "Success" });
  } catch (e) {
    await connection.rollback();
    res.status(500).json({ error: (e as Error).message });
  } finally {
    connection.release();
  }
});

apiRouter.get("/inventory", authenticateToken, async (req, res) => {
  try {
    if (dbConnected && pool) {
      res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=600');
      const [inventory]: any = await pool!.query("SELECT * FROM inventory WHERE total_logs > 0 ORDER BY wood_type, length, condition_val, diameter_group");
      res.json(inventory);
    } else {
      res.json([]);
    }
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

apiRouter.get("/sales", authenticateToken, async (req, res) => {
  try {
    if (dbConnected && pool) {
      const [sales]: any = await pool!.query(`
        SELECT s.*, CAST(SUM(si.volume) AS DOUBLE) as total_volume 
        FROM sales s 
        LEFT JOIN sales_items si ON s.id = si.sale_id 
        GROUP BY s.id 
        ORDER BY s.date DESC
      `);
      
      const formattedSales = sales.map((sale: any) => {
        let d = sale.date instanceof Date ? sale.date : new Date(sale.date);
        let dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return { ...sale, date: dateStr };
      });
      res.json(formattedSales);
    } else {
      res.json([]);
    }
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

apiRouter.post("/sales", authenticateToken, async (req, res) => {
  const { id, customer_name, date, items } = req.body;
  
  // Validasi Input
  if (!customer_name || customer_name.trim().length < 2) {
    return res.status(400).json({ error: 'Nama pelanggan tidak valid' });
  }
  if (!date || isNaN(new Date(date).getTime())) {
    return res.status(400).json({ error: 'Tanggal tidak valid' });
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Item penjualan tidak boleh kosong' });
  }

  if (!dbConnected || !pool) {
    return res.status(201).json({ message: "Success (Mock Mode)" });
  }
  const connection = await pool!.getConnection();
  try {
    await connection.beginTransaction();
    let totalRev = 0, totalCost = 0;

    // Insert parent record first to satisfy foreign key constraint in sales_items
    await connection.query("INSERT INTO sales (id, customer_name, date, total_revenue, total_cost, total_profit) VALUES (?, ?, ?, 0, 0, 0)", [id, customer_name, date]);

    for (const item of items) {
      const [inv]: any = await connection.query("SELECT * FROM inventory WHERE wood_type = ? AND diameter_group = ? AND length = ? AND condition_val = ?", [item.wood_type, item.diameter_group, item.length, item.condition || 'Umum']);
      if (inv.length === 0 || inv[0].total_volume < item.volume) throw new Error("Stok tidak cukup");
      const cost = Number(inv[0].avg_price);
      totalRev += item.volume * item.sale_price_per_m3;
      totalCost += item.volume * cost;

      // Calculate proportional log deduction based on volume fraction sold
      const currentVolume = Number(inv[0].total_volume);
      const currentLogs = Number(inv[0].total_logs);
      const volumeFraction = currentVolume > 0 ? item.volume / currentVolume : 1;
      const logsToDeduct = Math.round(currentLogs * volumeFraction);

      // Simpan logs_deducted untuk reversal
      await connection.query("INSERT INTO sales_items (id, sale_id, wood_type, diameter_group, length, condition_val, volume, logs_deducted, sale_price_per_m3, cost_price_per_m3, subtotal_revenue, subtotal_cost, profit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [crypto.randomUUID(), id, item.wood_type, item.diameter_group, item.length, item.condition || '', item.volume, logsToDeduct, item.sale_price_per_m3, cost, item.volume * item.sale_price_per_m3, item.volume * cost, (item.volume * item.sale_price_per_m3) - (item.volume * cost)]);
      await connection.query("UPDATE inventory SET total_logs = GREATEST(0, total_logs - ?), total_volume = GREATEST(0, total_volume - ?), total_value = GREATEST(0, total_value - ?) WHERE id = ?", [logsToDeduct, item.volume, item.volume * cost, inv[0].id]);

      // Clean up: if remaining volume is essentially zero (floating-point residual), zero out everything
      await connection.query("UPDATE inventory SET total_logs = 0, total_volume = 0, total_value = 0, avg_price = 0 WHERE id = ? AND total_volume < 0.001", [inv[0].id]);
    }

    // Update the parent record with calculated totals
    totalRev = roundPrice(totalRev);
    totalCost = roundPrice(totalCost);
    await connection.query("UPDATE sales SET total_revenue = ?, total_cost = ?, total_profit = ? WHERE id = ?", [totalRev, totalCost, totalRev - totalCost, id]);

    await connection.commit();
    await logAudit(req.user.id, "SALE", `Sale ${id} to ${customer_name}`);
    res.status(201).json({ message: "Success" });
  } catch (e) {
    await connection.rollback();
    res.status(500).json({ error: (e as Error).message });
  } finally {
    connection.release();
  }
});

apiRouter.delete("/sales/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  if (!dbConnected || !pool) return res.json({ message: "Success (Mock Mode)" });
  const connection = await pool!.getConnection();
  try {
    await connection.beginTransaction();

    // Get sale info for audit
    const [saleInfo]: any = await connection.query("SELECT customer_name FROM sales WHERE id = ?", [id]);

    // Get items to reverse inventory
    const [items]: any = await connection.query("SELECT * FROM sales_items WHERE sale_id = ?", [id]);

    for (const item of items) {
      // Reversal stok menggunakan logs_deducted
      const logsToRestore = item.logs_deducted || 1;
      await connection.query(`
        UPDATE inventory 
        SET total_logs = total_logs + ?, 
            total_volume = total_volume + ?, 
            total_value = total_value + ?
        WHERE wood_type = ? AND diameter_group = ? AND length = ? AND condition_val = ?
      `, [logsToRestore, item.volume, item.subtotal_cost, item.wood_type, item.diameter_group, item.length, item.condition_val || 'Umum']);
    }

    await connection.query("DELETE FROM sales WHERE id = ?", [id]);

    await connection.commit();
    const customerName = saleInfo[0]?.customer_name || 'Unknown';
    await logAudit(req.user.id, "DELETE_SALE", `Hapus penjualan ${id} ke ${customerName}`);
    res.json({ message: "Success" });
  } catch (e) {
    await connection.rollback();
    res.status(500).json({ error: (e as Error).message });
  } finally {
    connection.release();
  }
});

const dashboardCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

// Health check endpoint
apiRouter.get("/health", async (req, res) => {
  res.json({
    status: dbConnected ? 'connected' : 'disconnected',
    serverId: SERVER_ID,
    dbHost: process.env.DB_HOST ? `${process.env.DB_HOST.substring(0, 5)}...` : 'not set'
  });
});

// Combined dashboard endpoint for stability
apiRouter.get("/dashboard", authenticateToken, async (req, res) => {
  try {
    const cacheKey = 'global_dashboard_v2';
    const cached = dashboardCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 15000) {
      return res.json(cached.data);
    }
    
    if (dbConnected && pool) {
      const queries = [
        pool.query("SELECT COALESCE(SUM(total_volume), 0) as total_volume, COALESCE(SUM(total_value), 0) as total_value FROM inventory"),
        pool.query("SELECT COALESCE(SUM(total_volume), 0) as total_volume, COALESCE(SUM(total_value), 0) as total_value FROM wood_sets"),
        pool.query("SELECT COALESCE(SUM(total_revenue), 0) as total_revenue, COALESCE(SUM(total_profit), 0) as total_profit FROM sales"),
        pool.query("SELECT COALESCE(SUM(volume), 0) as total_volume FROM sales_items"),
        pool.query("SELECT COALESCE(SUM(amount), 0) as total_expenses FROM expenses"),
        pool.query("SELECT DATE_FORMAT(date, '%b') as month, COALESCE(SUM(total_volume), 0) as purchase_volume FROM wood_sets GROUP BY month ORDER BY MIN(date)"),
        pool.query("SELECT DATE_FORMAT(date, '%b') as month, COALESCE(SUM(total_revenue), 0) as sales_revenue, COALESCE(SUM(total_profit), 0) as sales_profit FROM sales GROUP BY month ORDER BY MIN(date)"),
        pool.query("SELECT DATE_FORMAT(date, '%b') as month, COALESCE(SUM(amount), 0) as expense_amount FROM expenses GROUP BY month ORDER BY MIN(date)"),
        pool.query("SELECT wood_type, COALESCE(SUM(total_volume), 0) as volume FROM inventory WHERE total_logs > 0 GROUP BY wood_type")
      ];
      const results = await Promise.all(queries);
      const data = {
        inventory: results[0][0][0] || { total_volume: 0, total_value: 0 },
        purchases: results[1][0][0] || { total_volume: 0, total_value: 0 },
        sales: { 
          total_revenue: results[2][0][0]?.total_revenue || 0, 
          total_profit: results[2][0][0]?.total_profit || 0, 
          total_volume: results[3][0][0]?.total_volume || 0 
        },
        expenses: results[4][0][0] || { total_expenses: 0 },
        trends: {
          purchases: (results[5][0] as any[]).length > 0 ? results[5][0] : [{ month: 'Jan', purchase_volume: 0 }],
          sales: (results[6][0] as any[]).length > 0 ? results[6][0] : [{ month: 'Jan', sales_revenue: 0, sales_profit: 0 }],
          expenses: (results[7][0] as any[]).length > 0 ? results[7][0] : [{ month: 'Jan', expense_amount: 0 }]
        },
        stockComposition: results[8][0]
      };
      dashboardCache.set(cacheKey, { data, timestamp: Date.now() });
      res.json(data);
    } else {
      console.warn(`Dashboard request while DB disconnected. ServerID: ${SERVER_ID}`);
      res.json({
        inventory: { total_volume: 0, total_value: 0 },
        purchases: { total_volume: 0, total_value: 0 },
        sales: { total_revenue: 0, total_profit: 0, total_volume: 0 },
        expenses: { total_expenses: 0 },
        trends: { purchases: [], sales: [], expenses: [] },
        stockComposition: []
      });
    }
  } catch (e) { 
    console.error("Dashboard error:", e);
    res.status(500).json({ error: (e as Error).message }); 
  }
});
// Suppliers CRUD
apiRouter.get("/suppliers", authenticateToken, async (req, res) => {
  if (dbConnected && pool) {
    const [rows] = await pool!.query("SELECT * FROM suppliers ORDER BY name");
    res.json(rows);
  } else {
    res.json([]);
  }
});

apiRouter.post("/suppliers", authenticateToken, async (req, res) => {
  const { id, name, phone, address } = req.body;
  if (dbConnected && pool) {
    await pool!.query(`
      INSERT INTO suppliers (id, name, phone, address) 
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE name = VALUES(name), phone = VALUES(phone), address = VALUES(address)
    `, [id, name, phone, address]);
    await logAudit(req.user.id, "UPSERT_SUPPLIER", `Tambah/Edit supplier: ${name}`);
  }
  res.status(201).json({ id });
});

apiRouter.delete("/suppliers/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  if (dbConnected && pool) {
    const [rows]: any = await pool!.query("SELECT name FROM suppliers WHERE id = ?", [id]);
    const name = rows[0]?.name || id;
    await pool!.query("DELETE FROM suppliers WHERE id = ?", [id]);
    // ✅ Issue #9: Audit delete supplier
    await logAudit(req.user.id, "DELETE_SUPPLIER", `Hapus supplier: ${name} (ID: ${id})`);
  }
  res.json({ message: "Success" });
});


// Customers CRUD
apiRouter.get("/customers", authenticateToken, async (req, res) => {
  if (dbConnected && pool) {
    const [rows] = await pool!.query("SELECT * FROM customers ORDER BY name");
    res.json(rows);
  } else {
    res.json([]);
  }
});
apiRouter.post("/customers", authenticateToken, async (req, res) => {
  const { id, name, phone, address } = req.body;
  if (dbConnected && pool) {
    await pool!.query(`
      INSERT INTO customers (id, name, phone, address) 
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE name = VALUES(name), phone = VALUES(phone), address = VALUES(address)
    `, [id, name, phone, address]);
    await logAudit(req.user.id, "UPSERT_CUSTOMER", `Tambah/Edit pelanggan: ${name}`);
  }
  res.status(201).json({ id });
});

apiRouter.delete("/customers/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  if (dbConnected && pool) {
    const [rows]: any = await pool!.query("SELECT name FROM customers WHERE id = ?", [id]);
    const name = rows[0]?.name || id;
    await pool!.query("DELETE FROM customers WHERE id = ?", [id]);
    // ✅ Issue #9: Audit delete customer
    await logAudit(req.user.id, "DELETE_CUSTOMER", `Hapus pelanggan: ${name} (ID: ${id})`);
  }
  res.json({ message: "Success" });
});

// ✅ Issue #15: Export All Data for Backup
apiRouter.get("/export-all", authenticateToken, async (req, res) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: "Unauthorized" });
  
  try {
    if (dbConnected && pool) {
      const [users] = await pool.query("SELECT id, username, role, full_name FROM users");
      const [sets] = await pool.query("SELECT * FROM wood_sets");
      const [categories] = await pool.query("SELECT * FROM wood_categories");
      const [logs] = await pool.query("SELECT * FROM log_entries");
      const [inventory] = await pool.query("SELECT * FROM inventory");
      const [sales] = await pool.query("SELECT * FROM sales");
      const [salesItems] = await pool.query("SELECT * FROM sales_items");
      const [expenses] = await pool.query("SELECT * FROM expenses");
      const [suppliers] = await pool.query("SELECT * FROM suppliers");
      const [customers] = await pool.query("SELECT * FROM customers");
      const [audit] = await pool.query("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 1000");

      res.json({
        export_date: new Date().toISOString(),
        data: { users, sets, categories, logs, inventory, sales, salesItems, expenses, suppliers, customers, audit }
      });
      await logAudit(req.user.id, "BACKUP_EXPORT", "Ekspor database lengkap untuk backup");
    } else {
      res.json({ message: "Mock data cannot be exported fully." });
    }
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});



// Expenses CRUD
apiRouter.get("/expenses", authenticateToken, async (req, res) => {
  if (dbConnected && pool) {
    const [rows]: any = await pool!.query("SELECT * FROM expenses ORDER BY date DESC");
    const formattedRows = rows.map((e: any) => {
      let d = e.date instanceof Date ? e.date : new Date(e.date);
      let dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return { ...e, date: dateStr };
    });
    res.json(formattedRows);
  } else {
    res.json([]);
  }
});
apiRouter.post("/expenses", authenticateToken, async (req, res) => {
  const { id, category, description, amount, date } = req.body;
  if (!category || !amount || !date) return res.status(400).json({ error: 'Data pengeluaran tidak lengkap' });
  if (dbConnected && pool) {
    await pool!.query("INSERT INTO expenses (id, category, description, amount, date) VALUES (?, ?, ?, ?, ?)", [id, category, description, amount, date]);
    await logAudit(req.user.id, "EXPENSE", `Tambah pengeluaran ${category}: Rp${amount}`);
  }
  res.status(201).json({ id });
});

// ✅ Issue #11: Edit pengeluaran
apiRouter.put("/expenses/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { category, description, amount, date } = req.body;
  if (!category || !amount || !date) return res.status(400).json({ error: 'Data pengeluaran tidak lengkap' });
  if (dbConnected && pool) {
    await pool!.query("UPDATE expenses SET category = ?, description = ?, amount = ?, date = ? WHERE id = ?", [category, description, amount, date, id]);
    await logAudit(req.user.id, "EDIT_EXPENSE", `Edit pengeluaran ${category}: Rp${amount}`);
  }
  res.json({ message: "Updated" });
});

// ✅ Issue #11: Hapus pengeluaran
apiRouter.delete("/expenses/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  if (dbConnected && pool) {
    const [rows]: any = await pool!.query("SELECT category, amount FROM expenses WHERE id = ?", [id]);
    const exp = rows[0];
    await pool!.query("DELETE FROM expenses WHERE id = ?", [id]);
    await logAudit(req.user.id, "DELETE_EXPENSE", `Hapus pengeluaran ${exp?.category}: Rp${exp?.amount}`);
  }
  res.json({ message: "Success" });
});

// User Management
apiRouter.get("/users", authenticateToken, async (req, res) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: "Unauthorized" });
  if (dbConnected && pool) {
    const [rows]: any = await pool!.query("SELECT id, username, role, full_name, email, created_at FROM users ORDER BY created_at DESC");
    res.json(rows);
  } else {
    res.json([]);
  }
});

apiRouter.post("/users", authenticateToken, async (req, res) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: "Unauthorized" });
  const { username, password, full_name, email } = req.body;
  if (!username || !password || !full_name) return res.status(400).json({ error: "Missing fields" });

  if (dbConnected && pool) {
    try {
      const hashed = await bcrypt.hash(password, 10);
      await pool!.query("INSERT INTO users (username, password, role, full_name, email) VALUES (?, ?, 'mandor', ?, ?)", [username, hashed, full_name, email]);
      await logAudit(req.user.id, "USER_CREATED", `Created mandor account: ${username}`);
      res.status(201).json({ message: "User created" });
    } catch (e: any) {
      if (e.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: "Username sudah digunakan" });
      res.status(500).json({ error: e.message });
    }
  } else {
    res.status(201).json({ message: "Mock user created" });
  }
});

apiRouter.put("/users/:id", authenticateToken, async (req, res) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: "Unauthorized" });
  const { id } = req.params;
  const { username, full_name, email, password } = req.body;
  
  if (dbConnected && pool) {
    try {
      if (password && password.trim() !== '') {
        const hashed = await bcrypt.hash(password, 10);
        await pool!.query("UPDATE users SET username = ?, full_name = ?, email = ?, password = ? WHERE id = ? AND role = 'mandor'", [username, full_name, email, hashed, id]);
        await logAudit(req.user.id, "USER_UPDATED", `Updated mandor account & password: ${username}`);
      } else {
        await pool!.query("UPDATE users SET username = ?, full_name = ?, email = ? WHERE id = ? AND role = 'mandor'", [username, full_name, email, id]);
        await logAudit(req.user.id, "USER_UPDATED", `Updated mandor account: ${username}`);
      }
      res.json({ message: "User updated" });
    } catch (e: any) {
      if (e.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: "Username sudah digunakan" });
      res.status(500).json({ error: e.message });
    }
  } else {
    res.json({ message: "Mock user updated" });
  }
});

apiRouter.delete("/users/:id", authenticateToken, async (req, res) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: "Unauthorized" });
  const { id } = req.params;
  
  if (dbConnected && pool) {
    await pool!.query("DELETE FROM users WHERE id = ? AND role = 'mandor'", [id]);
    await logAudit(req.user.id, "USER_DELETED", `Deleted mandor account ID: ${id}`);
    res.json({ message: "User deleted" });
  } else {
    res.json({ message: "Mock user deleted" });
  }
});

apiRouter.put("/profile", authenticateToken, async (req, res) => {
  const { username, full_name, email, current_password, new_password } = req.body;
  const userId = req.user.id;
  
  if (dbConnected && pool) {
    try {
      if (new_password && new_password.trim() !== '') {
        if (!current_password) return res.status(400).json({ error: "Password saat ini harus diisi untuk mengubah password." });
        
        // Verify current password
        const [users]: any = await pool!.query("SELECT * FROM users WHERE id = ?", [userId]);
        if (users.length === 0) return res.status(404).json({ error: "User not found" });
        const user = users[0];
        
        let validPass = await bcrypt.compare(current_password, user.password);
        // Fallback for plain text password fix if they still have it
        if (!validPass && current_password === user.password) validPass = true;
        
        if (!validPass) return res.status(401).json({ error: "Password saat ini salah." });
        
        const hashed = await bcrypt.hash(new_password, 10);
        await pool!.query("UPDATE users SET username = ?, full_name = ?, email = ?, password = ? WHERE id = ?", [username, full_name, email, hashed, userId]);
        await logAudit(userId, "PROFILE_UPDATED", `Updated profile and password`);
      } else {
        await pool!.query("UPDATE users SET username = ?, full_name = ?, email = ? WHERE id = ?", [username, full_name, email, userId]);
        await logAudit(userId, "PROFILE_UPDATED", `Updated profile`);
      }
      
      const [updatedUser]: any = await pool!.query("SELECT id, username, role, full_name, email FROM users WHERE id = ?", [userId]);
      const token = jwt.sign({ id: updatedUser[0].id, username: updatedUser[0].username, role: updatedUser[0].role, email: updatedUser[0].email }, JWT_SECRET, { expiresIn: '24h' });
      res.json({ message: "Profile updated", user: { ...updatedUser[0], token } });
    } catch (e: any) {
      if (e.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: "Username sudah digunakan" });
      res.status(500).json({ error: e.message });
    }
  } else {
    res.json({ message: "Mock profile updated" });
  }
});

// Audit Logs
apiRouter.get("/audit-logs", authenticateToken, async (req, res) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: "Unauthorized" });
  if (dbConnected && pool) {
    const [rows]: any = await pool!.query("SELECT a.*, u.username FROM audit_logs a JOIN users u ON a.user_id = u.id ORDER BY a.created_at DESC LIMIT 100");
    res.json(rows);
  } else {
    res.json([]);
  }
});

// Catch-all for undefined API routes to prevent fall-through to Vite
apiRouter.all("*", (req, res) => {
  console.log(`[${SERVER_ID}] API 404: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: `API endpoint ${req.method} ${req.originalUrl} not found` });
});

// app.use("/api", apiRouter); // Moved inside startServer for better order control

// Global error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error(`[${SERVER_ID}] Global Error:`, err);
  const isApiRequest = req.originalUrl.startsWith('/api') || req.url.startsWith('/api');
  if (isApiRequest) {
    return res.status(500).json({
      error: err.message || "Internal Server Error",
      path: req.originalUrl,
      server_id: SERVER_ID
    });
  }
  next(err);
});

// Register API routes
console.log(`[${SERVER_ID}] Registering API routes at /api`);
app.use("/api", async (req, res, next) => {
  if (!dbConnected || !pool) {
    try {
      await initDB();
    } catch (e) {
      console.error("Delayed DB Init Error:", e);
    }
  }
  res.setHeader('X-Backend-Server', SERVER_ID);
  res.setHeader('X-API-Request', 'true');
  res.setHeader('Cache-Control', 'no-store');
  next();
}, apiRouter);

async function startServer() {
  console.log(`[${SERVER_ID}] Starting server...`);

  // Ensure DB init is started
  initDB().catch(err => console.error("DB Init Error:", err));

  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else if (process.env.NODE_ENV === "production") {
    // Cache control for static assets (logo, etc.)
    app.use((req, res, next) => {
      if (req.url.match(/\.(png|jpg|jpeg|gif|ico|svg|webp)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
      next();
    });

    app.use(express.static(path.join(__dirname, 'dist')));
    app.get("*", (req, res) => res.sendFile(path.resolve("dist/index.html")));
  }
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log("\nShutting down gracefully...");
    if (pool) {
      await pool.end();
      console.log("MySQL pool closed.");
    }
    server.close(() => {
      console.log("Server closed.");
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

export default app;

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  startServer();
}
