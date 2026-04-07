import pool from '../_db.js';
import { requireAuth } from '../_auth.js';

export default async function handler(req, res) {
  let userId;
  try {
    userId = await requireAuth(req);
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }

  if (req.method === 'GET') {
    try {
      const { subjectId, completed } = req.query;
      let query = 'SELECT * FROM study_subject_topics WHERE user_id = $1';
      let params = [userId];
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
      return res.status(200).json(rows);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { subjectId, title } = req.body;
      if (!subjectId || !title || !title.trim()) {
        return res.status(400).json({ error: 'subjectId and title are required' });
      }

      const maxResult = await pool.query(
        'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM study_subject_topics WHERE user_id = $1 AND subject_id = $2',
        [userId, subjectId]
      );
      const nextOrder = maxResult.rows[0].next_order;

      const { rows } = await pool.query(
        'INSERT INTO study_subject_topics (user_id, subject_id, title, sort_order) VALUES ($1, $2, $3, $4) RETURNING *',
        [userId, subjectId, title.trim(), nextOrder]
      );
      return res.status(200).json(rows[0]);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).end();
}
