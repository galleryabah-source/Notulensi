import { createServer } from 'node:http';
import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const PORT = Number(process.env.AUTH_INTEGRATION_PORT || 4180);
const ROOT = process.cwd();
const SESSION_TTL_MS = 5 * 60 * 1000;

const users = new Map();
const sessions = new Map();

function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  return { salt, hash: scryptSync(password, salt, 32).toString('hex') };
}
function verifyPassword(password, record) {
  const actual = scryptSync(password, record.salt, 32);
  const expected = Buffer.from(record.hash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
function seedUser(username, password, role, ownerId) {
  const credentials = hashPassword(password);
  users.set(username, { id: randomUUID(), username, role, ownerId, ...credentials });
}
seedUser('admin', 'phase17-admin-password', 'ADMIN', 'owner-admin');
seedUser('operator', 'phase17-operator-password', 'OPERATOR', 'owner-a');
seedUser('viewer', 'phase17-viewer-password', 'VIEWER', 'owner-a');

function json(res, status, payload, headers = {}) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...headers });
  res.end(JSON.stringify(payload));
}
function parseCookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map((part) => {
    const index = part.indexOf('=');
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }));
}
function auth(req) {
  const token = parseCookies(req).session;
  if (!token) return null;
  const session = sessions.get(token);
  if (!session || session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  return session;
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; if (data.length > 16_384) reject(new Error('body too large')); });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch { reject(new Error('invalid json')); } });
    req.on('error', reject);
  });
}
function serveApp(req, res) {
  const requested = new URL(req.url, `http://${req.headers.host}`).pathname;
  const safePath = normalize(requested).replace(/^([.][.][/\\])+/, '');
  const file = safePath === '/' ? 'meeting-intelligence-app-phase4.3-integrated-safe.html' : safePath.replace(/^[/\\]+/, '');
  const absolute = join(ROOT, file);
  if (!existsSync(absolute)) return json(res, 404, { error: 'not_found' });
  const content = readFileSync(absolute);
  const type = extname(absolute) === '.html' ? 'text/html; charset=utf-8' : 'application/octet-stream';
  res.writeHead(200, { 'content-type': type });
  res.end(content);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === '/api/auth/login' && req.method === 'POST') {
      const body = await readBody(req);
      const user = users.get(String(body.username || ''));
      if (!user || !verifyPassword(String(body.password || ''), user)) return json(res, 401, { error: 'invalid_credentials' });
      const token = randomBytes(32).toString('base64url');
      sessions.set(token, { userId: user.id, username: user.username, role: user.role, ownerId: user.ownerId, expiresAt: Date.now() + SESSION_TTL_MS });
      return json(res, 200, { ok: true, user: { username: user.username, role: user.role, ownerId: user.ownerId } }, { 'set-cookie': `session=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/` });
    }
    if (url.pathname === '/api/auth/me' && req.method === 'GET') {
      const session = auth(req);
      return session ? json(res, 200, { authenticated: true, user: { username: session.username, role: session.role, ownerId: session.ownerId } }) : json(res, 401, { error: 'unauthenticated' });
    }
    if (url.pathname === '/api/auth/logout' && req.method === 'POST') {
      const token = parseCookies(req).session;
      if (token) sessions.delete(token);
      return json(res, 200, { ok: true }, { 'set-cookie': 'session=; Max-Age=0; HttpOnly; SameSite=Strict; Path=/' });
    }
    if (url.pathname === '/api/protected/admin' && req.method === 'GET') {
      const session = auth(req);
      if (!session) return json(res, 401, { error: 'unauthenticated' });
      if (session.role !== 'ADMIN') return json(res, 403, { error: 'forbidden' });
      return json(res, 200, { ok: true, area: 'admin' });
    }
    if (url.pathname === '/api/protected/owner-a' && req.method === 'GET') {
      const session = auth(req);
      if (!session) return json(res, 401, { error: 'unauthenticated' });
      if (session.ownerId !== 'owner-a' && session.role !== 'ADMIN') return json(res, 403, { error: 'owner_isolation' });
      return json(res, 200, { ok: true, ownerId: 'owner-a' });
    }
    return serveApp(req, res);
  } catch (error) {
    json(res, 500, { error: 'internal_error', message: error.message });
  }
});

server.listen(PORT, '127.0.0.1', () => console.log(`Phase 17-E.11 isolated auth integration server listening on 127.0.0.1:${PORT}`));
