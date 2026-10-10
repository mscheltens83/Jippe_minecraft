// Fase 4H deel 1: themawerelden zijn eindeloos met meerdere landschappen uit één familie.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Generator } from '../../js/engine/gen.js';
import { World } from '../../js/world.js';

const biomes = (g) => {
  const seen = new Set();
  for (let x = -600; x <= 600; x += 30) for (let z = -600; z <= 600; z += 30) seen.add(g.raw(x, z).biome);
  return seen;
};

test('elke themawereld heeft meerdere landschappen, allemaal uit zijn eigen familie', () => {
  const family = {
    jungle: ['jungle', 'bamboo', 'swamp'], desert: ['desert', 'mesa'],
    tundra: ['tundra', 'taiga', 'mountains'], savanna: ['savanna', 'plains'],
  };
  const water = ['ocean', 'river', 'beach'];
  for (const [type, land] of Object.entries(family)) {
    const g = new Generator(type, 2024), seen = biomes(g);
    for (const b of land) assert.ok(seen.has(b), `${type} heeft ${b}`);
    for (const b of seen) assert.ok(land.includes(b) || water.includes(b), `${type} heeft geen ${b}`);
    assert.equal(g.raw(48, 48).biome, land[0], `${type}: je begint in het hoofdlandschap`);
  }
});

test('een oude bewaarde themawereld (generator 1) blijft zoals hij was', () => {
  const w = new World();
  w.open({ type: 'tundra', seed: 5, gv: 1 });
  assert.equal(w.gen.climate, null);
  assert.deepEqual([...biomes(w.gen)], ['tundra']);
  const fresh = new World();
  fresh.generate('tundra', 5);
  assert.equal(fresh.gv, 2);
  assert.ok(biomes(fresh.gen).size > 1, 'een nieuwe toendra heeft meer landschappen');
});
