import express from 'express';
import pool from '../db.js';
import { expressAuth } from '../api/_auth.js';

const router = express.Router();
router.use(expressAuth);

// GET /api/playlists - Get all playlists
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM playlists WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
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
    const check = await pool.query('SELECT * FROM playlists WHERE user_id = $1 AND video_id = $2', [req.user.id, video_id]);
    if (check.rows.length > 0) {
      return res.json(check.rows[0]); // Return existing
    }

    const { rows } = await pool.query(`
      INSERT INTO playlists (user_id, video_id, title, thumbnail, channel, is_active)
      VALUES ($1, $2, $3, $4, $5, 0)
      RETURNING *
    `, [req.user.id, video_id, title, thumbnail || '', channel || '']);
    
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/playlists/:id - Delete a playlist
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM playlists WHERE id = $1 AND user_id = $2', [id, req.user.id]);
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
    await pool.query('UPDATE playlists SET is_active = 0 WHERE user_id = $1', [req.user.id]);
    
    // Then set the chosen one to active
    const { rows } = await pool.query('UPDATE playlists SET is_active = 1 WHERE id = $1 AND user_id = $2 RETURNING *', [id, req.user.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
