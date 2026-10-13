// Fase 7A: de Wilde Dag. Dezelfde ronde als de Wilde Nacht, maar in de zon: geen donker, mist of rood,
// gele ogen, geen bromtoon of hartslag, en een eigen record en eigen stickers. Beeldje voor beeldje.
import { waitTrue } from './helpers.mjs';

export async function testPhase7A({ newPage, check, out }) {
  const { context, page } = await newPage();
  const run = (fn, arg) => page.evaluate(fn, arg);
  check(await page.locator('.day-menu-btn').isVisible(), 'het menu heeft een knop "Wilde Dag"');
  await page.locator('.day-menu-btn').tap();
  check(await waitTrue(page, () => window.__jippecraft.storm?.phase === 'dag' && window.__jippecraft.playing, null, 20000), 'de knop start de Wilde Dag');
  await run(() => {
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
  });
  const day = await run(() => {
    const j = window.__jippecraft, s = j.storm;
    return { sunny: s.sunny, text: document.querySelector('.storm-bar').textContent, eyes: s.animals().every((a) => a.eyes && a.eyes.children.length === 1 && a.eyesFar),
      noon: !j.daynight.night, hearts: s.hearts };
  });
  check(day.sunny && day.text.includes('Dag 1') && !day.text.includes('Nacht'), 'de balk zegt "Dag 1" in plaats van "Nacht 1"');
  check(day.eyes, 'de dieren hebben gele boze ogen (zonder rode gloed)');
  await page.screenshot({ path: out + '/7a-dag.png' });

  // De aanval begint: het blijft licht, zonder mist, rand of bromtoon
  await run(() => { const s = window.__jippecraft.storm; s.left = 0.05; window.__sim(3); window.__heard = []; window.__sim(60); });
  const attack = await run(() => {
    const j = window.__jippecraft, s = j.storm, sc = j.scene;
    return { phase: s.phase, level: sc.stormLevel || 0, fog: sc.scene.fog.far, vignette: Number(document.querySelector('.storm-vignette').style.opacity || 0),
      night: j.daynight.night, label: document.querySelector('.storm-bar').textContent, drone: window.__heard.some((h) => h[0] === 'drone' && h[1] > 0), beat: window.__heard.some((h) => h[0] === 'heartbeat') };
  });
  check(attack.phase === 'nacht' && attack.level === 0 && !attack.night && attack.vignette === 0, 'tijdens de aanval blijft het dag: geen donker, rode maan of rand om het beeld');
  check(attack.fog >= 38 && attack.label.includes('Dag 1') && attack.label.includes('golf 1/3'), 'geen dichte mist, en de balk zegt "Dag 1 golf 1/3"');
  check(!attack.drone && !attack.beat, 'geen bromtoon en geen hartslag');
  const light = await waitTrue(page, () => { const l = window.__jippecraft.scene.light.uSkyLight.value; return l.g > 0.5; }, null, 10000);
  check(light, 'het zonlicht blijft helder');
  await page.screenshot({ path: out + '/7a-aanval.png' });

  // De dieren zijn nog steeds gevaarlijk: zonder muur raken ze je
  const hit = await run(async () => {
    const j = window.__jippecraft, s = j.storm, p = j.player;
    for (const a of s.animals()) j.animals.remove(a);
    s.hearts = 5; s.invuln = 0;
    const lion = j.animals.spawn('lion', Math.floor(p.x) + 4, Math.floor(p.y), Math.floor(p.z) + 0.5, 0); lion.storm = true;
    window.__sim(120);
    return { hearts: s.hearts, growls: window.__heard.filter((h) => h[0] === 'growl').length };
  });
  check(hit.hearts < 5, 'zonder muur raakt een dier je ook in de zon');

  // De ronde overleven: eigen record en eigen sticker
  await run(() => { const j = window.__jippecraft, s = j.storm; for (const a of s.animals()) j.animals.remove(a); s.hearts = 5; s.left = 0.05; window.__sim(3); window.__sim(100); });
  check(await waitTrue(page, () => document.querySelector('.storm-end').textContent.includes('Je hebt dag 1 overleefd'), null, 10000), 'de ronde overleefd: "Je hebt dag 1 overleefd!"');
  const rec = await run(() => { const j = window.__jippecraft; return { dag: j.settings.wildeDag?.record, nacht: j.settings.wildeNacht?.record || 0, sticker: j.quests.done.has('dag1'), next: document.querySelector('.storm-btn.next')?.textContent }; });
  check(rec.dag >= 1 && rec.nacht === 0, 'het record van de Wilde Dag is los van de Wilde Nacht');
  check(rec.sticker, 'er is een sticker voor je eerste Wilde Dag');
  check(rec.next.includes('Volgende dag'), 'de knop zegt "Volgende dag"');
  await page.locator('.storm-btn.next').tap();
  check(await run(() => { const s = window.__jippecraft.storm; return s.night === 2 && s.phase === 'dag' && s.sunny && document.querySelector('.storm-bar').textContent.includes('Dag 2'); }),
    'dan volgt Dag 2 (nog steeds in de zon, met meer dieren)');

  // Nog een keer / stoppen: terug naar je eigen wereld
  await run(() => window.__jippecraft.openMenu());
  await page.locator('.storm-end.pauze .storm-btn.stop').tap();
  check(await waitTrue(page, () => { const j = window.__jippecraft; return !j.storm && !j.scene.stormLevel && j.ui.menuOpen; }, null, 20000), 'stoppen brengt je terug naar het menu');
  await context.close();
}
