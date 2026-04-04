import dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const initDb = async () => {
  try {
    // Create tables if they don't exist (with new schema)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS entries (
        id SERIAL PRIMARY KEY,
        date TEXT UNIQUE NOT NULL,
        status TEXT NOT NULL DEFAULT 'reset_day',
        what_i_did TEXT DEFAULT '',
        next_step TEXT DEFAULT '',
        feeling TEXT DEFAULT '',
        thought TEXT DEFAULT '',
        free_write TEXT DEFAULT '',
        total_time_seconds INTEGER DEFAULT 0,
        is_running INTEGER DEFAULT 0,
        last_start_time TEXT DEFAULT NULL,
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

      CREATE TABLE IF NOT EXISTS playlists (
        id SERIAL PRIMARY KEY,
        video_id TEXT NOT NULL,
        title TEXT NOT NULL,
        thumbnail TEXT,
        channel TEXT,
        is_active INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS bible_verses (
        id SERIAL PRIMARY KEY,
        verse TEXT NOT NULL,
        reference TEXT NOT NULL,
        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS study_topics (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL DEFAULT '',
        completed INTEGER DEFAULT 0,
        is_done INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Run migrations for existing databases
    // Add new columns if they don't exist
    const migrations = [
      `ALTER TABLE entries ADD COLUMN IF NOT EXISTS total_time_seconds INTEGER DEFAULT 0`,
      `ALTER TABLE entries ADD COLUMN IF NOT EXISTS is_running INTEGER DEFAULT 0`,
      `ALTER TABLE entries ADD COLUMN IF NOT EXISTS last_start_time TEXT DEFAULT NULL`,
      `ALTER TABLE study_topics ADD COLUMN IF NOT EXISTS is_done INTEGER DEFAULT 0`,
    ];

    for (const sql of migrations) {
      try {
        await pool.query(sql);
      } catch (err) {
        // Column might already exist, that's fine
        if (!err.message.includes('already exists')) {
          console.warn('Migration warning:', err.message);
        }
      }
    }

    // Drop the old CHECK constraint on status and allow new values
    // PostgreSQL: drop constraint by name if it exists, then re-add
    try {
      await pool.query(`ALTER TABLE entries DROP CONSTRAINT IF EXISTS entries_status_check`);
    } catch (err) {
      // Constraint might not exist
    }
    try {
      await pool.query(`
        ALTER TABLE entries ADD CONSTRAINT entries_status_check 
        CHECK(status IN ('strong', 'showed_up', 'bare_minimum', 'missed', 'peak_focus', 'great_progress', 'getting_started', 'reset_day'))
      `);
    } catch (err) {
      // Constraint might already exist with the new values
      if (!err.message.includes('already exists')) {
        console.warn('Constraint warning:', err.message);
      }
    }

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

export default pool;
