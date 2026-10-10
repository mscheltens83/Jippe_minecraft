// Opdrachtjes en stickers (fase 5B): afvinken, tellen, bewaren en terughalen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Quests, QUESTS, QUEST_GROUPS, QUEST_BY_ID } from '../../js/quests.js';
import { ICONS } from '../../js/icons.js';
import { B } from '../../js/blocks.js';

test('elk opdrachtje heeft een tekst, een plaatje en een groep', () => {
  assert.ok(QUESTS.length >= 25);
  assert.equal(new Set(QUESTS.map((q) => q.id)).size, QUESTS.length, 'geen dubbele namen');
  for (const q of QUESTS) {
    assert.ok(q.tekst.length > 5, q.id);
    assert.ok(ICONS[q.icon], `plaatje ${q.icon} voor ${q.id}`);
    assert.ok(QUEST_GROUPS.some((g) => g.key === q.groep), `groep van ${q.id}`);
  }
});

test('een opdrachtje wordt afgevinkt als het gebeurt, en maar één keer', () => {
  const done = [];
  const q = new Quests({}, (x) => done.push(x.id));
  assert.deepEqual(q.note('ride', { type: 'pig' }).map((x) => x.id), []);
  assert.deepEqual(q.note('ride', { type: 'horse' }).map((x) => x.id), ['paard']);
  q.note('ride', { type: 'horse' });
  assert.deepEqual(done, ['paard']);
});

test('tellen: honderd blokken bouwen, vijf verschillende dieren aaien', () => {
  const q = new Quests();
  for (let i = 0; i < 99; i++) q.note('place', { id: B.STONE });
  assert.ok(!q.done.has('honderd'));
  assert.ok(q.done.has('eersteBlok'));
  assert.equal(Math.round(q.progress(QUEST_BY_ID.get('honderd')) * 100), 99);
  q.note('place', { id: B.STONE });
  assert.ok(q.done.has('honderd'));
  for (let i = 0; i < 10; i++) q.note('pet', { type: 'pig' }); // steeds hetzelfde dier telt één keer
  assert.ok(!q.done.has('aaien'));
  for (const t of ['cow', 'dog', 'cat', 'horse']) q.note('pet', { type: t });
  assert.ok(q.done.has('aaien'));
});

test('bewaren en terughalen, en leegmaken', () => {
  const q = new Quests();
  q.note('portal', {}); q.note('pet', { type: 'pig' }); q.note('pet', { type: 'cow' });
  const again = new Quests(JSON.parse(JSON.stringify(q.save())));
  assert.ok(again.done.has('portaal'));
  assert.equal(again.kinds.aaien.size, 2);
  again.clear();
  assert.equal(again.done.size, 0);
  assert.equal(again.progress(QUEST_BY_ID.get('aaien')), 0);
});

test('"Wat zal ik doen?" kiest een opdrachtje dat nog niet gedaan is', () => {
  const q = new Quests();
  for (const x of QUESTS.slice(1)) q.done.add(x.id);
  assert.equal(q.suggest()?.id, QUESTS[0].id);
  q.done.add(QUESTS[0].id);
  assert.equal(q.suggest(), null);
});
