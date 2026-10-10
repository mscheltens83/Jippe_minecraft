// Meetscherm en meetrit: rekenwerk en de vaste route.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { frameStats } from '../../js/perf.js';
import { benchPath } from '../../js/bench.js';
import { SX, SZ, SY, SEA } from '../../js/world.js';

test('frameStats rekent gemiddelde en percentielen uit', () => {
  const times = [...Array(95).fill(1 / 60), ...Array(5).fill(0.1)];
  const s = frameStats(times);
  assert.equal(s.n, 100);
  assert.ok(Math.abs(s.p50 - 1 / 60) < 1e-9);
  assert.equal(s.p95, 0.1);
  assert.equal(s.max, 0.1);
  assert.ok(s.fps > 40 && s.fps < 50, `gemiddeld ${s.fps}`);
  assert.equal(frameStats([]), null);
  assert.equal(frameStats([0, -1]), null, 'lege beeldjes tellen niet mee');
});

test('de route van de meetrit blijft boven de wereld', () => {
  for (let f = 0; f <= 1; f += 0.01) {
    const p = benchPath(f);
    assert.ok(p.x > 2 && p.x < SX - 2 && p.z > 2 && p.z < SZ - 2, `buiten de wereld bij ${f}`);
    assert.ok(p.y > SEA + 10 && p.y < SY, `hoogte ${p.y} bij ${f}`);
    assert.ok(Number.isFinite(p.yaw) && p.pitch < 0);
  }
});
