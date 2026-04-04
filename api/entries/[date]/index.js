import pool from '../../_db.js';

export default async function handler(req, res) {
  const { date } = req.query;

  if (req.method === 'GET') {
    try {
      const { rows } = await pool.query('SELECT * FROM entries WHERE date = $1', [date]);
      return res.status(200).json(rows[0] || null);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', 'GET');
  return res.status(405).end();
}
