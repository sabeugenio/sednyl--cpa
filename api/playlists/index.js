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
      const { rows } = await pool.query('SELECT * FROM playlists WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
      return res.status(200).json(rows);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { video_id, title, thumbnail, channel } = req.body;

      if (!video_id || !title) {
        return res.status(400).json({ error: 'video_id and title are required' });
      }

      // Check if it already exists to avoid duplicates
      const check = await pool.query('SELECT * FROM playlists WHERE user_id = $1 AND video_id = $2', [userId, video_id]);
      if (check.rows.length > 0) {
        return res.status(200).json(check.rows[0]);
      }

      const { rows } = await pool.query(`
        INSERT INTO playlists (user_id, video_id, title, thumbnail, channel, is_active)
        VALUES ($1, $2, $3, $4, $5, 0)
        RETURNING *
      `, [userId, video_id, title, thumbnail || '', channel || '']);

      return res.status(201).json(rows[0]);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).end();
}
