// Fase 7D: de boerderij afgewerkt. Nieuwe dieren uit het bos, een gouden gast, raptors (met z'n tweeën),
// de pteranodon (vliegt: bouw een dak) en de T-rex (de baas: slaat hout en steen kapot, ijzer niet).
export async function testPhase7D({ newPage, check }) {
  const { context, page } = await newPage();
  const run = (fn, arg) => page.evaluate(fn, arg);
  await run(async () => {
    const { B } = await import('./js/blocks.js');
    const j = window.__jippecraft;
    await j.newWorld(1, 'farm');
    j.playing = false;
    window.__B = B;
    window.__sim = (n) => {
      const inp = { move: { x: 0, y: 0 }, jump: false, down: false, sprint: false };
      for (let i = 0; i < n; i++) { window.__now = (window.__now || 100) + 1 / 30; j.player.update(1 / 30, inp, j.world, window.__now); j.farm.update(1 / 30); j.animals.update(1 / 30, j.world, j.player); }
    };
    window.__reset = () => {
      const f = j.farm;
      for (const a of [...j.animals.list]) j.animals.remove(a);
      f.endEscape(); f.active.length = 0; f.pending.length = 0; f.cool = 9999; f.escapeCool = 9999; f.newCool = 9999; f.goldCool = 9999; f.gold = null;
      f.eaten = 0; f.repelled = 0; f.booLeft = 0; f.raids = 0; f.force = null; f.hint = false;
    };
    // Een hok van 3 x 3 binnenin (muur van `block`, `n` hoog, eventueel een dak van planken) met een dier erin; Jippe ver weg
    window.__pen = (type, block, n, roof = false) => {
      const w = j.world, sp = w.spawnPoint(), x0 = Math.floor(sp.x), z0 = Math.floor(sp.z) + 8, y = w.surfaceY(x0, z0) + 1;
      for (let dx = -5; dx <= 5; dx++) for (let dz = -5; dz <= 5; dz++) {
        w.set(x0 + dx, y - 1, z0 + dz, B.GRASS);
        for (let dy = 0; dy < 9; dy++) w.set(x0 + dx, y + dy, z0 + dz, 0);
        const edge = Math.abs(dx) === 2 || Math.abs(dz) === 2;
        if (Math.abs(dx) <= 2 && Math.abs(dz) <= 2) {
          if (edge) for (let dy = 0; dy < n; dy++) w.set(x0 + dx, y + dy, z0 + dz, block);
          if (roof) w.set(x0 + dx, y + n + 1, z0 + dz, B.PLANKS);
        }
      }
      const a = j.animals.spawn(type, x0 + 0.5, y, z0 + 0.5, 0); a.wild = false;
      j.player.setPos({ x: sp.x, y: w.surfaceY(Math.floor(sp.x), Math.floor(sp.z) - 42) + 1, z: sp.z - 42 });
      return { a, x0, z0, y };
    };
    window.__visit = (max = 150) => { const f = j.farm; for (let i = 0; i < 30 * max && f.active.length; i++) window.__sim(1); };
    window.__raid = (type) => { const f = j.farm; f.force = type; for (let k = 0; k < 40 && !f.active.length; k++) { f.cool = 0; window.__sim(2); } return f.active; };
  });
  const holes = (pen) => run(([x0, z0, y]) => { const w = window.__jippecraft.world; let n = 0; for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) if ((Math.abs(dx) === 2 || Math.abs(dz) === 2) && w.get(x0 + dx, y, z0 + dz) === 0) n++; return n; }, [pen.x0, pen.z0, pen.y]);
  // een bezoek van `type` op een dier in een hok
  const visit = async (type, prey, block, n, roof = false) => {
    const pen = await run(([prey, block, n, roof]) => { window.__reset(); return window.__pen(prey, window.__B[block], n, roof); }, [prey, block, n, roof]);
    const r = await run((type) => { const act = window.__raid(type); const first = act[0]; const info = { who: first?.type, count: act.length };
      const f = window.__jippecraft.farm, log = []; let last = '';
      for (let i = 0; i < 30 * 150 && f.active.length; i++) { window.__sim(1); const st = first.phase + (first.work ? '+w' : ''); if (st !== last) { log.push(`${(i / 30).toFixed(0)}:${st}`); last = st; } }
      return { ...info, eaten: f.eaten, repelled: f.repelled, log: log.join(' ') }; }, type);
    const alive = await run(() => window.__jippecraft.animals.list.some((a) => ['chicken', 'cow', 'sheep'].includes(a.type) && !a.raider));
    return { ...r, hole: await holes(pen), alive };
  };

  // Nieuwe dieren uit het bos
  const guest = await run(() => {
    const j = window.__jippecraft, f = j.farm;
    window.__reset();
    const n0 = j.animals.list.length;
    f.newcomer();
    const a = j.animals.list[j.animals.list.length - 1], sp = j.world.spawnPoint();
    const far = Math.hypot(a.x - sp.x, a.z - sp.z);
    window.__sim(30 * 40);
    return { more: j.animals.list.length - n0, far, closer: Math.hypot(a.x - sp.x, a.z - sp.z) < far - 3, joined: f.joined, sticker: j.quests.done.has('farmNieuw') };
  });
  check(guest.more === 1 && guest.far > 30 && guest.closer && guest.joined === 1, `een nieuw dier komt vanaf de rand naar je boerderij lopen (${guest.far.toFixed(0)} blokken weg)`);
  check(guest.sticker, 'er is een sticker voor een nieuw dier');
  const cap = await run(() => {
    const j = window.__jippecraft, f = j.farm, sp = j.world.spawnPoint();
    window.__reset();
    for (let i = 0; i < 24; i++) j.animals.spawn('sheep', sp.x + (i % 6), j.world.surfaceY(Math.floor(sp.x) + (i % 6), Math.floor(sp.z) + 3 + Math.floor(i / 6)) + 1, sp.z + 3 + Math.floor(i / 6), 0).wild = false;
    const n = j.animals.list.length; f.newcomer();
    return j.animals.list.length - n;
  });
  check(cap === 0, 'bij 24 dieren komen er niet nog meer bij vanzelf');

  // Een gouden gast
  const gold = await run(() => {
    const j = window.__jippecraft, f = j.farm;
    window.__reset();
    f.raids = 3; f.goldCool = 0; window.__sim(2);
    const a = f.gold?.a;
    const made = !!a && a.golden === true;
    f.render();
    const star = !!document.querySelector('.farm-count svg:last-child') && document.querySelector('.farm-count').innerHTML.includes('<svg') ;
    const before = JSON.stringify(j.settings.wardrobe);
    f.gold.left = 0.1; window.__sim(10);
    return { made, star, reward: j.quests.done.has('farmGoud'), wardrobe: JSON.stringify(j.settings.wardrobe) !== before, none: f.gold === null, golden: a?.golden };
  });
  check(gold.made && gold.star, 'af en toe komt er een gouden dier; de balk laat een ster zien');
  check(gold.reward && gold.wardrobe && gold.none && !gold.golden, 'blijft hij een tijd veilig, dan krijg je een schat (en een sticker)');
  const back = await run(() => {
    const j = window.__jippecraft, f = j.farm;
    window.__reset();
    f.pending.push({ type: 'cow', variant: null, left: 0.1, golden: true }); window.__sim(8);
    return { gold: !!f.gold, golden: f.gold?.a.golden, type: f.gold?.a.type };
  });
  check(back.gold && back.golden && back.type === 'cow', 'een opgegeten gouden dier komt als gouden dier terug');

  // Raptors komen met z'n tweeën; een fakkel houdt ze weg
  const pack = await run(() => {
    const j = window.__jippecraft, f = j.farm;
    window.__reset(); f.raids = 12;
    const sp = j.world.spawnPoint();
    for (let i = 0; i < 3; i++) j.animals.spawn('chicken', sp.x + 4 + i, j.world.surfaceY(Math.floor(sp.x) + 4 + i, Math.floor(sp.z)) + 1, sp.z + (i - 1) * 2, 0).wild = false;
    j.player.setPos({ x: sp.x, y: j.world.surfaceY(Math.floor(sp.x), Math.floor(sp.z) - 42) + 1, z: sp.z - 42 });
    const act = window.__raid('raptor');
    return { n: act.length, types: act.map((r) => r.type).join(',') };
  });
  check(pack.n === 2 && pack.types === 'raptor,raptor', 'raptors komen met z\'n tweeën');

  // De pteranodon vliegt: zonder dak pakt hij een kip, met een dak niet
  const open = await visit('pteranodon', 'chicken', 'FENCE', 2, false);
  check(open.who === 'pteranodon' && open.eaten === 1, 'een pteranodon duikt van boven in een hok zonder dak en pakt de kip');
  const roofed = await visit('pteranodon', 'chicken', 'FENCE', 2, true);
  check(roofed.eaten === 0 && roofed.repelled === 1 && roofed.alive, 'met een dak boven het hok komt hij er niet bij: hij geeft het op');
  const dak = await run(() => window.__jippecraft.quests.done.has('farmDak'));
  check(dak, 'er is een sticker voor een pteranodon tegenhouden met een dak');

  // De T-rex slaat hout kapot, maar geen ijzer
  const wood = await visit('trex', 'cow', 'PLANKS', 2);
  check(wood.who === 'trex' && wood.hole >= 2, `de T-rex slaat een muur van planken kapot (${wood.hole} blokken weg; de koe kan dan wegrennen, hij at ${wood.eaten})`);
  const iron = await visit('trex', 'cow', 'IRON_BLOCK', 2);
  const rex = await run(() => window.__jippecraft.quests.done.has('farmRex'));
  check(iron.eaten === 0 && iron.hole === 0 && iron.repelled === 1 && iron.alive && rex, 'een muur van ijzer houdt hem tegen (en je krijgt een sticker)');
  await context.close();
}
