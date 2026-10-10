// Fase 4G deel 2: dorpen, schipwrakken, ruïnes en mijnschachten in de wereld.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Generator } from '../../js/engine/gen.js';
import { villageCells, VILLAGE_STYLES, stampHouseCells, stampWellCells } from '../../js/engine/village.js';
import { B, BLOCKS } from '../../js/blocks.js';
import { CENTER, CHUNK } from '../../js/engine/constants.js';

test('in de Grote wereld ligt altijd een dorp binnen 300 blokken van de start', () => {
  for (const seed of [1, 777, 4242, 99, 12345]) {
    const g = new Generator('world', seed);
    const v = g.home.find((s) => s.kind === 'village');
    assert.ok(v, 'een dorp bij seed ' + seed);
    assert.ok(Math.hypot(v.x - CENTER, v.z - CENTER) <= 300);
    assert.ok(v.beds.length >= 4 && v.beds.length <= 8, '4 tot 8 huisjes');
    assert.ok(g.landmarks.some((l) => l.kind === 'village'));
    assert.ok(v.beds.every((b) => Math.hypot(b.x - v.x, b.z - v.z) < 20), 'de bedden liggen in het dorp (wereldcoördinaten)');
  }
});

test('een dorp heeft een waterput, paden, deuren, bedden, akkers en lantaarns', () => {
  for (const [name, style] of Object.entries(VILLAGE_STYLES)) {
    const { cells, beds } = villageCells(123, style);
    const ids = new Set(cells.map((c) => c[3]));
    const count = (pred) => cells.filter((c) => pred(BLOCKS[c[3]] || {}, c[3])).length;
    assert.ok(cells.some((c) => c[3] === B.WATER && Math.abs(c[0]) <= 1 && Math.abs(c[2]) <= 1), name + ': water in de put');
    assert.ok(ids.has(style.path), name + ': paden');
    assert.equal(count((b) => b.shape === 'door' && !b.upper), beds.length, name + ': een deur per huis');
    assert.equal(count((b) => b.bed && b.bed.head), beds.length, name + ': een bed per huis');
    assert.ok(count((b) => b.crop) >= 20, name + ': akkers met gewassen');
    assert.ok(ids.has(B.LANTERN) && ids.has(B.BOOKSHELF), name + ': lantaarnpalen en een bibliotheek');
  }
});

test('het dorpshuis en de waterput zijn er ook als stempel', () => {
  assert.ok(stampHouseCells().some((c) => BLOCKS[c[3]]?.shape === 'door'));
  assert.ok(stampWellCells().some((c) => c[3] === B.WATER));
});

test('schipwrakken, ruïnes en mijnschachten, elk met een schatkist', () => {
  const g = new Generator('world', 4242), kinds = {};
  for (let rx = -10; rx <= 10; rx++) for (let rz = -10; rz <= 10; rz++) {
    const s = g.region(rx, rz);
    if (s && (s.kind === 'shipwreck' || s.kind === 'ruin')) kinds[s.kind] = s;
  }
  for (const k of ['shipwreck', 'ruin']) {
    assert.ok(kinds[k], 'er is een ' + k);
    assert.ok(kinds[k].cells.some((c) => c[3] === B.TREASURE), k + ' heeft een schatkist');
  }
  // een schipwrak onder water houdt het water in de romp
  let wet = null;
  for (let rx = -10; rx <= 10 && !wet; rx++) for (let rz = -10; rz <= 10 && !wet; rz++) { const s = g.region(rx, rz); if (s?.wet) wet = s; }
  assert.ok(wet && wet.cells.some((c) => c[3] === B.WATER), 'schipwrak onder water');
  // mijnschacht: gangen met stutten en lantaarns, diep onder de grond
  let m = null;
  for (let rx = -4; rx <= 4 && !m; rx++) for (let rz = -4; rz <= 4 && !m; rz++) m = g.mine(rx, rz);
  assert.ok(m, 'een mijnschacht');
  const cells = g.mineCells(m), ids = new Set(cells.map((c) => c[3]));
  assert.ok(ids.has(B.FENCE) && ids.has(B.PLANKS) && ids.has(B.LANTERN_HANGING) && ids.has(B.TREASURE));
  const blocks = g.chunk(Math.floor(m.x / CHUNK), Math.floor(m.z / CHUNK));
  const lx = m.x - Math.floor(m.x / CHUNK) * CHUNK, lz = m.z - Math.floor(m.z / CHUNK) * CHUNK;
  assert.equal(blocks[lx + CHUNK * (lz + CHUNK * (m.y + 1))], 0, 'de gang is uitgegraven');
});
