// Werelden maken en bewaren: zelfde seed geeft dezelfde wereld, en opslaan gaat heen en terug.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World, SX, SY, SZ, SEA } from '../../js/world.js';
import { BIOMES, biomeWeights } from '../../js/biomes.js';
import { BLOCKS, B } from '../../js/blocks.js';

const TYPES = Object.keys(BIOMES);

for (const type of TYPES) {
  test(`wereld '${type}': zelfde seed geeft dezelfde wereld, en opslaan gaat heen en terug`, () => {
    const a = new World(), b = new World();
    a.generate(type, 1234);
    b.generate(type, 1234);
    const saved = a.serialize();
    assert.equal(saved, b.serialize(), 'dezelfde seed moet dezelfde wereld geven');
    const c = new World();
    c.deserialize(saved);
    assert.deepEqual(c.data, a.data);
    // De startplek staat op iets stevigs, binnen de wereld, boven water
    const s = a.spawnPoint();
    assert.ok(s.y > SEA && s.y < SY, `startplek op hoogte ${s.y}`);
    assert.ok(BLOCKS[a.get(Math.floor(s.x), Math.floor(s.y) - 1, Math.floor(s.z))].solid, 'startplek staat op een blok');
    // Onderin zit overal de onbreekbare bodem
    for (let x = 0; x < SX; x += 17) for (let z = 0; z < SZ; z += 13) assert.equal(a.get(x, 0, z), B.BEDROCK);
  });
}

test('een andere seed geeft een andere wereld', () => {
  const a = new World(), b = new World();
  a.generate('island', 1);
  b.generate('island', 2);
  assert.notEqual(a.serialize(), b.serialize());
});

test('een kapotte bewaarde wereld verandert de huidige wereld niet', () => {
  const w = new World();
  w.generate('flat', 7);
  const before = w.serialize();
  assert.throws(() => w.deserialize(btoa('\x05\x01')));
  assert.equal(w.serialize(), before);
});

test('avontuur: de gebieden mengen altijd tot precies 1', () => {
  for (let x = 0; x < SX; x += 3) for (let z = 0; z < SZ; z += 3) {
    const sum = biomeWeights('adventure', x, z).reduce((n, b) => n + b.weight, 0);
    assert.ok(Math.abs(sum - 1) < 1e-9, `som ${sum} op ${x},${z}`);
  }
});
