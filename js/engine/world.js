// De eindeloze wereld: chunks in een Map, die rond de speler geladen en weer opgeruimd worden.
// Van buiten ziet de wereld eruit zoals vroeger: get, set, inside en surfaceY.
// Onveranderde chunks maakt de generator steeds opnieuw; alleen wat Jippe veranderde, wordt bewaard.

import { AIR, B, BLOCKS, OPAQUE } from '../blocks.js';
import { BIOMES, biomeAt, biomeView, worldType } from '../biomes.js';
import { Generator, GEN_VERSION } from './gen.js';
import { Chunk, local, encodeRLE, decodeRLE, toBase64 } from './chunk.js';
import { relight, SKY_FULL } from './light.js';
import { CHUNK, SY, SEA, SECTION, CENTER, HOME, BORDER, chunkKey, keyCx, keyCz } from './constants.js';

const validBlock = (id) => !!BLOCKS[id];

export class World {
  constructor() {
    this.type = 'island';
    this.seed = 1;
    this.classic = false;
    this.gen = null;
    this.landmarks = [];
    this.chunks = new Map();        // sleutel -> Chunk
    this.stored = new Map();        // sleutel -> ingepakte bewerkte chunk (RLE)
    this.unsaved = new Set();       // sleutels die veranderd zijn sinds het laatste bewaren
    this.dirtySections = new Map(); // sleutel -> bitmasker van secties die opnieuw getekend moeten worden
    this.onChunkAdded = null;       // (chunk) => void
    this.onChunkRemoved = null;     // (chunk) => void
    this.onBlockChanged = null;     // (x, y, z, oud, nieuw) => void
    this.lastKey = -1; this.lastChunk = null;
  }

  // ---------- een wereld beginnen ----------

  // Nieuwe wereld: alles leeg, de bouwplek staat meteen klaar
  generate(type = 'island', seed = (Math.random() * 1e9) | 0, gv = GEN_VERSION) {
    this.open({ type, seed, classic: false, gv });
  }

  // Bestaande wereld openen; `stored` bevat de bewerkte chunks
  // gv: versie van de generator (oude bewaarde werelden: 1)
  open({ type, seed, classic = false, gv = 1 }, stored = new Map()) {
    this.clear();
    this.type = worldType(type);
    this.seed = seed | 0;
    this.classic = !!classic;
    this.gv = gv;
    this.gen = new Generator(this.type, this.seed, { classic: this.classic, gv });
    this.landmarks = this.gen.landmarks;
    this.stored = stored;
    // Het oude stuk van 96 x 96 en een rand eromheen meteen maken (dieren, startplek, tests)
    this.ensureArea(-CHUNK, -CHUNK, HOME + CHUNK - 1, HOME + CHUNK - 1);
  }

  clear() {
    for (const c of this.chunks.values()) this.onChunkRemoved?.(c);
    this.chunks.clear();
    this.stored = new Map();
    this.unsaved.clear();
    this.dirtySections.clear();
    this.lastKey = -1; this.lastChunk = null;
  }

  // ---------- chunks ----------

  chunk(cx, cz) {
    const key = chunkKey(cx, cz);
    if (key === this.lastKey) return this.lastChunk;
    const c = this.chunks.get(key) || null;
    if (c) { this.lastKey = key; this.lastChunk = c; }
    return c;
  }

  // Mag deze chunk bestaan? (binnen de wereldrand)
  allowed(cx, cz) {
    const lo = Math.floor((CENTER - BORDER) / CHUNK), hi = Math.floor((CENTER + BORDER) / CHUNK);
    return cx >= lo && cx <= hi && cz >= lo && cz <= hi;
  }

  // Blokken voor een chunk: uit de opslag als Jippe hem veranderde, anders van de generator
  blocksFor(cx, cz) {
    const saved = this.stored.get(chunkKey(cx, cz));
    if (saved) {
      try { return { blocks: decodeRLE(saved, validBlock), edited: true }; } catch (e) { console.warn('Kapotte chunk', cx, cz, e); }
    }
    return { blocks: this.gen.chunk(cx, cz), edited: false };
  }

  addChunk(cx, cz, blocks, edited = false) {
    const key = chunkKey(cx, cz);
    if (this.chunks.has(key) || !this.allowed(cx, cz)) return this.chunks.get(key) || null;
    const c = new Chunk(cx, cz, blocks);
    c.edited = edited;
    this.chunks.set(key, c);
    this.onChunkAdded?.(c);
    return c;
  }

