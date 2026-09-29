// Fase A: landschappen, natuur, bediening en oude opslag. Wordt door smoke.mjs uitgevoerd.
export async function testPhaseA({ newPage, check, out, phase2Save }) {
  const { context, page } = await newPage({
    fn: (s) => {
      if (localStorage.getItem('jippecraft.slot3.v1')) return;
      localStorage.setItem('jippecraft.slot3.v1', JSON.stringify(s));
      localStorage.setItem('jippecraft.meta.v1', JSON.stringify({ current: 3 }));
      localStorage.setItem('jippecraft.settings.v1', JSON.stringify({ muted: true, music: true, predators: false, album: ['pig'] }));
    }, arg: phase2Save,
  });
  const run = (fn, arg) => page.evaluate(fn, arg);
  const migrated = await run((save) => {
    const j = window.__jippecraft;
    // In dezelfde beurt bewaren, zodat de dieren intussen niet gaan wandelen.
    j.applySave(save);
    j.saveNow(); j.saveSettings();
    const s = j.storage.loadLocal('slot3'), settings = j.storage.loadLocal('settings');
    return {
      slot: j.slot, v: s.v, blocks: s.blocks, type: s.type, seed: s.seed,
      player: s.player, hotbar: s.hotbar, sel: s.sel, mode: s.mode,
      animals: s.animals, riding: s.riding, settings,
    };
  }, phase2Save);
  check(migrated.slot === 3 && migrated.v === 3 && migrated.blocks === phase2Save.blocks, 'echte fase-2-wereld wordt v3 zonder één blok te verliezen');
  check(migrated.type === phase2Save.type && migrated.seed === phase2Save.seed &&
    JSON.stringify(migrated.player) === JSON.stringify(phase2Save.player) &&
    JSON.stringify(migrated.hotbar) === JSON.stringify(phase2Save.hotbar) && migrated.sel === phase2Save.sel && migrated.mode === phase2Save.mode,
  'v2 bewaart wereldsoort, seed, positie, vliegen, onderbalk en bouwstand');
  check(migrated.animals.length === 3 && migrated.animals.every((a, i) => {
    const old = phase2Save.animals[i];
    return ['t', 'x', 'y', 'z', 'yaw'].every((k) => a[k] === old[k]) && a.tame === false && a.hunger >= 180 && a.hunger <= 360 && a.sleep === 0;
  }) && migrated.riding === false, 'v2 bewaart dieren en vult de nieuwe dier-velden veilig aan');
  check(migrated.settings.predators === false && migrated.settings.album[0] === 'pig', 'instellingen bewaren ook de velden voor komende fasen');
  await page.reload();
  await page.waitForFunction(() => window.__jippecraft, null, { timeout: 30000 });
  check(await run((save) => window.__jippecraft.slot === 3 && window.__jippecraft.world.serialize() === save.blocks && window.__jippecraft.storage.loadLocal('slot3').v === 3, phase2Save), 'omgezette v3-wereld blijft na herladen gelijk');

  // Zeven grote keuzekaarten, en de zesde plek echt via het aanraakmenu gebruiken.
  await page.locator('.worlds-btn').tap();
  const grid = await run(() => {
    const cards = [...document.querySelectorAll('.slot-card')].map((e) => e.getBoundingClientRect());
    return cards.length === 6 && cards[0].top === cards[2].top && cards[3].top === cards[5].top && cards[3].top > cards[0].top;
  });
  check(grid, 'zes wereldplekken staan in drie kolommen en twee rijen');
  await page.locator('.slot-card[aria-label="Wereld 6"]').tap();
  check(await page.locator('.choice').count() === 7 && await page.locator('.choice[aria-label="Avontuur"]').isVisible(), 'zeven wereldsoorten met plaatjes om uit te kiezen');
  const touchTargets = await run(() => [...document.querySelectorAll('.choice')].every((e) => {
    const r = e.getBoundingClientRect(); return r.width >= 60 && r.height >= 60 && !!e.querySelector('svg');
  }));
  check(touchTargets, 'nieuwe wereldkaarten zijn minstens 60 px en hebben elk een plaatje');
  await page.screenshot({ path: out + '/11-wereldkeuze.png' });
  await page.locator('.choice[aria-label="Avontuur"]').tap();
  await page.waitForFunction(() => window.__jippecraft.slot === 6 && window.__jippecraft.world.type === 'adventure', null, { timeout: 30000 });
  check(await run(() => window.__jippecraft.storage.loadLocal('slot6')?.v === 3), 'nieuwe wereld op plek 6 wordt als v3 bewaard');
  check(await run((save) => window.__jippecraft.storage.loadLocal('slot3').blocks === save.blocks, phase2Save), 'een zesde wereld maken behoudt de oude derde wereld');
  await page.locator('.slot.chest').tap();
  await page.locator('.pal-tab[aria-label="Natuur"]').tap();
  check(await page.locator('.pal-items:not([hidden]) .pal-section').count() === 4 && await page.locator('.pal-item[aria-label="Liaan"]').isVisible(), 'Natuur bevat vier wereldgroepen met de nieuwe bouwblokken');
  await page.locator('.pal-item[aria-label="Liaan"]').tap();
  check(await run(() => window.__jippecraft.hotbar[window.__jippecraft.sel] === 63), 'een liaan kiezen uit de kist werkt met aanraken');

  const worlds = await run(async () => {
    const { World, SX, SY, SZ } = await import('./js/world.js');
    const { BLOCKS } = await import('./js/blocks.js');
    const results = [];
    for (const type of ['island', 'flat', 'jungle', 'desert', 'tundra', 'savanna', 'adventure']) {
      for (const seed of [424242, 12345]) {
        const w = new World(); w.generate(type, seed);
        const same = new World(); same.generate(type, seed);
        const counts = new Uint32Array(256); w.data.forEach((id) => counts[id]++);
        const copy = new World(); copy.deserialize(w.serialize());
        const spawn = w.spawnPoint(), level = w.surfaceY(48, 48);
        let flatSpawn = true;
        for (let x = 41; x <= 55; x++) for (let z = 41; z <= 55; z++) {
          if (Math.hypot(x - 48, z - 48) < 8 && w.surfaceY(x, z) !== level) flatSpawn = false;
        }
        results.push({ type, seed, counts: Array.from(counts), spawn, flatSpawn,
          valid: SX === 96 && SY === 48 && SZ === 96 && w.data.every((id) => !!BLOCKS[id]),
          deterministic: w.serialize() === same.serialize(), roundTrip: w.serialize() === copy.serialize(),
          size: JSON.stringify({ blocks: w.serialize() }).length, landmarks: w.landmarks.map((l) => l.kind),
        });
      }
    }
    return results;
  });
  const match = (type, fn) => worlds.filter((w) => w.type === type).every(fn);
  check(match('jungle', (w) => w.counts[61] > 30 && w.counts[63] > 0 && w.counts[64] > 0 && w.landmarks.includes('temple')), 'jungle heeft junglehout, hangende lianen, bamboe en een tempel (twee vaste seeds)');
  check(match('desert', (w) => w.counts[10] > 1000 && w.counts[70] > 0 && w.counts[72] > 0 && w.counts[77] > 0 && w.landmarks.filter((l) => l === 'oasis').length >= 2), 'woestijn heeft zand, cactussen, palmen, oases en een piramide met schatkist');
  check(match('tundra', (w) => w.counts[12] > 100 && w.counts[79] > 0 && w.counts[81] > 0 && w.landmarks.includes('igloo')), 'toendra heeft sneeuw, ijs, sparren en iglo’s');
  check(match('savanna', (w) => w.counts[84] > 100 && w.counts[86] > 0 && w.counts[90] > 0 && w.landmarks.includes('lionRock')), 'savanne heeft droog gras, acacia’s, leeuwenrots en modder bij de drinkplaats');
  check(match('adventure', (w) => [61, 63, 70, 79, 81, 84, 86].every((id) => w.counts[id] > 0) && ['temple', 'igloo', 'pyramid', 'lionRock'].every((k) => w.landmarks.includes(k))), 'Avontuur bevat alle vier de gebieden met eigen bomen en bouwwerken');
  check(worlds.every((w) => w.valid && w.flatSpawn && w.deterministic && w.roundTrip && w.size < 250000), 'alle werelden blijven 96×96×48, hebben een vlakke bouwplek en bewaren deterministisch binnen 250 kB');

  const physics = await run(async () => {
    const { World } = await import('./js/world.js'), { Player } = await import('./js/player.js');
    const simulate = (ground) => {
      const w = new World(); w.generate('flat', 7);
      for (let x = 20; x < 80; x++) w.set(x, 11, 40, ground);
      const p = new Player(); p.setPos({ x: 30.5, y: 12.001, z: 40.5 }); p.onGround = true;
      const input = { move: { x: 1, y: 0 }, jump: false, down: false };
      for (let i = 0; i < 120; i++) p.update(1 / 60, input, w, i / 60);
      const distance = p.x - 30.5, x = p.x;
      input.move.x = 0;
      for (let i = 120; i < 150; i++) p.update(1 / 60, input, w, i / 60);
      return { distance, slide: p.x - x, vx: p.vx };
    };
    const w = new World(); w.generate('flat', 7);
    for (let y = 12; y < 24; y++) { w.set(40, y, 40, 63); w.set(40, y, 39, 61); }
    const p = new Player(); p.setPos({ x: 40.5, y: 12.001, z: 40.5 });
    const input = { move: { x: 0, y: 0 }, jump: true, down: false };
    for (let i = 0; i < 60; i++) p.update(1 / 60, input, w, i / 60);
    const up = p.y; input.jump = false;
    for (let i = 60; i < 90; i++) p.update(1 / 60, input, w, i / 60);
    const still = p.y; input.down = true;
    for (let i = 90; i < 120; i++) p.update(1 / 60, input, w, i / 60);
    const down = p.y; input.down = false; input.move.y = 1;
    for (let i = 120; i < 180; i++) p.update(1 / 60, input, w, i / 60);
    return { grass: simulate(1), mud: simulate(90), ice: simulate(79), packed: simulate(80), up, still, down, forward: p.y };
  });
  check(physics.ice.slide > physics.grass.slide * 3 && physics.ice.vx > 0.5 && physics.packed.slide > physics.grass.slide * 3, 'ijs en pakijs laten je na loslaten zichtbaar doorglijden');
  check(physics.mud.distance > physics.grass.distance * 0.4 && physics.mud.distance < physics.grass.distance * 0.6, 'op modder loop je half zo snel');
  check(physics.up > 14 && Math.abs(physics.still - physics.up) < 0.01 && physics.down < physics.still - 1 && physics.forward > physics.down + 2,
    'lianen: springen klimt, loslaten blijft hangen, omlaag daalt en vooruit tegen de stam klimt');

  const vine = await run(() => {
    const j = window.__jippecraft;
    j.playing = false; j.input.releaseAll(); j.freshWorld('flat', 7);
    j.world.set(39, 16, 40, 61);
    j.placeBlock({ x: 39, y: 16, z: 40, nx: 1, ny: 0, nz: 0, id: 61 }, 63);
    return j.world.get(40, 16, 40) === 63 && j.world.get(40, 15, 40) === 0;
  });
  check(vine, 'een liaan hangt aan een zijkant zonder een blok onder zich');

  const stamps = await run(() => {
    const j = window.__jippecraft, results = [];
    j.freshWorld('flat', 7);
    for (const kind of ['igloo', 'pyramid', 'temple', 'lionRock']) {
      const before = j.world.serialize(), edits = j.edits;
      j.player.yaw = Math.PI / 2;
      j.placeStamp({ x: 30, y: 11, z: 30, nx: 0, ny: 1, nz: 0, id: 1 }, kind);
      const built = j.edits === edits + 1 && j.world.serialize() !== before;
      j.undo(); results.push(built && j.world.serialize() === before);
    }
    return results.every(Boolean);
  });
  check(stamps, 'iglo, piramide, tempel en leeuwenrots stempelen én helemaal terugzetten werkt');

  const entrances = await run(async () => {
    const { World } = await import('./js/world.js'), { Player } = await import('./js/player.js');
    return ['jungle', 'desert', 'tundra'].every((type) => {
      const w = new World(); w.generate(type, 424242);
      const l = w.landmarks[0], radius = type === 'desert' ? 7 : type === 'tundra' ? 5 : 4;
      const p = new Player(); p.setPos({ x: l.x + 0.5, y: l.y + 0.001, z: l.z - radius - 0.5 }); p.yaw = Math.PI; p.onGround = true;
      const input = { move: { x: 0, y: 1 }, jump: false, down: false };
      for (let i = 0; i < 150; i++) p.update(1 / 60, input, w, i / 60);
      return p.z > l.z - 1 && p.y >= l.y - 0.01;
    });
  });
  check(entrances, 'de speler kan door de echte ingangen van tempel, piramide en iglo lopen');

  for (const [i, type] of ['jungle', 'desert', 'tundra', 'savanna', 'adventure'].entries()) {
    const view = await run((type) => {
      const j = window.__jippecraft; j.playing = false; j.freshWorld(type, 424242);
      const farms = j.animals.list.filter((a) => ['pig', 'chicken', 'sheep'].includes(a.type));
      const farm = farms.length, nearCenter = farms.every((a) => Math.hypot(a.x - 48, a.z - 48) < 8);
      const l = j.world.landmarks[0];
      j.player.setPos({ x: l.x - 8, y: l.y + 8, z: l.z + 15 });
      j.player.yaw = Math.atan2(-8, 15); j.player.pitch = -0.4; j.player.flying = true;
      j.ui.hideMenu(); j.updateBiome(true); j.scene.rebuildAll(j.world); j.updateCamera(0); j.scene.render();
      return { farm, nearCenter, fog: j.scene.scene.fog.far };
    }, type);
    check(type === 'adventure' ? view.farm >= 6 && view.nearCenter : view.farm === 0, type + ': boerderijdieren verschijnen op de juiste plekken');
    await page.screenshot({ path: out + '/' + (12 + i) + '-' + type + '.png' });
  }
  const sky = await run(async () => {
    const j = window.__jippecraft, { BIOMES, biomeView } = await import('./js/biomes.js');
    j.scene.setBiome(BIOMES.savanna, true); j.scene.setBiome(BIOMES.jungle);
    const before = j.scene.scene.fog.near; j.scene.updateBiome(0.5); const between = j.scene.scene.fog.near;
    return before === 50 && between < 50 && between > 30 && biomeView('adventure', 48, 70).lucht.horizon !== BIOMES.desert.lucht.horizon;
  });
  check(sky, 'lucht en mist mengen zacht bij het wisselen van avonturengebied');
  const slots = await run(() => {
    const j = window.__jippecraft, expected = j.world.serialize();
    j.newWorld(4, 'jungle'); j.newWorld(5, 'tundra'); j.saveNow(); j.switchSlot(6);
    return j.world.serialize() === expected && [4, 5, 6].every((n) => j.storage.loadLocal('slot' + n)?.v === 3);
  });
  check(slots, 'plekken 4, 5 en 6 bewaren apart en terugwisselen behoudt alle blokken');
  const frameTime = await run(() => new Promise((resolve) => {
    const j = window.__jippecraft; j.animals.clear();
    for (let i = 0; i < 30; i++) {
      const x = 27 + Math.cos(i * 2.4) * 5, z = 27 + Math.sin(i * 2.4) * 5;
      j.animals.spawn(['pig', 'chicken', 'sheep'][i % 3], x, j.world.surfaceY(Math.floor(x), Math.floor(z)) + 1, z, 0);
    }
    const times = [];
    const frame = (t) => { times.push(t); if (times.length < 21) requestAnimationFrame(frame); else resolve((times[20] - times[0]) / 20); };
    requestAnimationFrame(frame);
  }));
  console.log('INFO Gemiddelde beeldtijd (test-browser, Avontuur, 30 dieren): ' + frameTime.toFixed(1) + ' ms; ' + (1000 / frameTime).toFixed(1) + ' beelden/s');
  await context.close();
}
