import express from 'express';
const router = express.Router();
import pool from '../db.js';

// GET /api/tasks - Get all tasks
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM tasks ORDER BY type, id');
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
      await client.query('DELETE FROM tasks');
      
      for (const task of tasks) {
        await client.query(
          'INSERT INTO tasks (type, content, completed) VALUES ($1, $2, $3)',
          [task.type, task.content || '', task.completed ? 1 : 0]
        );
      }
      
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    const { rows } = await pool.query('SELECT * FROM tasks ORDER BY type, id');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
