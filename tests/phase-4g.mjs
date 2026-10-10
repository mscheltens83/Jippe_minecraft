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
