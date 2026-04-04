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
      const { done } = req.query;
      let query = 'SELECT * FROM study_topics WHERE user_id = $1';
      let params = [userId];

      if (done !== undefined) {
        query += ' AND is_done = $2';
        params.push(done === '1' ? 1 : 0);
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
      const { content } = req.body;
      if (!content || !content.trim()) {
        return res.status(400).json({ error: 'content is required' });
      }

      const maxResult = await pool.query('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM study_topics WHERE user_id = $1', [userId]);
      const nextOrder = maxResult.rows[0].next_order;

      const { rows } = await pool.query(
        'INSERT INTO study_topics (user_id, content, sort_order) VALUES ($1, $2, $3) RETURNING *',
        [userId, content.trim(), nextOrder]
      );
      return res.status(200).json(rows[0]);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).end();
}
