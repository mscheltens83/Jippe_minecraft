// Fase 6B: de Wilde Nacht eng maken. Rode ogen, rode maan, donker en mist, enge geluiden met
// richting, hartslag, bromtoon en schrikmomenten. Beeldje voor beeldje, zoals in 6A.
import { waitTrue } from './helpers.mjs';

export async function testPhase6B({ newPage, check, out }) {
  const { context, page } = await newPage();
  const run = (fn, arg) => page.evaluate(fn, arg);
  await page.locator('.storm-menu-btn').tap();
  check(await waitTrue(page, () => window.__jippecraft.storm?.phase === 'dag', null, 20000), 'de Wilde Nacht begint');

  // Alle geluiden bijhouden (ook als de testbrowser zelf geen geluid maakt)
  const looks = await run(() => {
    const j = window.__jippecraft, s = j.storm, p = j.player, w = j.world;
    j.playing = false;
    window.__heard = [];
    for (const name of ['growl', 'roar', 'scratch', 'bonk', 'heartbeat', 'drone']) {
      const f = j.sounds[name].bind(j.sounds);
      j.sounds[name] = (...args) => { window.__heard.push([name, ...args]); f(...args); };
    }
    window.__sim = (n) => {
      const inp = { move: { x: 0, y: 0 }, jump: false, down: false, sprint: false };
      for (let i = 0; i < n; i++) { window.__now = (window.__now || 100) + 1 / 30; p.update(1 / 30, inp, w, window.__now); s.update(1 / 30); j.animals.update(1 / 30, w, p); }
    };
    const eyes = s.animals().every((a) => a.eyes && a.eyes.children.length === 2);
    const musicOff = !j.music.timer;
    s.left = 5; window.__sim(30);
    const dusk = j.scene.stormLevel > 0 && j.scene.stormLevel < 0.5;
    s.left = 0.05; window.__sim(3);
    const sc = j.scene;
    return { eyes, musicOff, dusk, level: sc.stormLevel, moonRed: sc.moon.material.color.r > 2 * sc.moon.material.color.g, fog: sc.scene.fog.far,
      vignette: Number(document.querySelector('.storm-vignette').style.opacity) };
  });
  check(looks.eyes, 'elk dier heeft gloeiende rode ogen en boze wenkbrauwen');
  check(looks.musicOff, 'in de Wilde Nacht speelt het vrolijke muziekje niet');
  check(looks.dusk, 'als de avond valt, wordt het al een beetje eng');
  // (het licht verandert pas bij het volgende getekende beeldje)
  const dark = await waitTrue(page, () => { const l = window.__jippecraft.scene.light.uSkyLight.value; return l.g < 0.05 && l.g > 0.02 && l.b > l.r; }, null, 10000);
  const blue = await run(() => { const sc = window.__jippecraft.scene, f = sc.scene.fog.color, c = sc.clouds.material.color; return f.b > f.r * 2 && c.b > c.r * 2; });
  check(looks.level === 1 && looks.moonRed && looks.fog <= 39 && dark && looks.vignette > 0.5,
    's nachts: rode maan, donker (maar niet té), mist dichtbij en een donkere rand om het beeld');
  check(blue, 's nachts zijn de lucht, de wolken en de mist allemaal donkerblauw');
  await page.screenshot({ path: out + '/6b-nacht.png' });

  // Geluid: grommen, een hartslag als ze dichtbij zijn, en een bromtoon die steeds harder wordt
  const sound = await run(() => {
    const j = window.__jippecraft, s = j.storm, p = j.player;
    const a = s.animals()[0];
    for (const b of s.animals()) if (b !== a) j.animals.remove(b);
    a.x = p.x + 6; a.z = p.z; a.y = p.y; a.chaseSpeed = 0;
    window.__heard = []; s.growlAt = 0; s.beatAt = 0; s.droneAt = 0;
    window.__sim(2);
    const kinds = new Set(window.__heard.map((h) => h[0]));
    const growl = window.__heard.find((h) => h[0] === 'growl');
    const drone = window.__heard.find((h) => h[0] === 'drone');
    return { growl: !!growl, right: growl && growl[1] > 0.5, beat: kinds.has('heartbeat'), drone: drone && drone[1] >= 0.5 };
  });
  check(sound.growl && sound.right, 'de dieren grommen, en je hoort van welke kant (rechts)');
  check(sound.beat, 'je hart klopt als er een dier dichtbij is');
  check(sound.drone, 's nachts klinkt een lage, dreigende bromtoon');

  // Krabben en bonken tegen je huis: een dier achter de muur
  const wall = await run(async () => {
    const { B } = await import('./js/blocks.js');
    const j = window.__jippecraft, s = j.storm, p = j.player, w = j.world;
    const x0 = Math.floor(p.x), z0 = Math.floor(p.z), y0 = Math.floor(p.y);
    for (let dz = -2; dz <= 2; dz++) for (let dy = 0; dy < 3; dy++) w.set(x0 - 2, y0 + dy, z0 + dz, B.COBBLE);
    const a = s.animals()[0];
    a.x = x0 - 3; a.z = z0 + 0.5; a.y = y0; a.chaseSpeed = 0;
    window.__heard = [];
    for (let i = 0; i < 6; i++) { s.scrapeAt = 0; window.__sim(1); }
    const hits = window.__heard.filter((h) => h[0] === 'bonk' || h[0] === 'scratch');
    return { hits: hits.length, left: hits.every((h) => h[1] < -0.5), hearts: s.hearts };
  });
  check(wall.hits >= 3 && wall.left && wall.hearts === 5, 'een dier achter de muur krabt en bonkt (links te horen), maar kan je niet raken');

  // Schrikmoment: je kijkt naar een raam, en ineens staat er een dier voor met een brul
  const scare = await run(async () => {
    const { B } = await import('./js/blocks.js');
    const j = window.__jippecraft, s = j.storm, p = j.player, w = j.world;
    const x0 = Math.floor(p.x), z0 = Math.floor(p.z), y0 = Math.floor(p.y);
    p.yaw = 0; // kijken naar -z
    for (let dx = -2; dx <= 2; dx++) for (let dy = 0; dy < 3; dy++) w.set(x0 + dx, y0 + dy, z0 - 3, dy === 1 && dx === 0 ? B.GLASS : B.COBBLE);
    for (let dx = -2; dx <= 2; dx++) for (let dz = -6; dz <= -4; dz++) for (let dy = 0; dy < 4; dy++) w.set(x0 + dx, y0 + dy, z0 + dz, 0);
    const lion = j.animals.spawn('lion', x0 + 10.5, y0, z0 + 8.5, 0); lion.storm = true;
    window.__heard = []; s.shake = 0; s.scareAt = s.t;
    window.__sim(1);
    const roar = window.__heard.some((h) => h[0] === 'roar');
    const front = s.animals().find((a) => a.scare > 0);
    return { roar, shake: s.shake > 0.3, front: !!front && front.z < z0 - 3 && Math.abs(front.x - (x0 + 0.5)) < 1.5, scared: s.scared };
  });
  check(scare.roar && scare.shake && scare.front, 'schrikmoment: ineens staat er een dier voor het raam, met een brul en een schok');

  // Gepakt: de bromtoon stopt; stoppen maakt alles weer gewoon
  await run(() => { const s = window.__jippecraft.storm; window.__heard = []; s.hearts = 1; s.invuln = 0; s.hurt(null); });
  check(await run(() => window.__heard.some((h) => h[0] === 'drone' && h[1] === 0) && window.__heard.some((h) => h[0] === 'roar')), 'gepakt: een harde brul, en de bromtoon stopt');
  await page.locator('.storm-btn.stop').tap();
  check(await waitTrue(page, () => { const j = window.__jippecraft; return !j.storm && !j.scene.stormLevel && !document.querySelector('.storm-vignette'); }, null, 20000),
    'na het stoppen is de lucht weer gewoon');
  await context.close();
}
