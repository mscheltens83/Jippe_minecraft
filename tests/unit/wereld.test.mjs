// De eindeloze wereld: chunks maken, bewaren, laden en oude werelden omzetten.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { World, SY, SEA, CENTER, CHUNK, SHIFT } from '../../js/world.js';
import { Generator } from '../../js/engine/gen.js';
import { encodeRLE, decodeRLE, toBase64, fromBase64 } from '../../js/engine/chunk.js';
import { chunkKey } from '../../js/engine/constants.js';
import { migrateSave } from '../../js/engine/migrate.js';
import { BIOMES, biomeWeights } from '../../js/biomes.js';
import { BLOCKS, B } from '../../js/blocks.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TYPES = Object.keys(BIOMES);
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

for (const type of TYPES) {
  test(`wereld '${type}': zelfde seed en plek geven altijd dezelfde chunk, in elke volgorde`, () => {
    const a = new Generator(type, 1234), b = new Generator(type, 1234);
    // b maakt eerst andere chunks (zoals een worker die ergens anders bezig was)
    for (const [cx, cz] of [[9, 9], [-4, 7], [3, 2], [2, 3]]) b.chunk(cx, cz);
    for (const [cx, cz] of [[2, 2], [3, 3], [-1, 0], [12, -7], [40, 25]]) {
      assert.ok(same(a.chunk(cx, cz), b.chunk(cx, cz)), `chunk ${cx},${cz} verschilt`);
    }
    const w = new World();
    w.generate(type, 1234);
    const s = w.spawnPoint();
    assert.ok(s.y > SEA && s.y < SY, `startplek op hoogte ${s.y}`);
    assert.ok(BLOCKS[w.get(Math.floor(s.x), Math.floor(s.y) - 1, Math.floor(s.z))].solid, 'startplek staat op een blok');
    for (let x = -10; x < 110; x += 17) for (let z = -10; z < 110; z += 13) assert.equal(w.get(x, 0, z), B.BEDROCK);
  });
}

test('een andere seed geeft een andere wereld', () => {
  const a = new Generator('island', 1).chunk(4, 4), b = new Generator('island', 2).chunk(4, 4);
  assert.ok(!same(a, b));
});

test('bouwwerken bij de bouwplek staan er echt, met een schatkist in tempel en piramide', () => {
  const want = { jungle: ['temple'], desert: ['pyramid', 'oasis', 'oasis', 'oasis'], tundra: ['igloo', 'igloo'],
    savanna: ['lionRock', 'wateringHole'], adventure: ['temple', 'igloo', 'pyramid', 'lionRock', 'oasis', 'wateringHole'] };
  for (const [type, kinds] of Object.entries(want)) {
    const w = new World();
    w.generate(type, 777);
    assert.deepEqual(w.landmarks.map((l) => l.kind), kinds, type);
    for (const l of w.landmarks) {
      assert.ok(Math.hypot(l.x - CENTER, l.z - CENTER) < 40, `${type}: ${l.kind} ligt te ver weg`);
      if (l.kind === 'temple' || l.kind === 'pyramid') assert.equal(w.get(l.x, l.y, l.z + 1), B.TREASURE, `${type}: schatkist in ${l.kind}`);
      if (l.kind === 'lionRock') assert.equal(w.get(l.x, l.y + 6, l.z + 3), B.STONE, 'leeuwenrots heeft een vlak bovenop');
      if (l.kind === 'wateringHole' || l.kind === 'oasis') assert.equal(w.get(l.x, l.y - 1, l.z), B.WATER, `${type}: water in ${l.kind}`);
    }
  }
});

test('elke wereld heeft zijn eigen bomen bij de bouwplek', () => {
  const logs = { island: [B.LOG], jungle: [B.JUNGLE_LOG], desert: [B.PALM_LOG], tundra: [B.SPRUCE_LOG], savanna: [B.ACACIA_LOG] };
  for (const [type, ids] of Object.entries(logs)) {
    const w = new World();
    w.generate(type, 4321);
    assert.ok(w.countBlocks((id) => ids.includes(id)) > 10, `${type}: te weinig bomen`);
  }
});

