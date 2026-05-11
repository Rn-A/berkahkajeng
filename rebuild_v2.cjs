const mysql = require('mysql2/promise');

async function rebuild() {
  const pool = mysql.createPool({ host: 'localhost', user: 'root', password: '', database: 'berkah_kajeng' });
  const connection = await pool.getConnection();
  try {
    console.log("Truncating inventory...");
    await connection.query("TRUNCATE TABLE inventory");

    function getDiameterGroup(diameter) {
      if (diameter < 10) return 'X';
      if (diameter >= 10 && diameter <= 14) return '10-14';
      if (diameter >= 15 && diameter <= 19) return '15-19';
      if (diameter >= 20 && diameter <= 24) return '20-24';
      if (diameter >= 25 && diameter <= 29) return '25-29';
      return '30+';
    }

    const [categories] = await connection.query("SELECT * FROM wood_categories");
    for (const cat of categories) {
      const [logs] = await connection.query("SELECT * FROM log_entries WHERE category_id = ?", [cat.id]);
      const logGroups = {};
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
          INSERT INTO inventory (wood_type, diameter_group, length, condition_val, total_logs, total_volume, avg_price, total_value)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            total_logs = total_logs + VALUES(total_logs),
            total_volume = total_volume + VALUES(total_volume),
            total_value = total_value + VALUES(total_value),
            avg_price = IF((total_volume + VALUES(total_volume)) > 0, (total_value + VALUES(total_value)) / (total_volume + VALUES(total_volume)), 0)
        `, [cat.woodType, group, cat.length, (group === 'X' ? 'X' : (cat.condition_val || 'Umum')), data.count, data.volume, (data.volume > 0 ? data.value / data.volume : 0), data.value]);
      }
    }

    const [salesItems] = await connection.query("SELECT * FROM sales_items");
    for (const item of salesItems) {
      const group = item.diameter_group;
      const [inv] = await connection.query("SELECT * FROM inventory WHERE wood_type = ? AND diameter_group = ? AND length = ? AND condition_val = ?", [item.wood_type, group, item.length, (group === 'X' ? 'X' : (item.condition_val || 'Umum'))]);
      if (inv.length > 0) {
        const cost = Number(inv[0].avg_price);
        await connection.query("UPDATE inventory SET total_logs = GREATEST(0, total_logs - ?), total_volume = GREATEST(0, total_volume - ?), total_value = GREATEST(0, total_value - ?) WHERE id = ?", [1, item.volume, item.volume * cost, inv[0].id]);
      }
    }
    console.log("Inventory rebuilt successfully v2!");
  } finally {
    connection.release();
    pool.end();
  }
}
rebuild();
