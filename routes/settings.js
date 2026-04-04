import express from 'express';
import pool from '../db.js';
import { expressAuth } from '../api/_auth.js';

const router = express.Router();
router.use(expressAuth);

// GET /api/settings - Get all settings
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM settings WHERE user_id = $1', [req.user.id]);
    const settings = {};
    rows.forEach((r) => { settings[r.key] = r.value; });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings - Update a setting
router.post('/', async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: 'key is required' });

    await pool.query(`
      INSERT INTO settings (user_id, key, value) VALUES ($1, $2, $3)
      ON CONFLICT(user_id, key) DO UPDATE SET value = $3
    `, [req.user.id, key, String(value)]);

    const { rows } = await pool.query('SELECT * FROM settings WHERE user_id = $1', [req.user.id]);
    const settings = {};
    rows.forEach((r) => { settings[r.key] = r.value; });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
