// Fase E: alle nieuwe diersoorten, biomen, kist en bewaren.
export async function testPhaseE({ newPage, check, out }) {
  const { context, page } = await newPage();
  const run = (fn, arg) => page.evaluate(fn, arg);
  const results = await run(async () => {
    const { SPECIES } = await import('./js/animals/species.js');
    const { BIOMES, biomeAt } = await import('./js/biomes.js');
    const { SPECIALS, PALETTE_GROUPS } = await import('./js/blocks.js');
    const j = window.__jippecraft;
    const expected = Object.keys(SPECIES);
    const missing = [], wrongBiome = [], worlds = {};
    j.playing = false;
    for (const type of ['jungle', 'desert', 'tundra', 'adventure']) {
      for (const seed of [37, 91]) {
        j.freshWorld(type, seed);
        const found = j.animals.list.map((a) => a.type);
        worlds[`${type}-${seed}`] = found;
        const recipes = type === 'adventure' ? [...BIOMES.jungle.dieren, ...BIOMES.desert.dieren,
          ...BIOMES.tundra.dieren, ...BIOMES.savanna.dieren, ...BIOMES.island.dieren] : BIOMES[type].dieren;
        for (const [animal] of recipes) if (!found.includes(animal)) missing.push(`${type}/${seed}:${animal}`);
        if (type === 'adventure') for (const a of j.animals.list) {
          const habitat = biomeAt(type, a.x, a.z);
          if (!SPECIES[a.type].werelden.includes(habitat) && !(habitat === 'island' && SPECIES[a.type].dieet === 'boerderij'))
            wrongBiome.push(`${a.type}:${habitat}`);
        }
      }
    }
    const items = PALETTE_GROUPS.find((g) => g.title === 'Dieren').items;
    const itemTypes = items.map((id) => SPECIALS[id]?.animal);
    const iconNames = items.map((id) => j.ui.icons[id]);
    const save = j.makeSave();
    j.animals.load(save.animals);
    return { species: expected.length, missing, wrongBiome, items: itemTypes.length,
      uniqueItems: new Set(itemTypes).size, iconNamesOK: iconNames.every((s) => s?.startsWith('data:image/svg+xml')),
      saved: save.animals.length, loaded: j.animals.list.length, worlds };
  });
  check(results.species === 27 && results.items === 27 && results.uniqueItems === 27,
    '15 nieuwe soorten: 27 dieren in totaal en allemaal één keer in de kist');
  check(results.iconNamesOK, 'alle dieren hebben een zichtbaar kisticoon');
  check(results.missing.length === 0, 'alle dieren verschijnen in jungle, woestijn, toendra en avontuur bij twee seeds' +
    (results.missing.length ? ` (${results.missing.join(', ')})` : ''));
  check(results.wrongBiome.length === 0, 'avontuur zet dieren in hun eigen leefgebied' +
    (results.wrongBiome.length ? ` (${results.wrongBiome.join(', ')})` : ''));
  check(results.saved === results.loaded && results.loaded > 30, 'nieuwe dieren blijven bewaard en laden weer');
  const skills = await run(async () => {
    const { World } = await import('./js/world.js');
    const { Animal } = await import('./js/animals/core.js');
    const { B } = await import('./js/blocks.js');
    const w = new World(); w.generate('flat', 7);
    const y = w.surfaceY(30, 30) + 1;
    const bird = new Animal('parrot', 30.5, y, 30.5, 0);
    bird.onGround = true; bird.flightWait = 100; bird.flight = { x: 36.5, y: y + 5, z: 30.5, left: 5 };
    for (let i = 0; i < 20; i++) bird.update(.05, w, null);
    const flight = bird.y > y + 1 && !!bird.flight;
    const turtle = new Animal('turtle', 30.5, y, 30.5, 0);
    turtle.onGround = true; turtle.pet(31, 31); turtle.update(.05, w, null);
    const hidden = turtle.group.scale.y < .5;
    turtle.happy = 0; turtle.update(.05, w, null);
    const emerged = turtle.group.scale.y === 1;
    w.set(31, y, 30, B.BAMBOO);
    const panda = new Animal('panda', 30.5, y, 30.5, 0);
    panda.skillWait = 0; panda.onGround = true; panda.update(.05, w, null);
    const bamboo = panda.graze && !panda.walking;
    w.set(32, y - 1, 32, B.ICE);
    const penguin = new Animal('penguin', 32.5, y, 32.5, 0);
    penguin.onGround = true; penguin.update(.05, w, null);
    const slide = penguin.sliding && penguin.speedNow > penguin.def.speed * 1.9;
    return { flight, hidden, emerged, bamboo, slide };
  });
  check(Object.values(skills).every(Boolean), 'vliegen, verstoppen, bamboe eten en glijden bewegen echt in de wereld' +
    (Object.values(skills).every(Boolean) ? '' : ` (${JSON.stringify(skills)})`));
  await page.locator('.play-btn').tap();
  await run(() => {
    const j = window.__jippecraft;
    j.freshWorld('tundra', 37); j.animals.clear();
    j.player.setPos({ x: 48.5, y: j.world.surfaceY(48, 49) + 1, z: 49.5 });
    j.player.yaw = 0; j.player.pitch = -0.14;
    const spots = [
      ['polarBear', 46.5, 45.5], ['penguin', 48.5, 45.5], ['reindeer', 50.5, 45.5],
      ['arcticFox', 46.5, 43.5], ['seal', 48.5, 43.5], ['snowyOwl', 50.5, 43.5],
    ];
    for (const [type, x, z] of spots) {
      const a = j.animals.spawn(type, x, j.world.surfaceY(Math.floor(x), Math.floor(z)) + 1, z, Math.PI);
      a.timer = 100; a.walking = false;
    }
    j.playing = false; j.scene.rebuildAll(j.world); j.updateCamera(0);
  });
  await page.waitForTimeout(350);
  await page.screenshot({ path: out + '/24-toendra-dieren.png' });
  await context.close();
}
