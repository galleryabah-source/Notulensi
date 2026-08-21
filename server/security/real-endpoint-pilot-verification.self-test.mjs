import assert from 'node:assert/strict';
import {
  REAL_ENDPOINT_PILOT,
  assertRealEndpointPilotReady,
  verifyRealEndpointPilotEvidence,
} from './real-endpoint-pilot-verification.mjs';

const blocked = verifyRealEndpointPilotEvidence();
assert.equal(REAL_ENDPOINT_PILOT.endpoint, 'meeting.read');
assert.equal(REAL_ENDPOINT_PILOT.method, 'GET');
assert.equal(blocked.ready, false);
assert.equal(blocked.checks.authenticatedRequestContext, false);
assert.equal(blocked.checks.ownershipEnforcement, false);
assert.equal(blocked.checks.livePostgresRead, false);
assert.equal(blocked.checks.endpointRegression, false);
assert.throws(() => assertRealEndpointPilotReady(), /REAL_ENDPOINT_PILOT_NOT_READY/);

const verified = assertRealEndpointPilotReady({
  authenticatedRequestContext: true,
  ownershipEnforcement: true,
  livePostgresRead: true,
  endpointRegression: true,
});
assert.equal(verified.ready, true);
assert.deepEqual(verified.checks, {
  authenticatedRequestContext: true,
  ownershipEnforcement: true,
  livePostgresRead: true,
  endpointRegression: true,
});

console.log('Phase 4.37 real endpoint pilot verification self-test: PASS');
