// Fase 4C: de Grote wereld (biomen, bergen, muziek en lucht per landschap) en de nieuwe blokken.
import { waitTrue } from './helpers.mjs';

export async function testPhase4C({ newPage, check, out }) {
  const { context, page } = await newPage();
  const run = (fn, arg) => page.evaluate(fn, arg);
  check(await run(() => window.__jippecraft.world.type === 'world'), 'een nieuwe speler begint in de Grote wereld');
  await page.locator('.play-btn').tap();
  check(await run(() => window.__jippecraft.world.biomeAt(48, 48) === 'plains' && window.__jippecraft.biomeNow === 'plains'),
    'de bouwplek ligt in een vlakte');

  // Naar een berg: het landschap, de lucht en de muziek veranderen mee
  const spot = await run(() => {
    const j = window.__jippecraft, g = j.world.gen;
    for (let r = 64; r < 2000; r += 32) for (let a = 0; a < 32; a++) {
      const x = Math.round(48 + Math.cos(a / 32 * 6.283) * r), z = Math.round(48 + Math.sin(a / 32 * 6.283) * r);
      const c = g.raw(x, z);
      // ook de plek waar de speler komt te hangen (31 blokken ervoor, zie p.setPos hieronder) moet in de bergen liggen
      if (c.biome === 'mountains' && c.h > 95 && g.raw(x, z - 31).biome === 'mountains') return { x, z, h: c.h };
    }
    return null;
  });
  check(!!spot, 'er ligt een hoge berg in de buurt');
  if (spot) {
    await run(({ x, z, h }) => {
      const j = window.__jippecraft, p = j.player;
      j.world.ensureArea(x - 32, z - 32, x + 32, z + 32);
      p.flying = true; p.setPos({ x: x + 0.5, y: h + 6, z: z - 30.5 }); p.yaw = Math.PI; p.pitch = -0.2;
    }, spot);
    check(await waitTrue(page, () => window.__jippecraft.biomeNow === 'mountains', null, 15000), 'op de berg weet het spel dat je in de bergen bent');
    check(await run(() => window.__jippecraft.music.style === 'toendra'), 'in de bergen klinkt andere muziek');
    await waitTrue(page, () => { const j = window.__jippecraft; return j.loader.settled(j.player.x, j.player.z); }, null, 60000);
    await page.screenshot({ path: out + '/4c-berg.png' });
    check(await run(({ x, z, h }) => window.__jippecraft.world.get(x, h, z) !== 0, spot), 'de berg is echt gemaakt, tot boven in');
  }

  // Een erts uit de kist bouwen
  await run(() => window.__jippecraft.goHome());
  await page.locator('.slot.chest').tap();
  await page.locator('.pal-tab[aria-label="Natuur"]').tap();
  check(await page.locator('.pal-item[aria-label="Diamanterts"]').isVisible() || await page.locator('.pal-item[aria-label="Diamanterts"]').count() === 1,
    'de kist heeft de nieuwe blokken van de Grote wereld');
  await page.locator('.pal-item[aria-label="Diamanterts"]').tap();
  const placed = await run(() => {
    const j = window.__jippecraft, w = j.world, x = 50, z = 50, y = w.surfaceY(x, z);
    j.placeBlock({ x, y, z, nx: 0, ny: 1, nz: 0, id: w.get(x, y, z) }, j.hotbar[j.sel]);
    return w.get(x, y + 1, z) === 107;
  });
  check(placed, 'een diamanterts uit de kist bouwen werkt');
  await context.close();
}
