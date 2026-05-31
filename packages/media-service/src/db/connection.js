import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'notes_db',
  user: process.env.DB_USER || 'noteforge',
  password: process.env.DB_PASSWORD || 'noteforge_secret',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('[Media DB] Connected:', result.rows[0].now);
    client.release();
  } catch (err) {
    console.error('[Media DB] Connection failed:', err.message);
    throw err;
  }
};

export const query = (text, params) => pool.query(text, params);
