import fs from 'node:fs';

const htmlPath='meeting-intelligence-app-phase4.6.1-integrated.html';
const html=fs.readFileSync(htmlPath,'utf8');
const required=[
  'source-transcription-engine.js',
  'phase-ui-navigation-windows11-v2.js'
];
const forbidden=['phase-source-transcription-engine.js'];
for(const token of required){if(!html.includes(token))throw new Error(`Production entrypoint missing required runtime: ${token}`)}
for(const token of forbidden){if(html.includes(`src="${token}"`)||html.includes(`src='${token}'`))throw new Error(`Production entrypoint directly loads obsolete runtime: ${token}`)}
const sourceIndex=html.indexOf('source-transcription-engine.js');
const navIndex=html.indexOf('phase-ui-navigation-windows11-v2.js');
if(sourceIndex<0||navIndex<0)throw new Error('Required runtime ordering markers not found');
console.log(JSON.stringify({schemaVersion:'1.0.0',status:'PASS',entrypoint:htmlPath,required,obsoleteDirectLoads:forbidden,sourceIndex,navIndex},null,2));
