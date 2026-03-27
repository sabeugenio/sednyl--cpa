const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/entries - Get all entries
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM entries ORDER BY date DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/entries/:date - Get entry by date
router.get('/:date', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM entries WHERE date = $1', [req.params.date]);
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/entries - Upsert entry
router.post('/', async (req, res) => {
  try {
    const { date, status, what_i_did, next_step, feeling, thought, free_write } = req.body;

    if (!date || !status) {
      return res.status(400).json({ error: 'date and status are required' });
    }

    await pool.query(`
      INSERT INTO entries (date, status, what_i_did, next_step, feeling, thought, free_write)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT(date) DO UPDATE SET
        status = $2,
        what_i_did = $3,
        next_step = $4,
        feeling = $5,
        thought = $6,
        free_write = $7,
        updated_at = CURRENT_TIMESTAMP
    `, [
      date, status, what_i_did || '', next_step || '', feeling || '', thought || '', free_write || ''
    ]);

    const { rows } = await pool.query('SELECT * FROM entries WHERE date = $1', [date]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
