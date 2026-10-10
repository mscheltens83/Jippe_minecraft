// Fase 4C: de Grote wereld met biomen, bergen, rivieren, grotten en ertsen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Generator } from '../../js/engine/gen.js';
import { World, SEA, CHUNK, CENTER } from '../../js/world.js';
import { B } from '../../js/blocks.js';

const SEEDS = [1234, 7, 99, 424242, 31];
const ALL = ['plains', 'flowerField', 'forest', 'birchForest', 'taiga', 'tundra', 'mountains', 'desert', 'mesa',
  'savanna', 'jungle', 'swamp', 'beach', 'ocean', 'river'];

function biomesWithin(g, radius, step = 16) {
  const seen = new Set();
  for (let x = -radius; x <= radius; x += step) for (let z = -radius; z <= radius; z += step) {
    if (Math.hypot(x, z) <= radius) seen.add(g.raw(CENTER + x, CENTER + z).biome);
  }
  return seen;
}

test('binnen 500 blokken van de start liggen minstens 6 verschillende biomen (5 seeds)', () => {
  for (const seed of SEEDS) {
    const n = biomesWithin(new Generator('world', seed), 500).size;
    assert.ok(n >= 6, `seed ${seed}: maar ${n} biomen`);
  }
});

test('elke biome komt binnen 2000 blokken voor (5 seeds)', () => {
  for (const seed of SEEDS) {
    const seen = biomesWithin(new Generator('world', seed), 2000, 24);
    for (const b of ALL) assert.ok(seen.has(b), `seed ${seed}: geen ${b}`);
  }
});

test('je begint in een vlakte, met bos in de buurt, op een vlakke bouwplek', () => {
  for (const seed of SEEDS) {
    const w = new World();
    w.generate('world', seed);
    assert.equal(w.biomeAt(CENTER, CENTER), 'plains');
    const near = biomesWithin(w.gen, 160, 8);
    assert.ok(near.has('forest') || near.has('birchForest'), `seed ${seed}: geen bos in de buurt`);
    const level = w.surfaceY(CENTER, CENTER);
    for (let dx = -5; dx <= 5; dx++) for (let dz = -5; dz <= 5; dz++) assert.equal(w.surfaceY(CENTER + dx, CENTER + dz), level);
    assert.ok(level > SEA, 'de bouwplek ligt boven water');
  }
});

test('er zijn bergen tot ver boven de zee, en rivieren tot onder zeeniveau', () => {
  const g = new Generator('world', 1234);
  let peak = 0, river = false;
  for (let x = -2000; x <= 2000; x += 8) for (let z = -2000; z <= 2000; z += 32) {
    const r = g.raw(x, z);
    peak = Math.max(peak, r.h);
    if (r.biome === 'river' && r.h < SEA) river = true;
  }
  assert.ok(peak > SEA + 45, `hoogste berg op ${peak}`);
  assert.ok(river, 'geen rivier');
});

test('onder de grond: grotten, ertsen en verschillende steensoorten', () => {
  const g = new Generator('world', 99);
  const count = new Map();
  let air = 0;
  for (let cx = 20; cx < 30; cx++) for (let cz = 20; cz < 25; cz++) {
    const buf = g.chunk(cx, cz);
    for (let i = 0; i < buf.length; i++) count.set(buf[i], (count.get(buf[i]) || 0) + 1);
    for (let lz = 0; lz < CHUNK; lz++) for (let lx = 0; lx < CHUNK; lx++) {
      const h = g.column(cx * CHUNK + lx, cz * CHUNK + lz).h;
      for (let y = 6; y < h - 6; y++) if (buf[lx + CHUNK * (lz + CHUNK * y)] === 0) air++;
    }
  }
  assert.ok(air > 500, `maar ${air} blokken grot`);
  for (const id of [B.COAL_ORE, B.IRON_ORE, B.GOLD_ORE, B.REDSTONE_ORE, B.DIAMOND_ORE, B.GRANITE, B.DIORITE, B.ANDESITE, B.GRAVEL]) {
    assert.ok((count.get(id) || 0) > 0, `geen blok ${id}`);
  }
  assert.ok(count.get(B.COAL_ORE) > count.get(B.DIAMOND_ORE), 'kolen komt vaker voor dan diamant');
});

test('bij de bouwplek zijn geen grotten', () => {
  const w = new World();
  w.generate('world', 7);
  for (let dx = -10; dx <= 10; dx += 2) for (let dz = -10; dz <= 10; dz += 2) {
    const h = w.surfaceY(CENTER + dx, CENTER + dz);
    for (let y = 5; y < h; y++) assert.notEqual(w.get(CENTER + dx, y, CENTER + dz), 0, 'gat onder de bouwplek');
  }
});

test('een leeuwenrots in de savanne en een piramide in de woestijn', () => {
  const kinds = new Map();
  for (const seed of [1234, 7]) {
    const g = new Generator('world', seed);
    for (let rx = -12; rx <= 12; rx++) for (let rz = -12; rz <= 12; rz++) {
      const s = g.region(rx, rz);
      if (s) kinds.set(s.kind, g.raw(s.x, s.z).biome);
    }
  }
  assert.equal(kinds.get('lionRock'), 'savanna');
  assert.equal(kinds.get('pyramid'), 'desert');
});

test('een chunk maken gaat snel genoeg (in Node gemiddeld onder 8 ms)', () => {
  const g = new Generator('world', 424242);
  g.chunk(0, 0);
  const t = performance.now();
  for (let i = 0; i < 40; i++) g.chunk(60 + i, -30 + (i % 7));
  const ms = (performance.now() - t) / 40;
  assert.ok(ms < 8, `${ms.toFixed(1)} ms per chunk`);
});
