// Fase 4H (deel 2): portalen naar de themawerelden, met je dier mee, en weer terug.
import { waitTrue } from './helpers.mjs';

export async function testPhase4H({ newPage, check, out }) {
  const { context, page } = await newPage();
  const run = (fn, arg) => page.evaluate(fn, arg);
  await page.locator('.play-btn').tap();

  // Een vlak stuk grond met een frame van groene portaalsteen
  const spot = await run(async () => {
    const { B, ITEM } = await import('./js/blocks.js');
    const { portalCells } = await import('./js/portal.js');
    const j = window.__jippecraft, w = j.world, p = j.player;
    const x = Math.floor(p.x), z = Math.floor(p.z) - 5;
    let y = 0;
    for (let dx = -4; dx <= 5; dx++) for (let dz = -4; dz <= 9; dz++) y = Math.max(y, w.surfaceY(x + dx, z + dz));
    for (let dx = -4; dx <= 5; dx++) for (let dz = -4; dz <= 9; dz++) {
      w.set(x + dx, y, z + dz, B.GRASS);
      for (let dy = 1; dy < 7; dy++) w.set(x + dx, y + dy, z + dz, 0);
    }
    for (const [cx, cy, cz, id] of portalCells(0, 0, x, y + 1, z, false)) w.set(cx, cy, cz, id);
    j.physics.enabled = false;
    j.animals.clear();
    p.flying = false;
    p.setPos({ x: x + 1, y: y + 1, z: z + 5.5 }); p.yaw = 0; p.pitch = 0;
    j.hotbar[j.sel] = ITEM.WAND;
    return { x, y: y + 1, z, type: w.type, seed: w.seed, slot: j.slot };
  });

  // Een frame zonder toverstaf blijft leeg; met de toverstaf gaat het licht aan
  const lit = await run(async ({ x, y, z }) => {
    const { BLOCKS } = await import('./js/blocks.js');
    const j = window.__jippecraft, w = j.world;
    const empty = w.get(x, y, z) === 0;
    j.use({ x, y: y - 1, z, nx: 0, ny: 1, nz: 0, id: w.get(x, y - 1, z), dist: 4 });
    const inside = [[0, 0], [1, 0], [0, 1], [1, 2]].every(([u, v]) => BLOCKS[w.get(x + u, y + v, z)]?.portal === 0);
    return { empty, inside };
  }, spot);
  check(lit.empty && lit.inside, 'een frame van groene portaalsteen gaat aan met de toverstaf');
  await page.waitForTimeout(800);
  await page.screenshot({ path: out + '/4h-portaal.png' });

  // Met een tamme hond door het portaal: naar de Jungle
  await run(({ x, y, z }) => {
    const j = window.__jippecraft, dog = j.animals.spawn('dog', x + 2.5, y, z + 3.5);
    dog.tame = true;
    j.player.setPos({ x: x + 1, y, z: z + 0.5 });
  }, spot);
  check(await waitTrue(page, () => { const j = window.__jippecraft; return j.extra === 'jungle' && !j.travelling; }, null, 30000),
    'door het groene portaal kom je in de Jungle');
  const there = await run(async () => {
    const { findPortal } = await import('./js/portal.js');
    const j = window.__jippecraft, w = j.world, pp = j.portalPos;
    return {
      type: w.type, gv: w.gv,
      back: !!findPortal(w, pp.x, pp.y - 1, pp.z),
      dog: j.animals.list.some((a) => a.type === 'dog' && a.tame && Math.hypot(a.x - j.player.x, a.z - j.player.z) < 5),
    };
  });
  check(there.type === 'jungle' && there.gv >= 2, 'de Jungle is een eindeloze themawereld met meerdere landschappen');
  check(there.back, 'bij de start in de Jungle staat een portaal terug');
  check(there.dog, 'je tamme hond is mee door het portaal');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: out + '/4h-jungle.png' });

  // Bewaard als extra wereld van deze wereldplek
  check(await waitTrue(page, async () => {
    const j = window.__jippecraft, key = 'slot' + j.slot + '~jungle';
    await j.store.flush();
    return !!(await j.store.loadMetas([key]))[key];
  }, null, 10000), 'de Jungle wordt apart bewaard bij deze wereldplek');

  // Terug door het portaal: weer thuis, naast het eerste portaal, met de hond
  await run(() => {
    const j = window.__jippecraft, pp = j.portalPos;
    j.player.setPos({ x: pp.x + 1, y: pp.y, z: pp.z + 0.5 });
  });
  check(await waitTrue(page, () => { const j = window.__jippecraft; return j.extra === null && !j.travelling; }, null, 30000),
    'door het portaal terug ben je weer thuis');
  const home = await run(({ x, z, type, seed }) => {
    const j = window.__jippecraft, p = j.player;
    return {
      same: j.world.type === type && j.world.seed === seed,
      near: Math.hypot(p.x - x - 1, p.z - z) < 3,
      dog: j.animals.list.some((a) => a.type === 'dog' && a.tame),
    };
  }, spot);
  check(home.same && home.near, 'thuis sta je weer bij het portaal in je eigen wereld');
  check(home.dog, 'de hond is ook weer mee terug');

  // Een stuk van het frame weg: het portaal gaat uit
  const off = await run(async ({ x, y, z }) => {
    const j = window.__jippecraft, w = j.world;
    j.player.setPos({ x: x + 1, y, z: z + 5.5 });
    await new Promise((r) => setTimeout(r, 300));
    j.apply([{ x: x - 1, y: y + 1, z, from: w.get(x - 1, y + 1, z), to: 0 }]);
    return [[0, 0], [1, 0], [0, 2], [1, 2]].every(([u, v]) => w.get(x + u, y + v, z) === 0);
  }, spot);
  check(off, 'sloop je een stuk van het frame, dan gaat het portaal uit');

  // De stempel zet een kant-en-klaar portaal neer
  const stamped = await run(async ({ x, y, z }) => {
    const { ITEM, BLOCKS } = await import('./js/blocks.js');
    const j = window.__jippecraft, w = j.world;
    j.player.setPos({ x: x + 1.5, y, z: z + 8.5 }); j.player.yaw = 0;
    j.hotbar[j.sel] = ITEM.PORTAL_STAMP + 1;
    j.use({ x: x + 1, y: y - 1, z: z + 7, nx: 0, ny: 1, nz: 0, id: w.get(x + 1, y - 1, z + 7), dist: 2 });
    let n = 0;
    for (let dx = -4; dx <= 5; dx++) for (let dz = 0; dz <= 9; dz++) for (let dy = 0; dy <= 4; dy++) if (BLOCKS[w.get(x + dx, y + dy, z + dz)]?.portal === 1) n++;
    return n;
  }, spot);
  check(stamped === 6, 'de stempel Geel portaal zet een aangestoken portaal neer');

  // In de kist: een tabblad Portalen
  await page.locator('.slot.chest').tap();
  await page.locator('.pal-tab[aria-label="Portalen"]').tap();
  check(await page.locator('.pal-item[aria-label="Toverstaf"]').isVisible(), 'de kist heeft een tabblad Portalen met de toverstaf');
  await page.screenshot({ path: out + '/4h-kist.png' });
  await context.close();
}
