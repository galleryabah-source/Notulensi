import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import jwt from 'jsonwebtoken';

const { Client } = pg;
const port = Number(process.env.TEST_PORT || 8099);
const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/meeting_intelligence_test';
const jwtSecret = process.env.JWT_SECRET || 'integration-test-jwt-secret-01234567890123456789';
const tokenPepper = process.env.SHARE_TOKEN_PEPPER || 'integration-test-share-pepper-01234567890123456789';
const issuer = 'meeting-intelligence-integration';
const audience = 'meeting-intelligence-api';

let client;
let server;
let userId;
let shareId;
let firstToken;

async function request(path, options = {}) {
  return fetch(`http://127.0.0.1:${port}${path}`, options);
}

function authFor(id = userId, role = 'user') {
  return `Bearer ${jwt.sign({ sub: id, role }, jwtSecret, {
    algorithm: 'HS256',
    issuer,
    audience,
    expiresIn: '10m'
  })}`;
}

function authWithoutRole(id = userId) {
  return `Bearer ${jwt.sign({ sub: id }, jwtSecret, {
    algorithm: 'HS256',
    issuer,
    audience,
    expiresIn: '10m'
  })}`;
}

before(async () => {
  client = new Client({ connectionString: databaseUrl });
  await client.connect();
  await client.query(await readFile(new URL('../schema.sql', import.meta.url), 'utf8'));

  const seeded = await client.query(
    `INSERT INTO users (email, role) VALUES ($1, 'user')
     ON CONFLICT (email) DO UPDATE SET status='active', role='user'
     RETURNING id`,
    ['integration@example.test']
  );
  userId = seeded.rows[0].id;

  await client.query(
    `INSERT INTO users (id, email, role) VALUES
      ('00000000-0000-0000-0000-000000000001', 'attacker@example.test', 'user')
     ON CONFLICT (id) DO UPDATE SET status='active', role='user'`
  );

  await client.query('DELETE FROM document_shares WHERE owner_id=$1', [userId]);
  await client.query('DELETE FROM documents WHERE owner_id=$1', [userId]);

  await client.query(
    `INSERT INTO documents (id, owner_id, source_meeting_id) VALUES ('doc-integration', $1, 'meeting-integration')`,
    [userId]
  );
  await client.query(
    `INSERT INTO document_revisions (id, document_id, revision_number, content_hash, content, source_transcript_hash, source_analysis_hash)
     VALUES ('rev-integration', 'doc-integration', 1, 'hash-v1', 'Integration revision v1', 'transcript-v1', 'analysis-v1')
     ON CONFLICT (id) DO NOTHING`
  );
  await client.query(`UPDATE documents SET current_revision_id='rev-integration' WHERE id='doc-integration'`);

  server = spawn(process.execPath, ['src/server.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      DATABASE_URL: databaseUrl,
      JWT_SECRET: jwtSecret,
      SHARE_TOKEN_PEPPER: tokenPepper,
      AUTH_ISSUER: issuer,
      AUTH_AUDIENCE: audience,
      DATABASE_SSL: 'false',
      CORS_ORIGIN: 'http://127.0.0.1:3000',
      RESOLVE_RATE_LIMIT: '1000'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('backend startup timeout')), 10000);
    const onData = (chunk) => {
      if (chunk.toString().includes('Secure Share Backend listening')) {
        clearTimeout(timeout);
        resolve();
      }
    };
    server.stdout.on('data', onData);
    server.stderr.on('data', (chunk) => {
      if (chunk.toString().includes('Error')) console.error(chunk.toString());
    });
    server.once('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`backend exited before startup: ${code}`));
    });
  });
});

after(async () => {
  if (server) server.kill('SIGTERM');
  if (client) {
    await client.query("DELETE FROM documents WHERE id='doc-integration'").catch(() => {});
    await client.query("DELETE FROM users WHERE email='attacker@example.test'").catch(() => {});
    await client.end();
  }
});

test('authentication and ownership boundaries are enforced', async () => {
  const unauthenticated = await request('/api/shares', { method: 'GET' });
  assert.equal(unauthenticated.status, 401);

  const attackerId = '00000000-0000-0000-0000-000000000001';
  const crossOwner = await request('/api/shares', {
    method: 'POST',
    headers: { authorization: authFor(attackerId), 'content-type': 'application/json' },
    body: JSON.stringify({ documentId: 'doc-integration', revisionId: 'rev-integration', visibility: 'unlisted' })
  });
  assert.equal(crossOwner.status, 403);
});

