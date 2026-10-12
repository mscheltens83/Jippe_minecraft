// 6.4.5: niet per ongeluk naar een andere website vegen. Een aanraking bij de rand van het speelveld
// mag Safari niet als terugveeg-gebaar gebruiken, en lukt terugveeg toch, dan blijf je in het spel.
import { waitTrue } from './helpers.mjs';

export async function testPhase6F({ newPage, check }) {
  const { context, page } = await newPage();
  const run = (fn, arg) => page.evaluate(fn, arg);
  const box = await page.viewportSize();

  // Aanraking bij de rand (op het speelveld) wordt tegengehouden, in het midden en op een knop niet
  const edges = await run(() => {
    const touch = (el, x) => {
      const t = new Touch({ identifier: Math.random() * 1e6 | 0, target: el, clientX: x, clientY: innerHeight / 2 });
      const e = new TouchEvent('touchstart', { touches: [t], changedTouches: [t], targetTouches: [t], bubbles: true, cancelable: true });
      el.dispatchEvent(e);
      return e.defaultPrevented;
    };
    const canvas = document.querySelector('canvas'), btn = document.querySelector('.menu-btn');
    return { left: touch(canvas, 5), right: touch(canvas, innerWidth - 5), middle: touch(canvas, innerWidth / 2), button: touch(btn, 5) };
  });
  check(edges.left && edges.right, 'een aanraking bij de rand van het speelveld wordt geen terugveeg-gebaar');
  check(!edges.middle && !edges.button, 'midden op het speelveld en op knoppen werkt aanraken gewoon');

  // Eerst een andere pagina in de geschiedenis zetten (zoals de website waar je vandaan kwam)
  const url = page.url();
  await page.goto(new URL('/icons/icon-192.png', url).href);
  await page.goto(url);
  await page.waitForFunction(() => window.__jippecraft?.world, null, { timeout: 20000 });
  // Terug (zoals terugvegen in Safari) na een tik: je blijft in het spel, op dezelfde pagina
  await run(() => { window.__still = true; });
  await page.touchscreen.tap(box.width / 2, box.height / 2);
  await page.goBack({ timeout: 3000 }).catch(() => {});
  const stayed = page.url() === url && await run(() => window.__still === true && !!window.__jippecraft?.world);
  check(stayed, 'terugvegen brengt je niet naar een andere website: je blijft in het spel');
  // Na de volgende tik is het vangnet er weer
  await page.touchscreen.tap(box.width / 2, box.height / 2);
  check(await waitTrue(page, () => history.state?.jippecraft === true), 'na de volgende tik is het vangnet er weer');
  await page.goBack({ timeout: 3000 }).catch(() => {});
  check(page.url() === url && await run(() => window.__still === true), 'ook een tweede keer terugvegen houdt je in het spel');
  await context.close();
}
