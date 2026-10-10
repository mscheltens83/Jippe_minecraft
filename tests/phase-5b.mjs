// Fase 5B: opdrachtjes met stickers in het boek, met voorlezen.
import { waitTrue } from './helpers.mjs';

export async function testPhase5B({ newPage, check, out }) {
  const { context, page } = await newPage();
  const run = (fn, arg) => page.evaluate(fn, arg);
  await page.locator('.play-btn').tap();

  // Het boek heeft een tabblad Stickers; "Wat zal ik doen?" kiest een opdrachtje en leest het voor
  await page.locator('.album-hud-btn').tap();
  await page.locator('.album-tab[aria-label="Stickers"]').tap();
  const total = await run(async () => (await import('./js/quests.js')).QUESTS.length);
  check(await page.locator('.album-sticker.quest').count() === total, `het boek heeft een tabblad met ${total} stickers`);
  check(await page.locator('.album-sticker.quest.found').count() === 0, 'in een nieuw boek zijn alle stickers nog grijs');
  await page.locator('.quest-tip').tap();
  const tip = await run(async () => ({ bubble: document.querySelector('.quest-bubble').textContent, said: (await import('./js/speech.js')).speech.last }));
  check(tip.bubble.length > 5 && tip.said === tip.bubble, '"Wat zal ik doen?" laat een opdrachtje zien en leest het voor');
  await page.screenshot({ path: out + '/5b-stickers-leeg.png' });
  await page.locator('.album .close-btn').tap();
  await page.locator('.play-btn').tap(); // de boekknop opent ook het menu (onder het boek)

  // Een blok bouwen: de eerste sticker
  await run(async () => {
    const { B } = await import('./js/blocks.js');
    const j = window.__jippecraft, w = j.world, p = j.player;
    const x = Math.floor(p.x), z = Math.floor(p.z) - 2, y = w.surfaceY(x, z);
    j.hotbar[j.sel] = B.PLANKS;
    j.use({ x, y, z, nx: 0, ny: 1, nz: 0, id: w.get(x, y, z), dist: 2 });
  });
  check(await waitTrue(page, () => window.__jippecraft.quests.done.has('eersteBlok') && document.querySelector('.album-new')?.textContent.includes('Sticker')),
    'een blok bouwen geeft de eerste sticker, die in beeld vliegt');
  await page.screenshot({ path: out + '/5b-sticker.png' });

  // Op een paard rijden: nog een sticker
  await run(() => {
    const j = window.__jippecraft, p = j.player;
    const horse = j.animals.spawn('horse', p.x + 2, j.world.surfaceY(Math.floor(p.x + 2), Math.floor(p.z)) + 1, p.z, 0);
    horse.tame = true;
    j.mountAnimal(horse);
    j.dismount();
  });
  check(await run(() => window.__jippecraft.quests.done.has('paard')), 'op een paard rijden geeft de sticker "Rijd op een paard"');

  // In het boek: gekleurde stickers; tikken leest het opdrachtje voor
  await page.waitForTimeout(2500);
  await page.locator('.album-hud-btn').tap();
  await page.locator('.album-tab[aria-label="Stickers"]').tap();
  check(await page.locator('.album-sticker.quest.found').count() >= 2, 'de stickers die je haalde, zijn gekleurd in het boek');
  await page.locator('.album-sticker[data-quest="paard"]').tap();
  check(await run(async () => (await import('./js/speech.js')).speech.last === 'Rijd op een paard.'), 'tik op een sticker en de iPad leest het opdrachtje voor');
  await page.screenshot({ path: out + '/5b-stickers.png' });

  // Bewaard: na opnieuw laden zijn de stickers er nog
  await page.reload();
  await page.waitForFunction(() => window.__jippecraft, null, { timeout: 20000 });
  check(await run(() => ['eersteBlok', 'paard'].every((id) => window.__jippecraft.quests.done.has(id))), 'de stickers blijven bewaard');
  await context.close();
}
