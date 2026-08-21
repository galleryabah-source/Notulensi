import assert from 'node:assert/strict';
import {
  PHASE_429_ENDPOINT_CONTRACT,
  buildAuthorizationInput,
  createProtectedEndpointContract,
} from './protected-endpoint-contract.mjs';

const contract = createProtectedEndpointContract({
  name: 'meeting.read',
  method: 'GET',
  resourceType: 'MEETING',
  requiredPermission: 'VIEW',
  operation: 'READ',
  resolveResourceId: (request) => request.params?.meetingId,
  validateRequest: (request) => {
    if (!request.params?.meetingId) throw new Error('MEETING_ID_REQUIRED');
  },
});

const input = buildAuthorizationInput(
  contract,
  { method: 'GET', params: { meetingId: 'meeting-429' } },
  { sessionId: 'session-429', actorUserId: 'user-429', requestId: 'request-429' },
);
assert.deepEqual(input, {
  sessionId: 'session-429',
  actorUserId: 'user-429',
  requestId: 'request-429',
  resourceType: 'MEETING',
  resourceId: 'meeting-429',
  requiredPermission: 'VIEW',
  operation: 'READ',
});

assert.equal(PHASE_429_ENDPOINT_CONTRACT.denyByDefault, true);
assert.throws(
  () => buildAuthorizationInput(contract, { method: 'POST', params: { meetingId: 'meeting-429' } }, { sessionId: 's', actorUserId: 'u', requestId: 'r' }),
  /METHOD_NOT_ALLOWED/,
);
assert.throws(
  () => buildAuthorizationInput(contract, { method: 'GET', params: {} }, { sessionId: 's', actorUserId: 'u', requestId: 'r' }),
  /MEETING_ID_REQUIRED/,
);
assert.throws(
  () => buildAuthorizationInput(contract, { method: 'GET', params: { meetingId: '' } }, { sessionId: 's', actorUserId: 'u', requestId: 'r' }),
  /RESOURCE_ID_REQUIRED/,
);
assert.throws(() => createProtectedEndpointContract({
  name: 'invalid', method: 'GET', resourceType: 'MEETING', requiredPermission: 'ROOT', operation: 'READ',
  resolveResourceId: () => 'x', validateRequest: () => {},
}), /invalid requiredPermission/);

console.log('Phase 4.29 self-test: PASS');
