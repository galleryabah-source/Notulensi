import { createServer, request as httpRequest } from 'node:http';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { writeFileSync } from 'node:fs';

const port = Number(process.env.AUTH_HARNESS_PORT || 4180);
const output = process.env.AUTH_RUNTIME_EVIDENCE_OUTPUT || 'phase17-execution/auth-runtime-evidence.json';
const SESSION_TTL_MS = 5_000;
const users = new Map();
const sessions = new Map();

function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  return `${salt}:${scryptSync(password, salt, 32).toString('hex')}`;
}
function verifyPassword(password, stored) {
  const [salt, digest] = stored.split(':');
  const actual = scryptSync(password, salt, 32);
  return timingSafeEqual(actual, Buffer.from(digest, 'hex'));
}
function seed() {
  for (const [id, role, ownerId] of [
    ['admin-1', 'ADMIN', 'owner-a'], ['editor-1', 'EDITOR', 'owner-a'],
    ['reviewer-1', 'REVIEWER', 'owner-a'], ['auditor-1', 'AUDITOR', 'owner-a'],
    ['owner-1', 'OWNER', 'owner-a'], ['owner-b-1', 'OWNER', 'owner-b']
  ]) users.set(id, { id, role, ownerId, password: hashPassword(`test-${id}`) });
}
function parseCookies(req) {
  const header = req.headers.cookie || '';
  return Object.fromEntries(header.split(';').filter(Boolean).map(part => {
    const [k, ...v] = part.trim().split('=');
    return [k, decodeURIComponent(v.join('='))];
  }));
}
function json(res, status, body, headers = {}) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...headers });
  res.end(JSON.stringify(body));
}
function sessionFor(req) {
  const sid = parseCookies(req).sid;
  const session = sid && sessions.get(sid);
  if (!session) return null;
  if (Date.now() >= session.expiresAt || session.revoked) { sessions.delete(sid); return null; }
  return session;
}
function resourceAllowed(session, ownerId) {
  return Boolean(session && (session.role === 'ADMIN' || session.role === 'AUDITOR' || session.ownerId === ownerId));
}
seed();

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    if (req.method === 'GET' && url.pathname === '/health') return json(res, 200, { ok: true });
    if (req.method === 'POST' && url.pathname === '/login') {
      let raw = '';
      for await (const chunk of req) raw += chunk;
      const body = JSON.parse(raw || '{}');
      const user = users.get(body.userId);
      if (!user || !verifyPassword(String(body.password || ''), user.password)) return json(res, 401, { error: 'invalid_credentials' });
      const sid = randomBytes(32).toString('base64url');
      sessions.set(sid, { sid, userId: user.id, role: user.role, ownerId: user.ownerId, expiresAt: Date.now() + SESSION_TTL_MS, revoked: false });
      return json(res, 200, { authenticated: true, role: user.role }, { 'set-cookie': `sid=${encodeURIComponent(sid)}; HttpOnly; SameSite=Strict; Path=/` });
    }
    if (req.method === 'POST' && url.pathname === '/logout') {
      const session = sessionFor(req); if (session) session.revoked = true;
      return json(res, 200, { revoked: true });
    }
    if (req.method === 'GET' && url.pathname === '/resource') {
      const session = sessionFor(req); const ownerId = url.searchParams.get('ownerId');
      if (!session) return json(res, 401, { error: 'unauthenticated' });
      if (!resourceAllowed(session, ownerId)) return json(res, 403, { error: 'forbidden' });
      return json(res, 200, { authorized: true, ownerId, subject: session.userId, role: session.role });
    }
    return json(res, 404, { error: 'not_found' });
  } catch (error) { return json(res, 400, { error: 'bad_request', detail: error.message }); }
});

function request(method, path, body, cookie) {
  return new Promise((resolve, reject) => {
    const req = httpRequest({ hostname: '127.0.0.1', port, path, method, headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) } }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data || '{}'), cookie: res.headers['set-cookie']?.[0]?.split(';')[0] }));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
  const checks = [];
  const unauth = await request('GET', '/resource?ownerId=owner-a'); checks.push(['unauthenticated denied', unauth.status === 401]);
  const invalid = await request('POST', '/login', { userId: 'admin-1', password: 'wrong' }); checks.push(['invalid authentication rejected', invalid.status === 401]);
  const login = await request('POST', '/login', { userId: 'admin-1', password: 'test-admin-1' }); checks.push(['valid authentication', login.status === 200]);
  const adminResource = await request('GET', '/resource?ownerId=owner-b', null, login.cookie); checks.push(['admin authorized', adminResource.status === 200]);
  const ownerB = await request('POST', '/login', { userId: 'owner-b-1', password: 'test-owner-b-1' });
  const ownerBCross = await request('GET', '/resource?ownerId=owner-a', null, ownerB.cookie); checks.push(['cross-owner isolation', ownerBCross.status === 403]);
  const editor = await request('POST', '/login', { userId: 'editor-1', password: 'test-editor-1' });
  const editorOwn = await request('GET', '/resource?ownerId=owner-a', null, editor.cookie); checks.push(['role authorized on own resource', editorOwn.status === 200]);
  const logout = await request('POST', '/logout', null, editor.cookie);
  const afterLogout = await request('GET', '/resource?ownerId=owner-a', null, editor.cookie); checks.push(['revocation', logout.status === 200 && afterLogout.status === 401]);
  const expiry = await request('POST', '/login', { userId: 'reviewer-1', password: 'test-reviewer-1' });
  await new Promise(resolve => setTimeout(resolve, SESSION_TTL_MS + 100));
  const afterExpiry = await request('GET', '/resource?ownerId=owner-a', null, expiry.cookie); checks.push(['session expiry', afterExpiry.status === 401]);
  const pass = checks.every(([, ok]) => ok);
  const report = { schemaVersion: '1.0.0', harness: '17-E.11-B isolated auth/RBAC boundary', generatedAt: new Date().toISOString(), status: pass ? 'PASS' : 'FAIL', applicationRuntimeIntegrated: false, checks: checks.map(([name, passed]) => ({ name, status: passed ? 'PASS' : 'FAIL' })) };
  writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  server.close();
  process.exitCode = pass ? 0 : 1;
}
main().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
