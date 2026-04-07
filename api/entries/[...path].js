import pool from '../_db.js';
import { requireAuth } from '../_auth.js';

export default async function handler(req, res) {
  let userId;
  try {
    userId = await requireAuth(req);
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }

  let pathParts = [];
  if (req.query && req.query.path) {
    pathParts = Array.isArray(req.query.path) ? req.query.path : req.query.path.split('/');
  }
  if (pathParts.length === 0 && req.url) {
    const urlStr = req.url.split('?')[0];
    const match = urlStr.match(/\/api\/entries\/(.+)/);
    if (match) {
      pathParts = match[1].split('/');
    }
  }

  const date = pathParts[0];
  const isSession = pathParts[1] === 'session';

  if (!date) {
    return res.status(400).json({ error: 'Missing date parameter' });
  }

  if (isSession) {
    // Handle session routes (PUT/POST)
    if (req.method === 'PUT' || req.method === 'POST') {
      try {
        const { total_time_seconds, is_running, last_start_time } = req.body;

        await pool.query(`
          INSERT INTO entries (user_id, date, status, total_time_seconds, is_running, last_start_time)
          VALUES ($1, $2, 'reset_day', $3, $4, $5)
          ON CONFLICT(user_id, date) DO UPDATE SET
            total_time_seconds = $3,
            is_running = $4,
            last_start_time = $5,
            updated_at = CURRENT_TIMESTAMP
        `, [userId, date, total_time_seconds || 0, is_running ? 1 : 0, last_start_time || null]);

        const { rows } = await pool.query('SELECT * FROM entries WHERE user_id = $1 AND date = $2', [userId, date]);
        return res.status(200).json(rows[0] || { ok: true });
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }
    res.setHeader('Allow', 'PUT, POST');
    return res.status(405).json({ error: 'Method not allowed' });
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
