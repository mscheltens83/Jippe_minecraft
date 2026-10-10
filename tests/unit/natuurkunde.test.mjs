// Natuurkunde: stromend water, vallend zand, plantjes zonder grond en groeiende gewassen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../../js/world.js';
import { AIR, B, BLOCKS } from '../../js/blocks.js';
import { Physics, TICK } from '../../js/engine/physics.js';

function setup() {
  const w = new World();
  w.generate('flat', 3);
  const p = new Physics(w);
  w.onBlockChanged = (x, y, z, old, id) => p.notify(x, y, z, id);
  const top = w.surfaceY(40, 40);
  const run = (seconds) => { for (let t = 0; t < seconds; t += TICK) p.update(TICK, null); };
  return { w, p, top, run };
}
const level = (id) => (id === B.WATER ? 0 : id >= B.WATER_FLOW && id < B.WATER_FLOW + 8 ? BLOCKS[id].level : -1);

test('water stroomt vanuit een bron 7 blokken ver opzij, en verdwijnt weer als de bron weg is', () => {
  const { w, top, run } = setup();
  const y = top + 1;
  w.set(40, y, 40, B.WATER);
  run(6);
  for (let d = 1; d <= 7; d++) assert.equal(level(w.get(40 + d, y, 40)), d, `${d} blokken van de bron`);
  assert.equal(w.get(48, y, 40), AIR, 'na 7 blokken stopt het water');
  w.set(40, y, 40, AIR);
  run(6);
  for (let d = 0; d <= 8; d++) assert.equal(w.get(40 + d, y, 40), AIR, `water op ${d} blokken is weer weg`);
});

test('water valt naar beneden in een gat', () => {
  const { w, top, run } = setup();
  for (let y = top - 3; y <= top; y++) w.set(43, y, 40, AIR); // een put van 4 diep naast de bron
  w.set(42, top + 1, 40, B.WATER);
  run(6);
  assert.ok(level(w.get(43, top + 1, 40)) === 1, 'naast de bron stroomt het');
  assert.equal(BLOCKS[w.get(43, top - 1, 40)].level, 8, 'in de put valt het water');
  assert.ok(level(w.get(43, top - 3, 40)) >= 1, 'het water komt onderin de put');
});

test('twee bronnen naast elkaar maken een nieuwe bron', () => {
  const { w, top, run } = setup();
  const y = top + 1;
  // een goot van 3 lang met muurtjes, bronnen aan beide uiteinden
  for (let x = 39; x <= 43; x++) { w.set(x, y, 39, B.STONE); w.set(x, y, 41, B.STONE); }
  w.set(39, y, 40, B.STONE); w.set(43, y, 40, B.STONE);
  w.set(40, y, 40, B.WATER); w.set(42, y, 40, B.WATER);
  run(3);
  assert.equal(w.get(41, y, 40), B.WATER);
});

test('zand en grind vallen naar beneden tot op de grond', () => {
  const { w, p, top, run } = setup();
  w.set(45, top + 6, 45, B.SAND);
  run(0.5);
  assert.equal(w.get(45, top + 6, 45), AIR, 'het zand is gaan vallen');
  assert.equal(p.falling.length, 1);
  run(2);
  assert.equal(p.falling.length, 0);
  assert.equal(w.get(45, top + 1, 45), B.SAND, 'het zand ligt op de grond');
  // een stapel: haal het onderste blok weg en de rest zakt
  w.set(46, top + 1, 46, B.GRAVEL); w.set(46, top + 2, 46, B.GRAVEL);
  w.set(46, top, 46, AIR);
  run(3);
  assert.equal(w.get(46, top, 46), B.GRAVEL);
  assert.equal(w.get(46, top + 1, 46), B.GRAVEL);
  assert.equal(w.get(46, top + 2, 46), AIR);
});

test('een bloem zonder grond eronder valt om; gewassen staan alleen op een akker', () => {
  const { w, top, run } = setup();
  w.set(50, top + 1, 50, B.FLOWER_RED);
  run(1);
  assert.equal(w.get(50, top + 1, 50), B.FLOWER_RED, 'op gras blijft de bloem staan');
  w.set(50, top, 50, AIR);
  run(1);
  assert.equal(w.get(50, top + 1, 50), AIR, 'zonder grond valt de bloem om');
  w.set(52, top, 50, B.FARMLAND); w.set(52, top + 1, 50, B.WHEAT);
  run(1);
  assert.equal(w.get(52, top + 1, 50), B.WHEAT);
  w.set(52, top, 50, B.DIRT);
  run(1);
  assert.equal(w.get(52, top + 1, 50), AIR, 'zonder akker verdwijnt de tarwe');
});

test('gewassen groeien in 4 stappen', () => {
  const { w, p, top } = setup();
  w.set(54, top, 50, B.FARMLAND); w.set(54, top + 1, 50, B.CARROTS);
  const random = Math.random;
  Math.random = () => 0; // altijd groeien (en gras groeit ook overal)
  try { for (let i = 0; i < 5; i++) p.randomTicks(null); } finally { Math.random = random; }
  assert.equal(w.get(54, top + 1, 50), B.CARROTS + 3, 'helemaal volgroeid');
});
