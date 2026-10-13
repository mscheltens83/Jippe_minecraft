// Fase 7C: over een hek, door de aarde of er doorheen. Wie komt uit een hok, en wie komt erin?
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../../js/world.js';
import { B, gateId } from '../../js/blocks.js';
import { column, passKind, enclosure, bestExit, abilityOf, nearLight } from '../../js/siege.js';

const flat = () => { const w = new World(); w.generate('flat', 5); return w; };
// Een hok van 3 x 3 binnenin, met een muur van `block` (n hoog) eromheen
function pen(w, x0, z0, y, block, n = 1, gate = false) {
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
    for (let dy = 0; dy < 6; dy++) w.set(x0 + dx, y + dy, z0 + dz, 0);
    if (Math.abs(dx) === 2 || Math.abs(dz) === 2) for (let dy = 0; dy < n; dy++) w.set(x0 + dx, y + dy, z0 + dz, block);
  }
  if (gate) w.set(x0, y, z0 - 2, gateId(0, true));
}
const exitFor = (block, n, type) => {
  const w = flat(), y = w.surfaceY(48, 48) + 1;
  pen(w, 48, 48, y, block, n);
  const enc = enclosure(w, 48.5, y, 48.5, 1);
  assert.ok(enc.closed, 'het hok is dicht');
  return bestExit(w, enc, type, 1)?.kind || null;
};

test('een hok wordt herkend; een open plek of een open hekdeur niet', () => {
  const w = flat(), y = w.surfaceY(48, 48) + 1;
  assert.equal(enclosure(w, 48.5, y, 48.5, 1).closed, false, 'in een open veld is geen hok');
  pen(w, 48, 48, y, B.FENCE, 1);
  assert.equal(enclosure(w, 48.5, y, 48.5, 1).closed, true);
  pen(w, 48, 48, y, B.FENCE, 1, true);
  assert.equal(enclosure(w, 48.5, y, 48.5, 1).closed, false, 'een open hekdeur is een gat');
  pen(w, 48, 48, y, B.FENCE, 1);
  w.set(48, y, 46, gateId(0, false));
  assert.equal(enclosure(w, 48.5, y, 48.5, 1).closed, true, 'een dichte hekdeur is een muur');
});

test('een hek is 1,5 hoog; wie springt tot 1,7 komt eroverheen, wie tot 1,1 niet', () => {
  const w = flat(), y = w.surfaceY(48, 48) + 1;
  w.set(48, y, 48, B.FENCE);
  const col = column(w, 48, 48, y, 1);
  assert.equal(col.top, 1.5);
  assert.equal(passKind(abilityOf('chicken'), col), 'jump');
  assert.equal(passKind(abilityOf('lioness'), col), 'jump');
  assert.equal(passKind(abilityOf('goat'), col), 'jump');
  assert.equal(passKind(abilityOf('fox'), col), null, 'een vos springt niet over een hek');
  assert.equal(passKind(abilityOf('cow'), col), null);
  assert.equal(passKind(abilityOf('pig'), col), null, 'een varken beukt een hek van hout niet kapot');
});

test('uit een hok van hek: kippen, geiten en katten springen eruit; koeien, schapen, varkens en konijnen niet', () => {
  for (const type of ['chicken', 'goat', 'lioness', 'lion', 'tiger', 'cheetah']) assert.equal(exitFor(B.FENCE, 1, type), 'jump', type);
  for (const type of ['cow', 'sheep', 'pig', 'rabbit', 'fox']) assert.equal(exitFor(B.FENCE, 1, type), null, type);
});

test('een hek van twee hoog (2,5) houdt alles tegen', () => {
  for (const type of ['chicken', 'goat', 'lioness', 'lion', 'tiger', 'cheetah']) assert.equal(exitFor(B.FENCE, 2, type), null, type);
});

test('een muur van aarde: konijnen en vossen graven, varkens beuken, een tijger springt (2 hoog), een leeuwin niet', () => {
  assert.equal(exitFor(B.DIRT, 2, 'rabbit'), 'dig');
  assert.equal(exitFor(B.DIRT, 2, 'fox'), 'dig');
  assert.equal(exitFor(B.DIRT, 2, 'pig'), 'bash');
  assert.equal(exitFor(B.DIRT, 2, 'tiger'), 'jump');
  assert.equal(exitFor(B.DIRT, 2, 'lioness'), null);
  assert.equal(exitFor(B.DIRT, 2, 'cow'), null);
});

test('een muur van keien van drie hoog houdt alles tegen, ook een muur van hout (planken) van twee hoog de kleine dieren', () => {
  for (const type of ['rabbit', 'fox', 'pig', 'tiger', 'goat', 'lion']) assert.equal(exitFor(B.COBBLE, 3, type), null, type);
  assert.equal(exitFor(B.PLANKS, 2, 'lioness'), null);
  assert.equal(exitFor(B.PLANKS, 1, 'rabbit'), 'jump', 'een muur van één blok hoog (1,0) springt een konijn over');
});

test('een vakje met een fakkel erin licht ver genoeg om kleine roofdieren weg te houden', () => {
  const w = flat(), y = w.surfaceY(48, 48) + 1;
  assert.equal(nearLight(w, 48.5, y, 48.5), false);
  w.set(50, y, 48, B.TORCH);
  assert.equal(nearLight(w, 48.5, y, 48.5), true);
  assert.equal(nearLight(w, 40.5, y, 48.5), false, 'ver weg niet');
});
