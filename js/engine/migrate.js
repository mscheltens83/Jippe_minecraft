// Oude werelden (96 x 96 x 48, opslag v1 t/m v3 in localStorage) omzetten naar de eindeloze
// wereld. Het oude stuk komt op dezelfde plek (x en z van 0 tot 96) en schuift SHIFT blokken
// omhoog, zodat de zee weer op dezelfde hoogte ligt. Eromheen komt nieuwe wereld.

import { AIR, B, BLOCKS } from '../blocks.js';
import { BIOMES } from '../biomes.js';
import { CHUNK, SY, SHIFT, HOME, chunkKey } from './constants.js';
import { local, encodeRLE, CHUNK_SIZE } from './chunk.js';

const OLD_X = 96, OLD_Y = 48, OLD_Z = 96;

export function isOldSave(s) {
  return !!s && [1, 2, 3].includes(s.v) && typeof s.blocks === 'string';
}

// De oude tekst (base64 van paren [aantal, blok]) uitpakken
function oldBlocks(str) {
  const s = atob(str);
  const d = new Uint8Array(OLD_X * OLD_Y * OLD_Z);
  let p = 0;
  for (let i = 0; i + 1 < s.length; i += 2) {
    const n = s.charCodeAt(i), v = s.charCodeAt(i + 1);
    if (p + n > d.length) throw new Error('wereld te groot');
    d.fill(BLOCKS[v] ? v : AIR, p, p + n);
    p += n;
  }
  if (p !== d.length) throw new Error('wereld onvolledig');
  return d;
}

const up = (o) => (o && Number.isFinite(o.y) ? { ...o, y: o.y + SHIFT } : o);

// Geeft { meta, chunks } voor de nieuwe opslag, of gooit een fout als de oude wereld kapot is
export function migrateSave(s) {
  if (!isOldSave(s)) throw new Error('geen oude wereld');
  const old = oldBlocks(s.blocks);
  const chunks = new Map();
  for (let cx = 0; cx < HOME / CHUNK; cx++) for (let cz = 0; cz < HOME / CHUNK; cz++) {
    const blocks = new Uint16Array(CHUNK_SIZE);
    for (let lz = 0; lz < CHUNK; lz++) for (let lx = 0; lx < CHUNK; lx++) {
      const x = cx * CHUNK + lx, z = cz * CHUNK + lz;
      for (let y = 0; y < SY; y++) {
        const oy = y - SHIFT;
        let id;
        if (y === 0) id = B.BEDROCK;
        else if (oy < 0) id = B.STONE;
        else if (oy < OLD_Y) id = old[x + OLD_X * (z + OLD_Z * oy)];
        else id = AIR;
        if (oy === 0 && id === B.BEDROCK) id = B.STONE; // de oude bodem ligt nu midden in de grond
        blocks[local(lx, y, lz)] = id;
      }
    }
    chunks.set(chunkKey(cx, cz), encodeRLE(blocks));
  }
  const p = s.player || {};
  const meta = {
    v: 4,
    t: s.t || Date.now(),
    type: BIOMES[s.type] ? s.type : 'island',
    seed: Number.isFinite(s.seed) ? s.seed | 0 : 1,
    classic: true,
    player: Number.isFinite(p.y) ? { ...p, y: p.y + SHIFT } : null,
    hotbar: s.hotbar, sel: s.sel, mode: s.mode,
    animals: Array.isArray(s.animals) ? s.animals.map(up) : null,
    snowmen: Array.isArray(s.snowmen) ? s.snowmen.map(up) : [],
    thumb: typeof s.thumb === 'string' ? s.thumb : null,
    migratedFrom: s.v,
  };
  return { meta, chunks };
}
