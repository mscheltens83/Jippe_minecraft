// Worker: maakt chunks, rekent hun licht uit en zet ze om in 3D-vlakken, zodat het spel zelf niet hapert.
import { Generator } from './gen.js';
import { buildPad, meshChunk } from './mesher.js';
import { LightRegion } from './light.js';
import { tintsFor } from './tint.js';

let faceTiles = null;
let gen = null, genKey = '';

self.onmessage = (e) => {
  const m = e.data;
  try {
    if (m.type === 'init') { faceTiles = m.faceTiles; return; }
    const key = `${m.worldType}|${m.seed}|${m.classic ? 1 : 0}`;
    if (key !== genKey) { gen = new Generator(m.worldType, m.seed, { classic: m.classic }); genKey = key; }
    if (m.type === 'gen') {
      const blocks = gen.chunk(m.cx, m.cz);
      self.postMessage({ id: m.id, blocks }, [blocks.buffer]);
    } else if (m.type === 'mesh') {
      // m.blocks: de chunk en zijn 8 buren (rij voor rij, van -1,-1 tot 1,1); null = buiten de wereld
      const at = (cx, cz) => m.blocks[(cx - m.cx + 1) + 3 * (cz - m.cz + 1)] || null;
      const region = new LightRegion(m.cx - 1, m.cz - 1, 3, 3, at);
      const light = region.chunkLight(m.cx, m.cz);
      const pad = buildPad({ chunk: (cx, cz) => { const b = at(cx, cz); return b ? { blocks: b } : null; } }, m.cx, m.cz);
      const tints = tintsFor(gen, m.cx, m.cz);
      const sections = meshChunk(pad, region.lightPad(m.cx, m.cz), faceTiles, m.cx, m.cz, tints);
      const transfer = [light.buffer, tints.buffer];
      for (const s of sections) if (s) for (const k in s) if (s[k]) transfer.push(s[k].pos.buffer, s[k].uv.buffer, s[k].col.buffer, s[k].tint.buffer, s[k].idx.buffer);
      self.postMessage({ id: m.id, sections, light, tints }, transfer);
    }
  } catch (err) {
    self.postMessage({ id: m.id, error: String(err?.stack || err) });
  }
};
