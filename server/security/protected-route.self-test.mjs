import assert from 'node:assert/strict';
import { createProtectedRoute } from './protected-route.mjs';

let handlerCalls = 0;
const route = createProtectedRoute({
  authorize: async (_request, input) => {
    assert.equal(input.resourceId, 'meeting-28');
    return { allowed: true, status: 200, reasonCode: 'PERMISSION_GRANTED' };
  },
  resolveContext: async () => ({ sessionId: 'session-28', actorUserId: 'user-28' }),
  resolveAuthorizationInput: async (_request, context) => ({
    ...context,
    resourceType: 'MEETING', resourceId: 'meeting-28', requiredPermission: 'VIEW', operation: 'READ', requestId: 'request-28',
  }),
  handler: async (_request, auth) => {
    handlerCalls += 1;
    assert.equal(auth.context.actorUserId, 'user-28');
    return { status: 200, body: { ok: true } };
  },
});
assert.deepEqual(await route({ method: 'GET' }), { status: 200, body: { ok: true } });
assert.equal(handlerCalls, 1);

const denied = createProtectedRoute({
  authorize: async () => ({ allowed: false, status: 403, reasonCode: 'PERMISSION_DENIED' }),
  resolveContext: async () => ({ sessionId: 's', actorUserId: 'u' }),
  resolveAuthorizationInput: async () => ({}),
  handler: async () => { throw new Error('must not run'); },
});
assert.deepEqual(await denied({}), { status: 403, body: { ok: false, error: 'PERMISSION_DENIED' } });

const unauthenticated = createProtectedRoute({
  authorize: async () => ({ allowed: true, status: 200 }),
  resolveContext: async () => { throw new Error('invalid session'); },
  resolveAuthorizationInput: async () => ({}),
  handler: async () => { throw new Error('must not run'); },
});
assert.deepEqual(await unauthenticated({}), { status: 401, body: { ok: false, error: 'AUTHENTICATION_REQUIRED' } });

console.log('Phase 4.28 self-test: PASS');
