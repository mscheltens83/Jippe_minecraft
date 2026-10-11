// De Wilde Nacht (fase 6A): is het huis dicht, en wordt elke nacht moeilijker?
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../../js/world.js';
import { B, doorId } from '../../js/blocks.js';
import { houseCheck, nightPlan, blockStrength, looseBlocks, BASHERS } from '../../js/storm.js';

function flat() { const w = new World(); w.generate('flat', 3); return w; }

// Een huisje van 5 x 5 (binnen 3 x 3), muren 3 hoog, met een dak
function house(w, x0, y0, z0, block = B.COBBLE) {
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) for (let dy = 0; dy <= 3; dy++) {
    const edge = Math.abs(dx) === 2 || Math.abs(dz) === 2;
    w.set(x0 + dx, y0 + dy, z0 + dz, dy === 3 || edge ? block : 0);
  }
}

test('een dicht huis is dicht; buiten staan is niet dicht', () => {
  const w = flat(), y = w.surfaceY(48, 48) + 1;
  assert.equal(houseCheck(w, 48.5, y, 48.5).closed, false);
  assert.equal(houseCheck(w, 48.5, y, 48.5).outside, true);
  house(w, 48, y, 48);
  assert.equal(houseCheck(w, 48.5, y, 48.5).closed, true);
});

test('een gat in de muur of in het dak wordt gevonden', () => {
  const w = flat(), y = w.surfaceY(48, 48) + 1;
  house(w, 48, y, 48);
  w.set(50, y, 48, 0); w.set(50, y + 1, 48, 0);
  const wall = houseCheck(w, 48.5, y, 48.5);
  assert.equal(wall.closed, false);
  assert.ok(Math.abs(wall.gap.x - 50) <= 1 && wall.gap.z === 48, `gat bij de muur (${JSON.stringify(wall.gap)})`);
  w.set(50, y, 48, B.COBBLE); w.set(50, y + 1, 48, B.COBBLE);
  w.set(48, y + 3, 48, 0); // gat in het dak
  assert.equal(houseCheck(w, 48.5, y, 48.5).closed, false, 'zonder dak komen de vliegers erin');
});

test('een dichte deur is een muur, een open deur een gat', () => {
  const w = flat(), y = w.surfaceY(48, 48) + 1;
  house(w, 48, y, 48);
  w.set(50, y, 48, doorId(0, false, false)); w.set(50, y + 1, 48, doorId(0, true, false));
  assert.equal(houseCheck(w, 48.5, y, 48.5).closed, true, 'dichte deur');
  w.set(50, y, 48, doorId(0, false, true)); w.set(50, y + 1, 48, doorId(0, true, true));
  assert.equal(houseCheck(w, 48.5, y, 48.5).closed, false, 'open deur');
});

test('elke nacht is moeilijker: meer dieren, sneller, minder tijd om te bouwen', () => {
  let prev = nightPlan(1);
  assert.equal(prev.build, 90);
  for (let n = 2; n <= 8; n++) {
    const p = nightPlan(n);
    assert.ok(p.count >= prev.count && p.speed >= prev.speed && p.build <= prev.build, `nacht ${n}`);
    assert.ok(p.kinds.length >= prev.kinds.length);
    assert.ok(p.build >= 45 && p.count <= 20);
    prev = p;
  }
  assert.ok(nightPlan(3).kinds.includes('parrot') && !nightPlan(2).kinds.includes('parrot'), 'in nacht 3 komen de vliegers');
  assert.ok(nightPlan(4).kinds.includes('elephant'), 'in nacht 4 komen de rammers');
  assert.ok(nightPlan(5).kinds.includes('trex') && !nightPlan(4).kinds.includes('trex'), 'in nacht 5 komt de T-rex');
});

test('blokken zijn niet allemaal even sterk', () => {
  assert.equal(blockStrength(B.GLASS), 1);
  assert.equal(blockStrength(B.DIRT), 2);
  assert.equal(blockStrength(B.PLANKS), 4);
  assert.equal(blockStrength(B.COBBLE), 8);
  assert.equal(blockStrength(B.BRICK), 10);
  assert.equal(blockStrength(B.IRON_BLOCK), Infinity);
  assert.equal(blockStrength(B.OBSIDIAN), Infinity);
  assert.equal(blockStrength(0), 0, 'lucht');
});

test('niet elk dier sloopt alles: varken zacht, olifant ook hout, T-rex bijna alles', () => {
  assert.ok(BASHERS.pig >= blockStrength(B.DIRT) && BASHERS.pig < blockStrength(B.PLANKS));
  assert.ok(BASHERS.elephant >= blockStrength(B.PLANKS) && BASHERS.elephant < blockStrength(B.COBBLE));
  assert.ok(BASHERS.trex >= blockStrength(B.BRICK) && BASHERS.trex < blockStrength(B.IRON_BLOCK));
  for (const t of ['chicken', 'rabbit', 'lion', 'goat', 'parrot']) assert.ok(!BASHERS[t], `${t} sloopt niets`);
});

test('een smalle toren valt om als de onderkant weg is; een muur of brede toren niet', () => {
  const w = flat(), y = w.surfaceY(48, 48) + 1;
  for (let i = 0; i < 6; i++) w.set(48, y + i, 48, B.COBBLE);
  w.set(48, y, 48, 0); // onderste blok weg
  assert.equal(looseBlocks(w, 48, y + 1, 48).length, 5, 'de rest van de toren valt');
  // brede toren (2 x 2): één poot weg, hij blijft staan
  for (let i = 0; i < 6; i++) for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) w.set(40 + dx, y + i, 40 + dz, B.COBBLE);
  w.set(40, y, 40, 0);
  assert.equal(looseBlocks(w, 40, y + 1, 40).length, 0, 'brede toren staat nog');
  // muur met een gat onderin: de muur blijft staan
  for (let x = 30; x <= 36; x++) for (let i = 0; i < 3; i++) w.set(x, y + i, 30, B.COBBLE);
  w.set(33, y, 30, 0);
  assert.equal(looseBlocks(w, 33, y + 1, 30).length, 0, 'muur staat nog');
});
