// Kleur per landschap (gras, blad, water), zoals in Minecraft.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chunkTints, tintsFor, TINTS, TINT_KIND } from '../../js/engine/tint.js';
import { Generator } from '../../js/engine/gen.js';
import { BIOMES } from '../../js/biomes.js';
import { B } from '../../js/blocks.js';

test('elk landschap heeft een kleur voor gras, blad en water', () => {
  for (const name of Object.keys(BIOMES)) {
    assert.ok(TINTS[name] && TINTS[name].length === 3, `kleur voor ${name}`);
  }
  assert.equal(TINT_KIND[B.GRASS], 1);
  assert.equal(TINT_KIND[B.LEAVES], 2);
  assert.equal(TINT_KIND[B.WATER], 3);
  assert.equal(TINT_KIND[B.STONE], 0);
});

test('binnen één landschap is de kleur overal gelijk, op de grens loopt hij zacht over', () => {
  const same = chunkTints(() => 'jungle', 3, -2);
  assert.ok(same.every((v, i) => v === TINTS.jungle[i % 3]));
  const mixed = chunkTints((x) => (x < 8 ? 'jungle' : 'desert'), 0, 0);
  const grass = (lx) => mixed[(lx + 16 * 4) * 3];
  assert.equal(grass(0), TINTS.jungle[0]);
  assert.equal(grass(15), TINTS.desert[0]);
  const r = (c) => c >> 16;
  // de rode component loopt geleidelijk op van jungle (0x59) naar woestijn (0xbf)
  for (let lx = 5; lx < 11; lx++) assert.ok(r(grass(lx + 1)) >= r(grass(lx)), `kolom ${lx}`);
});

test('de kleuren van de Grote wereld komen uit de generator en zijn steeds hetzelfde', () => {
  const a = tintsFor(new Generator('world', 77), 5, 9), b = tintsFor(new Generator('world', 77), 5, 9);
  assert.deepEqual(a, b);
  assert.equal(a.length, 16 * 16 * 3);
});
