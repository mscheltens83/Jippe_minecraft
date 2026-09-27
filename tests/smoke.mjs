// Automatische test: start het spel in een gesimuleerde iPad en probeert
// alles te doen wat Jippe ook doet (tikken, bouwen, slopen, dieren aaien, stempels, ...).
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
// ?vast = vaste beeldkwaliteit, zodat de (trage) test-browser niet steeds wisselt
const base = `http://127.0.0.1:${server.address().port}/?vast`;

let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? 'OK  ' : 'FOUT'} ${msg}`); if (!ok) failures++; };

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const errors = [];
async function newPage(init) {
  const context = await browser.newContext({ ...devices['iPad Pro 11 landscape'] });
  // Lettertype van internet niet nodig voor de test
  await context.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  if (init) await context.addInitScript(init.fn, init.arg);
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('requestfailed', (r) => { if (!/fonts\./.test(r.url())) errors.push('request failed: ' + r.url()); });
  await page.goto(base);
  await page.waitForFunction(() => window.__jippecraft, null, { timeout: 20000 });
  return { context, page };
}

const { context, page } = await newPage();
const g = (fn, arg) => page.evaluate(fn, arg);
// Wacht tot iets waar is (software-rendering in de test is traag)
const until = (fn, arg, timeout = 5000) => page.waitForFunction(fn, arg, { timeout }).then(() => true, () => false);
const shot = (name) => page.screenshot({ path: path.join(out, name + '.png') });
const vp = page.viewportSize();
const cx = vp.width / 2, cy = vp.height / 2;
const cdp = await context.newCDPSession(page);
const touch = (type, x, y, id = 1) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id }] });
const TAB = { Huisje: 'Stempels', Boom: 'Stempels', Toren: 'Stempels', Brug: 'Stempels', Varken: 'Dieren', Kip: 'Dieren', Schaap: 'Dieren' };
const pickFromChest = async (label) => {
  await page.locator('.slot.chest').tap();
  await page.locator(`.pal-tab[aria-label="${TAB[label] || 'Blokken'}"]`).tap();
  await page.locator(`.pal-item[aria-label="${label}"]`).tap();
};
const edits = () => g(() => window.__jippecraft.edits);
const lookAt = (pitch, yaw = 0) => g(([p, y]) => { const j = window.__jippecraft; j.player.pitch = p; j.player.yaw = y; }, [pitch, yaw]);
const countIds = (lo, hi) => g(([a, b]) => window.__jippecraft.world.data.reduce((n, id) => n + (id >= a && id <= b ? 1 : 0), 0), [lo, hi]);

await page.waitForTimeout(800);
await shot('01-menu');
check(await page.locator('.menu').isVisible(), 'startscherm zichtbaar');
check(await g(() => window.__jippecraft.animals.list.length) >= 6, 'er lopen dieren in de nieuwe wereld');

await page.locator('.play-btn').tap();
check(await until(() => !window.__jippecraft.ui.menuOpen), 'menu weg na op spelen tikken');
// Rondlopende dieren kunnen voor je tikken langs lopen; die zetten we straks zelf weer neer
await g(() => window.__jippecraft.animals.clear());

// --- bouwen door te tikken
await lookAt(-0.6);
await page.waitForTimeout(200);
let e0 = await edits();
await page.touchscreen.tap(cx, cy + 60);
check(await until((n) => window.__jippecraft.edits === n + 1, e0), 'blok gebouwd door te tikken');

// --- 1. toren bouwen: recht naar beneden kijken en op de grond onder je tikken
await lookAt(-1.55);
await page.waitForTimeout(200);
const y0 = await g(() => window.__jippecraft.player.y);
await page.touchscreen.tap(cx, cy);
check(await until((y) => window.__jippecraft.player.y > y + 0.9, y0), 'toren bouwen: blok onder je voeten tilt je op');
await page.touchscreen.tap(cx, cy);
check(await until((y) => window.__jippecraft.player.y > y + 1.9, y0), 'toren bouwen: nog een blok erbovenop');
await g(() => { const j = window.__jippecraft; j.undo(); j.undo(); });
// even wachten tot je weer op de grond staat (anders schuift het doel onder je vinger)
await until((y) => window.__jippecraft.player.onGround && window.__jippecraft.player.y < y + 0.1, y0, 15000);

// --- 3. slopen door vast te houden
await page.locator('.mode-break').tap();
await lookAt(-0.6);
await page.waitForTimeout(200);
e0 = await edits();
await page.touchscreen.tap(cx + 80, cy + 120);
await page.waitForTimeout(400);
check((await edits()) === e0, 'kort tikken in sloop-stand sloopt niets');
await touch('touchStart', cx + 80, cy + 120);
check(await until(() => !document.querySelector('.hold-ring').hidden, null, 5000), 'rondje loopt vol tijdens vasthouden');
await shot('02-vasthouden');
check(await until((n) => window.__jippecraft.edits > n, e0, 30000), 'vasthouden sloopt het blok');
// tel of het loslaten nog een tik-actie geeft (dat mag niet)
await g(() => { const j = window.__jippecraft; j._acts = 0; const act = j.act.bind(j); j.act = (t) => { j._acts++; act(t); }; });
await touch('touchEnd');
await until(() => window.__jippecraft.input.pointers.size === 0);
await page.waitForTimeout(600);
check(await g(() => window.__jippecraft._acts === 0), 'loslaten na slopen doet verder niets');
await g(() => { delete window.__jippecraft.act; });

const undoLen = await g(() => window.__jippecraft.undoStack.length);
await page.locator('.undo-btn').tap();
check(await until((n) => window.__jippecraft.undoStack.length === n - 1, undoLen), 'terug-knop werkt');

// --- de kist met groepen
await page.locator('.slot.chest').tap();
check(await page.locator('.palette').isVisible(), 'kist gaat open');
check((await page.locator('.pal-tab').count()) === 3, 'kist heeft tabbladen: blokken, stempels en dieren');
await shot('03-kist');
await page.locator('.pal-tab[aria-label="Stempels"]').tap();
check(await page.locator('.pal-item[aria-label="Toren"]').isVisible(), 'stempels-tabblad laat de stempels zien');
await shot('03-kist-stempels');
await page.locator('.pal-tab[aria-label="Blokken"]').tap();
await page.locator('.pal-item[aria-label="Regenboog"]').tap();
check(await until(() => window.__jippecraft.ui.paletteOpen === false), 'kist gaat dicht na kiezen');
check(await g(() => window.__jippecraft.mode === 'build'), 'terug naar bouwen na kiezen');

// --- lopen met de joystick en rondkijken
const start = await g(() => ({ x: window.__jippecraft.player.x, z: window.__jippecraft.player.z }));
const sx = 150, sy = vp.height - 200;
await touch('touchStart', sx, sy);
for (let i = 1; i <= 6; i++) { await touch('touchMove', sx, sy - i * 12); await page.waitForTimeout(30); }
const walked = await until((s) => Math.hypot(window.__jippecraft.player.x - s.x, window.__jippecraft.player.z - s.z) > 1, start);
await touch('touchEnd');
check(walked, 'lopen met de joystick');
const yaw0 = await g(() => window.__jippecraft.player.yaw);
await touch('touchStart', 800, 300, 2);
for (let i = 1; i <= 5; i++) { await touch('touchMove', 800 + i * 20, 300, 2); await page.waitForTimeout(20); }
await touch('touchEnd');
check(await until((y) => window.__jippecraft.player.yaw < y - 0.2, yaw0), 'rondkijken door te vegen');

await page.locator('.fly-btn').tap();
check(await g(() => window.__jippecraft.player.flying), 'vliegen aan');
await page.locator('.fly-btn').tap();

// Terug naar het midden van het weitje, zodat we ruimte hebben
const reset = () => g(() => {
  const j = window.__jippecraft;
  j.player.setPos(j.world.spawnPoint());
  j.player.flying = false;
});
await reset();
await page.waitForTimeout(300);

// --- 7. stempel: huisje
await pickFromChest('Huisje');
await lookAt(-0.5);
await page.waitForTimeout(200);
e0 = await edits();
await page.touchscreen.tap(cx, cy + 40);
check(await until((n) => window.__jippecraft.edits === n + 1, e0), 'huisje-stempel geplaatst');
check((await countIds(45, 60)) >= 2, 'huisje heeft een deur');
await lookAt(-0.15);
await page.waitForTimeout(1200);
await shot('04-huisje');
await g(() => window.__jippecraft.undo());
await page.waitForTimeout(300);
check((await countIds(45, 60)) === 0, 'terug-knop haalt het hele huisje weg');

// --- 9. nieuwe blokken: deur (open/dicht), trap, gekleurd glas, stuiterblok, vuurwerk
await reset();
await pickFromChest('Deur');
await lookAt(-0.55);
await page.waitForTimeout(200);
await page.touchscreen.tap(cx, cy + 40);
check(await until(() => window.__jippecraft.world.data.some((id) => id >= 45 && id <= 60)), 'deur geplaatst');
const doorOpen = () => g(() => { const j = window.__jippecraft; const i = j.world.data.findIndex((id) => id >= 45 && id <= 60); return i >= 0 && (j.world.data[i] - 45) % 2 === 1; });
await lookAt(-0.35);
await page.waitForTimeout(200);
await page.touchscreen.tap(cx, cy);
check(await until(() => { const j = window.__jippecraft; const i = j.world.data.findIndex((id) => id >= 45 && id <= 60); return i >= 0 && (j.world.data[i] - 45) % 2 === 1; }), 'tikken op de deur doet hem open');
check(await doorOpen(), 'deur staat open');

await reset();
await g(() => { window.__jippecraft.player.yaw = Math.PI / 2; });
await pickFromChest('Trap');
await lookAt(-0.6, Math.PI / 2);
await page.waitForTimeout(200);
await page.touchscreen.tap(cx, cy + 40);
check(await until(() => window.__jippecraft.world.data.some((id) => id >= 41 && id <= 44)), 'trap geplaatst');
await pickFromChest('Rood glas');
await page.touchscreen.tap(cx + 90, cy + 40);
check(await until(() => window.__jippecraft.world.data.includes(36)), 'rood glas geplaatst');
await pickFromChest('Vuurwerk');
await page.touchscreen.tap(cx - 110, cy + 40);
check(await until(() => window.__jippecraft.world.data.includes(35)), 'vuurwerk geplaatst');
await lookAt(-0.3, Math.PI / 2);
await page.waitForTimeout(800);
await shot('05-blokken');
await lookAt(-0.6, Math.PI / 2);
await page.waitForTimeout(200);
await page.touchscreen.tap(cx - 110, cy + 40);
check(await until(() => !window.__jippecraft.world.data.includes(35)), 'tikken op vuurwerk laat het opstijgen');
await lookAt(0.35, Math.PI / 2);
check(await until(() => window.__jippecraft.particles.list.length > 100, null, 20000), 'vuurwerk knalt uit elkaar');
await shot('06-vuurwerk');

// stuiterblok: laat de speler erop vallen
await reset();
const bounced = await g(async () => {
  const j = window.__jippecraft, p = j.player;
  const x = Math.floor(p.x), z = Math.floor(p.z), y = Math.floor(p.y) - 1;
  j.world.set(x, y, z, 34);
  p.y += 4;
  let hit = false;
  const old = p.onBounce;
  p.onBounce = () => { hit = true; old?.(); };
  for (let i = 0; i < 150 && !hit; i++) await new Promise((r) => setTimeout(r, 100));
  p.onBounce = old;
  j.world.set(x, y, z, 1);
  return hit;
});
check(bounced, 'stuiterblok laat je stuiteren');

// --- 6. dieren: aaien en er zelf een neerzetten
await reset();
const petted = await g(async () => {
  const j = window.__jippecraft, p = j.player;
  p.yaw = Math.PI; p.pitch = -0.2;
  const a = j.animals.spawn('pig', p.x, j.world.surfaceY(Math.floor(p.x), Math.floor(p.z + 3)) + 1, p.z + 3, 0);
  a.walking = false; a.timer = 30; a.happy = 0;
  await new Promise((r) => setTimeout(r, 300));
  const v = a.group.position.clone();
  v.y += a.def.h / 2;
  v.project(j.scene.camera);
  return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight };
});
await page.touchscreen.tap(petted.x, petted.y);
check(await until(() => window.__jippecraft.animals.list[0].happy > 0), 'dier aaien maakt het blij');
check(await until(() => window.__jippecraft.particles.hearts.some((h) => h.alive)), 'hartjes bij het aaien');
await page.waitForTimeout(300);
await shot('07-dier');
const nAnimals = await g(() => window.__jippecraft.animals.list.length);
await pickFromChest('Varken');
await lookAt(-0.55, 0.8);
await page.waitForTimeout(200);
await page.touchscreen.tap(cx, cy + 40);
check(await until((n) => window.__jippecraft.animals.list.length === n + 1, nAnimals), 'zelf een varken neerzetten');

// --- 10. poppetje en camera van achteren
await page.locator('.cam-btn').tap();
check(await until(() => window.__jippecraft.thirdPerson && window.__jippecraft.avatar.group.visible), 'poppetje zichtbaar met camera van achteren');
check(await until(() => window.__jippecraft.camDist > 1), 'camera hangt achter het poppetje');
await lookAt(-0.3, 2.5);
await page.waitForTimeout(800);
await shot('08-poppetje');
await page.locator('.cam-btn').tap();
check(await until(() => !window.__jippecraft.thirdPerson), 'terug naar eigen ogen');

// --- 11. muziek aan/uit in het menu
await page.locator('.menu-btn').tap();
check(await until(() => window.__jippecraft.ui.menuOpen), 'menu open');
const musicOn = await g(() => window.__jippecraft.music.on);
await page.locator('.labeled:has-text("Muziek") .btn').tap();
check(await g((m) => window.__jippecraft.music.on !== m, musicOn), 'muziek-knop werkt');
await page.locator('.labeled:has-text("Muziek") .btn').tap();

// --- 13. meerdere werelden
const world1 = await g(() => window.__jippecraft.world.serialize());
await page.locator('.worlds-btn').tap();
check((await page.locator('.slot-card').count()) === 3, 'drie wereld-plekken');
check(await page.locator('.slot-card.current').isVisible(), 'huidige wereld is gemarkeerd');
await shot('09-werelden');
await page.locator('.slot-card.empty').first().tap();
await page.locator('.choice[aria-label="Plat"]').tap();
check(await until(() => window.__jippecraft.world.type === 'flat' && window.__jippecraft.slot === 2), 'nieuwe platte wereld in plek 2');
await lookAt(-0.3, 0);
await page.waitForTimeout(600);
await page.locator('.menu-btn').tap();
await page.locator('.worlds-btn').tap();
await page.locator('.slot-card[aria-label="Wereld 1"]').tap();
check(await until(() => window.__jippecraft.slot === 1), 'terug naar wereld 1');
check((await g(() => window.__jippecraft.world.serialize())) === world1, 'wereld 1 is precies zoals je hem achterliet');
const thumbs = await g(() => window.__jippecraft.slotInfo().filter((s) => s.thumb?.startsWith('data:image/jpeg')).length);
check(thumbs >= 2, 'werelden hebben een plaatje');
// wereld 2 opnieuw beginnen (met bevestiging)
await page.locator('.menu-btn').tap();
await page.locator('.worlds-btn').tap();
await page.locator('.slot-wrap:nth-child(2) .slot-again').tap();
await page.locator('.choice[aria-label="Eiland"]').tap();
check(await page.locator('.confirm-thumb').isVisible(), 'bevestiging laat de wereld zien die weg gaat');
await page.locator('.yes').tap();
check(await until(() => window.__jippecraft.slot === 2 && window.__jippecraft.world.type === 'island'), 'wereld 2 opnieuw begonnen als eiland');

// Bewaren en opnieuw laden: je komt terug in dezelfde wereld
await page.locator('.menu-btn').tap();
const snap2 = await g(() => window.__jippecraft.world.serialize());
await page.reload();
await page.waitForFunction(() => window.__jippecraft, null, { timeout: 20000 });
check(await g(() => window.__jippecraft.slot === 2), 'na herladen in dezelfde wereld-plek');
check((await g(() => window.__jippecraft.world.serialize())) === snap2, 'wereld na herladen hetzelfde');

// Staand (portret) formaat
await page.locator('.play-btn').tap();
await page.setViewportSize({ width: 834, height: 1194 });
await page.waitForTimeout(600);
await shot('10-portret');
const overlap = await g(() => {
  const a = document.querySelector('.hotbar').getBoundingClientRect(), b = document.querySelector('.right').getBoundingClientRect();
  return a.right > b.left && a.bottom > b.top;
});
check(!overlap, 'onderbalk en springknop overlappen niet (staand)');
await context.close();

// --- oude bewaarde wereld (eerste versie) wordt netjes omgezet naar wereld 1
const oldSave = await (async () => {
  const { context: c, page: p } = await newPage();
  const s = await p.evaluate(() => {
    const j = window.__jippecraft;
    j.world.generate('flat');
    j.world.set(10, 12, 10, 19);
    const s = j.makeSave();
    s.v = 1; delete s.animals; delete s.thumb;
    return s;
  });
  await c.close();
  return s;
})();
{
  const { context: c, page: p } = await newPage({
    fn: (s) => { if (!localStorage.getItem('jippecraft.slot1.v1')) localStorage.setItem('jippecraft.world.v1', JSON.stringify(s)); },
    arg: oldSave,
  });
  const r = await p.evaluate(() => {
    const j = window.__jippecraft;
    return {
      slot: j.slot, type: j.world.type, rainbow: j.world.get(10, 12, 10),
      animals: j.animals.list.length, legacy: localStorage.getItem('jippecraft.world.v1'),
    };
  });
  check(r.slot === 1 && r.type === 'flat' && r.rainbow === 19, 'oude wereld wordt wereld 1');
  check(r.animals > 0 && r.legacy === null, 'oude wereld krijgt dieren en de oude opslag is opgeruimd');
  await c.close();
}

check(errors.length === 0, 'geen fouten in de console' + (errors.length ? ':\n  ' + errors.join('\n  ') : ''));

await browser.close();
server.close();
console.log(failures ? `\n${failures} test(s) mislukt` : '\nAlles werkt!');
process.exit(failures ? 1 : 0);
