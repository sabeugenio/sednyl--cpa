import pool from '../_db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end();
  }

  try {
    const [entriesReq, tasksReq] = await Promise.all([
      pool.query('SELECT * FROM entries ORDER BY date'),
      pool.query('SELECT * FROM tasks ORDER BY type, id')
    ]);
    return res.status(200).json({
      entries: entriesReq.rows,
      tasks: tasksReq.rows,
      exportedAt: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
