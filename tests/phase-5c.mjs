// Fase 5C: schatkisten en verkleden.
import { waitTrue } from './helpers.mjs';

export async function testPhase5C({ newPage, check, out }) {
  const { context, page } = await newPage();
  const run = (fn, arg) => page.evaluate(fn, arg);
  await page.locator('.play-btn').tap();

  // Een schatkist openen: iets om aan te trekken
  const chest = await run(async () => {
    const { B } = await import('./js/blocks.js');
    const j = window.__jippecraft, w = j.world, p = j.player;
    const x = Math.floor(p.x), z = Math.floor(p.z) - 2, y = w.surfaceY(x, z) + 1;
    w.set(x, y, z, B.TREASURE);
    const before = j.wardrobe.unlocked.size;
    j.openTreasure({ x, y, z, id: B.TREASURE });
    return { open: w.get(x, y, z) === B.TREASURE_OPEN, more: j.wardrobe.unlocked.size === before + 1, quest: j.quests.done.has('schat') };
  });
  check(chest.open && chest.more, 'een schatkist gaat open en je vindt iets om aan te trekken');
  check(await waitTrue(page, () => document.querySelector('.album-new')?.textContent.includes('Schat')), 'de schat verschijnt groot in beeld');
  check(chest.quest, 'een schatkist openen geeft een sticker');
  await page.screenshot({ path: out + '/5c-schat.png' });
  await page.waitForTimeout(2500);

  // In het boek: verkleden
  await page.locator('.album-hud-btn').tap();
  await page.locator('.album-tab[aria-label="Verkleden"]').tap();
  check(await waitTrue(page, () => document.querySelector('.wardrobe-preview')?.src.startsWith('data:image/png')), 'het boek laat je poppetje zien');
  const found = await run(() => [...window.__jippecraft.wardrobe.unlocked].find((k) => !k.endsWith(':none') && k !== 'hat:cap'));
  await page.locator(`.wardrobe-item[data-item="${found}"]`).tap();
  const [kind, id] = found.split(':');
  check(await run(({ kind, id }) => window.__jippecraft.avatar.look[kind] === id, { kind, id }), 'wat je in de schatkist vond, kun je aantrekken');
  await page.locator('.wardrobe-color[data-item="shirt:#3f7fd0"]').tap();
  check(await run(() => window.__jippecraft.avatar.look.shirt === '#3f7fd0'), 'je kunt de kleur van je shirt kiezen');
  const locked = await page.locator('.wardrobe-item.locked').first().getAttribute('data-item');
  await page.locator(`.wardrobe-item[data-item="${locked}"]`).tap();
  check(await run(async () => /schatkist|sticker/.test((await import('./js/speech.js')).speech.last)), 'iets wat je nog niet hebt, zegt waar je het vindt');
  check(await run(() => window.__jippecraft.quests.done.has('verkleden')), 'verkleden geeft een sticker');
  await page.screenshot({ path: out + '/5c-verkleden.png' });

  // Zo zie je jezelf van achteren, met je nieuwe kleren
  await page.locator('.album .close-btn').tap();
  await page.locator('.play-btn').tap();
  await run(() => { const j = window.__jippecraft; j.thirdPerson = true; j.ui.setThirdPerson(true); j.player.yaw = Math.PI; });
  await page.waitForTimeout(800);
  await page.screenshot({ path: out + '/5c-poppetje.png' });

  // Bewaard na opnieuw laden
  await page.reload();
  await page.waitForFunction(() => window.__jippecraft, null, { timeout: 20000 });
  check(await run(({ kind, id }) => window.__jippecraft.wardrobe[kind] === id && window.__jippecraft.wardrobe.shirt === '#3f7fd0', { kind, id }), 'je kleren blijven bewaard');
  await context.close();
}
