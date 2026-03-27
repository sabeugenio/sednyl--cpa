const express = require('express');
const cors = require('cors');
const path = require('path');

const entriesRouter = require('./routes/entries');
const tasksRouter = require('./routes/tasks');
const settingsRouter = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/entries', entriesRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/settings', settingsRouter);

// Export endpoint - download all data as JSON
app.get('/api/export', (req, res) => {
  const db = require('./db');
  try {
    const entries = db.prepare('SELECT * FROM entries ORDER BY date').all();
    const tasks = db.prepare('SELECT * FROM tasks ORDER BY type, id').all();
    res.json({ entries, tasks, exportedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Import endpoint - restore data from JSON
app.post('/api/import', (req, res) => {
  const db = require('./db');
  try {
    const { entries, tasks } = req.body;

    const importData = db.transaction(() => {
      if (entries && Array.isArray(entries)) {
        const upsertEntry = db.prepare(`
          INSERT INTO entries (date, status, what_i_did, next_step, feeling, thought, free_write)
          VALUES (@date, @status, @what_i_did, @next_step, @feeling, @thought, @free_write)
          ON CONFLICT(date) DO UPDATE SET
            status = @status,
            what_i_did = @what_i_did,
            next_step = @next_step,
            feeling = @feeling,
            thought = @thought,
            free_write = @free_write,
            updated_at = datetime('now')
        `);
        for (const entry of entries) {
          upsertEntry.run({
            date: entry.date,
            status: entry.status,
            what_i_did: entry.what_i_did || '',
            next_step: entry.next_step || '',
            feeling: entry.feeling || '',
            thought: entry.thought || '',
            free_write: entry.free_write || ''
          });
        }
      }

      if (tasks && Array.isArray(tasks)) {
        db.prepare('DELETE FROM tasks').run();
        const insertTask = db.prepare(
          'INSERT INTO tasks (type, content, completed) VALUES (@type, @content, @completed)'
        );
        for (const task of tasks) {
          insertTask.run({
            type: task.type,
            content: task.content || '',
            completed: task.completed ? 1 : 0
          });
        }
      }
    });

    importData();
    res.json({ message: 'Data imported successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 CPA Tracker API running on http://localhost:${PORT}`);
});
