import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import pg from 'pg';

const { Pool } = pg;
const root = process.cwd();
const port = Number(process.env.R2_3_PORT || 4183);
const base = `http://127.0.0.1:${port}`;
const secret = process.env.JWT_SECRET;
const issuer = process.env.AUTH_ISSUER;
const audience = process.env.AUTH_AUDIENCE;
const databaseUrl = process.env.DATABASE_URL;
const ids = { user: '11111111-1111-4111-8111-111111111111', admin: '22222222-2222-4222-8222-222222222222', inactive: '33333333-3333-4333-8333-333333333333' };

if (!secret || secret.length < 32 || !databaseUrl) throw new Error('R2.3 runtime configuration missing');
const pool = new Pool({ connectionString: databaseUrl });
const output = `${root}/phase17-execution/r2.3-security-runtime.json`;
const result = { schemaVersion: '1.0.0', runId: randomUUID(), generatedAt: new Date().toISOString(), environment: 'github-actions-ephemeral', scope: 'r2.3-security-regression-runtime', status: 'FAIL', checks: [], note: 'FAIL is intentional when a Phase 17.3 control has no executable runtime implementation; NOT_RUN is not promoted to PASS.' };
const check = (name, passed, details, evidence = []) => result.checks.push({ name, status: passed ? 'PASS' : 'FAIL', details, evidence });
const token = (sub, options = {}, signingSecret = secret) => jwt.sign({ sub }, signingSecret, { algorithm: 'HS256', issuer, audience, ...options });

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, options);
  const text = await response.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  return { status: response.status, body, headers: Object.fromEntries(response.headers.entries()) };
}
async function waitForHealth() {
  for (let i = 0; i < 40; i += 1) { try { const r = await request('/health'); if (r.status === 200) return true; } catch {} await new Promise((resolve) => setTimeout(resolve, 100)); }
  return false;
}

