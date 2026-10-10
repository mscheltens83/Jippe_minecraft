// Fase 4F: nieuwe blokken, standen bij het plaatsen en natuurkunde (deel 1); kist met families,
// blok kopiëren, de hand, sprinten, sluipen, dubbeltik vliegen en duiken (deel 2).
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
  // families staan als één vakje; ingedrukt houden toont de soorten
  check(await page.locator('.pal-item[aria-label="Berken trap"]').count() === 0, 'de berken trap staat niet als los vakje in de kist');
  await page.locator('.pal-item[aria-label="Trap"]').dispatchEvent('pointerdown');
  await page.waitForTimeout(700);
  await page.locator('.pal-item[aria-label="Trap"]').dispatchEvent('pointerup');
  check(await page.locator('.pal-variant').count() === 11, 'ingedrukt houden op de trap toont 11 soorten');
  check(await run(() => {
    const r = document.querySelector('.pal-variants').getBoundingClientRect();
    return r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
  }), 'de rij met soorten past in beeld');
  await page.screenshot({ path: out + '/4f-soorten.png' });
  await page.locator('.pal-variant[aria-label="Berken trap"]').tap();
  check(await run(async () => {
    const { stairsId } = await import('./js/blocks.js');
    const j = window.__jippecraft;
    return j.hotbar[j.sel] === stairsId(1, 0);
  }), 'een berken trap kiezen uit de kist werkt');
  check(await run(async () => {
    const { PALETTE, BLOCKS, isSpecial } = await import('./js/blocks.js');
    return PALETTE.length > 280 && document.querySelectorAll('.pal-item').length < PALETTE.length && document.querySelectorAll('.pal-item.family').length >= 8 && PALETTE.every((id) => isSpecial(id) || BLOCKS[id]) && PALETTE.every((id) => window.__jippecraft.ui.icons[id]);
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

export async function testPhase4F2({ newPage, check, out }) {
  const { context, page } = await newPage();
  const run = (fn, arg) => page.evaluate(fn, arg);
  await page.locator('.play-btn').tap();

  // Een vlak plateau om op te testen
  const spot = await run(async () => {
    const { B } = await import('./js/blocks.js');
    const j = window.__jippecraft, w = j.world, p = j.player, x0 = Math.floor(p.x), z0 = Math.floor(p.z);
    let y = 0;
    for (let x = x0 - 3; x <= x0 + 3; x++) for (let z = z0 - 6; z <= z0 + 3; z++) y = Math.max(y, w.surfaceY(x, z) + 1);
    for (let x = x0 - 3; x <= x0 + 3; x++) for (let z = z0 - 6; z <= z0 + 3; z++) {
      w.set(x, y, z, B.STONE);
      for (let dy = 1; dy <= 4; dy++) w.set(x, y + dy, z, 0);
    }
    return { x: x0, y: y + 1, z: z0 };
  });

  // ---------- blok kopiëren: kistknop vasthouden en op een blok tikken ----------
  await run(async ({ x, y, z }) => {
    const { B } = await import('./js/blocks.js');
    const j = window.__jippecraft, p = j.player;
    j.world.set(x, y + 1, z - 3, B.SPRUCE_PLANKS);
    p.flying = true; p.vx = p.vy = p.vz = 0;
    p.setPos({ x: x + 0.5, y, z: z + 0.5 }); p.yaw = 0; p.pitch = 0;
    j.sel = 0; j.hotbar[0] = B.GRASS; j.refreshUI();
  }, spot);
  await page.waitForTimeout(300);
  await page.locator('.slot.chest').dispatchEvent('pointerdown');
  await waitTrue(page, () => document.querySelector('.slot.chest').classList.contains('picking'), null, 5000);
  const picked = await run(async () => {
    const { B } = await import('./js/blocks.js');
    const j = window.__jippecraft;
    const holding = document.querySelector('.slot.chest').classList.contains('picking');
    j.act({ x: innerWidth / 2, y: innerHeight / 2 });
    return holding && j.hotbar[j.sel] === B.SPRUCE_PLANKS;
  });
  await page.locator('.slot.chest').dispatchEvent('pointerup');
  check(picked, 'kistknop vasthouden en op een blok tikken: dat blok komt in je hand');
  check(await run(() => !window.__jippecraft.ui.paletteOpen && !window.__jippecraft.ui.picking), 'na het kopiëren gaat de kist niet open');
  check(await run(async ({ x, y, z }) => {
    const m = await import('./js/blocks.js');
    const j = window.__jippecraft;
    j.world.set(x, y + 1, z - 3, m.stairsId(4, 2, true)); // een omgekeerde acacia trap
    j.pickBlock({ x, y: y + 1, z: z - 3, id: j.world.get(x, y + 1, z - 3) });
    const stairs = j.hotbar[j.sel] === m.stairsId(4, 0);
    j.world.set(x, y + 1, z - 3, m.B.WHEAT + 2);
    j.pickBlock({ x, y: y + 1, z: z - 3, id: m.B.WHEAT + 2 });
    return stairs && j.hotbar[j.sel] === m.ITEM.WHEAT_SEEDS;
  }, spot), 'kopiëren geeft de gewone soort (trap rechtop, zaadjes van tarwe)');

  // ---------- de hand ----------
  await page.waitForTimeout(300);
  check(await run(() => { const h = window.__jippecraft.hand; return h.group.visible && h.holder.children.length === 1; }), 'rechtsonder is je hand met het blok te zien');
  await page.screenshot({ path: out + '/4f-hand.png' });
  await run(async () => { const { ITEM } = await import('./js/blocks.js'); window.__jippecraft.pick(ITEM.BUCKET); });
  const plane = await waitTrue(page, () => window.__jippecraft.hand.holder.children[0]?.geometry.type === 'PlaneGeometry', null, 5000);
  await run(() => window.__jippecraft.toggleCamera());
  const hidden = await waitTrue(page, () => !window.__jippecraft.hand.group.visible, null, 5000);
  await run(() => window.__jippecraft.toggleCamera());
  check(plane && hidden, 'een emmer houd je als plaatje vast, en van achteren zie je de hand niet');

  // ---------- dubbeltik vliegen ----------
  check(await run(() => {
    const j = window.__jippecraft, p = j.player;
    p.flying = false;
    j.jumpTap(); j.jumpTap();
    const on = p.flying;
    j.lastJumpTap = 0; j.jumpTap();
    const once = p.flying;
    j.lastJumpTap = 0; j.jumpTap(); j.jumpTap();
    return on && once && !p.flying;
  }), 'twee keer snel op springen tikken zet vliegen aan en uit');

  // ---------- sprinten ----------
  await run(({ x, y, z }) => {
    const j = window.__jippecraft, p = j.player;
    p.flying = false; p.setPos({ x: x + 0.5, y, z: z + 2.5 }); p.yaw = 0;
    j.input.stick.x = 0; j.input.stick.y = 1;
  }, spot);
  check(await waitTrue(page, () => window.__jippecraft.player.sprinting && window.__jippecraft.scene.camera.fov > 76, null, 15000),
    'de stuurknop een seconde helemaal naar voren: sprinten met een bredere kijkhoek');
  await run(() => { const j = window.__jippecraft; j.input.stick.x = 0; j.input.stick.y = 0; });
  check(await waitTrue(page, () => !window.__jippecraft.player.sprinting && window.__jippecraft.scene.camera.fov < 73, null, 8000), 'loslaten: weer gewoon lopen');

  // ---------- sluipen op een rand van 10 hoog ----------
  check(await run(() => !document.querySelector('.down-btn').hidden && document.querySelector('.down-btn').getAttribute('aria-label') === 'Sluipen'),
    'de omlaag-knop is er ook als je loopt (om te sluipen)');
  const tower = await run(async ({ x, y, z }) => {
    const { B } = await import('./js/blocks.js');
    const j = window.__jippecraft, w = j.world, p = j.player, tx = x + 1, tz = z - 5;
    for (let dy = 0; dy < 10; dy++) w.set(tx, y + dy, tz, B.STONE);
    for (let dy = 10; dy < 14; dy++) for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) w.set(tx + dx, y + dy, tz + dz, 0);
    for (let dy = 0; dy < 10; dy++) for (let dx = -3; dx <= -1; dx++) for (let dz = -1; dz <= 1; dz++) w.set(tx + dx, y + dy, tz + dz, 0); // vrij om te vallen
    p.flying = false; p.vx = p.vy = p.vz = 0;
    p.setPos({ x: tx + 0.5, y: y + 10, z: tz + 0.5 }); p.yaw = Math.PI / 2; // kijk naar -x
    j.input.downButton = true;
    j.input.stick.x = 0; j.input.stick.y = 1;
    return { y: y + 10, x: tx };
  }, spot);
  // lopen tot aan de rand (het testscherm is traag), en dan nog even doorduwen
  const atEdge = await waitTrue(page, (tx) => window.__jippecraft.player.x < tx + 0.1, tower.x, 20000);
  await page.waitForTimeout(2000);
  const edge = await run(() => {
    const j = window.__jippecraft, p = j.player;
    const r = { y: p.y, sneaking: p.sneaking };
    j.input.downButton = false; j.input.stick.y = 0;
    return r;
  });
  check(atEdge && edge.sneaking && Math.abs(edge.y - tower.y) < 0.01, 'sluipen houdt je op een rand van 10 hoog');
  await run(() => { window.__jippecraft.input.stick.y = 1; });
  const fell = await waitTrue(page, (y) => window.__jippecraft.player.y < y - 1, tower.y, 15000);
  await run(() => { window.__jippecraft.input.stick.y = 0; });
  check(fell, 'zonder sluipen loop je er wel af');

  // ---------- duiken ----------
  check(await run(async ({ x, y, z }) => {
    const { B } = await import('./js/blocks.js');
    const j = window.__jippecraft, w = j.world, p = j.player;
    j.physics.enabled = false;
    for (let dy = 0; dy < 6; dy++) w.set(x, y + dy, z, B.WATER);
    p.flying = false; p.vx = p.vy = p.vz = 0; p.setPos({ x: x + 0.5, y: y + 4, z: z + 0.5 });
    j.input.downButton = true;
    let dive = false;
    for (let i = 0; i < 40 && !dive; i++) { await new Promise((r) => setTimeout(r, 100)); dive = p.inWater && p.vy < -2.6; }
    j.input.downButton = false;
    j.physics.enabled = true;
    return dive;
  }, spot), 'omlaag houden in water: duiken');
  await context.close();
}
