// Fase 7C: over een hek, door de aarde of er doorheen. Roofdieren die een hok binnendringen (springen,
// graven), bang voor fakkels, en dieren die uit hun hok proberen te ontsnappen. Beeldje voor beeldje.
export async function testPhase7C({ newPage, check }) {
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
      f.endEscape(); f.active.length = 0; f.pending.length = 0; f.cool = 9999; f.escapeCool = 9999; f.eaten = 0; f.repelled = 0; f.booLeft = 0; f.raids = 0; f.escaped = 0;
    };
    // Een hok van 3 x 3 binnenin (muur van `block`, `n` hoog) rond (x0, z0), met een dier erin; Jippe ver weg
    window.__pen = (type, block, n, torch = false, far = 40) => {
      const w = j.world, sp = w.spawnPoint(), x0 = Math.floor(sp.x), z0 = Math.floor(sp.z) + 8, y = w.surfaceY(x0, z0) + 1;
      for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) {
        w.set(x0 + dx, y - 1, z0 + dz, B.GRASS);
        for (let dy = 0; dy < 6; dy++) w.set(x0 + dx, y + dy, z0 + dz, 0);
        if (Math.abs(dx) === 2 || Math.abs(dz) === 2) { if (Math.abs(dx) <= 2 && Math.abs(dz) <= 2) for (let dy = 0; dy < n; dy++) w.set(x0 + dx, y + dy, z0 + dz, block); }
      }
      if (torch) w.set(x0, y, z0, B.TORCH); // een fakkel in het midden: op het hek zelf is hij nog binnen 3 blokken
      const a = j.animals.spawn(type, x0 + (torch ? 1.5 : 0.5), y, z0 + 0.5, 0); a.wild = false;
      j.player.setPos({ x: sp.x, y: w.surfaceY(Math.floor(sp.x), Math.floor(sp.z) - far) + 1, z: sp.z - far });
      return { a, x0, z0, y };
    };
    window.__raid = () => { const f = j.farm; for (let k = 0; k < 40 && !f.active.length; k++) { f.cool = 0; window.__sim(2); } return f.active[0]; };
    window.__visit = (max = 120) => { const f = j.farm; for (let i = 0; i < 30 * max && f.active.length; i++) window.__sim(1); };
  });
  // een roofdier-bezoek op een dier in een hok: { eaten, repelled, hole }
  const visit = (type, block, n, raids = 0, torch = false) => run(([type, block, n, raids, torch]) => {
    const j = window.__jippecraft, f = j.farm, B = window.__B;
    window.__reset();
    f.raids = raids;
    const pen = window.__pen(type, B[block], n, torch);
    const r = window.__raid();
    const who = r?.type;
    window.__visit();
    const w = j.world;
    let hole = 0; for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) if ((Math.abs(dx) === 2 || Math.abs(dz) === 2) && w.get(pen.x0 + dx, pen.y, pen.z0 + dz) === 0) hole++;
    return { who, eaten: f.eaten, repelled: f.repelled, hole, alive: j.animals.list.includes(pen.a), light: j.quests.done.has('farmLicht') };
  }, [type, block, n, raids, torch]);

  // Een leeuwin springt over een hek (1,5), maar niet over een dubbel hek
  const low = await visit('pig', 'FENCE', 1, 3);
  check(low.who !== 'fox' && low.eaten === 1, `een leeuwin(of leeuw) springt over een laag hek en pakt het varken (${low.who})`);
  const high = await visit('pig', 'FENCE', 2, 3);
  check(high.eaten === 0 && high.repelled === 1 && high.alive, 'over een dubbel hek (2,5 hoog) komt hij niet: hij geeft het op');

  // Een vos graaft door een muur van aarde, maar niet door hout of een fakkel
  const dirt = await visit('chicken', 'DIRT', 2);
  check(dirt.who === 'fox' && dirt.eaten === 1 && dirt.hole >= 1, `een vos graaft zich door een muur van aarde heen (${dirt.hole} blokken weg)`);
  const wood = await visit('chicken', 'PLANKS', 2);
  check(wood.eaten === 0 && wood.hole === 0 && wood.alive, 'een muur van planken (2 hoog) houdt de vos tegen');
  const torch = await visit('chicken', 'FENCE', 2, 0, true);
  check(torch.eaten === 0 && torch.repelled >= 1 && torch.light, 'bij een fakkel durft de vos niet te komen (en je krijgt er een sticker voor)');

  // Uitbrekers: een kip springt over een laag hek; in een hoog hok blijft hij
  const out = await run(() => {
    const j = window.__jippecraft, f = j.farm, B = window.__B;
    window.__reset();
    const pen = window.__pen('chicken', B.FENCE, 1, false, 24);
    f.escapeCool = 0; window.__sim(2);
    const e = f.escape, started = e ? { type: e.type, kind: e.best.kind, phase: e.phase } : null;
    const marker = j.particles.warnings.has(pen.a);
    for (let i = 0; i < 30 * 20 && f.escape; i++) window.__sim(1);
    const d = Math.hypot(pen.a.x - (pen.x0 + 0.5), pen.a.z - (pen.z0 + 0.5));
    return { started, marker, dist: d, escaped: f.escaped, markerAfter: j.particles.warnings.has(pen.a) };
  });
  check(out.started?.type === 'chicken' && out.started.kind === 'jump' && out.started.phase === 'wachten' && out.marker, 'een kip in een laag hok wil ontsnappen: hij gaat springen en krijgt een uitroepteken');
  check(out.escaped === 1 && out.dist > 3 && !out.markerAfter, `hij springt eruit en staat buiten het hok (${out.dist.toFixed(1)} blokken)`);
  const closed = await run(() => {
    const j = window.__jippecraft, f = j.farm, B = window.__B;
    window.__reset();
    window.__pen('chicken', B.FENCE, 2, false, 24);
    let started = false;
    for (let k = 0; k < 6; k++) { f.escapeCool = 0; window.__sim(2); if (f.escape) started = true; }
    return started;
  });
  check(!closed, 'in een hok met een dubbel hek wil niets ontsnappen');
  // Jippe repareert op tijd: een tweede hek erbovenop
  const fix = await run(() => {
    const j = window.__jippecraft, f = j.farm, B = window.__B, w = j.world;
    window.__reset();
    const pen = window.__pen('chicken', B.FENCE, 1, false, 24);
    f.escapeCool = 0; window.__sim(2);
    const e = f.escape;
    const [bx, bz] = e.best.edge.at;
    w.set(bx, pen.y + 1, bz, B.FENCE); w.set(bx, pen.y + 2, bz, B.FENCE); // de zwakke plek hoger maken
    for (let i = 0; i < 30 * 12 && f.escape; i++) window.__sim(1);
    const d = Math.hypot(pen.a.x - (pen.x0 + 0.5), pen.a.z - (pen.z0 + 0.5));
    return { dist: d, escaped: f.escaped, sticker: j.quests.done.has('farmDicht') };
  });
  check(fix.escaped === 0 && fix.dist < 2.5 && fix.sticker, `maak je de zwakke plek op tijd hoger, dan blijft de kip erin, en je krijgt een sticker (afstand ${fix.dist.toFixed(1)}, ontsnapt ${fix.escaped}, sticker ${fix.sticker})`);
  // een varken beukt een muur van aarde kapot, een konijn graaft
  const dirtPen = async (type) => run((type) => {
    const j = window.__jippecraft, f = j.farm, B = window.__B;
    window.__reset();
    const pen = window.__pen(type, B.DIRT, 2, false, 24);
    f.escapeCool = 0; window.__sim(2);
    const kind = f.escape?.best.kind;
    for (let i = 0; i < 30 * 25 && f.escape; i++) window.__sim(1);
    const d = Math.hypot(pen.a.x - (pen.x0 + 0.5), pen.a.z - (pen.z0 + 0.5));
    return { kind, out: d > 3, escaped: f.escaped };
  }, type);
  const pig = await dirtPen('pig'), rabbit = await dirtPen('rabbit');
  check(pig.kind === 'bash' && pig.out, 'een varken beukt een muur van aarde kapot en loopt eruit');
  check(rabbit.kind === 'dig' && rabbit.out, 'een konijn graaft onder een muur van aarde uit');
  await context.close();
}
