import pool from '../../_db.js';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'PUT') {
    try {
      // First, set all to inactive
      await pool.query('UPDATE playlists SET is_active = 0');

      // Then set the chosen one to active
      const { rows } = await pool.query('UPDATE playlists SET is_active = 1 WHERE id = $1 RETURNING *', [id]);

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Playlist not found' });
      }

      return res.status(200).json(rows[0]);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', 'PUT');
  return res.status(405).end();
}
