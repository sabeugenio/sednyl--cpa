const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/settings - Get all settings
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM settings');
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
      INSERT INTO settings (key, value) VALUES ($1, $2)
      ON CONFLICT(key) DO UPDATE SET value = $2
    `, [key, String(value)]);

    const { rows } = await pool.query('SELECT * FROM settings');
    const settings = {};
    rows.forEach((r) => { settings[r.key] = r.value; });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
