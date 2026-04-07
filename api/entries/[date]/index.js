import pool from '../../_db.js';
import { requireAuth } from '../../_auth.js';

export default async function handler(req, res) {
  let userId;
  try {
    userId = await requireAuth(req);
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }

  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ error: 'Missing date parameter' });
  }

  // Handle GET /api/entries/:date
  if (req.method === 'GET') {
    try {
      const { rows } = await pool.query('SELECT * FROM entries WHERE user_id = $1 AND date = $2', [userId, date]);
      return res.status(200).json(rows[0] || null);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', 'GET');
  return res.status(405).json({ error: 'Method not allowed' });
}
