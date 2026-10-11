// 5.5: dieren plaatsen als de teller vol zit, een dier naar huis sturen, en meer zeedieren.
// 5.6: rijden op een dolfijn en een walvis.
import { waitTrue } from './helpers.mjs';

export async function testPhase5F({ newPage, check, out }) {
  const { context, page } = await newPage();
  const run = (fn, arg) => page.evaluate(fn, arg);
  await page.locator('.play-btn').tap();

  // Vol met wilde dieren: een nieuw dier neerzetten ruimt het verste wilde dier op
  const place = await run(async () => {
    const { MAX_ANIMALS } = await import('./js/animals.js');
    const j = window.__jippecraft, w = j.world, p = j.player;
    j.freshWorld('flat', 7); j.animals.clear();
    const y = w.surfaceY(48, 48) + 1;
    p.setPos({ x: 48.5, y, z: 48.5 });
    for (let i = 0; i < MAX_ANIMALS; i++) { const a = j.animals.spawn('pig', 30 + (i % 10) * 3.5, y, 60 + Math.floor(i / 10) * 3, 0); a.wild = true; }
    const tap = (x, z, type) => j.placeAnimal({ x, y: y - 1, z, id: 1, nx: 0, ny: 1, nz: 0 }, type);
    tap(48, 44, 'giraffe');
    const wild = j.animals.list.length === MAX_ANIMALS && j.animals.list.at(-1).type === 'giraffe';
    // Allemaal tam en dichtbij: dan lukt het niet, en het spel legt uit hoe het wel kan
    for (const a of j.animals.list) { a.wild = false; a.x = 46 + (a.x % 6); a.z = 52 + (a.z % 4); }
    let said = ''; const say = j.ui.say.bind(j.ui); j.ui.say = (t, i) => { said = t; say(t, i); };
    tap(44, 44, 'pig');
    j.ui.say = say;
    const tame = j.animals.list.length === MAX_ANIMALS && j.animals.list.filter((a) => a.type === 'pig').length === MAX_ANIMALS - 1;
    return { wild, tame, explained: /sloopstand/.test(said) };
  });
  check(place.wild, 'teller vol met wilde dieren: een nieuw dier neerzetten lukt (het verste wilde dier maakt plaats)');
  check(place.tame && place.explained, 'teller vol met eigen dieren: het spel zegt hoe je een dier naar huis stuurt');

  // Vasthouden in de sloopstand op een dier: het dier gaat naar huis (en er wordt geen blok gesloopt)
  const target = await run(async () => {
    const THREE = await import('./lib/three.module.min.js');
    const j = window.__jippecraft, w = j.world, p = j.player;
    j.animals.clear();
    const y = w.surfaceY(48, 48) + 1;
    p.setPos({ x: 48.5, y, z: 48.5 }); p.yaw = 0; p.pitch = -0.2;
    const a = j.animals.spawn('sheep', 48.5, y, 45.5, Math.PI); a.timer = 100; a.walking = false;
    j.mode = 'break'; j.updateCamera(0); j.scene.camera.updateMatrixWorld();
    const v = new THREE.Vector3(48.5, y + 0.6, 45.5).project(j.scene.camera);
    window.__edits = j.edits;
    return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight };
  });
  await run((t) => { window.__jippecraft.input.pointers.set(999, { sx: t.x, sy: t.y, touch: true, moved: false, stick: false, t: performance.now() }); }, target);
  check(await waitTrue(page, () => !document.querySelector('.hold-ring').hidden, null, 5000), 'vasthouden op een dier laat het rondje vollopen');
  check(await waitTrue(page, () => window.__jippecraft.animals.list.length === 0, null, 8000), 'na even vasthouden gaat het dier naar huis');
  await run(() => window.__jippecraft.input.pointers.delete(999));
  check(await run(() => window.__jippecraft.edits === window.__edits), 'er is daarbij geen blok gesloopt');

  // Zeedieren: in de Grote wereld en rond het eiland zwemmen er veel, ook de nieuwe soorten
  const sea = await run(() => {
    const j = window.__jippecraft, out = {};
    j.playing = false;
    for (const type of ['world', 'island']) {
      j.freshWorld(type, 12345); j.animals.clear();
      let water = 0, made = 0; const kinds = new Set();
      for (let cx = -10; cx <= 16; cx++) for (let cz = -10; cz <= 16; cz++) {
        j.world.ensureArea(cx * 16, cz * 16, cx * 16 + 15, cz * 16 + 15);
        const col = j.animals.waterColumn(j.world, cx * 16 + 8, cz * 16 + 8);
        if (!col || col.depth < 2) continue;
        water++;
        j.animals.clear();
        made += j.animals.spawnInChunk(j.world, cx, cz, null);
        for (const a of j.animals.list) { kinds.add(a.type); if (!a.def.onderwater) kinds.add('!' + a.type); }
      }
      j.animals.clear();
      out[type] = { water, made, kinds: [...kinds] };
    }
    j.playing = true;
    return out;
  });
  for (const type of ['world', 'island']) {
    const s = sea[type];
    check(s.water > 50 && s.made > s.water * 0.4 && !s.kinds.some((k) => k.startsWith('!')),
      `${type === 'world' ? 'Grote wereld' : 'eiland'}: veel zeedieren in het water (${s.made} in ${s.water} waterstukken)`);
    check(['jellyfish', 'whale', 'puffer', 'fish', 'dolphin', 'squid'].every((t) => s.kinds.includes(t)),
      `${type === 'world' ? 'Grote wereld' : 'eiland'}: vis, dolfijn, inktvis, kwal, walvis en kogelvis zwemmen er`);
  }

  // De nieuwe zeedieren: walvis spuit bij aaien, kogelvis blaast zich op, kwal pulseert
  const tricks = await run(async () => {
    const { B } = await import('./js/blocks.js');
    const j = window.__jippecraft, w = j.world;
    j.freshWorld('flat', 7); j.animals.clear();
    const y = w.surfaceY(48, 48) + 1;
    for (let x = 38; x <= 58; x++) for (let z = 30; z <= 44; z++) for (let yy = y - 6; yy < y + 2; yy++) w.set(x, yy, z, B.WATER);
    const mk = (t, x, yy, z) => { const a = j.animals.spawn(t, x, yy, z, 0); a.timer = 100; a.walking = false; return a; };
    const whale = mk('whale', 48, y - 3, 38), puffer = mk('puffer', 52, y - 1.5, 41), jelly = mk('jellyfish', 44, y - 2, 41);
    let spout = 0; const fx = j.particles.waterAt.bind(j.particles); j.particles.waterAt = (...a) => { spout++; fx(...a); };
    whale.pet(48, 48); puffer.pet(48, 48);
    const sizes = [], pulse = new Set();
    for (let i = 0; i < 30; i++) { j.animals.update(1 / 30, w, { x: 48, z: 48 }); sizes.push(puffer.group.scale.x); pulse.add(jelly.body.scale.y.toFixed(2)); }
    j.particles.waterAt = fx;
    return { spout, puff: Math.max(...sizes), pulse: pulse.size };
  });
  check(tricks.spout === 1, 'walvis spuit één fontein als je hem aait');
  check(tricks.puff > 1.4, 'kogelvis blaast zich op als je hem aait');
  check(tricks.pulse > 3, 'kwal pulseert op en neer');
  await page.screenshot({ path: out + '/5f-zeedieren.png' });

  // 5.6: rijden op een dolfijn en een walvis (beeldje voor beeldje, zodat het niet van de snelheid van de testcomputer afhangt)
  const ride = await run(async () => {
    const { B, WATERY } = await import('./js/blocks.js');
    const j = window.__jippecraft, w = j.world, p = j.player, log = {};
    j.freshWorld('flat', 7); j.animals.clear(); j.physics.enabled = false; j.playing = false;
    const y = w.surfaceY(48, 48) + 1;
    for (let x = 30; x <= 60; x++) for (let z = 34; z <= 46; z++) for (let yy = y - 7; yy < y; yy++) w.set(x, yy, z, B.WATER);
    let now = 100;
    const inp = { move: { x: 0, y: 0 }, jump: false, down: false, sprint: false };
    const step = (n) => { for (let i = 0; i < n; i++) { now += 1 / 30; p.update(1 / 30, inp, w, now); j.syncRide(1 / 30); } };
    const wet = () => !!WATERY[w.get(Math.floor(p.x), Math.floor(p.y + 0.3), Math.floor(p.z))];
    const d = j.animals.spawn('dolphin', 36, y - 4, 40, 0);
    p.setPos({ x: 36, y: y - 2, z: 42 });
    j.petAnimal(d); log.notYet = !p.riding;
    for (let i = 0; i < 3; i++) j.petAnimal(d);
    log.mounted = d.tame && p.riding === d && !document.querySelector('.down-btn').hidden;
    p.yaw = -Math.PI / 2; inp.move.y = 1; const x0 = p.x; step(30); inp.move.y = 0;
    log.swims = p.x - x0 > 5 && wet();
    const y1 = p.y; inp.down = true; step(20); inp.down = false; log.dives = y1 - p.y > 1;
    const events = []; p.onLeap = () => events.push('leap'); p.onSplash = () => events.push('splash');
    inp.jump = true; let top = -99;
    for (let i = 0; i < 150; i++) { step(1); top = Math.max(top, p.y); }
    inp.jump = false; step(60);
    log.leaps = top > y + 0.5 && events.includes('leap') && events.includes('splash') && wet();
    inp.move.y = 1; step(200); inp.move.y = 0;
    log.shore = p.x < 61.5 && wet();
    inp.move.y = 1; inp.jump = true; step(150); inp.jump = false; inp.move.y = 0; step(30);
    log.noLand = p.x < 61.5;
    p.yaw = Math.PI / 2; inp.move.y = 1; step(30); inp.move.y = 0; step(30);
    log.backIn = wet();
    j.dismount();
    const wh = j.animals.spawn('whale', 40, y - 5, 40, 0);
    p.setPos({ x: 40, y: y - 2, z: 43 });
    for (let i = 0; i < 4; i++) j.petAnimal(wh);
    let spouts = 0; const fx = j.particles.waterAt.bind(j.particles); j.particles.waterAt = (...a) => { spouts++; fx(...a); };
    j.spoutAt = 0; inp.jump = true; step(150); inp.jump = false;
    j.particles.waterAt = fx;
    log.whale = p.riding === wh && p.y + wh.def.h > y && p.y < y && !p.leaping && spouts >= 1;
    j.dismount(); j.playing = true; j.physics.enabled = true;
    log.quests = j.quests.done?.has?.('zwemrit') ?? null;
    return log;
  });
  check(ride.notYet && ride.mounted, 'dolfijn: drie keer aaien maakt hem tam, nog een tik en je zit erop (de duikknop blijft)');
  check(ride.swims && ride.dives, 'op de dolfijn zwem je vooruit en duik je met de omlaag-knop');
  check(ride.leaps, 'bovenaan springt de dolfijn met de springknop uit het water en plonst terug');
  check(ride.shore && ride.noLand && ride.backIn, 'de dolfijn zwemt niet het land op, ook niet met een sprong');
  check(ride.whale, 'op de walvis drijf je bovenaan met zijn rug boven water, en hij spuit een fontein');
  check(ride.quests === true, 'zwemmen op een dolfijn geeft de sticker "zwemrit"');
  await context.close();
}
