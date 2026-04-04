import pool from '../_db.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { rows } = await pool.query('SELECT * FROM entries ORDER BY date DESC');
      return res.status(200).json(rows);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { date, status, what_i_did, next_step, feeling, thought, free_write, total_time_seconds } = req.body;

      if (!date || !status) {
        return res.status(400).json({ error: 'date and status are required' });
      }

      await pool.query(`
        INSERT INTO entries (date, status, what_i_did, next_step, feeling, thought, free_write, total_time_seconds, is_running, last_start_time)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, NULL)
        ON CONFLICT(date) DO UPDATE SET
          status = $2,
          what_i_did = $3,
          next_step = $4,
          feeling = $5,
          thought = $6,
          free_write = $7,
          total_time_seconds = $8,
          is_running = 0,
          last_start_time = NULL,
          updated_at = CURRENT_TIMESTAMP
      `, [
        date, status, what_i_did || '', next_step || '', feeling || '', thought || '', free_write || '',
        total_time_seconds || 0
      ]);

      const { rows } = await pool.query('SELECT * FROM entries WHERE date = $1', [date]);
      return res.status(200).json(rows[0]);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).end();
}
