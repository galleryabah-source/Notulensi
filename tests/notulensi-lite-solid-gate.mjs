import fs from 'node:fs';
import path from 'node:path';

const root = new URL('../', import.meta.url);
const read = (name) => fs.readFileSync(new URL(name, root), 'utf8');
const apiDir = new URL('../api/', import.meta.url);
const apiFiles = fs.readdirSync(apiDir).filter((name) => name.endsWith('.js'));

const liteHtml = read('notulensi-lite.html');
const liteJs = read('notulensi-lite.js');
const recorder = read('notulensi-lite-recorder.js');
const transcription = read('notulensi-lite-transcription.js');
const storage = read('notulensi-lite-storage.js');
const liteApi = read('api/lite-data.js');
const liteBackend = read('server/lite-backend.js');
const adminLogin = read('api/admin-login.js');

const checks = [
  ['Vercel API function count <= 12', apiFiles.length <= 12],
  ['Lite title is Record + Transcript', /Rekam\s*&\s*Transkrip/i.test(liteHtml)],
  ['Lite contains no rekap UI', !/rekap rapat|buat rekap|kesimpulan rapat/i.test(liteHtml + liteJs)],
  ['Lite does not call AI', !/gemini|openai|ai-runtime|intelligence-generate|transcript-generate/i.test(liteHtml + liteJs)],
  ['Recorder engine present', /MediaRecorder|mediaDevices\.getUserMedia/.test(recorder)],
  ['Audio persistence uses IndexedDB', /indexedDB|createObjectStore/.test(recorder)],
  ['Speech recognition reset API exists', /function reset\(|NotulensiLiteTranscription=.*reset/.test(transcription)],
  ['Lite calls consolidated admin login session endpoint', liteJs.includes("/api/admin-login.js") && !liteJs.includes("/api/admin-session.js")],
  ['Admin login supports session GET', adminLogin.includes("req.method==='GET'") && adminLogin.includes('getAdminSession')],
  ['Lite API remains authenticated', liteApi.includes('requireAdmin')],
  ['Lite API has payload limit', liteApi.includes('MAX_BODY_BYTES') && liteApi.includes('413')],
  ['Lite backend is v2 sessions', liteBackend.includes("notulensi:lite:v2:") && liteBackend.includes('sessions')],
  ['Parameterized SQL retained', liteBackend.includes('WHERE key=$1') && liteBackend.includes('[key]')],
  ['Row lock retained', liteBackend.includes('FOR UPDATE')],
  ['No schema DDL in Lite backend', !/CREATE TABLE|ALTER TABLE|DROP TABLE/i.test(liteApi + liteBackend)],
  ['Local storage adapter is namespaced', storage.includes('notulensi:lite:v2')]
];

for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}`);
if (checks.some(([, ok]) => !ok)) process.exit(1);
console.log(`PASS — ${checks.length}/${checks.length} Notulensi Lite solid-gate checks`);
