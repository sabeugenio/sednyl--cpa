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
    const match = urlStr.match(/\/api\/playlists\/(.+)/);
    if (match) {
      pathParts = match[1].split('/');
    }
  }

  const id = pathParts[0];
  const isActive = pathParts[1] === 'active';

  if (!id) {
    return res.status(400).json({ error: 'Missing playlist id' });
  }

  if (isActive && req.method === 'PUT') {
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

  if (req.method === 'DELETE') {
    try {
      await pool.query('DELETE FROM playlists WHERE id = $1 AND user_id = $2', [id, userId]);
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', 'DELETE, PUT');
  return res.status(405).json({ error: 'Method not allowed' });
}
