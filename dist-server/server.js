var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import express from "express";
// import { createServer as createViteServer } from "vite"; // Removed static import for Vercel compatibility
import mysql from "mysql2/promise";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import nodemailer from "nodemailer";
import helmet from "helmet";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
dotenv.config();
export var app = express();
var PORT = 3000;
var SERVER_ID = Math.random().toString(36).substring(7);
// FIX #1: JWT_SECRET must be required, not optional
var JWT_SECRET = (function () {
    var secret = process.env.JWT_SECRET;
    if (!secret || secret.trim().length < 32) {
        if (process.env.NODE_ENV === "production") {
            throw new Error("CRITICAL: JWT_SECRET environment variable must be set and at least 32 characters in production");
        }
        console.warn("WARNING: JWT_SECRET not set. Generating temporary key for development only.");
        return crypto.randomBytes(32).toString("hex");
    }
    return secret;
})();
var PAGINATION_LIMIT = 50;
var MAX_PAGINATION = 100;
// FIX #2, #3, #4: Validation utilities
var isValidEmail = function (email) {
    if (!email || typeof email !== "string")
        return false;
    if (email.length > 255)
        return false;
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
var isValidPassword = function (password) {
    if (!password || typeof password !== "string")
        return false;
    if (password.length < 8)
        return false;
    return (/[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /[0-9]/.test(password) &&
        /[!@#$%^&*]/.test(password));
};
var sanitizeString = function (str, maxLen) {
    if (maxLen === void 0) { maxLen = 255; }
    if (!str || typeof str !== "string")
        throw new Error("Invalid input");
    if (str.length > maxLen)
        throw new Error("Input exceeds max length ".concat(maxLen));
    return str.replace(/[<>"'`;]/g, "").trim();
};
var sanitizePagination = function (limit, offset) {
    if (offset === void 0) { offset = 0; }
    var lim = parseInt(limit) || PAGINATION_LIMIT;
    var off = parseInt(offset) || 0;
    lim = Math.min(Math.max(lim, 1), MAX_PAGINATION);
    off = Math.max(off, 0);
    return { limit: lim, offset: off };
};
/**
 * Custom Rounding: Round to 1000.
 * Rule: <= 500 rounds DOWN, > 500 rounds UP.
 */
var roundPrice = function (price) {
    var remainder = price % 1000;
    if (remainder <= 500) {
        return Math.floor(price / 1000) * 1000;
    }
    else {
        return Math.ceil(price / 1000) * 1000;
    }
};
// FIX #7: Add security headers with Helmet
app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === "development" ? false : {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
        },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true },
    frameguard: { action: "deny" },
    noSniff: true,
    xssFilter: true,
}));
// Konfigurasi CORS
app.use(cors({
    origin: process.env.ALLOWED_ORIGIN || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
app.set("trust proxy", 1);
app.use(express.json({ limit: "10mb" }));
// MySQL connection pool
var pool = null;
var dbConnected = false;
// Helper to initialize database schema
export function initDB() {
    return __awaiter(this, void 0, void 0, function () {
        var setupConn, connection, e_1, e_2, e_3, columns, e_4, e_5, existingWoodTypes, defaultTypes, _i, defaultTypes_1, type, existingUsers, enableDefaultUsers, defaultUsers, _a, defaultUsers_1, defUser, rows, hashed, user, hashed, error_1;
        var _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _d.trys.push([0, 55, , 56]);
                    return [4 /*yield*/, mysql.createConnection({
                            host: process.env.DB_HOST || "localhost",
                            port: parseInt(process.env.DB_PORT || "3306"),
                            user: process.env.DB_USER || "root",
                            password: process.env.DB_PASSWORD || "",
                            ssl: ((_b = process.env.DB_HOST) === null || _b === void 0 ? void 0 : _b.includes("tidbcloud.com"))
                                ? {
                                    minVersion: "TLSv1.2",
                                    rejectUnauthorized: false,
                                }
                                : undefined,
                        })];
                case 1:
                    setupConn = _d.sent();
                    return [4 /*yield*/, setupConn.query("CREATE DATABASE IF NOT EXISTS `".concat(process.env.DB_NAME || "berkah_kajeng", "`"))];
                case 2:
                    _d.sent();
                    return [4 /*yield*/, setupConn.end()];
                case 3:
                    _d.sent();
                    pool = mysql.createPool({
                        host: process.env.DB_HOST || "localhost",
                        port: parseInt(process.env.DB_PORT || "3306"),
                        user: process.env.DB_USER || "root",
                        password: process.env.DB_PASSWORD || "",
                        database: process.env.DB_NAME || "berkah_kajeng",
                        waitForConnections: true,
                        connectionLimit: 10,
                        queueLimit: 0,
                        connectTimeout: 10000,
                        ssl: ((_c = process.env.DB_HOST) === null || _c === void 0 ? void 0 : _c.includes("tidbcloud.com"))
                            ? {
                                minVersion: "TLSv1.2",
                                rejectUnauthorized: false,
                            }
                            : undefined,
                    });
                    return [4 /*yield*/, pool.getConnection()];
                case 4:
                    connection = _d.sent();
                    return [4 /*yield*/, connection.query("CREATE TABLE IF NOT EXISTS wood_sets (id VARCHAR(36) PRIMARY KEY, supplierName VARCHAR(255), date DATE, total_volume FLOAT DEFAULT 0, total_value DECIMAL(15, 2) DEFAULT 0, synced BOOLEAN DEFAULT FALSE, INDEX(date))")];
                case 5:
                    _d.sent();
                    return [4 /*yield*/, connection.query("CREATE TABLE IF NOT EXISTS wood_categories (id VARCHAR(36) PRIMARY KEY, set_id VARCHAR(36), woodType VARCHAR(100), length FLOAT, condition_val VARCHAR(50), pricePerM3 DECIMAL(15, 2), FOREIGN KEY (set_id) REFERENCES wood_sets(id) ON DELETE CASCADE)")];
                case 6:
                    _d.sent();
                    return [4 /*yield*/, connection.query("CREATE TABLE IF NOT EXISTS log_entries (id VARCHAR(36) PRIMARY KEY, category_id VARCHAR(36), diameter INT, volume FLOAT, FOREIGN KEY (category_id) REFERENCES wood_categories(id) ON DELETE CASCADE)")];
                case 7:
                    _d.sent();
                    return [4 /*yield*/, connection.query("CREATE TABLE IF NOT EXISTS inventory (id INT AUTO_INCREMENT PRIMARY KEY, wood_type VARCHAR(100), diameter_group VARCHAR(50), length FLOAT, condition_val VARCHAR(50) DEFAULT 'Umum', total_logs INT DEFAULT 0, total_volume FLOAT DEFAULT 0, avg_price DECIMAL(15, 2) DEFAULT 0, total_value DECIMAL(15, 2) DEFAULT 0, UNIQUE KEY inventory_unique_group (wood_type, diameter_group, length, condition_val), INDEX(wood_type))")];
                case 8:
                    _d.sent();
                    _d.label = 9;
                case 9:
                    _d.trys.push([9, 11, , 12]);
                    return [4 /*yield*/, connection.query("ALTER TABLE inventory ADD UNIQUE KEY inventory_unique_group (wood_type, diameter_group, length, condition_val)")];
                case 10:
                    _d.sent();
                    return [3 /*break*/, 12];
                case 11:
                    e_1 = _d.sent();
                    return [3 /*break*/, 12];
                case 12: return [4 /*yield*/, connection.query("CREATE TABLE IF NOT EXISTS sales (id VARCHAR(36) PRIMARY KEY, customer_name VARCHAR(255), date DATE, total_revenue DECIMAL(15, 2) DEFAULT 0, total_cost DECIMAL(15, 2) DEFAULT 0, total_profit DECIMAL(15, 2) DEFAULT 0, INDEX(date))")];
                case 13:
                    _d.sent();
                    return [4 /*yield*/, connection.query("CREATE TABLE IF NOT EXISTS sales_items (id VARCHAR(36) PRIMARY KEY, sale_id VARCHAR(36), wood_type VARCHAR(100), diameter_group VARCHAR(50), length FLOAT, condition_val VARCHAR(50), volume FLOAT, logs_deducted INT DEFAULT 1, sale_price_per_m3 DECIMAL(15, 2), cost_price_per_m3 DECIMAL(15, 2), subtotal_revenue DECIMAL(15, 2), subtotal_cost DECIMAL(15, 2), profit DECIMAL(15, 2), FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE)")];
                case 14:
                    _d.sent();
                    _d.label = 15;
                case 15:
                    _d.trys.push([15, 17, , 18]);
                    return [4 /*yield*/, connection.query("ALTER TABLE sales_items ADD COLUMN condition_val VARCHAR(50)")];
                case 16:
                    _d.sent();
                    return [3 /*break*/, 18];
                case 17:
                    e_2 = _d.sent();
                    return [3 /*break*/, 18];
                case 18:
                    _d.trys.push([18, 20, , 21]);
                    return [4 /*yield*/, connection.query("ALTER TABLE sales_items ADD COLUMN logs_deducted INT DEFAULT 1")];
                case 19:
                    _d.sent();
                    return [3 /*break*/, 21];
                case 20:
                    e_3 = _d.sent();
                    return [3 /*break*/, 21];
                case 21: return [4 /*yield*/, connection.query("CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(50) UNIQUE NOT NULL, password VARCHAR(255) NOT NULL, role ENUM('owner', 'mandor') NOT NULL, full_name VARCHAR(100), email VARCHAR(255) UNIQUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)")];
                case 22:
                    _d.sent();
                    return [4 /*yield*/, connection.query("SHOW COLUMNS FROM users LIKE 'email'")];
                case 23:
                    columns = (_d.sent())[0];
                    if (!(columns.length === 0)) return [3 /*break*/, 28];
                    return [4 /*yield*/, connection.query("ALTER TABLE users ADD COLUMN email VARCHAR(255)")];
                case 24:
                    _d.sent();
                    _d.label = 25;
                case 25:
                    _d.trys.push([25, 27, , 28]);
                    return [4 /*yield*/, connection.query("ALTER TABLE users ADD UNIQUE INDEX idx_user_email (email)")];
                case 26:
                    _d.sent();
                    return [3 /*break*/, 28];
                case 27:
                    e_4 = _d.sent();
                    return [3 /*break*/, 28];
                case 28: return [4 /*yield*/, connection.query("CREATE TABLE IF NOT EXISTS password_resets (id INT AUTO_INCREMENT PRIMARY KEY, email VARCHAR(255) NOT NULL, token VARCHAR(255) NOT NULL, expires_at TIMESTAMP NOT NULL, INDEX(email), INDEX(token))")];
                case 29:
                    _d.sent();
                    return [4 /*yield*/, connection.query("CREATE TABLE IF NOT EXISTS suppliers (id VARCHAR(36) PRIMARY KEY, name VARCHAR(255) NOT NULL, phone VARCHAR(20), address TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)")];
                case 30:
                    _d.sent();
                    return [4 /*yield*/, connection.query("CREATE TABLE IF NOT EXISTS customers (id VARCHAR(36) PRIMARY KEY, name VARCHAR(255) NOT NULL, phone VARCHAR(20), address TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)")];
                case 31:
                    _d.sent();
                    return [4 /*yield*/, connection.query("CREATE TABLE IF NOT EXISTS expenses (id VARCHAR(36) PRIMARY KEY, category VARCHAR(100) NOT NULL, description TEXT, amount DECIMAL(15, 2) NOT NULL, date DATE NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX(date))")];
                case 32:
                    _d.sent();
                    return [4 /*yield*/, connection.query("CREATE TABLE IF NOT EXISTS audit_logs (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT, action VARCHAR(255), details TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL, INDEX(created_at))")];
                case 33:
                    _d.sent();
                    _d.label = 34;
                case 34:
                    _d.trys.push([34, 36, , 37]);
                    return [4 /*yield*/, connection.query("ALTER TABLE audit_logs ADD INDEX idx_audit_created_at (created_at)")];
                case 35:
                    _d.sent();
                    return [3 /*break*/, 37];
                case 36:
                    e_5 = _d.sent();
                    return [3 /*break*/, 37];
                case 37: return [4 /*yield*/, connection.query("CREATE TABLE IF NOT EXISTS wood_types (name VARCHAR(100) PRIMARY KEY, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)")];
                case 38:
                    _d.sent();
                    return [4 /*yield*/, connection.query("SELECT * FROM wood_types")];
                case 39:
                    existingWoodTypes = (_d.sent())[0];
                    if (!(existingWoodTypes.length === 0)) return [3 /*break*/, 43];
                    defaultTypes = ["Jati", "Mahoni", "Sengon", "Pinus", "Albasia"];
                    _i = 0, defaultTypes_1 = defaultTypes;
                    _d.label = 40;
                case 40:
                    if (!(_i < defaultTypes_1.length)) return [3 /*break*/, 43];
                    type = defaultTypes_1[_i];
                    return [4 /*yield*/, connection.query("INSERT IGNORE INTO wood_types (name) VALUES (?)", [type])];
                case 41:
                    _d.sent();
                    _d.label = 42;
                case 42:
                    _i++;
                    return [3 /*break*/, 40];
                case 43: return [4 /*yield*/, connection.query("SELECT * FROM users")];
                case 44:
                    existingUsers = (_d.sent())[0];
                    enableDefaultUsers = process.env.CREATE_DEFAULT_USERS === "true";
                    defaultUsers = enableDefaultUsers
                        ? [
                            {
                                username: "owner",
                                role: "owner",
                                full_name: "Pemilik Pangkalan",
                                password: process.env.DEFAULT_OWNER_PASSWORD || "TempOwner123!",
                            },
                            {
                                username: "mandor",
                                role: "mandor",
                                full_name: "Mandor Lapangan",
                                password: process.env.DEFAULT_MANDOR_PASSWORD || "TempMandor123!",
                            },
                        ]
                        : [];
                    if (!enableDefaultUsers) {
                        console.warn("WARNING: Default users NOT created. Set CREATE_DEFAULT_USERS=true to enable.");
                    }
                    _a = 0, defaultUsers_1 = defaultUsers;
                    _d.label = 45;
                case 45:
                    if (!(_a < defaultUsers_1.length)) return [3 /*break*/, 53];
                    defUser = defaultUsers_1[_a];
                    return [4 /*yield*/, connection.query("SELECT * FROM users WHERE username = ?", [defUser.username])];
                case 46:
                    rows = (_d.sent())[0];
                    if (!(rows.length === 0)) return [3 /*break*/, 49];
                    return [4 /*yield*/, bcrypt.hash(defUser.password, 10)];
                case 47:
                    hashed = _d.sent();
                    return [4 /*yield*/, connection.query("INSERT INTO users (username, password, role, full_name) VALUES (?, ?, ?, ?)", [defUser.username, hashed, defUser.role, defUser.full_name])];
                case 48:
                    _d.sent();
                    console.log("[".concat(SERVER_ID, "] \u2705 Default user created: ").concat(defUser.username));
                    return [3 /*break*/, 52];
                case 49:
                    user = rows[0];
                    if (!(user.password === defUser.password)) return [3 /*break*/, 52];
                    return [4 /*yield*/, bcrypt.hash(defUser.password, 10)];
                case 50:
                    hashed = _d.sent();
                    return [4 /*yield*/, connection.query("UPDATE users SET password = ? WHERE id = ?", [
                            hashed,
                            user.id,
                        ])];
                case 51:
                    _d.sent();
                    console.log("[".concat(SERVER_ID, "] \u26A0\uFE0F  Fixed plain-text password for \"").concat(user.username, "\""));
                    _d.label = 52;
                case 52:
                    _a++;
                    return [3 /*break*/, 45];
                case 53: 
                // Migration: Fix total_value and avg_price for condition X items
                // X condition items should be valued at Rp 1000/batang flat price
                return [4 /*yield*/, connection.query("UPDATE inventory \n       SET total_value = total_logs * 1000,\n           avg_price = 1000\n       WHERE total_volume = 0 AND total_logs > 0 AND (condition_val = 'X' OR avg_price = 0)")];
                case 54:
                    // Migration: Fix total_value and avg_price for condition X items
                    // X condition items should be valued at Rp 1000/batang flat price
                    _d.sent();
                    connection.release();
                    dbConnected = true;
                    console.log("\u2705 Berhasil terhubung ke MySQL Database '".concat(process.env.DB_NAME || "berkah_kajeng", "' di host '").concat(process.env.DB_HOST || "localhost", "'"));
                    return [3 /*break*/, 56];
                case 55:
                    error_1 = _d.sent();
                    dbConnected = false;
                    console.error("\u274C GAGAL terhubung ke MySQL Database:", error_1.message);
                    return [3 /*break*/, 56];
                case 56: return [2 /*return*/];
            }
        });
    });
}
// Start DB init immediately
initDB().catch(function (err) { return console.error("Immediate DB Init Error:", err); });
// Diameter grouping helper matching purchase categorization rules
function getDiameterGroup(diameter, condition, length) {
    if (condition === "X" || diameter < 10)
        return "X";
    if (condition === "Kerab")
        return "Bebas";
    if (condition === "Rijelk") {
        if (diameter >= 10 && diameter <= 14)
            return "10-14";
        if (diameter >= 15 && diameter <= 19)
            return "15-19";
        return "10-19";
    }
    if (condition === "Super kecil") {
        return "15-19";
    }
    if (condition === "C/Standar") {
        if (diameter >= 20 && diameter <= 24)
            return "20-24";
        if (diameter >= 25 && diameter <= 29)
            return "25-29";
        return "30+";
    }
    if (condition === "Super") {
        if (length === 100 || length === 130) {
            if (diameter >= 20 && diameter <= 24)
                return "20-24";
            if (diameter >= 25)
                return "25up";
        }
        else { // 200 or 260
            if (diameter >= 20 && diameter <= 24)
                return "20-24";
            if (diameter >= 25 && diameter <= 29)
                return "25-29";
            if (diameter >= 30 && diameter <= 39)
                return "30-39";
            if (diameter >= 40 && diameter <= 49)
                return "40-49";
            if (diameter >= 50)
                return "50up";
        }
    }
    // Fallback to standard grouping
    if (diameter < 15)
        return "10-14";
    if (diameter < 20)
        return "15-19";
    if (diameter < 25)
        return "20-24";
    if (diameter < 30)
        return "25-29";
    return "30+";
}
// Middleware to check DB connection
var checkDB = function (req, res, next) {
    if (!dbConnected || !pool) {
        return res.status(503).json({
            error: "Database MySQL tidak terdeteksi. Silakan jalankan MySQL di XAMPP terlebih dahulu.",
        });
    }
    next();
};
// Auth Middleware
var authenticateToken = function (req, res, next) {
    var authHeader = req.headers["authorization"];
    var token = authHeader && authHeader.split(" ")[1];
    if (!token)
        return res.status(401).json({ error: "Token required" });
    jwt.verify(token, JWT_SECRET, function (err, user) {
        if (err)
            return res.status(403).json({ error: "Invalid token" });
        req.user = user;
        next();
    });
};
function logAudit(userId, action, details) {
    return __awaiter(this, void 0, void 0, function () {
        var e_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!pool)
                        return [2 /*return*/];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, pool.query("INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)", [userId, action, details])];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    e_6 = _a.sent();
                    console.error("Audit Log Error:", e_6);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// API Routes
var apiRouter = express.Router();
// Helper Terbilang
function terbilang(n) {
    if (n < 0)
        return "Minus " + terbilang(-n);
    var words = [
        "",
        "Satu",
        "Dua",
        "Tiga",
        "Empat",
        "Lima",
        "Enam",
        "Tujuh",
        "Delapan",
        "Sembilan",
        "Sepuluh",
        "Sebelas",
    ];
    var res = "";
    if (n < 12)
        res = words[n];
    else if (n < 20)
        res = terbilang(n - 10) + " Belas";
    else if (n < 100)
        res = terbilang(Math.floor(n / 10)) + " Puluh " + terbilang(n % 10);
    else if (n < 200)
        res = "Seratus " + terbilang(n - 100);
    else if (n < 1000)
        res = terbilang(Math.floor(n / 100)) + " Ratus " + terbilang(n % 100);
    else if (n < 2000)
        res = "Seribu " + terbilang(n - 1000);
    else if (n < 1000000)
        res = terbilang(Math.floor(n / 1000)) + " Ribu " + terbilang(n % 1000);
    else if (n < 1000000000)
        res =
            terbilang(Math.floor(n / 1000000)) + " Juta " + terbilang(n % 1000000);
    return res.trim();
}
// FIX #6: Rate limiters for security
// Login limiter - strict
var loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
        error: "Terlalu banyak percobaan login. Silakan coba lagi dalam 15 menit.",
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: function (req) { return process.env.NODE_ENV === "test"; },
});
// General API limiter - moderate
var apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: "Terlalu banyak request. Silakan coba lagi nanti." },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: function (req) { var _a, _b; return ((_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id) === null || _b === void 0 ? void 0 : _b.toString()) || req.ip || "unknown"; },
    skip: function (req) { return process.env.NODE_ENV === "test"; },
});
// Export data limiter - very strict
var exportLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: { error: "Terlalu banyak export. Silakan coba lagi dalam 1 jam." },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: function (req) { var _a, _b; return ((_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id) === null || _b === void 0 ? void 0 : _b.toString()) || req.ip || "unknown"; },
});
// API Jenis Kayu
apiRouter.get("/wood-types", authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var rows;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!(dbConnected && pool)) return [3 /*break*/, 2];
                return [4 /*yield*/, pool.query("SELECT * FROM wood_types ORDER BY name")];
            case 1:
                rows = (_a.sent())[0];
                res.json(rows);
                return [3 /*break*/, 3];
            case 2:
                res.json([]);
                _a.label = 3;
            case 3: return [2 /*return*/];
        }
    });
}); });
apiRouter.post("/wood-types", authenticateToken, apiLimiter, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var name;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                name = req.body.name;
                // FIX #4: Input sanitization
                if (!name || name.trim().length < 2) {
                    return [2 /*return*/, res.status(400).json({ error: "Nama jenis kayu tidak valid" })];
                }
                try {
                    name = sanitizeString(name, 100);
                }
                catch (e) {
                    return [2 /*return*/, res.status(400).json({ error: "Nama jenis kayu tidak valid" })];
                }
                if (!(dbConnected && pool)) return [3 /*break*/, 3];
                return [4 /*yield*/, pool.query("INSERT INTO wood_types (name) VALUES (?) ON DUPLICATE KEY UPDATE name = name", [name])];
            case 1:
                _a.sent();
                return [4 /*yield*/, logAudit(req.user.id, "ADD_WOOD_TYPE", "Tambah jenis kayu: ".concat(name))];
            case 2:
                _a.sent();
                _a.label = 3;
            case 3:
                res.status(201).json({ name: name });
                return [2 /*return*/];
        }
    });
}); });
apiRouter.delete("/wood-types/:name", authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var name;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                name = req.params.name;
                if (!(dbConnected && pool)) return [3 /*break*/, 3];
                return [4 /*yield*/, pool.query("DELETE FROM wood_types WHERE name = ?", [name])];
            case 1:
                _a.sent();
                return [4 /*yield*/, logAudit(req.user.id, "DELETE_WOOD_TYPE", "Hapus jenis kayu: ".concat(name))];
            case 2:
                _a.sent();
                _a.label = 3;
            case 3:
                res.json({ message: "Success" });
                return [2 /*return*/];
        }
    });
}); });
// Login API
apiRouter.post("/login", loginLimiter, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, username, password, user, users, validPass, hashed, token, error_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                console.log("[".concat(SERVER_ID, "] Login route hit: ").concat(req.method, " ").concat(req.url));
                _a = req.body, username = _a.username, password = _a.password;
                // Trim whitespace
                username = username === null || username === void 0 ? void 0 : username.trim();
                password = password === null || password === void 0 ? void 0 : password.trim();
                if (process.env.NODE_ENV === "development") {
                    console.log("[".concat(SERVER_ID, "] Login attempt - Username: \"").concat(username, "\", DB Connected: ").concat(dbConnected));
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 14, , 15]);
                console.log("[".concat(SERVER_ID, "] Querying database for user: ").concat(username));
                user = null;
                if (!(dbConnected && pool)) return [3 /*break*/, 3];
                return [4 /*yield*/, pool.query("SELECT * FROM users WHERE username = ?", [username])];
            case 2:
                users = (_b.sent())[0];
                if (users.length > 0)
                    user = users[0];
                _b.label = 3;
            case 3:
                if (!user) return [3 /*break*/, 11];
                console.log("[".concat(SERVER_ID, "] User found in DB. Comparing password..."));
                return [4 /*yield*/, bcrypt.compare(password, user.password)];
            case 4:
                validPass = _b.sent();
                if (!(!validPass && password === user.password)) return [3 /*break*/, 7];
                console.log("[".concat(SERVER_ID, "] FIXED: Detected plain-text password match. Upgrading to hash..."));
                return [4 /*yield*/, bcrypt.hash(password, 10)];
            case 5:
                hashed = _b.sent();
                return [4 /*yield*/, pool.query("UPDATE users SET password = ? WHERE id = ?", [
                        hashed,
                        user.id,
                    ])];
            case 6:
                _b.sent();
                validPass = true; // Allow login
                _b.label = 7;
            case 7:
                if (!!validPass) return [3 /*break*/, 9];
                console.log("[".concat(SERVER_ID, "] DB Login FAILED: Password mismatch for ").concat(username));
                return [4 /*yield*/, logAudit(null, "LOGIN_FAILED", "Percobaan login gagal untuk username: ".concat(username))];
            case 8:
                _b.sent();
                return [2 /*return*/, res.status(401).json({ error: "Username atau password salah." })];
            case 9:
                console.log("[".concat(SERVER_ID, "] DB Login SUCCESS for ").concat(username));
                token = jwt.sign({
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    email: user.email,
                }, JWT_SECRET, { expiresIn: "24h" });
                return [4 /*yield*/, logAudit(user.id, "LOGIN", "User ".concat(username, " logged in"))];
            case 10:
                _b.sent();
                res.json({
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    full_name: user.full_name,
                    email: user.email,
                    token: token,
                });
                return [3 /*break*/, 13];
            case 11:
                console.log("[".concat(SERVER_ID, "] DB Login FAILED: Username not found: ").concat(username));
                return [4 /*yield*/, logAudit(null, "LOGIN_FAILED", "Percobaan login gagal - username tidak ditemukan: ".concat(username))];
            case 12:
                _b.sent();
                res.status(401).json({ error: "Username atau password salah." });
                _b.label = 13;
            case 13: return [3 /*break*/, 15];
            case 14:
                error_2 = _b.sent();
                console.error("Login Error:", error_2);
                res.status(500).json({ error: error_2.message });
                return [3 /*break*/, 15];
            case 15: return [2 /*return*/];
        }
    });
}); });
// Audit Logout
apiRouter.post("/logout", authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, logAudit(req.user.id, "LOGOUT", "User ".concat(req.user.username, " logged out"))];
            case 1:
                _a.sent();
                res.json({ message: "Logged out successfully" });
                return [2 /*return*/];
        }
    });
}); });
// SMTP Transporter
var transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "465"),
    secure: process.env.SMTP_PORT === "465",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});
