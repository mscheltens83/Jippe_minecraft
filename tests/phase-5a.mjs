// Fase 5A: de Dinowereld. Door het rode portaal, dino's, eieren uitbroeden, een T-rex temmen en berijden.
import { waitTrue } from './helpers.mjs';

export async function testPhase5A({ newPage, check, out }) {
  const { context, page } = await newPage();
  const run = (fn, arg) => page.evaluate(fn, arg);
  await page.locator('.play-btn').tap();

  // De stempel Rood portaal zet een aangestoken portaal neer; erin lopen = naar de Dinowereld
  const spot = await run(async () => {
    const { ITEM, BLOCKS } = await import('./js/blocks.js');
    const j = window.__jippecraft, w = j.world, p = j.player;
    j.physics.enabled = false;
    const x = Math.floor(p.x), z = Math.floor(p.z), y = w.surfaceY(x, z - 2);
    p.flying = true; p.setPos({ x: x + 0.5, y: y + 1, z: z + 0.5 }); p.yaw = 0;
    j.hotbar[j.sel] = ITEM.PORTAL_STAMP + 4;
    j.use({ x, y, z: z - 1, nx: 0, ny: 1, nz: 0, id: w.get(x, y, z - 1), dist: 2 });
    let cell = null;
    for (let dx = -4; dx <= 4 && !cell; dx++) for (let dz = -6; dz <= 2 && !cell; dz++) for (let dy = 0; dy <= 5 && !cell; dy++) {
      if (BLOCKS[w.get(x + dx, y + dy, z + dz)]?.portal === 4) cell = { x: x + dx, y: y + dy, z: z + dz };
    }
    return { cell, type: w.type };
  });
  check(!!spot.cell, 'de stempel Rood portaal zet een rood portaal neer');
  await run(({ cell }) => {
    const j = window.__jippecraft;
    j.player.flying = false;
    j.player.setPos({ x: cell.x + 0.5, y: cell.y, z: cell.z + 0.5 });
  }, spot);
  check(await waitTrue(page, () => { const j = window.__jippecraft; return j.extra === 'dino' && !j.travelling; }, null, 30000),
    'door het rode portaal kom je in de Dinowereld');
  const world = await run(() => {
    const j = window.__jippecraft, w = j.world, gen = w.gen, seen = new Set();
    for (let r = 0; r < 900; r += 30) for (let a = 0; a < 24; a++) {
      seen.add(gen.raw(Math.round(48 + Math.cos(a / 24 * 6.283) * r), Math.round(48 + Math.sin(a / 24 * 6.283) * r)).biome);
    }
    return { type: w.type, gv: w.gv, biomes: [...seen], landmarks: gen.landmarks.map((l) => l.kind) };
  });
  check(world.type === 'dino' && world.gv >= 2, 'de Dinowereld is een eindeloze themawereld');
  check(['dinoPlains', 'dinoForest', 'volcano'].every((b) => world.biomes.includes(b)), 'met een varenvlakte, een oerbos en vulkanen');
  check(world.landmarks.includes('nest') && world.landmarks.includes('dig'), 'bij de start liggen een dinonest en een opgraving');
  check(await waitTrue(page, () => window.__jippecraft.animals.list.some((a) => ['trex', 'brachio', 'triceratops', 'stegosaurus', 'parasaur', 'pteranodon', 'raptor'].includes(a.type)), null, 15000),
    "in de Dinowereld lopen dino's");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: out + '/5a-dinowereld.png' });

  // Een ei uitbroeden: tik erop en er komt een jonge dino uit
  const hatched = await run(async () => {
    const { B } = await import('./js/blocks.js');
    const j = window.__jippecraft, w = j.world, p = j.player;
    const x = Math.floor(p.x) + 2, z = Math.floor(p.z) - 2, y = w.surfaceY(x, z) + 1;
    w.set(x, y, z, B.DINO_EGG + 2);
    const before = j.animals.list.length;
    j.interact({ x, y, z, id: B.DINO_EGG + 2, nx: 0, ny: 1, nz: 0 });
    const baby = j.animals.list[j.animals.list.length - 1];
    return { gone: w.get(x, y, z) === 0, more: j.animals.list.length === before + 1, type: baby?.type, baby: baby?.baby > 0 };
  });
  check(hatched.gone && hatched.more && hatched.baby && ['trex', 'raptor'].includes(hatched.type), 'een rood dino-ei breekt open en er komt een jonge T-rex of velociraptor uit');

  // Een T-rex temmen (drie keer aaien) en erop rijden
  const ride = await run(() => {
    const j = window.__jippecraft, p = j.player;
    p.flying = false;
    const rex = j.animals.spawn('trex', p.x + 3, j.world.surfaceY(Math.floor(p.x + 3), Math.floor(p.z)) + 1, p.z, 0);
    if (!rex) return { ok: false };
    for (let i = 0; i < 3; i++) j.petAnimal(rex);
    const tame = rex.tame;
    j.petAnimal(rex); // tam: aaien = erop zitten
    return { ok: true, tame, riding: p.riding === rex, seat: rex.def.zadel };
  });
  check(ride.ok && ride.tame, 'een T-rex wordt tam als je hem drie keer aait');
  check(ride.riding && ride.seat > 1.5, 'op een tamme T-rex kun je rijden, hoog op zijn rug');
  await page.waitForTimeout(800);
  await page.screenshot({ path: out + '/5a-trex.png' });
  await run(() => window.__jippecraft.dismount());

  // In de kist: dino's en de blokken van de Dinowereld
  await page.locator('.slot.chest').tap();
  await page.locator('.pal-tab[aria-label="Dieren"]').tap();
  check(await page.locator('.pal-item[aria-label="T-rex"]').isVisible(), "de kist heeft dino's bij de dieren");
  await page.locator('.pal-tab[aria-label="Natuur"]').tap();
  check(await page.locator('.pal-item[aria-label="Magmasteen"]').isVisible(), 'de kist heeft de blokken van de Dinowereld');
  await page.screenshot({ path: out + '/5a-kist.png' });
  await context.close();
}
