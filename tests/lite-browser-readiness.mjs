import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=new URL('../',import.meta.url);
const html=fs.readFileSync(new URL('notulensi-lite.html',root),'utf8');
const app=fs.readFileSync(new URL('notulensi-lite.js',root),'utf8');
const recorder=fs.readFileSync(new URL('notulensi-lite-recorder.js',root),'utf8');
const speech=fs.readFileSync(new URL('notulensi-lite-transcription.js',root),'utf8');

const required=[
  ['recording module',html.includes('notulensi-lite-recorder.js')],
  ['transcription module',html.includes('notulensi-lite-transcription.js')],
  ['MediaRecorder',/MediaRecorder/.test(recorder)],
  ['microphone',/getUserMedia/.test(recorder)],
  ['IndexedDB',/indexedDB/.test(recorder)],
  ['speech recognition',/SpeechRecognition|webkitSpeechRecognition/.test(speech)],
  ['Indonesian',/id-ID/.test(speech)],
  ['interim/final',/interimResults=true/.test(speech)&&/isFinal/.test(speech)],
  ['on-device capability',/processLocally/.test(speech)&&/available/.test(speech)],
  ['shared backend',/\/api\/lite-data\.js/.test(app)],
  ['shared admin auth',/\/api\/admin-session\.js/.test(app)],
  ['no AI dependency',!/(openai|gemini|ai-provider|transcript-generate)/i.test(recorder+speech+app)],
  ['no DDL',!/(CREATE TABLE|ALTER TABLE|DROP TABLE|db:push)/i.test(recorder+speech+app)]
];
for(const [name,ok] of required) console.log(`${ok?'PASS':'FAIL'} — ${name}`);
assert.ok(required.every(([,ok])=>ok),'Lite browser readiness gate failed');
console.log(`PASS — ${required.length}/${required.length} browser readiness checks`);
