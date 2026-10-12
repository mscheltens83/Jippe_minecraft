// Fase 6C: in de Wilde Nacht slopen sommige dieren muren, vallen torens om, springen en klimmen
// dieren over muren, komen vliegers van boven, en jaagt de BOE-knop ze weg. Beeldje voor beeldje.
import { waitTrue } from './helpers.mjs';

export async function testPhase6C({ newPage, check, out }) {
  const { context, page } = await newPage();
  const run = (fn, arg) => page.evaluate(fn, arg);
  await page.locator('.storm-menu-btn').tap();
  check(await waitTrue(page, () => window.__jippecraft.storm?.phase === 'dag', null, 20000), 'de Wilde Nacht begint');
  check(await page.locator('.storm-boo').isVisible(), 'er is een BOE-knop');

  // Voorbereiden: nacht, een vlak stuk zonder dieren, en een hulpje om een proefje te doen
  await run(async () => {
    const { B } = await import('./js/blocks.js');
    const j = window.__jippecraft, s = j.storm, p = j.player, w = j.world;
    j.playing = false;
    s.left = 0.01; s.update(0.05);
    s.scareAt = 1e9; // geen schrikmomenten tijdens deze proefjes
    window.__B = B;
    window.__sim = (n) => {
      const inp = { move: { x: 0, y: 0 }, jump: false, down: false, sprint: false };
      for (let i = 0; i < n; i++) {
        window.__now = (window.__now || 100) + 1 / 30;
        p.update(1 / 30, inp, w, window.__now); s.update(1 / 30); j.animals.update(1 / 30, w, p); j.physics.updateFalling(1 / 30);
      }
    };
    // Een proefveld: vlak, leeg; de speler in het midden. room(block, roof): een huisje van 5 x 5 om de speler
    window.__field = (block = 0, roof = true, height = 3) => {
      for (const a of s.animals()) j.animals.remove(a);
      s.hearts = 5; s.invuln = 0; s.left = 120; s.booLeft = 0; s.phase = 'nacht'; s.endEl.hidden = true;
      const x0 = Math.floor(s.center.x), z0 = Math.floor(s.center.z), y0 = w.surfaceY(x0, z0) + 1;
      for (let dx = -14; dx <= 14; dx++) for (let dz = -14; dz <= 14; dz++) {
        w.set(x0 + dx, y0 - 1, z0 + dz, B.GRASS);
        for (let dy = 0; dy < 10; dy++) w.set(x0 + dx, y0 + dy, z0 + dz, 0);
      }
      if (block) for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) for (let dy = 0; dy <= height; dy++) {
        const edge = Math.abs(dx) === 2 || Math.abs(dz) === 2;
        if ((dy < height && edge) || (dy === height && roof)) w.set(x0 + dx, y0 + dy, z0 + dz, block);
      }
      p.setPos({ x: x0 + 0.5, y: y0, z: z0 + 0.5 }); p.vx = p.vy = p.vz = 0;
      return { x0, y0, z0 };
    };
    window.__animal = (type, dx, dz) => {
      const { x0, y0, z0 } = { x0: Math.floor(s.center.x), z0: Math.floor(s.center.z), y0: Math.floor(p.y) };
      const a = j.animals.spawn(type, x0 + dx + 0.5, y0, z0 + dz + 0.5, 0);
      a.storm = true; return a;
    };
  });

  // Een varken sloopt een muur van aarde, maar niet van hout; een olifant ook hout, de T-rex ook steen
  const bash = await run(() => {
    const B = window.__B, j = window.__jippecraft, s = j.storm, out = {};
    for (const [type, block, steps] of [['pig', B.DIRT, 300], ['pig', B.PLANKS, 300], ['elephant', B.PLANKS, 400], ['elephant', B.COBBLE, 300], ['trex', B.COBBLE, 700]]) {
      window.__field(block);
      window.__animal(type, 6, 0);
      const before = s.broken || 0;
      let cracked = false;
      let i = 0;
      for (; i < steps && (s.broken || 0) === before; i++) { window.__sim(1); if ([...s.damage.values()].some((d) => d.mesh)) cracked = true; }
      const broke = (s.broken || 0) > before;
      // daarna: maakt hij het gat groot genoeg voor zijn hele lijf en komt hij binnen?
      for (; broke && i < steps && s.hearts === 5; i++) window.__sim(1);
      out[`${type}-${block}`] = { broke, cracked, hearts: s.hearts, inside: s.hearts < 5 ? i / 30 : null };
    }
    return out;
  });
  const B = await run(() => ({ DIRT: window.__B.DIRT, PLANKS: window.__B.PLANKS, COBBLE: window.__B.COBBLE }));
  check(bash[`pig-${B.DIRT}`].broke && bash[`pig-${B.DIRT}`].cracked, 'een varken beukt een muur van aarde kapot (eerst met scheurtjes)');
  check(!bash[`pig-${B.PLANKS}`].broke && bash[`pig-${B.PLANKS}`].hearts === 5, 'een muur van hout houdt een varken tegen');
  check(bash[`elephant-${B.PLANKS}`].broke && !bash[`elephant-${B.COBBLE}`].broke, 'een olifant sloopt hout, maar geen steen');
  check(bash[`trex-${B.COBBLE}`].broke, 'de T-rex sloopt zelfs steen');
  const pigIn = bash[`pig-${B.DIRT}`].inside, eleIn = bash[`elephant-${B.PLANKS}`].inside;
  check(pigIn !== null && pigIn < 6 && eleIn !== null && eleIn < 15,
    `een sloper beukt een gat waar hij helemaal doorheen past en komt snel binnen (varken ${pigIn?.toFixed(1)} s, olifant ${eleIn?.toFixed(1)} s)`);

  // Jippe repareert: een beschadigd blok vervangen maakt het weer heel
  const repair = await run(() => {
    const B = window.__B, j = window.__jippecraft, s = j.storm;
    window.__field(B.PLANKS);
    window.__animal('elephant', 6, 0);
    for (let i = 0; i < 400 && !s.damage.size; i++) window.__sim(1);
    const [d] = s.damage.values();
    if (!d) return { damaged: false };
    // zoals Jippe het doet: slopen en een nieuw blok neerzetten
    j.apply([{ x: d.x, y: d.y, z: d.z, from: B.PLANKS, to: 0 }]);
    j.apply([{ x: d.x, y: d.y, z: d.z, from: 0, to: B.PLANKS }]);
    window.__sim(1);
    return { damaged: true, healed: !s.damage.has(`${d.x},${d.y},${d.z}`) };
  });
  check(repair.damaged && repair.healed, 'een beschadigd blok vervangen maakt het weer helemaal heel');

  // Onder de grond: een varken of konijn graaft zich door een dak van aarde naar Jippe toe, niet door steen
  const dig = await run(() => {
    const B = window.__B, j = window.__jippecraft, s = j.storm, p = j.player, w = j.world, out = {};
    for (const [type, roof] of [['pig', B.DIRT], ['rabbit', B.DIRT], ['pig', B.COBBLE]]) {
      const { x0, y0, z0 } = window.__field(0);
      // een kelder van 3 x 3, 2 hoog, 2 blokken onder de grond (dak: gras met daaronder `roof`)
      for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
        w.set(x0 + dx, y0 - 2, z0 + dz, roof);
        for (let dy = -4; dy <= -3; dy++) w.set(x0 + dx, y0 + dy, z0 + dz, Math.abs(dx) === 2 || Math.abs(dz) === 2 ? B.COBBLE : 0);
        w.set(x0 + dx, y0 - 5, z0 + dz, B.COBBLE);
      }
      p.setPos({ x: x0 + 0.5, y: y0 - 4, z: z0 + 0.5 });
      const a = j.animals.spawn(type, x0 + 3.5, y0, z0 + 0.5, 0); a.storm = true; // bovengronds, naast de kelder
      let i = 0;
      for (; i < 1200 && s.hearts === 5; i++) window.__sim(1);
      out[`${type}-${roof}`] = s.hearts < 5;
      out[`${type}-${roof}-t`] = i / 30;
    }
    return out;
  });
  const DIRT = await run(() => window.__B.DIRT), COBBLE = await run(() => window.__B.COBBLE);
  check(dig[`pig-${DIRT}`] && dig[`rabbit-${DIRT}`], 'onder de grond: een varken en een konijn graven zich door aarde naar je toe');
  check(!dig[`pig-${COBBLE}`], 'een kelder met een stenen dak houdt een varken tegen');
  check(dig[`pig-${DIRT}-t`] < 8 && dig[`rabbit-${DIRT}-t`] < 6,
    `door aarde graven gaat snel (varken ${dig[`pig-${DIRT}-t`].toFixed(1)} s, konijn ${dig[`rabbit-${DIRT}-t`].toFixed(1)} s)`);
  // Een gang onder de grond: een konijn graaft van opzij door de aarde naar je toe (een varken ook)
  const tunnel = await run(() => {
    const B = window.__B, j = window.__jippecraft, s = j.storm, p = j.player, w = j.world, out = {};
    for (const type of ['rabbit', 'pig']) {
      const { x0, y0, z0 } = window.__field(0);
      for (let dx = -8; dx <= 8; dx++) for (let dz = -3; dz <= 3; dz++) for (let dy = -6; dy <= -1; dy++) w.set(x0 + dx, y0 + dy, z0 + dz, B.DIRT);
      for (let dy = -4; dy <= -3; dy++) w.set(x0, y0 + dy, z0, 0);
      p.setPos({ x: x0 + 0.5, y: y0 - 4, z: z0 + 0.5 });
      const a = j.animals.spawn(type, x0 + 6.5, y0, z0 + 0.5, 0); a.storm = true;
      let i = 0;
      for (; i < 600 && s.hearts === 5; i++) window.__sim(1);
      out[type] = s.hearts < 5 ? i / 30 : null;
    }
    return out;
  });
  check(tunnel.rabbit !== null && tunnel.pig !== null, `ook een gang diep onder de grond is niet veilig voor gravers (konijn ${tunnel.rabbit?.toFixed(1)} s, varken ${tunnel.pig?.toFixed(1)} s)`);

  // Een smalle toren valt om als een varken de onderkant kapot beukt; Jippe valt mee
  const tower = await run(() => {
    const B = window.__B, j = window.__jippecraft, s = j.storm, p = j.player, w = j.world;
    const { x0, y0, z0 } = window.__field(0);
    for (let i = 0; i < 6; i++) w.set(x0, y0 + i, z0, B.DIRT);
    p.setPos({ x: x0 + 0.5, y: y0 + 6, z: z0 + 0.5 });
    window.__animal('pig', 4, 0);
    const top = p.y;
    for (let i = 0; i < 500 && !(s.collapsed > 0); i++) window.__sim(1);
    window.__sim(90);
    return { collapsed: s.collapsed || 0, fell: top - p.y, hearts: s.hearts };
  });
  check(tower.collapsed >= 4 && tower.fell >= 3, `de toren valt om en Jippe valt mee (${tower.fell.toFixed(1)} blokken)`);
  check(tower.hearts < 5, 'van een omvallende toren vallen kost een hartje');

  // Een geit springt over een muur van 2 hoog (niet over 3); een aap klimt er gewoon overheen
  const jump = await run(() => {
    const B = window.__B, j = window.__jippecraft, w = j.world, out = {};
    for (const [type, h] of [['goat', 2], ['goat', 3], ['monkey', 3]]) {
      const { x0, y0, z0 } = window.__field(0);
      for (let dz = -14; dz <= 14; dz++) for (let dy = 0; dy < h; dy++) w.set(x0 + 3, y0 + dy, z0 + dz, B.COBBLE);
      const a = window.__animal(type, 7, 0);
      window.__sim(240);
      out[`${type}${h}`] = a.x < x0 + 3;
    }
    return out;
  });
  check(jump.goat2 && !jump.goat3, 'een geit springt over een muur van 2 hoog, maar niet over 3');
  check(jump.monkey3, 'een aap klimt over een muur van 3 hoog');

  // Vliegers: buiten pakken ze je; in een huis met een dak niet (dan cirkelen ze erboven)
  const fly = await run(() => {
    const B = window.__B, j = window.__jippecraft, s = j.storm, p = j.player;
    window.__field(0);
    window.__animal('parrot', 8, 0);
    for (let i = 0; i < 300 && s.hearts === 5; i++) window.__sim(1);
    const outside = s.hearts < 5;
    window.__field(B.COBBLE, true);
    const owl = window.__animal('parrot', 8, 0);
    window.__sim(300);
    return { outside, roofSafe: s.hearts === 5, above: owl.y > p.y + 2 };
  });
  check(fly.outside, 'buiten duikt een vlieger op je af');
  check(fly.roofSafe && fly.above, 'met een dak boven je hoofd kan een vlieger je niet pakken (hij cirkelt erboven)');

  // Kleine dieren durven niet bij een fakkel
  const torch = await run(() => {
    const B = window.__B, j = window.__jippecraft, s = j.storm, p = j.player, w = j.world;
    const { x0, y0, z0 } = window.__field(0);
    w.set(x0 + 2, y0, z0, B.TORCH);
    const c = window.__animal('chicken', 9, 0);
    window.__sim(300);
    return { kept: Math.hypot(c.x - p.x, c.z - p.z) > 3, hearts: s.hearts };
  });
  check(torch.kept && torch.hearts === 5, 'een kip durft niet in het licht van een fakkel');

  // BOE! De dieren dichtbij rennen weg; daarna moet de knop opladen
  const boo = await run(() => {
    const j = window.__jippecraft, s = j.storm, p = j.player;
    window.__field(0);
    const lion = window.__animal('lion', 4, 0);
    const n = s.boo();
    const d0 = Math.hypot(lion.x - p.x, lion.z - p.z);
    window.__sim(60);
    const away = Math.hypot(lion.x - p.x, lion.z - p.z) - d0 > 3;
    const again = s.boo();
    const busy = !document.querySelector('.storm-boo').classList.contains('ready');
    window.__sim(30 * 16);
    return { n, away, again, busy, ready: document.querySelector('.storm-boo').classList.contains('ready') };
  });
  check(boo.n === 1 && boo.away, 'BOE! de leeuw schrikt en rent weg');
  check(boo.again === 0 && boo.busy && boo.ready, 'daarna moet de BOE-knop eerst opladen');
  await page.screenshot({ path: out + '/6c-boe.png' });
  await run(() => window.__jippecraft.openMenu());
  check(await waitTrue(page, () => !window.__jippecraft.storm && !document.querySelector('.storm-boo'), null, 20000), 'stoppen haalt de BOE-knop weg');
  await context.close();
}
