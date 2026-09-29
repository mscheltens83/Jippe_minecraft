// Fase C: echte aanraakknoppen en gerichte simulaties voor roofdieren en stallen.
export async function testPhaseC({ newPage, check, out }) {
  const { context, page } = await newPage();
  const run = (fn, arg) => page.evaluate(fn, arg);

  const result = await run(async () => {
    const { World } = await import('./js/world.js');
    const { B, BLOCKS, blockBoxes, gateId } = await import('./js/blocks.js');
    const { Player } = await import('./js/player.js');
    const { Animals } = await import('./js/animals.js');
    const { Scene } = await import('./lib/three.module.min.js');
    const w = new World(); w.generate('flat', 7);
    const y = w.surfaceY(48, 48) + 1;
    for (let x = 39; x <= 57; x++) for (let z = 39; z <= 57; z++) for (let h = y; h < y + 4; h++) w.set(x, h, z, 0);
    const player = new Player();
    w.set(48, y, 48, B.FENCE);
    const fenceHigh = player.collides(w, 48.5, y + 1, 48.5);
    const fenceJoined = blockBoxes(w, 48, y, 48).length === 1;
    w.set(49, y, 48, B.FENCE);
    const armsJoined = blockBoxes(w, 48, y, 48).length === 3;
    w.set(48, y, 48, gateId(0, false));
    const gateHigh = player.collides(w, 48.5, y + 1, 48.5);
    w.set(48, y, 48, gateId(0, true));
    const gateOpen = !player.collides(w, 48.5, y + 1, 48.5);
    w.set(48, y, 48, 0); w.set(49, y, 48, 0);
    for (let x = 44; x <= 52; x++) w.set(x, y, 48, B.FENCE);
    const playerPassage = (open) => {
      w.set(48, y, 48, gateId(0, open));
      const p = new Player(); p.setPos({ x: 48.5, y, z: 50.5 }); p.onGround = true;
      const input = { move: { x: 0, y: 1 }, jump: true, down: false };
      let nearest = p.z;
      for (let i = 0; i < 160; i++) { p.update(0.025, input, w, i * 0.025); nearest = Math.min(nearest, p.z); }
      return nearest;
    };
    const closedPlayerZ = playerPassage(false), openPlayerZ = playerPassage(true);
    for (let x = 44; x <= 52; x++) w.set(x, y, 48, 0);

    const simulate = (kind, seconds = 30) => {
      const events = { warnings: 0, puffs: 0 };
      const animals = new Animals(new Scene(), {
        warnAt: (_prey, on) => { if (on) events.warnings++; },
        poofAt: () => { events.puffs++; },
      });
      const pig = animals.spawn('pig', 48.5, y, kind === 'open' ? 49.5 : 48.5, 0);
      const lion = animals.spawn('lion', 48.5, y, kind === 'open' ? 43.5 : 43.5, 0);
      pig.onGround = lion.onGround = true; pig.timer = lion.timer = 100;
      lion.hunger = 0;
      if (kind !== 'open') {
        for (let x = 46; x <= 50; x++) for (let z = 46; z <= 50; z++) {
          if (x !== 46 && x !== 50 && z !== 46 && z !== 50) continue;
          w.set(x, y, z, kind === 'fence' ? B.FENCE : B.STONE);
          if (kind === 'high') w.set(x, y + 1, z, B.STONE);
        }
        if (kind === 'fence') w.set(48, y, 46, gateId(0, false));
      }
      let warned = false, fled = false, caught = false;
      for (let i = 0; i < seconds * 20; i++) {
        animals.update(0.05, w);
        warned ||= lion.hunt?.phase === 'stalk';
        fled ||= pig.state === 'vluchten';
        if (!animals.list.includes(pig)) { caught = true; break; }
      }
      const answer = { warned, fled, caught, sleep: lion.sleep, gaveUp: lion.hunt === null && lion.hunger > 0,
        warning: events.warnings > 0, poof: events.puffs === 1 };
      for (let x = 46; x <= 50; x++) for (let z = 46; z <= 50; z++) { w.set(x, y, z, 0); w.set(x, y + 1, z, 0); }
      return answer;
    };
    const open = simulate('open');
    const fence = simulate('fence');
    const low = simulate('low');
    const high = simulate('high');
    for (let x = 46; x <= 50; x++) for (let z = 46; z <= 50; z++) {
      if (x === 46 || x === 50 || z === 46 || z === 50) w.set(x, y, z, B.FENCE);
    }
    const passage = (open) => {
      w.set(48, y, 46, gateId(0, open));
      const manager = new Animals(new Scene());
      const a = manager.spawn('lion', 48.5, y, 43.5, Math.PI);
      a.targetYaw = Math.PI; a.onGround = true; a.walking = true; a.timer = 100;
      let farthestZ = a.z;
      for (let i = 0; i < 200; i++) { a.update(0.025, w, null); farthestZ = Math.max(farthestZ, a.z); }
      return farthestZ;
    };
    const closedPassage = passage(false), openPassage = passage(true);
    for (let x = 46; x <= 50; x++) for (let z = 46; z <= 50; z++) w.set(x, y, z, 0);
    const wild = new Animals(new Scene());
    const tiger = wild.spawn('tiger', 45.5, y, 48.5, 0);
    const tamePig = wild.spawn('pig', 48.5, y, 48.5, 0);
    wild.spawn('zebra', 49.5, y, 48.5, 0);
    tiger.hunger = 0; tiger.tame = true;
    for (let i = 0; i < 100; i++) wild.update(0.05, w);
    const tameSafe = !tiger.hunt;
    wild.remove(tamePig); tiger.tame = false;
    for (let i = 0; i < 100; i++) wild.update(0.05, w);
    const wildSafe = !tiger.hunt;
    const hay = new Animals(new Scene());
    w.set(48, y, 48, B.HAY);
    const sheep = hay.spawn('sheep', 53.9, y, 48.5, -Math.PI / 2);
    sheep.walking = true; sheep.timer = 100; sheep.targetYaw = -Math.PI / 2;
    let farthest = 0;
    for (let i = 0; i < 400; i++) { hay.update(0.05, w); farthest = Math.max(farthest, Math.hypot(sheep.x - 48.5, sheep.z - 48.5)); }
    return { ids: B.FENCE === 91 && B.GATE === 92 && B.HAY === 100 && gateId(3, true) === 99,
      fenceHigh, fenceJoined, armsJoined, gateHigh, gateOpen, closedPlayerZ, openPlayerZ,
      open, fence, low, high, closedPassage, openPassage, tameSafe, wildSafe, farthest,
      shapes: BLOCKS[92].shape === 'gate' && BLOCKS[99].open };
  });
  check(result.ids && result.shapes, 'blok-ID’s 91–100 en vier richtingen van de hekdeur');
  check(result.fenceHigh && result.gateHigh && result.gateOpen, 'speler botst tegen hek en dichte hekdeur op 1,5 blok; open doorgang werkt');
  check(result.closedPlayerZ > 48.5 && result.openPlayerZ < 47.5, 'speler springt niet over de dichte hekdeur en loopt wel door de open');
  check(result.fenceJoined && result.armsJoined, 'hekken verbinden met hun buren');
  check(result.open.warned && result.open.warning && result.open.fled && result.open.caught && result.open.poof && result.open.sleep > 100, '3: leeuw waarschuwt, jaagt op varken, poef en rust');
  check(!result.fence.caught && result.fence.gaveUp, '4: gesloten stal beschermt; leeuw geeft na 20 seconden op');
  check(result.closedPassage < 46 && result.openPassage > 47, 'dieren passeren de open hekdeur en stoppen voor de dichte');
  check(result.low.caught, '5: een muur van één blok blijft passeerbaar');
  check(!result.high.caught && result.high.gaveUp, 'twee blokken hoge muur beschermt');
  check(result.tameSafe && result.wildSafe, 'getemd roofdier jaagt niet en wilde dieren zijn nooit prooi');
  check(result.farthest <= 6.05, 'boerderijdier blijft bij de hooibaal');

  await page.locator('.play-btn').tap();
  const gatePoint = await run(async () => {
    const { B, gateId } = await import('./js/blocks.js');
    const THREE = await import('./lib/three.module.min.js');
    const j = window.__jippecraft;
    j.freshWorld('flat', 7); j.animals.clear();
    const y = j.world.surfaceY(48, 48) + 1;
    j.world.set(48, y, 49, gateId(0, false));
    j.player.setPos({ x: 48.5, y, z: 53.5 }); j.player.yaw = 0; j.player.pitch = -0.1;
    j.scene.rebuildAll(j.world); j.updateCamera(0); j.scene.camera.updateMatrixWorld();
    const v = new THREE.Vector3(48.5, y + 0.75, 49.5).project(j.scene.camera);
    return { x: (v.x + 1) * innerWidth / 2, y: (1 - v.y) * innerHeight / 2, by: y };
  });
  await page.touchscreen.tap(gatePoint.x, gatePoint.y);
  check(await run((y) => window.__jippecraft.world.get(48, y, 49) === 93, gatePoint.by), 'hekdeur opent met een echte vinger-tik');
  await page.touchscreen.tap(gatePoint.x, gatePoint.y);
  check(await run((y) => window.__jippecraft.world.get(48, y, 49) === 92, gatePoint.by), 'hekdeur sluit met een echte vinger-tik');
  await page.screenshot({ path: out + '/fase-c-hekdeur.png' });

  const lionPoint = await run(async () => {
    const THREE = await import('./lib/three.module.min.js');
    const j = window.__jippecraft, y = j.world.surfaceY(48, 48) + 1;
    j.player.setPos({ x: 48.5, y, z: 54.5 }); j.player.yaw = 0; j.player.pitch = -0.12;
    j.world.set(48, y, 49, 0);
    const lion = j.animals.spawn('lion', 48.5, y, 51.5, 0);
    j.animals.spawn('pig', 48.5, y, 45.5, 0);
    lion.hunger = 0; lion.timer = 100; lion.onGround = true;
    for (let i = 0; i < 65; i++) j.animals.update(0.05, j.world);
    j.updateCamera(0); j.scene.camera.updateMatrixWorld();
    const v = new THREE.Vector3(lion.x, lion.y + 0.7, lion.z).project(j.scene.camera);
    return { x: (v.x + 1) * innerWidth / 2, y: (1 - v.y) * innerHeight / 2 };
  });
  check(await run(() => window.__jippecraft.animals.list[0].hunt?.phase === 'chase'), 'jacht bereikt na drie seconden de achtervolging');
  await page.touchscreen.tap(lionPoint.x, lionPoint.y);
  check(await run(() => { const a = window.__jippecraft.animals.list[0]; return !a.hunt && a.huntPause > 29; }), '6: leeuw aaien met een vinger stopt de jacht 30 seconden');

  await run(() => {
    const j = window.__jippecraft, a = j.animals.list[0];
    a.happy = 0; a.huntPause = 0; a.hunger = 0;
    for (let i = 0; i < 20; i++) j.animals.update(0.05, j.world);
  });
  await page.locator('.menu-btn').tap();
  const paused = await run(() => window.__jippecraft.animals.list[0].hunt?.elapsed);
  await page.waitForTimeout(300);
  check(await run((old) => window.__jippecraft.animals.list[0].hunt?.elapsed === old, paused), 'honger- en sluiptijd staan stil in het menu');
  await page.locator('.predators-btn').tap();
  check(await run(() => { const j = window.__jippecraft; return !j.settings.predators && !j.animals.predators && !j.animals.list[0].hunt; }), '7: ouderinstelling stopt een lopende jacht');
  await page.screenshot({ path: out + '/fase-c-menu.png' });
  await run(async () => {
    const { gateId } = await import('./js/blocks.js');
    const j = window.__jippecraft, y = j.world.surfaceY(52, 49) + 1;
    j.world.set(52, y, 49, gateId(0, false));
    j.markDirty(); j.saveNow();
  });
  await page.reload();
  await page.waitForFunction(() => window.__jippecraft, null, { timeout: 20000 });
  check(await run(() => { const j = window.__jippecraft; const y = j.world.surfaceY(52, 48) + 1;
    return j.settings.predators === false && j.animals.predators === false && j.world.get(52, y, 49) === 92 &&
      j.animals.list.some((a) => a.type === 'lion' && Number.isFinite(a.hunger)); }), 'hekdeur, dieren en ouderinstelling blijven na herladen bewaard');
  check(await run(() => { const j = window.__jippecraft; j.freshWorld('savanna', 7); return !j.animals.predators && !j.settings.predators; }), 'ouderinstelling geldt voor iedere wereld');
  await context.close();
}
