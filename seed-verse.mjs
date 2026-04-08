import dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  // Get user_id(s)
  const { rows: users } = await pool.query('SELECT DISTINCT user_id FROM settings LIMIT 5');
  console.log('Users found:', users.map(u => u.user_id));

  for (const { user_id } of users) {
    // Check existing verses
    const { rows: existing } = await pool.query(
      'SELECT COUNT(*) as cnt FROM bible_verses WHERE user_id = $1', [user_id]
    );
    console.log(`User ${user_id}: ${existing[0].cnt} existing verses`);

    // Insert a new verse at sort_order 0 (shift others up)
    await pool.query(
      'UPDATE bible_verses SET sort_order = sort_order + 1 WHERE user_id = $1', [user_id]
    );

    await pool.query(
      `INSERT INTO bible_verses (user_id, verse, reference, sort_order)
       VALUES ($1, $2, $3, 0)`,
      [
        user_id,
        'Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.',
        'Joshua 1:9'
      ]
    );

    // Reset the verse index to 0 and update rotation time to force immediate display
    const upsertSql = `
      INSERT INTO settings (user_id, key, value) VALUES ($1, $2, $3)
      ON CONFLICT(user_id, key) DO UPDATE SET value = $3
    `;
    const { rows: nowRows } = await pool.query("SELECT NOW()::text AS db_now");
    await pool.query(upsertSql, [user_id, 'verse_index', '0']);
    await pool.query(upsertSql, [user_id, 'verse_rotated_at', nowRows[0].db_now]);

    console.log(`✅ User ${user_id}: New verse inserted and set as current`);
  }

  await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });
