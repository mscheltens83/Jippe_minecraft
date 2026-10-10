// Blokken: heeft elk blok een naam, bestaande texturen en een plek in de kist?
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AIR, B, BLOCKS, OPAQUE, PALETTE, DEFAULT_HOTBAR, SPECIALS, blockBoxes, doorId, gateId, isSpecial } from '../../js/blocks.js';
import { TEXTURE_NAMES, ATLAS_COLS } from '../../js/textures.js';
import { World } from '../../js/world.js';

test('elk blok heeft een naam en texturen die bestaan', () => {
  for (const b of BLOCKS) {
    if (!b || b.id === AIR) continue;
    assert.ok(b.name, `blok ${b.id} heeft geen naam`);
    for (const side of ['top', 'side', 'bottom']) {
      assert.ok(TEXTURE_NAMES.includes(b.tex[side]), `blok ${b.id} (${b.name}): textuur '${b.tex[side]}' bestaat niet`);
    }
  }
  // één laag per tegel; WebGL2 belooft 256 lagen, de iPad kan er 2048 (zie scene.js)
  assert.ok(TEXTURE_NAMES.length <= 2 * ATLAS_COLS * ATLAS_COLS, 'de textuuratlas is vol');
});

test('alleen dichte blokken houden zicht tegen', () => {
  for (const b of BLOCKS) if (b) assert.equal(OPAQUE[b.id] === 1, b.render === 'solid', `blok ${b.id}`);
});

test('familie-blokken (trap, deur, hekdeur) verwijzen naar een bestaand blok', () => {
  for (const b of BLOCKS) if (b) assert.ok(BLOCKS[b.family], `blok ${b.id} heeft familie ${b.family}`);
  assert.equal(BLOCKS[doorId(3, true, true)].family, B.DOOR);
  assert.equal(BLOCKS[gateId(3, true)].family, B.GATE);
  assert.ok(BLOCKS[gateId(3, true)].open && !BLOCKS[gateId(3, false)].open);
});

test('alles in de kist en in de onderbalk bestaat', () => {
  for (const id of PALETTE) assert.ok(isSpecial(id) ? SPECIALS[id] : BLOCKS[id], `onbekend ding ${id} in de kist`);
  for (const id of DEFAULT_HOTBAR) assert.ok(PALETTE.includes(id), `${id} in de onderbalk staat niet in de kist`);
  assert.equal(new Set(PALETTE).size, PALETTE.length, 'iets staat dubbel in de kist');
});

test('blockBoxes: lucht geeft steeds dezelfde lege lijst, hekken groeien aan elkaar', () => {
  const w = new World();
  w.generate('flat', 7);
  const y = w.surfaceY(48, 48) + 1;
  assert.equal(blockBoxes(w, 48, y, 48).length, 0);
  assert.equal(blockBoxes(w, 48, y, 48), blockBoxes(w, 40, y, 40));
  w.set(48, y, 48, B.FENCE);
  assert.equal(blockBoxes(w, 48, y, 48).length, 1);
  w.set(49, y, 48, B.FENCE);
  assert.equal(blockBoxes(w, 48, y, 48).length, 3);
  assert.equal(blockBoxes(w, 48, y, 48, true).length, 4, 'botsen: ook de onzichtbare hekplank');
});
