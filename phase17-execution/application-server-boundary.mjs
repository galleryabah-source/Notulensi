import http from 'node:http';
import { randomBytes, scryptSync, timingSafeEqual, randomUUID } from 'node:crypto';

const PORT = Number(process.env.APPLICATION_SERVER_PORT || 4190);
const HOST = process.env.APPLICATION_SERVER_HOST || '127.0.0.1';
const SESSION_TTL_MS = Number(process.env.APPLICATION_SESSION_TTL_MS || 300000);

const users = new Map();
const sessions = new Map();

function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const hash = scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}
function verifyPassword(password, record) {
  const actual = Buffer.from(scryptSync(password, record.salt, 64).toString('hex'), 'hex');
  const expected = Buffer.from(record.hash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
function seedUser(id, username, password, role, ownerId) {
  users.set(username, { id, username, role, ownerId, ...hashPassword(password) });
}
seedUser('admin-1', 'admin', 'phase17-admin-password', 'ADMIN', 'owner-a');
seedUser('operator-a', 'operator-a', 'phase17-operator-password', 'OPERATOR', 'owner-a');
seedUser('viewer-a', 'viewer-a', 'phase17-viewer-password', 'VIEWER', 'owner-a');
seedUser('viewer-b', 'viewer-b', 'phase17-viewer-b-password', 'VIEWER', 'owner-b');

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return Object.fromEntries(header.split(';').filter(Boolean).map((part) => {
    const index = part.indexOf('=');
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }));
}
function currentSession(req) {
  const token = parseCookies(req).phase17_session;
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() >= session.expiresAt) {
    sessions.delete(token);
    return null;
  }
  return session;
}
function json(res, status, body, headers = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers });
  res.end(payload);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; if (data.length > 16384) reject(new Error('payload too large')); });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch (error) { reject(error); } });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/api/auth/me') {
      const session = currentSession(req);
      if (!session) return json(res, 401, { ok: false, error: 'UNAUTHENTICATED' });
      return json(res, 200, { ok: true, user: session.user });
    }
    if (req.method === 'POST' && req.url === '/api/auth/login') {
      const body = await readBody(req);
      const user = users.get(String(body.username || ''));
      if (!user || !verifyPassword(String(body.password || ''), user)) return json(res, 401, { ok: false, error: 'INVALID_CREDENTIALS' });
      const token = randomUUID();
      sessions.set(token, { user: { id: user.id, username: user.username, role: user.role, ownerId: user.ownerId }, expiresAt: Date.now() + SESSION_TTL_MS });
      return json(res, 200, { ok: true, user: { id: user.id, username: user.username, role: user.role, ownerId: user.ownerId } }, { 'set-cookie': `phase17_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/` });
    }
    if (req.method === 'POST' && req.url === '/api/auth/logout') {
      const token = parseCookies(req).phase17_session;
      if (token) sessions.delete(token);
      return json(res, 200, { ok: true }, { 'set-cookie': 'phase17_session=; Max-Age=0; HttpOnly; SameSite=Strict; Path=/' });
    }
    if (req.method === 'GET' && req.url === '/api/protected/admin') {
      const session = currentSession(req);
      if (!session) return json(res, 401, { ok: false, error: 'UNAUTHENTICATED' });
      if (session.user.role !== 'ADMIN') return json(res, 403, { ok: false, error: 'FORBIDDEN' });
      return json(res, 200, { ok: true, area: 'admin' });
    }
    if (req.method === 'GET' && req.url.startsWith('/api/protected/owners/')) {
      const ownerId = req.url.slice('/api/protected/owners/'.length);
      const session = currentSession(req);
      if (!session) return json(res, 401, { ok: false, error: 'UNAUTHENTICATED' });
      if (session.user.role !== 'ADMIN' && session.user.ownerId !== ownerId) return json(res, 403, { ok: false, error: 'FORBIDDEN' });
      return json(res, 200, { ok: true, ownerId });
    }
    return json(res, 404, { ok: false, error: 'NOT_FOUND' });
  } catch (error) {
    return json(res, 500, { ok: false, error: 'INTERNAL_ERROR' });
  }
});

server.listen(PORT, HOST, () => console.log(`Phase 17 application server boundary listening on http://${HOST}:${PORT}`));
