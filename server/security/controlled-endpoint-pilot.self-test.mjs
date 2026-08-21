import assert from 'node:assert/strict';
import { createMeetingReadPilot } from './controlled-endpoint-pilot.mjs';

assert.throws(() => createMeetingReadPilot({
  env: { ENABLE_PROTECTED_ROUTES: 'false' },
  liveIntegrationVerified: true,
  endpointRegressionVerified: true,
  resolveContext: async () => ({ sessionId: 's', actorUserId: 'u', requestId: 'r' }),
  authorize: async () => ({ allowed: true, status: 200, reasonCode: 'PERMISSION_GRANTED' }),
  handler: async () => ({ status: 200, body: { ok: true } }),
}), /SECURITY_ACTIVATION_DENIED/);

let handlerCalls = 0;
const pilot = createMeetingReadPilot({
  env: { ENABLE_PROTECTED_ROUTES: 'true' },
  liveIntegrationVerified: true,
  endpointRegressionVerified: true,
  resolveContext: async () => ({ sessionId: 'pilot-session', actorUserId: 'pilot-user', requestId: 'pilot-request' }),
  authorize: async (_request, input) => {
    assert.equal(input.resourceType, 'MEETING');
    assert.equal(input.resourceId, 'meeting-pilot');
    assert.equal(input.requiredPermission, 'VIEW');
    assert.equal(input.operation, 'READ');
    return { allowed: true, status: 200, reasonCode: 'PERMISSION_GRANTED' };
  },
  handler: async (_request, auth) => {
    handlerCalls += 1;
    assert.equal(auth.context.actorUserId, 'pilot-user');
    return { status: 200, body: { ok: true, pilot: true } };
  },
});

assert.deepEqual(await pilot({ method: 'GET', params: { meetingId: 'meeting-pilot' } }), {
  status: 200,
  body: { ok: true, pilot: true },
});
assert.equal(handlerCalls, 1);

console.log('Phase 4.32 controlled endpoint pilot self-test: PASS');
