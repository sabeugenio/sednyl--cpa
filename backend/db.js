require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS entries (
        id SERIAL PRIMARY KEY,
        date TEXT UNIQUE NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('strong', 'showed_up', 'bare_minimum', 'missed')),
        what_i_did TEXT DEFAULT '',
        next_step TEXT DEFAULT '',
        feeling TEXT DEFAULT '',
        thought TEXT DEFAULT '',
        free_write TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        type TEXT NOT NULL CHECK(type IN ('today', 'tomorrow')),
        content TEXT DEFAULT '',
        completed INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT DEFAULT ''
      );
    `);

    // Initialize default phase
    await pool.query(
      "INSERT INTO settings (key, value) VALUES ('current_phase', '1') ON CONFLICT (key) DO NOTHING"
    );
    console.log('✅ PostgreSQL database initialized');
  } catch (err) {
    console.error('❌ Database init error:', err);
  }
};

initDb();

module.exports = pool;
