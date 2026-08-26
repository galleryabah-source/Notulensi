import { Pool } from 'pg';

let pool;
const KEY_PREFIX = 'notulensi:lite:v1:';
const MAX_BYTES = 512 * 1024;
const MAX_ITEMS = 200;

function databaseUrl() {
  const raw = String(process.env.DATABASE_URL || process.env.notulensi_POSTGRES_URL || process.env.notulensi_POSTGRES_PRISMA_URL || process.env.notulensi_DATABASE_URL_UNPOOLED || '').trim();
  if (!raw) throw new Error('DATABASE_URL is not configured.');
  try { const u = new URL(raw); u.searchParams.delete('sslmode'); u.searchParams.delete('uselibpqcompat'); return u.toString(); }
  catch { return raw; }
}
function db() {
  if (!pool) pool = new Pool({ connectionString: databaseUrl(), max: 2, ssl: String(process.env.DATABASE_SSL || 'verify-full').toLowerCase() === 'disable' ? false : { rejectUnauthorized: true } });
  return pool;
}
function text(value, max) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
function normalizeMeeting(value, index) { return { id: text(value?.id, 120) || `m_${index + 1}`, title: text(value?.title, 240), date: text(value?.date, 40), participants: text(value?.participants, 4000), agenda: text(value?.agenda, 12000), summary: text(value?.summary, 12000), updatedAt: text(value?.updatedAt, 60) }; }
function normalizeTranscript(value, index) { return { id: text(value?.id, 120) || `t_${index + 1}`, title: text(value?.title, 240), body: text(value?.body, 50000), updatedAt: text(value?.updatedAt, 60) }; }
export function normalizeData(input) {
  const meetings = Array.isArray(input?.meetings) ? input.meetings.slice(0, MAX_ITEMS).map(normalizeMeeting) : [];
  const transcripts = Array.isArray(input?.transcripts) ? input.transcripts.slice(0, MAX_ITEMS).map(normalizeTranscript) : [];
  const data = { meetings, transcripts };
  if (Buffer.byteLength(JSON.stringify(data), 'utf8') > MAX_BYTES) throw new Error('Lite payload exceeds 512 KB.');
  return data;
}
export function keyFor(actor) {
  const safe = String(actor?.sub || '').trim().toLowerCase();
  if (!safe || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safe)) throw new Error('Invalid Lite actor.');
  return `${KEY_PREFIX}${Buffer.from(safe).toString('base64url')}`;
}
export async function readLite(actor) {
  const result = await db().query('SELECT value FROM public.app_storage WHERE key=$1', [keyFor(actor)]);
  const value = result.rows[0]?.value || { version: 0, data: { meetings: [], transcripts: [] } };
  return { version: Number(value.version || 0), data: normalizeData(value.data || {}) };
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
    await client.query(`INSERT INTO public.app_storage(key,value,updated_at) VALUES($1,$2::jsonb,NOW()) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=NOW()`, [key, JSON.stringify(next)]);
    await client.query('COMMIT');
    return { conflict: false, version: next.version, data: normalized };
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; }
  finally { client.release(); }
}
