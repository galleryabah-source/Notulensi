import assert from 'node:assert/strict';
import {
  createPilotVerificationEvidence,
  isPilotProductionReady,
} from './pilot-verification-evidence.mjs';

const incomplete = createPilotVerificationEvidence({
  endpointName: 'meeting.read.pilot',
});
assert.equal(incomplete.productionReady, false);
assert.equal(isPilotProductionReady(incomplete), false);

const complete = createPilotVerificationEvidence({
  endpointName: 'meeting.read.pilot',
  authenticatedRequestContextVerified: true,
  ownershipVerified: true,
  authorizationDecisionVerified: true,
  auditEventVerified: true,
  livePostgresVerified: true,
  endpointRegressionVerified: true,
  activationApproved: true,
});
assert.equal(complete.productionReady, true);
assert.equal(isPilotProductionReady(complete), true);

console.log('Phase 4.37 pilot verification evidence self-test: PASS');
