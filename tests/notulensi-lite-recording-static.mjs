import fs from 'node:fs';
const html=fs.readFileSync(new URL('../notulensi-lite.html',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../notulensi-lite.js',import.meta.url),'utf8');
const checks=[
 ['single-page record/transcript workspace',html.includes('Rekam & Transkrip')&&html.includes('id="transcript"')],
 ['prominent record control',html.includes('id="recordBtn"')&&html.includes('class="record"')],
 ['MediaRecorder engine',js.includes('MediaRecorder')&&js.includes('getUserMedia')],
 ['audio constraints',js.includes('echoCancellation:true')&&js.includes('noiseSuppression:true')&&js.includes('autoGainControl:true')],
 ['chunked recording',js.includes('.start(1000)')&&js.includes('ondataavailable')],
 ['MIME capability detection',js.includes('MediaRecorder.isTypeSupported')],
 ['SpeechRecognition fallback',js.includes('SpeechRecognition||window.webkitSpeechRecognition')&&js.includes('SpeechRecognition')],
 ['Indonesian recognition',js.includes("r.lang='id-ID'")],
 ['interim and final transcript',js.includes('interimResults=true')&&js.includes('isFinal')],
 ['local persistence',js.includes('notulensiLiteStorage')&&js.includes('state.history')],
 ['shared backend boundary',js.includes('/api/lite-data.js')&&js.includes('X-Notulensi-Lite-Request')],
 ['no AI endpoint dependency',!/gemini|openai|ai-runtime|intelligence-generate/i.test(html+js)]
];
for(const [name,ok] of checks) console.log(`${ok?'PASS':'FAIL'} — ${name}`);
if(checks.some(([,ok])=>!ok)) process.exit(1);
console.log(`PASS — ${checks.length}/${checks.length}`);
