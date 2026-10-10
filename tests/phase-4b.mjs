// Fase 4B: de eindeloze wereld. Laden rond de speler, ver vliegen, bouwen op een chunkgrens,
// bewaren in IndexedDB, de huisknop en de reservekopie.
import { waitTrue } from './helpers.mjs';

export async function testPhase4B({ newPage, check, out }) {
  const { context, page } = await newPage();
  const run = (fn, arg) => page.evaluate(fn, arg);
  check(await run(() => window.__jippecraft.pool.ok), 'de wereld wordt in workers gemaakt');
  await page.locator('.play-btn').tap();
  await run(() => { const j = window.__jippecraft; j.setViewDistance(4); });
  check(await waitTrue(page, () => { const j = window.__jippecraft; return j.loader.settled(j.player.x, j.player.z); }, null, 60000),
    'alles binnen de zichtafstand wordt gemaakt en getekend');

  // Ver vliegen: in stappen van 125 blokken naar het oosten, steeds wachten tot de wereld er is
  const trip = [];
  for (let step = 1; step <= 8; step++) {
    await run((x) => { const j = window.__jippecraft, p = j.player; p.flying = true; p.setPos({ x, y: 110, z: 48.5 }); p.yaw = -Math.PI / 2; p.pitch = -0.6; }, 48.5 + step * 125);
    const ok = await waitTrue(page, () => { const j = window.__jippecraft; return j.loader.settled(j.player.x, j.player.z); }, null, 60000);
    trip.push(await run((ok) => {
      const j = window.__jippecraft;
      return { ok, chunks: j.world.chunks.size, y: j.player.y, x: j.player.x };
    }, ok));
  }
  check(trip.every((t) => t.ok), 'na 1000 blokken vliegen is de wereld overal compleet (geen gaten)');
  check(trip.every((t) => t.chunks <= 13 * 13 + 40), 'chunks ver achter je worden opgeruimd (' + Math.max(...trip.map((t) => t.chunks)) + ' geladen)');
  check(trip.every((t) => Math.abs(t.y - 110) < 0.5), 'vliegend blijf je op dezelfde hoogte, ook in nieuwe stukken wereld');
  await page.screenshot({ path: out + '/4b-ver-weg.png' });
  check(await run(() => window.__jippecraft.animals.list.some((a) => a.wild)), 'in nieuwe stukken wereld wonen ook dieren');

  // Huisknop en kompas
  check(await run(() => !window.__jippecraft.ui.compass.hidden), 'ver van huis wijst een pijltje de weg naar huis');
  await page.locator('.home-btn').tap();
  check(await waitTrue(page, () => { const p = window.__jippecraft.player; return Math.hypot(p.x - 48.5, p.z - 48.5) < 1 && !p.flying; }, null, 10000),
    'de huisknop brengt je terug naar de bouwplek');
  check(await waitTrue(page, () => window.__jippecraft.ui.compass.hidden, null, 5000), 'thuis is het pijltje weg');
  check(await waitTrue(page, () => { const j = window.__jippecraft; return j.player.onGround && j.loader.settled(j.player.x, j.player.z); }, null, 60000),
    'thuis staat de wereld meteen weer klaar en sta je op de grond');

  // Bouwen op een chunkgrens: beide chunks worden opnieuw getekend
  const border = await run(() => {
    const j = window.__jippecraft, w = j.world, x = 64, z = 52, y = w.surfaceY(x, z);
    j.placeBlock({ x, y, z, nx: 0, ny: 1, nz: 0, id: w.get(x, y, z) }, 19);
    return { placed: w.get(x, y + 1, z) === 19, y: y + 1 };
  });
  check(border.placed, 'een blok bouwen op de rand van een chunk lukt');
  // Het bovenvlak van het nieuwe blok moet in de 3D-vlakken van chunk 4,3 staan
  const topFace = ({ y }) => {
    const j = window.__jippecraft, e = j.scene.chunks.get((4 + 1024) * 2048 + (3 + 1024));
    const d = e?.sections[Math.floor(y / 16)]?.solid;
    if (!d) return false;
    for (let i = 0; i < d.pos.length; i += 3) {
      if (d.pos[i + 1] === y + 1 && d.pos[i] >= 64 && d.pos[i] <= 65 && d.pos[i + 2] >= 52 && d.pos[i + 2] <= 53) return true;
    }
    return false;
  };
  const seen = await waitTrue(page, topFace, border, 10000);
  check(seen, 'het nieuwe blok is meteen te zien' + (seen ? '' : ': ' + JSON.stringify(await run(() => {
    const j = window.__jippecraft, c = j.world.chunk(4, 3);
    return { dirty: j.world.dirtySections.size, meshed: c?.meshed, meshing: c?.meshing, entry: !!j.scene.chunks.get((4 + 1024) * 2048 + (3 + 1024)), ready: j.loader.ready.length };
  }))));

  // Ver weg bouwen, bewaren en herladen
  await run(async () => {
    const j = window.__jippecraft, w = j.world;
    w.ensureArea(560, 40, 600, 60);
    w.set(580, 100, 50, 13);
    j.markDirty();
    await j.saveNow();
  });
  await page.reload();
  await page.waitForFunction(() => window.__jippecraft, null, { timeout: 30000 });
  check(await run(() => { const w = window.__jippecraft.world; w.ensureArea(570, 40, 590, 60); return w.get(580, 100, 50) === 13 && w.get(64, 0, 52) === 32; }),
    'een blok ver weg (580 blokken) blijft na herladen bewaard');
  check(await run(async () => { const j = window.__jippecraft; return (await j.store.loadChunks('slot' + j.slot)).size >= 2; }),
    'alleen de chunks waarin je bouwde staan in de opslag');

  // Reservekopie: exporteren, iets veranderen, terugzetten
  const backup = await run(async () => {
    const j = window.__jippecraft;
    const data = await j.store.exportAll(['slot1', 'slot2', 'slot3', 'slot4', 'slot5', 'slot6']);
    const size = JSON.stringify(data).length;
    j.world.set(48, 90, 48, 14); await j.saveNow();
    j.readOnly = true; // zoals restore(): niets meer bewaren tot het spel opnieuw start
    await j.store.importAll(['slot1', 'slot2', 'slot3', 'slot4', 'slot5', 'slot6'], data);
    return { size, slots: Object.keys(data).length };
  });
  check(backup.slots >= 1 && backup.size < 2000000, `reservekopie bevat de werelden (${Math.round(backup.size / 1024)} kB)`);
  await page.reload();
  await page.waitForFunction(() => window.__jippecraft, null, { timeout: 30000 });
  check(await run(() => { const w = window.__jippecraft.world; w.ensureArea(570, 40, 590, 60); return w.get(48, 90, 48) === 0 && w.get(580, 100, 50) === 13; }),
    'reservekopie terugzetten geeft de wereld van toen terug');
  await page.screenshot({ path: out + '/4b-thuis.png' });
  await context.close();
}
