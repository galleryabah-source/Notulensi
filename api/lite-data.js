import { requireAdmin } from '../server/admin-auth.js';
import { readLite, writeLite } from '../server/lite-backend.js';

const buckets = new Map();
const MAX_BODY_BYTES = 512 * 1024;
function allow(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const key = `${forwarded || req.socket?.remoteAddress || 'unknown'}:${req.method}`;
  const now = Date.now(); const old = buckets.get(key) || { start: now, count: 0 };
  if (now - old.start > 60000) { old.start = now; old.count = 0; }
  old.count += 1; buckets.set(key, old); return old.count <= 60;
}
function headers(res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'microphone=(self)');
  res.setHeader('X-Notulensi-Lite-Backend', 'v2');
}
export default async function handler(req, res) {
  headers(res);
  if (!allow(req)) return res.status(429).json({ error: 'rate_limit_exceeded' });
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!['GET', 'PUT'].includes(req.method)) return res.status(405).json({ error: 'method_not_allowed' });
  const actor = requireAdmin(req, res); if (!actor) return;
  if (req.method === 'PUT') {
    if (req.headers['x-notulensi-lite-request'] !== '1') return res.status(403).json({ error: 'lite_request_header_required' });
    const contentLength = Number(req.headers['content-length'] || 0);
    if (contentLength > MAX_BODY_BYTES) return res.status(413).json({ error: 'payload_too_large' });
  }
  try {
    if (req.method === 'GET') return res.status(200).json({ ok: true, persistence: 'shared-app-storage', ...(await readLite(actor)) });
    const baseVersion = Number(req.body?.baseVersion);
    const result = await writeLite(actor, baseVersion, req.body?.data || {});
    if (result.conflict) return res.status(409).json({ ok: false, error: 'version_conflict', ...result });
    return res.status(200).json({ ok: true, persistence: 'shared-app-storage', ...result });
  } catch (error) {
    console.error('[lite-data]', error?.message || error);
    const message = String(error?.message || '');
    if (message.includes('payload exceeds')) return res.status(413).json({ ok: false, error: 'payload_too_large' });
    return res.status(503).json({ ok: false, error: 'lite_storage_unavailable' });
  }
}
