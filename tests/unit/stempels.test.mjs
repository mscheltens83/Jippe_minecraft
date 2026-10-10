// Stempels: elke stempel bouwt iets, en "terug" zet alles precies terug.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../../js/world.js';
import { buildStamp } from '../../js/stamps.js';

for (const kind of ['house', 'tree', 'tower', 'bridge', 'igloo', 'pyramid', 'temple', 'lionRock']) {
  test(`stempel '${kind}' bouwt iets en is helemaal terug te draaien`, () => {
    const w = new World();
    w.generate('flat', 7);
    const before = w.serialize();
    const y = w.surfaceY(48, 48) + 1;
    for (let dir = 0; dir < 4; dir++) {
      const changes = buildStamp(kind, w, 48, y, 48, dir);
      assert.ok(changes.length > 5, `${kind} richting ${dir}: maar ${changes.length} blokken`);
      for (const c of changes) w.set(c.x, c.y, c.z, c.to);
      for (const c of [...changes].reverse()) w.set(c.x, c.y, c.z, c.from);
      assert.equal(w.serialize(), before, `${kind} richting ${dir}: terug laat iets achter`);
    }
  });
}
