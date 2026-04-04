import pool from './_db.js';
import { requireAuth } from './_auth.js';

export default async function handler(req, res) {
  let userId;
  try {
    userId = await requireAuth(req);
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }

  if (req.method === 'GET') {
    try {
      const { rows } = await pool.query('SELECT * FROM settings WHERE user_id = $1', [userId]);
      const settings = {};
      rows.forEach((r) => { settings[r.key] = r.value; });
      return res.status(200).json(settings);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { key, value } = req.body;
      if (!key) return res.status(400).json({ error: 'key is required' });

      await pool.query(`
        INSERT INTO settings (user_id, key, value) VALUES ($1, $2, $3)
        ON CONFLICT(user_id, key) DO UPDATE SET value = $3
      `, [userId, key, String(value)]);

      const { rows } = await pool.query('SELECT * FROM settings WHERE user_id = $1', [userId]);
      const settings = {};
      rows.forEach((r) => { settings[r.key] = r.value; });
      return res.status(200).json(settings);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).end();
}
