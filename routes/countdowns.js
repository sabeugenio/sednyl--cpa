import express from 'express';
import pool from '../db.js';
import { expressAuth } from '../api/_auth.js';

const router = express.Router();
router.use(expressAuth);

// GET /api/countdowns
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM study_countdowns WHERE user_id = $1 ORDER BY target_date ASC, id ASC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/countdowns
router.post('/', async (req, res) => {
  try {
    const { title, targetDate } = req.body;
    if (!title || !title.trim() || !targetDate) {
      return res.status(400).json({ error: 'title and targetDate are required' });
    }
    const { rows } = await pool.query(
      'INSERT INTO study_countdowns (user_id, title, target_date) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, title.trim(), targetDate]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/countdowns/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, targetDate } = req.body;
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title.trim());
    }
    if (targetDate !== undefined) {
      updates.push(`target_date = $${paramIndex++}`);
      values.push(targetDate);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    values.push(req.user.id);
    
    const { rows } = await pool.query(
      `UPDATE study_countdowns SET ${updates.join(', ')} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} RETURNING *`,
      values
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Countdown not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/countdowns/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM study_countdowns WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Countdown not found' });
    }
    res.json({ message: 'Countdown deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
