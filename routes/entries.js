import express from 'express';
import pool from '../db.js';
import { expressAuth } from '../api/_auth.js';

const router = express.Router();
router.use(expressAuth);

// GET /api/entries - Get all entries
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM entries WHERE user_id = $1 ORDER BY date DESC', [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/entries/:date - Get entry by date
router.get('/:date', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM entries WHERE user_id = $1 AND date = $2', [req.user.id, req.params.date]);
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
      INSERT INTO entries (user_id, date, status, what_i_did, next_step, feeling, thought, free_write, total_time_seconds, is_running, last_start_time)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, NULL)
      ON CONFLICT(user_id, date) DO UPDATE SET
        status = $3,
        what_i_did = $4,
        next_step = $5,
        feeling = $6,
        thought = $7,
        free_write = $8,
        total_time_seconds = $9,
        is_running = 0,
        last_start_time = NULL,
        updated_at = CURRENT_TIMESTAMP
    `, [
      req.user.id, date, status, what_i_did || '', next_step || '', feeling || '', thought || '', free_write || '',
      total_time_seconds || 0
    ]);

    const { rows } = await pool.query('SELECT * FROM entries WHERE user_id = $1 AND date = $2', [req.user.id, date]);
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

    await pool.query(`
      INSERT INTO entries (user_id, date, status, total_time_seconds, is_running, last_start_time)
      VALUES ($1, $2, 'reset_day', $3, $4, $5)
      ON CONFLICT(user_id, date) DO UPDATE SET
        total_time_seconds = $3,
        is_running = $4,
        last_start_time = $5,
        updated_at = CURRENT_TIMESTAMP
    `, [req.user.id, date, total_time_seconds || 0, is_running ? 1 : 0, last_start_time || null]);

    const { rows } = await pool.query('SELECT * FROM entries WHERE user_id = $1 AND date = $2', [req.user.id, date]);
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
      INSERT INTO entries (user_id, date, status, total_time_seconds, is_running, last_start_time)
      VALUES ($1, $2, 'reset_day', $3, $4, $5)
      ON CONFLICT(user_id, date) DO UPDATE SET
        total_time_seconds = $3,
        is_running = $4,
        last_start_time = $5,
        updated_at = CURRENT_TIMESTAMP
    `, [req.user.id, date, total_time_seconds || 0, is_running ? 1 : 0, last_start_time || null]);

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
