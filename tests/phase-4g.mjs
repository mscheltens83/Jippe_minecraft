// Fase 4G (deel 1): Minecraft-dieren, fokken, temmen, volgen, zitten en rijden.
import { waitTrue } from './helpers.mjs';

export async function testPhase4G({ newPage, check, out }) {
  const { context, page } = await newPage();
  const run = (fn, arg) => page.evaluate(fn, arg);
  await page.locator('.play-btn').tap();

  // Een vlak grasveld met een vijver om op te testen
  const spot = await run(async () => {
    const { B } = await import('./js/blocks.js');
    const j = window.__jippecraft, w = j.world, p = j.player, x0 = Math.floor(p.x) - 8, z0 = Math.floor(p.z) - 10;
    let y = 0;
    for (let x = x0 - 2; x < x0 + 18; x++) for (let z = z0 - 2; z < z0 + 14; z++) y = Math.max(y, w.surfaceY(x, z));
    for (let x = x0 - 2; x < x0 + 18; x++) for (let z = z0 - 2; z < z0 + 14; z++) {
      w.set(x, y, z, B.GRASS);
      for (let dy = 1; dy < 6; dy++) w.set(x, y + dy, z, 0);
    }
    for (let x = x0 + 10; x < x0 + 16; x++) for (let z = z0; z < z0 + 6; z++) for (let dy = 0; dy < 3; dy++) w.set(x, y - dy, z, B.WATER);
    j.physics.enabled = false; // het water blijft zo staan
    j.animals.clear();
    return { x0, y, z0 };
  });

  // ---------- alle nieuwe dieren ----------
  const zoo = await run(async ({ x0, y, z0 }) => {
    const { SPECIES } = await import('./js/animals.js');
    const j = window.__jippecraft, types = ['cow', 'horse', 'dog', 'cat', 'rabbit', 'fox', 'bee', 'goat', 'llama'];
    const made = types.map((t, i) => j.animals.spawn(t, x0 + 1.5 + (i % 5) * 1.8, y + 1, z0 + 1.5 + Math.floor(i / 5) * 2.5));
    const horses = [0, 1, 2, 3, 4, 5].map((v) => j.animals.spawn('horse', x0 + 1.5 + v, y + 1, z0 + 8.5, 0, v));
    const colors = new Set(horses.map((h) => h.model.body.geometry.attributes.color.array.slice(0, 3).join()));
    const ok = made.every(Boolean) && types.every((t) => SPECIES[t] && SPECIES[t].naam);
    for (const h of horses) j.animals.remove(h);
    return { ok, colors: colors.size };
  }, spot);
  check(zoo.ok, 'koe, paard, hond, kat, konijn, vos, bij, geit en lama staan in de wereld');
  check(zoo.colors === 6, 'paarden zijn er in 6 kleuren');
  await page.waitForTimeout(500);
  await page.screenshot({ path: out + '/4g-dieren.png' });

  // ---------- waterdieren ----------
  const sea = await run(async ({ x0, y, z0 }) => {
    const { ITEM } = await import('./js/blocks.js');
    const j = window.__jippecraft, before = j.animals.list.length;
    j.hotbar[j.sel] = ITEM.FISH;
    j.placeAnimal({ x: x0 + 3, y, z: z0 + 11, nx: 0, ny: 1, nz: 0, id: j.world.get(x0 + 3, y, z0 + 11) }, 'fish');
    const land = j.animals.list.length === before;
    const fish = ['fish', 'dolphin', 'squid'].map((t, i) => j.animals.spawn(t, x0 + 11.5 + i * 1.5, y - 1.5, z0 + 2.5));
    return { land, ids: fish.map((f) => j.animals.list.indexOf(f)) };
  }, spot);
  check(sea.land, 'een vis zet je niet op het droge');
  check(await waitTrue(page, ({ ids, y }) => {
    const list = window.__jippecraft.animals.list;
    return ids.every((i) => list[i] && list[i].inWater && list[i].y < y + 1 && list[i].y > y - 3);
  }, { ids: sea.ids, y: spot.y }, 8000), 'vis, dolfijn en inktvis zwemmen onder water en blijven in het water');

  // ---------- fokken ----------
  const fed = await run(async ({ x0, y, z0 }) => {
    const { ITEM } = await import('./js/blocks.js');
    const j = window.__jippecraft;
    const a = j.animals.spawn('cow', x0 + 2.5, y + 1, z0 + 11.5), b = j.animals.spawn('cow', x0 + 6.5, y + 1, z0 + 11.5);
    j.hotbar[j.sel] = ITEM.WHEAT_SEEDS;
    j.feedAnimal(a); j.feedAnimal(b);
    return { love: a.love > 0 && b.love > 0, count: j.animals.list.length };
  }, spot);
  check(fed.love, 'twee koeien met tarwezaadjes worden verliefd');
  check(await waitTrue(page, (n) => {
    const j = window.__jippecraft;
    return j.animals.list.length === n + 1 && j.animals.list.some((a) => a.type === 'cow' && a.baby > 0 && a.group.scale.x < 0.6);
  }, fed.count, 20000), 'ze krijgen een kalfje, dat kleiner is');
  check(await run(() => {
    const j = window.__jippecraft, calf = j.animals.list.find((a) => a.baby > 0);
    calf.baby = 0.5;
    j.animals.updateLove(1);
    return calf.baby === 0 && calf.group.scale.x === 1;
  }), 'het kalfje groeit op tot een koe');

  // ---------- temmen en rijden ----------
  const ride = await run(async ({ x0, y, z0 }) => {
    const j = window.__jippecraft, p = j.player;
    p.flying = false; p.setPos({ x: x0 + 8.5, y: y + 1, z: z0 + 12.5 });
    const h = j.animals.spawn('horse', x0 + 8.5, y + 1, z0 + 9.5, 0, 1);
    for (let i = 0; i < 3; i++) j.petAnimal(h);
    const tame = h.tame && h.saddle.visible;
    j.petAnimal(h);
    const riding = p.riding === h;
    j.dismount();
    return { tame, riding };
  }, spot);
  check(ride.tame, 'een paard is tam na drie keer aaien, en krijgt een zadel');
  check(ride.riding, 'op een tam paard kun je rijden');
  check(await run(async () => {
    const { SPECIES } = await import('./js/animals.js');
    return SPECIES.horse.rijsnelheid > 1 && SPECIES.elephant.rijsnelheid < 1 && ['camel', 'elephant', 'cheetah', 'tiger'].every((t) => SPECIES[t].rijdbaar);
  }), 'paard is snel, olifant langzaam; ook kameel, olifant, cheetah en tijger kun je berijden');
  const dog = await run(async ({ x0, y, z0 }) => {
    const j = window.__jippecraft;
    const d = j.animals.spawn('dog', x0 + 1.5, y + 1, z0 + 6.5);
    for (let i = 0; i < 3; i++) j.petAnimal(d);
    const tame = d.tame && d.saddle.visible;
    j.petAnimal(d);
    return { tame, sits: d.sitting, i: j.animals.list.indexOf(d) };
  }, spot);
  check(dog.tame && dog.sits, 'een tamme hond krijgt een halsband en gaat zitten als je erop tikt');

  // ---------- bewaren ----------
  check(await run(({ i }) => {
    const j = window.__jippecraft, s = j.animals.serialize();
    const horse = j.animals.list.find((a) => a.type === 'horse');
    j.animals.load(s);
    const back = j.animals.list.find((a) => a.type === 'horse');
    return j.animals.list[i].sitting && j.animals.list[i].tame && back.variant === horse.variant;
  }, dog), 'kleur, tam en zitten blijven bewaard');
  check(await run(async () => {
    const { Animal } = await import('./js/animals/core.js');
    const fox = new Animal('fox', 0, 60, 0, 0);
    Animal.night = false; fox.onGround = true; fox.walking = false;
    const random = Math.random; Math.random = () => 0;
    try { fox.choose(); } finally { Math.random = random; }
    return fox.sleep > 20;
  }), 'een vos slaapt overdag');
  await context.close();
}

