// De Wilde Nacht (fase 6A): is het huis dicht, en wordt elke nacht moeilijker?
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../../js/world.js';
import { B, doorId } from '../../js/blocks.js';
import { houseCheck, nightPlan } from '../../js/storm.js';

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
  assert.ok(nightPlan(4).kinds.includes('trex'), 'in nacht 4 komt de T-rex');
});
