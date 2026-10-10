// Portalen (fase 4H): een frame van portaalsteen herkennen, en een kant-en-klaar portaal bouwen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../../js/world.js';
import { B, BLOCKS, AIR, portalId } from '../../js/blocks.js';
import { findPortal, portalCells, portalAt, PORTAL_THEMES } from '../../js/portal.js';

const flat = () => { const w = new World(); w.generate('flat', 7); return w; };
const build = (w, cells) => { for (const [x, y, z, id] of cells) w.set(x, y, z, id); };

test('elke kleur portaalsteen hoort bij een themawereld', () => {
  assert.deepEqual(PORTAL_THEMES, ['jungle', 'desert', 'tundra', 'savanna']);
  for (let c = 0; c < 4; c++) {
    assert.equal(BLOCKS[B.PORTAL_STONE + c].portalColor, c);
    for (const axis of [0, 1]) assert.equal(BLOCKS[portalId(c, axis)].portal, c);
  }
});

test('een frame van 4 x 5 wordt herkend, in beide richtingen', () => {
  for (const axis of [0, 1]) for (let color = 0; color < 4; color++) {
    const w = flat(), y = w.surfaceY(48, 48) + 1;
    build(w, portalCells(color, axis, 48, y, 48, false));
    const found = findPortal(w, 48, y - 1, 48); // de onderkant van het frame
    assert.ok(found, `kleur ${color} richting ${axis}`);
    assert.equal(found.color, color);
    assert.equal(found.axis, axis);
    assert.equal(found.cells.length, 6);
  }
});

test('een groter frame (6 x 7) wordt ook herkend', () => {
  const w = flat(), y = w.surfaceY(48, 48) + 1;
  for (let u = -1; u <= 4; u++) for (let v = -1; v <= 5; v++) {
    const frame = u < 0 || u > 3 || v < 0 || v > 4;
    w.set(48 + u, y + v, 48, frame ? B.PORTAL_STONE : AIR);
  }
  assert.equal(findPortal(w, 47, y + 2, 48)?.cells.length, 20);
});

test('een open, te klein of gemengd frame is geen portaal', () => {
  const y0 = (w) => w.surfaceY(48, 48) + 1;
  let w = flat(), y = y0(w);
  build(w, portalCells(0, 0, 48, y, 48, false));
  w.set(48, y + 3, 48, AIR); // gat in de bovenkant
  assert.equal(findPortal(w, 48, y - 1, 48), null, 'open frame');

  w = flat(); y = y0(w);
  build(w, portalCells(0, 0, 48, y, 48, false));
  w.set(49, y - 1, 48, B.PORTAL_STONE + 1); // één steen van een andere kleur
  assert.equal(findPortal(w, 48, y - 1, 48), null, 'gemengde kleuren');

  w = flat(); y = y0(w);
  for (let u = -1; u <= 1; u++) for (let v = -1; v <= 3; v++) w.set(48 + u, y + v, 48, u === 0 && v >= 0 && v <= 2 ? AIR : B.PORTAL_STONE);
  assert.equal(findPortal(w, 48, y - 1, 48), null, 'maar 1 breed vanbinnen');

  w = flat(); y = y0(w);
  build(w, portalCells(0, 0, 48, y, 48, false));
  w.set(48, y + 1, 48, B.STONE); // iets in de weg
  assert.equal(findPortal(w, 48, y - 1, 48), null, 'blok in het portaal');
});

test('portalCells bouwt een aangestoken portaal en portalAt ziet dat je erin staat', () => {
  const w = flat(), y = w.surfaceY(48, 48) + 1;
  const cells = portalCells(2, 1, 48, y, 48);
  assert.equal(cells.length, 20);
  build(w, cells);
  assert.equal(w.get(48, y, 49), portalId(2, 1));
  assert.equal(w.get(48, y - 1, 48), B.PORTAL_STONE + 2);
  assert.equal(portalAt(w, 48.5, y, 49.5), 2);
  assert.equal(portalAt(w, 50.5, y, 49.5), null);
});
