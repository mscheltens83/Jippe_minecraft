// Rails en het karretje (fase 5D): vanzelf aansluiten, bochten, hellingen en een rondje rijden.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../../js/world.js';
import { B, BLOCKS } from '../../js/blocks.js';
import { placeState, neighbourChanges, railInfo, isRail, startCart, stepCart, cartPose } from '../../js/rails.js';

// Een rail neerleggen zoals het spel dat doet (de buren draaien mee)
function lay(w, x, y, z, facing = 0) {
  const id = B.RAIL + placeState(w, x, y, z, facing);
  w.set(x, y, z, id);
  for (const c of neighbourChanges(w, x, y, z)) w.set(c.x, c.y, c.z, c.to);
}
function flat() { const w = new World(); w.generate('flat', 3); return w; }

test('elke railstand heeft twee kanten en een textuur', () => {
  for (let s = 0; s < 10; s++) {
    const b = BLOCKS[B.RAIL + s];
    assert.ok(b && b.family === B.RAIL && !b.solid, `stand ${s}`);
    assert.equal(railInfo(B.RAIL + s).ends.length, 2);
  }
});

test('rails op een rij liggen recht, een hoek wordt een bocht', () => {
  const w = flat(), y = w.surfaceY(48, 48) + 1;
  for (let x = 40; x <= 44; x++) lay(w, x, y, 48, 1);
  for (let x = 40; x <= 44; x++) assert.equal(w.get(x, y, 48), B.RAIL + 1, `recht langs x op ${x}`);
  lay(w, 44, y, 49); // om de hoek, naar het zuiden
  const corner = railInfo(w.get(44, y, 48)).ends.slice().sort();
  assert.deepEqual(corner, [2, 3], 'de hoek verbindt west en zuid');
});

test('een rail naast een hogere rail wordt een helling', () => {
  const w = flat(), y = w.surfaceY(48, 48) + 1;
  w.set(50, y, 48, B.STONE);
  lay(w, 50, y + 1, 48, 1);
  lay(w, 49, y, 48, 1);
  assert.equal(railInfo(w.get(49, y, 48)).up, 1, 'helling omhoog naar het oosten');
});

test('het karretje rijdt een heel rondje en komt terug waar het begon', () => {
  const w = flat(), y = w.surfaceY(48, 48) + 1;
  const loop = [];
  for (let x = 40; x <= 46; x++) loop.push([x, 44]);
  for (let z = 45; z <= 48; z++) loop.push([46, z]);
  for (let x = 45; x >= 40; x--) loop.push([x, 48]);
  for (let z = 47; z >= 45; z--) loop.push([40, z]);
  for (const [x, z] of loop) lay(w, x, y, z);
  assert.ok(loop.every(([x, z]) => isRail(w.get(x, y, z))));
  const cart = startCart(w, 43, y, 44, 1);
  const start = cartPose(cart);
  let far = false, back = false, dist = 0;
  for (let i = 0; i < 2000 && !back; i++) {
    stepCart(w, cart, 1, 0.02);
    dist += Math.abs(cart.speed) * 0.02;
    const p = cartPose(cart);
    if (Math.hypot(p.x - start.x, p.z - start.z) > 3) far = true;
    if (far && Math.hypot(p.x - start.x, p.z - start.z) < 0.5) back = true;
  }
  assert.ok(back, 'na een rondje weer bij het begin');
  assert.ok(dist > 18 && dist < 30, `ongeveer de lengte van het rondje (${dist.toFixed(1)})`);
});

test('aan het eind van de rails stopt het karretje', () => {
  const w = flat(), y = w.surfaceY(48, 48) + 1;
  for (let x = 40; x <= 43; x++) lay(w, x, y, 48, 1);
  const cart = startCart(w, 41, y, 48, 1);
  for (let i = 0; i < 500; i++) stepCart(w, cart, 1, 0.02);
  const p = cartPose(cart);
  assert.ok(p.x <= 44.01 && p.x > 43.5, `stopt bij het eind (${p.x})`);
  assert.equal(cart.speed, 0);
});
