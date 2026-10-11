// Fase 4E: mooier beeld en geluid (texturen, mipmaps, biomekleuren, water, wolken, brokjes en geluid).
import { waitTrue } from './helpers.mjs';

export async function testPhase4E({ newPage, check, out }) {
  // ---------- testpagina ?texturen ----------
  {
    const { context, page } = await newPage(null, '&texturen');
    const tex = await page.evaluate(async () => {
      const { TEXTURE_NAMES } = await import('./js/textures.js');
      return { want: TEXTURE_NAMES.length, have: document.querySelectorAll('.texview figure').length };
    });
    check(tex.have > 100 && tex.have === tex.want, `de testpagina ?texturen laat alle ${tex.want} tegels zien`);
    await page.screenshot({ path: out + '/4e-texturen.png' });
    await page.locator('.texview-close').tap();
    check(await page.locator('.texview').count() === 0, 'de testpagina gaat dicht met de knop');
    await context.close();
  }

  const { context, page } = await newPage();
  const run = (fn, arg) => page.evaluate(fn, arg);
  const frames = (n = 3) => run((k) => new Promise((r) => { const f = () => (--k <= 0 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  await page.locator('.play-btn').tap();

  // ---------- texture-array met mipmaps ----------
  const arr = await run(() => {
    const j = window.__jippecraft, t = j.scene.tiles;
    const mesh = [...j.scene.chunks.values()].find((e) => e.meshes.length)?.meshes[0];
    const tuv = mesh?.geometry.attributes.tuv, tint = mesh?.geometry.attributes.tint;
    let layersOk = !!tuv;
    for (let i = 0; tuv && i < tuv.count; i += 97) if (!Number.isInteger(tuv.getZ(i)) || tuv.getZ(i) < 0 || tuv.getZ(i) >= j.atlas.count) layersOk = false;
    return {
      array: t.isDataArrayTexture, mips: t.generateMipmaps && t.minFilter === 1004, depth: t.image.depth, count: j.atlas.count,
      layersOk, tint: !!tint && tint.itemSize === 3 && tint.normalized, noMap: !j.scene.materials.solid.map,
    };
  });
  check(arr.array && arr.mips && arr.depth === arr.count, 'alle tegels zitten in één texture-array met mipmaps (rustig in de verte)');
  check(arr.layersOk && arr.tint && arr.noMap, 'de wereld gebruikt per hoekpunt een tegelnummer en een landschapskleur');

  // ---------- kleur per biome ----------
  const tints = await run(async () => {
    const { TINTS } = await import('./js/engine/tint.js');
    const j = window.__jippecraft, w = j.world;
    const meshed = [...w.chunks.values()].filter((c) => c.meshed);
    const home = w.chunk(3, 3).tints;
    return {
      allTinted: meshed.length > 0 && meshed.every((c) => c.tints && c.tints.length === 16 * 16 * 3),
      homeGrass: home[0], plains: TINTS.plains[0], jungle: TINTS.jungle[0], savanna: TINTS.savanna[0],
    };
  });
  check(tints.allTinted, 'elke getekende chunk heeft kleuren voor gras, blad en water');
  check(tints.homeGrass === tints.plains && tints.jungle !== tints.savanna, 'het gras op de bouwplek heeft de kleur van de vlakte; jungle en savanne zijn anders');
  const blend = await run(async () => {
    const { chunkTints, TINTS } = await import('./js/engine/tint.js');
    // Grens tussen jungle (x < 8) en savanne: de kleur loopt geleidelijk over
    const t = chunkTints((x) => (x < 8 ? 'jungle' : 'savanna'), 0, 0);
    const g = (lx) => t[(lx + 16 * 5) * 3];
    return { left: g(0) === TINTS.jungle[0], right: g(15) === TINTS.savanna[0], mid: g(8) !== TINTS.jungle[0] && g(8) !== TINTS.savanna[0] };
  });
  check(blend.left && blend.right && blend.mid, 'tussen twee landschappen loopt de graskleur zacht in elkaar over');
  const jungle = await run(() => {
    const j = window.__jippecraft, gen = j.world.gen;
    for (let r = 64; r < 3000; r += 24) for (let a = 0; a < 32; a++) {
      const x = Math.round(48 + Math.cos(a / 32 * 6.283) * r), z = Math.round(48 + Math.sin(a / 32 * 6.283) * r);
      if (gen.raw(x, z).biome === 'jungle' && gen.raw(x + 24, z).biome === 'jungle' && gen.raw(x, z + 24).biome === 'jungle') return { x, z, h: gen.raw(x, z).h };
    }
    return null;
  });
  if (jungle) {
    await run(({ x, z, h }) => {
      const j = window.__jippecraft, p = j.player;
      j.world.ensureArea(x - 40, z - 40, x + 40, z + 40); j.scene.rebuildAll(j.world);
      p.flying = true; p.setPos({ x: x + 0.5, y: h + 8, z: z + 0.5 }); p.yaw = -Math.PI / 2; p.pitch = -0.35;
    }, jungle);
    await frames(4);
    check(await run(({ x, z }) => {
      const j = window.__jippecraft, c = j.world.chunk(Math.floor(x / 16), Math.floor(z / 16));
      return c.tints[((x & 15) + 16 * (z & 15)) * 3] !== 0x91bd59;
    }, jungle), 'in de jungle is het gras anders gekleurd dan op de vlakte');
    await page.screenshot({ path: out + '/4e-jungle.png' });
    await run(() => window.__jippecraft.goHome());
  }

  // ---------- water, onder water en wolken ----------
  const t0 = await run(() => window.__jippecraft.scene.light.uTime.value);
  await frames(3);
  check(await run((a) => window.__jippecraft.scene.light.uTime.value > a, t0), 'het water beweegt (de golven schuiven met de tijd)');
  // Een vijver van 5 x 5 en 4 diep naast de bouwplek
  const water = await run(() => {
    const j = window.__jippecraft, w = j.world, top = w.surfaceY(56, 56);
    for (let x = 54; x <= 58; x++) for (let z = 54; z <= 58; z++) for (let y = top - 3; y <= top; y++) w.set(x, y, z, 11);
    return { x: 56, z: 56, y: top - 3 };
  });
  if (water) {
    await run(({ x, z, y }) => { const p = window.__jippecraft.player; p.flying = true; p.setPos({ x: x + 0.5, y: y + 0.2, z: z + 0.5 }); }, water);
    check(await waitTrue(page, () => window.__jippecraft.underwater === true, null, 5000), 'onder water weet het spel dat je onder water bent');
    const under = await run(() => {
      const j = window.__jippecraft;
      return { tint: !document.querySelector('.underwater').hidden, fog: j.scene.scene.fog.far < 30, muffled: j.sounds.muffled };
    });
    check(under.tint && under.fog && under.muffled, 'onder water: blauwe tint, blauwe mist dichtbij en gedempt geluid');
    await page.screenshot({ path: out + '/4e-onderwater.png' });
    await run(() => window.__jippecraft.goHome());
    // (naar huis bouwt de wereld om je heen opnieuw op; dat duurt op de trage testcomputer soms even)
    check(await waitTrue(page, () => !window.__jippecraft.underwater && document.querySelector('.underwater').hidden, null, 15000), 'boven water is alles weer gewoon');
  }
  const clouds = await run(() => {
    const c = window.__jippecraft.scene.clouds;
    return { flat: c.isMesh && !c.isInstancedMesh && c.geometry.type === 'PlaneGeometry', high: c.position.y > 128, visible: c.visible };
  });
  check(clouds.flat && clouds.high && clouds.visible, 'de wolken zijn één platte laag blokwolken hoog in de lucht');

  // ---------- brokjes, voetstappen, omgevingsgeluid en nachtmuziek ----------
  const crumbs = await run(() => {
    const j = window.__jippecraft, w = j.world, x = 50, z = 46, y = w.surfaceY(x, z) + 1;
    w.set(x, y, z, 6); // planken
    j.particles.list.length = 0;
    j.breakBlock({ x, y, z, id: 6 });
    const list = j.particles.list;
    return { n: list.length, tiled: list.filter((p) => p.tile === j.atlas.index.planks).length };
  });
  check(crumbs.n > 0 && crumbs.tiled === crumbs.n, 'slopen geeft brokjes met de echte textuur van het blok');
  const steps = await run(() => {
    const j = window.__jippecraft, p = j.player, heard = [];
    const real = j.sounds.step;
    j.sounds.step = (kind) => heard.push(kind);
    p.flying = false; p.onGround = true; p.inWater = false; p.vx = 4; p.vz = 0;
    for (let i = 0; i < 20; i++) j.footsteps(0.1);
    j.sounds.step = real; p.vx = 0;
    return { heard, real: typeof real };
  });
  check(steps.real === 'function' && steps.heard.length >= 3 && steps.heard.every((k) => k === 'grass'),
    `lopen op gras geeft voetstappen van gras (${steps.heard.length}×)`);
  await run(() => window.__jippecraft.daynight.set(0.8));
  check(await waitTrue(page, () => window.__jippecraft.music.style === 'nacht', null, 15000), 's nachts klinkt rustige nachtmuziek');
  await run(() => window.__jippecraft.daynight.set(0.2));
  check(await waitTrue(page, () => window.__jippecraft.music.style !== 'nacht', null, 5000), 'overdag weer de muziek van het landschap');
  const cave = await run(async () => {
    const j = window.__jippecraft, w = j.world, p = j.player, y = w.surfaceY(44, 44) - 12;
    for (let x = 42; x <= 46; x++) for (let z = 42; z <= 46; z++) for (let yy = y - 1; yy <= y + 3; yy++) w.set(x, yy, z, 3);
    for (let x = 43; x <= 45; x++) for (let z = 43; z <= 45; z++) for (let yy = y; yy <= y + 2; yy++) w.set(x, yy, z, 0);
    p.flying = true; p.setPos({ x: 44.5, y, z: 44.5 });
    j.nextAmbient = 0;
    await new Promise((r) => setTimeout(r, 400));
    return j.weather.context.cave;
  });
  check(cave, 'in een grot hoor je druppels in plaats van vogels');
  await context.close();
}
