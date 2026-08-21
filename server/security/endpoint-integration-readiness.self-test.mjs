import assert from 'node:assert/strict';
import {
  endpointIntegrationReadiness,
  getEndpointReadiness,
  isEndpointActivationReady,
} from './endpoint-integration-readiness.mjs';

assert.equal(endpointIntegrationReadiness.phase, '4.36');
assert.equal(endpointIntegrationReadiness.status, 'READINESS_ONLY');
assert.equal(endpointIntegrationReadiness.productionRouteMounting, false);

const pilot = getEndpointReadiness('meeting.read');
assert.ok(pilot);
assert.equal(pilot.method, 'GET');
assert.equal(pilot.resourceType, 'MEETING');
assert.equal(pilot.operation, 'READ');
assert.equal(pilot.requiredPermission, 'VIEW');
assert.equal(pilot.pilotCandidate, true);
assert.equal(pilot.productionMounted, false);
assert.equal(pilot.verification.authenticationSource, 'authenticated-request-context');
assert.equal(pilot.verification.ownershipRequired, true);

// Phase 4.36 must remain fail-closed until live verification and explicit approval.
assert.equal(pilot.verification.livePostgresVerified, false);
assert.equal(pilot.verification.endpointRegressionVerified, false);
assert.equal(pilot.verification.activationApproved, false);
assert.equal(isEndpointActivationReady('meeting.read'), false);
assert.equal(isEndpointActivationReady('missing.endpoint'), false);

console.log('Phase 4.36 endpoint integration readiness self-test: PASS');
