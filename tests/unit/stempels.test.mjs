// Stempels: elke stempel bouwt iets, en "terug" zet alles precies terug.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../../js/world.js';
import { buildStamp } from '../../js/stamps.js';

const snapshot = (w) => [...w.chunks.values()].map((c) => c.blocks.slice());

for (const kind of ['house', 'tree', 'tower', 'bridge', 'igloo', 'pyramid', 'temple', 'lionRock', 'portal0', 'portal3']) {
  test(`stempel '${kind}' bouwt iets en is helemaal terug te draaien`, () => {
    const w = new World();
    w.generate('flat', 7);
    const before = snapshot(w);
    // Ook op een chunkgrens (48 is het midden van chunk 3; 64 is een rand)
    for (const [x, z] of [[48, 48], [64, 64]]) {
      const y = w.surfaceY(x, z) + 1;
      for (let dir = 0; dir < 4; dir++) {
        const changes = buildStamp(kind, w, x, y, z, dir);
        assert.ok(changes.length > 5, `${kind} richting ${dir}: maar ${changes.length} blokken`);
        for (const c of changes) w.set(c.x, c.y, c.z, c.to);
        for (const c of [...changes].reverse()) w.set(c.x, c.y, c.z, c.from);
        const after = snapshot(w);
        assert.ok(after.every((b, i) => b.every((v, j) => v === before[i][j])), `${kind} richting ${dir} op ${x},${z}: terug laat iets achter`);
      }
    }
  });
}

// Een stempel op het dak van een hol huis (een kubus) mag niet door het dak heen zakken:
// onder het dak blijft alles zoals het was.
for (const kind of ['house', 'tower', 'villageHouse', 'igloo', 'pyramid', 'temple', 'lionRock']) {
  test(`stempel '${kind}' op het dak van een holle kubus laat de kamer eronder met rust`, () => {
    const w = new World();
    w.generate('flat', 7);
    const x0 = 44, z0 = 44, y0 = w.surfaceY(x0, z0) + 1;
    // kubus van 11 x 11 x 5 met een dak van 1 dik, binnenin lucht
    for (let dx = 0; dx < 11; dx++) for (let dz = 0; dz < 11; dz++) for (let dy = 0; dy < 5; dy++) {
      const wall = dx === 0 || dz === 0 || dx === 10 || dz === 10 || dy === 4;
      w.set(x0 + dx, y0 + dy, z0 + dz, wall ? 4 : 0);
    }
    const roofTop = y0 + 4;
    for (let dir = 0; dir < 4; dir++) {
      const changes = buildStamp(kind, w, x0 + 5, roofTop + 1, z0 + 5, dir);
      assert.ok(changes.length > 5, `${kind}: er wordt niets gebouwd`);
      const inside = changes.filter((c) => c.x > x0 && c.x < x0 + 10 && c.z > z0 && c.z < z0 + 10 && c.y < roofTop);
      assert.equal(inside.length, 0, `${kind} richting ${dir}: ${inside.length} blokken in de kamer onder het dak`);
    }
  });
}
