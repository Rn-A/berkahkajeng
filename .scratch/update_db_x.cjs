const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'berkah_kajeng',
    port: Number(process.env.DB_PORT) || 4000,
    ssl: { rejectUnauthorized: true },
  });
  
  await conn.query("UPDATE inventory SET length = 130, diameter_group = 'X' WHERE condition_val = 'X'");
  await conn.query("UPDATE log_entries JOIN wood_categories ON log_entries.category_id = wood_categories.id SET wood_categories.length = 130 WHERE wood_categories.condition_val = 'X'");
  
  console.log('DB Updated');
  process.exit(0);
})();
