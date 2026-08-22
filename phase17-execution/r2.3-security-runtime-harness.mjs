import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';

const root = process.cwd();
const port = Number(process.env.R2_3_PORT || 4183);
const base = `http://127.0.0.1:${port}`;
const secret = process.env.JWT_SECRET;
const issuer = process.env.AUTH_ISSUER;
const audience = process.env.AUTH_AUDIENCE;
const databaseUrl = process.env.DATABASE_URL;
const activeUserId = '11111111-1111-4111-8111-111111111111';
const inactiveUserId = '22222222-2222-4222-8222-222222222222';
const adminUserId = '33333333-3333-4333-8333-333333333333';

if (!secret || secret.length < 32) throw new Error('JWT_SECRET is required');
if (!databaseUrl) throw new Error('DATABASE_URL is required');

function token(sub, overrides = {}, signingSecret = secret) {
  return jwt.sign({ sub, ...overrides }, signingSecret, {
    algorithm: 'HS256', issuer, audience,
    expiresIn: overrides.expired ? -60 : '10m',
  });
}

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, options);
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: response.status, body, headers: Object.fromEntries(response.headers.entries()) };
}

async function waitForHealth() {
  for (let i = 0; i < 40; i += 1) {
    try {
      const r = await request('/health');
      if (r.status === 200) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Security runtime did not become healthy');
}

const server = spawn(process.execPath, ['server/r2.2-auth-runtime.mjs'], {
  cwd: root,
  env: { ...process.env, R2_2_PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let stdout = '';
let stderr = '';
server.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
server.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

const checks = [];
const add = (name, passed, details, evidence = []) => checks.push({ name, status: passed ? 'PASS' : 'FAIL', details, evidence });

try {
  await waitForHealth();
  add('Security runtime reachable', true, 'R2.2 application runtime responded healthy.', [`${base}/health`]);

  const unauth = await request('/api/account/me');
  add('Authentication boundary rejects unauthenticated requests', unauth.status === 401, `HTTP ${unauth.status}`, ['/api/account/me']);

  const malformed = await request('/api/account/me', { headers: { authorization: 'Bearer not-a-jwt' } });
  add('Malformed bearer token rejected', malformed.status === 401, `HTTP ${malformed.status}`, ['/api/account/me']);

  const forged = jwt.sign({ sub: activeUserId }, 'wrong-secret', { algorithm: 'HS256', issuer, audience });
  const forgedResponse = await request('/api/account/me', { headers: { authorization: `Bearer ${forged}` } });
  add('Token signed with wrong secret rejected', forgedResponse.status === 401, `HTTP ${forgedResponse.status}`, ['/api/account/me']);

  const wrongIssuer = token(activeUserId, { iss: 'wrong-issuer' });
  const issuerResponse = await request('/api/account/me', { headers: { authorization: `Bearer ${wrongIssuer}` } });
  add('Wrong issuer rejected', issuerResponse.status === 401, `HTTP ${issuerResponse.status}`, ['/api/account/me']);

  const wrongAudience = token(activeUserId, { aud: 'wrong-audience' });
  const audienceResponse = await request('/api/account/me', { headers: { authorization: `Bearer ${wrongAudience}` } });
  add('Wrong audience rejected', audienceResponse.status === 401, `HTTP ${audienceResponse.status}`, ['/api/account/me']);

  const invalidSub = token('not-a-uuid');
  const subResponse = await request('/api/account/me', { headers: { authorization: `Bearer ${invalidSub}` } });
  add('Invalid subject identifier rejected', subResponse.status === 401, `HTTP ${subResponse.status}`, ['/api/account/me']);

  const expired = token(activeUserId, { expired: true });
  const expiredResponse = await request('/api/account/me', { headers: { authorization: `Bearer ${expired}` } });
  add('Expired token rejected', expiredResponse.status === 401, `HTTP ${expiredResponse.status}`, ['/api/account/me']);

  const inactive = token(inactiveUserId);
  const inactiveResponse = await request('/api/account/me', { headers: { authorization: `Bearer ${inactive}` } });
  add('Inactive account rejected', inactiveResponse.status === 401, `HTTP ${inactiveResponse.status}`, ['/api/account/me']);

  const active = token(activeUserId);
  const activeResponse = await request('/api/account/me', { headers: { authorization: `Bearer ${active}` } });
  add('Active account authenticated', activeResponse.status === 200 && activeResponse.body?.user?.id === activeUserId, `HTTP ${activeResponse.status}`, ['/api/account/me']);

  const nonAdmin = await request('/api/rbac/admin-check', { headers: { authorization: `Bearer ${active}` } });
  add('Non-admin authorization denied', nonAdmin.status === 403, `HTTP ${nonAdmin.status}`, ['/api/rbac/admin-check']);

  const admin = token(adminUserId);
  const adminResponse = await request('/api/rbac/admin-check', { headers: { authorization: `Bearer ${admin}` } });
  add('Admin authorization allowed', adminResponse.status === 200 && adminResponse.body?.authorized === true, `HTTP ${adminResponse.status}`, ['/api/rbac/admin-check']);

  const secretLeak = JSON.stringify([activeResponse.body, nonAdmin.body, adminResponse.body]);
  add('Authentication responses do not expose signing secret', !secretLeak.includes(secret), 'Controlled secret was not present in authenticated/authorization response bodies.', ['/api/account/me', '/api/rbac/admin-check']);

  // These controls are explicitly required by Phase 17.3. They must not be inferred from authentication alone.
  const phase173 = existsSync(`${root}/phase17.3-security-acceptance.js`) ? readFileSync(`${root}/phase17.3-security-acceptance.js`, 'utf8') : '';
  add('Phase 17.3 security contract present', phase173.length > 0, 'Security acceptance contract exists and is non-empty.', ['phase17.3-security-acceptance.js']);

  // Runtime evidence is deliberately fail-closed for controls that have no executable implementation in the current runtime.
  add('CSRF protection', false, 'No explicit CSRF control is exposed by the current bearer-token runtime; not inferred as PASS.');
  add('CORS policy', false, 'No explicit CORS policy is configured by the current runtime; not inferred as PASS.');
  add('Rate limiting', false, 'No executable rate-limit control is present in the current R2.2 runtime; not inferred as PASS.');
  add('Audit integrity', false, 'No executable audit-log integrity exercise is present in the current R2.2 runtime; not inferred as PASS.');
  add('Owner isolation', false, 'Current R2.2 runtime exposes identity/RBAC endpoints but no owner/resource-isolation endpoint suitable for an executable regression test.');
  add('Input validation', checks.find((c) => c.name === 'Invalid subject identifier rejected')?.status === 'PASS', 'UUID validation is exercised through the real authentication path.');
  add('Secret isolation', checks.find((c) => c.name === 'Authentication responses do not expose signing secret')?.status === 'PASS', 'Controlled secret is kept out of runtime response bodies.');

  const passed = checks.every((check) => check.status === 'PASS');
  const evidence = {
    schemaVersion: '1.0.0',
    runId: randomUUID(),
    generatedAt: new Date().toISOString(),
    environment: 'github-actions-ephemeral',
    scope: 'r2.3-security-regression-runtime',
    status: passed ? 'PASS' : 'FAIL',
    checks,
    note: 'FAIL is intentional when a Phase 17.3 control has no executable runtime implementation; NOT_RUN is not promoted to PASS.'
  };
  writeFileSync(`${root}/phase17-execution/r2.3-security-runtime.json`, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify(evidence, null, 2));
  if (!passed) process.exitCode = 1;
} finally {
  server.kill('SIGTERM');
  await new Promise((resolve) => setTimeout(resolve, 150));
  if (!server.killed) server.kill('SIGKILL');
  if (stderr.trim()) console.error(stderr.trim());
  if (stdout.trim()) console.log(stdout.trim());
}
