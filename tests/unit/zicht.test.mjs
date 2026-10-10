// Wat kun je zien? Per sectie welke zijkanten via lucht verbonden zijn (zoals Minecraft's cave culling).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { B } from '../../js/blocks.js';
import { sectionVis, VIS_ALL, pairBit, PW, PH, padIndex } from '../../js/engine/mesher.js';

const pad = (fill) => new Uint16Array(PW * PW * PH).fill(fill);

test('een lege sectie is helemaal open, een volle sectie helemaal dicht', () => {
  assert.equal(sectionVis(pad(0), 2), VIS_ALL);
  assert.equal(sectionVis(pad(B.STONE), 2), 0);
});

test('een tunnel van west naar oost verbindt alleen die twee kanten', () => {
  const p = pad(B.STONE);
  for (let x = 0; x < 16; x++) p[padIndex(x, 40, 8)] = 0; // sectie 2 = y 32..47
  assert.equal(sectionVis(p, 2), pairBit(0, 1));
});

test('een grot die nergens de rand raakt, verbindt niets; glas en water laten door', () => {
  const p = pad(B.STONE);
  for (let x = 4; x < 9; x++) for (let z = 4; z < 9; z++) p[padIndex(x, 40, z)] = 0;
  assert.equal(sectionVis(p, 2), 0);
  for (let y = 32; y < 48; y++) p[padIndex(6, y, 6)] = y % 2 ? B.GLASS : B.WATER; // een schacht van onder naar boven
  assert.equal(sectionVis(p, 2), pairBit(2, 3));
});
