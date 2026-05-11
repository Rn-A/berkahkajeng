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
  synced BOOLEAN DEFAULT FALSE
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
  total_profit DECIMAL(15, 2) DEFAULT 0
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
