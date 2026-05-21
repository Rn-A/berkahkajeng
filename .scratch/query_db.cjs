const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function query() {
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
    console.log("Connected to DB.");

    console.log("\n--- LATEST WOOD SETS ---");
    const [sets] = await conn.query("SELECT * FROM wood_sets ORDER BY date DESC, id DESC LIMIT 5");
    console.log(sets);

    if (sets.length > 0) {
      const setIds = sets.map(s => s.id);
      console.log("\n--- WOOD CATEGORIES FOR LATEST SETS ---");
      const [categories] = await conn.query("SELECT * FROM wood_categories WHERE set_id IN (?)", [setIds]);
      console.log(categories);

      console.log("\n--- INVENTORY STOCK ---");
      const [inventory] = await conn.query("SELECT * FROM inventory LIMIT 20");
      console.log(inventory);
    }

    await conn.end();
  } catch (err) {
    console.error("Query failed:", err.message);
  }
}
query();
