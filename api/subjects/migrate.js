import pool from '../_db.js';

export async function createSubjectsTables() {
  try {
    // Create study_subjects table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS study_subjects (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) NOT NULL,
        name TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create study_subject_topics table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS study_subject_topics (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) NOT NULL,
        subject_id INTEGER REFERENCES study_subjects(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        completed INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create study_topic_checklist_items table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS study_topic_checklist_items (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) NOT NULL,
        topic_id INTEGER REFERENCES study_subject_topics(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        completed INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Subject tables created successfully');
  } catch (err) {
    console.error('❌ Error creating subject tables:', err);
  }
}

createSubjectsTables();
