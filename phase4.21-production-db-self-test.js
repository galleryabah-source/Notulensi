/* PHASE 4.21 — static production database migration contract test */
(function (global) {
  'use strict';

  const REQUIRED_TABLES = [
    'auth_sessions',
    'share_records',
    'share_recipients',
    'token_events',
    'revocation_records',
    'authorization_audit',
  ];

  const REQUIRED_CONSTRAINT_MARKERS = [
    "session_id text NOT NULL UNIQUE",
    "token_hash text NOT NULL UNIQUE",
    "permission IN ('VIEW','COMMENT','DOWNLOAD','EDIT','MANAGE')",
    "decision IN ('ALLOW','DENY')",
    "CREATE TRIGGER authorization_audit_no_update",
    "CREATE TRIGGER revocation_records_no_update",
    'CREATE EXTENSION IF NOT EXISTS pgcrypto',
  ];

  function runPhase421SelfTest(sqlText) {
    const sql = String(sqlText || '');
    const checks = {};

    for (const table of REQUIRED_TABLES) {
      checks['table:' + table] = new RegExp('CREATE TABLE IF NOT EXISTS\\s+' + table + '\\b', 'i').test(sql);
    }

    for (const marker of REQUIRED_CONSTRAINT_MARKERS) {
      checks['marker:' + marker] = sql.includes(marker);
    }

    checks.noRawBearerTokenColumn = !/\\braw_?token\\b/i.test(sql);
    checks.noApiKeyColumn = !/\\bapi_?key\\b/i.test(sql);
    checks.transactionWrapped = /^\\s*BEGIN;[\\s\\S]*COMMIT;\\s*$/i.test(sql);
    checks.auditAppendOnly = /BEFORE UPDATE OR DELETE ON authorization_audit/i.test(sql);
    checks.revocationAppendOnly = /BEFORE UPDATE OR DELETE ON revocation_records/i.test(sql);

    const failed = Object.keys(checks).filter((key) => !checks[key]);
    return { phase: '4.21', passed: failed.length === 0, checks, failed };
  }

  global.runPhase421SelfTest = runPhase421SelfTest;
})(typeof window !== 'undefined' ? window : globalThis);