// Forgot Password API
apiRouter.post("/forgot-password", apiLimiter, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var email, users, otp, expiresAt, mailOptions, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                email = req.body.email;
                // FIX #2: Validate email format
                if (!email || !isValidEmail(email)) {
                    return [2 /*return*/, res.status(400).json({ error: "Format email tidak valid" })];
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 8, , 9]);
                if (!pool) return [3 /*break*/, 6];
                return [4 /*yield*/, pool.query("SELECT * FROM users WHERE email = ?", [email])];
            case 2:
                users = (_a.sent())[0];
                if (users.length === 0) {
                    // Jangan beri tahu jika email tidak ada demi keamanan (prevent email harvesting)
                    // Tapi tetap kirim respon sukses seolah-olah email dikirim
                    return [2 /*return*/, res.json({
                            message: "Jika email terdaftar, instruksi reset akan dikirim.",
                        })];
                }
                otp = Math.floor(100000 + Math.random() * 900000).toString();
                expiresAt = new Date(Date.now() + 600000);
                return [4 /*yield*/, pool.query("DELETE FROM password_resets WHERE email = ?", [email])];
            case 3:
                _a.sent();
                return [4 /*yield*/, pool.query("INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)", [email, otp, expiresAt])];
            case 4:
                _a.sent();
                mailOptions = {
                    from: process.env.SMTP_FROM ||
                        '"Berkah Kajeng" <no-reply@berkahkanjeng.com>',
                    to: email,
                    subject: "Kode OTP Reset Kata Sandi - Berkah Kajeng",
                    html: "\n          <div style=\"font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; text-align: center;\">\n            <h2 style=\"color: #2563eb;\">Kode Keamanan Anda</h2>\n            <p>Halo,</p>\n            <p>Gunakan kode OTP di bawah ini untuk mereset kata sandi akun Berkah Kajeng Anda:</p>\n            <div style=\"background-color: #f3f4f6; padding: 20px; border-radius: 10px; margin: 20px 0;\">\n              <h1 style=\"letter-spacing: 10px; font-size: 40px; margin: 0; color: #111827;\">".concat(otp, "</h1>\n            </div>\n            <p style=\"color: #666; font-size: 14px;\">Kode ini hanya berlaku selama 10 menit. Jangan berikan kode ini kepada siapapun.</p>\n            <hr style=\"border: none; border-top: 1px solid #eee; margin: 20px 0;\">\n            <p style=\"font-size: 12px; color: #888;\">Ini adalah email otomatis dari sistem Berkah Kajeng.</p>\n          </div>\n        "),
                };
                return [4 /*yield*/, transporter.sendMail(mailOptions)];
            case 5:
                _a.sent();
                res.json({
                    message: "Instruksi reset kata sandi telah dikirim ke email Anda.",
                });
                return [3 /*break*/, 7];
            case 6:
                res
                    .status(503)
                    .json({
                    error: "Sistem database sedang menyiapkan koneksi. Silakan coba lagi dalam beberapa detik.",
                });
                _a.label = 7;
            case 7: return [3 /*break*/, 9];
            case 8:
                error_3 = _a.sent();
                console.error("Forgot Password Error:", error_3);
                res
                    .status(500)
                    .json({ error: "Gagal memproses permintaan reset kata sandi" });
                return [3 /*break*/, 9];
            case 9: return [2 /*return*/];
        }
    });
}); });
// Reset Password API
apiRouter.post("/reset-password", apiLimiter, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, email, token, newPassword, resets, hashedPassword, error_4;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, email = _a.email, token = _a.token, newPassword = _a.newPassword;
                if (!email || !token || !newPassword) {
                    return [2 /*return*/, res.status(400).json({ error: "Data tidak lengkap" })];
                }
                // FIX #2 & #3: Validate email format and password complexity
                if (!isValidEmail(email)) {
                    return [2 /*return*/, res.status(400).json({ error: "Format email tidak valid" })];
                }
                if (!isValidPassword(newPassword)) {
                    return [2 /*return*/, res.status(400).json({
                            error: "Password harus minimal 8 karakter dengan huruf besar, huruf kecil, angka, dan simbol (!@#$%^&*)",
                        })];
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 8, , 9]);
                if (!pool) return [3 /*break*/, 6];
                return [4 /*yield*/, pool.query("SELECT * FROM password_resets WHERE email = ? AND token = ? AND expires_at > NOW()", [email, token])];
            case 2:
                resets = (_b.sent())[0];
                if (resets.length === 0) {
                    return [2 /*return*/, res
                            .status(400)
                            .json({ error: "Token tidak valid atau sudah kedaluwarsa" })];
                }
                return [4 /*yield*/, bcrypt.hash(newPassword, 10)];
            case 3:
                hashedPassword = _b.sent();
                return [4 /*yield*/, pool.query("UPDATE users SET password = ? WHERE email = ?", [
                        hashedPassword,
                        email,
                    ])];
            case 4:
                _b.sent();
                return [4 /*yield*/, pool.query("DELETE FROM password_resets WHERE email = ?", [email])];
            case 5:
                _b.sent();
                res.json({
                    message: "Kata sandi berhasil diperbarui. Silakan login kembali.",
                });
                return [3 /*break*/, 7];
            case 6:
                res
                    .status(503)
                    .json({
                    error: "Sistem database sedang menyiapkan koneksi. Silakan coba lagi.",
                });
                _b.label = 7;
            case 7: return [3 /*break*/, 9];
            case 8:
                error_4 = _b.sent();
                console.error("Reset Password Error:", error_4);
                res.status(500).json({ error: "Gagal memperbarui kata sandi" });
                return [3 /*break*/, 9];
            case 9: return [2 /*return*/];
        }
    });
}); });
// Ping/Debug
apiRouter.get("/ping", function (req, res) {
    res.json({
        message: "pong",
        timestamp: new Date().toISOString(),
        server_id: SERVER_ID,
    });
});
apiRouter.get("/debug", function (req, res) {
    res.json({
        server_id: SERVER_ID,
        node_env: process.env.NODE_ENV,
        db_connected: dbConnected,
        url: req.url,
        originalUrl: req.originalUrl,
        path: req.path,
    });
});
// Database required routes middleware
apiRouter.use(function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        // Always allow in mock mode if DB is not connected
        next();
        return [2 /*return*/];
    });
}); });
apiRouter.get("/sets", authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var sets, setIds, allCategories, catIds, allLogs, logsByCategory_1, categoriesBySet_1, detailedSets, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 7, , 8]);
                if (!(dbConnected && pool)) return [3 /*break*/, 5];
                return [4 /*yield*/, pool.query("SELECT * FROM wood_sets ORDER BY date DESC")];
            case 1:
                sets = (_a.sent())[0];
                if (sets.length === 0)
                    return [2 /*return*/, res.json([])];
                setIds = sets.map(function (s) { return s.id; });
                return [4 /*yield*/, pool.query("SELECT * FROM wood_categories WHERE set_id IN (?)", [setIds])];
            case 2:
                allCategories = (_a.sent())[0];
                catIds = allCategories.map(function (c) { return c.id; });
                allLogs = [];
                if (!(catIds.length > 0)) return [3 /*break*/, 4];
                return [4 /*yield*/, pool.query("SELECT * FROM log_entries WHERE category_id IN (?)", [catIds])];
            case 3:
                allLogs = (_a.sent())[0];
                _a.label = 4;
            case 4:
                logsByCategory_1 = new Map();
                allLogs.forEach(function (log) {
                    if (!logsByCategory_1.has(log.category_id))
                        logsByCategory_1.set(log.category_id, []);
                    logsByCategory_1.get(log.category_id).push(log);
                });
                categoriesBySet_1 = new Map();
                allCategories.forEach(function (cat) {
                    if (!categoriesBySet_1.has(cat.set_id))
                        categoriesBySet_1.set(cat.set_id, []);
                    categoriesBySet_1.get(cat.set_id).push(__assign(__assign({}, cat), { condition: cat.condition_val, logs: logsByCategory_1.get(cat.id) || [] }));
                });
                detailedSets = sets.map(function (set) {
                    var d = set.date instanceof Date ? set.date : new Date(set.date);
                    var dateStr = "".concat(d.getFullYear(), "-").concat(String(d.getMonth() + 1).padStart(2, "0"), "-").concat(String(d.getDate()).padStart(2, "0"));
                    return __assign(__assign({}, set), { date: dateStr, categories: categoriesBySet_1.get(set.id) || [] });
                });
                res.json(detailedSets);
                return [3 /*break*/, 6];
            case 5:
                res.json([]);
                _a.label = 6;
            case 6: return [3 /*break*/, 8];
            case 7:
                error_5 = _a.sent();
                res.status(500).json({ error: error_5.message });
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); });
apiRouter.post("/sets", authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var set, connection, existing, oldCategories, _i, oldCategories_1, cat, oldLogs, oldGroups, _a, oldLogs_1, log, group, isX, vol, val, _b, _c, _d, group, data, condVal, totalVolume, totalValue, _e, _f, cat, catVol, catVal, _g, _h, log, isX, vol, _j, _k, cat, logGroups, logValues, _l, _m, log, group, isX, vol, val, _o, _p, _q, group, data, e_7;
    return __generator(this, function (_r) {
        switch (_r.label) {
            case 0:
                set = req.body;
                // Validasi Input
                if (!set.supplierName || set.supplierName.trim().length < 2) {
                    return [2 /*return*/, res.status(400).json({ error: "Nama supplier tidak valid" })];
                }
                if (!set.date || isNaN(new Date(set.date).getTime())) {
                    return [2 /*return*/, res.status(400).json({ error: "Tanggal tidak valid" })];
                }
                if (!set.categories ||
                    !Array.isArray(set.categories) ||
                    set.categories.length === 0) {
                    return [2 /*return*/, res.status(400).json({ error: "Kategori kayu tidak boleh kosong" })];
                }
                if (!dbConnected || !pool) {
                    // Mock Success for demo
                    return [2 /*return*/, res.status(201).json({ message: "Success (Mock Mode)" })];
                }
                return [4 /*yield*/, pool.getConnection()];
            case 1:
                connection = _r.sent();
                _r.label = 2;
            case 2:
                _r.trys.push([2, 31, 33, 34]);
                return [4 /*yield*/, connection.beginTransaction()];
            case 3:
                _r.sent();
                return [4 /*yield*/, connection.query("SELECT * FROM wood_sets WHERE id = ?", [set.id])];
            case 4:
                existing = (_r.sent())[0];
                if (!(existing.length > 0)) return [3 /*break*/, 18];
                return [4 /*yield*/, connection.query("SELECT * FROM wood_categories WHERE set_id = ?", [set.id])];
            case 5:
                oldCategories = (_r.sent())[0];
                _i = 0, oldCategories_1 = oldCategories;
                _r.label = 6;
            case 6:
                if (!(_i < oldCategories_1.length)) return [3 /*break*/, 15];
                cat = oldCategories_1[_i];
                return [4 /*yield*/, connection.query("SELECT * FROM log_entries WHERE category_id = ?", [cat.id])];
            case 7:
                oldLogs = (_r.sent())[0];
                oldGroups = {};
                for (_a = 0, oldLogs_1 = oldLogs; _a < oldLogs_1.length; _a++) {
                    log = oldLogs_1[_a];
                    group = getDiameterGroup(log.diameter, cat.condition_val, cat.length);
                    if (!oldGroups[group])
                        oldGroups[group] = { count: 0, volume: 0, value: 0 };
                    isX = cat.condition_val === "X" || log.diameter < 10;
                    vol = isX ? 0 : log.volume;
                    val = isX ? 1000 : log.volume * cat.pricePerM3;
                    oldGroups[group].count += 1;
                    oldGroups[group].volume += vol;
                    oldGroups[group].value += val;
                }
                _b = 0, _c = Object.entries(oldGroups);
                _r.label = 8;
            case 8:
                if (!(_b < _c.length)) return [3 /*break*/, 12];
                _d = _c[_b], group = _d[0], data = _d[1];
                return [4 /*yield*/, connection.query("\n            UPDATE inventory \n            SET total_logs = GREATEST(0, total_logs - ?), \n                total_volume = GREATEST(0, total_volume - ?), \n                total_value = GREATEST(0, total_value - ?)\n            WHERE wood_type = ? AND diameter_group = ? AND length = ? AND condition_val = ?\n          ", [
                        data.count,
                        data.volume,
                        data.value,
                        cat.woodType,
                        group,
                        cat.length,
                        group === "X" ? "X" : cat.condition_val || "Umum",
                    ])];
            case 9:
                _r.sent();
                condVal = group === "X" ? "X" : cat.condition_val || "Umum";
                return [4 /*yield*/, connection.query("UPDATE inventory SET avg_price = IF(total_volume > 0, total_value / total_volume, IF(total_logs > 0, total_value / total_logs, 0)) WHERE wood_type = ? AND diameter_group = ? AND length = ? AND condition_val = ?", [cat.woodType, group, cat.length, condVal])];
            case 10:
                _r.sent();
                _r.label = 11;
            case 11:
                _b++;
                return [3 /*break*/, 8];
            case 12: 
            // Delete old logs and categories to prevent primary key conflicts or orphaned data
            return [4 /*yield*/, connection.query("DELETE FROM log_entries WHERE category_id = ?", [cat.id])];
            case 13:
                // Delete old logs and categories to prevent primary key conflicts or orphaned data
                _r.sent();
                _r.label = 14;
            case 14:
                _i++;
                return [3 /*break*/, 6];
            case 15: return [4 /*yield*/, connection.query("DELETE FROM wood_categories WHERE set_id = ?", [
                    set.id,
                ])];
            case 16:
                _r.sent();
                return [4 /*yield*/, connection.query("DELETE FROM wood_sets WHERE id = ?", [set.id])];
            case 17:
                _r.sent();
                _r.label = 18;
            case 18:
                totalVolume = 0, totalValue = 0;
                for (_e = 0, _f = set.categories; _e < _f.length; _e++) {
                    cat = _f[_e];
                    catVol = 0;
                    catVal = 0;
                    for (_g = 0, _h = cat.logs; _g < _h.length; _g++) {
                        log = _h[_g];
                        isX = cat.condition === "X" || log.diameter < 10;
                        vol = isX ? 0 : log.volume;
                        catVol += vol;
                        catVal += isX ? 1000 : log.volume * cat.pricePerM3;
                    }
                    totalVolume += catVol;
                    totalValue += catVal;
                }
                totalValue = roundPrice(totalValue);
                return [4 /*yield*/, connection.query("INSERT INTO wood_sets (id, supplierName, date, total_volume, total_value, synced) VALUES (?, ?, ?, ?, ?, ?)", [set.id, set.supplierName, set.date, totalVolume, totalValue, true])];
            case 19:
                _r.sent();
                _j = 0, _k = set.categories;
                _r.label = 20;
            case 20:
                if (!(_j < _k.length)) return [3 /*break*/, 28];
                cat = _k[_j];
                return [4 /*yield*/, connection.query("INSERT INTO wood_categories (id, set_id, woodType, length, condition_val, pricePerM3) VALUES (?, ?, ?, ?, ?, ?)", [
                        cat.id,
                        set.id,
                        cat.woodType,
                        cat.length,
                        cat.condition,
                        cat.pricePerM3,
                    ])];
            case 21:
                _r.sent();
                logGroups = {};
                logValues = [];
                for (_l = 0, _m = cat.logs; _l < _m.length; _l++) {
                    log = _m[_l];
                    logValues.push([log.id, cat.id, log.diameter, log.volume]);
                    group = getDiameterGroup(log.diameter, cat.condition, cat.length);
                    if (!logGroups[group])
                        logGroups[group] = { count: 0, volume: 0, value: 0 };
                    isX = cat.condition === "X" || log.diameter < 10;
                    vol = isX ? 0 : log.volume;
                    val = isX ? 1000 : log.volume * cat.pricePerM3;
                    logGroups[group].count += 1;
                    logGroups[group].volume += vol;
                    logGroups[group].value += val;
                }
                if (!(logValues.length > 0)) return [3 /*break*/, 23];
                return [4 /*yield*/, connection.query("INSERT INTO log_entries (id, category_id, diameter, volume) VALUES ?", [logValues])];
            case 22:
                _r.sent();
                _r.label = 23;
            case 23:
                _o = 0, _p = Object.entries(logGroups);
                _r.label = 24;
            case 24:
                if (!(_o < _p.length)) return [3 /*break*/, 27];
                _q = _p[_o], group = _q[0], data = _q[1];
                return [4 /*yield*/, connection.query("\n          INSERT INTO inventory (wood_type, diameter_group, length, condition_val, total_logs, total_volume, avg_price, total_value)\n          VALUES (?, ?, ?, ?, ?, ?, ?, ?)\n          ON DUPLICATE KEY UPDATE\n            total_logs = total_logs + VALUES(total_logs),\n            total_volume = total_volume + VALUES(total_volume),\n            total_value = total_value + VALUES(total_value),\n            avg_price = IF((total_volume + VALUES(total_volume)) > 0,\n              (total_value + VALUES(total_value)) / (total_volume + VALUES(total_volume)),\n              IF((total_logs + VALUES(total_logs)) > 0,\n                (total_value + VALUES(total_value)) / (total_logs + VALUES(total_logs)),\n                0))\n        ", [
                        cat.woodType,
                        group,
                        cat.length,
                        group === "X" ? "X" : cat.condition || "Umum",
                        data.count,
                        data.volume,
                        data.volume > 0 ? data.value / data.volume : (data.count > 0 ? data.value / data.count : 0),
                        data.value,
                    ])];
            case 25:
                _r.sent();
                _r.label = 26;
            case 26:
                _o++;
                return [3 /*break*/, 24];
            case 27:
                _j++;
                return [3 /*break*/, 20];
            case 28: return [4 /*yield*/, connection.commit()];
            case 29:
                _r.sent();
                return [4 /*yield*/, logAudit(req.user.id, "PURCHASE", "Added wood set ".concat(set.id, " from ").concat(set.supplierName))];
            case 30:
                _r.sent();
                res.status(201).json({ message: "Success" });
                return [3 /*break*/, 34];
            case 31:
                e_7 = _r.sent();
                return [4 /*yield*/, connection.rollback()];
            case 32:
                _r.sent();
                res.status(500).json({ error: e_7.message });
                return [3 /*break*/, 34];
            case 33:
                connection.release();
                return [7 /*endfinally*/];
            case 34: return [2 /*return*/];
        }
    });
}); });
apiRouter.delete("/sets/:id", authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, connection, categories, _i, categories_1, cat, logs, logGroups, _a, logs_1, log, group, isX, vol, val, _b, _c, _d, group, data, condVal, e_8;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                id = req.params.id;
                if (!dbConnected || !pool) {
                    return [2 /*return*/, res.json({ message: "Success (Mock Mode)" })];
                }
                return [4 /*yield*/, pool.getConnection()];
            case 1:
                connection = _e.sent();
                _e.label = 2;
            case 2:
                _e.trys.push([2, 16, 18, 19]);
                return [4 /*yield*/, connection.beginTransaction()];
            case 3:
                _e.sent();
                return [4 /*yield*/, connection.query("SELECT * FROM wood_categories WHERE set_id = ?", [id])];
            case 4:
                categories = (_e.sent())[0];
                _i = 0, categories_1 = categories;
                _e.label = 5;
            case 5:
                if (!(_i < categories_1.length)) return [3 /*break*/, 12];
                cat = categories_1[_i];
                return [4 /*yield*/, connection.query("SELECT * FROM log_entries WHERE category_id = ?", [cat.id])];
            case 6:
                logs = (_e.sent())[0];
                logGroups = {};
                for (_a = 0, logs_1 = logs; _a < logs_1.length; _a++) {
                    log = logs_1[_a];
                    group = getDiameterGroup(log.diameter, cat.condition_val, cat.length);
                    if (!logGroups[group])
                        logGroups[group] = { count: 0, volume: 0, value: 0 };
                    isX = cat.condition_val === "X" || log.diameter < 10;
                    vol = isX ? 0 : log.volume;
                    val = isX ? 1000 : log.volume * cat.pricePerM3;
                    logGroups[group].count += 1;
                    logGroups[group].volume += vol;
                    logGroups[group].value += val;
                }
                _b = 0, _c = Object.entries(logGroups);
                _e.label = 7;
            case 7:
                if (!(_b < _c.length)) return [3 /*break*/, 11];
                _d = _c[_b], group = _d[0], data = _d[1];
                return [4 /*yield*/, connection.query("\n          UPDATE inventory \n          SET total_logs = GREATEST(0, total_logs - ?), \n              total_volume = GREATEST(0, total_volume - ?), \n              total_value = GREATEST(0, total_value - ?)\n          WHERE wood_type = ? AND diameter_group = ? AND length = ? AND condition_val = ?\n        ", [
                        data.count,
                        data.volume,
                        data.value,
                        cat.woodType,
                        group,
                        cat.length,
                        group === "X" ? "X" : cat.condition_val || "Umum",
                    ])];
            case 8:
                _e.sent();
                condVal = group === "X" ? "X" : cat.condition_val || "Umum";
                return [4 /*yield*/, connection.query("UPDATE inventory SET avg_price = IF(total_volume > 0, total_value / total_volume, IF(total_logs > 0, total_value / total_logs, 0)) WHERE wood_type = ? AND diameter_group = ? AND length = ? AND condition_val = ?", [cat.woodType, group, cat.length, condVal])];
            case 9:
                _e.sent();
                _e.label = 10;
            case 10:
                _b++;
                return [3 /*break*/, 7];
            case 11:
                _i++;
                return [3 /*break*/, 5];
            case 12: return [4 /*yield*/, connection.query("DELETE FROM wood_sets WHERE id = ?", [id])];
            case 13:
                _e.sent();
                return [4 /*yield*/, connection.commit()];
            case 14:
                _e.sent();
                return [4 /*yield*/, logAudit(req.user.id, "DELETE_PURCHASE", "Deleted wood set ".concat(id))];
            case 15:
                _e.sent();
                res.json({ message: "Success" });
                return [3 /*break*/, 19];
            case 16:
                e_8 = _e.sent();
                return [4 /*yield*/, connection.rollback()];
            case 17:
                _e.sent();
                res.status(500).json({ error: e_8.message });
                return [3 /*break*/, 19];
            case 18:
                connection.release();
                return [7 /*endfinally*/];
            case 19: return [2 /*return*/];
        }
    });
}); });
apiRouter.get("/inventory", authenticateToken, apiLimiter, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var inventory, error_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 4, , 5]);
                if (!(dbConnected && pool)) return [3 /*break*/, 2];
                res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=600");
                return [4 /*yield*/, pool.query("SELECT * FROM inventory WHERE total_logs > 0 ORDER BY wood_type, length, condition_val, diameter_group")];
            case 1:
                inventory = (_a.sent())[0];
                res.json(inventory);
                return [3 /*break*/, 3];
            case 2:
                res.json([]);
                _a.label = 3;
            case 3: return [3 /*break*/, 5];
            case 4:
                error_6 = _a.sent();
                res.status(500).json({ error: error_6.message });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
