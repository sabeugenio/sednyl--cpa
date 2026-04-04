import pg from 'pg';
const { Pool } = pg;

// Reuse pool across warm function invocations
let pool;

function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      ssl: {
        rejectUnauthorized: false,
      },
    });
  }
  return pool;
}

export default getPool();
