// Fase 6D: de Wilde Nacht in golven, met je eigen (beperkte) bouwstenen die je per nacht verdient,
// en stickers. Beeldje voor beeldje, zoals in 6A.
import { waitTrue } from './helpers.mjs';

export async function testPhase6D({ newPage, check, out }) {
  const { context, page } = await newPage();
  const run = (fn, arg) => page.evaluate(fn, arg);
  const own = await run(() => JSON.stringify(window.__jippecraft.hotbar));
  await page.locator('.storm-menu-btn').tap();
  check(await waitTrue(page, () => window.__jippecraft.storm?.phase === 'dag', null, 20000), 'de Wilde Nacht begint');

  // Je eigen bouwstenen: een onderbalk met aantallen, en geen kist
  const stock = await run(async () => {
    const { STOCK_ITEMS, START_STOCK } = await import('./js/storm.js');
    const j = window.__jippecraft;
    j.playing = false;
    const counts = [...document.querySelectorAll('.hotbar .slot:not(.chest) .count')].map((e) => Number(e.textContent));
    j.openChest();
    return { hotbar: JSON.stringify(j.hotbar) === JSON.stringify(STOCK_ITEMS), counts, want: STOCK_ITEMS.map((id) => START_STOCK[id] || 0),
      chestHidden: getComputedStyle(document.querySelector('.slot.chest')).display === 'none', paletteClosed: !j.ui.paletteOpen };
  });
  check(stock.hotbar && JSON.stringify(stock.counts) === JSON.stringify(stock.want), 'je eigen bouwstenen staan in de onderbalk, met hoeveel je er hebt');
  check(stock.chestHidden && stock.paletteClosed, 'de kist met alle blokken doet niet mee');

  // Bouwen kost een blok, slopen geeft het terug; op is op; terugdoen kan niet
  const build = await run(async () => {
    const { B } = await import('./js/blocks.js');
    const j = window.__jippecraft, s = j.storm, p = j.player, w = j.world;
    const x = Math.floor(p.x) + 2, z = Math.floor(p.z), y = w.surfaceY(x, z);
    const ground = { x, y, z, id: w.get(x, y, z), nx: 0, ny: 1, nz: 0 };
    const before = s.stock[B.PLANKS];
    j.placeBlock(ground, B.PLANKS);
    const placed = w.get(x, y + 1, z) === B.PLANKS && s.stock[B.PLANKS] === before - 1;
    const shown = Number(document.querySelectorAll('.hotbar .slot .count')[1].textContent) === before - 1;
    j.undo();
    const noUndo = w.get(x, y + 1, z) === B.PLANKS;
    j.breakBlock({ x, y: y + 1, z, id: B.PLANKS, nx: 0, ny: 1, nz: 0 });
    const back = w.get(x, y + 1, z) === 0 && s.stock[B.PLANKS] === before;
    const dirt = s.stock[B.DIRT];
    j.breakBlock({ x: x + 1, y, z, id: w.get(x + 1, y, z), nx: 0, ny: 1, nz: 0 });
    const gotDirt = s.stock[B.DIRT] === dirt + 1;
    s.stock[B.GLASS] = 0;
    j.ui.setCounts(s.counts());
    j.placeBlock(ground, B.GLASS);
    const refused = w.get(x, y + 1, z) !== B.GLASS;
    return { placed, shown, noUndo, back, gotDirt, refused, empty: document.querySelectorAll('.hotbar .slot')[4].classList.contains('empty') };
  });
  check(build.placed && build.shown, 'bouwen kost een blok (en het aantal in de onderbalk gaat omlaag)');
  check(build.back && build.gotDirt, 'slopen geeft het blok terug; gras slopen geeft aarde');
  check(build.refused && build.empty, 'is een soort op, dan kun je er niet meer mee bouwen (het vakje wordt grijs)');
  check(build.noUndo, 'terugdoen met de terug-knop kan niet in de Wilde Nacht');

  // Golven: de eerste staat al klaar, de tweede en derde komen tijdens de nacht, en ze zijn feller
  const waves = await run(() => {
    const j = window.__jippecraft, s = j.storm, p = j.player, w = j.world;
    const inp = { move: { x: 0, y: 0 }, jump: false, down: false, sprint: false };
    window.__sim = (n) => { for (let i = 0; i < n; i++) { window.__now = (window.__now || 100) + 1 / 30; p.update(1 / 30, inp, w, window.__now); s.update(1 / 30); j.animals.update(1 / 30, w, p); } };
    s.scareAt = 1e9;
    const first = s.animals().length;
    s.left = 0.01; window.__sim(2);
    const total = s.left, counts = [first];
    // Iedereen even ver weg zetten, zodat Jippe niet gepakt wordt tijdens het wachten
    const away = () => { for (const a of s.animals()) { a.x = s.center.x + 30; a.z = s.center.z + 30; a.y = w.surfaceY(Math.floor(a.x), Math.floor(a.z)) + 1; } };
    s.left = total * 2 / 3 + 0.05; away(); window.__sim(3);
    counts.push(s.animals().length);
    const bar = document.querySelector('.storm-phase').textContent;
    s.left = total / 3 + 0.05; away(); window.__sim(3);
    counts.push(s.animals().length);
    const boost = Math.max(...s.animals().map((a) => a.waveBoost || 1));
    return { counts, sizes: s.waveSizes, wave: s.wave, bar, boost };
  });
  check(waves.counts[0] === waves.sizes[0] && waves.counts[1] > waves.counts[0] && waves.counts[2] > waves.counts[1] && waves.wave === 3,
    `de dieren komen in drie golven (${waves.counts.join(' → ')})`);
  check(/golf 2\/3/.test(waves.bar) && waves.boost > 1.2, 'de balk zegt welke golf het is, en de laatste golf is feller');

  // Overleefd: nieuwe bouwstenen als beloning, en een sticker
  const won = await run(async () => {
    const { B } = await import('./js/blocks.js');
    const j = window.__jippecraft, s = j.storm;
    for (const a of s.animals()) j.animals.remove(a);
    const planks = s.stock[B.PLANKS];
    s.left = 0.01; window.__sim(3); window.__sim(100);
    return { phase: s.phase, more: s.stock[B.PLANKS] > planks, reward: document.querySelectorAll('.storm-reward span').length,
      sticker: j.quests.done.has('nacht1') };
  });
  check(won.phase === 'overleefd' && won.more && won.reward >= 3, 'na een overleefde nacht verdien je nieuwe bouwstenen (en je ziet welke)');
  check(won.sticker, 'sticker: je eerste Wilde Nacht overleefd');
  await page.screenshot({ path: out + '/6d-beloning.png' });
  await page.locator('.storm-btn.next').tap();
  const boo = await run(() => {
    const j = window.__jippecraft, s = j.storm, p = j.player;
    const a = s.animals()[0]; a.x = p.x + 3; a.z = p.z;
    s.boo();
    return j.quests.done.has('boe');
  });
  check(boo, 'sticker: een dier weggejaagd met de BOE-knop');
  check(await run(async () => {
    const { QUESTS, QUEST_GROUPS } = await import('./js/quests.js');
    return QUEST_GROUPS.some((g) => g.key === 'wildeNacht') && QUESTS.filter((q) => q.groep === 'wildeNacht').length === 5;
  }), 'het stickerboek heeft een groep Wilde Nacht met vijf stickers');

  // Stoppen: je eigen onderbalk komt terug
  await run(() => window.__jippecraft.openMenu());
  await page.locator('.storm-end.pauze .storm-btn.stop').tap();
  check(await waitTrue(page, (want) => !window.__jippecraft.storm && JSON.stringify(window.__jippecraft.hotbar) === want && !document.querySelector('.hotbar .count'), own, 20000),
    'na het stoppen heb je je eigen onderbalk weer (zonder aantallen)');
  await context.close();
}
