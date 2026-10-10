// Fase 5E: knoppen, hendels, drukplaten en een lamp die aan en uit kan.
import { waitTrue } from './helpers.mjs';

export async function testPhase5E({ newPage, check, out }) {
  const { context, page } = await newPage();
  const run = (fn, arg) => page.evaluate(fn, arg);
  await page.locator('.play-btn').tap();

  // Een muurtje met een deur, een lamp ernaast, en een hendel voor de deur (neergezet zoals Jippe dat doet)
  const spot = await run(async () => {
    const { B, doorId } = await import('./js/blocks.js');
    const j = window.__jippecraft, w = j.world, p = j.player;
    j.physics.enabled = false; j.animals.clear();
    const x0 = Math.floor(p.x), z0 = Math.floor(p.z) - 6;
    let y = 0;
    for (let x = x0 - 6; x <= x0 + 10; x++) for (let z = z0 - 4; z <= z0 + 6; z++) y = Math.max(y, w.surfaceY(x, z));
    for (let x = x0 - 6; x <= x0 + 10; x++) for (let z = z0 - 4; z <= z0 + 6; z++) { w.set(x, y, z, B.GRASS); for (let dy = 1; dy < 6; dy++) w.set(x, y + dy, z, 0); }
    for (let x = x0 - 3; x <= x0 + 7; x++) for (let dy = 1; dy <= 3; dy++) w.set(x, y + dy, z0, B.PLANKS);
    w.set(x0, y + 1, z0, doorId(0, false, false)); w.set(x0, y + 2, z0, doorId(0, true, false));
    w.set(x0 + 7, y + 1, z0, doorId(0, false, false)); w.set(x0 + 7, y + 2, z0, doorId(0, true, false));
    w.set(x0 + 2, y + 3, z0, B.SWITCH_LAMP);
    p.flying = false; p.setPos({ x: x0 + 2.5, y: y + 1, z: z0 + 4.5 }); p.yaw = 0;
    j.hotbar[j.sel] = B.LEVER;
    j.use({ x: x0 + 2, y, z: z0 + 2, nx: 0, ny: 1, nz: 0, id: w.get(x0 + 2, y, z0 + 2), dist: 2 });
    return { x0, y: y + 1, z0, lever: w.get(x0 + 2, y + 1, z0 + 2) === B.LEVER };
  });
  check(spot.lever, 'een hendel zet je op de grond');
  await run(async () => { window.__blocks = await import('./js/blocks.js'); }); // voor de wachtvoorwaarden hieronder (die moeten synchroon zijn)

  const state = () => run(async ({ x0, y, z0 }) => {
    const { B, BLOCKS } = await import('./js/blocks.js');
    const w = window.__jippecraft.world;
    return { door: !!BLOCKS[w.get(x0, y, z0)].open, top: !!BLOCKS[w.get(x0, y + 1, z0)].open, lamp: w.get(x0 + 2, y + 2, z0) === B.SWITCH_LAMP + 1, far: !!BLOCKS[w.get(x0 + 7, y, z0)].open };
  }, spot);
  const tap = (dx, dz) => run(async ({ x0, y, z0, dx, dz }) => {
    const j = window.__jippecraft, x = x0 + dx, z = z0 + dz;
    j.interact({ x, y, z, id: j.world.get(x, y, z), nx: 0, ny: 1, nz: 0 });
  }, { ...spot, dx, dz });

  await tap(2, 2);
  let s = await state();
  check(s.door && s.top && s.lamp, 'tik op de hendel: de deur gaat open en de lamp gaat aan');
  check(!s.far, 'een deur verder dan 4 blokken blijft dicht');
  check(await run(() => ['hendelDeur', 'lampAan'].every((id) => window.__jippecraft.quests.done.has(id))), 'dat geeft stickers');
  await page.waitForTimeout(600);
  await page.screenshot({ path: out + '/5e-hendel.png' });
  await tap(2, 2);
  s = await state();
  check(!s.door && !s.lamp, 'nog een keer tikken: de deur gaat dicht en de lamp uit');

  // Een knop: even aan, en dan vanzelf weer uit
  await run(async ({ x0, y, z0 }) => {
    const { B } = await import('./js/blocks.js');
    const j = window.__jippecraft, w = j.world;
    j.hotbar[j.sel] = B.BUTTON;
    j.use({ x: x0 + 7, y: y - 1, z: z0 + 2, nx: 0, ny: 1, nz: 0, id: w.get(x0 + 7, y - 1, z0 + 2), dist: 2 });
  }, spot);
  await tap(7, 2);
  check((await state()).far, 'tik op een knop: de deur ernaast gaat open');
  check(await waitTrue(page, ({ x0, y, z0 }) => {
    return !window.__blocks.BLOCKS[window.__jippecraft.world.get(x0 + 7, y, z0)].open;
  }, spot, 15000), 'na een paar tellen springt de knop terug en gaat de deur dicht');

  // Een drukplaat voor de deur: open zolang je erop staat
  await run(async ({ x0, y, z0 }) => {
    const { B } = await import('./js/blocks.js');
    const j = window.__jippecraft, w = j.world;
    j.hotbar[j.sel] = B.PLATE;
    j.use({ x: x0, y: y - 1, z: z0 + 1, nx: 0, ny: 1, nz: 0, id: w.get(x0, y - 1, z0 + 1), dist: 2 });
    j.player.setPos({ x: x0 + 0.5, y, z: z0 + 1.5 });
  }, spot);
  check(await waitTrue(page, ({ x0, y, z0 }) => {
    return !!window.__blocks.BLOCKS[window.__jippecraft.world.get(x0, y, z0)].open;
  }, spot, 15000), 'op de drukplaat staan: de deur gaat vanzelf open');
  check(await run(() => window.__jippecraft.quests.done.has('drukplaat')), 'op een drukplaat staan geeft een sticker');
  await page.screenshot({ path: out + '/5e-drukplaat.png' });
  await run(({ x0, y, z0 }) => window.__jippecraft.player.setPos({ x: x0 + 3.5, y, z: z0 + 4.5 }), spot);
  check(await waitTrue(page, ({ x0, y, z0 }) => {
    return !window.__blocks.BLOCKS[window.__jippecraft.world.get(x0, y, z0)].open;
  }, spot, 15000), 'eraf stappen: de deur gaat weer dicht');

  // In de kist
  await page.locator('.slot.chest').tap();
  await page.locator('.pal-tab[aria-label="Licht en huis"]').tap();
  check(await page.locator('.pal-item[aria-label="Hendel"]').isVisible() && await page.locator('.pal-item[aria-label="Schakellamp"]').isVisible(),
    'de kist heeft knoppen, hendels, drukplaten en de schakellamp');
  await context.close();
}
