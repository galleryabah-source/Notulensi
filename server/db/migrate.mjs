import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { getPool, closePool } from './client.mjs';

const MIGRATION_ID = '00421_security_authorization';
const migrationPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../db/migrations/00421_security_authorization.sql'
);

function withoutOuterTransaction(sql) {
  return sql
    .replace(/^\s*BEGIN\s*;\s*/i, '')
    .replace(/\s*COMMIT\s*;\s*$/i, '');
}

async function migrate() {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        migration_id text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const existing = await client.query(
      'SELECT migration_id FROM schema_migrations WHERE migration_id = $1',
      [MIGRATION_ID]
    );

    if (existing.rowCount > 0) {
      await client.query('COMMIT');
      console.log(`Migration already applied: ${MIGRATION_ID}`);
      return;
    }

    const sql = withoutOuterTransaction(await readFile(migrationPath, 'utf8'));
    await client.query(sql);
    await client.query(
      'INSERT INTO schema_migrations (migration_id) VALUES ($1)',
      [MIGRATION_ID]
    );
    await client.query('COMMIT');
    console.log(`Migration applied: ${MIGRATION_ID}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await closePool();
  }
}

migrate().catch((error) => {
  console.error('Database migration failed:', error.message);
  process.exitCode = 1;
});
