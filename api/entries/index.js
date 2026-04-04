import pool from '../_db.js';
import { requireAuth } from '../_auth.js';

export default async function handler(req, res) {
  let userId;
  try {
    userId = await requireAuth(req);
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }

  if (req.method === 'GET') {
    try {
      const { rows } = await pool.query('SELECT * FROM entries WHERE user_id = $1 ORDER BY date DESC', [userId]);
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
        INSERT INTO entries (user_id, date, status, what_i_did, next_step, feeling, thought, free_write, total_time_seconds, is_running, last_start_time)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, NULL)
        ON CONFLICT(user_id, date) DO UPDATE SET
          status = $3,
          what_i_did = $4,
          next_step = $5,
          feeling = $6,
          thought = $7,
          free_write = $8,
          total_time_seconds = $9,
          is_running = 0,
          last_start_time = NULL,
          updated_at = CURRENT_TIMESTAMP
      `, [
        userId, date, status, what_i_did || '', next_step || '', feeling || '', thought || '', free_write || '',
        total_time_seconds || 0
      ]);

      const { rows } = await pool.query('SELECT * FROM entries WHERE user_id = $1 AND date = $2', [userId, date]);
      return res.status(200).json(rows[0]);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).end();
}
