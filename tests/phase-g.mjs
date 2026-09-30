// Fase G: weer, muziek, schatkist en lopende sneeuwpop.
export async function testPhaseG({ newPage, check, out }) {
  const { context, page } = await newPage();
  const run = (fn, arg) => page.evaluate(fn, arg);
  const world = await run(() => {
    const j = window.__jippecraft, samples = {};
    for (const type of ['jungle', 'desert', 'tundra', 'savanna', 'island']) {
      j.freshWorld(type, 37);
      j.weather.update(.05, j.world, j.player, 1.5, true);
      samples[type] = { music: j.music.style, snow: j.weather.snow.visible,
        leaves: j.weather.leaves.visible, count: j.weather.snow.count };
    }
    j.freshWorld('tundra', 37);
    j.weather.update(.05, j.world, j.player, .75, true);
    const lowCount = j.weather.snow.count;
    const sounds = [];
    const old = j.weather.sounds;
    j.weather.sounds = { ok: () => true, tone: (...args) => sounds.push(args), hiss: (...args) => sounds.push(args) };
    j.weather.ambience = 'vogels'; j.weather.ambientTimer = 0; j.weather.background(.1);
    const audible = sounds.length;
    j.weather.sounds = { ok: () => false, tone: (...args) => sounds.push(args), hiss: (...args) => sounds.push(args) };
    j.weather.ambientTimer = 0; j.weather.background(.1);
    j.weather.sounds = old;
    return { samples, lowCount, audible, muted: sounds.length === audible };
  });
  check(world.samples.jungle.music === 'jungle' && world.samples.jungle.leaves &&
    world.samples.desert.music === 'woestijn' && world.samples.tundra.music === 'toendra' &&
    world.samples.savanna.music === 'savanne' && world.samples.island.music === 'island',
  'elk landschap kiest zijn eigen muziek en de jungle toont dwarrelende blaadjes');
  check(world.samples.tundra.snow && world.samples.tundra.count === 150 && world.lowCount === 75,
    'toendra heeft 150 sneeuwvlokken, gehalveerd bij lage beeldkwaliteit');
  check(world.audible >= 2 && world.muted, 'vogels zingen zacht en omgevingsgeluid is stil bij dempen');

  await page.locator('.play-btn').tap();
  const treasure = await run(async () => {
    const THREE = await import('./lib/three.module.min.js');
    const { B } = await import('./js/blocks.js');
    const j = window.__jippecraft;
    j.freshWorld('flat', 7); j.animals.clear();
    const y = j.world.surfaceY(48, 45) + 1;
    j.world.set(48, y, 45, B.TREASURE); j.scene.rebuildAll(j.world);
    j.player.setPos({ x: 48.5, y, z: 48.5 }); j.player.yaw = 0; j.player.pitch = -.17;
    j.updateCamera(0); j.scene.camera.updateMatrixWorld();
    const v = new THREE.Vector3(48.5, y + .5, 45.5).project(j.scene.camera);
    return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight,
      bx: 48, by: y, bz: 45 };
  });
  await page.touchscreen.tap(treasure.x, treasure.y);
  await page.waitForFunction(({ bx, by, bz }) => window.__jippecraft.world.get(bx, by, bz) === 78,
    treasure, { timeout: 30000 });
  check(await run(({ bx, by, bz }) => {
    const j = window.__jippecraft;
    return j.world.get(bx, by, bz) === 78 && j.particles.list.length > 0;
  }, treasure), 'een echte tik opent de schatkist met glitters en confetti');
  await page.screenshot({ path: out + '/27-schatkist-open.png' });
  check(await run(({ bx, by, bz }) => {
    const j = window.__jippecraft; j.undo(); return j.world.get(bx, by, bz) === 77;
  }, treasure), 'terugzetten sluit de schatkist weer');
  await run(({ bx, by, bz }) => {
    const j = window.__jippecraft;
    j.openTreasure({ x: bx, y: by, z: bz }); j.saveNow();
  }, treasure);
  await page.reload();
  await page.waitForFunction(() => window.__jippecraft, null, { timeout: 30000 });
  check(await run(({ bx, by, bz }) => window.__jippecraft.world.get(bx, by, bz) === 78, treasure),
    'geopende schatkist blijft open na herladen');

  await page.locator('.play-btn').tap();
  const snow = await run(() => {
    const j = window.__jippecraft, { world: w } = j;
    j.freshWorld('tundra', 37); j.animals.clear();
    const x = 48, z = 45, y = w.surfaceY(x, z) + 1;
    w.set(x, y, z, 12); w.set(x, y + 1, z, 12);
    j.placeBlock({ x, y: y + 1, z, id: 12, nx: 0, ny: 1, nz: 0 }, 17);
    const born = j.snowmen.list.length === 1 && [y, y + 1, y + 2].every((v) => w.get(x, v, z) === 0);
    const s = j.snowmen.list[0];
    if (s) { s.walking = true; s.timer = 100; s.targetYaw = s.yaw; }
    const start = s ? { x: s.x, z: s.z } : null;
    for (let i = 0; i < 30; i++) j.snowmen.update(.05, w);
    const walking = s && Math.hypot(s.x - start.x, s.z - start.z) > .2;
    j.undo();
    const undone = j.snowmen.list.length === 0 && w.get(x, y, z) === 12 &&
      w.get(x, y + 1, z) === 12 && w.get(x, y + 2, z) === 0;
    j.placeBlock({ x, y: y + 1, z, id: 12, nx: 0, ny: 1, nz: 0 }, 17);
    j.saveNow();
    j.player.setPos({ x: 48.5, y: w.surfaceY(48, 48) + 1, z: 48.5 });
    j.player.yaw = 0; j.player.pitch = -.15;
    j.scene.rebuildAll(w); j.updateCamera(0);
    return { born, walking, undone, saved: j.makeSave().snowmen.length };
  });
  check(snow.born && snow.walking, 'twee sneeuwblokken en een pompoen worden een lopende sneeuwpop');
  check(snow.undone && snow.saved === 1, 'terugzetten herstelt de sneeuwblokken en een nieuwe sneeuwpop wordt bewaard');
  await page.waitForTimeout(400);
  await page.screenshot({ path: out + '/28-lopende-sneeuwpop.png' });
  await page.reload();
  await page.waitForFunction(() => window.__jippecraft, null, { timeout: 30000 });
  check(await run(() => window.__jippecraft.snowmen.list.length === 1), 'sneeuwpop blijft na herladen rondlopen');
  await context.close();
}
