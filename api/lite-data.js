import { requireAdmin } from './_admin-auth.js';
import { readLite, writeLite } from './_lite-backend.js';

const buckets = new Map();
function allow(req) {
  const key = `${req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown'}:${req.method}`;
  const now = Date.now(); const old = buckets.get(key) || { start: now, count: 0 };
  if (now - old.start > 60000) { old.start = now; old.count = 0; }
  old.count += 1; buckets.set(key, old); return old.count <= 60;
}
function headers(res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('X-Notulensi-Lite-Backend', 'v1');
}
export default async function handler(req, res) {
  headers(res);
  if (!allow(req)) return res.status(429).json({ error: 'rate_limit_exceeded' });
  if (!['GET', 'PUT'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  const actor = requireAdmin(req, res); if (!actor) return;
  if (req.method === 'PUT' && req.headers['x-notulensi-lite-request'] !== '1') return res.status(403).json({ error: 'lite_request_header_required' });
  try {
    if (req.method === 'GET') return res.status(200).json({ ok: true, persistence: 'shared-app-storage', ...(await readLite(actor)) });
    const baseVersion = Number(req.body?.baseVersion);
    const result = await writeLite(actor, baseVersion, req.body?.data || {});
    if (result.conflict) return res.status(409).json({ ok: false, error: 'version_conflict', ...result });
    return res.status(200).json({ ok: true, persistence: 'shared-app-storage', ...result });
  } catch (error) {
    console.error('[lite-data]', error?.message || error);
    return res.status(503).json({ ok: false, error: 'lite_storage_unavailable' });
  }
}
