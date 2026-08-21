import test from 'node:test';
import assert from 'node:assert/strict';
import { hashSecret, safeEqualHash, issueToken, expiresAtFromPolicy, hashClient } from '../src/security.js';

const pepper = 'phase4.8-test-pepper-0123456789abcdef0123456789abcdef';

test('issueToken produces cryptographically sized URL-safe tokens', () => {
  const token = issueToken();
  assert.equal(typeof token, 'string');
  assert.ok(token.length >= 40);
  assert.match(token, /^[A-Za-z0-9_-]+$/);
});

test('hashSecret is deterministic and pepper-dependent', () => {
  const first = hashSecret('token-a', pepper);
  const second = hashSecret('token-a', pepper);
  const different = hashSecret('token-b', pepper);
  assert.equal(first, second);
  assert.notEqual(first, different);
  assert.match(first, /^[0-9a-f]{64}$/);
});

test('safeEqualHash rejects malformed values and compares valid hashes', () => {
  const hash = hashSecret('token-a', pepper);
  assert.equal(safeEqualHash(hash, hash), true);
  assert.equal(safeEqualHash(hash, hashSecret('token-b', pepper)), false);
  assert.equal(safeEqualHash(hash, 'not-a-hash'), false);
  assert.equal(safeEqualHash('short', 'short'), false);
});

test('expiresAtFromPolicy applies the configured TTL deterministically', () => {
  const now = Date.parse('2026-08-21T00:00:00.000Z');
  const result = expiresAtFromPolicy({ ttlMinutes: 60 }, now);
  assert.equal(result.toISOString(), '2026-08-21T01:00:00.000Z');
  assert.throws(() => expiresAtFromPolicy({ ttlMinutes: 0 }, now));
  assert.throws(() => expiresAtFromPolicy({ ttlMinutes: 60 * 24 * 31 }, now));
});

test('client fingerprint hashing never returns the raw identifier', () => {
  const raw = '203.0.113.10';
  const hashed = hashClient(raw, pepper);
  assert.notEqual(hashed, raw);
  assert.match(hashed, /^[0-9a-f]{64}$/);
});
