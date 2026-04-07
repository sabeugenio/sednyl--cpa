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

  if (req.method === 'DELETE') {
    try {
      await pool.query('DELETE FROM playlists WHERE id = $1 AND user_id = $2', [id, userId]);
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', 'DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
}
