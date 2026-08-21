import assert from 'node:assert/strict';
import { createProtectedRoute } from './protected-route.mjs';
import {
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

let handlerCalls = 0;
let authorizationCalls = 0;
const route = createProtectedRoute({
  resolveContext: async () => ({
    sessionId: 'session-430',
    actorUserId: 'user-430',
    requestId: 'request-430',
  }),
  resolveAuthorizationInput: async (request, context) =>
    buildAuthorizationInput(contract, request, context),
  authorize: async (_request, input) => {
    authorizationCalls += 1;
    assert.equal(input.resourceId, 'meeting-430');
    assert.equal(input.requiredPermission, 'VIEW');
    return { allowed: true, status: 200, reasonCode: 'PERMISSION_GRANTED' };
  },
  handler: async (_request, auth) => {
    handlerCalls += 1;
    assert.equal(auth.context.actorUserId, 'user-430');
    return { status: 200, body: { ok: true } };
  },
});

assert.deepEqual(await route({ method: 'GET', params: { meetingId: 'meeting-430' } }), {
  status: 200,
  body: { ok: true },
});
assert.equal(handlerCalls, 1);
assert.equal(authorizationCalls, 1);

const denied = createProtectedRoute({
  resolveContext: async () => ({ sessionId: 's', actorUserId: 'u', requestId: 'r' }),
  resolveAuthorizationInput: async (request, context) =>
    buildAuthorizationInput(contract, request, context),
  authorize: async () => ({ allowed: false, status: 403, reasonCode: 'PERMISSION_DENIED' }),
  handler: async () => { throw new Error('denied handler executed'); },
});
assert.deepEqual(await denied({ method: 'GET', params: { meetingId: 'meeting-430' } }), {
  status: 403,
  body: { ok: false, error: 'PERMISSION_DENIED' },
});

const unauthenticated = createProtectedRoute({
  resolveContext: async () => { throw new Error('expired'); },
  resolveAuthorizationInput: async () => { throw new Error('must not execute'); },
  authorize: async () => { throw new Error('must not execute'); },
  handler: async () => { throw new Error('must not execute'); },
});
assert.deepEqual(await unauthenticated({ method: 'GET', params: { meetingId: 'meeting-430' } }), {
  status: 401,
  body: { ok: false, error: 'AUTHENTICATION_REQUIRED' },
});

const invalidRequest = createProtectedRoute({
  resolveContext: async () => ({ sessionId: 's', actorUserId: 'u', requestId: 'r' }),
  resolveAuthorizationInput: async (request, context) =>
    buildAuthorizationInput(contract, request, context),
  authorize: async () => { throw new Error('must not authorize invalid request'); },
  handler: async () => { throw new Error('must not execute'); },
});
assert.deepEqual(await invalidRequest({ method: 'POST', params: { meetingId: 'meeting-430' } }), {
  status: 400,
  body: { ok: false, error: 'REQUEST_INVALID' },
});

const missingResource = createProtectedRoute({
  resolveContext: async () => ({ sessionId: 's', actorUserId: 'u', requestId: 'r' }),
  resolveAuthorizationInput: async (request, context) =>
    buildAuthorizationInput(contract, request, context),
  authorize: async () => { throw new Error('must not authorize missing resource'); },
  handler: async () => { throw new Error('must not execute'); },
});
assert.deepEqual(await missingResource({ method: 'GET', params: {} }), {
  status: 400,
  body: { ok: false, error: 'REQUEST_INVALID' },
});

console.log('Phase 4.30 security integration regression: PASS');
