// Automatische test: start het spel in een gesimuleerde iPad en probeert
// te spelen (tikken, bouwen, slopen, terugzetten, lopen, bewaren).
// Gebruik: npm install && npm test   (screenshots komen in tests/out/)

import { chromium, devices } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'tests', 'out');
fs.mkdirSync(out, { recursive: true });

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = path.join(root, url === '/' ? 'index.html' : url);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}/`;

let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? 'OK  ' : 'FOUT'} ${msg}`); if (!ok) failures++; };

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const context = await browser.newContext({ ...devices['iPad Pro 11 landscape'] });
// Lettertype van internet niet nodig voor de test
await context.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text())) errors.push(m.text()); });
page.on('requestfailed', (r) => { if (!/fonts\./.test(r.url())) errors.push('request failed: ' + r.url()); });

await page.goto(base);
await page.waitForFunction(() => window.__jippecraft, null, { timeout: 20000 });
await page.waitForTimeout(800);
await page.screenshot({ path: path.join(out, '1-menu.png') });
check(await page.locator('.menu').isVisible(), 'startscherm zichtbaar');

await page.locator('.play-btn').tap();
await page.waitForTimeout(400);
check(await page.locator('.menu').isHidden(), 'menu weg na op spelen tikken');
const g = (fn) => page.evaluate(fn);
// Wacht tot iets waar is (software-rendering in de test is traag)
const until = (fn, arg) => page.waitForFunction(fn, arg, { timeout: 5000 }).then(() => true, () => false);

// Kijk wat naar beneden, zodat we de grond zien
await g(() => { window.__jippecraft.player.pitch = -0.6; });
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(out, '2-spel.png') });

const vp = page.viewportSize();
const edits0 = await g(() => window.__jippecraft.edits);
await page.touchscreen.tap(vp.width / 2, vp.height / 2 + 60);
check(await until((n) => window.__jippecraft.edits === n + 1, edits0), 'blok gebouwd door te tikken');

await page.locator('.mode-break').tap();
check(await g(() => window.__jippecraft.mode === 'break'), 'sloop-stand aan');
await page.touchscreen.tap(vp.width / 2 + 80, vp.height / 2 + 120);
check(await until((n) => window.__jippecraft.edits === n + 2, edits0), 'blok gesloopt door te tikken');
await page.screenshot({ path: path.join(out, '3-gesloopt.png') });

await page.locator('.undo-btn').tap();
await page.waitForTimeout(200);
check((await g(() => window.__jippecraft.undoStack.length)) === 1, 'terug-knop werkt');

await page.locator('.slot.chest').tap();
await page.waitForTimeout(300);
check(await page.locator('.palette').isVisible(), 'kist gaat open');
await page.screenshot({ path: path.join(out, '4-kist.png') });
await page.locator('.pal-item[aria-label="Regenboog"]').tap();
await page.waitForTimeout(200);
check(await page.locator('.palette').isHidden(), 'kist gaat dicht na kiezen');
check(await g(() => window.__jippecraft.hotbar[window.__jippecraft.sel] === 19), 'regenboog gekozen');
check(await g(() => window.__jippecraft.mode === 'build'), 'terug naar bouwen na kiezen');

// Joystick: duim linksonder neerzetten en naar boven schuiven = vooruit lopen
const cdp = await context.newCDPSession(page);
const start = await g(() => ({ x: window.__jippecraft.player.x, z: window.__jippecraft.player.z }));
const sx = 150, sy = vp.height - 200;
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: sx, y: sy, id: 1 }] });
for (let i = 1; i <= 6; i++) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: sx, y: sy - i * 12, id: 1 }] });
  await page.waitForTimeout(30);
}
const walked = await until((s) => Math.hypot(window.__jippecraft.player.x - s.x, window.__jippecraft.player.z - s.z) > 1, start);
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
check(walked, 'lopen met de joystick');

// Vegen rechts = rondkijken
const yaw0 = await g(() => window.__jippecraft.player.yaw);
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 800, y: 300, id: 2 }] });
for (let i = 1; i <= 5; i++) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 800 + i * 20, y: 300, id: 2 }] });
  await page.waitForTimeout(20);
}
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
check(await until((y) => window.__jippecraft.player.yaw < y - 0.2, yaw0), 'rondkijken door te vegen');

// Vliegen
await page.locator('.fly-btn').tap();
check(await g(() => window.__jippecraft.player.flying), 'vliegen aan');
check(await page.locator('.down-btn').isVisible(), 'omlaag-knop zichtbaar tijdens vliegen');
await page.locator('.fly-btn').tap();

// Bewaren en opnieuw laden
await page.locator('.menu-btn').tap();
await page.waitForTimeout(200);
const saved = await g(() => localStorage.getItem('jippecraft.world.v1')?.length || 0);
check(saved > 1000, `wereld bewaard (${Math.round(saved / 1024)} kB)`);
const snapshot = await g(() => window.__jippecraft.world.serialize());
await page.reload();
await page.waitForFunction(() => window.__jippecraft, null, { timeout: 20000 });
check((await g(() => window.__jippecraft.world.serialize())) === snapshot, 'wereld na herladen hetzelfde');

// Nieuwe platte wereld (met bevestiging), daarna de vorige terughalen
await page.locator('.labeled:has-text("Nieuwe wereld") .btn').tap();
await page.locator('.choice[aria-label="Plat"]').tap();
await page.locator('.yes').tap();
await page.waitForTimeout(500);
check(await g(() => window.__jippecraft.world.type === 'flat'), 'nieuwe platte wereld');
await g(() => { window.__jippecraft.player.pitch = -0.35; });
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(out, '5-plat.png') });
await page.locator('.menu-btn').tap();
await page.locator('.labeled:has-text("Vorige wereld") .btn').tap();
await page.locator('.yes').tap();
await page.waitForTimeout(500);
check((await g(() => window.__jippecraft.world.serialize())) === snapshot, 'vorige wereld teruggehaald');

// Staand (portret) formaat
await page.setViewportSize({ width: 834, height: 1194 });
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(out, '6-portret.png') });

check(errors.length === 0, 'geen fouten in de console' + (errors.length ? ':\n  ' + errors.join('\n  ') : ''));

await browser.close();
server.close();
console.log(failures ? `\n${failures} test(s) mislukt` : '\nAlles werkt!');
process.exit(failures ? 1 : 0);
