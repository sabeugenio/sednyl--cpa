import pg from 'pg';
const { Pool } = pg;

// Reuse pool across warm function invocations
let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
    });
  }
  return pool;
}

export default getPool();
