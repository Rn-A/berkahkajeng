const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function inspect() {
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
    console.log("Connected to database to inspect data.");

    console.log("\n--- LAST 5 WOOD SETS ---");
    const [sets] = await conn.query("SELECT * FROM wood_sets ORDER BY date DESC, id LIMIT 5");
    console.table(sets);

    if (sets.length > 0) {
      console.log("\n--- CATEGORIES FOR LAST 5 SETS ---");
      const setIds = sets.map(s => s.id);
      const [categories] = await conn.query("SELECT * FROM wood_categories WHERE set_id IN (?)", [setIds]);
      console.table(categories);
    }

    console.log("\n--- CURRENT INVENTORY (All non-zero logs) ---");
    const [inventory] = await conn.query("SELECT * FROM inventory WHERE total_logs > 0");
    console.table(inventory);

    await conn.end();
  } catch (err) {
    console.error("Error inspecting:", err.message);
  }
}
inspect();
