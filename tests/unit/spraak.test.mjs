// Fase 7E: gesproken tips. Eén ding tegelijk, tips wachten hun beurt en zeuren niet.
import { test } from 'node:test';
import assert from 'node:assert/strict';

// Een nep-spraakstem die onthoudt wat er gezegd wordt
const spoken = [];
let cancels = 0;
globalThis.window = { speechSynthesis: { getVoices: () => [], speak: (u) => spoken.push(u), cancel: () => { cancels++; } } };
globalThis.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
const { speech } = await import('../../js/speech.js');
const reset = () => { spoken.length = 0; cancels = 0; speech.queue.length = 0; speech.said.clear(); speech.busy = false; speech.log.length = 0; speech.silent = false; };
const finish = () => spoken[spoken.length - 1].onend();

test('say onderbreekt wat er gezegd werd en wist de wachtrij', () => {
  reset();
  speech.say('Een');
  speech.tip('Twee', 'a');
  assert.deepEqual(spoken.map((u) => u.text), ['Een'], 'de tip wacht tot de zin klaar is');
  speech.say('Drie');
  assert.equal(speech.queue.length, 0);
  assert.equal(spoken.at(-1).text, 'Drie');
  assert.ok(cancels >= 2);
});

test('een tip komt na de zin die nog loopt en daarna pas de volgende', () => {
  reset();
  speech.say('Oei, het schaap is opgegeten!');
  speech.tip('Snel, bouw een hek.', 'hek');
  speech.tip('Zet een fakkel neer.', 'fakkel');
  assert.equal(spoken.length, 1);
  finish();
  assert.equal(spoken.at(-1).text, 'Snel, bouw een hek.');
  finish();
  assert.equal(spoken.at(-1).text, 'Zet een fakkel neer.');
});

test('een tip wordt niet vaker herhaald dan om de zoveel seconden', () => {
  reset();
  assert.equal(speech.tip('Bouw een hek.', 'hek', 60), true);
  finish();
  assert.equal(speech.tip('Bouw een hek.', 'hek', 60), false, 'te kort geleden');
  speech.said.set('hek', Date.now() - 61000);
  assert.equal(speech.tip('Bouw een hek.', 'hek', 60), true, 'na een minuut weer');
  assert.equal(speech.log.filter((t) => t === 'Bouw een hek.').length, 2);
});

test('er wachten hoogstens twee tips; de oudste valt af', () => {
  reset();
  speech.say('Bezig');
  speech.tip('A', 'a'); speech.tip('B', 'b'); speech.tip('C', 'c');
  finish(); assert.equal(spoken.at(-1).text, 'B');
  finish(); assert.equal(spoken.at(-1).text, 'C');
});

test('stil of uit: niets gezegd, wel onthouden voor de tests', () => {
  reset();
  speech.silent = true;
  speech.say('Stil'); speech.tip('Ook stil', 'x');
  assert.equal(spoken.length, 0);
  assert.deepEqual(speech.log, ['Stil', 'Ook stil']);
  assert.equal(speech.last, 'Ook stil');
  speech.silent = false;
});

test('elk roofdier heeft een eigen tip, en elke uitbreekmanier ook', async () => {
  const { RAIDERS, RAIDER_TIPS, ESCAPE_TIPS, CALM_TIPS } = await import('../../js/farm.js');
  for (const type of Object.keys(RAIDERS)) assert.ok(RAIDER_TIPS[type]?.length > 20, `tip voor ${type}`);
  for (const kind of ['jump', 'dig', 'bash']) assert.ok(ESCAPE_TIPS[kind], `tip voor ${kind}`);
  assert.equal(new Set(CALM_TIPS.map(([k]) => k)).size, CALM_TIPS.length, 'geen dubbele sleutels');
  assert.match(RAIDER_TIPS.trex, /ijzer/);
  assert.match(RAIDER_TIPS.pteranodon, /dak/);
  assert.match(RAIDER_TIPS.fox, /graven/);
});

test('het goede lidwoord: het varken, het schaap, het konijn, de kip, de koe', async () => {
  const { de, spoken } = await import('../../js/farm.js');
  for (const t of ['pig', 'sheep', 'rabbit']) assert.equal(de(t), 'het', t);
  for (const t of ['chicken', 'cow', 'goat', 'fox', 'trex']) assert.equal(de(t), 'de', t);
  assert.equal(de('cow', true), 'De');
  assert.equal(spoken('trex'), 'T-rex');
});

test('elke wilde ronde heeft een tip, en de laatste geldt voor alle latere', async () => {
  const { NIGHT_TIPS, nightTip } = await import('../../js/storm.js');
  for (let n = 1; n <= 5; n++) assert.ok(NIGHT_TIPS[n]?.length > 20, `ronde ${n}`);
  assert.equal(nightTip(9), NIGHT_TIPS[5]);
  assert.equal(nightTip(0), NIGHT_TIPS[1]);
  assert.match(NIGHT_TIPS[5], /T-rex/);
});
