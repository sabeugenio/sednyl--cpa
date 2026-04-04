import express from 'express';
import pool from '../db.js';
import { expressAuth } from '../api/_auth.js';

const router = express.Router();
router.use(expressAuth);

// GET /api/topics - Get all study topics (optionally filter by is_done)
router.get('/', async (req, res) => {
  try {
    const { done } = req.query;
    let query = 'SELECT * FROM study_topics WHERE user_id = $1';
    let params = [req.user.id];

    if (done !== undefined) {
      query += ' AND is_done = $2';
      params.push(done === '1' ? 1 : 0);
    }

    query += ' ORDER BY sort_order, id';

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/topics - Add a new topic
router.post('/', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'content is required' });
    }
    // Get max sort_order
    const maxResult = await pool.query('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM study_topics WHERE user_id = $1', [req.user.id]);
    const nextOrder = maxResult.rows[0].next_order;

    const { rows } = await pool.query(
      'INSERT INTO study_topics (user_id, content, sort_order) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, content.trim(), nextOrder]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/topics/:id - Update a topic (toggle completed, edit content, mark done)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content, completed, is_done } = req.body;

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (content !== undefined) {
      updates.push(`content = $${paramIndex++}`);
      values.push(content);
    }
    if (completed !== undefined) {
      updates.push(`completed = $${paramIndex++}`);
      values.push(completed ? 1 : 0);
    }
    if (is_done !== undefined) {
      updates.push(`is_done = $${paramIndex++}`);
      values.push(is_done ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    values.push(req.user.id);
    const { rows } = await pool.query(
      `UPDATE study_topics SET ${updates.join(', ')} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} RETURNING *`,
      values
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Topic not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/topics/:id - Delete a topic
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM study_topics WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Topic not found' });
    }
    res.json({ message: 'Topic deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