apiRouter.get("/sales", authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var sales, saleIds, allItems, itemsBySale_1, formattedSales, error_7;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 5, , 6]);
                if (!(dbConnected && pool)) return [3 /*break*/, 3];
                return [4 /*yield*/, pool.query("SELECT * FROM sales ORDER BY date DESC")];
            case 1:
                sales = (_a.sent())[0];
                if (sales.length === 0)
                    return [2 /*return*/, res.json([])];
                saleIds = sales.map(function (s) { return s.id; });
                return [4 /*yield*/, pool.query("SELECT * FROM sales_items WHERE sale_id IN (?) ORDER BY wood_type, length, diameter_group", [saleIds])];
            case 2:
                allItems = (_a.sent())[0];
                itemsBySale_1 = new Map();
                allItems.forEach(function (item) {
                    if (!itemsBySale_1.has(item.sale_id))
                        itemsBySale_1.set(item.sale_id, []);
                    itemsBySale_1.get(item.sale_id).push(__assign(__assign({}, item), { condition: item.condition_val || "Umum" }));
                });
                formattedSales = sales.map(function (sale) {
                    var d = sale.date instanceof Date ? sale.date : new Date(sale.date);
                    var dateStr = "".concat(d.getFullYear(), "-").concat(String(d.getMonth() + 1).padStart(2, "0"), "-").concat(String(d.getDate()).padStart(2, "0"));
                    return __assign(__assign({}, sale), { date: dateStr, items: itemsBySale_1.get(sale.id) || [] });
                });
                res.json(formattedSales);
                return [3 /*break*/, 4];
            case 3:
                res.json([]);
                _a.label = 4;
            case 4: return [3 /*break*/, 6];
            case 5:
                error_7 = _a.sent();
                res.status(500).json({ error: error_7.message });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
