import express from 'express';
const router = express.Router();
import pool from '../db.js';

// GET /api/topics - Get all study topics (optionally filter by is_done)
router.get('/', async (req, res) => {
  try {
    const { done } = req.query;
    let query = 'SELECT * FROM study_topics';
    let params = [];

    if (done !== undefined) {
      query += ' WHERE is_done = $1';
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
    const maxResult = await pool.query('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM study_topics');
    const nextOrder = maxResult.rows[0].next_order;

    const { rows } = await pool.query(
      'INSERT INTO study_topics (content, sort_order) VALUES ($1, $2) RETURNING *',
      [content.trim(), nextOrder]
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
    const { rows } = await pool.query(
      `UPDATE study_topics SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
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
    const result = await pool.query('DELETE FROM study_topics WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Topic not found' });
    }
    res.json({ message: 'Topic deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