// Fase 4G (deel 2): dorpen met dorpelingen, katten en een ijzergolem; dorpshuis en waterput als stempel.
export async function testPhase4G2({ newPage, check, out }) {
  const { context, page } = await newPage();
  const run = (fn, arg) => page.evaluate(fn, arg);
  await page.locator('.play-btn').tap();
  const v = await run(() => {
    const j = window.__jippecraft;
    j.freshWorld('world', 777);
    const s = j.world.gen.home.find((h) => h.kind === 'village');
    j.player.flying = true;
    j.player.setPos({ x: s.x + 0.5, y: s.base + 6, z: s.z + 12.5 });
    j.player.yaw = 0; j.player.pitch = -0.5;
    return { x: s.x, z: s.z, base: s.base, beds: s.beds.length };
  });
  check(await waitTrue(page, (n) => {
    const list = window.__jippecraft.animals.list.filter((a) => a.village && Math.hypot(a.x - a.village.x, a.z - a.village.z) < 25);
    return list.filter((a) => a.type === 'villager' && a.home).length === n && list.filter((a) => a.type === 'cat').length === 2 && list.filter((a) => a.type === 'golem').length === 1;
  }, v.beds, 30000), 'in het dorp wonen dorpelingen (één per huis), twee katten en een ijzergolem');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: out + '/4g-dorp.png' });
  check(await run(() => new Set(window.__jippecraft.animals.list.filter((a) => a.type === 'villager').map((a) => a.variant)).size >= 2),
    'dorpelingen hebben verschillende beroepen (kleren)');

  // 's Nachts naar bed, 's ochtends weer naar buiten
  await run(() => {
    const j = window.__jippecraft;
    j.daynight.set(0.8);
    for (const a of j.animals.list) if (a.type === 'villager') a.bedWait = 30; // niet eerst helemaal naar huis lopen
  });
  check(await waitTrue(page, () => {
    const j = window.__jippecraft;
    return j.animals.list.filter((a) => a.type === 'villager').every((a) => a.inBed && j.world.get(Math.floor(a.x), a.home.y, Math.floor(a.z)) >= 131);
  }, null, 30000), "'s nachts liggen de dorpelingen in hun bed");
  await run(() => window.__jippecraft.daynight.set(0.3));
  check(await waitTrue(page, () => window.__jippecraft.animals.list.filter((a) => a.type === 'villager').every((a) => !a.inBed), null, 30000),
    "'s ochtends gaan ze weer naar buiten");

  // De ijzergolem geeft je een bloem
  check(await run(async () => {
    const { B } = await import('./js/blocks.js');
    const j = window.__jippecraft, golem = j.animals.list.find((a) => a.type === 'golem');
    j.petAnimal(golem);
    return j.hotbar.includes(B.FLOWER_RED);
  }), 'de ijzergolem geeft je een bloem');

  // Bewaren: wie waar woont blijft bewaard
  check(await run(() => {
    const j = window.__jippecraft, s = j.animals.serialize();
    j.animals.load(s);
    const vs = j.animals.list.filter((a) => a.type === 'villager');
    return vs.length > 0 && vs.every((a) => a.home && a.village);
  }), 'huis en dorp van de dorpelingen blijven bewaard');

  // Stempels: dorpshuis en waterput
  const stamped = await run(async ({ x, z, base }) => {
    const { ITEM, BLOCKS, B } = await import('./js/blocks.js');
    const j = window.__jippecraft, w = j.world, p = j.player;
    const sx = x + 40, sz = z;
    const y = w.surfaceY(sx, sz);
    p.flying = true; p.setPos({ x: sx + 0.5, y: y + 2, z: sz + 6.5 }); p.yaw = 0;
    j.hotbar[j.sel] = ITEM.VILLAGE_HOUSE;
    j.use({ x: sx, y, z: sz, nx: 0, ny: 1, nz: 0, id: w.get(sx, y, sz), dist: 3 });
    let door = false, bed = false;
    for (let dx = -6; dx <= 6; dx++) for (let dz = -10; dz <= 6; dz++) for (let dy = 0; dy <= 3; dy++) {
      const b = BLOCKS[w.get(sx + dx, y + dy, sz + dz)];
      if (b?.shape === 'door') door = true;
      if (b?.bed) bed = true;
    }
    j.hotbar[j.sel] = ITEM.WELL;
    const wx = sx + 12, wy = w.surfaceY(wx, sz);
    j.use({ x: wx, y: wy, z: sz, nx: 0, ny: 1, nz: 0, id: w.get(wx, wy, sz), dist: 3 });
    let water = false;
    for (let dx = -4; dx <= 4; dx++) for (let dz = -8; dz <= 4; dz++) if (w.get(wx + dx, wy, sz + dz) === B.WATER || w.get(wx + dx, wy + 1, sz + dz) === B.WATER) water = true;
    return { door, bed, water };
  }, v);
  check(stamped.door && stamped.bed, 'de stempel Dorpshuis zet een huisje met deur en bed neer');
  check(stamped.water, 'de stempel Waterput zet een put met water neer');
  await context.close();
}
