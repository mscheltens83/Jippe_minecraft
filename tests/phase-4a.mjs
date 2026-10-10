// Fase 4A: versienummer, ouderscherm, foutenlogboek, meetscherm en meetrit.
import { waitTrue } from './helpers.mjs';

export async function testPhase4A({ newPage, check, out, version }) {
  {
    const { context, page } = await newPage();
    const run = (fn, arg) => page.evaluate(fn, arg);
    const parentOpen = () => run(() => !document.querySelector('.parent').hidden);
    check((await page.locator('.menu .version').textContent()) === 'versie ' + version, 'versienummer staat onderin het menu');

    await page.locator('.menu .version').tap();
    await page.waitForTimeout(400);
    check(!(await parentOpen()), 'kort tikken op de versie opent het ouderscherm niet');
    await page.locator('.menu .version').dispatchEvent('pointerdown');
    await page.waitForTimeout(1500);
    const early = await parentOpen();
    check(!early && await waitTrue(page, () => !document.querySelector('.parent').hidden, null, 8000),
      'pas na 3 seconden vasthouden gaat het ouderscherm open');
    check(/Versie\s*4/.test(await page.locator('.parent-info').textContent()), 'ouderscherm toont de versie');
    check(await page.locator('.parent-none').isVisible(), 'ouderscherm: nog geen fouten');

    await run(() => window.dispatchEvent(new ErrorEvent('error', { message: 'testfout 4A' })));
    check(await run(() => JSON.parse(localStorage.getItem('jippecraft.errors.v1') || '[]').some((e) => e.msg.includes('testfout 4A'))),
      'een fout komt in het foutenlogboek');
    await page.locator('.parent-back').click();
    await run(() => window.__jippecraft.ui.showPanel('parent'));
    check(/testfout 4A/.test(await page.locator('.parent-errors').textContent()), 'ouderscherm laat de fout zien');
    await page.locator('.parent-clear').click();
    check(await page.locator('.parent-none').isVisible() && await run(() => !localStorage.getItem('jippecraft.errors.v1')), 'wis fouten maakt het logboek leeg');

    await page.locator('.parent-fps').click();
    check(await waitTrue(page, () => /fps/.test(document.querySelector('.perf:not([hidden])')?.textContent || ''), null, 15000),
      'meetscherm gaat aan via het ouderscherm');
    check(await run(() => JSON.parse(localStorage.getItem('jippecraft.settings.v1')).fps === true), 'meetscherm-instelling wordt bewaard');
    await page.screenshot({ path: out + '/4a-ouderscherm.png' });
    await page.locator('.parent-fps').click();
    check(await run(() => document.querySelector('.perf').hidden), 'meetscherm gaat weer uit');
    await context.close();
  }

  {
    const { context, page } = await newPage(null, '&fps');
    await page.locator('.play-btn').tap();
    check(await waitTrue(page, () => /fps[\s\S]*tekenen \d+[\s\S]*dieren \d+/.test(document.querySelector('.perf:not([hidden])')?.textContent || ''), null, 15000),
      '?fps zet het meetscherm aan, met beelden per seconde, tekenopdrachten en dieren');
    await page.screenshot({ path: out + '/4a-meetscherm.png' });
    await context.close();
  }

  {
    // Meetrit van 3 seconden in een lege browser: daarna mag alleen de meting bewaard zijn
    const { context, page } = await newPage(null, '&meet=3');
    const run = (fn, arg) => page.evaluate(fn, arg);
    check(await waitTrue(page, () => !!window.__jippecraft.benchResult, null, 120000), 'meetrit loopt tot het eind');
    const r = await run(() => window.__jippecraft.benchResult);
    check(r && r.beeldjes > 0 && r.fps > 0 && r.p95 >= r.p50 && r.tekenen > 0 && r.driehoeken > 0, 'meetrit meet beeldjes, tekenopdrachten en driehoeken');
    check(r && r.dieren === 60 && r.versie === version, 'meetrit rijdt met 60 dieren en noemt de versie');
    check(await page.locator('.bench-card').isVisible(), 'uitslag van de meetrit staat in beeld');
    const keys = await run(() => Object.keys(localStorage).filter((k) => k.startsWith('jippecraft.')).sort());
    const idb = await run(async () => { const j = window.__jippecraft; await j.store.flush(); return Object.values(await j.store.loadMetas(['slot1', 'slot2'])).filter(Boolean).length; });
    check(keys.join() === 'jippecraft.metingen.v1' && idb === 0, 'meetrit bewaart niets aan de werelden' + (keys.join() === 'jippecraft.metingen.v1' ? '' : ': ' + keys.join()));
    await page.screenshot({ path: out + '/4a-meetrit.png' });
    await page.locator('.bench-play').click();
    check(await waitTrue(page, () => window.__jippecraft && !window.__jippecraft.bench && !location.search, null, 30000), '"Naar het spel" start het gewone spel');
    await context.close();
  }
}
