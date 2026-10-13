// Fase 7B: Boerderij in Gevaar. Een wereld waarin roofdieren dieren van je boerderij komen halen:
// ze sluipen aan, pakken een dier, gaan weg en komen later terug; opgegeten dieren komen terug;
// een hek houdt ze tegen; Jippe jaagt ze weg; dieren volgen eten. Beeldje voor beeldje.

export async function testPhase7B({ newPage, check, out }) {
  const { context, page } = await newPage();
  const run = (fn, arg) => page.evaluate(fn, arg);

  check(await page.locator('.world-choices .choice.farm').count() === 1, 'bij "Nieuwe wereld" staat een kaart "Boerderij"');
  await run(async () => {
    const j = window.__jippecraft;
    await j.newWorld(1, 'farm');
    j.playing = false;
    window.__sim = (n) => {
      const inp = { move: { x: 0, y: 0 }, jump: false, down: false, sprint: false };
      for (let i = 0; i < n; i++) { window.__now = (window.__now || 100) + 1 / 30; j.player.update(1 / 30, inp, j.world, window.__now); j.farm.update(1 / 30); j.animals.update(1 / 30, j.world, j.player); }
    };
    // Alles leeg en de teller op nul, zodat elk proefje opnieuw begint
    window.__reset = () => {
      const f = j.farm;
      for (const a of [...j.animals.list]) j.animals.remove(a);
      f.active.length = 0; f.pending.length = 0; f.cool = 9999; f.eaten = 0; f.repelled = 0; f.booLeft = 0;
    };
    // Een bezoek laten beginnen (het zoeken naar een plek kan soms even duren)
    window.__raid = () => { const f = j.farm; for (let k = 0; k < 30 && !f.active.length; k++) { f.cool = 0; window.__sim(2); } return f.active[0]; };
  });
  const start = await run(async () => {
    const { ITEM, B } = await import('./js/blocks.js');
    const j = window.__jippecraft, prey = j.animals.list.filter((a) => ['cow', 'pig', 'sheep', 'chicken', 'rabbit'].includes(a.type));
    return { type: j.world.type, farm: !!j.farm, bar: !!document.querySelector('.farm-bar'), boo: !!document.querySelector('.storm-boo'), prey: prey.length,
      kit: j.hotbar[0] === B.FENCE && j.hotbar[1] === B.GATE && j.hotbar.includes(ITEM.WHEAT_SEEDS) && j.hotbar.includes(B.HAY),
      predators: j.animals.predators, chest: getComputedStyle(document.querySelector('.slot.chest')).display !== 'none', preyTypes: j.animals.preyTypes?.has('cow') };
  });
  check(start.type === 'farm' && start.farm && start.bar && start.boo, 'een nieuwe boerderij-wereld: balk met dieren en klok, en een BOE-knop');
  check(start.prey >= 12 && start.kit && start.chest, `je begint met ${start.prey} boerderijdieren, een hek, poort en hooi, en de kist met alle blokken`);
  check(start.predators === false && start.preyTypes, 'de roofdieren zijn niet zomaar los: alleen de regie van de boerderij laat ze komen');
  await page.screenshot({ path: out + '/7b-start.png' });

  // Een bezoek: een vos sluipt aan, pakt een dier, gaat weg; het dier komt terug
  const raid = await run(() => {
    const j = window.__jippecraft, f = j.farm, p = j.player;
    for (const a of [...j.animals.list]) if (['cow', 'pig', 'sheep'].includes(a.type)) j.animals.remove(a); // een vos pakt kippen en konijnen
    const before = j.animals.list.length;
    const sp = j.world.spawnPoint();
    p.setPos({ x: sp.x, y: j.world.surfaceY(Math.floor(sp.x), Math.floor(sp.z) - 45) + 1, z: sp.z - 45 }); // ver weg, zodat hij niet schrikt
    const r = window.__raid();
    const first = { type: r?.type, phase: r?.phase, far: r && Math.hypot(r.a.x - p.x, r.a.z - p.z) };
    f.render();
    const arrow = !document.querySelector('.farm-arrow').hidden, alarm = document.querySelector('.farm-bar').classList.contains('alarm');
    const phases = [];
    for (let i = 0; i < 30 * 120 && f.active.length; i++) { window.__sim(1); const ph = f.active[0]?.phase; if (ph && phases[phases.length - 1] !== ph) phases.push(ph); }
    window.__sim(5); f.render();
    return { first, arrow, alarm, phases, eaten: f.eaten, pending: f.pending.length, raids: f.raids, left: j.animals.list.filter((a) => a.raider).length,
      fewer: before - j.animals.list.length, back: document.querySelector('.farm-back')?.textContent, cool: f.cool };
  });
  check(raid.first.type === 'fox' && raid.first.phase === 'aantocht' && raid.first.far > 22, 'het eerste roofdier is een vos; hij begint ver weg');
  check(raid.arrow && raid.alarm, 'een pijl wijst naar het roofdier en de balk waarschuwt');
  check(raid.phases.join('>') === 'aantocht>sluipen>jacht>eten>weg', `hij sluipt aan, jaagt, eet en gaat weg (${raid.phases.join(' > ')})`);
  check(raid.eaten === 1 && raid.pending === 1 && raid.fewer === 1 && raid.left === 0 && raid.raids === 1, 'hij pakt precies één dier en verdwijnt dan; er is één bezoek geweest');
  check(raid.back === '+1' && raid.cool > 30, 'de balk laat zien dat er één dier terugkomt, en het volgende bezoek duurt een tijd');
  const back = await run(async () => {
    const j = window.__jippecraft, f = j.farm, n = j.animals.list.length;
    f.pending[0].left = 0.1; window.__sim(10);
    return { more: j.animals.list.length - n, pending: f.pending.length, sticker: j.quests.done.has('farmTerug') };
  });
  check(back.more === 1 && back.pending === 0, 'het opgegeten dier komt weer terug');
  check(back.sticker, 'er is een sticker voor een dier dat terugkomt');

  // Een hek houdt hem tegen: hij loopt rondjes en geeft het op
  const fence = await run(async () => {
    const { B } = await import('./js/blocks.js');
    const j = window.__jippecraft, f = j.farm, w = j.world, p = j.player;
    window.__reset();
    const sp = w.spawnPoint(), x0 = Math.floor(sp.x), z0 = Math.floor(sp.z) + 6, y = w.surfaceY(x0, z0) + 1;
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
      w.set(x0 + dx, y - 1, z0 + dz, B.GRASS);
      for (let dy = 0; dy < 4; dy++) w.set(x0 + dx, y + dy, z0 + dz, Math.abs(dx) === 2 || Math.abs(dz) === 2 ? (dy < 2 ? B.FENCE : 0) : 0);
    }
    const hen = j.animals.spawn('chicken', x0 + 0.5, y, z0 + 0.5, 0); hen.wild = false;
    p.setPos({ x: sp.x, y: w.surfaceY(Math.floor(sp.x), Math.floor(sp.z) - 40) + 1, z: sp.z - 40 }); // ver weg, zodat hij niet schrikt
    const r = window.__raid();
    for (let i = 0; i < 30 * 120 && f.active.length; i++) window.__sim(1);
    return { started: !!r, alive: j.animals.list.includes(hen), eaten: f.eaten, repelled: f.repelled, sticker: j.quests.done.has('farmOpgeven') };
  });
  check(fence.started && fence.alive && fence.eaten === 0, 'een kip achter een hek van 2 hoog wordt niet gepakt');
  check(fence.repelled === 1 && fence.sticker, `het roofdier geeft het op, en er is een sticker voor een roofdier tegenhouden (${fence.repelled} keer opgegeven, sticker ${fence.sticker})`);

  // Jippe jaagt hem weg: erheen lopen, of BOE roepen (en daarna opladen)
  const scare = await run(() => {
    const j = window.__jippecraft, f = j.farm, p = j.player, w = j.world;
    window.__reset();
    const sp = w.spawnPoint(), x = Math.floor(sp.x), z = Math.floor(sp.z);
    p.setPos({ x: sp.x, y: w.surfaceY(x, z) + 1, z: sp.z });
    for (let i = 0; i < 3; i++) j.animals.spawn('chicken', sp.x + 8 + i, w.surfaceY(x + 8 + i, z) + 1, sp.z + 4, 0).wild = false;
    const r = window.__raid();
    // dichtbij komen (en bij hem blijven)
    for (let i = 0; i < 30 * 3; i++) { if (r.phase === 'aantocht') p.setPos({ x: r.a.x + 3, y: r.a.y, z: r.a.z }); window.__sim(1); }
    const near = r.phase;
    for (let i = 0; i < 30 * 12 && f.active.length; i++) window.__sim(1);
    const gone = f.active.length === 0, eaten1 = f.eaten;
    // BOE
    f.booLeft = 0;
    const r2 = window.__raid();
    p.setPos({ x: r2.a.x + 9, y: r2.a.y, z: r2.a.z });
    const n = f.boo();
    const after = r2.phase, again = f.boo(), cool = f.booLeft;
    window.__sim(1); f.render();
    return { near, gone, n, after, again, cool, busy: !document.querySelector('.storm-boo').classList.contains('ready'), eaten: f.eaten + eaten1,
      weg: j.quests.done.has('farmWeg'), boo: j.quests.done.has('boe') };
  });
  check(scare.near === 'verjaagd' && scare.gone && scare.eaten === 0, `als Jippe dichtbij komt, rent het roofdier weg en pakt niets (${scare.near}, weg: ${scare.gone}, gepakt: ${scare.eaten})`);
  check(scare.n === 1 && scare.after === 'verjaagd' && scare.again === 0 && scare.busy && scare.cool > 14, 'BOE! jaagt het roofdier weg; daarna moet de knop opladen');
  check(scare.weg && scare.boo, 'stickers voor een roofdier wegjagen en voor BOE');

  // Lokken: dieren die het eten lusten lopen achter Jippe aan
  const lure = await run(async () => {
    const { ITEM } = await import('./js/blocks.js');
    const j = window.__jippecraft, p = j.player, w = j.world;
    window.__reset();
    const sp = w.spawnPoint(), x = Math.floor(sp.x), z = Math.floor(sp.z);
    p.setPos({ x: sp.x, y: w.surfaceY(x, z) + 1, z: sp.z });
    const herd = [['cow', 7, 3], ['cow', -7, 2], ['sheep', 6, -5], ['sheep', -6, -4], ['sheep', 3, 8], ['pig', 8, 0]].map(([t, dx, dz]) => {
      const a = j.animals.spawn(t, sp.x + dx, w.surfaceY(x + dx, z + dz) + 1, sp.z + dz, 0); a.wild = false; return a;
    });
    const eaters = herd.slice(0, 5); // (het varken lust geen zaadjes)
    const dist = () => eaters.reduce((m, a) => m + Math.hypot(a.x - p.x, a.z - p.z), 0) / eaters.length;
    const d0 = dist();
    j.animals.lure = ITEM.WHEAT_SEEDS; // zaadjes in je hand: koeien en schapen lusten ze, een varken niet
    window.__sim(30 * 12);
    const followers = herd.filter((a) => a.lured).map((a) => a.type);
    const pigStays = !herd[5].lured;
    j.animals.lure = null; window.__sim(30);
    return { d0, d1: dist(), followers, pigStays, loose: herd.every((a) => !a.lured), sticker: j.quests.done.has('farmLok') };
  });
  check(lure.followers.length === 5 && lure.pigStays && lure.d1 < Math.min(4, lure.d0 * 0.6), `met zaadjes in je hand lopen koeien en schapen achter je aan (${lure.d0.toFixed(1)} → ${lure.d1.toFixed(1)} blokken), een varken niet`);
  check(lure.loose && lure.sticker, 'laat je het eten los, dan lopen ze weer hun gang; vijf gelokte dieren geeft een sticker');

  // Bewaren: de boerderij blijft zoals hij was, en een bezoek zelf wordt niet bewaard
  const save = await run(() => {
    const j = window.__jippecraft, f = j.farm;
    window.__reset();
    f.pending.push({ type: 'cow', variant: null, left: 33 }); f.raids = 5;
    const sp = j.world.spawnPoint();
    j.player.setPos({ x: sp.x, y: j.world.surfaceY(Math.floor(sp.x), Math.floor(sp.z)) + 1, z: sp.z });
    j.animals.spawn('chicken', sp.x + 5, j.world.surfaceY(Math.floor(sp.x) + 5, Math.floor(sp.z)) + 1, sp.z, 0).wild = false; // iets voor de vos
    window.__raid();
    const raider = j.animals.list.some((a) => a.raider);
    const s = JSON.parse(JSON.stringify(j.makeSave()));
    return { raider, farm: s.farm, raidersSaved: s.animals.some((a) => ['fox', 'lioness'].includes(a.type)), type: s.type };
  });
  check(save.raider && !save.raidersSaved && save.type === 'farm', 'een roofdier dat op bezoek is wordt niet mee bewaard');
  check(save.farm.raids === 5 && save.farm.pending.length === 1 && save.farm.pending[0].type === 'cow', 'het aantal bezoeken en de dieren die nog terugkomen worden bewaard');
  const loaded = await run(() => {
    const j = window.__jippecraft;
    const s = JSON.parse(JSON.stringify(j.makeSave()));
    j.applySave(s, new Map());
    return { raids: j.farm?.raids, pending: j.farm?.pending.length, active: j.farm?.active.length, bars: document.querySelectorAll('.farm-bar').length };
  });
  check(loaded.raids === 5 && loaded.pending === 1 && loaded.active === 0 && loaded.bars === 1, 'na het laden loopt de boerderij verder (en er is maar één balk)');

  // Een andere wereld: geen boerderij meer, roofdieren weer zoals altijd
  const left = await run(async () => {
    const j = window.__jippecraft;
    await j.newWorld(1, 'island');
    return { farm: j.farm, bar: !!document.querySelector('.farm-bar'), boo: !!document.querySelector('.storm-boo'), types: j.animals.preyTypes, predators: j.animals.predators, setting: j.settings.predators };
  });
  check(left.farm === null && !left.bar && !left.boo && left.types === null && left.predators === left.setting, 'in een gewone wereld is de boerderij weg en jagen de roofdieren weer zoals ingesteld');
  await context.close();
}