let server;
try {
  await pool.query(readFileSync(`${root}/server/r2.2-schema.sql`, 'utf8'));
  await pool.query('TRUNCATE users');
  await pool.query(`INSERT INTO users(id,email,status,role) VALUES($1,'r2.3-user@example.invalid','active','user'),($2,'r2.3-admin@example.invalid','active','admin'),($3,'r2.3-inactive@example.invalid','suspended','admin')`, [ids.user, ids.admin, ids.inactive]);
  server = spawn(process.execPath, ['server/r2.2-auth-runtime.mjs'], { cwd: root, env: { ...process.env, R2_2_PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
  const ready = await waitForHealth();
  check('Security runtime reachable', ready, `health=${ready ? 'ready' : 'not-ready'}`, [`${base}/health`]);
  if (!ready) throw new Error('runtime_not_ready');

  const unauth = await request('/api/account/me'); check('Authentication boundary rejects unauthenticated requests', unauth.status === 401, `HTTP ${unauth.status}`, ['/api/account/me']);
  const malformed = await request('/api/account/me', { headers: { authorization: 'Bearer not-a-jwt' } }); check('Malformed bearer token rejected', malformed.status === 401, `HTTP ${malformed.status}`, ['/api/account/me']);
  const forged = jwt.sign({ sub: ids.user }, 'wrong-secret', { algorithm: 'HS256', issuer, audience }); const forgedResponse = await request('/api/account/me', { headers: { authorization: `Bearer ${forged}` } }); check('Token signed with wrong secret rejected', forgedResponse.status === 401, `HTTP ${forgedResponse.status}`, ['/api/account/me']);
  const wrongIssuer = jwt.sign({ sub: ids.user }, secret, { algorithm: 'HS256', issuer: 'wrong-issuer', audience }); const issuerResponse = await request('/api/account/me', { headers: { authorization: `Bearer ${wrongIssuer}` } }); check('Wrong issuer rejected', issuerResponse.status === 401, `HTTP ${issuerResponse.status}`, ['/api/account/me']);
  const wrongAudience = jwt.sign({ sub: ids.user }, secret, { algorithm: 'HS256', issuer, audience: 'wrong-audience' }); const audienceResponse = await request('/api/account/me', { headers: { authorization: `Bearer ${wrongAudience}` } }); check('Wrong audience rejected', audienceResponse.status === 401, `HTTP ${audienceResponse.status}`, ['/api/account/me']);
  const invalidSub = token('not-a-uuid', { expiresIn: '10m' }); const subResponse = await request('/api/account/me', { headers: { authorization: `Bearer ${invalidSub}` } }); check('Invalid subject identifier rejected', subResponse.status === 401, `HTTP ${subResponse.status}`, ['/api/account/me']);
  const expired = token(ids.user, { expiresIn: -60 }); const expiredResponse = await request('/api/account/me', { headers: { authorization: `Bearer ${expired}` } }); check('Expired token rejected', expiredResponse.status === 401, `HTTP ${expiredResponse.status}`, ['/api/account/me']);
  const inactive = token(ids.inactive, { expiresIn: '10m' }); const inactiveResponse = await request('/api/account/me', { headers: { authorization: `Bearer ${inactive}` } }); check('Inactive account rejected', inactiveResponse.status === 401, `HTTP ${inactiveResponse.status}`, ['/api/account/me']);
  const active = token(ids.user, { expiresIn: '10m' }); const activeResponse = await request('/api/account/me', { headers: { authorization: `Bearer ${active}` } }); check('Active account authenticated', activeResponse.status === 200 && activeResponse.body?.user?.id === ids.user, `HTTP ${activeResponse.status}`, ['/api/account/me']);
  const nonAdmin = await request('/api/rbac/admin-check', { headers: { authorization: `Bearer ${active}` } }); check('Non-admin authorization denied', nonAdmin.status === 403, `HTTP ${nonAdmin.status}`, ['/api/rbac/admin-check']);
  const admin = token(ids.admin, { expiresIn: '10m' }); const adminResponse = await request('/api/rbac/admin-check', { headers: { authorization: `Bearer ${admin}` } }); check('Admin authorization allowed', adminResponse.status === 200 && adminResponse.body?.authorized === true, `HTTP ${adminResponse.status}`, ['/api/rbac/admin-check']);

  const responseBodies = JSON.stringify([activeResponse.body, nonAdmin.body, adminResponse.body]);
  check('Authentication responses do not expose signing secret', !responseBodies.includes(secret), 'Controlled signing secret was not present in runtime response bodies.', ['/api/account/me', '/api/rbac/admin-check']);
  const phase173 = existsSync(`${root}/phase17.3-security-acceptance.js`) ? readFileSync(`${root}/phase17.3-security-acceptance.js`, 'utf8') : '';
  check('Phase 17.3 security contract present', phase173.length > 0, 'Security acceptance contract exists and is non-empty.', ['phase17.3-security-acceptance.js']);

  // Explicit Phase 17.3 requirements without executable implementation are failures, not implicit passes.
  check('CSRF protection', false, 'No explicit CSRF control is exposed by the current bearer-token runtime; not inferred as PASS.');
  check('CORS policy', false, 'No explicit CORS policy is configured by the current runtime; not inferred as PASS.');
  check('Rate limiting', false, 'No executable rate-limit control is present in the current R2.2 runtime; not inferred as PASS.');
  check('Audit integrity', false, 'No executable audit-log integrity exercise is present in the current R2.2 runtime; not inferred as PASS.');
  check('Owner isolation', false, 'Current R2.2 runtime exposes identity/RBAC endpoints but no owner/resource-isolation endpoint suitable for an executable regression test.');
  check('Input validation', subResponse.status === 401, 'UUID validation is exercised through the real authentication path.');
  check('Secret isolation', !responseBodies.includes(secret), 'Controlled signing secret is kept out of runtime response bodies.');
  result.status = result.checks.every((item) => item.status === 'PASS') ? 'PASS' : 'FAIL';
} catch (error) {
  check('Harness execution', false, error instanceof Error ? error.message : String(error));
} finally {
  if (server) server.kill('SIGTERM');
  await pool.end();
}
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(result, null, 2));
if (result.status !== 'PASS') process.exitCode = 1;
