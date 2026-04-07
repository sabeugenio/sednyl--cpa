import pool from '../../_db.js';
import { requireAuth } from '../../_auth.js';

export default async function handler(req, res) {
  let userId;
  try {
    userId = await requireAuth(req);
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Missing playlist id' });
  }

  if (req.method === 'PUT') {
    try {
      await pool.query('UPDATE playlists SET is_active = 0 WHERE user_id = $1', [userId]);
      const { rows } = await pool.query('UPDATE playlists SET is_active = 1 WHERE id = $1 AND user_id = $2 RETURNING *', [id, userId]);
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Playlist not found' });
      }
      return res.status(200).json(rows[0]);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', 'PUT');
  return res.status(405).json({ error: 'Method not allowed' });
}
