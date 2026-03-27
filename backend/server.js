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
app.get('/api/export', async (req, res) => {
  const pool = require('./db');
  try {
    const [entriesReq, tasksReq] = await Promise.all([
      pool.query('SELECT * FROM entries ORDER BY date'),
      pool.query('SELECT * FROM tasks ORDER BY type, id')
    ]);
    res.json({ entries: entriesReq.rows, tasks: tasksReq.rows, exportedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Import endpoint - restore data from JSON
app.post('/api/import', async (req, res) => {
  const pool = require('./db');
  try {
    const { entries, tasks } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      if (entries && Array.isArray(entries)) {
        for (const entry of entries) {
          await client.query(`
            INSERT INTO entries (date, status, what_i_did, next_step, feeling, thought, free_write)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT(date) DO UPDATE SET
              status = $2, what_i_did = $3, next_step = $4,
              feeling = $5, thought = $6, free_write = $7, updated_at = CURRENT_TIMESTAMP
          `, [
            entry.date, entry.status, entry.what_i_did || '', entry.next_step || '',
            entry.feeling || '', entry.thought || '', entry.free_write || ''
          ]);
        }
      }

      if (tasks && Array.isArray(tasks)) {
        await client.query('DELETE FROM tasks');
        for (const task of tasks) {
          await client.query(
            'INSERT INTO tasks (type, content, completed) VALUES ($1, $2, $3)',
            [task.type, task.content || '', task.completed ? 1 : 0]
          );
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.json({ message: 'Data imported successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 CPA Tracker API running on http://localhost:${PORT}`);
});
