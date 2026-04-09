import express from 'express';
import pool from '../db.js';
import { expressAuth } from '../auth.js';

const router = express.Router();
router.use(expressAuth);

function isValidDateString(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function compareDateStrings(a, b) {
  // For YYYY-MM-DD, lexicographic order matches chronological order
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

// GET /api/countdowns
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM study_countdowns WHERE user_id = $1 ORDER BY COALESCE(start_date, target_date) ASC, id ASC',
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
    const { title, targetDate, startDate, endDate } = req.body;
    const trimmedTitle = typeof title === 'string' ? title.trim() : '';
    if (!trimmedTitle) {
      return res.status(400).json({ error: 'title is required' });
    }

    const isRange = startDate !== undefined || endDate !== undefined;
    if (isRange) {
      if (!isValidDateString(startDate) || !isValidDateString(endDate)) {
        return res.status(400).json({ error: 'startDate and endDate must be YYYY-MM-DD' });
      }
      if (compareDateStrings(startDate, endDate) > 0) {
        return res.status(400).json({ error: 'startDate must be on or before endDate' });
      }

      const { rows } = await pool.query(
        'INSERT INTO study_countdowns (user_id, title, target_date, start_date, end_date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [req.user.id, trimmedTitle, startDate, startDate, endDate]
      );
      return res.json(rows[0]);
    }

    if (!isValidDateString(targetDate)) {
      return res.status(400).json({ error: 'targetDate is required and must be YYYY-MM-DD' });
    }
    const { rows } = await pool.query(
      'INSERT INTO study_countdowns (user_id, title, target_date, start_date, end_date) VALUES ($1, $2, $3, NULL, NULL) RETURNING *',
      [req.user.id, trimmedTitle, targetDate]
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
    const { title, targetDate, startDate, endDate } = req.body;
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title.trim());
    }

    const isRangeUpdate = startDate !== undefined || endDate !== undefined;
    if (isRangeUpdate) {
      if (!isValidDateString(startDate) || !isValidDateString(endDate)) {
        return res.status(400).json({ error: 'startDate and endDate must be YYYY-MM-DD' });
      }
      if (compareDateStrings(startDate, endDate) > 0) {
        return res.status(400).json({ error: 'startDate must be on or before endDate' });
      }

      updates.push(`target_date = $${paramIndex++}`);
      values.push(startDate);
      updates.push(`start_date = $${paramIndex++}`);
      values.push(startDate);
      updates.push(`end_date = $${paramIndex++}`);
      values.push(endDate);
    } else if (targetDate !== undefined) {
      if (!isValidDateString(targetDate)) {
        return res.status(400).json({ error: 'targetDate must be YYYY-MM-DD' });
      }
      updates.push(`target_date = $${paramIndex++}`);
      values.push(targetDate);
      // Explicitly clear any existing range when switching back to single date
      updates.push(`start_date = NULL`);
      updates.push(`end_date = NULL`);
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
