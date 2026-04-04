import pool from '../_db.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
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

      const maxResult = await pool.query('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM study_topics');
      const nextOrder = maxResult.rows[0].next_order;

      const { rows } = await pool.query(
        'INSERT INTO study_topics (content, sort_order) VALUES ($1, $2) RETURNING *',
        [content.trim(), nextOrder]
      );
      return res.status(200).json(rows[0]);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).end();
}
