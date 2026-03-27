const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/entries - Get all entries
router.get('/', (req, res) => {
  try {
    const entries = db.prepare('SELECT * FROM entries ORDER BY date DESC').all();
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/entries/:date - Get entry by date
router.get('/:date', (req, res) => {
  try {
    const entry = db.prepare('SELECT * FROM entries WHERE date = ?').get(req.params.date);
    res.json(entry || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/entries - Upsert entry
router.post('/', (req, res) => {
  try {
    const { date, status, what_i_did, next_step, feeling, thought, free_write } = req.body;

    if (!date || !status) {
      return res.status(400).json({ error: 'date and status are required' });
    }

    const stmt = db.prepare(`
      INSERT INTO entries (date, status, what_i_did, next_step, feeling, thought, free_write)
      VALUES (@date, @status, @what_i_did, @next_step, @feeling, @thought, @free_write)
      ON CONFLICT(date) DO UPDATE SET
        status = @status,
        what_i_did = @what_i_did,
        next_step = @next_step,
        feeling = @feeling,
        thought = @thought,
        free_write = @free_write,
        updated_at = datetime('now')
    `);

    const result = stmt.run({
      date,
      status,
      what_i_did: what_i_did || '',
      next_step: next_step || '',
      feeling: feeling || '',
      thought: thought || '',
      free_write: free_write || ''
    });

    const entry = db.prepare('SELECT * FROM entries WHERE date = ?').get(date);
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
