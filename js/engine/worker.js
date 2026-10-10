// Worker: maakt chunks en zet ze om in 3D-vlakken, zodat het spel zelf niet hapert.
import { Generator } from './gen.js';
import { meshChunk } from './mesher.js';

let faceTiles = null;
let gen = null, genKey = '';

self.onmessage = (e) => {
  const m = e.data;
  try {
    if (m.type === 'init') { faceTiles = m.faceTiles; return; }
    if (m.type === 'gen') {
      const key = `${m.worldType}|${m.seed}|${m.classic ? 1 : 0}`;
      if (key !== genKey) { gen = new Generator(m.worldType, m.seed, { classic: m.classic }); genKey = key; }
      const blocks = gen.chunk(m.cx, m.cz);
      self.postMessage({ id: m.id, blocks }, [blocks.buffer]);
    } else if (m.type === 'mesh') {
      const sections = meshChunk(m.pad, faceTiles, m.cx, m.cz);
      const transfer = [];
      for (const s of sections) if (s) for (const k in s) if (s[k]) transfer.push(s[k].pos.buffer, s[k].uv.buffer, s[k].col.buffer, s[k].idx.buffer);
      self.postMessage({ id: m.id, sections }, transfer);
    }
  } catch (err) {
    self.postMessage({ id: m.id, error: String(err?.stack || err) });
  }
};
