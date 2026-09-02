import { Pool } from 'pg';

let pool;
const KEY_PREFIX = 'notulensi:lite:v2:';
const LEGACY_KEY_PREFIX = 'notulensi:lite:v1:';
const MAX_BYTES = 512 * 1024;
const MAX_SESSIONS = 100;
const MAX_TEXT = 100000;

function databaseUrl() {
  const raw = String(process.env.DATABASE_URL || process.env.notulensi_POSTGRES_URL || process.env.notulensi_POSTGRES_PRISMA_URL || process.env.notulensi_DATABASE_URL_UNPOOLED || '').trim();
  if (!raw) throw new Error('DATABASE_URL is not configured.');
  try { const u = new URL(raw); u.searchParams.delete('sslmode'); u.searchParams.delete('uselibpqcompat'); return u.toString(); }
  catch { return raw; }
}
function db() {
  if (!pool) pool = new Pool({ connectionString: databaseUrl(), max: 2, idleTimeoutMillis: 10000, connectionTimeoutMillis: 5000, ssl: String(process.env.DATABASE_SSL || 'verify-full').toLowerCase() === 'disable' ? false : { rejectUnauthorized: true } });
  return pool;
}
function text(value, max) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
function normalizeSession(value, index) {
  return {
    id: text(value?.id, 120) || `s_${index + 1}`,
    title: text(value?.title, 240) || `Sesi ${index + 1}`,
    text: text(value?.text, MAX_TEXT),
    durationMs: Number.isFinite(Number(value?.durationMs)) ? Math.max(0, Math.min(Number(value.durationMs), 86400000)) : 0,
    createdAt: text(value?.createdAt, 60) || new Date().toISOString(),
    recordingId: text(value?.recordingId, 160),
    audioAvailable: Boolean(value?.audioAvailable)
  };
}
export function normalizeData(input) {
  const sessions = Array.isArray(input?.sessions) ? input.sessions.slice(0, MAX_SESSIONS).map(normalizeSession) : [];
  const data = { sessions };
  if (Buffer.byteLength(JSON.stringify(data), 'utf8') > MAX_BYTES) throw new Error('Lite payload exceeds 512 KB.');
  return data;
}
function keyForPrefix(actor, prefix) {
  const safe = String(actor?.sub || '').trim().toLowerCase();
  if (!safe || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safe)) throw new Error('Invalid Lite actor.');
  return `${prefix}${Buffer.from(safe).toString('base64url')}`;
}
export function keyFor(actor) { return keyForPrefix(actor, KEY_PREFIX); }
function legacyToSessions(value) {
  const transcripts = Array.isArray(value?.data?.transcripts) ? value.data.transcripts : [];
  return normalizeData({ sessions: transcripts.map((t, i) => ({ id: text(t?.id, 120) || `legacy_${i + 1}`, title: t?.title, text: t?.body, createdAt: t?.updatedAt })) });
}
export async function readLite(actor) {
  const current = await db().query('SELECT value FROM public.app_storage WHERE key=$1', [keyFor(actor)]);
  if (current.rows[0]?.value) {
    const value = current.rows[0].value;
    return { version: Number(value.version || 0), data: normalizeData(value.data || {}) };
  }
  const legacy = await db().query('SELECT value FROM public.app_storage WHERE key=$1', [keyForPrefix(actor, LEGACY_KEY_PREFIX)]);
  if (legacy.rows[0]?.value) return { version: 0, data: legacyToSessions(legacy.rows[0].value), migratedFrom: 'v1-transcripts' };
  return { version: 0, data: { sessions: [] } };
}
export async function writeLite(actor, baseVersion, data) {
  if (!Number.isInteger(baseVersion) || baseVersion < 0) throw new Error('baseVersion is required.');
  const normalized = normalizeData(data);
  const key = keyFor(actor);
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const current = await client.query('SELECT value FROM public.app_storage WHERE key=$1 FOR UPDATE', [key]);
    const currentVersion = Number(current.rows[0]?.value?.version || 0);
    if (currentVersion !== baseVersion) { await client.query('ROLLBACK'); return { conflict: true, version: currentVersion, data: normalizeData(current.rows[0]?.value?.data || {}) }; }
    const next = { version: currentVersion + 1, data: normalized, updatedAt: new Date().toISOString() };
    await client.query('INSERT INTO public.app_storage(key,value,updated_at) VALUES($1,$2::jsonb,NOW()) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=NOW()', [key, JSON.stringify(next)]);
    await client.query('COMMIT');
    return { conflict: false, version: next.version, data: normalized };
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; }
  finally { client.release(); }
}
