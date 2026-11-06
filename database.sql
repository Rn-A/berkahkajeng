-- Berkah Kajeng Database Schema
-- Generated for MySQL (XAMPP / MariaDB)

CREATE DATABASE IF NOT EXISTS berkah_kajeng;
USE berkah_kajeng;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY, 
  username VARCHAR(50) UNIQUE NOT NULL, 
  password VARCHAR(255) NOT NULL, 
  role ENUM('owner', 'mandor') NOT NULL, 
  full_name VARCHAR(100), 
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default Users
-- owner  -> password: admin123
-- mandor -> password: mandor123
INSERT IGNORE INTO users (username, password, role, full_name) VALUES 
('owner',  '$2b$10$YKv96l1S4BcPkRiLlJVPWOx.DXy9F7Lsawhu9v62rGlulpMyKZAva', 'owner',  'Pemilik Pangkalan'),
('mandor', '$2b$10$ieXeiuTC1ElVSM1OYNCkauhimHcvqmcAVKbzFSqI9A15vvuZcr0.C', 'mandor', 'Mandor Lapangan');

-- 2. Wood Sets (Purchases)
CREATE TABLE IF NOT EXISTS wood_sets (
  id VARCHAR(36) PRIMARY KEY, 
  supplierName VARCHAR(255), 
  date DATE, 
  total_volume FLOAT DEFAULT 0, 
  total_value DECIMAL(15, 2) DEFAULT 0, 
  synced BOOLEAN DEFAULT FALSE,
  payment_status VARCHAR(20) DEFAULT 'lunas',
  amount_paid DECIMAL(15, 2) DEFAULT 0,
  due_date DATE NULL
);

-- 3. Wood Categories
CREATE TABLE IF NOT EXISTS wood_categories (
  id VARCHAR(36) PRIMARY KEY, 
  set_id VARCHAR(36), 
  woodType VARCHAR(100), 
  length FLOAT, 
  condition_val VARCHAR(50), 
  pricePerM3 DECIMAL(15, 2), 
  FOREIGN KEY (set_id) REFERENCES wood_sets(id) ON DELETE CASCADE
);

-- 4. Log Entries
CREATE TABLE IF NOT EXISTS log_entries (
  id VARCHAR(36) PRIMARY KEY, 
  category_id VARCHAR(36), 
  diameter INT, 
  volume FLOAT, 
  FOREIGN KEY (category_id) REFERENCES wood_categories(id) ON DELETE CASCADE
);

-- 5. Inventory (Stock)
CREATE TABLE IF NOT EXISTS inventory (
  id INT AUTO_INCREMENT PRIMARY KEY, 
  wood_type VARCHAR(100), 
  diameter_group VARCHAR(50), 
  length FLOAT, 
  total_logs INT DEFAULT 0, 
  total_volume FLOAT DEFAULT 0, 
  avg_price DECIMAL(15, 2) DEFAULT 0, 
  total_value DECIMAL(15, 2) DEFAULT 0, 
  UNIQUE KEY (wood_type, diameter_group, length)
);

-- 6. Sales
CREATE TABLE IF NOT EXISTS sales (
  id VARCHAR(36) PRIMARY KEY, 
  customer_name VARCHAR(255), 
  date DATE, 
  total_revenue DECIMAL(15, 2) DEFAULT 0, 
  total_cost DECIMAL(15, 2) DEFAULT 0, 
  total_profit DECIMAL(15, 2) DEFAULT 0,
  payment_status VARCHAR(20) DEFAULT 'lunas',
  amount_paid DECIMAL(15, 2) DEFAULT 0,
  due_date DATE NULL
);

-- 7. Sales Items
CREATE TABLE IF NOT EXISTS sales_items (
  id VARCHAR(36) PRIMARY KEY, 
  sale_id VARCHAR(36), 
  wood_type VARCHAR(100), 
  diameter_group VARCHAR(50), 
  length FLOAT, 
  volume FLOAT, 
  sale_price_per_m3 DECIMAL(15, 2), 
  cost_price_per_m3 DECIMAL(15, 2), 
  subtotal_revenue DECIMAL(15, 2), 
  subtotal_cost DECIMAL(15, 2), 
  profit DECIMAL(15, 2), 
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
);

-- 8. Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id VARCHAR(36) PRIMARY KEY, 
  name VARCHAR(255) NOT NULL, 
  phone VARCHAR(20), 
  address TEXT, 
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Customers
CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(36) PRIMARY KEY, 
  name VARCHAR(255) NOT NULL, 
  phone VARCHAR(20), 
  address TEXT, 
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id VARCHAR(36) PRIMARY KEY, 
  category VARCHAR(100) NOT NULL, 
  description TEXT, 
  amount DECIMAL(15, 2) NOT NULL, 
  date DATE NOT NULL, 
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY, 
  user_id INT, 
  action VARCHAR(255), 
  details TEXT, 
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 12. Wood Types
CREATE TABLE IF NOT EXISTS wood_types (
  name VARCHAR(100) PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. Password Resets
CREATE TABLE IF NOT EXISTS password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL
);

-- 14. Debt Payments (Cicilan Hutang Supplier & Piutang Pelanggan)
CREATE TABLE IF NOT EXISTS debt_payments (
  id VARCHAR(36) PRIMARY KEY,
  reference_type ENUM('purchase', 'sale') NOT NULL,
  reference_id VARCHAR(36) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  payment_date DATE NOT NULL,
  notes VARCHAR(255),
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15. Employees (Master Data Karyawan)
CREATE TABLE IF NOT EXISTS employees (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  position VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  daily_wage DECIMAL(15, 2) NOT NULL DEFAULT 0,
  status VARCHAR(20) DEFAULT 'aktif',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 16. Attendance (Presensi Harian Karyawan)
CREATE TABLE IF NOT EXISTS attendance (
  id VARCHAR(36) PRIMARY KEY,
  employee_id VARCHAR(36) NOT NULL,
  date DATE NOT NULL,
  status ENUM('hadir', 'setengah_hari', 'izin', 'alfa') NOT NULL DEFAULT 'hadir',
  overtime_pay DECIMAL(15, 2) DEFAULT 0,
  cash_advance DECIMAL(15, 2) DEFAULT 0,
  notes VARCHAR(255),
  recorded_by VARCHAR(100),
  payroll_id VARCHAR(36) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_emp_date (employee_id, date),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- 17. Payrolls (Pencairan Penggajian Karyawan)
CREATE TABLE IF NOT EXISTS payrolls (
  id VARCHAR(36) PRIMARY KEY,
  employee_id VARCHAR(36) NOT NULL,
  employee_name VARCHAR(255) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_hadir INT DEFAULT 0,
  total_setengah_hari INT DEFAULT 0,
  daily_wage DECIMAL(15, 2) DEFAULT 0,
  base_salary DECIMAL(15, 2) DEFAULT 0,
  total_overtime DECIMAL(15, 2) DEFAULT 0,
  total_deduction DECIMAL(15, 2) DEFAULT 0,
  net_salary DECIMAL(15, 2) NOT NULL,
  payment_date DATE NOT NULL,
  expense_id VARCHAR(36) NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);
