// Maakt de app-iconen (icons/*.png) met de echte blok-texturen van het spel.
// Gebruik: npm run icons
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x').pathname;
  if (url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<!doctype html><body style="margin:0"></body>');
    return;
  }
  const file = path.join(root, url);
  if (!file.startsWith(root) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': 'text/javascript' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${server.address().port}/`);
const pngs = await page.evaluate(async () => {
  const { createAtlas, drawBlockIcon } = await import('/js/textures.js');
  const { B } = await import('/js/blocks.js');
  const atlas = createAtlas();
  const block = drawBlockIcon(atlas, B.GRASS, 512);
  const make = (size) => {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, size);
    g.addColorStop(0, '#4aa3ec');
    g.addColorStop(1, '#c9ecff');
    x.fillStyle = g;
    x.fillRect(0, 0, size, size);
    x.fillStyle = '#fff4b0';
    x.fillRect(size * 0.7, size * 0.1, size * 0.16, size * 0.16);
    x.imageSmoothingEnabled = false;
    const s = size * 0.74;
    x.drawImage(block, (size - s) / 2, size * 0.17, s, s);
    return c.toDataURL('image/png').split(',')[1];
  };
  return { 512: make(512), 192: make(192), 180: make(180) };
});
fs.mkdirSync(path.join(root, 'icons'), { recursive: true });
fs.writeFileSync(path.join(root, 'icons/icon-512.png'), Buffer.from(pngs[512], 'base64'));
fs.writeFileSync(path.join(root, 'icons/icon-192.png'), Buffer.from(pngs[192], 'base64'));
fs.writeFileSync(path.join(root, 'icons/apple-touch-icon.png'), Buffer.from(pngs[180], 'base64'));
await browser.close();
server.close();
console.log('Iconen gemaakt in icons/');
