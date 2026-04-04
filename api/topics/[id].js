import pool from '../_db.js';
import { requireAuth } from '../_auth.js';

export default async function handler(req, res) {
  let userId;
  try {
    userId = await requireAuth(req);
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }

  const { id } = req.query;

  if (req.method === 'PUT') {
    try {
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
      values.push(userId);
      const { rows } = await pool.query(
        `UPDATE study_topics SET ${updates.join(', ')} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} RETURNING *`,
        values
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Topic not found' });
      }
      return res.status(200).json(rows[0]);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const result = await pool.query('DELETE FROM study_topics WHERE id = $1 AND user_id = $2', [id, userId]);
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Topic not found' });
      }
      return res.status(200).json({ message: 'Topic deleted' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', 'PUT, DELETE');
  return res.status(405).end();
}
