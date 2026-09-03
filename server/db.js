import mysql from 'mysql2/promise';
import 'dotenv/config';

// Determine SSL options for TiDB Cloud / Production MySQL
const isSslRequired =
  process.env.DATABASE_SSL === 'true' ||
  process.env.MYSQL_SSL === 'true' ||
  (process.env.DATABASE_HOST && process.env.DATABASE_HOST.includes('tidbcloud.com')) ||
  process.env.NODE_ENV === 'production';

const sslConfig = isSslRequired
  ? {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false'
    }
  : undefined;

// Create resilient connection pool
export const pool = mysql.createPool({
  host: process.env.DATABASE_HOST || process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.DATABASE_PORT || process.env.MYSQL_PORT || 3306),
  user: process.env.DATABASE_USER || process.env.MYSQL_USER || 'root',
  password: process.env.DATABASE_PASSWORD ?? process.env.MYSQL_PASSWORD ?? '',
  database: process.env.DATABASE_NAME || process.env.MYSQL_DATABASE || 'code_clever',
  ssl: sslConfig,
  waitForConnections: true,
  connectionLimit: Number(process.env.DATABASE_POOL_SIZE || 10),
  maxIdle: Number(process.env.DATABASE_MAX_IDLE || 10),
  idleTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  decimalNumbers: true
});

// Helper for transaction execution
export async function executeTransaction(callback) {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Graceful pool closure
export async function closePool() {
  try {
    await pool.end();
    console.log('[DB] MySQL connection pool closed cleanly.');
  } catch (err) {
    console.error('[DB] Error closing MySQL connection pool:', err);
  }
}
