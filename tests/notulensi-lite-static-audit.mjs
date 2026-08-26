import fs from 'node:fs';

const html = fs.readFileSync(new URL('../notulensi-lite.html', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../notulensi-lite.js', import.meta.url), 'utf8');
const storage = fs.readFileSync(new URL('../notulensi-lite-storage.js', import.meta.url), 'utf8');

const assertions = [
  ['Lite page exists', html.includes('Notulensi Lite')],
  ['Lite loads its storage adapter', html.indexOf('notulensi-lite-storage.js') < html.indexOf('notulensi-lite.js')],
  ['Lite has exactly one Admin navigation link', (html.match(/admin-login\.html/g) || []).length === 1],
  ['Lite does not import AI modules', !/(_ai-provider|ai-runtime|intelligence-generate|gemini|openai)/i.test(html + js)],
  ['Lite uses isolated storage adapter', js.includes('window.notulensiLiteStorage') && storage.includes('notulensi:lite:v1')],
  ['Lite supports meetings and transcripts', js.includes('state.meetings') && js.includes('state.transcripts')],
  ['Lite has no database migration command', !/(CREATE TABLE|ALTER TABLE|DROP TABLE|db:push|migration)/i.test(js + html)]
];

for (const [name, ok] of assertions) console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}`);
if (assertions.some(([, ok]) => !ok)) process.exit(1);
console.log(`PASS — ${assertions.length}/${assertions.length} Lite static assertions`);