apiRouter.post("/sales", authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, id, customer_name, date, items, connection, totalRev, totalCost, _i, items_1, item, inv, cost, isX, currentVolume, currentLogs, logsToDeduct, rev, costAmount, volumeFraction, e_9;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, id = _a.id, customer_name = _a.customer_name, date = _a.date, items = _a.items;
                // Validasi Input
                if (!customer_name || customer_name.trim().length < 2) {
                    return [2 /*return*/, res.status(400).json({ error: "Nama pelanggan tidak valid" })];
                }
                if (!date || isNaN(new Date(date).getTime())) {
                    return [2 /*return*/, res.status(400).json({ error: "Tanggal tidak valid" })];
                }
                if (!items || !Array.isArray(items) || items.length === 0) {
                    return [2 /*return*/, res.status(400).json({ error: "Item penjualan tidak boleh kosong" })];
                }
                if (!dbConnected || !pool) {
                    return [2 /*return*/, res.status(201).json({ message: "Success (Mock Mode)" })];
                }
                return [4 /*yield*/, pool.getConnection()];
            case 1:
                connection = _b.sent();
                _b.label = 2;
            case 2:
                _b.trys.push([2, 17, 19, 20]);
                return [4 /*yield*/, connection.beginTransaction()];
            case 3:
                _b.sent();
                totalRev = 0, totalCost = 0;
                // Insert parent record first to satisfy foreign key constraint in sales_items
                return [4 /*yield*/, connection.query("INSERT INTO sales (id, customer_name, date, total_revenue, total_cost, total_profit) VALUES (?, ?, ?, 0, 0, 0)", [id, customer_name, date])];
            case 4:
                // Insert parent record first to satisfy foreign key constraint in sales_items
                _b.sent();
                _i = 0, items_1 = items;
                _b.label = 5;
            case 5:
                if (!(_i < items_1.length)) return [3 /*break*/, 13];
                item = items_1[_i];
                return [4 /*yield*/, connection.query("SELECT * FROM inventory WHERE wood_type = ? AND diameter_group = ? AND length = ? AND condition_val = ?", [
                        item.wood_type,
                        item.diameter_group,
                        item.length,
                        item.condition || "Umum",
                    ])];
            case 6:
                inv = (_b.sent())[0];
                if (inv.length === 0 || inv[0].total_volume < item.volume)
                    throw new Error("Stok tidak cukup");
                cost = Number(inv[0].avg_price);
                isX = item.condition === 'X' || item.diameter_group === 'X' || item.diameter_group === '<10';
                currentVolume = Number(inv[0].total_volume);
                currentLogs = Number(inv[0].total_logs);
                logsToDeduct = 0;
                rev = 0;
                costAmount = 0;
                if (isX) {
                    logsToDeduct = Number(item.total_logs || 0);
                    rev = logsToDeduct * Number(item.sale_price_per_m3 || 0);
                    costAmount = logsToDeduct * cost;
                }
                else {
                    volumeFraction = currentVolume > 0 ? Number(item.volume) / currentVolume : 1;
                    logsToDeduct = Number(item.total_logs) || Math.round(currentLogs * volumeFraction);
                    rev = Number(item.volume) * Number(item.sale_price_per_m3 || 0);
                    costAmount = Number(item.volume) * cost;
                }
                totalRev += rev;
                totalCost += costAmount;
                // Simpan logs_deducted untuk reversal
                return [4 /*yield*/, connection.query("INSERT INTO sales_items (id, sale_id, wood_type, diameter_group, length, condition_val, volume, logs_deducted, sale_price_per_m3, cost_price_per_m3, subtotal_revenue, subtotal_cost, profit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
                        crypto.randomUUID(),
                        id,
                        item.wood_type,
                        item.diameter_group,
                        item.length,
                        item.condition || "",
                        Number(item.volume || 0),
                        logsToDeduct,
                        item.sale_price_per_m3,
                        cost,
                        rev,
                        costAmount,
                        rev - costAmount,
                    ])];
            case 7:
                // Simpan logs_deducted untuk reversal
                _b.sent();
                return [4 /*yield*/, connection.query("UPDATE inventory SET total_logs = GREATEST(0, total_logs - ?), total_volume = GREATEST(0, total_volume - ?), total_value = GREATEST(0, total_value - ?) WHERE id = ?", [logsToDeduct, Number(item.volume || 0), costAmount, inv[0].id])];
            case 8:
                _b.sent();
                if (!!isX) return [3 /*break*/, 10];
                return [4 /*yield*/, connection.query("UPDATE inventory SET total_logs = 0, total_volume = 0, total_value = 0, avg_price = 0 WHERE id = ? AND total_volume < 0.001", [inv[0].id])];
            case 9:
                _b.sent();
                return [3 /*break*/, 12];
            case 10: 
            // For X items: recalculate avg_price per batang after deduction
            return [4 /*yield*/, connection.query("UPDATE inventory SET avg_price = IF(total_logs > 0, total_value / total_logs, 0) WHERE id = ?", [inv[0].id])];
            case 11:
                // For X items: recalculate avg_price per batang after deduction
                _b.sent();
                _b.label = 12;
            case 12:
                _i++;
                return [3 /*break*/, 5];
            case 13:
                // Update the parent record with calculated totals
                totalRev = roundPrice(totalRev);
                totalCost = roundPrice(totalCost);
                return [4 /*yield*/, connection.query("UPDATE sales SET total_revenue = ?, total_cost = ?, total_profit = ? WHERE id = ?", [totalRev, totalCost, totalRev - totalCost, id])];
            case 14:
                _b.sent();
                return [4 /*yield*/, connection.commit()];
            case 15:
                _b.sent();
                return [4 /*yield*/, logAudit(req.user.id, "SALE", "Sale ".concat(id, " to ").concat(customer_name))];
            case 16:
                _b.sent();
                res.status(201).json({ message: "Success" });
                return [3 /*break*/, 20];
            case 17:
                e_9 = _b.sent();
                return [4 /*yield*/, connection.rollback()];
            case 18:
                _b.sent();
                res.status(500).json({ error: e_9.message });
                return [3 /*break*/, 20];
            case 19:
                connection.release();
                return [7 /*endfinally*/];
            case 20: return [2 /*return*/];
        }
    });
}); });
apiRouter.delete("/sales/:id", authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, connection, saleInfo, items, _i, items_2, item, logsToRestore, isX, customerName, e_10;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                id = req.params.id;
                if (!dbConnected || !pool)
                    return [2 /*return*/, res.json({ message: "Success (Mock Mode)" })];
                return [4 /*yield*/, pool.getConnection()];
            case 1:
                connection = _b.sent();
                _b.label = 2;
            case 2:
                _b.trys.push([2, 16, 18, 19]);
                return [4 /*yield*/, connection.beginTransaction()];
            case 3:
                _b.sent();
                return [4 /*yield*/, connection.query("SELECT customer_name FROM sales WHERE id = ?", [id])];
            case 4:
                saleInfo = (_b.sent())[0];
                return [4 /*yield*/, connection.query("SELECT * FROM sales_items WHERE sale_id = ?", [id])];
            case 5:
                items = (_b.sent())[0];
                _i = 0, items_2 = items;
                _b.label = 6;
            case 6:
                if (!(_i < items_2.length)) return [3 /*break*/, 12];
                item = items_2[_i];
                logsToRestore = item.logs_deducted || 1;
                isX = item.condition_val === 'X' || item.diameter_group === 'X' || item.diameter_group === '<10';
                return [4 /*yield*/, connection.query("\n        UPDATE inventory \n        SET total_logs = total_logs + ?, \n            total_volume = total_volume + ?, \n            total_value = total_value + ?\n        WHERE wood_type = ? AND diameter_group = ? AND length = ? AND condition_val = ?\n      ", [
                        logsToRestore,
                        item.volume,
                        item.subtotal_cost,
                        item.wood_type,
                        item.diameter_group,
                        item.length,
                        item.condition_val || "Umum",
                    ])];
            case 7:
                _b.sent();
                if (!isX) return [3 /*break*/, 9];
                return [4 /*yield*/, connection.query("UPDATE inventory SET avg_price = IF(total_logs > 0, total_value / total_logs, 0) WHERE wood_type = ? AND diameter_group = ? AND length = ? AND condition_val = ?", [item.wood_type, item.diameter_group, item.length, item.condition_val || "Umum"])];
            case 8:
                _b.sent();
                return [3 /*break*/, 11];
            case 9: return [4 /*yield*/, connection.query("UPDATE inventory SET avg_price = IF(total_volume > 0, total_value / total_volume, 0) WHERE wood_type = ? AND diameter_group = ? AND length = ? AND condition_val = ?", [item.wood_type, item.diameter_group, item.length, item.condition_val || "Umum"])];
            case 10:
                _b.sent();
                _b.label = 11;
            case 11:
                _i++;
                return [3 /*break*/, 6];
            case 12: return [4 /*yield*/, connection.query("DELETE FROM sales WHERE id = ?", [id])];
            case 13:
                _b.sent();
                return [4 /*yield*/, connection.commit()];
            case 14:
                _b.sent();
                customerName = ((_a = saleInfo[0]) === null || _a === void 0 ? void 0 : _a.customer_name) || "Unknown";
                return [4 /*yield*/, logAudit(req.user.id, "DELETE_SALE", "Hapus penjualan ".concat(id, " ke ").concat(customerName))];
            case 15:
                _b.sent();
                res.json({ message: "Success" });
                return [3 /*break*/, 19];
            case 16:
                e_10 = _b.sent();
                return [4 /*yield*/, connection.rollback()];
            case 17:
                _b.sent();
                res.status(500).json({ error: e_10.message });
                return [3 /*break*/, 19];
            case 18:
                connection.release();
                return [7 /*endfinally*/];
            case 19: return [2 /*return*/];
        }
    });
}); });
var dashboardCache = new Map();
var CACHE_TTL = 30000; // 30 seconds
// Health check endpoint
apiRouter.get("/health", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        res.json({
            status: dbConnected ? "connected" : "disconnected",
            serverId: SERVER_ID,
            dbHost: process.env.DB_HOST
                ? "".concat(process.env.DB_HOST.substring(0, 5), "...")
                : "not set",
        });
        return [2 /*return*/];
    });
}); });
// Combined dashboard endpoint for stability
apiRouter.get("/dashboard", authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var cacheKey, cached, queries, results, data, e_11;
    var _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 4, , 5]);
                cacheKey = "global_dashboard_v2";
                cached = dashboardCache.get(cacheKey);
                if (cached && Date.now() - cached.timestamp < 15000) {
                    return [2 /*return*/, res.json(cached.data)];
                }
                if (!(dbConnected && pool)) return [3 /*break*/, 2];
                queries = [
                    pool.query("SELECT COALESCE(SUM(total_volume), 0) as total_volume, COALESCE(SUM(total_value), 0) as total_value FROM inventory"),
                    pool.query("SELECT COALESCE(SUM(total_volume), 0) as total_volume, COALESCE(SUM(total_value), 0) as total_value FROM wood_sets"),
                    pool.query("SELECT COALESCE(SUM(total_revenue), 0) as total_revenue, COALESCE(SUM(total_profit), 0) as total_profit FROM sales"),
                    pool.query("SELECT COALESCE(SUM(volume), 0) as total_volume FROM sales_items"),
                    pool.query("SELECT COALESCE(SUM(amount), 0) as total_expenses FROM expenses"),
                    pool.query("SELECT DATE_FORMAT(date, '%b') as month, COALESCE(SUM(total_volume), 0) as purchase_volume FROM wood_sets GROUP BY month ORDER BY MIN(date)"),
                    pool.query("SELECT DATE_FORMAT(date, '%b') as month, COALESCE(SUM(total_revenue), 0) as sales_revenue, COALESCE(SUM(total_profit), 0) as sales_profit FROM sales GROUP BY month ORDER BY MIN(date)"),
                    pool.query("SELECT DATE_FORMAT(date, '%b') as month, COALESCE(SUM(amount), 0) as expense_amount FROM expenses GROUP BY month ORDER BY MIN(date)"),
                    pool.query("SELECT wood_type, COALESCE(SUM(total_volume), 0) as volume FROM inventory WHERE total_logs > 0 GROUP BY wood_type"),
                ];
                return [4 /*yield*/, Promise.all(queries)];
            case 1:
                results = _d.sent();
                data = {
                    inventory: results[0][0][0] || { total_volume: 0, total_value: 0 },
                    purchases: results[1][0][0] || { total_volume: 0, total_value: 0 },
                    sales: {
                        total_revenue: ((_a = results[2][0][0]) === null || _a === void 0 ? void 0 : _a.total_revenue) || 0,
                        total_profit: ((_b = results[2][0][0]) === null || _b === void 0 ? void 0 : _b.total_profit) || 0,
                        total_volume: ((_c = results[3][0][0]) === null || _c === void 0 ? void 0 : _c.total_volume) || 0,
                    },
                    expenses: results[4][0][0] || { total_expenses: 0 },
                    trends: {
                        purchases: results[5][0].length > 0
                            ? results[5][0]
                            : [{ month: "Jan", purchase_volume: 0 }],
                        sales: results[6][0].length > 0
                            ? results[6][0]
                            : [{ month: "Jan", sales_revenue: 0, sales_profit: 0 }],
                        expenses: results[7][0].length > 0
                            ? results[7][0]
                            : [{ month: "Jan", expense_amount: 0 }],
                    },
                    stockComposition: results[8][0],
                };
                dashboardCache.set(cacheKey, { data: data, timestamp: Date.now() });
                res.json(data);
                return [3 /*break*/, 3];
            case 2:
                console.warn("Dashboard request while DB disconnected. ServerID: ".concat(SERVER_ID));
                res.json({
                    inventory: { total_volume: 0, total_value: 0 },
                    purchases: { total_volume: 0, total_value: 0 },
                    sales: { total_revenue: 0, total_profit: 0, total_volume: 0 },
                    expenses: { total_expenses: 0 },
                    trends: { purchases: [], sales: [], expenses: [] },
                    stockComposition: [],
                });
                _d.label = 3;
            case 3: return [3 /*break*/, 5];
            case 4:
                e_11 = _d.sent();
                console.error("Dashboard error:", e_11);
                res.status(500).json({ error: e_11.message });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// Suppliers CRUD
