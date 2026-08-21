import pg from 'pg';
import { requireDatabaseUrl } from '../config.mjs';

const { Pool } = pg;

let pool;

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: requireDatabaseUrl(),
      max: 5,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000
    });
  }
  return pool;
}

export async function withDatabaseConnection(fn) {
  const client = await getPool().connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
