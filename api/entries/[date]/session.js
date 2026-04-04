import pool from '../../_db.js';

export default async function handler(req, res) {
  const { date } = req.query;

  if (req.method === 'PUT' || req.method === 'POST') {
    try {
      const { total_time_seconds, is_running, last_start_time } = req.body;

      await pool.query(`
        INSERT INTO entries (date, status, total_time_seconds, is_running, last_start_time)
        VALUES ($1, 'reset_day', $2, $3, $4)
        ON CONFLICT(date) DO UPDATE SET
          total_time_seconds = $2,
          is_running = $3,
          last_start_time = $4,
          updated_at = CURRENT_TIMESTAMP
      `, [date, total_time_seconds || 0, is_running ? 1 : 0, last_start_time || null]);

      const { rows } = await pool.query('SELECT * FROM entries WHERE date = $1', [date]);
      return res.status(200).json(rows[0] || { ok: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', 'PUT, POST');
  return res.status(405).end();
}
