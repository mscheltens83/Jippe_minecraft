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

  // Grotten die je niet kunt zien, worden niet getekend (en het beeld blijft precies hetzelfde)
  const cull = await run(() => {
    const j = window.__jippecraft, sc = j.scene, w = j.world, gl = sc.renderer.getContext(), cam = sc.camera;
    const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
    const grab = () => { sc.render(); const px = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px); return [px, sc.renderer.info.render.triangles]; };
    // alles tekenen, maar alleen binnen de zichtafstand (verder weg tekent het spel nooit; op een trage
    // computer kunnen daar nog oude chunks klaarliggen)
    const all = () => {
      const R = (sc.viewDistance || 6) + 2, ccx = Math.floor(cam.position.x / 16), ccz = Math.floor(cam.position.z / 16);
      for (const e of sc.chunks.values()) for (const m of e.meshes) {
        const near = Math.abs(e.cx - ccx) < R && Math.abs(e.cz - ccz) < R;
        m.visible = near; m.geometry.setDrawRange(0, Infinity);
      }
    };
    const out = [];
    j.playing = false;
    const x = Math.floor(j.player.x), z = Math.floor(j.player.z);
    for (const [y, pitch] of [[w.surfaceY(x, z) + 12, -0.6], [w.surfaceY(x, z) + 30, -1.2]]) {
      cam.position.set(x + 0.5, y, z + 0.5); cam.rotation.set(pitch, 0.7, 0, 'YXZ'); cam.updateMatrixWorld();
      // twee keer proberen: een echt gat in het beeld zie je dan beide keren
      let best = null;
      for (let attempt = 0; attempt < 2 && !(best && best.diff < 0.002); attempt++) {
        sc.cullOff = false; sc.visDirty = true; const [a, ta] = grab();
        sc.cullOff = true; all(); const [b, tb] = grab();
        sc.cullOff = false; sc.visDirty = true;
        let diff = 0;
        for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 30) diff++;
        best = { diff: diff / (W * H), fewer: ta < tb * 0.85 };
      }
      out.push(best);
    }
    j.playing = true;
    return out;
  });
  check(cull.every((c) => c.fewer), 'onzichtbare grotten worden niet getekend (minder driehoeken)');
  check(cull.every((c) => c.diff < 0.002), 'het beeld is precies hetzelfde als wanneer alles getekend wordt' + (cull.every((c) => c.diff < 0.002) ? '' : ' (verschil: ' + cull.map((c) => (c.diff * 100).toFixed(3) + '%').join(', ') + ')'));
  await context.close();
}
