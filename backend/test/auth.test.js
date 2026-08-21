import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { authenticateRequest, verifyAccessToken } from '../src/auth.js';

const secret = 'phase49-test-jwt-secret-01234567890123456789';
process.env.JWT_SECRET = secret;
process.env.AUTH_ISSUER = 'meeting-intelligence-test';
process.env.AUTH_AUDIENCE = 'meeting-intelligence-api';

function tokenFor(sub, extra = {}) {
  return jwt.sign({ sub, ...extra }, secret, {
    algorithm: 'HS256',
    issuer: process.env.AUTH_ISSUER,
    audience: process.env.AUTH_AUDIENCE,
    expiresIn: '10m'
  });
}

function responseStub() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

test('verifyAccessToken rejects non-UUID subject', () => {
  const token = tokenFor('not-a-uuid');
  assert.throws(() => verifyAccessToken(token));
});

test('authenticateRequest loads role from database, not JWT role claim', async () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const token = tokenFor(userId, { role: 'admin' });
  const req = {
    get(name) {
      return name.toLowerCase() === 'authorization' ? `Bearer ${token}` : undefined;
    }
  };
  const res = responseStub();
  const pool = {
    async query(_sql, params) {
      assert.deepEqual(params, [userId]);
      return {
        rowCount: 1,
        rows: [{
          id: userId,
          email: 'user@example.test',
          status: 'active',
          role: 'user',
          created_at: '2026-08-21T00:00:00.000Z'
        }]
      };
    }
  };

  let nextCalled = false;
  await authenticateRequest(req, res, () => { nextCalled = true; }, pool);

  assert.equal(res.statusCode, null);
  assert.equal(nextCalled, true);
  assert.equal(req.user.role, 'user');
  assert.equal(req.user.id, userId);
});

test('authenticateRequest rejects suspended accounts', async () => {
  const userId = '22222222-2222-4222-8222-222222222222';
  const token = tokenFor(userId);
  const req = {
    get(name) {
      return name.toLowerCase() === 'authorization' ? `Bearer ${token}` : undefined;
    }
  };
  const res = responseStub();
  const pool = {
    async query() {
      return { rowCount: 1, rows: [{ id: userId, email: 's@example.test', status: 'suspended', role: 'user' }] };
    }
  };

  let nextCalled = false;
  await authenticateRequest(req, res, () => { nextCalled = true; }, pool);

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error, 'account_inactive');
  assert.equal(nextCalled, false);
});

test('authenticateRequest rejects expired tokens', async () => {
  const userId = '33333333-3333-4333-8333-333333333333';
  const token = jwt.sign({ sub: userId }, secret, {
    algorithm: 'HS256',
    issuer: process.env.AUTH_ISSUER,
    audience: process.env.AUTH_AUDIENCE,
    expiresIn: -1
  });
  const req = { get(name) { return name.toLowerCase() === 'authorization' ? `Bearer ${token}` : undefined; } };
  const res = responseStub();
  const pool = { async query() { throw new Error('database must not be queried for invalid token'); } };

  await authenticateRequest(req, res, () => {}, pool);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error, 'invalid_authentication');
});
