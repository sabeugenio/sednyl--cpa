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
      const { name } = req.body;
      const updates = [];
      const values = [];
      let paramIndex = 1;

      if (name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(name);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      values.push(id);
      values.push(userId);
      const { rows } = await pool.query(
        `UPDATE study_subjects SET ${updates.join(', ')} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} RETURNING *`,
        values
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Subject not found' });
      }
      return res.status(200).json(rows[0]);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const result = await pool.query(
        'DELETE FROM study_subjects WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Subject not found' });
      }
      return res.status(200).json({ message: 'Subject deleted' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', 'PUT, DELETE');
  return res.status(405).end();
}
