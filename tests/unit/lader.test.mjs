// De lader stuurt workers alleen de chunks die ze nog niet hebben (analyse 5.4.1).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../../js/world.js';
import { ChunkLoader } from '../../js/engine/loader.js';
import { B } from '../../js/blocks.js';

function setup() {
  const w = new World(); w.generate('flat', 3);
  return { w, loader: new ChunkLoader(w, null, null) };
}

test('de eerste keer gaan alle 9 chunks mee, daarna alleen wat de worker nog niet heeft', () => {
  const { w, loader } = setup();
  const c = w.chunk(3, 3);
  const first = loader.meshBlocks(c, 0);
  assert.equal(first.blocks.filter(Boolean).length, 9);
  const again = loader.meshBlocks(c, 0);
  assert.equal(again.blocks.filter(Boolean).length, 0, 'zelfde chunks, zelfde versie: niets kopiëren');
  const next = loader.meshBlocks(w.chunk(4, 3), 0); // één naar rechts: 6 buren heeft de worker al
  assert.equal(next.blocks.filter(Boolean).length, 3);
  const other = loader.meshBlocks(c, 1);            // een andere worker heeft nog niets
  assert.equal(other.blocks.filter(Boolean).length, 9);
});

test('een veranderde chunk gaat opnieuw mee', () => {
  const { w, loader } = setup();
  const c = w.chunk(3, 3);
  loader.meshBlocks(c, 0);
  w.set(3 * 16 + 5, 60, 3 * 16 + 5, B.STONE);
  const after = loader.meshBlocks(c, 0);
  assert.equal(after.blocks.filter(Boolean).length, 1);
  assert.equal(after.blocks[4][5 + 16 * (5 + 16 * 60)], B.STONE, 'met de nieuwe blokken');
});

test('de cache blijft klein: de oudste chunks mogen weg', () => {
  const { w, loader } = setup();
  let dropped = 0;
  for (let cx = 0; cx < 12; cx++) for (let cz = 0; cz < 3; cz++) {
    const c = w.chunk(cx, cz) || (w.loadChunk(cx, cz), w.chunk(cx, cz));
    if (c) dropped += loader.meshBlocks(c, 0).drop.length;
  }
  assert.ok(loader.sent[0].size <= 48, `hoogstens 48 (${loader.sent[0].size})`);
  assert.ok(dropped > 0, 'en de worker hoort welke weg mogen');
});

test('een nieuwe wereld: de cache begint opnieuw', () => {
  const { w, loader } = setup();
  loader.meshBlocks(w.chunk(3, 3), 0);
  loader.reset();
  assert.equal(loader.meshBlocks(w.chunk(3, 3), 0).blocks.filter(Boolean).length, 9);
});
