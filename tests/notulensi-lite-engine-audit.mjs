import fs from 'node:fs';
const html=fs.readFileSync(new URL('../notulensi-lite.html',import.meta.url),'utf8');
const recorder=fs.readFileSync(new URL('../notulensi-lite-recorder.js',import.meta.url),'utf8');
const speech=fs.readFileSync(new URL('../notulensi-lite-transcription.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../notulensi-lite.js',import.meta.url),'utf8');
const checks=[
 ['Fluent-inspired Lite UI',html.includes('Segoe UI Variable')&&html.includes('backdrop-filter')],
 ['Only record/transcript scope',!/(Rekap Rapat|Agenda|Kesimpulan|Summary AI|Action Items)/i.test(html+app)],
 ['Recording engine loaded',html.includes('notulensi-lite-recorder.js')],
 ['MediaRecorder used',recorder.includes('MediaRecorder')&&recorder.includes('getUserMedia')],
 ['Audio persistence uses IndexedDB',recorder.includes('indexedDB')&&recorder.includes('notulensi-lite-v2')],
 ['Speech Recognition engine loaded',html.includes('notulensi-lite-transcription.js')],
 ['Speech recognition supports on-device when available',speech.includes('processLocally')&&speech.includes('available')],
 ['Indonesian default',speech.includes("lang:'id-ID'")],
 ['Interim/final results',speech.includes('interimResults=true')&&speech.includes('isFinal')],
 ['Auto-recovery after recognition end',speech.includes('setTimeout(()=>{start(true)')],
 ['No AI provider dependency',!/(openai|gemini|ai-provider|transcript-generate)/i.test(recorder+speech+app)],
 ['Backend persistence endpoint',app.includes('/api/lite-data.js')],
 ['Admin session boundary',app.includes('/api/admin-session.js')],
 ['No schema migration',!/(CREATE TABLE|ALTER TABLE|DROP TABLE|db:push)/i.test(app+recorder+speech)]
];
for(const [name,ok] of checks)console.log(`${ok?'PASS':'FAIL'} — ${name}`);
if(checks.some(([,ok])=>!ok))process.exit(1);
console.log(`PASS — ${checks.length}/${checks.length} Lite engine checks`);
