const mysql = require('mysql2/promise');
async function check() {
  const pool = mysql.createPool({ host: 'localhost', user: 'root', password: '', database: 'berkah_kajeng' });
  const [rows] = await pool.query("SELECT * FROM inventory WHERE diameter_group = 'X' OR total_volume = 0");
  console.log("Category X / Zero Volume Rows:", JSON.stringify(rows, null, 2));
  await pool.end();
}
check();
