// 6.4: de dieren bewegen natuurlijker: optrekken en afremmen, in een boog naar een doelplek, vooruit
// kijken, een lijf dat meebeweegt, rustgedrag, en groepjes (kudde, jong bij de moeder, scholen vissen).
export async function testPhase6E({ newPage, check }) {
  const { context, page } = await newPage();
  const r = await page.evaluate(async () => {
    const { World } = await import('./js/world.js'), { Animals } = await import('./js/animals.js');
    const { Scene } = await import('./lib/three.module.min.js'), { B } = await import('./js/blocks.js');
    const { Animal } = await import('./js/animals/core.js');
    Animal.night = false; // overdag (anders gaan ze slapen)
    const w = new World(); w.generate('flat', 7);
    const y = w.surfaceY(48, 48) + 1, out = {};
    const m = new Animals(new Scene());
    const step = (a, n, dt = 1 / 30) => { for (let i = 0; i < n; i++) a.update(dt, w, null, [a]); };

    // 1. Optrekken en afremmen
    const cow = m.spawn('cow', 40.5, y, 40.5, 0); cow.walking = true; cow.timer = 100;
    step(cow, 3);
    const early = cow.speedCur;
    step(cow, 60);
    const full = cow.speedCur;
    cow.walking = false;
    const z0 = cow.z; step(cow, 3);
    const rolling = cow.speedCur > 0 && cow.z < z0;
    step(cow, 40);
    out.accel = { early: early < cow.def.speed * 0.5, full: Math.abs(full - cow.def.speed) < 0.05, rolling, stopped: cow.speedCur === 0 };

    // 2. Rondwandelen zonder ineens om te draaien
    const pig = m.spawn('pig', 48.5, y, 48.5, 0);
    let maxTurn = 0, walked = 0;
    for (let i = 0; i < 30 * 60; i++) {
      const before = pig.yaw, px = pig.x, pz = pig.z;
      pig.update(1 / 30, w, null, [pig]);
      maxTurn = Math.max(maxTurn, Math.abs(Math.atan2(Math.sin(pig.yaw - before), Math.cos(pig.yaw - before))));
      walked += Math.hypot(pig.x - px, pig.z - pz);
    }
    out.wander = { maxTurn, walked };

    // 3. Vooruit kijken: een lange muur voor het schaap; het loopt er met een boog omheen in plaats van ertegenaan
    for (let x = 20; x <= 76; x++) for (let dy = 0; dy < 3; dy++) w.set(x, y + dy, 70, B.COBBLE);
    const sheep = m.spawn('sheep', 48.5, y, 74.5, 0); sheep.walking = true; sheep.timer = 100; sheep.goal = { x: 48.5, z: 60 };
    let bumps = 0; const move = sheep.move.bind(sheep);
    sheep.move = (dt, world) => { const ok = move(dt, world); if (ok === false && sheep.z < 72) bumps++; return ok; };
    let closest = 99;
    for (let i = 0; i < 30 * 10; i++) { sheep.update(1 / 30, w, null, [sheep]); closest = Math.min(closest, sheep.z - 71); }
    out.ahead = { bumps, closest, through: sheep.z < 70 };

    // 4. Een lijf dat meebeweegt: deinen, knikken, leunen in de bocht
    const horse = m.spawn('horse', 40.5, y, 30.5, 0); horse.walking = true; horse.timer = 100;
    let bobLo = 9, bobHi = -9, nodLo = 9, nodHi = -9, lean = 0;
    for (let i = 0; i < 90; i++) {
      if (i === 45) horse.targetYaw = horse.yaw + 1.5;
      horse.update(1 / 30, w, null, [horse]);
      const bob = horse.group.position.y - horse.y;
      bobLo = Math.min(bobLo, bob); bobHi = Math.max(bobHi, bob);
      nodLo = Math.min(nodLo, horse.head.rotation.x); nodHi = Math.max(nodHi, horse.head.rotation.x);
      lean = Math.max(lean, Math.abs(horse.group.rotation.z));
    }
    out.body = { bob: bobHi - bobLo, nod: nodHi - nodLo, lean };

    // 5. Rustgedrag: kijken naar Jippe als die dichtbij staat; soms even gaan liggen
    m.clear();
    const calf = m.spawn('cow', 48.5, y, 40.5, 0); calf.timer = 100; calf.walking = false; calf.graze = false;
    for (let i = 0; i < 40; i++) m.update(1 / 30, w, { x: 52.5, z: 40.5 });
    out.look = calf.head.rotation.y;
    const real = Math.random; Math.random = () => 0.05;
    calf.timer = 0; calf.onGround = true; calf.walking = false; calf.choose();
    Math.random = real;
    calf.update(1 / 30, w, null, [calf]);
    out.lie = { state: calf.state, legs: calf.legs.every((l) => Math.abs(l.rotation.x) > 1) };

    // 6. Groepjes: een kudde komt bij elkaar, een jong dier volgt zijn moeder, vissen zwemmen in een school
    m.clear();
    for (let x = 20; x <= 76; x++) for (let dy = 0; dy < 3; dy++) w.set(x, y + dy, 70, 0);
    const herd = [[36, 36], [58, 38], [38, 58], [57, 57], [47, 47]].map(([x, z]) => m.spawn('sheep', x + 0.5, y, z + 0.5, 0));
    const spread = () => { const cx = herd.reduce((s, a) => s + a.x, 0) / herd.length, cz = herd.reduce((s, a) => s + a.z, 0) / herd.length; return herd.reduce((s, a) => s + Math.hypot(a.x - cx, a.z - cz), 0) / herd.length; };
    const spread0 = spread();
    for (let i = 0; i < 10 * 90; i++) m.update(0.1, w, { x: 48, z: 48 });
    out.herd = { before: spread0, after: spread() };
    m.clear();
    const mom = m.spawn('cow', 40.5, y, 40.5, 0); mom.timer = 1000;
    const baby = m.spawn('cow', 52.5, y, 48.5, 0); baby.baby = 300; baby.timer = 0;
    for (let i = 0; i < 10 * 30; i++) m.update(0.1, w, { x: 46, z: 44 });
    out.baby = Math.hypot(baby.x - mom.x, baby.z - mom.z);
    m.clear();
    for (let x = 30; x <= 56; x++) for (let z = 30; z <= 56; z++) for (let dy = -5; dy < 0; dy++) w.set(x, y + dy, z, B.WATER);
    const fish = [];
    for (let i = 0; i < 7; i++) fish.push(m.spawn('fish', 40 + (i % 3) * 1.5, y - 3, 40 + Math.floor(i / 3) * 1.5, Math.random() * Math.PI * 2));
    const align = () => { const sx = fish.reduce((s, f) => s - Math.sin(f.yaw), 0), sz = fish.reduce((s, f) => s - Math.cos(f.yaw), 0); return Math.hypot(sx, sz) / fish.length; };
    const a0 = align();
    for (let i = 0; i < 20 * 30; i++) m.update(1 / 30, w, { x: 43, z: 43 });
    out.school = { before: a0, after: align() };
    return out;
  });
  check(r.accel.early && r.accel.full, 'een dier trekt rustig op tot zijn gewone snelheid (niet ineens op volle snelheid)');
  check(r.accel.rolling && r.accel.stopped, 'en het loopt even uit als het stopt');
  check(r.wander.maxTurn < 0.1 && r.wander.walked > 10, `rondwandelen in bochten, zonder ineens om te draaien (hoogstens ${r.wander.maxTurn.toFixed(2)} per beeldje)`);
  check(r.ahead.bumps <= 1 && !r.ahead.through && r.ahead.closest > -0.5, `een dier ziet een muur op tijd en loopt er met een boog omheen (${r.ahead.bumps} keer gebotst)`);
  check(r.body.bob > 0.01 && r.body.nod > 0.05 && r.body.lean > 0.02, 'tijdens het lopen deint het lijf, knikt de kop en leunt het dier in de bocht');
  check(r.look < -0.5, 'een dier dat stilstaat kijkt naar Jippe als die dichtbij is');
  check(r.lie.state === 'liggen' && r.lie.legs, 'soms gaat een dier even liggen');
  check(r.herd.after < r.herd.before * 0.6, `een kudde schapen komt bij elkaar (${r.herd.before.toFixed(1)} → ${r.herd.after.toFixed(1)} blokken uit elkaar)`);
  check(r.baby < 5, `een jong dier loopt achter zijn moeder aan (${r.baby.toFixed(1)} blokken)`);
  check(r.school.after > 0.6 && r.school.after > r.school.before, `vissen zwemmen in een school dezelfde kant op (${r.school.before.toFixed(2)} → ${r.school.after.toFixed(2)})`);
  await context.close();
}
