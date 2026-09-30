// Fase F: ontdekking met echte aanraking, stickers, geluid en wissen met bevestiging.
export async function testPhaseF({ newPage, check, out }) {
  const { context, page } = await newPage();
  const run = (fn, arg) => page.evaluate(fn, arg);
  await page.locator('.album-btn').tap();
  check(await page.locator('.album').isVisible(), 'album opent met de boekknop in het menu');
  check(await run(() => document.querySelectorAll('.album-section').length === 5 &&
    document.querySelectorAll('.album-sticker').length === 27 &&
    document.querySelectorAll('.album-sticker.unknown').length === 27),
  'album groepeert 27 nog onbekende dieren per wereld');
  await page.locator('.album-head .close-btn').tap();
  await page.locator('.play-btn').tap();
  const spot = await run(async () => {
    const THREE = await import('./lib/three.module.min.js');
    const j = window.__jippecraft;
    j.freshWorld('flat', 7); j.animals.clear(); j.scene.rebuildAll(j.world);
    const y = j.world.surfaceY(48, 48) + 1;
    j.player.setPos({ x: 48.5, y, z: 48.5 }); j.player.yaw = 0; j.player.pitch = -.2;
    const a = j.animals.spawn('pig', 48.5, y, 45.5, Math.PI);
    a.timer = 100; a.onGround = true;
    j.updateCamera(0); j.scene.camera.updateMatrixWorld();
    const v = new THREE.Vector3(a.x, a.y + .5, a.z).project(j.scene.camera);
    return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight };
  });
  await page.touchscreen.tap(spot.x, spot.y);
  await page.waitForFunction(() => window.__jippecraft.album.known.has('pig'), null, { timeout: 30000 });
  check(await page.locator('.album-new').isVisible() &&
    await run(() => JSON.parse(localStorage.getItem('jippecraft.settings.v1')).album.includes('pig')),
  '10: eerste echte aai toont Nieuw! en bewaart de sticker in de instellingen');
  await page.screenshot({ path: out + '/25-nieuwe-sticker.png' });
  await page.locator('.album-hud-btn').tap();
  check(await page.locator('.album').isVisible(), 'boekknop in het spel opent het album');
  await page.waitForFunction(() => window.__jippecraft.album.stickers.size === 27, null, { timeout: 30000 });
  check(await run(() => {
    const a = window.__jippecraft.album;
    return a.known.size === 1 && a.stickers.get('pig').startsWith('data:image/png') &&
      !!document.querySelector('.album-sticker[data-type="pig"].found') &&
      !!document.querySelector('.album-sticker[data-type="lion"].unknown');
  }), 'gevonden dier krijgt een gekleurde sticker uit zijn 3D-model; onbekenden blijven grijs');
  await page.screenshot({ path: out + '/26-dierenalbum.png' });
  await run(() => {
    const j = window.__jippecraft, old = j.sounds.animal.bind(j.sounds);
    j._albumSound = null;
    j.sounds.animal = (type) => { j._albumSound = type; old(type); };
  });
  await page.locator('.album-sticker[data-type="pig"]').tap();
  check(await run(() => window.__jippecraft._albumSound === 'pig' &&
    document.querySelector('.album-sticker[data-type="pig"]').classList.contains('bounce')),
  'tikken op een gevonden sticker speelt dierengeluid en beweegt de sticker');
  await page.locator('.album-head .close-btn').tap();
  await page.reload();
  await page.waitForFunction(() => window.__jippecraft, null, { timeout: 30000 });
  check(await run(() => window.__jippecraft.album.known.has('pig')), 'album blijft bewaard na herladen');
  await page.locator('.album-btn').tap();
  await page.locator('.album-clear').tap();
  check(await page.locator('.album-confirm').isVisible() &&
    await run(() => window.__jippecraft.album.known.has('pig')),
  'album leegmaken vraagt eerst bevestiging');
  await page.locator('.album-confirm .no').tap();
  check(await run(() => window.__jippecraft.album.known.has('pig')), 'Nee bewaart de stickers');
  await page.locator('.album-clear').tap();
  await page.locator('.album-confirm .yes').tap();
  check(await run(() => window.__jippecraft.album.known.size === 0 &&
    JSON.parse(localStorage.getItem('jippecraft.settings.v1')).album.length === 0),
  'Ja maakt album leeg en bewaart die keuze');
  await context.close();
}
