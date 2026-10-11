// Fase 4D: licht per blok, dag en nacht, fakkels en lantaarns, en slapen in een bed.
import { waitTrue } from './helpers.mjs';

export async function testPhase4D({ newPage, check, out }) {
  const { context, page } = await newPage();
  const run = (fn, arg) => page.evaluate(fn, arg);
  const frames = (n = 3) => run((k) => new Promise((r) => { const f = () => (--k <= 0 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  await page.locator('.play-btn').tap();

  check(await run(() => { const j = window.__jippecraft; return j.daynight.sun === 1 && !j.scene.stars.visible; }),
    'een nieuwe wereld begint overdag, zonder sterren');

  // ---------- een dichte grot onder de bouwplek ----------
  const cave = await run(() => {
    const j = window.__jippecraft, w = j.world, x0 = 40, z0 = 40, y = w.surfaceY(44, 44) - 14;
    for (let x = x0 - 1; x <= x0 + 13; x++) for (let z = z0 - 1; z <= z0 + 9; z++) for (let yy = y - 1; yy <= y + 4; yy++) w.set(x, yy, z, 3);
    for (let x = x0; x <= x0 + 12; x++) for (let z = z0; z <= z0 + 8; z++) for (let yy = y; yy <= y + 3; yy++) w.set(x, yy, z, 0);
    return { x0, z0, y };
  });
  await frames(4);
  check(await run(({ x0, z0, y }) => window.__jippecraft.world.lightAt(x0 + 4, y, z0 + 4) === 0, cave),
    'in een grot zonder fakkels is het donker (geen zon, geen lamp)');

  // Fakkel op de grens van twee chunks (x = 47 | 48)
  const torch = await run(({ y, z0 }) => {
    const j = window.__jippecraft, w = j.world, x = 47, z = z0 + 4;
    j.world.dirtySections.clear();
    j.hotbar[j.sel] = 121;
    j.placeBlock({ x, y: y - 1, z, nx: 0, ny: 1, nz: 0, id: w.get(x, y - 1, z) }, 121);
    const L = (dx) => w.lightAt(x + dx, y, z) & 15;
    return {
      id: w.get(x, y, z), here: L(0), next: L(1), far: L(5), dirty: [...w.dirtySections.keys()],
      own: w.chunk(2, Math.floor(z / 16)).key, other: w.chunk(3, Math.floor(z / 16)).key, x, y, z,
    };
  }, cave);
  check(torch.id === 121, 'een fakkel uit de kist neerzetten werkt');
  check(torch.here === 14 && torch.next === 13 && torch.far === 9, `een fakkel geeft licht dat 1 minder wordt per blok (${torch.here}, ${torch.next}, ${torch.far})`);
  check(torch.dirty.includes(torch.own) && torch.dirty.includes(torch.other), 'het licht van een fakkel op een chunkgrens tekent ook de buurchunk opnieuw');
  await frames(2);
  const lit = await run(({ x, z, y }) => {
    const j = window.__jippecraft, key = j.world.chunk(3, Math.floor(z / 16)).key;
    if (j.world.dirtySections.has(key)) return false;
    // Zoek in de buurchunk de bovenkant van de vloer naast de fakkel: die moet lamplicht hebben (blauw)
    for (const m of j.scene.chunks.get(key).meshes) {
      const pos = m.geometry.attributes.position, col = m.geometry.attributes.color;
      for (let i = 0; i < pos.count; i++) {
        if (Math.abs(pos.getY(i) - y) < 0.01 && pos.getX(i) >= x + 1 && pos.getX(i) <= x + 3 && Math.abs(pos.getZ(i) - z - 0.5) < 1 && col.getZ(i) > 0.4) return true;
      }
    }
    return false;
  }, torch);
  check(lit, 'binnen een paar beeldjes is de vloer in de buurchunk verlicht');
  await run(({ x, z, y }) => {
    const j = window.__jippecraft, p = j.player;
    p.flying = true; p.setPos({ x: x + 4.5, y, z: z + 0.5 }); p.yaw = Math.PI / 2; p.pitch = -0.25;
  }, torch);
  await frames(6);
  await page.screenshot({ path: out + '/4d-grot.png' });

  // Weghalen: het wordt weer donker
  const gone = await run(({ x, z, y }) => {
    const j = window.__jippecraft, w = j.world;
    j.breakBlock({ x, y, z, id: w.get(x, y, z) });
    return [w.get(x, y, z), w.lightAt(x + 1, y, z) & 15, w.lightAt(x - 3, y, z) & 15];
  }, torch);
  check(gone[0] === 0 && gone[1] === 0 && gone[2] === 0, 'fakkel weg: het licht is meteen weer weg');

  // Lantaarn aan het plafond
  const lantern = await run(({ x0, z0, y }) => {
    const j = window.__jippecraft, w = j.world, x = x0 + 8, z = z0 + 4;
    j.placeBlock({ x, y: y + 4, z, nx: 0, ny: -1, nz: 0, id: w.get(x, y + 4, z) }, 126);
    return [w.get(x, y + 3, z), w.lightAt(x, y, z) & 15];
  }, cave);
  check(lantern[0] === 127 && lantern[1] === 12, 'een lantaarn onder een blok hangt aan het plafond en geeft licht');

  // ---------- dag en nacht ----------
  await run(() => { const j = window.__jippecraft; j.goHome(); j.daynight.set(0.8); });
  await frames(4);
  const night = await run(() => {
    const j = window.__jippecraft, bg = j.scene.scene.background, sky = j.scene.light.uSkyLight.value;
    return { night: j.daynight.night, stars: j.scene.stars.visible, bg: bg.r + bg.g + bg.b, sky: sky.r, moonUp: j.scene.moon.getWorldPosition(j.scene.moon.position.clone()).y > j.scene.camera.position.y };
  });
  check(night.night && night.stars && night.bg < 0.1 && night.sky < 0.1, 's nachts is de lucht donker met sterren en is het buiten schemerig');
  check(night.moonUp, 's nachts staat de maan aan de hemel');
  await page.screenshot({ path: out + '/4d-nacht.png' });
  // Alleen landdieren: vissen en andere zeedieren zwemmen ook 's nachts (sinds 5.5 ook vlak bij de bouwplek)
  check(await waitTrue(page, () => { const l = window.__jippecraft.animals.list.filter((a) => !a.def.onderwater); return l.length > 0 && l.filter((a) => a.sleep > 0).length >= l.length / 2; }, null, 30000),
    's nachts gaan de dieren slapen');
  check(await run(() => { const a = window.__jippecraft.animals.list[0]; return !a || a.mat.color.r < 0.3; }), 's nachts zijn de dieren ook donkerder');

  // Een volle dag loopt rond (versneld)
  const cycle = await run(async () => {
    const { sunAmount, DAY_SECONDS } = await import('./js/daynight.js');
    const j = window.__jippecraft, d = j.daynight, seen = new Set();
    d.set(0);
    for (let i = 0; i < 40; i++) { d.update(DAY_SECONDS / 40); seen.add(d.night ? 'nacht' : 'dag'); }
    return { seen: [...seen], back: Math.abs(d.time) < 1e-6 || Math.abs(d.time - 1) < 1e-6, noon: sunAmount(0.3), mid: sunAmount(0.8) };
  });
  check(cycle.seen.length === 2 && cycle.back && cycle.noon === 1 && cycle.mid === 0, 'een hele dag heeft dag en nacht en begint daarna opnieuw');

  // Bed: 's nachts slapen tot de ochtend, en het bed wordt je thuis
  const bed = await run(async () => {
    const j = window.__jippecraft, w = j.world, x = 52, z = 50, y = w.surfaceY(x, z);
    j.daynight.set(0.8);
    j.player.yaw = 0;
    j.placeBlock({ x, y, z, nx: 0, ny: 1, nz: 0, id: w.get(x, y, z) }, 137); // groen bed
    const foot = w.get(x, y + 1, z), head = w.get(x, y + 1, z - 1);
    j.useBed({ x, y: y + 1, z, id: foot });
    await new Promise((r) => setTimeout(r, 2200));
    return { foot, head, night: j.daynight.night, home: j.home, y };
  });
  check(bed.foot === 137 && bed.head === 138, 'een bed is twee blokken lang (voeteneind en hoofdeind)');
  check(!bed.night, 'slapen in een bed slaat de nacht over');
  check(bed.home && Math.floor(bed.home.x) === 52 && Math.floor(bed.home.z) === 49, 'het bed is nu je thuis');
  const homeOk = await run(() => {
    const j = window.__jippecraft;
    j.player.setPos({ x: 200, y: 80, z: 200 }); j.goHome();
    return Math.hypot(j.player.x - 52.5, j.player.z - 49.5) < 1;
  });
  check(homeOk, 'de huisknop brengt je naar je bed');
  const broken = await run(() => {
    const j = window.__jippecraft, w = j.world, y = w.surfaceY(52, 52);
    const y1 = j.home.y - 0.6;
    j.breakBlock({ x: 52, y: y1, z: 49, id: w.get(52, y1, 49) });
    return [w.get(52, y1, 49), w.get(52, y1, 50), y];
  });
  check(broken[0] === 0 && broken[1] === 0, 'een bed slopen haalt beide helften weg');

  // Ouderinstelling "altijd dag" en de tijd wordt bewaard
  const always = await run(() => {
    const j = window.__jippecraft;
    j.daynight.set(0.8); j.setAlwaysDay(true);
    j.daynight.update(300);
    const r = { sun: j.daynight.sun };
    j.setAlwaysDay(false);
    return r;
  });
  check(always.sun === 1, 'met "altijd dag" blijft het middag');
  await frames(2);
  check(await run(() => !!document.querySelector('.parent-day') && !!document.querySelector('.parent-caves')),
    'het ouderscherm heeft knoppen voor dag en nacht en lichtere grotten');
  const saved = await run(async () => {
    const j = window.__jippecraft;
    j.daynight.set(0.42);
    await j.saveNow();
    return j.metas['slot' + j.slot].time;
  });
  check(Math.abs(saved - 0.42) < 1e-9, 'de tijd van de dag wordt per wereld bewaard');
  await context.close();
}
