import pool from '../_db.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { rows } = await pool.query('SELECT * FROM settings');
      const settings = {};
      rows.forEach((r) => { settings[r.key] = r.value; });
      return res.status(200).json(settings);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { key, value } = req.body;
      if (!key) return res.status(400).json({ error: 'key is required' });

      await pool.query(`
        INSERT INTO settings (key, value) VALUES ($1, $2)
        ON CONFLICT(key) DO UPDATE SET value = $2
      `, [key, String(value)]);

      const { rows } = await pool.query('SELECT * FROM settings');
      const settings = {};
      rows.forEach((r) => { settings[r.key] = r.value; });
      return res.status(200).json(settings);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).end();
}
