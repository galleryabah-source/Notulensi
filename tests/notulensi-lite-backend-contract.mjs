import fs from 'node:fs';

const api = fs.readFileSync(new URL('../api/lite-data.js', import.meta.url), 'utf8');
const storage = fs.readFileSync(new URL('../api/_lite-backend.js', import.meta.url), 'utf8');
const client = fs.readFileSync(new URL('../notulensi-lite.js', import.meta.url), 'utf8');

const checks = [
  ['backend requires existing admin authentication', api.includes("requireAdmin(req, res)")],
  ['write path requires non-simple request header', api.includes("X-Notulensi-Lite-Request") || api.includes("x-notulensi-lite-request")],
  ['backend uses optimistic concurrency', storage.includes('baseVersion') && storage.includes('version_conflict') || storage.includes('currentVersion')],
  ['backend validates payload size', storage.includes('512 * 1024')],
  ['backend caps record counts', storage.includes('MAX_ITEMS')],
  ['backend uses parameterized SQL', storage.includes("WHERE key=$1") && storage.includes("[key]")],
  ['backend does not create tables', !/CREATE TABLE|ALTER TABLE|DROP TABLE/i.test(storage)],
  ['backend uses explicit SSL verification by default', storage.includes("DATABASE_SSL || 'verify-full'")],
  ['Lite remains AI-independent', !/(_ai-provider|ai-runtime|intelligence-generate|gemini|openai)/i.test(client)],
  ['Lite can fall back to local persistence', client.includes('localSave') && client.includes('state.backend=false')]
];
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}`);
if (checks.some(([, ok]) => !ok)) process.exit(1);
console.log(`PASS — ${checks.length}/${checks.length} backend contract assertions`);
