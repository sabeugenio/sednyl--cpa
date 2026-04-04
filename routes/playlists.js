import express from 'express';
const router = express.Router();
import pool from '../db.js';

// GET /api/playlists - Get all playlists
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM playlists ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/playlists - Add a new playlist
router.post('/', async (req, res) => {
  try {
    const { video_id, title, thumbnail, channel } = req.body;
    
    if (!video_id || !title) {
      return res.status(400).json({ error: 'video_id and title are required' });
    }

    // Check if it already exists to avoid duplicates
    const check = await pool.query('SELECT * FROM playlists WHERE video_id = $1', [video_id]);
    if (check.rows.length > 0) {
      return res.json(check.rows[0]); // Return existing
    }

    const { rows } = await pool.query(`
      INSERT INTO playlists (video_id, title, thumbnail, channel, is_active)
      VALUES ($1, $2, $3, $4, 0)
      RETURNING *
    `, [video_id, title, thumbnail || '', channel || '']);
    
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/playlists/:id - Delete a playlist
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM playlists WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/playlists/:id/active - Set a playlist as the active one
router.put('/:id/active', async (req, res) => {
  try {
    const { id } = req.params;
    
    // First, set all to inactive
    await pool.query('UPDATE playlists SET is_active = 0');
    
    // Then set the chosen one to active
    const { rows } = await pool.query('UPDATE playlists SET is_active = 1 WHERE id = $1 RETURNING *', [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
