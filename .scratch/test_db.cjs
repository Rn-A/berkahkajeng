const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function test() {
  console.log("Testing connection with settings:");
  console.log("DB Host:", process.env.DB_HOST);
  console.log("DB Port:", process.env.DB_PORT);
  console.log("DB User:", process.env.DB_USER);
  console.log("DB Name:", process.env.DB_NAME);
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || "4000"),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'berkah_kajeng',
      ssl: process.env.DB_HOST?.includes('tidbcloud.com') ? {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: false
      } : undefined
    });
    console.log("✅ Successfully connected to remote TiDB Cloud database!");
    const [tables] = await conn.query("SHOW TABLES");
    console.log("Tables in database:", tables.map(t => Object.values(t)[0]));
    const [rows] = await conn.query("SELECT COUNT(*) as count FROM users");
    console.log("Users count:", rows[0].count);
    await conn.end();
  } catch (err) {
    console.error("❌ Connection failed:", err.message);
  }
}
test();
