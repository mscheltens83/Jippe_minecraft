// Fase B: dieren, herkenbare vormen, kunstjes, opslag en minder werk op afstand.
export async function testPhaseB({ newPage, check, out }) {
  const { context, page } = await newPage();
  const run = (fn, arg) => page.evaluate(fn, arg);
  const wild = ['lion', 'lioness', 'cheetah', 'tiger', 'elephant', 'giraffe', 'zebra', 'hippo', 'meerkat'];
  const worlds = await run(async () => {
    const { World } = await import('./js/world.js'), { Animals } = await import('./js/animals.js');
    const { Scene } = await import('./lib/three.module.min.js'), { biomeAt } = await import('./js/biomes.js');
    const result = [];
    for (const seed of [424242, 12345]) for (const type of ['island', 'flat', 'jungle', 'desert', 'tundra', 'savanna', 'adventure']) {
      const w = new World(); w.generate(type, seed);
      const animals = new Animals(new Scene()); animals.populate(w);
      const counts = {};
      for (const a of animals.list) counts[a.type] = (counts[a.type] || 0) + 1;
      const rock = w.landmarks.find((l) => l.kind === 'lionRock'), pool = w.landmarks.find((l) => l.kind === 'wateringHole');
      const lion = animals.list.find((a) => a.type === 'lion'), hippo = animals.list.find((a) => a.type === 'hippo');
      result.push({ type, seed, counts,
        rock: !rock || lion?.state === 'slapen' && lion.x === rock.x + 0.5 && lion.y === rock.y + 7,
        pool: !pool || hippo?.waterSurface(w) === pool.y,
        habitat: animals.list.every((a) => ['pig', 'chicken', 'sheep'].includes(a.type)
          ? type !== 'adventure' || Math.hypot(a.x - 48, a.z - 48) < 8
          : type !== 'adventure' || a.def.werelden.includes(biomeAt(type, a.x, a.z))),
      });
    }
    return result;
  });
  const every = (type, fn) => worlds.filter((w) => w.type === type).every(fn);
  check(every('savanna', (w) => wild.filter((t) => t !== 'tiger').every((t) => w.counts[t] >= 1)), 'savanne heeft leeuw, leeuwin, cheetah en alle vijf savannedieren (twee seeds)');
  check(every('jungle', (w) => w.counts.tiger === 3), 'jungle heeft drie tijgers (twee seeds)');
  check(every('desert', (w) => w.counts.meerkat === 3), 'stokstaartjes komen ook vanzelf in de woestijn');
  check(every('adventure', (w) => wild.every((t) => w.counts[t] >= 1) && w.habitat), 'avontuur heeft alle negen nieuwe soorten in hun eigen gebieden');
  check(worlds.every((w) => w.rock && w.pool), 'leeuw slaapt op de rots; nijlpaard begint in de drinkplaats');
  check(['island', 'flat'].every((type) => every(type, (w) => Object.keys(w.counts).length === 3 && w.counts.pig === 4 && w.counts.chicken === 4 && w.counts.sheep === 3)), 'eiland en plat behouden hun drie boerderijdieren');

  await page.locator('.play-btn').tap();
  await run(() => { const j = window.__jippecraft; j.freshWorld('flat', 7); j.animals.clear(); j.scene.rebuildAll(j.world); });
  await page.locator('.slot.chest').tap();
  await page.locator('.pal-tab[aria-label="Dieren"]').tap();
  check(await page.locator('.pal-items:not([hidden]) .pal-item').count() === 12, 'dierenkist bevat de drie oude en negen nieuwe dieren');
  check(await run(() => [...document.querySelectorAll('.pal-items:not([hidden]) .pal-section')].map((e) => e.textContent).join(',') === 'Boerderij,Savanne,Jungle'), 'dierenkist groepeert de plaatjes per wereld');
  check(await run(() => [...document.querySelectorAll('.pal-items:not([hidden]) .pal-item')].every((e) => {
    const r = e.getBoundingClientRect(); return r.width >= 60 && r.height >= 60 && e.querySelector('img').src.includes('svg');
  })), 'alle dieren hebben een herkenbaar plaatje en een grote aanraakknop');
  await page.screenshot({ path: out + '/17-dierenkist.png' });
  await page.locator('.pal-item[aria-label="Leeuw"]').tap();
  await run(() => { const j = window.__jippecraft; j.player.yaw = 0; j.player.pitch = -0.65; j.updateCamera(0); });
  const vp = page.viewportSize();
  await page.touchscreen.tap(vp.width / 2, vp.height / 2 + 30);
  await page.waitForFunction(() => window.__jippecraft.animals.list.some((a) => a.type === 'lion'), null, { timeout: 30000 });
  check(await run(() => window.__jippecraft.animals.list[0].type === 'lion'), 'een leeuw uit de kist wordt met een tik op de grond geplaatst');
  const tap = await run(() => {
    const j = window.__jippecraft; j.animals.clear();
    const a = j.animals.spawn('lion', 48.5, 12, 45.5, Math.PI);
    a.timer = 100; a.onGround = true;
    j.player.setPos({ x: 48.5, y: 12, z: 48.5 }); j.player.pitch = -0.2; j.player.yaw = 0; j.updateCamera(0); j.scene.camera.updateMatrixWorld();
    const v = a.group.position.clone(); v.y += 0.7; v.project(j.scene.camera);
    return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight };
  });
  await page.touchscreen.tap(tap.x, tap.y);
  await page.waitForFunction(() => window.__jippecraft.animals.list[0].happy > 0, null, { timeout: 30000 });
  check(await run(() => window.__jippecraft.animals.list[0].state === 'blij' && window.__jippecraft.particles.hearts.some((h) => h.alive)), 'een echte tik op de leeuw geeft zijn blije houding en hartjes');
  await run(() => { window.__jippecraft.playing = false; });

  const system = await run(async (wild) => {
    const THREE = await import('./lib/three.module.min.js'), { Animals, SPECIES, MAX_ANIMALS } = await import('./js/animals.js');
    const { World } = await import('./js/world.js');
    const w = new World(); w.generate('flat', 7);
    const manager = new Animals(new THREE.Scene());
    const same = Object.keys(SPECIES).every((t) => {
      const a = manager.spawn(t, 30, 12, 30, 0), b = manager.spawn(t, 34, 12, 30, 0);
      const shared = a.head !== b.head && a.head.geometry === b.head.geometry && a.legs[0].geometry === b.legs[0].geometry;
      a.legs[0].rotation.x = 1;
      return shared && b.legs[0].rotation.x === 0;
    });
    const geometry = manager.list[0].head.geometry; let disposed = false;
    geometry.addEventListener('dispose', () => { disposed = true; });
    manager.clear();
    const reuse = manager.spawn('pig', 30, 12, 30, 0).head.geometry === geometry && !disposed;
    manager.clear(); for (let i = 0; i < MAX_ANIMALS; i++) manager.spawn(wild[i % wild.length], 30, 12, 30, 0);
    const capped = MAX_ANIMALS === 60 && manager.full && !manager.spawn('pig', 30, 12, 30);
    const saved = manager.serialize(); manager.load([...saved, ...saved]);
    const cappedLoad = manager.list.length === 60 && manager.scene.children.length === 60;
    manager.clear();
    const near = manager.spawn('lion', 10, 12, 10, 0), far = manager.spawn('lion', 80, 12, 80, 0);
    let nearCalls = 0, farCalls = 0;
    for (const a of [near, far]) {
      a.timer = 100; a.sleep = 10;
      const update = a.update;
      a.update = function (...args) { if (a === near) nearCalls++; else farCalls++; return update.apply(this, args); };
    }
    for (let i = 0; i < 48; i++) manager.update(0.05, w, { x: 10, z: 10 });
    const distance = nearCalls === 48 && farCalls === 12 && Math.abs(near.sleep - (far.sleep - far.elapsed)) < 0.001;
    manager.clear(); const hidden = manager.spawn('pig', 48, 12, 60, 0); hidden.timer = 100;
    let animations = 0; const show = hidden.show; hidden.show = function (...args) { animations++; return show.apply(this, args); };
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100); camera.position.set(48, 13, 48);
    manager.update(0.1, w, { x: 48, z: 48 }, camera);
    const invisible = !hidden.group.visible && animations === 0;
    camera.rotation.y = Math.PI; manager.update(0.1, w, { x: 48, z: 48 }, camera);
    return { same, reuse, capped, cappedLoad, distance, invisible, visibleAgain: hidden.group.visible && animations === 1 };
  }, wild);
  check(system.same && system.reuse, 'soortgenoten delen geometrie, bewegen onafhankelijk en overleven wereldwissels');
  check(system.capped && system.cappedLoad, 'maximaal zestig dieren, ook bij laden; geen oude groepen achtergelaten');
  check(system.distance, 'verre dieren krijgen een kwart van de updates zonder speeltijd te verliezen');
  check(system.invisible && system.visibleAgain, 'dieren buiten beeld worden niet geanimeerd en verschijnen weer als je omkijkt');

  const skills = await run(async () => {
    const { World } = await import('./js/world.js'), { Animals } = await import('./js/animals.js');
    const { Scene } = await import('./lib/three.module.min.js'), { B } = await import('./js/blocks.js');
    const w = new World(); w.generate('flat', 7);
    const effects = { dust: 0, zzz: 0, water: 0, dustAt() { this.dust++; }, sleepAt() { this.zzz++; }, waterAt() { this.water++; } };
    const manager = new Animals(new Scene(), effects);
    const cheetah = manager.spawn('cheetah', 40, 12, 65, 0);
    cheetah.walking = true; cheetah.timer = 100; cheetah.sprint = 2; cheetah.sprintWait = 60;
    for (let i = 0; i < 120; i++) cheetah.update(1 / 60, w, effects);
    const sprint = Math.abs((65 - cheetah.z) - 18) < 0.3 && cheetah.sprint < 0.001 && effects.dust > 10;
    const z = cheetah.z; for (let i = 0; i < 60; i++) cheetah.update(1 / 60, w, effects);
    const slows = Math.abs((z - cheetah.z) - 1.7) < 0.05;
    const lion = manager.spawn('lion', 30, 12, 30, 0); lion.sleep = 10;
    lion.update(0.1, w, effects);
    const sleeps = lion.state === 'slapen' && lion.legs.every((l) => Math.abs(l.rotation.x) > 1) && effects.zzz > 0;
    lion.pet(30, 32); lion.update(0.1, w, effects);
    const wakes = lion.state === 'blij' && lion.sleep === 0 && Math.abs(lion.head.rotation.z) > 0;
    const elephant = manager.spawn('elephant', 30, 12, 30, 0); elephant.pet(30, 26);
    let earMotion = false;
    for (let i = 0; i < 50; i++) { elephant.update(1 / 60, w, effects); earMotion ||= Math.abs(elephant.ears[0].rotation.y) > 0.01; }
    const sprays = effects.water === 1 && elephant.trunk[0].rotation.x > 1 && earMotion;
    const hippo = manager.spawn('hippo', 30, 12, 30, 0); hippo.pet(30, 26); hippo.update(0.8, w, effects);
    const yawns = hippo.jaw.rotation.x > 0.5 && hippo.head.rotation.x < 0;
    const meerkat = manager.spawn('meerkat', 30, 12, 30, 0); meerkat.pet(30, 26); meerkat.update(0.9, w, effects);
    const hides = meerkat.group.scale.y < 0.2;
    meerkat.update(1, w, effects); const returns = meerkat.group.scale.y === 1;
    const giraffe = manager.spawn('giraffe', 30, 12, 30, 0);
    w.set(30, 15, 29, B.ACACIA_LEAVES); giraffe.update(0.1, w, effects);
    const browses = giraffe.browsing && giraffe.state === 'grazen' && giraffe.neck.rotation.x < 0;
    giraffe.pet(30, 26); giraffe.update(0.1, w, effects); const nods = Math.abs(giraffe.neck.rotation.x) > 0;
    const zebra = manager.spawn('zebra', 25, 12, 30, 0), friend = manager.spawn('zebra', 31, 12, 30, 0);
    zebra.timer = 100; zebra.walking = true; zebra.skillWait = 0; zebra.update(0.1, w, effects, [zebra, friend]);
    const herds = zebra.targetYaw < -1;
    zebra.pet(25, 26); zebra.update(0.1, w, effects); const kicks = zebra.legs[1].rotation.x < 0;
    // Een vijver met drie lagen water: de tijger zwemt, een leeuw stopt aan de kant.
    for (let x = 20; x <= 45; x++) for (let z = 35; z <= 48; z++) for (let y = 9; y <= 11; y++) w.set(x, y, z, B.WATER);
    const tiger = manager.spawn('tiger', 30, 11.55, 45, 0); tiger.timer = 100; tiger.walking = true; tiger.skillWait = 100;
    for (let i = 0; i < 180; i++) tiger.update(1 / 60, w, effects);
    const swims = tiger.inWater && Math.abs(tiger.y - 11.55) < 0.05 && tiger.z < 42;
    const shore = manager.spawn('lion', 30, 12, 50, 0); shore.timer = 100; shore.walking = true;
    for (let i = 0; i < 120; i++) shore.update(1 / 60, w, effects);
    const avoids = shore.z >= 49 && shore.y >= 12;
    return { sprint, slows, sleeps, wakes, sprays, yawns, hides, returns, browses, nods, herds, kicks, swims, avoids };
  });
  check(skills.sprint && skills.slows, 'cheetah sprint twee seconden met negen blokken per seconde en stof, daarna weer rustig');
  check(skills.sleeps && skills.wakes, 'leeuw ligt met gevouwen poten en Zzz; aaien maakt hem wakker en schudt zijn manen');
  check(skills.sprays, 'olifant heft zijn slurf, wappert met zijn oren en spuit één fontein per aai');
  check(skills.yawns, 'nijlpaard gaapt met een bewegende onderkaak');
  check(skills.hides && skills.returns, 'stokstaartje duikt weg en komt vanzelf weer tevoorschijn');
  check(skills.browses && skills.nods, 'giraf zoekt acaciabladeren en knikt met zijn nek bij aaien');
  check(skills.herds && skills.kicks, 'zebra zoekt soortgenoten en geeft een vrolijke schop bij aaien');
  check(skills.swims && skills.avoids, 'tijger zwemt aan het oppervlak; leeuw blijft aan de waterkant');

  const collision = await run(async () => {
    const { World } = await import('./js/world.js'), { Animals } = await import('./js/animals.js');
    const { Scene } = await import('./lib/three.module.min.js');
    const wall = (height) => {
      const w = new World(); w.generate('flat', 7);
      for (let x = 2; x < 94; x++) for (let y = 12; y < 12 + height; y++) w.set(x, y, 40, 5);
      const a = new Animals(new Scene()).spawn('lion', 48.5, 12, 45.5, 0); a.timer = 100; a.walking = true;
      for (let i = 0; i < 600; i++) { a.yaw = a.targetYaw = 0; a.update(1 / 60, w); }
      return a;
    };
    const low = wall(1), high = wall(2);
    const j = window.__jippecraft; j.freshWorld('flat', 7); j.animals.clear();
    const before = j.animals.list.length;
    for (let x = 29; x <= 32; x++) for (let z = 29; z <= 32; z++) j.world.set(x, 14, z, 5);
    j.placeAnimal({ x: 30, y: 11, z: 30, id: 1, nx: 0, ny: 1, nz: 0 }, 'giraffe');
    return { low: low.z < 38 && low.y === 12, high: high.z > 41 && high.y === 12, roof: j.animals.list.length === before };
  });
  check(collision.low && collision.high, 'dieren huppelen over één blok en blijven voor een muur van twee blokken');
  check(collision.roof, 'een groot dier past niet door een laag dak en een mislukte plaatsing laat niets achter');

  const integration = await run(async (wild) => {
    const j = window.__jippecraft, { Sounds } = await import('./js/audio.js');
    j.animals.clear(); j.particles.list = [];
    const elephant = j.animals.spawn('elephant', 40, 12, 40, 0); j.petAnimal(elephant);
    elephant.update(0.1, j.world, j.particles);
    const drops = j.particles.list.length === 40 && j.particles.list.every((p) => p.col[2] === 1);
    const lion = j.animals.spawn('lion', 45, 12, 40, 0); lion.sleep = 10; lion.update(0.1, j.world, j.particles);
    const zzz = j.particles.zzz.some((p) => p.alive);
    const sound = new Sounds(); sound.ok = () => true;
    let calls = []; for (const method of ['tone', 'hiss', 'vibrato']) sound[method] = (...args) => calls.push([method, ...args]);
    // Dezelfde toonvariatie voor elk dier: verschil komt echt uit het geluidrecept.
    const random = Math.random; let profiles;
    try { Math.random = () => 0.5; profiles = wild.map((t) => { calls = []; sound.animal(t); j.sounds.animal(t); return JSON.stringify(calls); }); }
    finally { Math.random = random; }
    return { drops, zzz, sounds: profiles.every((p) => p !== '[]') && new Set(profiles).size === 9 };
  }, wild);
  check(integration.drops && integration.zzz, 'waterdruppels en Zzz worden echt in de spelwereld getekend');
  check(integration.sounds, 'alle negen nieuwe dieren hebben eigen geluiden; het echte Web Audio-pad werkt');

  const storage = await run((wild) => {
    const j = window.__jippecraft; j.animals.clear();
    wild.forEach((t, i) => { const a = j.animals.spawn(t, 25 + i * 3, 12, 40, 0.25); a.hunger = 240 + i; if (t === 'lion') { a.tame = true; a.sleep = 11; } });
    j.hotbar[0] = 213; j.sel = 0; j.saveNow();
    return j.storage.loadLocal('slot1');
  }, wild);
  await page.reload(); await page.waitForFunction(() => window.__jippecraft, null, { timeout: 30000 });
  check(await run((saved) => {
    const j = window.__jippecraft;
    return j.hotbar[0] === 213 && JSON.stringify(j.animals.serialize()) === JSON.stringify(saved.animals) && j.world.serialize() === saved.blocks;
  }, storage), 'herladen bewaart alle nieuwe dieren, positie, temveld, slaaptijd, honger, onderbalk en blokken');

  // Contactblad van de echte 3D-modellen; gebruikt dezelfde renderer als het spel.
  await run(async (wild) => {
    const THREE = await import('./lib/three.module.min.js'), { Animals } = await import('./js/animals.js');
    const j = window.__jippecraft, renderer = j.scene.renderer;
    const grid = document.createElement('div'); grid.id = 'animal-preview';
    grid.style.cssText = 'position:fixed;inset:0;z-index:1000;background:#edf4df;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:12px';
    renderer.setSize(384, 240, false);
    for (const type of wild) {
      const scene = new THREE.Scene(); scene.background = new THREE.Color('#edf4df');
      const a = new Animals(scene).spawn(type, 0, 0, 0, 0);
      const bounds = new THREE.Box3().setFromObject(a.group), center = bounds.getCenter(new THREE.Vector3()), size = bounds.getSize(new THREE.Vector3());
      const camera = new THREE.PerspectiveCamera(38, 384 / 240, 0.1, 30);
      const distance = Math.max(size.y, size.x, size.z) * 2.1;
      camera.position.copy(center).add(new THREE.Vector3(distance * 0.62, distance * 0.33, -distance)); camera.lookAt(center);
      renderer.render(scene, camera);
      const card = document.createElement('div'); card.style.cssText = 'background:white;border-radius:14px;text-align:center;overflow:hidden;font:600 18px sans-serif;color:#24382b';
      const img = new Image(); img.src = renderer.domElement.toDataURL(); img.style.cssText = 'width:100%;height:calc(100% - 30px);object-fit:contain';
      const label = document.createElement('div'); label.textContent = a.def.naam; card.append(img, label); grid.append(card);
    }
    document.body.append(grid); j.resize();
  }, wild);
  await page.waitForFunction(() => [...document.querySelectorAll('#animal-preview img')].every((i) => i.complete));
  await page.screenshot({ path: out + '/18-dierenmodellen.png' });
  await run(() => document.getElementById('animal-preview').remove());

  const frameTime = await run((wild) => new Promise((resolve) => {
    const j = window.__jippecraft; j.freshWorld('savanna', 424242); j.animals.clear();
    for (let i = 0; i < 30; i++) {
      const x = 44 + i % 6 * 2, z = 40 - Math.floor(i / 6) * 2;
      j.animals.spawn(wild[i % wild.length], x, j.world.surfaceY(x, z) + 1, z, Math.PI);
    }
    j.player.setPos({ x: 49, y: 14, z: 52 }); j.player.yaw = 0; j.player.pitch = -0.28; j.player.flying = true;
    j.playing = true; j.ui.hideMenu(); j.scene.rebuildAll(j.world);
    const times = [];
    const frame = (t) => { times.push(t); if (times.length < 31) requestAnimationFrame(frame); else resolve((times[30] - times[0]) / 30); };
    requestAnimationFrame(frame);
  }), wild);
  console.log('INFO Gemiddelde beeldtijd (test-browser, Savanne, 30 wilde dieren): ' + frameTime.toFixed(1) + ' ms; ' + (1000 / frameTime).toFixed(1) + ' beelden/s');
  await page.screenshot({ path: out + '/19-savannedieren.png' });
  await context.close();
}
