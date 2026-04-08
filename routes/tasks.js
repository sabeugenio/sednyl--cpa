import express from 'express';
import pool from '../db.js';
import { expressAuth } from '../auth.js';

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

// POST /api/tasks/carryover - Carry over incomplete tasks to new day
router.post('/carryover', async (req, res) => {
  try {
    const client = await pool.connect();
    let skipped = false;
    try {
      await client.query('BEGIN');

      // Check if carryover already ran today
      const today = new Date().toISOString().split('T')[0];
      const { rows: settingsRows } = await client.query(
        `SELECT value FROM settings WHERE user_id = $1 AND key = 'last_carryover_date'`,
        [req.user.id]
      );

      if (settingsRows.length > 0 && settingsRows[0].value === today) {
        await client.query('COMMIT');
        skipped = true;
      } else {
        // 1) Delete completed 'today' tasks (they're done, clear them out)
        await client.query(
          `DELETE FROM tasks WHERE user_id = $1 AND type = 'today' AND completed = 1`,
          [req.user.id]
        );

        // 2) Promote 'tomorrow' tasks → 'today' (uncheck them)
        await client.query(
          `UPDATE tasks SET type = 'today', completed = 0 WHERE user_id = $1 AND type = 'tomorrow'`,
          [req.user.id]
        );

        // 3) Mark carryover as done for today
        await client.query(
          `INSERT INTO settings (user_id, key, value) VALUES ($1, 'last_carryover_date', $2)
           ON CONFLICT(user_id, key) DO UPDATE SET value = $2`,
          [req.user.id, today]
        );

        await client.query('COMMIT');
      }
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    if (skipped) {
      return res.json({ message: 'Carryover already ran today', skipped: true });
    }

    // Return the updated task list
    const { rows } = await pool.query('SELECT * FROM tasks WHERE user_id = $1 ORDER BY type, id', [req.user.id]);
    res.json({ message: 'Carryover complete', tasks: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
