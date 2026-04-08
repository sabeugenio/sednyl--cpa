import dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const initDb = async () => {
  try {
    // Create tables if they don't exist (with new schema)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS entries (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) NOT NULL,
        date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'reset_day',
        what_i_did TEXT DEFAULT '',
        next_step TEXT DEFAULT '',
        feeling TEXT DEFAULT '',
        thought TEXT DEFAULT '',
        free_write TEXT DEFAULT '',
        total_time_seconds INTEGER DEFAULT 0,
        completed_tasks INTEGER DEFAULT 0,
        incomplete_tasks INTEGER DEFAULT 0,
        is_running INTEGER DEFAULT 0,
        last_start_time TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, date)
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('today', 'tomorrow')),
        content TEXT DEFAULT '',
        completed INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS settings (
        user_id UUID REFERENCES auth.users(id) NOT NULL,
        key TEXT,
        value TEXT DEFAULT '',
        PRIMARY KEY (user_id, key)
      );

      CREATE TABLE IF NOT EXISTS playlists (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) NOT NULL,
        video_id TEXT NOT NULL,
        title TEXT NOT NULL,
        thumbnail TEXT,
        channel TEXT,
        is_active INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS bible_verses (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) NOT NULL,
        verse TEXT NOT NULL,
        reference TEXT NOT NULL,
        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS study_topics (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        completed INTEGER DEFAULT 0,
        is_done INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS study_subjects (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) NOT NULL,
        name TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS study_subject_topics (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) NOT NULL,
        subject_id INTEGER REFERENCES study_subjects(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        completed INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS study_topic_checklist_items (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) NOT NULL,
        topic_id INTEGER REFERENCES study_subject_topics(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        completed INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS study_countdowns (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) NOT NULL,
        title TEXT NOT NULL,
        target_date TEXT NOT NULL,
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
      `ALTER TABLE entries ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id)`,
      `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id)`,
      `ALTER TABLE settings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id)`,
      `ALTER TABLE playlists ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id)`,
      `ALTER TABLE bible_verses ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id)`,
      `ALTER TABLE study_topics ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id)`,
      `ALTER TABLE entries ADD COLUMN IF NOT EXISTS completed_tasks INTEGER DEFAULT 0`,
      `ALTER TABLE entries ADD COLUMN IF NOT EXISTS incomplete_tasks INTEGER DEFAULT 0`,
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

    // Update constraints for entries
    try {
      await pool.query(`ALTER TABLE entries DROP CONSTRAINT IF EXISTS entries_date_key`);
    } catch (err) { }
    try {
      await pool.query(`ALTER TABLE entries ADD CONSTRAINT entries_user_id_date_key UNIQUE (user_id, date)`);
    } catch (err) { }

    // Update constraints for settings
    try {
      await pool.query(`ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_pkey`);
      await pool.query(`ALTER TABLE settings ADD PRIMARY KEY (user_id, key)`);
    } catch (err) { }

    console.log('✅ PostgreSQL database initialized');
  } catch (err) {
    console.error('❌ Database init error:', err);
  }
};

initDb();

export default pool;

// Add new subject-based tables to migrations (appended to migrations array)
