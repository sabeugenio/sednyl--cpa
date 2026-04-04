import express from 'express';
const router = express.Router();
import pool from '../db.js';

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

// POST /api/entries - Upsert entry (full save including journal)
router.post('/', async (req, res) => {
  try {
    const { date, status, what_i_did, next_step, feeling, thought, free_write, total_time_seconds } = req.body;

    if (!date || !status) {
      return res.status(400).json({ error: 'date and status are required' });
    }

    await pool.query(`
      INSERT INTO entries (date, status, what_i_did, next_step, feeling, thought, free_write, total_time_seconds, is_running, last_start_time)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, NULL)
      ON CONFLICT(date) DO UPDATE SET
        status = $2,
        what_i_did = $3,
        next_step = $4,
        feeling = $5,
        thought = $6,
        free_write = $7,
        total_time_seconds = $8,
        is_running = 0,
        last_start_time = NULL,
        updated_at = CURRENT_TIMESTAMP
    `, [
      date, status, what_i_did || '', next_step || '', feeling || '', thought || '', free_write || '',
      total_time_seconds || 0
    ]);

    const { rows } = await pool.query('SELECT * FROM entries WHERE date = $1', [date]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/entries/:date/session - Update session timer state
router.put('/:date/session', async (req, res) => {
  try {
    const { date } = req.params;
    const { total_time_seconds, is_running, last_start_time } = req.body;

    // Upsert: create the entry if it doesn't exist, or update session fields
    await pool.query(`
      INSERT INTO entries (date, status, total_time_seconds, is_running, last_start_time)
      VALUES ($1, 'reset_day', $2, $3, $4)
      ON CONFLICT(date) DO UPDATE SET
        total_time_seconds = $2,
        is_running = $3,
        last_start_time = $4,
        updated_at = CURRENT_TIMESTAMP
    `, [date, total_time_seconds || 0, is_running ? 1 : 0, last_start_time || null]);

    const { rows } = await pool.query('SELECT * FROM entries WHERE date = $1', [date]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/entries/:date/session - Same as PUT, needed for sendBeacon on page unload
router.post('/:date/session', async (req, res) => {
  try {
    const { date } = req.params;
    const { total_time_seconds, is_running, last_start_time } = req.body;

    await pool.query(`
      INSERT INTO entries (date, status, total_time_seconds, is_running, last_start_time)
      VALUES ($1, 'reset_day', $2, $3, $4)
      ON CONFLICT(date) DO UPDATE SET
        total_time_seconds = $2,
        is_running = $3,
        last_start_time = $4,
        updated_at = CURRENT_TIMESTAMP
    `, [date, total_time_seconds || 0, is_running ? 1 : 0, last_start_time || null]);

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
