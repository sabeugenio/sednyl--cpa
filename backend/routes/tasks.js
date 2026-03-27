const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/tasks - Get all tasks
router.get('/', (req, res) => {
  try {
    const tasks = db.prepare('SELECT * FROM tasks ORDER BY type, id').all();
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks - Replace all tasks with new set
router.post('/', (req, res) => {
  try {
    const { tasks } = req.body;

    if (!Array.isArray(tasks)) {
      return res.status(400).json({ error: 'tasks must be an array' });
    }

    const deleteAll = db.prepare('DELETE FROM tasks');
    const insert = db.prepare(
      'INSERT INTO tasks (type, content, completed) VALUES (@type, @content, @completed)'
    );

    const upsertAll = db.transaction((taskList) => {
      deleteAll.run();
      for (const task of taskList) {
        insert.run({
          type: task.type,
          content: task.content || '',
          completed: task.completed ? 1 : 0
        });
      }
    });

    upsertAll(tasks);

    const updatedTasks = db.prepare('SELECT * FROM tasks ORDER BY type, id').all();
    res.json(updatedTasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
