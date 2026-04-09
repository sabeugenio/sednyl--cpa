import express from 'express';
import pool from '../db.js';
import { expressAuth } from '../auth.js';

const router = express.Router();
router.use(expressAuth);

const ALLOWED_COLORS = new Set(['green', 'yellow', 'pink', 'purple', 'blue']);

function normalizeCountdownColor(value) {
  if (typeof value !== 'string') return 'pink';
  const v = value.trim().toLowerCase();
  return ALLOWED_COLORS.has(v) ? v : 'pink';
}

function isValidDateString(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  // Support:
  // - YYYY-MM-DD
  // - YYYY-MM-DDTHH:MM
  // - YYYY-MM-DD HH:MM
  // - YYYY-MM-DDTHH:MM:SS
  return /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?)?$/.test(value.trim());
}

function normalizeDateTimeString(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  // If only a date is provided, normalize to local midnight for consistent ordering.
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return `${trimmed}T00:00`;
  // Replace space with T if needed
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(trimmed)) return trimmed.replace(' ', 'T');
  return trimmed;
}

function compareDateStrings(a, b) {
  // For ISO-ish strings (YYYY-MM-DD or YYYY-MM-DDTHH:MM[:SS]),
  // lexicographic order matches chronological order when normalized.
  const na = normalizeDateTimeString(a);
  const nb = normalizeDateTimeString(b);
  if (na === nb) return 0;
  return na < nb ? -1 : 1;
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
    const { title, targetDate, startDate, endDate, color } = req.body;
    const trimmedTitle = typeof title === 'string' ? title.trim() : '';
    if (!trimmedTitle) {
      return res.status(400).json({ error: 'title is required' });
    }
    const normalizedColor = normalizeCountdownColor(color);

    const isRange = startDate !== undefined || endDate !== undefined;
    if (isRange) {
      if (!isValidDateString(startDate) || !isValidDateString(endDate)) {
        console.warn('[Countdown API] Invalid range dates:', { startDate, endDate });
        return res.status(400).json({ error: 'startDate and endDate must be YYYY-MM-DD or YYYY-MM-DDTHH:MM' });
      }
      const normStart = normalizeDateTimeString(startDate);
      const normEnd = normalizeDateTimeString(endDate);
      if (compareDateStrings(normStart, normEnd) > 0) {
        return res.status(400).json({ error: 'startDate must be on or before endDate' });
      }

      const { rows } = await pool.query(
        'INSERT INTO study_countdowns (user_id, title, target_date, start_date, end_date, color) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [req.user.id, trimmedTitle, normStart, normStart, normEnd, normalizedColor]
      );
      return res.json(rows[0]);
    }

    if (!isValidDateString(targetDate)) {
      console.warn('[Countdown API] Invalid targetDate:', { targetDate });
      return res.status(400).json({ error: 'targetDate is required and must be YYYY-MM-DD or YYYY-MM-DDTHH:MM' });
    }
    const normTarget = normalizeDateTimeString(targetDate);
    const { rows } = await pool.query(
      'INSERT INTO study_countdowns (user_id, title, target_date, start_date, end_date, color) VALUES ($1, $2, $3, NULL, NULL, $4) RETURNING *',
      [req.user.id, trimmedTitle, normTarget, normalizedColor]
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
    const { title, targetDate, startDate, endDate, color } = req.body;
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title.trim());
    }

    if (color !== undefined) {
      updates.push(`color = $${paramIndex++}`);
      values.push(normalizeCountdownColor(color));
    }

    const isRangeUpdate = startDate !== undefined || endDate !== undefined;
    if (isRangeUpdate) {
      if (!isValidDateString(startDate) || !isValidDateString(endDate)) {
        return res.status(400).json({ error: 'startDate and endDate must be YYYY-MM-DD or YYYY-MM-DDTHH:MM' });
      }
      const normStart = normalizeDateTimeString(startDate);
      const normEnd = normalizeDateTimeString(endDate);
      if (compareDateStrings(normStart, normEnd) > 0) {
        return res.status(400).json({ error: 'startDate must be on or before endDate' });
      }

      updates.push(`target_date = $${paramIndex++}`);
      values.push(normStart);
      updates.push(`start_date = $${paramIndex++}`);
      values.push(normStart);
      updates.push(`end_date = $${paramIndex++}`);
      values.push(normEnd);
    } else if (targetDate !== undefined) {
      if (!isValidDateString(targetDate)) {
        return res.status(400).json({ error: 'targetDate must be YYYY-MM-DD or YYYY-MM-DDTHH:MM' });
      }
      const normTarget = normalizeDateTimeString(targetDate);
      updates.push(`target_date = $${paramIndex++}`);
      values.push(normTarget);
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
