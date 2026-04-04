import pool from '../_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }

  try {
    const { entries, tasks } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      if (entries && Array.isArray(entries)) {
        for (const entry of entries) {
          await client.query(`
            INSERT INTO entries (date, status, what_i_did, next_step, feeling, thought, free_write, total_time_seconds, is_running, last_start_time)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT(date) DO UPDATE SET
              status = $2, what_i_did = $3, next_step = $4,
              feeling = $5, thought = $6, free_write = $7,
              total_time_seconds = $8, is_running = $9, last_start_time = $10,
              updated_at = CURRENT_TIMESTAMP
          `, [
            entry.date, entry.status, entry.what_i_did || '', entry.next_step || '',
            entry.feeling || '', entry.thought || '', entry.free_write || '',
            entry.total_time_seconds || 0, entry.is_running ? 1 : 0, entry.last_start_time || null
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

    return res.status(200).json({ message: 'Data imported successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