test('verderop ligt ook wereld, en ver weg staan soms bouwwerken', () => {
  const g = new Generator('savanna', 99);
  let land = 0, structures = 0;
  for (let rx = 3; rx < 9; rx++) for (let rz = -4; rz < 2; rz++) if (g.region(rx, rz)) structures++;
  for (let cx = 20; cx < 30; cx++) for (let cz = -20; cz < -10; cz++) {
    const c = g.chunk(cx, cz);
    if (c[8 + CHUNK * (8 + CHUNK * (SEA + 1))] !== 0) land++;
  }
  assert.ok(land > 0, 'nergens land ver weg');
  assert.ok(structures > 0, 'geen enkel bouwwerk ver weg');
});

test('inpakken van een chunk gaat heen en terug, ook als tekst', () => {
  const blocks = new Generator('jungle', 5).chunk(3, 3);
  const rle = encodeRLE(blocks);
  assert.ok(rle.length < blocks.length / 4, 'inpakken maakt het veel kleiner');
  assert.ok(same(decodeRLE(rle), blocks));
  assert.ok(same(decodeRLE(fromBase64(toBase64(rle))), blocks));
  assert.throws(() => decodeRLE(new Uint16Array([5, 1])), /onvolledig/);
});

test('alleen veranderde chunks worden bewaard, en komen terug bij het openen', () => {
  const w = new World();
  w.generate('flat', 7);
  assert.equal(w.editedChunks().size, 0, 'een nieuwe wereld heeft niets te bewaren');
  const y = w.surfaceY(48, 48) + 1;
  w.set(48, y, 48, B.RAINBOW);
  w.set(-3, y, 100, B.GOLD);
  const edited = w.editedChunks();
  assert.equal(edited.size, 2);
  assert.deepEqual([...w.takeUnsaved().keys()].sort(), [...edited.keys()].sort());
  assert.equal(w.takeUnsaved().size, 0, 'na bewaren is er niets meer nieuw');
  const before = w.fingerprint();
  const v = new World();
  v.open({ type: 'flat', seed: 7 }, edited);
  assert.equal(v.get(48, y, 48), B.RAINBOW);
  assert.equal(v.get(-3, y, 100), B.GOLD);
  assert.equal(v.fingerprint(), before);
});

test('een chunk ver weg wegzetten en terughalen bewaart wat je bouwde', () => {
  const w = new World();
  w.generate('island', 3);
  w.loadChunk(30, 30);
  const x = 30 * CHUNK + 4, z = 30 * CHUNK + 4, y = 100;
  w.set(x, y, z, B.DIAMOND);
  w.unloadChunk(chunkKey(30, 30));
  assert.equal(w.get(x, y, z), 0, 'weggezet: niet meer te zien');
  w.loadChunk(30, 30);
  assert.equal(w.get(x, y, z), B.DIAMOND);
});

test('bouwen op een chunkgrens markeert ook de buurchunk om opnieuw te tekenen', () => {
  const w = new World();
  w.generate('flat', 7);
  for (const c of w.chunks.values()) c.meshed = true;
  w.dirtySections.clear();
  w.set(CHUNK * 2, 60, CHUNK * 2 + 5, B.STONE); // linkerrand van chunk 2
  assert.ok(w.dirtySections.has(chunkKey(2, 2)) && w.dirtySections.has(chunkKey(1, 2)));
});

test('avontuur: de gebieden mengen altijd tot precies 1', () => {
  for (let x = -60; x < 160; x += 7) for (let z = -60; z < 160; z += 7) {
    const sum = biomeWeights('adventure', x, z).reduce((n, b) => n + b.weight, 0);
    assert.ok(Math.abs(sum - 1) < 1e-9, `som ${sum} op ${x},${z}`);
  }
});

