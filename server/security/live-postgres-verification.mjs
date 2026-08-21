/**
 * Phase 4.38 — Live PostgreSQL Verification
 *
 * This verifier is deliberately opt-in. It never claims a live integration has
 * passed unless a real PostgreSQL connection succeeds and the security schema
 * required by the protected-endpoint layer is present.
 */

import { getPool, closePool } from '../db/client.mjs';

export const REQUIRED_SECURITY_TABLES = Object.freeze([
  'auth_sessions',
  'authorization_audit',
  'revocation_records',
  'share_records',
  'share_recipients',
  'token_events',
]);

export async function verifyLivePostgresSecuritySchema({
  connect = true,
} = {}) {
  if (!connect) {
    return Object.freeze({
      verified: false,
      reasonCode: 'LIVE_POSTGRES_CHECK_NOT_REQUESTED',
      requiredTables: REQUIRED_SECURITY_TABLES,
      presentTables: [],
    });
  }

  const pool = getPool();
  try {
    const connectivity = await pool.query('SELECT 1 AS ok');
    if (connectivity.rows?.[0]?.ok !== 1) {
      return Object.freeze({
        verified: false,
        reasonCode: 'POSTGRES_CONNECTIVITY_CHECK_FAILED',
        requiredTables: REQUIRED_SECURITY_TABLES,
        presentTables: [],
      });
    }

    const result = await pool.query(
      `SELECT tablename
         FROM pg_catalog.pg_tables
        WHERE schemaname = 'public'
          AND tablename = ANY($1::text[])
        ORDER BY tablename`,
      [REQUIRED_SECURITY_TABLES],
    );

    const presentTables = result.rows.map((row) => row.tablename);
    const missingTables = REQUIRED_SECURITY_TABLES.filter(
      (table) => !presentTables.includes(table),
    );

    return Object.freeze({
      verified: missingTables.length === 0,
      reasonCode:
        missingTables.length === 0
          ? 'LIVE_POSTGRES_SECURITY_SCHEMA_VERIFIED'
          : 'SECURITY_SCHEMA_TABLES_MISSING',
      requiredTables: REQUIRED_SECURITY_TABLES,
      presentTables,
      missingTables,
    });
  } catch (error) {
    return Object.freeze({
      verified: false,
      reasonCode: 'LIVE_POSTGRES_VERIFICATION_ERROR',
      errorMessage: error instanceof Error ? error.message : String(error),
      requiredTables: REQUIRED_SECURITY_TABLES,
      presentTables: [],
    });
  } finally {
    await closePool();
  }
}
