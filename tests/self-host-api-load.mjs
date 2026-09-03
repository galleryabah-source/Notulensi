import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const apiDir = path.join(root, 'api');
const files = fs.readdirSync(apiDir, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.js') && !entry.name.startsWith('_'))
  .map((entry) => entry.name)
  .sort();

for (const file of files) {
  const module = await import(pathToFileURL(path.join(apiDir, file)).href);
  if (typeof module.default !== 'function') throw new Error(`${file} does not export a default function handler.`);
}

console.log(`PASS — loaded ${files.length} API handlers`);
