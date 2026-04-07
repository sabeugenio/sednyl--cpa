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
      const { topicId } = req.query;
      let query = 'SELECT * FROM study_topic_checklist_items WHERE user_id = $1';
      let params = [userId];

      if (topicId) {
        query += ' AND topic_id = $2';
        params.push(topicId);
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
      const { topicId, content } = req.body;
      if (!topicId || !content || !content.trim()) {
        return res.status(400).json({ error: 'topicId and content are required' });
      }

      const maxResult = await pool.query(
        'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM study_topic_checklist_items WHERE user_id = $1 AND topic_id = $2',
        [userId, topicId]
      );
      const nextOrder = maxResult.rows[0].next_order;

      const { rows } = await pool.query(
        'INSERT INTO study_topic_checklist_items (user_id, topic_id, content, sort_order) VALUES ($1, $2, $3, $4) RETURNING *',
        [userId, topicId, content.trim(), nextOrder]
      );
      return res.status(200).json(rows[0]);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).end();
}
