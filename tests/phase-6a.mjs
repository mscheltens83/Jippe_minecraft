// Fase 6A: de Wilde Nacht. Bouw overdag een huis; 's nachts komen de dieren op je af.
// De tijd loopt hier beeldje voor beeldje (storm.update), zodat het niet van de snelheid van de
// testcomputer afhangt.
import { waitTrue } from './helpers.mjs';

export async function testPhase6A({ newPage, check, out }) {
  const { context, page } = await newPage();
  const run = (fn, arg) => page.evaluate(fn, arg);
  // Een stapje simuleren: speler, Wilde Nacht en dieren (het spel zelf staat even stil)
  const SIM = `window.__sim = (n, inp = { move: { x: 0, y: 0 }, jump: false, down: false, sprint: false }) => {
    const j = window.__jippecraft, p = j.player, w = j.world;
    for (let i = 0; i < n; i++) { window.__now = (window.__now || 100) + 1 / 30; p.update(1 / 30, inp, w, window.__now); j.storm?.update(1 / 30); j.animals.update(1 / 30, w, p); }
  };`;

  const before = await run(() => {
    const j = window.__jippecraft;
    return { type: j.world.type, seed: j.world.seed, x: j.player.x, z: j.player.z, metas: JSON.stringify(Object.keys(j.metas)) };
  });
  check(await page.locator('.storm-menu-btn').isVisible(), 'het menu heeft een knop "Wilde Nacht"');
  await page.locator('.storm-menu-btn').tap();
  check(await waitTrue(page, () => window.__jippecraft.storm?.phase === 'dag' && window.__jippecraft.playing, null, 20000), 'de knop start de Wilde Nacht: eerst is het dag');
  await run(SIM);
  const day = await run(() => {
    const j = window.__jippecraft, s = j.storm;
    j.playing = false;
    return { bar: !!document.querySelector('.storm-bar'), home: document.querySelector('.home-btn').hidden, animals: s.animals().length,
      hearts: s.hearts, left: s.left, far: s.animals().every((a) => Math.hypot(a.x - j.player.x, a.z - j.player.z) > 18) };
  });
  check(day.bar && day.home && day.hearts === 5 && day.left > 60, 'balk met klok en 5 hartjes; geen huisknop');
  check(day.animals >= 6 && day.far, `nacht 1: dieren (${day.animals}) staan ver weg in een kring`);
  await page.screenshot({ path: out + '/6a-dag.png' });

  // Niet vals spelen: geen vliegen, geen stempels, geen dieren neerzetten, niet bewaren
  const rules = await run(async () => {
    const { ITEM } = await import('./js/blocks.js');
    const j = window.__jippecraft, p = j.player, y = j.world.surfaceY(Math.floor(p.x), Math.floor(p.z));
    j.toggleFly();
    const fly = p.flying;
    const n = j.animals.list.length, edits = j.edits;
    j.placeStamp({ x: Math.floor(p.x) + 3, y, z: Math.floor(p.z), id: 1, nx: 0, ny: 1, nz: 0 }, 'house');
    j.placeAnimal({ x: Math.floor(p.x) + 3, y, z: Math.floor(p.z), id: 1, nx: 0, ny: 1, nz: 0 }, 'pig');
    j.goHome();
    await j.saveNow();
    return { fly, stamp: j.edits === edits, animal: j.animals.list.length === n, item: !!ITEM.HOUSE, metas: JSON.stringify(Object.keys(j.metas)) };
  });
  check(!rules.fly && rules.stamp && rules.animal, 'in de Wilde Nacht: niet vliegen, geen stempels en geen dieren neerzetten');
  check(rules.metas === before.metas, 'van de Wilde Nacht wordt niets bewaard');

  // Overdag staren ze; als de klok op is, wordt het nacht en komen ze eraan
  const night = await run(() => {
    const j = window.__jippecraft, s = j.storm, p = j.player;
    // gemiddelde afstand (één dier kan best even achter een boom vastzitten)
    const d = () => { const l = s.animals().map((a) => Math.hypot(a.x - p.x, a.z - p.z)); return l.reduce((m, v) => m + v, 0) / l.length; };
    const d0 = d();
    window.__sim(60);
    const stare = Math.abs(d() - d0) < 0.5 && s.phase === 'dag';
    s.left = 0.05; window.__sim(3);
    const dark = s.phase === 'nacht' && j.daynight.night;
    const d1 = d(); window.__sim(90);
    return { stare, dark, closer: d1 - d() > 3 };
  });
  check(night.stare, 'overdag staan de dieren stil en kijken naar je');
  check(night.dark && night.closer, 'als de klok op is, wordt het nacht en rennen de dieren op je af');

  // Een muur houdt ze tegen; zonder muur raken ze je (hartje kwijt, weggeduwd)
  const hit = await run(async () => {
    const { B } = await import('./js/blocks.js');
    const j = window.__jippecraft, s = j.storm, p = j.player, w = j.world;
    for (const a of s.animals()) j.animals.remove(a);
    const x0 = Math.floor(p.x), z0 = Math.floor(p.z), y0 = Math.floor(p.y);
    for (let dz = -2; dz <= 2; dz++) for (let dy = 0; dy < 3; dy++) w.set(x0 + 2, y0 + dy, z0 + dz, B.COBBLE);
    const lion = j.animals.spawn('lion', x0 + 4, y0, z0 + 0.5, 0); lion.storm = true;
    window.__sim(90);
    const walled = s.hearts === 5;
    for (let dz = -2; dz <= 2; dz++) for (let dy = 0; dy < 3; dy++) w.set(x0 + 2, y0 + dy, z0 + dz, 0);
    const px = p.x;
    window.__sim(45);
    return { walled, hurt: s.hearts === 4, pushed: px - p.x > 0.5, flash: document.querySelector('.storm-flash').classList.contains('on') };
  });
  check(hit.walled, 'achter een muur kan een dier je niet raken');
  check(hit.hurt && hit.pushed && hit.flash, 'zonder muur: een hartje kwijt, je wordt weggeduwd en het scherm flitst rood');

  // Vallen van 4 blokken of hoger kost ook een hartje
  const fall = await run(() => {
    const j = window.__jippecraft, s = j.storm, p = j.player;
    for (const a of s.animals()) j.animals.remove(a);
    const h = s.hearts; s.invuln = 0;
    p.setPos({ x: p.x, y: j.world.surfaceY(Math.floor(p.x), Math.floor(p.z)) + 7, z: p.z });
    window.__sim(60);
    return s.hearts === h - 1;
  });
  check(fall, 'van hoog vallen kost een hartje');

  // Alle hartjes op: gepakt
  await run(() => { const s = window.__jippecraft.storm; s.hearts = 1; s.invuln = 0; s.hurt(null); });
  check(await waitTrue(page, () => !document.querySelector('.storm-end').hidden && document.querySelector('.storm-end').textContent.includes('Je bent gepakt')), 'alle hartjes op: "Je bent gepakt!"');
  await page.screenshot({ path: out + '/6a-gepakt.png' });
  await page.locator('.storm-btn.again').tap();
  check(await waitTrue(page, () => { const s = window.__jippecraft.storm; return s && s.phase === 'dag' && s.night === 1 && s.hearts === 5 && document.querySelector('.storm-end').hidden; }, null, 20000),
    '"Nog een keer" begint opnieuw bij nacht 1');

  // De nacht overleven: zonsopkomst, en dan de volgende (moeilijkere) nacht
  await run(SIM);
  await run(() => {
    const j = window.__jippecraft, s = j.storm;
    j.playing = false;
    for (const a of s.animals()) j.animals.remove(a);
    s.left = 0.05; window.__sim(3);
    s.left = 0.05; window.__sim(3);
    window.__sim(100);
  });
  check(await waitTrue(page, () => document.querySelector('.storm-end').textContent.includes('overleefd')), 'de nacht overleefd: de zon komt op');
  check(await run(() => window.__jippecraft.settings.wildeNacht?.record >= 1), 'het record (aantal nachten) wordt onthouden');
  await page.locator('.storm-btn.next').tap();
  check(await run(() => { const s = window.__jippecraft.storm; return s.night === 2 && s.phase === 'dag' && s.plan.count > 8 && s.animals().length >= 8 && s.plan.build < 90; }),
    'volgende nacht: meer dieren en minder tijd om te bouwen');

  // Stoppen: terug naar de eigen wereld, die niet veranderd is
  await run(() => window.__jippecraft.openMenu());
  check(await waitTrue(page, () => { const j = window.__jippecraft; return !j.storm && j.ui.menuOpen && !document.querySelector('.storm-bar'); }, null, 20000),
    'naar het menu = stoppen met de Wilde Nacht');
  const back = await run(() => { const j = window.__jippecraft; return { type: j.world.type, seed: j.world.seed, x: j.player.x, z: j.player.z, home: !document.querySelector('.home-btn').hidden }; });
  check(back.type === before.type && back.seed === before.seed && Math.hypot(back.x - before.x, back.z - before.z) < 2 && back.home,
    'daarna ben je weer in je eigen wereld, op dezelfde plek');
  await context.close();
}
