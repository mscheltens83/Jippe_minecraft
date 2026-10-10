// Fase 5D: rails met een karretje, en een bootje op het water.
import { waitTrue } from './helpers.mjs';

export async function testPhase5D({ newPage, check, out }) {
  const { context, page } = await newPage();
  const run = (fn, arg) => page.evaluate(fn, arg);
  await page.locator('.play-btn').tap();

  // Een vlak veld met een rondje rails (gelegd zoals Jippe dat doet: blok voor blok)
  const spot = await run(async () => {
    const { B } = await import('./js/blocks.js');
    const j = window.__jippecraft, w = j.world, p = j.player;
    j.physics.enabled = false; j.animals.clear();
    const x0 = Math.floor(p.x) - 4, z0 = Math.floor(p.z) - 12;
    let y = 0;
    for (let x = x0 - 2; x < x0 + 30; x++) for (let z = z0 - 2; z < z0 + 12; z++) y = Math.max(y, w.surfaceY(x, z));
    for (let x = x0 - 2; x < x0 + 30; x++) for (let z = z0 - 2; z < z0 + 12; z++) { w.set(x, y, z, B.GRASS); for (let dy = 1; dy < 6; dy++) w.set(x, y + dy, z, 0); }
    const loop = [];
    for (let x = 0; x <= 7; x++) loop.push([x, 0]);
    for (let z = 1; z <= 4; z++) loop.push([7, z]);
    for (let x = 6; x >= 0; x--) loop.push([x, 4]);
    for (let z = 3; z >= 1; z--) loop.push([0, z]);
    j.hotbar[j.sel] = B.RAIL;
    p.flying = true;
    for (const [dx, dz] of loop) {
      const x = x0 + dx, z = z0 + dz;
      p.setPos({ x: x + 0.5, y: y + 4, z: z + 3.5 });
      j.use({ x, y, z, nx: 0, ny: 1, nz: 0, id: w.get(x, y, z), dist: 3 });
    }
    // een vijver om te varen
    for (let x = x0 + 12; x < x0 + 28; x++) for (let z = z0; z < z0 + 8; z++) { w.set(x, y, z, B.WATER); w.set(x, y - 1, z, B.WATER); }
    return { x0, y: y + 1, z0, n: loop.length };
  });
  const rails = await run(async ({ x0, y, z0 }) => {
    const { isRail, railInfo } = await import('./js/rails.js');
    const w = window.__jippecraft.world;
    let n = 0, curves = 0;
    for (let x = x0; x <= x0 + 7; x++) for (let z = z0; z <= z0 + 4; z++) {
      const id = w.get(x, y, z);
      if (!isRail(id)) continue;
      n++;
      const [a, b] = railInfo(id).ends;
      if ((a + 2) % 4 !== b) curves++;
    }
    return { n, curves };
  }, spot);
  check(rails.n === spot.n && rails.curves === 4, `rails sluiten vanzelf op elkaar aan, met bochten in de hoeken (${rails.n} rails, ${rails.curves} bochten)`);

  // Het karretje op de rails; erin zitten en rijden
  const cart = await run(async ({ x0, y, z0 }) => {
    const { ITEM } = await import('./js/blocks.js');
    const j = window.__jippecraft, w = j.world, p = j.player;
    p.flying = false; p.setPos({ x: x0 + 3.5, y, z: z0 + 2.5 }); p.yaw = Math.PI / 2; // kijkt naar -x... maakt niet uit
    j.hotbar[j.sel] = ITEM.MINECART;
    j.use({ x: x0 + 3, y, z: z0, nx: 0, ny: 1, nz: 0, id: w.get(x0 + 3, y, z0), dist: 2 });
    const c = j.animals.list.find((a) => a.type === 'minecart');
    if (!c) return { ok: false };
    j.petAnimal(c);
    p.yaw = -Math.PI / 2; // kijk naar het oosten, langs de rails
    j.input.stick.y = 1;
    return { ok: true, riding: p.riding === c, x: c.x, z: c.z };
  }, spot);
  check(cart.ok && cart.riding, 'het karretje staat op de rails en je kunt erin gaan zitten');
  check(await waitTrue(page, ({ x, z }) => {
    const c = window.__jippecraft.player.riding;
    return c && Math.hypot(c.x - x, c.z - z) > 3;
  }, cart, 20000), 'met de stuurknop rijdt het karretje over de rails');
  check(await waitTrue(page, () => window.__jippecraft.quests.done.has('karretje'), null, 60000), 'het karretje gaat de bocht om en geeft een sticker');
  const onTrack = await run(async () => {
    const { isRail } = await import('./js/rails.js');
    const j = window.__jippecraft, c = j.player.riding;
    return isRail(j.world.get(Math.floor(c.x), Math.floor(c.y + 0.3), Math.floor(c.z)));
  });
  check(onTrack, 'het karretje blijft op de rails');
  await page.screenshot({ path: out + '/5d-karretje.png' });
  await run(() => { const j = window.__jippecraft; j.input.stick.y = 0; j.dismount(); });

  // Het bootje: op het water zetten, erin en varen
  const boat = await run(async ({ x0, y, z0 }) => {
    const { ITEM } = await import('./js/blocks.js');
    const j = window.__jippecraft, w = j.world, p = j.player;
    p.setPos({ x: x0 + 10.5, y, z: z0 + 4.5 }); p.yaw = -Math.PI / 2;
    j.hotbar[j.sel] = ITEM.BOAT;
    j.use({ x: x0 + 13, y: y - 1, z: z0 + 4, nx: 0, ny: 1, nz: 0, id: w.get(x0 + 13, y - 1, z0 + 4), dist: 3 });
    const b = j.animals.list.find((a) => a.type === 'boat');
    if (!b) return { ok: false };
    j.petAnimal(b);
    p.yaw = -Math.PI / 2;
    j.input.stick.y = 1;
    return { ok: true, riding: p.riding === b, x: b.x };
  }, spot);
  check(boat.ok && boat.riding, 'het bootje drijft op het water en je kunt erin');
  check(await waitTrue(page, (x) => { const b = window.__jippecraft.player.riding; return b && b.x - x > 4; }, boat.x, 20000), 'met de stuurknop vaar je over het water');
  await page.waitForTimeout(3000);
  const stays = await run(async ({ x0, y }) => {
    const { WATERY } = await import('./js/blocks.js');
    const j = window.__jippecraft, b = j.player.riding;
    return { water: !!WATERY[j.world.get(Math.floor(b.x), y - 1, Math.floor(b.z))], inside: b.x < x0 + 28, high: Math.abs(b.y - y) < 0.6 };
  }, spot);
  check(stays.water && stays.inside && stays.high, 'het bootje blijft op het water en vaart niet het land op');
  await page.screenshot({ path: out + '/5d-bootje.png' });
  await run(() => { const j = window.__jippecraft; j.input.stick.y = 0; j.dismount(); });

  // In de kist: tabblad Rijden
  await page.locator('.slot.chest').tap();
  await page.locator('.pal-tab[aria-label="Rijden"]').tap();
  check(await page.locator('.pal-item[aria-label="Karretje"]').isVisible() && await page.locator('.pal-item[aria-label="Bootje"]').isVisible(),
    'de kist heeft een tabblad Rijden met rails, karretje en bootje');
  await context.close();
}