apiRouter.get("/suppliers", authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var rows;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!(dbConnected && pool)) return [3 /*break*/, 2];
                return [4 /*yield*/, pool.query("SELECT * FROM suppliers ORDER BY name")];
            case 1:
                rows = (_a.sent())[0];
                res.json(rows);
                return [3 /*break*/, 3];
            case 2:
                res.json([]);
                _a.label = 3;
            case 3: return [2 /*return*/];
        }
    });
}); });
apiRouter.post("/suppliers", authenticateToken, apiLimiter, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, id, name, phone, address;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, id = _a.id, name = _a.name, phone = _a.phone, address = _a.address;
                // FIX #4: Input sanitization
                try {
                    if (!name || name.trim().length < 2) {
                        return [2 /*return*/, res.status(400).json({ error: "Nama supplier tidak valid" })];
                    }
                    name = sanitizeString(name, 255);
                }
                catch (e) {
                    return [2 /*return*/, res.status(400).json({ error: "Input tidak valid" })];
                }
                if (!(dbConnected && pool)) return [3 /*break*/, 3];
                return [4 /*yield*/, pool.query("\n      INSERT INTO suppliers (id, name, phone, address) \n      VALUES (?, ?, ?, ?)\n      ON DUPLICATE KEY UPDATE name = VALUES(name), phone = VALUES(phone), address = VALUES(address)\n    ", [id, name, phone, address])];
            case 1:
                _b.sent();
                return [4 /*yield*/, logAudit(req.user.id, "UPSERT_SUPPLIER", "Tambah/Edit supplier: ".concat(name))];
            case 2:
                _b.sent();
                _b.label = 3;
            case 3:
                res.status(201).json({ id: id });
                return [2 /*return*/];
        }
    });
}); });
apiRouter.delete("/suppliers/:id", authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, rows, name_1;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                id = req.params.id;
                if (!(dbConnected && pool)) return [3 /*break*/, 4];
                return [4 /*yield*/, pool.query("SELECT name FROM suppliers WHERE id = ?", [id])];
            case 1:
                rows = (_b.sent())[0];
                name_1 = ((_a = rows[0]) === null || _a === void 0 ? void 0 : _a.name) || id;
                return [4 /*yield*/, pool.query("DELETE FROM suppliers WHERE id = ?", [id])];
            case 2:
                _b.sent();
                // ✅ Issue #9: Audit delete supplier
                return [4 /*yield*/, logAudit(req.user.id, "DELETE_SUPPLIER", "Hapus supplier: ".concat(name_1, " (ID: ").concat(id, ")"))];
            case 3:
                // ✅ Issue #9: Audit delete supplier
                _b.sent();
                _b.label = 4;
            case 4:
                res.json({ message: "Success" });
                return [2 /*return*/];
        }
    });
}); });
// Customers CRUD
apiRouter.get("/customers", authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var rows;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!(dbConnected && pool)) return [3 /*break*/, 2];
                return [4 /*yield*/, pool.query("SELECT * FROM customers ORDER BY name")];
            case 1:
                rows = (_a.sent())[0];
                res.json(rows);
                return [3 /*break*/, 3];
            case 2:
                res.json([]);
                _a.label = 3;
            case 3: return [2 /*return*/];
        }
    });
}); });
apiRouter.post("/customers", authenticateToken, apiLimiter, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, id, name, phone, address;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, id = _a.id, name = _a.name, phone = _a.phone, address = _a.address;
                // FIX #4: Input sanitization
                try {
                    if (!name || name.trim().length < 2) {
                        return [2 /*return*/, res.status(400).json({ error: "Nama pelanggan tidak valid" })];
                    }
                    name = sanitizeString(name, 255);
                }
                catch (e) {
                    return [2 /*return*/, res.status(400).json({ error: "Input tidak valid" })];
                }
                if (!(dbConnected && pool)) return [3 /*break*/, 3];
                return [4 /*yield*/, pool.query("\n      INSERT INTO customers (id, name, phone, address) \n      VALUES (?, ?, ?, ?)\n      ON DUPLICATE KEY UPDATE name = VALUES(name), phone = VALUES(phone), address = VALUES(address)\n    ", [id, name, phone, address])];
            case 1:
                _b.sent();
                return [4 /*yield*/, logAudit(req.user.id, "UPSERT_CUSTOMER", "Tambah/Edit pelanggan: ".concat(name))];
            case 2:
                _b.sent();
                _b.label = 3;
            case 3:
                res.status(201).json({ id: id });
                return [2 /*return*/];
        }
    });
}); });
apiRouter.delete("/customers/:id", authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, rows, name_2;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                id = req.params.id;
                if (!(dbConnected && pool)) return [3 /*break*/, 4];
                return [4 /*yield*/, pool.query("SELECT name FROM customers WHERE id = ?", [id])];
            case 1:
                rows = (_b.sent())[0];
                name_2 = ((_a = rows[0]) === null || _a === void 0 ? void 0 : _a.name) || id;
                return [4 /*yield*/, pool.query("DELETE FROM customers WHERE id = ?", [id])];
            case 2:
                _b.sent();
                // ✅ Issue #9: Audit delete customer
                return [4 /*yield*/, logAudit(req.user.id, "DELETE_CUSTOMER", "Hapus pelanggan: ".concat(name_2, " (ID: ").concat(id, ")"))];
            case 3:
                // ✅ Issue #9: Audit delete customer
                _b.sent();
                _b.label = 4;
            case 4:
                res.json({ message: "Success" });
                return [2 /*return*/];
        }
    });
}); });
// FIX #6: Export All Data for Backup with strict rate limiting
apiRouter.get("/export-all", authenticateToken, exportLimiter, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var users, sets, categories, logs, inventory, sales, salesItems, expenses, suppliers, customers, audit, error_8;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (req.user.role !== "owner")
                    return [2 /*return*/, res.status(403).json({ error: "Unauthorized" })];
                _a.label = 1;
            case 1:
                _a.trys.push([1, 16, , 17]);
                if (!(dbConnected && pool)) return [3 /*break*/, 14];
                return [4 /*yield*/, pool.query("SELECT id, username, role, full_name FROM users")];
            case 2:
                users = (_a.sent())[0];
                return [4 /*yield*/, pool.query("SELECT * FROM wood_sets")];
            case 3:
                sets = (_a.sent())[0];
                return [4 /*yield*/, pool.query("SELECT * FROM wood_categories")];
            case 4:
                categories = (_a.sent())[0];
                return [4 /*yield*/, pool.query("SELECT * FROM log_entries")];
            case 5:
                logs = (_a.sent())[0];
                return [4 /*yield*/, pool.query("SELECT * FROM inventory")];
            case 6:
                inventory = (_a.sent())[0];
                return [4 /*yield*/, pool.query("SELECT * FROM sales")];
            case 7:
                sales = (_a.sent())[0];
                return [4 /*yield*/, pool.query("SELECT * FROM sales_items")];
            case 8:
                salesItems = (_a.sent())[0];
                return [4 /*yield*/, pool.query("SELECT * FROM expenses")];
            case 9:
                expenses = (_a.sent())[0];
                return [4 /*yield*/, pool.query("SELECT * FROM suppliers")];
            case 10:
                suppliers = (_a.sent())[0];
                return [4 /*yield*/, pool.query("SELECT * FROM customers")];
            case 11:
                customers = (_a.sent())[0];
                return [4 /*yield*/, pool.query("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 1000")];
            case 12:
                audit = (_a.sent())[0];
                res.json({
                    export_date: new Date().toISOString(),
                    data: {
                        users: users,
                        sets: sets,
                        categories: categories,
                        logs: logs,
                        inventory: inventory,
                        sales: sales,
                        salesItems: salesItems,
                        expenses: expenses,
                        suppliers: suppliers,
                        customers: customers,
                        audit: audit,
                    },
                });
                return [4 /*yield*/, logAudit(req.user.id, "BACKUP_EXPORT", "Ekspor database lengkap untuk backup")];
            case 13:
                _a.sent();
                return [3 /*break*/, 15];
            case 14:
                res.json({ message: "Mock data cannot be exported fully." });
                _a.label = 15;
            case 15: return [3 /*break*/, 17];
            case 16:
                error_8 = _a.sent();
                res.status(500).json({ error: error_8.message });
                return [3 /*break*/, 17];
            case 17: return [2 /*return*/];
        }
    });
}); });
// Expenses CRUD
apiRouter.get("/expenses", authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var rows, formattedRows;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!(dbConnected && pool)) return [3 /*break*/, 2];
                return [4 /*yield*/, pool.query("SELECT * FROM expenses ORDER BY date DESC")];
            case 1:
                rows = (_a.sent())[0];
                formattedRows = rows.map(function (e) {
                    var d = e.date instanceof Date ? e.date : new Date(e.date);
                    var dateStr = "".concat(d.getFullYear(), "-").concat(String(d.getMonth() + 1).padStart(2, "0"), "-").concat(String(d.getDate()).padStart(2, "0"));
                    return __assign(__assign({}, e), { date: dateStr });
                });
                res.json(formattedRows);
                return [3 /*break*/, 3];
            case 2:
                res.json([]);
                _a.label = 3;
            case 3: return [2 /*return*/];
        }
    });
}); });
apiRouter.post("/expenses", authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, id, category, description, amount, date;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, id = _a.id, category = _a.category, description = _a.description, amount = _a.amount, date = _a.date;
                if (!category || !amount || !date)
                    return [2 /*return*/, res.status(400).json({ error: "Data pengeluaran tidak lengkap" })];
                if (!(dbConnected && pool)) return [3 /*break*/, 3];
                return [4 /*yield*/, pool.query("INSERT INTO expenses (id, category, description, amount, date) VALUES (?, ?, ?, ?, ?)", [id, category, description, amount, date])];
            case 1:
                _b.sent();
                return [4 /*yield*/, logAudit(req.user.id, "EXPENSE", "Tambah pengeluaran ".concat(category, ": Rp").concat(amount))];
            case 2:
                _b.sent();
                _b.label = 3;
            case 3:
                res.status(201).json({ id: id });
                return [2 /*return*/];
        }
    });
}); });
// ✅ Issue #11: Edit pengeluaran
apiRouter.put("/expenses/:id", authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, category, description, amount, date;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                id = req.params.id;
                _a = req.body, category = _a.category, description = _a.description, amount = _a.amount, date = _a.date;
                if (!category || !amount || !date)
                    return [2 /*return*/, res.status(400).json({ error: "Data pengeluaran tidak lengkap" })];
                if (!(dbConnected && pool)) return [3 /*break*/, 3];
                return [4 /*yield*/, pool.query("UPDATE expenses SET category = ?, description = ?, amount = ?, date = ? WHERE id = ?", [category, description, amount, date, id])];
            case 1:
                _b.sent();
                return [4 /*yield*/, logAudit(req.user.id, "EDIT_EXPENSE", "Edit pengeluaran ".concat(category, ": Rp").concat(amount))];
            case 2:
                _b.sent();
                _b.label = 3;
            case 3:
                res.json({ message: "Updated" });
                return [2 /*return*/];
        }
    });
}); });
// ✅ Issue #11: Hapus pengeluaran
apiRouter.delete("/expenses/:id", authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, rows, exp;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                id = req.params.id;
                if (!(dbConnected && pool)) return [3 /*break*/, 4];
                return [4 /*yield*/, pool.query("SELECT category, amount FROM expenses WHERE id = ?", [id])];
            case 1:
                rows = (_a.sent())[0];
                exp = rows[0];
                return [4 /*yield*/, pool.query("DELETE FROM expenses WHERE id = ?", [id])];
            case 2:
                _a.sent();
                return [4 /*yield*/, logAudit(req.user.id, "DELETE_EXPENSE", "Hapus pengeluaran ".concat(exp === null || exp === void 0 ? void 0 : exp.category, ": Rp").concat(exp === null || exp === void 0 ? void 0 : exp.amount))];
            case 3:
                _a.sent();
                _a.label = 4;
            case 4:
                res.json({ message: "Success" });
                return [2 /*return*/];
        }
    });
}); });
// User Management
apiRouter.get("/users", authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var rows;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (req.user.role !== "owner")
                    return [2 /*return*/, res.status(403).json({ error: "Unauthorized" })];
                if (!(dbConnected && pool)) return [3 /*break*/, 2];
                return [4 /*yield*/, pool.query("SELECT id, username, role, full_name, email, created_at FROM users ORDER BY created_at DESC")];
            case 1:
                rows = (_a.sent())[0];
                res.json(rows);
                return [3 /*break*/, 3];
            case 2:
                res.json([]);
                _a.label = 3;
            case 3: return [2 /*return*/];
        }
    });
}); });
apiRouter.post("/users", authenticateToken, apiLimiter, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, username, password, full_name, email, hashed, emailVal, e_12, msg;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (req.user.role !== "owner")
                    return [2 /*return*/, res.status(403).json({ error: "Unauthorized" })];
                _a = req.body, username = _a.username, password = _a.password, full_name = _a.full_name, email = _a.email;
                if (!username || !password || !full_name) {
                    return [2 /*return*/, res.status(400).json({ error: "Missing fields" })];
                }
                // FIX #2 & #3: Validate email and password
                if (email && !isValidEmail(email)) {
                    return [2 /*return*/, res.status(400).json({ error: "Format email tidak valid" })];
                }
                if (!isValidPassword(password)) {
                    return [2 /*return*/, res.status(400).json({
                            error: "Password harus minimal 8 karakter dengan huruf besar, huruf kecil, angka, dan simbol (!@#$%^&*)",
                        })];
                }
                if (!(dbConnected && pool)) return [3 /*break*/, 7];
                _b.label = 1;
            case 1:
                _b.trys.push([1, 5, , 6]);
                return [4 /*yield*/, bcrypt.hash(password, 10)];
            case 2:
                hashed = _b.sent();
                emailVal = (email && email.trim() !== "") ? email.trim() : null;
                return [4 /*yield*/, pool.query("INSERT INTO users (username, password, role, full_name, email) VALUES (?, ?, 'mandor', ?, ?)", [username, hashed, full_name, emailVal])];
            case 3:
                _b.sent();
                return [4 /*yield*/, logAudit(req.user.id, "USER_CREATED", "Created mandor account: ".concat(username))];
            case 4:
                _b.sent();
                res.status(201).json({ message: "User created" });
                return [3 /*break*/, 6];
            case 5:
                e_12 = _b.sent();
                if (e_12.code === "ER_DUP_ENTRY") {
                    msg = String(e_12.message || '');
                    if (msg.includes('email') || msg.includes('idx_user_email')) {
                        return [2 /*return*/, res.status(400).json({ error: "Email sudah digunakan oleh akun lain" })];
                    }
                    return [2 /*return*/, res.status(400).json({ error: "Username sudah digunakan" })];
                }
                res.status(500).json({ error: e_12.message });
                return [3 /*break*/, 6];
            case 6: return [3 /*break*/, 8];
            case 7:
                res.status(201).json({ message: "Mock user created" });
                _b.label = 8;
            case 8: return [2 /*return*/];
        }
    });
}); });
apiRouter.put("/users/:id", authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, username, full_name, email, password, emailVal, hashed, e_13, msg;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (req.user.role !== "owner")
                    return [2 /*return*/, res.status(403).json({ error: "Unauthorized" })];
                id = req.params.id;
                _a = req.body, username = _a.username, full_name = _a.full_name, email = _a.email, password = _a.password;
                if (!(dbConnected && pool)) return [3 /*break*/, 11];
                _b.label = 1;
            case 1:
                _b.trys.push([1, 9, , 10]);
                emailVal = (email && email.trim() !== "") ? email.trim() : null;
                if (!(password && password.trim() !== "")) return [3 /*break*/, 5];
                return [4 /*yield*/, bcrypt.hash(password, 10)];
            case 2:
                hashed = _b.sent();
                return [4 /*yield*/, pool.query("UPDATE users SET username = ?, full_name = ?, email = ?, password = ? WHERE id = ? AND role = 'mandor'", [username, full_name, emailVal, hashed, id])];
            case 3:
                _b.sent();
                return [4 /*yield*/, logAudit(req.user.id, "USER_UPDATED", "Updated mandor account & password: ".concat(username))];
            case 4:
                _b.sent();
                return [3 /*break*/, 8];
            case 5: return [4 /*yield*/, pool.query("UPDATE users SET username = ?, full_name = ?, email = ? WHERE id = ? AND role = 'mandor'", [username, full_name, emailVal, id])];
            case 6:
                _b.sent();
                return [4 /*yield*/, logAudit(req.user.id, "USER_UPDATED", "Updated mandor account: ".concat(username))];
            case 7:
                _b.sent();
                _b.label = 8;
            case 8:
                res.json({ message: "User updated" });
                return [3 /*break*/, 10];
            case 9:
                e_13 = _b.sent();
                if (e_13.code === "ER_DUP_ENTRY") {
                    msg = String(e_13.message || '');
                    if (msg.includes('email') || msg.includes('idx_user_email')) {
                        return [2 /*return*/, res.status(400).json({ error: "Email sudah digunakan oleh akun lain" })];
                    }
                    return [2 /*return*/, res.status(400).json({ error: "Username sudah digunakan" })];
                }
                res.status(500).json({ error: e_13.message });
                return [3 /*break*/, 10];
            case 10: return [3 /*break*/, 12];
            case 11:
                res.json({ message: "Mock user updated" });
                _b.label = 12;
            case 12: return [2 /*return*/];
        }
    });
}); });
apiRouter.delete("/users/:id", authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (req.user.role !== "owner")
                    return [2 /*return*/, res.status(403).json({ error: "Unauthorized" })];
                id = req.params.id;
                if (!(dbConnected && pool)) return [3 /*break*/, 3];
                return [4 /*yield*/, pool.query("DELETE FROM users WHERE id = ? AND role = 'mandor'", [
                        id,
                    ])];
            case 1:
                _a.sent();
                return [4 /*yield*/, logAudit(req.user.id, "USER_DELETED", "Deleted mandor account ID: ".concat(id))];
            case 2:
                _a.sent();
                res.json({ message: "User deleted" });
                return [3 /*break*/, 4];
            case 3:
                res.json({ message: "Mock user deleted" });
                _a.label = 4;
            case 4: return [2 /*return*/];
        }
    });
}); });
apiRouter.put("/profile", authenticateToken, apiLimiter, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, username, full_name, email, current_password, new_password, userId, emailVal, users, user, validPass, hashed, updatedUser, token, e_14, msg;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, username = _a.username, full_name = _a.full_name, email = _a.email, current_password = _a.current_password, new_password = _a.new_password;
                userId = req.user.id;
                // FIX #2: Validate email
                if (email && !isValidEmail(email)) {
                    return [2 /*return*/, res.status(400).json({ error: "Format email tidak valid" })];
                }
                if (!(dbConnected && pool)) return [3 /*break*/, 14];
                _b.label = 1;
            case 1:
                _b.trys.push([1, 12, , 13]);
                emailVal = (email && email.trim() !== "") ? email.trim() : null;
                if (!(new_password && new_password.trim() !== "")) return [3 /*break*/, 7];
                if (!current_password)
                    return [2 /*return*/, res
                            .status(400)
                            .json({
                            error: "Password saat ini harus diisi untuk mengubah password.",
                        })];
                // FIX #3: Validate new password complexity
                if (!isValidPassword(new_password)) {
                    return [2 /*return*/, res.status(400).json({
                            error: "Password harus minimal 8 karakter dengan huruf besar, huruf kecil, angka, dan simbol (!@#$%^&*)",
                        })];
                }
                return [4 /*yield*/, pool.query("SELECT * FROM users WHERE id = ?", [userId])];
            case 2:
                users = (_b.sent())[0];
                if (users.length === 0)
                    return [2 /*return*/, res.status(404).json({ error: "User not found" })];
                user = users[0];
                return [4 /*yield*/, bcrypt.compare(current_password, user.password)];
            case 3:
                validPass = _b.sent();
                // Fallback for plain text password fix if they still have it
                if (!validPass && current_password === user.password)
                    validPass = true;
                if (!validPass)
                    return [2 /*return*/, res.status(401).json({ error: "Password saat ini salah." })];
                return [4 /*yield*/, bcrypt.hash(new_password, 10)];
            case 4:
                hashed = _b.sent();
                return [4 /*yield*/, pool.query("UPDATE users SET username = ?, full_name = ?, email = ?, password = ? WHERE id = ?", [username, full_name, emailVal, hashed, userId])];
            case 5:
                _b.sent();
                return [4 /*yield*/, logAudit(userId, "PROFILE_UPDATED", "Updated profile and password")];
            case 6:
                _b.sent();
                return [3 /*break*/, 10];
            case 7: return [4 /*yield*/, pool.query("UPDATE users SET username = ?, full_name = ?, email = ? WHERE id = ?", [username, full_name, emailVal, userId])];
            case 8:
                _b.sent();
                return [4 /*yield*/, logAudit(userId, "PROFILE_UPDATED", "Updated profile")];
            case 9:
                _b.sent();
                _b.label = 10;
            case 10: return [4 /*yield*/, pool.query("SELECT id, username, role, full_name, email FROM users WHERE id = ?", [userId])];
            case 11:
                updatedUser = (_b.sent())[0];
                token = jwt.sign({
                    id: updatedUser[0].id,
                    username: updatedUser[0].username,
                    role: updatedUser[0].role,
                    email: updatedUser[0].email,
                }, JWT_SECRET, { expiresIn: "24h" });
                res.json({
                    message: "Profile updated",
                    user: __assign(__assign({}, updatedUser[0]), { token: token }),
                });
                return [3 /*break*/, 13];
            case 12:
                e_14 = _b.sent();
                if (e_14.code === "ER_DUP_ENTRY") {
                    msg = String(e_14.message || '');
                    if (msg.includes('email') || msg.includes('idx_user_email')) {
                        return [2 /*return*/, res.status(400).json({ error: "Email sudah digunakan oleh akun lain" })];
                    }
                    return [2 /*return*/, res.status(400).json({ error: "Username sudah digunakan" })];
                }
                res.status(500).json({ error: e_14.message });
                return [3 /*break*/, 13];
            case 13: return [3 /*break*/, 15];
            case 14:
                res.json({ message: "Mock profile updated" });
                _b.label = 15;
            case 15: return [2 /*return*/];
        }
    });
}); });
// Audit Logs
apiRouter.get("/audit-logs", authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var rows;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (req.user.role !== "owner")
                    return [2 /*return*/, res.status(403).json({ error: "Unauthorized" })];
                if (!(dbConnected && pool)) return [3 /*break*/, 2];
                return [4 /*yield*/, pool.query("SELECT a.*, COALESCE(u.username, 'System') as username FROM audit_logs a LEFT JOIN users u ON a.user_id = u.id ORDER BY a.created_at DESC LIMIT 100")];
            case 1:
                rows = (_a.sent())[0];
                res.json(rows);
                return [3 /*break*/, 3];
            case 2:
                res.json([]);
                _a.label = 3;
            case 3: return [2 /*return*/];
        }
    });
}); });
// Catch-all for undefined API routes to prevent fall-through to Vite
apiRouter.all("*", function (req, res) {
    console.log("[".concat(SERVER_ID, "] API 404: ").concat(req.method, " ").concat(req.originalUrl));
    res
        .status(404)
        .json({ error: "API endpoint ".concat(req.method, " ").concat(req.originalUrl, " not found") });
});
// app.use("/api", apiRouter); // Moved inside startServer for better order control
// Global error handler
app.use(function (err, req, res, next) {
    console.error("[".concat(SERVER_ID, "] Global Error:"), err);
    var isApiRequest = req.originalUrl.startsWith("/api") || req.url.startsWith("/api");
    if (isApiRequest) {
        return res.status(500).json({
            error: err.message || "Internal Server Error",
            path: req.originalUrl,
            server_id: SERVER_ID,
        });
    }
    next(err);
});
// Register API routes
console.log("[".concat(SERVER_ID, "] Registering API routes at /api"));
app.use("/api", function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var e_15;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!(!dbConnected || !pool)) return [3 /*break*/, 4];
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, initDB()];
            case 2:
                _a.sent();
                return [3 /*break*/, 4];
            case 3:
                e_15 = _a.sent();
                console.error("Delayed DB Init Error:", e_15);
                return [3 /*break*/, 4];
            case 4:
                res.setHeader("X-Backend-Server", SERVER_ID);
                res.setHeader("X-API-Request", "true");
                res.setHeader("Cache-Control", "no-store");
                next();
                return [2 /*return*/];
        }
    });
}); }, apiRouter);
function startServer() {
    return __awaiter(this, void 0, void 0, function () {
        var createViteServer, vite, server, shutdown;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("[".concat(SERVER_ID, "] Starting server..."));
                    // Ensure DB init is started
                    initDB().catch(function (err) { return console.error("DB Init Error:", err); });
                    if (!(process.env.NODE_ENV !== "production" && !process.env.VERCEL)) return [3 /*break*/, 3];
                    return [4 /*yield*/, import("vite")];
                case 1:
                    createViteServer = (_a.sent()).createServer;
                    return [4 /*yield*/, createViteServer({
                            server: { middlewareMode: true },
                            appType: "spa",
                        })];
                case 2:
                    vite = _a.sent();
                    app.use(vite.middlewares);
                    return [3 /*break*/, 4];
                case 3:
                    if (process.env.NODE_ENV === "production") {
                        // Cache control for static assets (logo, etc.)
                        app.use(function (req, res, next) {
                            if (req.url.match(/\.(png|jpg|jpeg|gif|ico|svg|webp)$/)) {
                                res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
                            }
                            next();
                        });
                        app.use(express.static(path.join(__dirname, "dist")));
                        app.get("*", function (req, res) { return res.sendFile(path.resolve("dist/index.html")); });
                    }
                    _a.label = 4;
                case 4:
                    server = app.listen(PORT, "0.0.0.0", function () {
                        console.log("\uD83D\uDE80 Server running on http://localhost:".concat(PORT));
                    });
                    shutdown = function () { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    console.log("\nShutting down gracefully...");
                                    if (!pool) return [3 /*break*/, 2];
                                    return [4 /*yield*/, pool.end()];
                                case 1:
                                    _a.sent();
                                    console.log("MySQL pool closed.");
                                    _a.label = 2;
                                case 2:
                                    server.close(function () {
                                        console.log("Server closed.");
                                        process.exit(0);
                                    });
                                    return [2 /*return*/];
                            }
                        });
                    }); };
                    process.on("SIGINT", shutdown);
                    process.on("SIGTERM", shutdown);
                    return [2 /*return*/];
            }
        });
    });
}
export default app;
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
    startServer();
}
