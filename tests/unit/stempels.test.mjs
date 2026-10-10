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
