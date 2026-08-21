import assert from 'node:assert/strict';
import {
  REQUIRED_SECURITY_TABLES,
  verifyLivePostgresSecuritySchema,
} from './live-postgres-verification.mjs';

assert.deepEqual(REQUIRED_SECURITY_TABLES, [
  'auth_sessions',
  'authorization_audit',
  'revocation_records',
  'share_records',
  'share_recipients',
  'token_events',
]);

const skipped = await verifyLivePostgresSecuritySchema({ connect: false });
assert.equal(skipped.verified, false);
assert.equal(skipped.reasonCode, 'LIVE_POSTGRES_CHECK_NOT_REQUESTED');

console.log('Phase 4.38 live PostgreSQL verifier self-test: PASS');
