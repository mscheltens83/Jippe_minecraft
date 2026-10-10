// Fase 4F (deel 1): nieuwe blokken, standen bij het plaatsen en natuurkunde.
import { waitTrue } from './helpers.mjs';

export async function testPhase4F({ newPage, check, out }) {
  const { context, page } = await newPage();
  const run = (fn, arg) => page.evaluate(fn, arg);
  await page.locator('.play-btn').tap();

  // ---------- de kist ----------
  await page.locator('.slot.chest').tap();
  await page.locator('.pal-tab[aria-label="Kleuren"]').tap();
  check(await page.locator('.pal-items:not([hidden]) .pal-section').count() === 6 && await page.locator('.pal-items:not([hidden]) .pal-item').count() === 96,
    'de kist heeft een tabblad Kleuren met 16 kleuren wol, tapijt, beton, terracotta, glas en panelen');
  await page.screenshot({ path: out + '/4f-kist-kleuren.png' });
  await page.locator('.pal-tab[aria-label="Bouwen"]').tap();
  await page.locator('.pal-item[aria-label="Berken trap"]').tap();
  check(await run(async () => {
    const { stairsId } = await import('./js/blocks.js');
    const j = window.__jippecraft;
    return j.hotbar[j.sel] === stairsId(1, 0);
  }), 'een berken trap kiezen uit de kist werkt');
  check(await run(async () => {
    const { PALETTE, BLOCKS, isSpecial } = await import('./js/blocks.js');
    return PALETTE.length > 280 && PALETTE.every((id) => isSpecial(id) || BLOCKS[id]) && document.querySelectorAll('.pal-item img').length === PALETTE.length;
  }), 'alle blokken in de kist hebben een plaatje');

  // ---------- standen ----------
  const states = await run(async () => {
    const m = await import('./js/blocks.js');
    const { B } = m, j = window.__jippecraft, w = j.world, out = {};
    const x = 52, z = 44, y = w.surfaceY(x, z);
    const ray = (ox, oy, oz, dx, dy, dz) => { j.raycaster.ray.origin.set(ox, oy, oz); j.raycaster.ray.direction.set(dx, dy, dz); };
    w.set(x, y + 1, z, B.STONE);
    ray(x + 3, y + 1.5, z + 0.5, -1, 0, 0);
    j.placeBlock({ x, y: y + 1, z, nx: 1, ny: 0, nz: 0, id: B.STONE, dist: 2 }, B.SPRUCE_LOG);
    out.log = w.get(x + 1, y + 1, z) === B.LOG_AXIS + 4;
    ray(x + 0.5, y + 1.5, z + 0.5, 0, -1, 0);
    j.placeBlock({ x, y: y + 1, z, nx: 0, ny: 1, nz: 0, id: B.STONE, dist: 0.5 }, B.SPRUCE_LOG);
    out.upright = w.get(x, y + 2, z) === B.SPRUCE_LOG;
    // twee platen worden één blok
    w.set(x, y + 1, z + 3, m.slabId(6));
    ray(x + 0.5, y + 4, z + 3.5, 0, -1, 0);
    j.placeBlock({ x, y: y + 1, z: z + 3, nx: 0, ny: 1, nz: 0, id: m.slabId(6), dist: 2.5 }, m.slabId(6));
    out.double = w.get(x, y + 1, z + 3) === B.STONE;
    // bovenhelft van een zijvlak: trap ondersteboven, plaat boven
    w.set(x, y + 1, z + 6, B.STONE);
    ray(x + 3, y + 1.8, z + 6.5, -1, 0, 0);
    j.placeBlock({ x, y: y + 1, z: z + 6, nx: 1, ny: 0, nz: 0, id: B.STONE, dist: 2 }, m.stairsId(8, 0));
    out.upside = !!m.BLOCKS[w.get(x + 1, y + 1, z + 6)].upside;
    ray(x - 3, y + 1.8, z + 6.5, 1, 0, 0);
    j.placeBlock({ x, y: y + 1, z: z + 6, nx: -1, ny: 0, nz: 0, id: B.STONE, dist: 2 }, m.slabId(3));
    out.topSlab = w.get(x - 1, y + 1, z + 6) === m.slabId(3, true);
    // glazen panelen groeien aan elkaar vast
    for (let i = 1; i < 6; i++) for (let dz = 8; dz <= 10; dz++) w.set(x + 1 + i, y + 1, z + dz, 0); // vrije plek
    for (let i = 0; i < 3; i++) w.set(x + 3 + i, y + 1, z + 9, B.PANE + 4);
    out.pane = m.blockBoxes(w, x + 4, y + 1, z + 9).length === 3 && m.blockBoxes(w, x + 3, y + 1, z + 9).length === 2;
    // deur van een andere houtsoort gaat open en dicht
    ray(x + 0.5, y + 3, z + 12.5, 0, -1, 0);
    j.placeBlock({ x, y, z: z + 12, nx: 0, ny: 1, nz: 0, id: w.get(x, y, z + 12), dist: 2 }, m.doorId(0, false, false, 4));
    const before = w.get(x, y + 1, z + 12);
    j.toggleDoor({ x, y: y + 1, z: z + 12, id: before });
    out.door = m.BLOCKS[before].wood === 4 && m.BLOCKS[w.get(x, y + 1, z + 12)].open && m.BLOCKS[w.get(x, y + 1, z + 12)].wood === 4;
    return out;
  });
  check(states.log && states.upright, 'een stam ligt als je op een zijvlak tikt, en staat als je op de bovenkant tikt');
  check(states.double, 'twee platen op elkaar worden één blok');
  check(states.upside && states.topSlab, 'op de bovenhelft van een zijvlak: trap ondersteboven en plaat bovenin');
  check(states.pane, 'glazen panelen groeien aan elkaar vast');
  check(states.door, 'een acaciahouten deur gaat open en dicht en blijft acacia');

  // ---------- tikken op huisblokken ----------
  const house = await run(async () => {
    const { B, BLOCKS } = await import('./js/blocks.js');
    const j = window.__jippecraft, w = j.world, x = 44, z = 52, y = w.surfaceY(x, z) + 1;
    w.set(x, y, z, B.FURNACE + 2); j.interact({ x, y, z, id: B.FURNACE + 2 });
    const lit = BLOCKS[w.get(x, y, z)].lit && (w.lightAt(x + 1, y, z) & 15) >= 11;
    w.set(x + 2, y, z, B.CHEST); j.interact({ x: x + 2, y, z, id: B.CHEST });
    const open = BLOCKS[w.get(x + 2, y, z)].open;
    w.set(x + 4, y, z, B.CAKE);
    for (let i = 0; i < 4; i++) j.interact({ x: x + 4, y, z, id: w.get(x + 4, y, z) });
    j.interact({ x: x + 6, y, z, id: B.JUKEBOX }); // speelt een liedje (geen fout)
    return { lit, open, eaten: w.get(x + 4, y, z) === 0 };
  });
  check(house.lit, 'een oven gaat aan als je erop tikt, en geeft dan licht');
  check(house.open, 'een kist gaat open als je erop tikt');
  check(house.eaten, 'na vier hapjes is de taart op');

  // ---------- natuurkunde ----------
  const water = await run(async () => {
    const { B, ITEM } = await import('./js/blocks.js');
    const j = window.__jippecraft, w = j.world;
    // een vlak stenen plateau, zodat het water niet van een helling af stroomt
    let y = 0;
    for (let x = 36; x <= 52; x++) for (let z = 53; z <= 59; z++) y = Math.max(y, w.surfaceY(x, z) + 2);
    for (let x = 36; x <= 52; x++) for (let z = 53; z <= 59; z++) { w.set(x, y, z, B.STONE); w.set(x, y + 1, z, 0); w.set(x, y + 2, z, 0); }
    j.hotbar[j.sel] = ITEM.BUCKET;
    j.use({ x: 40, y, z: 56, nx: 0, ny: 1, nz: 0, id: w.get(40, y, 56), dist: 3 });
    return { y: y + 1, source: w.get(40, y + 1, 56) === B.WATER };
  });
  check(water.source, 'een emmer zet een waterbron neer');
  check(await waitTrue(page, (y) => {
    const j = window.__jippecraft, w = j.world, f = (x) => w.get(x, y, 56);
    return f(41) >= 560 && f(47) === 566 && f(48) === 0;
  }, water.y, 20000), 'het water stroomt 7 blokken ver');
  await page.screenshot({ path: out + '/4f-water.png' });
  await run(async ({ y }) => {
    const { B, ITEM } = await import('./js/blocks.js');
    const j = window.__jippecraft;
    j.hotbar[j.sel] = ITEM.BUCKET;
    j.use({ x: 40, y, z: 56, nx: 0, ny: 1, nz: 0, id: B.WATER, dist: 3 });
  }, water);
  check(await waitTrue(page, (y) => { const w = window.__jippecraft.world; return [40, 41, 44, 47].every((x) => w.get(x, y, 56) === 0); }, water.y, 20000),
    'de emmer haalt de bron weer weg en het water trekt terug');
  const sandY = await run(async () => {
    const { B } = await import('./js/blocks.js');
    const w = window.__jippecraft.world, y = w.surfaceY(36, 36);
    w.set(36, y + 8, 36, B.SAND);
    return y + 1;
  });
  check(await waitTrue(page, (y) => window.__jippecraft.world.get(36, y, 36) === 10 && window.__jippecraft.world.get(36, y + 8, 36) === 0, sandY, 10000), 'zand valt naar beneden');
  const garden = await run(async () => {
    const { B, ITEM } = await import('./js/blocks.js');
    const j = window.__jippecraft, w = j.world, x = 58, z = 52, y = w.surfaceY(x, z);
    j.hotbar[j.sel] = ITEM.WHEAT_SEEDS;
    j.use({ x, y, z, nx: 0, ny: 1, nz: 0, id: w.get(x, y, z), dist: 3 });
    const planted = w.get(x, y, z) === B.FARMLAND && w.get(x, y + 1, z) === B.WHEAT;
    const random = Math.random; Math.random = () => 0;
    try { for (let i = 0; i < 4; i++) j.physics.randomTicks(null); } finally { Math.random = random; }
    return { planted, grown: w.get(x, y + 1, z) === B.WHEAT + 3 };
  });
  check(garden.planted && garden.grown, 'tarwezaadjes maken een akker met tarwe die groeit');
  const ladder = await run(async () => {
    const { B } = await import('./js/blocks.js');
    const j = window.__jippecraft, w = j.world, p = j.player, x = 62, z = 48, y = w.surfaceY(x, z) + 1;
    for (let i = 0; i < 4; i++) { w.set(x, y + i, z - 1, B.STONE); w.set(x, y + i, z, B.LADDER); }
    p.flying = false; p.setPos({ x: x + 0.5, y, z: z + 0.5 });
    return true;
  });
  check(ladder && await waitTrue(page, () => window.__jippecraft.player.climbing, null, 5000), 'op een ladder kun je klimmen');

  // ---------- oude onderbalk ----------
  check(await run(() => {
    const j = window.__jippecraft, s = j.makeSave();
    s.hotbar = [1, 6, 4, 9, 8, 45, 20, 213, 200]; // leeuw en huisje met de oude nummers
    j.applySave(s);
    return j.hotbar[7] === 60013 && j.hotbar[8] === 60000;
  }), 'een oude onderbalk (stempels en dieren met nummer 200+) werkt nog');
  await context.close();
}
