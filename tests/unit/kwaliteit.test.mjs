// Automatische kwaliteit: hoe snel en in welke volgorde gaat het spel omlaag op een trage tablet?
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QualityMeter, lower, raise, isAndroid, WINDOW, MIN_RATIO } from '../../js/quality.js';

// Zoveel seconden spelen met een vaste beeldtijd; geeft alle beslissingen die niet 0 zijn
function play(meter, fps, seconds) {
  const out = [];
  for (let t = 0; t < seconds; t += 1 / fps) { const d = meter.frame(1 / fps); if (d) out.push(d); }
  return out;
}

test('omlaag: eerst minder scherp, dan minder ver, dan zuinig, dan nog minder', () => {
  let q = { ratio: 1.5, view: 6, zuinig: false }; // zo begint een iPad
  const steps = [];
  for (let next = lower(q); next; next = lower(q)) { q = next; steps.push(`${q.ratio}/${q.view}${q.zuinig ? 'z' : ''}`); }
  assert.deepEqual(steps, ['1.25/6', '1/6', '1/5', '1/4', '1/4z', '0.75/4z', '0.75/3z', `${MIN_RATIO}/3z`]);
  assert.equal(lower(q), null, 'lager dan dit kan niet');
});

test('omhoog: eerst scherper, dan verder kijken, niet voorbij het maximum', () => {
  let q = { ratio: 1, view: 4, zuinig: false }; // zo begint een Android-tablet
  q = raise(q, 1.5, 6); assert.deepEqual(q, { ratio: 1.25, view: 4, zuinig: false });
  q = raise(q, 1.5, 6); assert.equal(q.ratio, 1.5);
  q = raise(q, 1.5, 6); assert.equal(q.view, 5);
  q = raise(q, 1.5, 6); assert.equal(q.view, 6);
  assert.equal(raise(q, 1.5, 6), null);
});

test('een trage tablet (10 beeldjes per seconde) gaat binnen een paar seconden twee stappen tegelijk omlaag', () => {
  const m = new QualityMeter();
  const first = [];
  for (let t = 0; t < 10 && !first.length; t += 0.1) { const d = m.frame(0.1); if (d) first.push([d, t]); }
  assert.equal(first[0][0], 2, 'onder de 20 beeldjes: twee stappen');
  assert.ok(first[0][1] < 3 * WINDOW + 0.2, `pas na ${first[0][1]} s`);
  assert.ok(m.lowered);
  assert.deepEqual(play(m, 10, 3 * WINDOW + 0.01), [2, 2, 2], 'daarna elk stukje weer');
});

test('30 beeldjes per seconde: één stap omlaag; 60: omhoog, maar nooit meer na een keer te traag', () => {
  let m = new QualityMeter();
  assert.deepEqual(play(m, 30, 3 * WINDOW + 0.1), [1]);
  m = new QualityMeter();
  assert.deepEqual(play(m, 60, 3 * WINDOW + 0.1), [-1]);
  assert.deepEqual(play(m, 60, WINDOW + 0.1), [], 'na een stap omhoog eerst even afwachten');
  assert.deepEqual(play(m, 30, WINDOW + 0.1), [1]);
  assert.deepEqual(play(m, 60, 3 * WINDOW), [], 'eenmaal te traag: niet meer omhoog');
  m = new QualityMeter();
  assert.deepEqual(play(m, 48, 5 * WINDOW), [], 'tussen 42 en 57: goed zo');
});

test('haperingen (laden, terug uit de achtergrond) en het menu tellen niet mee', () => {
  const m = new QualityMeter();
  m.warmup = 0;
  for (let i = 0; i < 10; i++) assert.equal(m.frame(2), 0);
  assert.equal(m.frame(0), 0);
  assert.equal(m.frame(NaN), 0);
  assert.equal(m.time, 0);
  m.frame(0.1); m.frame(0.1);
  m.pause();
  assert.equal(m.time, 0);
  assert.equal(m.frames, 0);
});

test('Android herkennen aan de user agent', () => {
  assert.ok(isAndroid('Mozilla/5.0 (Linux; Android 9; SM-T510) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'));
  assert.ok(!isAndroid('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'));
  assert.ok(!isAndroid('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'));
  assert.equal(typeof isAndroid(), 'boolean');
});
