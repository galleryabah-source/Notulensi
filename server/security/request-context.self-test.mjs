import assert from 'node:assert/strict';
import { createRequestContextResolver, createAnonymousRequestContext } from './request-context.mjs';

const token = 'secret-token-for-test';
const resolver = createRequestContextResolver({
  repository: {
    async getActiveSessionByTokenHash(hash) {
      assert.match(hash, /^[a-f0-9]{64}$/);
      return { sessionId: 'session-27', userId: 'user-27' };
    },
  },
  createRequestId: () => 'generated-request-27',
});

const result = await resolver({ headers: { authorization: `Bearer ${token}` } }, {
  resourceType: 'MEETING', resourceId: 'meeting-27', requiredPermission: 'VIEW', operation: 'READ',
});
assert.equal(result.sessionId, 'session-27');
assert.equal(result.actorUserId, 'user-27');
assert.equal(result.requestId, 'generated-request-27');
assert.equal(result.resourceId, 'meeting-27');
assert.equal('token' in result, false);

await assert.rejects(() => resolver({ headers: {} }, {}));
await assert.rejects(() => resolver({ headers: { authorization: 'Basic abc' } }, {}));
await assert.rejects(() => resolver({ headers: { authorization: `Bearer ${'x'.repeat(5000)}` } }, {}));

const anonymous = createAnonymousRequestContext();
await assert.rejects(() => anonymous({ headers: {} }, {}));

console.log('Phase 4.27 self-test: PASS');