test('JWT role claim cannot elevate a normal database user', async () => {
  const me = await request('/api/account/me', { headers: { authorization: authFor(userId, 'admin') } });
  assert.equal(me.status, 200);
  const body = await me.json();
  assert.equal(body.user.role, 'user');
});

test('account endpoint returns the authenticated database identity', async () => {
  const me = await request('/api/account/me', { headers: { authorization: authWithoutRole() } });
  assert.equal(me.status, 200);
  const body = await me.json();
  assert.equal(body.user.id, userId);
  assert.equal(body.user.email, 'integration@example.test');
  assert.equal(body.user.status, 'active');
});

test('secure share lifecycle: create → resolve → rotate → revoke', async () => {
  const auth = authFor();
  const create = await request('/api/shares', {
    method: 'POST',
    headers: { authorization: auth, 'content-type': 'application/json' },
    body: JSON.stringify({ documentId: 'doc-integration', revisionId: 'rev-integration', visibility: 'unlisted' })
  });
  assert.equal(create.status, 201);
  const created = await create.json();
  shareId = created.share.id;
  firstToken = created.accessToken;
  assert.ok(firstToken);
  assert.ok(!created.share.tokenHash);

  const wrong = await request(`/api/shares/${shareId}`, { headers: { 'x-share-token': 'wrong-token-value-1234567890' } });
  assert.equal(wrong.status, 403);

  const resolved = await request(`/api/shares/${shareId}`, { headers: { 'x-share-token': firstToken } });
  assert.equal(resolved.status, 200);
  const resolvedBody = await resolved.json();
  assert.equal(resolvedBody.revision.id, 'rev-integration');
  assert.equal(resolvedBody.revision.contentHash, 'hash-v1');

  const rotate = await request(`/api/shares/${shareId}/rotate`, {
    method: 'POST',
    headers: { authorization: auth }
  });
  assert.equal(rotate.status, 200);
  const rotated = await rotate.json();
  assert.ok(rotated.accessToken);
  assert.notEqual(rotated.accessToken, firstToken);

  const oldToken = await request(`/api/shares/${shareId}`, { headers: { 'x-share-token': firstToken } });
  assert.equal(oldToken.status, 403);
  const newToken = await request(`/api/shares/${shareId}`, { headers: { 'x-share-token': rotated.accessToken } });
  assert.equal(newToken.status, 200);

  const revoke = await request(`/api/shares/${shareId}`, { method: 'DELETE', headers: { authorization: auth } });
  assert.equal(revoke.status, 200);

  const revoked = await request(`/api/shares/${shareId}`, { headers: { 'x-share-token': rotated.accessToken } });
  assert.equal(revoked.status, 403);

  const rotateRevoked = await request(`/api/shares/${shareId}/rotate`, {
    method: 'POST',
    headers: { authorization: auth }
  });
  assert.equal(rotateRevoked.status, 409);

  const audit = await request(`/api/shares/${shareId}/audit`, { headers: { authorization: auth } });
  assert.equal(audit.status, 200);
  const events = (await audit.json()).events.map((event) => event.event);
  assert.ok(events.includes('created'));
  assert.ok(events.includes('resolved'));
  assert.ok(events.includes('denied'));
  assert.ok(events.includes('rotated'));
  assert.ok(events.includes('revoked'));
});

test('share policy enforces authentication and per-share access limits', async () => {
  const auth = authFor();
  const create = await request('/api/shares', {
    method: 'POST',
    headers: { authorization: auth, 'content-type': 'application/json' },
    body: JSON.stringify({
      documentId: 'doc-integration',
      revisionId: 'rev-integration',
      visibility: 'private',
      policy: { allowAnonymousRead: false, maxAccessPerMinute: 1 }
    })
  });
  assert.equal(create.status, 201);
  const created = await create.json();

  const anonymous = await request(`/api/shares/${created.share.id}`, {
    headers: { 'x-share-token': created.accessToken }
  });
  assert.equal(anonymous.status, 401);

  const first = await request(`/api/shares/${created.share.id}`, {
    headers: { authorization: auth, 'x-share-token': created.accessToken }
  });
  assert.equal(first.status, 200);

  const second = await request(`/api/shares/${created.share.id}`, {
    headers: { authorization: auth, 'x-share-token': created.accessToken }
  });
  assert.equal(second.status, 429);
});
