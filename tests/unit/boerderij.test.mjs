// Boerderij in Gevaar (fase 7B): welke roofdieren komen wanneer, hoe vaak, en wat mogen ze pakken.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RAIDERS, FARM_PREY, raidersAt, pickRaider, raidGap, isPreyFor } from '../../js/farm.js';
import { SPECIES } from '../../js/animals/species.js';
import { worldType, BIOMES, biomeWeights } from '../../js/biomes.js';
import { Generator } from '../../js/engine/gen.js';

test('het eerste roofdier is een vos, later komen er grotere', () => {
  assert.deepEqual(raidersAt(0), ['fox']);
  assert.ok(raidersAt(3).includes('lioness') && !raidersAt(3).includes('lion'));
  assert.ok(raidersAt(10).includes('tiger') && raidersAt(10).includes('cheetah'));
  for (const type of Object.keys(RAIDERS)) assert.ok(SPECIES[type], `${type} bestaat als dier`);
});

test('de nieuwste roofdieren komen vaker', () => {
  const rnd = (() => { let i = 0; return () => ((i++ * 0.6180339887) % 1); })();
  const counts = {};
  for (let i = 0; i < 4000; i++) { const t = pickRaider(11, rnd); counts[t] = (counts[t] || 0) + 1; }
  assert.ok(counts.tiger > counts.fox, `tijger (${counts.tiger}) vaker dan vos (${counts.fox}) na 11 bezoeken`);
  assert.equal(pickRaider(0, () => 0.99), 'fox', 'bij het begin alleen de vos');
});

test('de bezoeken volgen elkaar steeds sneller op, en \'s nachts nog sneller', () => {
  assert.ok(raidGap(10) < raidGap(0));
  assert.ok(raidGap(0, true) < raidGap(0));
  assert.ok(raidGap(1000) >= 55 * 0.7 - 1e-9, 'nooit sneller dan om de ±39 seconden');
});

test('een roofdier pakt alleen wat hij lust, geen jongen en geen tamme dieren', () => {
  const chicken = { type: 'chicken', baby: 0 };
  assert.ok(isPreyFor('fox', chicken));
  assert.ok(!isPreyFor('fox', { type: 'cow', baby: 0 }), 'een vos pakt geen koe');
  assert.ok(isPreyFor('lioness', { type: 'cow', baby: 0 }));
  assert.ok(!isPreyFor('fox', { ...chicken, baby: 120 }), 'nooit een jong dier');
  assert.ok(!isPreyFor('fox', { ...chicken, tame: true }), 'nooit een tam dier');
  assert.ok(!isPreyFor('fox', { ...chicken, raider: true }));
  for (const r of Object.values(RAIDERS)) for (const t of r.eats) assert.ok(FARM_PREY.has(t), `${t} is een boerderijdier`);
});

test('de boerderij is een wereldsoort die de generator als vlakke weide bouwt', () => {
  assert.equal(worldType('farm'), 'farm');
  assert.ok(BIOMES.farm.kies && BIOMES.farm.dieren.length >= 4);
  assert.deepEqual(biomeWeights('farm'), biomeWeights('flat'));
  const a = new Generator('farm', 7), b = new Generator('flat', 7);
  assert.equal(a.type, 'flat');
  const col = (g) => [0, 17, -23].map((d) => g.raw(48 + d, 48 - d).h);
  assert.deepEqual(col(a), col(b), 'zelfde landschap als een vlakke wereld');
});
