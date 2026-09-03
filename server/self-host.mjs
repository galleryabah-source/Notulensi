import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const apiDir = path.join(root, 'api');
const host = process.env.NOTULENSI_HOST || '127.0.0.1';
const port = Number(process.env.NOTULENSI_PORT || 3000);
const bodyLimit = process.env.NOTULENSI_BODY_LIMIT || '2mb';

if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('NOTULENSI_PORT must be a valid TCP port.');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', process.env.NOTULENSI_TRUST_PROXY === '1');

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()');
  next();
});

app.use(express.json({ limit: bodyLimit }));
app.use(express.urlencoded({ extended: false, limit: bodyLimit }));

const apiModules = new Map();
const apiNames = new Set(
  fs.readdirSync(apiDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
    .map((entry) => entry.name.slice(0, -3))
);

async function loadApi(name) {
  if (!apiNames.has(name)) return null;
  if (!apiModules.has(name)) {
    const moduleUrl = pathToFileURL(path.join(apiDir, `${name}.js`)).href;
    apiModules.set(name, import(moduleUrl));
  }
  const module = await apiModules.get(name);
  return typeof module.default === 'function' ? module.default : null;
}

const apiWindow = new Map();
const API_LIMIT = Number(process.env.NOTULENSI_API_RATE_LIMIT || 180);
const API_WINDOW_MS = 60_000;
const API_BUCKET_MAX = 10_000;
function allowApiRequest(req) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const bucket = apiWindow.get(ip);
  if (!bucket || now - bucket.start >= API_WINDOW_MS) {
    if (apiWindow.size >= API_BUCKET_MAX) {
      for (const [key, value] of apiWindow) {
        if (now - value.start >= API_WINDOW_MS) apiWindow.delete(key);
        if (apiWindow.size < API_BUCKET_MAX) break;
      }
    }
    apiWindow.set(ip, { start: now, count: 1 });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= API_LIMIT;
}

app.use('/api', async (req, res, next) => {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!allowApiRequest(req)) return res.status(429).json({ error: 'rate_limit_exceeded' });

  const raw = String(req.path || '').replace(/^\/+|\/+$/g, '');
  const name = raw.endsWith('.js') ? raw.slice(0, -3) : raw;
  if (!/^[A-Za-z0-9_-]+$/.test(name)) return res.status(404).json({ error: 'not_found' });

  try {
    const handler = await loadApi(name);
    if (!handler) return res.status(404).json({ error: 'not_found' });
    return await handler(req, res);
  } catch (error) {
    console.error('[notulensi-api-error]', name, error);
    if (res.headersSent) return next(error);
    const status = error?.type === 'entity.too.large' ? 413 : 500;
    return res.status(status).json({ error: status === 413 ? 'payload_too_large' : 'internal_server_error' });
  }
});

app.get('/health', async (_req, res) => {
  if (!process.env.DATABASE_URL) {
    const allowNoDb = process.env.NOTULENSI_ALLOW_NO_DB === '1';
    return res.status(allowNoDb ? 200 : 503).json({ ok: allowNoDb, service: 'notulensi', runtime: 'self-hosted', database: 'not_configured' });
  }

  try {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 3000, idleTimeoutMillis: 3000 });
    await pool.query('SELECT 1');
    await pool.end();
    return res.status(200).json({ ok: true, service: 'notulensi', runtime: 'self-hosted', database: 'ok' });
  } catch {
    return res.status(503).json({ ok: false, service: 'notulensi', runtime: 'self-hosted', database: 'error' });
  }
});

// Never expose server source, tests, scripts, package metadata, or dependency trees as static files.
const blockedStaticPrefixes = [
  '/server/', '/tests/', '/scripts/', '/api/', '/node_modules/', '/.git/', '/.github/', '/phase17-execution/',
  '/package.json', '/package-lock.json', '/pnpm-lock.yaml', '/yarn.lock', '/bun.lockb', '/.env', '/Caddyfile', '/SELF_HOST_WINDOWS.md'
];
app.use((req, res, next) => {
  const pathname = req.path || '/';
  if (blockedStaticPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix))) return res.status(404).type('text/plain').send('Not Found');
  next();
});

app.use(express.static(root, {
  index: 'index.html',
  fallthrough: true,
  dotfiles: 'ignore',
  setHeaders(res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
}));

app.use((_req, res) => res.status(404).type('text/plain').send('Not Found'));

const server = app.listen(port, host, () => {
  console.log(`[notulensi] self-hosted runtime listening on http://${host}:${port}`);
  console.log(`[notulensi] static root: ${root}`);
  console.log(`[notulensi] API handlers discovered: ${apiNames.size}`);
});

function shutdown(signal) {
  console.log(`[notulensi] received ${signal}; shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
