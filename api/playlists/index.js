import pool from '../_db.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { rows } = await pool.query('SELECT * FROM playlists ORDER BY created_at DESC');
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
      const check = await pool.query('SELECT * FROM playlists WHERE video_id = $1', [video_id]);
      if (check.rows.length > 0) {
        return res.status(200).json(check.rows[0]);
      }

      const { rows } = await pool.query(`
        INSERT INTO playlists (video_id, title, thumbnail, channel, is_active)
        VALUES ($1, $2, $3, $4, 0)
        RETURNING *
      `, [video_id, title, thumbnail || '', channel || '']);

      return res.status(201).json(rows[0]);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).end();
}
