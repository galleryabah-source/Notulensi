import assert from 'node:assert/strict';
import { createAuthorizationMiddleware, createDenyAllAuthorizationMiddleware } from './authorization-middleware.mjs';

const base = {
  method: 'GET',
  sessionId: 'session-1',
  actorUserId: 'user-1',
  resourceType: 'MEETING',
  resourceId: 'meeting-1',
  requiredPermission: 'VIEW',
  operation: 'READ_MEETING',
  requestId: 'request-1',
};

const repository = {
  async authorizeResourceAccess(input) {
    assert.equal(input.sessionId, 'session-1');
    return { allowed: true, decision: 'ALLOW', reasonCode: 'PERMISSION_GRANTED', grantedPermission: 'VIEW' };
  },
};

const middleware = createAuthorizationMiddleware({ repository, resolveRequest: async () => base });
assert.deepEqual(await middleware(base), {
  allowed: true,
  status: 200,
  reasonCode: 'PERMISSION_GRANTED',
  decision: { allowed: true, decision: 'ALLOW', reasonCode: 'PERMISSION_GRANTED', grantedPermission: 'VIEW' },
});

const denied = createAuthorizationMiddleware({
  repository: { authorizeResourceAccess: async () => ({ allowed: false, reasonCode: 'PERMISSION_DENIED' }) },
  resolveRequest: async () => base,
});
assert.equal((await denied(base)).status, 403);

const unavailable = createAuthorizationMiddleware({
  repository: { authorizeResourceAccess: async () => { throw new Error('db down'); } },
  resolveRequest: async () => base,
});
assert.equal((await unavailable(base)).reasonCode, 'AUTHORIZATION_UNAVAILABLE');

const malformed = createAuthorizationMiddleware({ repository, resolveRequest: async () => ({ ...base, requestId: '' }) });
assert.equal((await malformed(base)).status, 401);

const denyAll = createDenyAllAuthorizationMiddleware();
assert.deepEqual(await denyAll(base), { allowed: false, status: 503, reasonCode: 'AUTHORIZATION_UNAVAILABLE' });

console.log('Phase 4.26 self-test: PASS');
