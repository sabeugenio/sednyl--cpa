import express from 'express';
import pool from '../db.js';
import { expressAuth } from '../api/_auth.js';

const router = express.Router();
router.use(expressAuth);

// GET /api/tasks - Get all tasks
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM tasks WHERE user_id = $1 ORDER BY type, id', [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks - Replace all tasks with new set
router.post('/', async (req, res) => {
  try {
    const { tasks } = req.body;

    if (!Array.isArray(tasks)) {
      return res.status(400).json({ error: 'tasks must be an array' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM tasks WHERE user_id = $1', [req.user.id]);
      
      for (const task of tasks) {
        await client.query(
          'INSERT INTO tasks (user_id, type, content, completed) VALUES ($1, $2, $3, $4)',
          [req.user.id, task.type, task.content || '', task.completed ? 1 : 0]
        );
      }
      
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    const { rows } = await pool.query('SELECT * FROM tasks WHERE user_id = $1 ORDER BY type, id', [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
