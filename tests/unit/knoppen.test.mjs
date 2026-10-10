// Knoppen, hendels en drukplaten (fase 5E): wat binnen bereik aan en uit gaat.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../../js/world.js';
import { B, BLOCKS, doorId, gateId } from '../../js/blocks.js';
import { signalChanges, powered, switchOn, RANGE } from '../../js/switches.js';

function flat() { const w = new World(); w.generate('flat', 3); return w; }
const apply = (w, list) => { for (const c of list) w.set(c.x, c.y, c.z, c.to); };

test('elke schakelaar heeft een stand uit en aan', () => {
  for (const base of [B.LEVER, B.BUTTON, B.PLATE]) {
    assert.ok(!switchOn(base) && switchOn(base + 1), BLOCKS[base].name);
    assert.equal(BLOCKS[base].family, BLOCKS[base + 1].family);
  }
  assert.equal(BLOCKS[B.SWITCH_LAMP + 1].light, 15);
  assert.equal(BLOCKS[B.SWITCH_LAMP].light, 0);
});

test('een hendel opent een deur en een hek, en zet een lamp aan; uit doet alles weer dicht', () => {
  const w = flat(), y = w.surfaceY(48, 48) + 1;
  w.set(50, y, 48, doorId(0, false, false)); w.set(50, y + 1, 48, doorId(0, true, false));
  w.set(46, y, 48, gateId(1, false));
  w.set(48, y + 2, 50, B.SWITCH_LAMP);
  w.set(48, y, 48, B.LEVER + 1);
  apply(w, signalChanges(w, 48, y, 48));
  assert.ok(BLOCKS[w.get(50, y, 48)].open && BLOCKS[w.get(50, y + 1, 48)].open, 'deur open (beide helften)');
  assert.ok(BLOCKS[w.get(46, y, 48)].open, 'hek open');
  assert.equal(w.get(48, y + 2, 50), B.SWITCH_LAMP + 1, 'lamp aan');
  w.set(48, y, 48, B.LEVER);
  apply(w, signalChanges(w, 48, y, 48));
  assert.ok(!BLOCKS[w.get(50, y, 48)].open, 'deur weer dicht');
  assert.equal(w.get(48, y + 2, 50), B.SWITCH_LAMP, 'lamp weer uit');
});

test('verder dan 4 blokken doet niet mee; een tweede schakelaar houdt de deur open', () => {
  const w = flat(), y = w.surfaceY(48, 48) + 1;
  w.set(48 + RANGE + 1, y, 48, doorId(0, false, false));
  w.set(48, y, 48, B.LEVER + 1);
  apply(w, signalChanges(w, 48, y, 48));
  assert.ok(!BLOCKS[w.get(48 + RANGE + 1, y, 48)].open, 'te ver weg');
  w.set(52, y, 48, B.BUTTON + 1);
  w.set(52, y, 50, doorId(0, false, false));
  apply(w, signalChanges(w, 52, y, 48));
  assert.ok(powered(w, 52, y, 50));
  w.set(52, y, 48, B.BUTTON); // de knop springt terug, maar de hendel (4 verder) staat nog aan
  apply(w, signalChanges(w, 52, y, 48));
  assert.ok(BLOCKS[w.get(52, y, 50)].open, 'de hendel houdt de deur open');
});