  // Meteen maken (zonder worker)
  loadChunk(cx, cz) {
    const have = this.chunk(cx, cz);
    if (have || !this.allowed(cx, cz)) return have;
    const { blocks, edited } = this.blocksFor(cx, cz);
    return this.addChunk(cx, cz, blocks, edited);
  }

  ensureArea(x0, z0, x1, z1) {
    for (let cx = Math.floor(x0 / CHUNK); cx <= Math.floor(x1 / CHUNK); cx++) {
      for (let cz = Math.floor(z0 / CHUNK); cz <= Math.floor(z1 / CHUNK); cz++) this.loadChunk(cx, cz);
    }
  }

  // Opruimen; een veranderde chunk wordt eerst ingepakt
  unloadChunk(key) {
    const c = this.chunks.get(key);
    if (!c) return;
    if (c.edited) this.stored.set(key, encodeRLE(c.blocks));
    this.chunks.delete(key);
    this.dirtySections.delete(key);
    if (this.lastKey === key) { this.lastKey = -1; this.lastChunk = null; }
    this.onChunkRemoved?.(c);
  }

  // Zijn deze chunk en zijn 8 buren er? Dan kan hij getekend worden
  neighboursReady(cx, cz) {
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      if (!this.chunk(cx + dx, cz + dz) && this.allowed(cx + dx, cz + dz)) return false;
    }
    return true;
  }

  // ---------- blokken ----------

  inside(x, y, z) {
    return y >= 0 && y < SY && !!this.chunk(Math.floor(x / CHUNK), Math.floor(z / CHUNK));
  }

  isLoaded(x, z) {
    return !!this.chunk(Math.floor(x / CHUNK), Math.floor(z / CHUNK));
  }

  get(x, y, z) {
    if (y < 0) return B.BEDROCK;
    if (y >= SY) return AIR;
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    const c = this.chunk(cx, cz);
    if (!c) return AIR;
    return c.blocks[local(x - cx * CHUNK, y, z - cz * CHUNK)];
  }

  set(x, y, z, id) {
    if (y < 0 || y >= SY) return false;
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    const c = this.chunk(cx, cz);
    if (!c) return false;
    const lx = x - cx * CHUNK, lz = z - cz * CHUNK, i = local(lx, y, lz);
    const old = c.blocks[i];
    if (old === id) return false;
    c.blocks[i] = id;
    c.edited = true;
    c.version++;
    this.unsaved.add(c.key);
    // Hoogte van de kolom bijhouden (daar begint het zonlicht)
    const col = lx + CHUNK * lz, h0 = c.height[col];
    if (OPAQUE[id] && y >= h0) c.height[col] = y + 1;
    else if (!OPAQUE[id] && OPAQUE[old] && y === h0 - 1) {
      let yy = y - 1;
      while (yy >= 0 && !OPAQUE[c.blocks[local(lx, yy, lz)]]) yy--;
      c.height[col] = yy + 1;
    }
    this.markDirty(cx, cz, lx, y, lz);
    for (const [key, mask] of relight(this, x, y, z, old, id, h0, c.height[col])) this.addDirty(key, mask);
    this.onBlockChanged?.(x, y, z, old, id); // de natuurkunde kijkt of er iets moet vallen of stromen
    return true;
  }

  // Secties die opnieuw getekend moeten worden omdat het licht veranderde
  addDirty(key, mask) {
    const n = this.chunks.get(key);
    if (!n) return;
    for (let k = 0; k < SY / SECTION; k++) if (mask & (1 << k)) n.sectionVersion[k]++;
    if (n.meshed) this.dirtySections.set(key, (this.dirtySections.get(key) || 0) | mask);
  }

  // Licht op deze plek (zon * 16 + lamp). Nog geen licht uitgerekend: een schatting.
  lightAt(x, y, z) {
    x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
    if (y >= SY) return SKY_FULL;
    if (y < 0) return 0;
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    const c = this.chunk(cx, cz);
    if (!c) return SKY_FULL;
    const lx = x - cx * CHUNK, lz = z - cz * CHUNK;
    if (c.light) return c.light[local(lx, y, lz)];
    return y >= c.height[lx + CHUNK * lz] ? SKY_FULL : 0;
  }

  aroundVersions(cx, cz) {
    const versions = [];
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) versions.push(this.chunk(cx + dx, cz + dz)?.version ?? -1);
    return versions;
  }

  // Een blok raakt ook de buursecties en buurchunks (vlakken en schaduw in hoekjes)
  markDirty(cx, cz, lx, y, lz) {
    const s = Math.floor(y / SECTION), sy = y - s * SECTION;
    let mask = 1 << s;
    if (sy === 0 && s > 0) mask |= 1 << (s - 1);
    if (sy === SECTION - 1 && s < SY / SECTION - 1) mask |= 1 << (s + 1);
    const xs = lx === 0 ? [-1, 0] : lx === CHUNK - 1 ? [0, 1] : [0];
    const zs = lz === 0 ? [-1, 0] : lz === CHUNK - 1 ? [0, 1] : [0];
    for (const dx of xs) for (const dz of zs) {
      const n = this.chunk(cx + dx, cz + dz);
      if (!n) continue;
      for (let k = 0; k < SY / SECTION; k++) if (mask & (1 << k)) n.sectionVersion[k]++;
      if (!n.meshed && !(dx === 0 && dz === 0)) continue;
      this.dirtySections.set(n.key, (this.dirtySections.get(n.key) || 0) | mask);
    }
  }

  // Hoogste blok waar je op kunt staan (0 als de chunk er niet is)
  surfaceY(x, z) {
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    const c = this.chunk(cx, cz);
    if (!c) return 0;
    const lx = x - cx * CHUNK, lz = z - cz * CHUNK;
    for (let y = SY - 1; y >= 0; y--) if (BLOCKS[c.blocks[local(lx, y, lz)]].solid) return y;
    return 0;
  }

  // Welk landschap is hier? (muziek, weer, lucht en dieren)
  biomeAt(x, z) {
    if (!this.gen?.climate) return biomeAt(this.type, x, z);
    return this.gen.raw(Math.floor(x), Math.floor(z)).biome;
  }

  biomeView(x, z) {
    if (!this.gen?.climate) return biomeView(this.type, x, z);
    return { lucht: BIOMES[this.biomeAt(x, z)].lucht };
  }

  spawnPoint() {
    const x = CENTER, z = CENTER;
    return { x: x + 0.5, y: Math.max(this.surfaceY(x, z), SEA) + 1.01, z: z + 0.5 };
  }

  // ---------- opslag ----------

  // Alle bewerkte chunks, ingepakt (wat er in de opslag moet)
  editedChunks() {
    const out = new Map(this.stored);
    for (const c of this.chunks.values()) if (c.edited) out.set(c.key, encodeRLE(c.blocks));
    return out;
  }

  // Alleen wat veranderd is sinds het vorige bewaren
  takeUnsaved() {
    const out = new Map();
    for (const key of this.unsaved) {
      const c = this.chunks.get(key);
      out.set(key, c ? encodeRLE(c.blocks) : this.stored.get(key));
    }
    this.unsaved.clear();
    return out;
  }

  // Korte tekst die alles beschrijft wat bewaard wordt (om te vergelijken in tests)
  fingerprint() {
    const parts = [...this.editedChunks()].sort((a, b) => a[0] - b[0]).map(([k, v]) => `${keyCx(k)},${keyCz(k)}:${toBase64(v)}`);
    return `${this.type}|${this.seed}|${this.classic ? 1 : 0}|${parts.join(';')}`;
  }

  // ---------- zoeken (voor tests en het ouderscherm) ----------

  countBlocks(test) {
    let n = 0;
    for (const c of this.chunks.values()) for (let i = 0; i < c.blocks.length; i++) if (test(c.blocks[i])) n++;
    return n;
  }

  findBlock(test) {
    for (const c of this.chunks.values()) {
      for (let i = 0; i < c.blocks.length; i++) {
        if (!test(c.blocks[i])) continue;
        const lx = i % CHUNK, lz = Math.floor(i / CHUNK) % CHUNK, y = Math.floor(i / (CHUNK * CHUNK));
        return { x: c.cx * CHUNK + lx, y, z: c.cz * CHUNK + lz, id: c.blocks[i] };
      }
    }
    return null;
  }
}
