// Versie en offline-cache: klopt sw.js met de bestanden en het versienummer?
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VERSION } from '../../js/version.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const files = [...sw.slice(sw.indexOf('const FILES'), sw.indexOf('];')).matchAll(/'([^']+)'/g)].map((m) => m[1]);

test('CACHE in sw.js hoort bij het versienummer in het menu', () => {
  assert.match(sw, new RegExp(`const CACHE = 'jippecraft-${VERSION.replace(/\./g, '\\.')}';`));
});

test('elk JavaScript-bestand staat in de offline-cache', () => {
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
  const js = walk(path.join(root, 'js')).filter((f) => f.endsWith('.js')).map((f) => path.relative(root, f).split(path.sep).join('/'));
  for (const f of js) assert.ok(files.includes(f), `${f} ontbreekt in FILES in sw.js`);
});

test('elk bestand in de offline-cache bestaat echt', () => {
  for (const f of files) {
    if (f === './') continue;
    assert.ok(fs.existsSync(path.join(root, f)), `${f} staat in sw.js maar bestaat niet`);
  }
});
