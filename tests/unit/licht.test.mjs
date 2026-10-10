// Licht per blok: zonlicht, fakkels, en bijwerken na bouwen en slopen (ook over chunkgrenzen).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World, SY, SEA, CHUNK } from '../../js/world.js';
import { AIR, B, EMIT, torchId } from '../../js/blocks.js';
import { regionFor, LightRegion, LIGHT_CURVE } from '../../js/engine/light.js';
import { local, CHUNK_SIZE } from '../../js/engine/chunk.js';
import { rng } from '../../js/engine/noise.js';

const sky = (w, x, y, z) => w.lightAt(x, y, z) >> 4;
const lamp = (w, x, y, z) => w.lightAt(x, y, z) & 15;

// Licht geven aan de chunks 0..5 (zoals bij het eerste tekenen); de rand eromheen blijft zonder licht
function lightUp(w) {
  const region = regionFor(w, -1, -1, 8, 8);
  for (let cx = 0; cx < 6; cx++) for (let cz = 0; cz < 6; cz++) w.chunk(cx, cz).light = region.chunkLight(cx, cz);
}

// Klopt het bijgewerkte licht precies met opnieuw alles uitrekenen?
function assertFresh(w, label) {
  const fresh = regionFor(w, -1, -1, 8, 8);
  for (let cx = 0; cx < 6; cx++) for (let cz = 0; cz < 6; cz++) {
    const want = fresh.chunkLight(cx, cz), have = w.chunk(cx, cz).light;
    for (let i = 0; i < CHUNK_SIZE; i++) {
      if (want[i] === have[i]) continue;
      const lx = i % CHUNK, lz = Math.floor(i / CHUNK) % CHUNK, y = Math.floor(i / (CHUNK * CHUNK));
      assert.fail(`${label}: licht op ${cx * CHUNK + lx},${y},${cz * CHUNK + lz} is ${have[i].toString(16)}, moet ${want[i].toString(16)} zijn`);
    }
  }
}

test('zonlicht: boven de grond 15, diep onder de grond donker', () => {
  const w = new World();
  w.generate('flat', 7);
  lightUp(w);
  const top = w.surfaceY(40, 40);
  assert.equal(sky(w, 40, top + 1, 40), 15);
  assert.equal(sky(w, 40, top + 30, 40), 15);
  assert.equal(sky(w, 40, 5, 40), 0, 'diep in de steen komt geen zon');
});

test('een fakkel in een dichte grot geeft een cirkel van licht die 1 minder wordt per blok', () => {
  const w = new World();
  w.generate('flat', 7);
  // Een holte van 31 x 3 x 1 diep onder de grond, met in het midden een fakkel
  const y = 10;
  for (let x = 25; x <= 55; x++) w.set(x, y, 40, AIR);
  w.set(40, y, 40, torchId());
  lightUp(w);
  assert.equal(lamp(w, 40, y, 40), EMIT[B.TORCH]);
  for (let d = 1; d <= 15; d++) assert.equal(lamp(w, 40 + d, y, 40), Math.max(0, 14 - d), `op ${d} blokken`);
  assert.equal(sky(w, 40, y, 40), 0, 'geen zon in de grot');
  assert.ok(LIGHT_CURVE[14] > 0.85 && LIGHT_CURVE[0] === 0 && LIGHT_CURVE[15] === 1);
});

for (const type of ['flat', 'island', 'world']) {
  test(`wereld '${type}': na bouwen en slopen klopt het licht nog precies, ook op chunkgrenzen`, () => {
    const w = new World();
    w.generate(type, 99);
    lightUp(w);
    assertFresh(w, 'begin');
    const r = rng(type.length * 31 + 5);
    const ids = [B.STONE, B.STONE, B.PLANKS, B.GLASS, B.LEAVES, AIR, AIR, AIR, torchId(), B.LANTERN, B.LAMP, B.WATER];
    for (let n = 0; n < 220; n++) {
      // Rond de grens tussen chunk 2 en 3 (x = 48) en chunk 2 en 3 (z = 48)
      const x = 40 + Math.floor(r() * 16), z = 40 + Math.floor(r() * 16);
      const y = Math.max(1, Math.min(SY - 1, w.surfaceY(x, z) + Math.floor(r() * 7) - 4));
      w.set(x, y, z, ids[Math.floor(r() * ids.length)]);
      if (n % 55 === 54) assertFresh(w, `na ${n + 1} veranderingen`);
    }
    // Een dak over een stuk en weer weg (zonlicht valt weg en komt terug)
    const top = Math.max(w.surfaceY(44, 44), SEA) + 6;
    for (let x = 41; x < 52; x++) for (let z = 41; z < 52; z++) w.set(x, top, z, B.STONE);
    assertFresh(w, 'met dak');
    for (let x = 41; x < 52; x++) for (let z = 41; z < 52; z++) w.set(x, top, z, AIR);
    assertFresh(w, 'dak weer weg');
  });
}

test('bouwen tekent ook de buursecties en buurchunks opnieuw als het licht daar verandert', () => {
  const w = new World();
  w.generate('flat', 3);
  lightUp(w);
  for (const c of w.chunks.values()) c.meshed = true;
  w.dirtySections.clear();
  // Een lantaarn vlak naast de grens met chunk 3 (x = 48)
  const y = w.surfaceY(46, 40) + 1;
  w.set(46, y, 40, B.LANTERN);
  const keys = [...w.dirtySections.keys()];
  assert.ok(keys.includes(w.chunk(2, 2).key), 'eigen chunk');
  assert.ok(keys.includes(w.chunk(3, 2).key), 'buurchunk waar het licht ook komt');
});

test('het licht van een stuk wereld is hetzelfde, of je het nu per chunk of in één keer uitrekent', () => {
  const w = new World();
  w.generate('world', 5);
  const big = regionFor(w, -1, -1, 8, 8);
  for (const [cx, cz] of [[0, 0], [2, 3], [5, 5]]) {
    const small = new LightRegion(cx - 1, cz - 1, 3, 3, (x, z) => w.chunk(x, z)?.blocks || null);
    assert.deepEqual(small.chunkLight(cx, cz), big.chunkLight(cx, cz), `chunk ${cx},${cz}`);
  }
  // En het lichtpad voor de mesher komt overeen met het licht van de chunk
  const pad = big.lightPad(2, 2), light = big.chunkLight(2, 2);
  assert.equal(pad.length, 18 * 18 * 130);
  assert.ok(light[local(3, SY - 1, 3)] === 0xf0);
});
