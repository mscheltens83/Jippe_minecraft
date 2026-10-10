// Verkleden en schatkisten (fase 5C)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Wardrobe, HATS, CAPES, STICKER_PRIZES, hatGeos, capeGeos } from '../../js/wardrobe.js';
import { ICONS } from '../../js/icons.js';
import { QUEST_BY_ID } from '../../js/quests.js';
import { structureCells } from '../../js/structures.js';
import { B } from '../../js/blocks.js';

test('elke hoed en cape heeft een plaatje en een vorm', () => {
  for (const x of [...HATS, ...CAPES]) assert.ok(ICONS[x.icon], x.id);
  for (const h of HATS) if (h.id !== 'none') assert.ok(hatGeos(h.id).length > 0, h.id);
  for (const c of CAPES) if (c.id !== 'none') assert.ok(capeGeos(c.id).length > 0, c.id);
  for (const quest of Object.keys(STICKER_PRIZES)) assert.ok(QUEST_BY_ID.has(quest), quest);
});

test('in het begin heb je de pet; schatkisten geven steeds iets nieuws en daarna goud', () => {
  const w = new Wardrobe();
  assert.ok(w.has('hat:cap') && w.has('hat:none') && w.has('cape:none'));
  assert.ok(!w.has('hat:crown'));
  const got = new Set();
  for (;;) {
    const r = w.treasure();
    if (r.gold) break;
    assert.ok(!got.has(r.key), 'niet twee keer hetzelfde');
    got.add(r.key);
  }
  assert.equal(got.size, HATS.length + CAPES.length - 3 - Object.keys(STICKER_PRIZES).length);
  assert.equal(w.treasure().gold, 2);
});

test('verkleden wordt bewaard; iets wat je niet hebt, kun je niet aan', () => {
  const w = new Wardrobe({ unlocked: ['hat:crown'], hat: 'crown', cape: 'rainbow', shirt: '#3f7fd0' });
  assert.equal(w.hat, 'crown');
  assert.equal(w.cape, 'none');
  assert.equal(w.shirt, '#3f7fd0');
  const again = new Wardrobe(JSON.parse(JSON.stringify(w.save())));
  assert.deepEqual(again.look, w.look);
});

test('in tempels, piramides, iglo\'s, schipwrakken, ruïnes, nesten en opgravingen staat een schatkist', () => {
  for (const kind of ['temple', 'pyramid', 'igloo', 'shipwreck', 'ruin', 'nest', 'dig', 'lionRock']) {
    assert.ok(structureCells(kind).some((c) => c[3] === B.TREASURE), kind);
  }
});