// Oude opslag maken zoals de eerste versies dat deden (96 x 96 x 48, paren [aantal, blok])
function oldSave(fill) {
  const d = new Uint8Array(96 * 96 * 48);
  for (let x = 0; x < 96; x++) for (let z = 0; z < 96; z++) for (let y = 0; y < 48; y++) d[x + 96 * (z + 96 * y)] = fill(x, y, z);
  let s = '';
  for (let i = 0; i < d.length;) {
    let n = 1;
    while (n < 255 && i + n < d.length && d[i + n] === d[i]) n++;
    s += String.fromCharCode(n, d[i]);
    i += n;
  }
  return { v: 3, t: 1, type: 'flat', seed: 7, blocks: btoa(s), player: { x: 48.5, y: 12.01, z: 48.5, yaw: 1, pitch: 0, flying: false },
    hotbar: [1, 2, 3, 4, 5, 6, 7, 8, 9], sel: 2, mode: 'build', animals: [{ t: 'pig', x: 50, y: 12, z: 50, yaw: 0 }] };
}

test('een oude wereld komt op dezelfde plek, 38 blokken hoger', () => {
  const save = oldSave((x, y, z) => (y === 0 ? B.BEDROCK : y < 11 ? B.STONE : y === 11 ? B.GRASS : x === 10 && z === 10 && y === 12 ? B.RAINBOW : 0));
  const { meta, chunks } = migrateSave(save);
  assert.equal(meta.v, 4);
  assert.equal(meta.classic, true);
  assert.equal(meta.player.y, 12.01 + SHIFT);
  assert.equal(meta.animals[0].y, 12 + SHIFT);
  assert.equal(chunks.size, 36);
  const w = new World();
  w.open(meta, chunks);
  assert.equal(w.get(10, 12 + SHIFT, 10), B.RAINBOW);
  assert.equal(w.get(10, 11 + SHIFT, 10), B.GRASS);
  assert.equal(w.get(10, SHIFT, 10), B.STONE, 'de oude bodem wordt steen');
  assert.equal(w.get(10, 0, 10), B.BEDROCK);
  assert.equal(w.get(10, 20, 10), B.STONE);
  // Buiten het oude stuk: een platte wereld loopt gewoon door
  assert.equal(w.surfaceY(-5, 40), 11 + SHIFT);
  assert.equal(w.surfaceY(105, 40), 11 + SHIFT);
});

test('de echte wereld uit fase 2 wordt blok voor blok goed omgezet', () => {
  const save = JSON.parse(fs.readFileSync(path.join(root, 'tests/fixtures/fase-2-v2.json'), 'utf8'));
  const { meta, chunks } = migrateSave(save);
  const raw = atob(save.blocks), old = new Uint8Array(96 * 96 * 48);
  for (let i = 0, p = 0; i + 1 < raw.length; i += 2) { old.fill(raw.charCodeAt(i + 1), p, p + raw.charCodeAt(i)); p += raw.charCodeAt(i); }
  const w = new World();
  w.open(meta, chunks);
  let diff = 0;
  for (let x = 0; x < 96; x++) for (let z = 0; z < 96; z++) for (let y = 1; y < 48; y++) {
    if (w.get(x, y + SHIFT, z) !== old[x + 96 * (z + 96 * y)]) diff++;
  }
  assert.equal(diff, 0, `${diff} blokken anders`);
  assert.equal(meta.player.y, save.player.y + SHIFT);
  assert.deepEqual(meta.hotbar, save.hotbar);
  assert.equal(meta.animals.length, save.animals.length);
  assert.equal(meta.type, 'island');
});

test('een kapotte oude wereld geeft een fout in plaats van een halve wereld', () => {
  assert.throws(() => migrateSave({ v: 3, blocks: btoa('\x05\x01') }), /onvolledig/);
});
