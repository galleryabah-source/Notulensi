import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const config = read('api/ai-config.js');
const runtime = read('api/ai-runtime.js');
const intelligence = read('api/intelligence-generate.js');
const transcript = read('api/transcript-generate.js');
const settings = read('ai-settings.html');

const checks = [
  ['AI config imports admin guard', config.includes("import { requireAdmin } from '../server/admin-auth.js';")],
  ['AI config GET is admin protected', config.includes("const session=requireAdmin(req,res);if(!session)return;")],
  ['AI config public response has no key field', config.includes('function publicConfig(config)') && !config.slice(config.indexOf('function publicConfig(config)')).split('export default')[0].includes('key:')],
  ['AI config PUT preserves stored key when no replacement is supplied', config.includes("!String(incomingProvider.key||'').trim()&&currentProvider.key")],
  ['Intelligence generation requires admin', intelligence.includes("import { requireAdmin } from '../server/admin-auth.js';") && intelligence.includes('const session=requireAdmin(req,res);if(!session)return;')],
  ['Transcript generation requires admin', transcript.includes("import { requireAdmin } from '../server/admin-auth.js';") && transcript.includes('const session=requireAdmin(req,res);if(!session)return;')],
  ['AI runtime POST requires admin', runtime.includes("const session=requireAdmin(req,res);if(!session)return;")],
  ['AI settings never re-sends stored key', !settings.includes('else if(s.configured)providers[p.id].key=s.key')],
  ['AI settings sends only newly entered key', settings.includes('if(k)providers[p.id].key=k;')],
  ['AI settings registry matches backend provider registry', !settings.includes("id:'mistral'")],
  ['No schema migration added by this security patch', !config.includes('ALTER TABLE') && !config.includes('DROP TABLE')]
];
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}`);
if (checks.some(([, ok]) => !ok)) process.exit(1);
console.log(`PASS — ${checks.length}/${checks.length} AI API security contract assertions`);
