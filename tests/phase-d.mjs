// Fase D: drie keer aaien, zadel, volgen, rijden en veilig afstappen.
export async function testPhaseD({ newPage, check, out }) {
  const { context, page } = await newPage();
  const run = (fn, arg) => page.evaluate(fn, arg);
  await page.locator('.play-btn').tap();
  const tap = await run(async () => {
    const THREE = await import('./lib/three.module.min.js');
    const j = window.__jippecraft;
    j.freshWorld('flat', 7); j.animals.clear(); j.scene.rebuildAll(j.world);
    const y = j.world.surfaceY(48, 48) + 1;
    j.player.setPos({ x: 48.5, y, z: 48.5 }); j.player.yaw = 0; j.player.pitch = -0.2;
    const a = j.animals.spawn('lion', 48.5, y, 45.5, Math.PI);
    a.timer = 100; a.onGround = true;
    j.updateCamera(0); j.scene.camera.updateMatrixWorld();
    const v = new THREE.Vector3(a.x, a.y + 0.7, a.z).project(j.scene.camera);
    return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight };
  });
  const hearts = [];
  for (let i = 1; i <= 3; i++) {
    await page.touchscreen.tap(tap.x, tap.y);
    await page.waitForFunction((count) => {
      const a = window.__jippecraft.animals.list[0];
      return count === 3 ? a.tame : a.tameClicks === count;
    }, i, { timeout: 30000 });
    hearts.push(await run(() => Math.max(...window.__jippecraft.particles.hearts.filter((h) => h.alive).map((h) => h.sprite.scale.x))));
  }
  check(hearts[0] < hearts[1] && hearts[1] < hearts[2], 'hartjes groeien zichtbaar bij elke aai');
  check(await run(() => {
    const j = window.__jippecraft, a = j.animals.list[0];
    return a.tame && a.saddle.visible && j.particles.hearts.some((h) => h.alive);
  }), '8: drie echte aanrakingen in tien seconden geven de leeuw een zichtbaar zadel');
  await page.screenshot({ path: out + '/22-getemde-leeuw.png' });

  await page.touchscreen.tap(tap.x, tap.y);
  await page.waitForFunction(() => !!window.__jippecraft.player.riding, null, { timeout: 30000 });
  check(await run(() => {
    const j = window.__jippecraft, a = j.animals.list[0];
    return j.player.riding === a && a.state === 'bereden' && j.thirdPerson &&
      j.ui.flyBtn.getAttribute('aria-label') === 'Afstappen' && !j.player.flying;
  }), '9: tik op een vriendjes-leeuw om te rijden; camera en afstapknop veranderen');
  await page.screenshot({ path: out + '/23-rijden.png' });

  const ride = await run(async () => {
    const { Player } = await import('./js/player.js');
    const { B } = await import('./js/blocks.js');
    const j = window.__jippecraft, p = j.player, a = p.riding, w = j.world;
    j.playing = false;
    const start = { x: p.x, z: p.z }, y = p.y;
    const input = { move: { x: 0, y: 1 }, jump: false, down: false };
    for (let i = 0; i < 30; i++) { p.update(1 / 60, input, w, i / 60); j.syncRide(1 / 60); }
    const moved = Math.hypot(p.x - start.x, p.z - start.z), together = a.x === p.x && a.z === p.z && a.state === 'bereden';
    const runSpeed = Math.hypot(p.vx, p.vz);
    const jump = new Player(); jump.riding = a; jump.setPos({ x: 48.5, y, z: 48.5 }); jump.onGround = true;
    let peak = y;
    for (let i = 0; i < 70; i++) {
      jump.update(1 / 60, { move: { x: 0, y: 0 }, jump: i < 2, down: false }, w, i / 60 + 1);
      peak = Math.max(peak, jump.y);
    }
    for (let x = 46; x <= 50; x++) w.set(x, y, 47, B.FENCE);
    const fence = new Player(); fence.riding = a; fence.setPos({ x: 48.5, y, z: 50.5 }); fence.onGround = true;
    let farthest = fence.z;
    for (let i = 0; i < 110; i++) {
      fence.update(1 / 60, { move: { x: 0, y: 1 }, jump: i < 2, down: false }, w, i / 60 + 1);
      farthest = Math.min(farthest, fence.z);
    }
    for (let x = 46; x <= 50; x++) w.set(x, y, 47, 0);
    // Bouwen blijft tijdens het rijden beschikbaar.
    const bx = 54, bz = 49, by = w.surfaceY(bx, bz);
    const before = j.edits;
    j.placeBlock({ x: bx, y: by, z: bz, id: w.get(bx, by, bz), nx: 0, ny: 1, nz: 0 }, B.PLANKS);
    const building = j.edits === before + 1 && w.get(bx, by + 1, bz) === B.PLANKS;
    j.undo();
    return { moved, runSpeed, together, jump: peak - y, fenceCross: farthest < 46.5, building };
  });
  check(ride.moved > 2 && ride.runSpeed > 5.8 && ride.together, 'joystick laat berijder en leeuw samen rennen');
  check(ride.jump >= 2, 'bereden leeuw springt minstens twee blokken hoog');
  check(ride.fenceCross, 'bereden leeuw springt over een hek');
  check(ride.building, 'bouwen en terugzetten blijven mogelijk tijdens het rijden');
  const savedRide = await run(() => {
    const j = window.__jippecraft;
    j.saveNow();
    const s = j.storage.loadLocal('slot' + j.slot);
    return { riding: !!j.player.riding, stored: s.riding,
      apart: Math.hypot(s.player.x - j.player.x, s.player.z - j.player.z) };
  });
  check(savedRide.riding && savedRide.stored === false && savedRide.apart > 1,
    'automatisch bewaren onderbreekt de rit niet en slaat een veilige afstapplek op');

  await page.locator('.fly-btn[aria-label="Afstappen"]').tap();
  check(await run(() => {
    const j = window.__jippecraft, a = j.animals.list[0];
    return !j.player.riding && !a.riding && a.sleep > 0 && !j.thirdPerson &&
      j.ui.flyBtn.getAttribute('aria-label') === 'Vliegen';
  }), 'afstappen zet de speler naast de leeuw en herstelt de camera');
  await run(() => window.__jippecraft.saveNow());
  await page.reload();
  await page.waitForFunction(() => window.__jippecraft, null, { timeout: 30000 });
  check(await run(() => {
    const j = window.__jippecraft, a = j.animals.list[0];
    return a.tame && a.saddle.visible && !a.riding && !j.player.riding && j.makeSave().riding === false;
  }), 'getemde leeuw, zadel en afgestapte speler blijven goed na herladen');
  const follow = await run(() => {
    const j = window.__jippecraft, a = j.animals.list[0];
    j.player.setPos({ x: a.x + 10, y: a.y, z: a.z });
    a.happy = 0; a.sleep = 0; a.timer = 100; a.hunger = 0;
    const before = Math.hypot(a.x - j.player.x, a.z - j.player.z);
    for (let i = 0; i < 60; i++) j.animals.update(0.05, j.world, j.player);
    return { following: a.following, distance: Math.hypot(a.x - j.player.x, a.z - j.player.z), before, hunts: !!a.hunt };
  });
  check(follow.following && follow.distance < follow.before - 1 && !follow.hunts,
    'vriendjes-leeuw volgt Jippe binnen twintig blokken en jaagt niet meer');
  await context.close();
}
