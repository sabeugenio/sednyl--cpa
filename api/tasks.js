import pool from './_db.js';
import { requireAuth } from './_auth.js';

export default async function handler(req, res) {
  let userId;
  try {
    userId = await requireAuth(req);
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }

  if (req.method === 'GET') {
    try {
      const { rows } = await pool.query('SELECT * FROM tasks WHERE user_id = $1 ORDER BY type, id', [userId]);
      return res.status(200).json(rows);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { tasks } = req.body;

      if (!Array.isArray(tasks)) {
        return res.status(400).json({ error: 'tasks must be an array' });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('DELETE FROM tasks WHERE user_id = $1', [userId]);

        for (const task of tasks) {
          await client.query(
            'INSERT INTO tasks (user_id, type, content, completed) VALUES ($1, $2, $3, $4)',
            [userId, task.type, task.content || '', task.completed ? 1 : 0]
          );
        }

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }

      const { rows } = await pool.query('SELECT * FROM tasks WHERE user_id = $1 ORDER BY type, id', [userId]);
      return res.status(200).json(rows);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).end();
}
