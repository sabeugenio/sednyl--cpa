import express from 'express';
import pool from '../db.js';
import { expressAuth } from '../api/_auth.js';

const router = express.Router();
router.use(expressAuth);

// --- SUBJECTS ---

// GET /api/subjects
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM study_subjects WHERE user_id = $1 ORDER BY sort_order, id',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/subjects
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    const maxResult = await pool.query(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM study_subjects WHERE user_id = $1',
      [req.user.id]
    );
    const nextOrder = maxResult.rows[0].next_order;
    const { rows } = await pool.query(
      'INSERT INTO study_subjects (user_id, name, sort_order) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, name.trim(), nextOrder]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/subjects/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (name === undefined) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    const { rows } = await pool.query(
      'UPDATE study_subjects SET name = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      [name, id, req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/subjects/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM study_subjects WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    res.json({ message: 'Subject deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- TOPICS ---

// GET /api/subjects/topics
router.get('/topics', async (req, res) => {
  try {
    const { subjectId, completed } = req.query;
    let query = 'SELECT * FROM study_subject_topics WHERE user_id = $1';
    let params = [req.user.id];
    let paramIndex = 2;

    if (subjectId) {
      query += ` AND subject_id = $${paramIndex++}`;
      params.push(subjectId);
    }
    if (completed !== undefined) {
      query += ` AND completed = $${paramIndex++}`;
      params.push(completed === '1' ? 1 : 0);
    }

    query += ' ORDER BY sort_order, id';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/subjects/topics
router.post('/topics', async (req, res) => {
  try {
    const { subjectId, title } = req.body;
    if (!subjectId || !title || !title.trim()) {
      return res.status(400).json({ error: 'subjectId and title are required' });
    }
    const maxResult = await pool.query(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM study_subject_topics WHERE user_id = $1 AND subject_id = $2',
      [req.user.id, subjectId]
    );
    const nextOrder = maxResult.rows[0].next_order;
    const { rows } = await pool.query(
      'INSERT INTO study_subject_topics (user_id, subject_id, title, sort_order) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, subjectId, title.trim(), nextOrder]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/subjects/topics/:id
router.put('/topics/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, completed } = req.body;
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    if (completed !== undefined) {
      updates.push(`completed = $${paramIndex++}`);
      values.push(completed ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    values.push(req.user.id);
    
    const { rows } = await pool.query(
      `UPDATE study_subject_topics SET ${updates.join(', ')} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} RETURNING *`,
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

// DELETE /api/subjects/topics/:id
router.delete('/topics/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM study_subject_topics WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Topic not found' });
    }
    res.json({ message: 'Topic deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- CHECKLISTS ---

// GET /api/subjects/checklists
router.get('/checklists', async (req, res) => {
  try {
    const { topicId } = req.query;
    let query = 'SELECT * FROM study_topic_checklist_items WHERE user_id = $1';
    let params = [req.user.id];

    if (topicId) {
      query += ' AND topic_id = $2';
      params.push(topicId);
    }

    query += ' ORDER BY sort_order, id';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/subjects/checklists
router.post('/checklists', async (req, res) => {
  try {
    const { topicId, content } = req.body;
    if (!topicId || !content || !content.trim()) {
      return res.status(400).json({ error: 'topicId and content are required' });
    }
    const maxResult = await pool.query(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM study_topic_checklist_items WHERE user_id = $1 AND topic_id = $2',
      [req.user.id, topicId]
    );
    const nextOrder = maxResult.rows[0].next_order;
    const { rows } = await pool.query(
      'INSERT INTO study_topic_checklist_items (user_id, topic_id, content, sort_order) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, topicId, content.trim(), nextOrder]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/subjects/checklists/:id
router.put('/checklists/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content, completed } = req.body;
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

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    values.push(req.user.id);
    
    const { rows } = await pool.query(
      `UPDATE study_topic_checklist_items SET ${updates.join(', ')} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} RETURNING *`,
      values
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Checklist item not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/subjects/checklists/:id
router.delete('/checklists/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM study_topic_checklist_items WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Checklist item not found' });
    }
    res.json({ message: 'Checklist item deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
