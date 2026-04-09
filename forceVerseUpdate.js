import pool from './db.js';

async function run() {
  try {
    const { rows: users } = await pool.query('SELECT DISTINCT user_id FROM settings');
    for (const u of users) {
      // Set verse_rotated_at to 4 hours ago to force immediate rotation
      const { rows: nowRows } = await pool.query(`SELECT (NOW() - INTERVAL '4 hours')::text AS old_now`);
      const upsertSql = `
        INSERT INTO settings (user_id, key, value) VALUES ($1, $2, $3)
        ON CONFLICT(user_id, key) DO UPDATE SET value = $3
      `;
      await pool.query(upsertSql, [u.user_id, 'verse_rotated_at', nowRows[0].old_now]);
    }
    console.log("SUCCESS: verse_rotated_at successfully pushed back 4 hours. Next refresh will trigger rotation!");
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
