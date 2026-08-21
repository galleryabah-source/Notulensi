import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomUUID, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { extname, join, normalize } from 'node:path';

const HOST = process.env.MI_RUNTIME_HOST || '127.0.0.1';
const PORT = Number(process.env.MI_RUNTIME_PORT || 4173);
const ROOT = process.cwd();
const ENTRY = process.env.RUNTIME_APP_PATH || '/meeting-intelligence-app-phase4.3-integrated-safe.html';
const TTL = Number(process.env.APPLICATION_SESSION_TTL_MS || 300000);
const sessions = new Map();
const users = new Map();

function passwordRecord(password, salt = randomBytes(16).toString('hex')) {
  return { salt, hash: scryptSync(password, salt, 64).toString('hex') };
}
function verify(password, record) {
  const a = Buffer.from(scryptSync(password, record.salt, 64).toString('hex'), 'hex');
  const b = Buffer.from(record.hash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}
function addUser(id, username, password, role, ownerId) {
  users.set(username, { id, username, role, ownerId, ...passwordRecord(password) });
}
addUser('admin-1', 'admin', 'phase17-admin-password', 'ADMIN', 'owner-a');
addUser('operator-a', 'operator-a', 'phase17-operator-password', 'OPERATOR', 'owner-a');
addUser('viewer-a', 'viewer-a', 'phase17-viewer-password', 'VIEWER', 'owner-a');
addUser('viewer-b', 'viewer-b', 'phase17-viewer-b-password', 'VIEWER', 'owner-b');

function cookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map(part => {
    const i = part.indexOf('=');
    return [part.slice(0, i).trim(), decodeURIComponent(part.slice(i + 1).trim())];
  }));
}
function session(req) {
  const token = cookies(req).phase17_session;
  const value = token && sessions.get(token);
  if (!value) return null;
  if (Date.now() >= value.expiresAt) { sessions.delete(token); return null; }
  return value;
}
function sendJson(res, status, body, headers = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers });
  res.end(payload);
}
function body(req) {
  return new Promise((resolve, reject) => {
    let text = '';
    req.on('data', chunk => { text += chunk; if (text.length > 16384) reject(new Error('payload too large')); });
    req.on('end', () => { try { resolve(JSON.parse(text || '{}')); } catch { reject(new Error('invalid json')); } });
    req.on('error', reject);
  });
}
const injected = `<script data-phase17-auth-adapter>(async()=>{try{const r=await fetch('/api/auth/me',{credentials:'same-origin',cache:'no-store'});document.documentElement.dataset.phase17Auth=r.status===200?'authenticated':r.status===401?'anonymous':'error';window.dispatchEvent(new CustomEvent('phase17:auth',{detail:{status:r.status}}));}catch(e){document.documentElement.dataset.phase17Auth='error';}})();</script>`;

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/api/auth/me') {
      const s = session(req);
      return s ? sendJson(res, 200, { ok: true, user: s.user }) : sendJson(res, 401, { ok: false, error: 'UNAUTHENTICATED' });
    }
    if (req.method === 'POST' && req.url === '/api/auth/login') {
      const b = await body(req); const u = users.get(String(b.username || ''));
      if (!u || !verify(String(b.password || ''), u)) return sendJson(res, 401, { ok: false, error: 'INVALID_CREDENTIALS' });
      const token = randomUUID(); const user = { id: u.id, username: u.username, role: u.role, ownerId: u.ownerId };
      sessions.set(token, { user, expiresAt: Date.now() + TTL });
      return sendJson(res, 200, { ok: true, user }, { 'set-cookie': `phase17_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/` });
    }
    if (req.method === 'POST' && req.url === '/api/auth/logout') {
      const token = cookies(req).phase17_session; if (token) sessions.delete(token);
      return sendJson(res, 200, { ok: true }, { 'set-cookie': 'phase17_session=; Max-Age=0; HttpOnly; SameSite=Strict; Path=/' });
    }
    if (req.method === 'GET' && req.url === '/api/protected/admin') {
      const s = session(req); if (!s) return sendJson(res, 401, { ok: false, error: 'UNAUTHENTICATED' });
      if (s.user.role !== 'ADMIN') return sendJson(res, 403, { ok: false, error: 'FORBIDDEN' });
      return sendJson(res, 200, { ok: true, area: 'admin' });
    }
    if (req.method === 'GET' && req.url.startsWith('/api/protected/owners/')) {
      const ownerId = req.url.slice('/api/protected/owners/'.length); const s = session(req);
      if (!s) return sendJson(res, 401, { ok: false, error: 'UNAUTHENTICATED' });
      if (s.user.role !== 'ADMIN' && s.user.ownerId !== ownerId) return sendJson(res, 403, { ok: false, error: 'FORBIDDEN' });
      return sendJson(res, 200, { ok: true, ownerId });
    }

    if (req.method === 'GET') {
      const pathname = decodeURIComponent(new URL(req.url, `http://${HOST}:${PORT}`).pathname);
      const relative = pathname === '/' ? ENTRY : pathname;
      const safe = normalize(relative).replace(/^([.][.][\\/])+/, '').replace(/^\//, '');
      const file = join(ROOT, safe);
      const data = await readFile(file);
      if (extname(file).toLowerCase() === '.html') {
        const html = data.toString('utf8').replace(/<\/body>/i, `${injected}</body>`);
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        return res.end(html);
      }
      const types = { '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml' };
      res.writeHead(200, { 'content-type': types[extname(file).toLowerCase()] || 'application/octet-stream' });
      return res.end(data);
    }
    return sendJson(res, 404, { ok: false, error: 'NOT_FOUND' });
  } catch (error) {
    if (error.code === 'ENOENT') return sendJson(res, 404, { ok: false, error: 'NOT_FOUND' });
    return sendJson(res, 500, { ok: false, error: 'INTERNAL_ERROR' });
  }
});
server.listen(PORT, HOST, () => console.log(`Meeting Intelligence runtime adapter listening on http://${HOST}:${PORT}`));
