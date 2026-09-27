// De wereld: een blok-raster van SX x SY x SZ, plus het maken en bewaren ervan.

import { AIR, B, BLOCKS } from './blocks.js';

export const SX = 96, SY = 48, SZ = 96;
export const CHUNK = 16;
export const SEA = 10; // waterhoogte

export class World {
  constructor() {
    this.data = new Uint8Array(SX * SY * SZ);
    this.dirtyChunks = new Set();
    this.type = 'island';
    this.seed = 1;
  }

  inside(x, y, z) {
    return x >= 0 && y >= 0 && z >= 0 && x < SX && y < SY && z < SZ;
  }

  get(x, y, z) {
    if (y < 0) return B.BEDROCK;
    if (x < 0 || z < 0 || x >= SX || z >= SZ || y >= SY) return AIR;
    return this.data[x + SX * (z + SZ * y)];
  }

  set(x, y, z, id) {
    if (!this.inside(x, y, z)) return false;
    const i = x + SX * (z + SZ * y);
    if (this.data[i] === id) return false;
    this.data[i] = id;
    this.markDirty(x, z);
    return true;
  }

  // Een blok aan de rand van een chunk raakt ook de buur-chunk (vlakken + schaduw)
  markDirty(x, z) {
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    const lx = x - cx * CHUNK, lz = z - cz * CHUNK;
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      if (dx === -1 && lx !== 0) continue;
      if (dx === 1 && lx !== CHUNK - 1) continue;
      if (dz === -1 && lz !== 0) continue;
      if (dz === 1 && lz !== CHUNK - 1) continue;
      const nx = cx + dx, nz = cz + dz;
      if (nx < 0 || nz < 0 || nx * CHUNK >= SX || nz * CHUNK >= SZ) continue;
      this.dirtyChunks.add(nx + ',' + nz);
    }
  }

  markAllDirty() {
    for (let cx = 0; cx < SX / CHUNK; cx++) for (let cz = 0; cz < SZ / CHUNK; cz++) this.dirtyChunks.add(cx + ',' + cz);
  }

  // Hoogste blok waar je op kunt staan
  surfaceY(x, z) {
    for (let y = SY - 1; y >= 0; y--) {
      if (BLOCKS[this.get(x, y, z)].solid) return y;
    }
    return 0;
  }

  generate(type = 'island', seed = (Math.random() * 1e9) | 0) {
    this.type = type;
    this.seed = seed;
    this.data.fill(AIR);
    if (type === 'flat') generateFlat(this);
    else generateIsland(this, seed);
    this.markAllDirty();
  }

  spawnPoint() {
    const x = SX / 2, z = SZ / 2;
    return { x: x + 0.5, y: this.surfaceY(x, z) + 1.01, z: z + 0.5 };
  }

  // Opslaan als tekst (run-length: [aantal, blok] paren, dan base64)
  serialize() {
    const d = this.data;
    const out = new Uint8Array(d.length * 2);
    let o = 0;
    for (let i = 0; i < d.length;) {
      const v = d[i];
      let n = 1;
      while (n < 255 && i + n < d.length && d[i + n] === v) n++;
      out[o++] = n; out[o++] = v;
      i += n;
    }
    return toBase64(out.subarray(0, o));
  }

  deserialize(str) {
    const bytes = fromBase64(str);
    const d = new Uint8Array(SX * SY * SZ);
    let p = 0;
    for (let i = 0; i + 1 < bytes.length; i += 2) {
      const n = bytes[i], v = BLOCKS[bytes[i + 1]] ? bytes[i + 1] : AIR;
      if (p + n > d.length) throw new Error('wereld te groot');
      d.fill(v, p, p + n);
      p += n;
    }
    if (p !== d.length) throw new Error('wereld onvolledig');
    this.data = d;
    this.markAllDirty();
  }
}

function toBase64(u8) {
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
}

function fromBase64(str) {
  const s = atob(str);
  const u8 = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i);
  return u8;
}

// ---------- wereld maken ----------

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Zachte "value noise" voor heuvels
function makeNoise(seed) {
  const r = rng(seed);
  const N = 256;
  const vals = new Float32Array(N * N);
  for (let i = 0; i < vals.length; i++) vals[i] = r() * 2 - 1;
  const at = (x, z) => vals[((x & (N - 1)) + (z & (N - 1)) * N)];
  const smooth = (t) => t * t * (3 - 2 * t);
  return (x, z) => {
    const x0 = Math.floor(x), z0 = Math.floor(z);
    const fx = smooth(x - x0), fz = smooth(z - z0);
    const a = at(x0, z0), b = at(x0 + 1, z0), c = at(x0, z0 + 1), d = at(x0 + 1, z0 + 1);
    return (a + (b - a) * fx) + ((c + (d - c) * fx) - (a + (b - a) * fx)) * fz;
  };
}

function column(w, x, z, h, top, fill) {
  w.set(x, 0, z, B.BEDROCK);
  for (let y = 1; y <= h; y++) {
    let id = B.STONE;
    if (y === h) id = top;
    else if (y >= h - 3) id = fill;
    w.data[x + SX * (z + SZ * y)] = id;
  }
}

function generateFlat(w) {
  for (let x = 0; x < SX; x++) for (let z = 0; z < SZ; z++) {
    column(w, x, z, SEA + 1, B.GRASS, B.DIRT);
  }
}

function generateIsland(w, seed) {
  const n1 = makeNoise(seed);
  const n2 = makeNoise(seed + 99);
  const r = rng(seed + 7);
  const heights = new Int32Array(SX * SZ);
  const cx = SX / 2, cz = SZ / 2;

  for (let x = 0; x < SX; x++) for (let z = 0; z < SZ; z++) {
    // Afstand tot het midden (0 = midden, 1 = rand), iets rond-vierkant
    const dx = (x - cx) / (SX / 2), dz = (z - cz) / (SZ / 2);
    const d = Math.pow(Math.pow(Math.abs(dx), 3) + Math.pow(Math.abs(dz), 3), 1 / 3);
    const island = clamp01((0.92 - d) / 0.3);
    const hills = n1(x / 18, z / 18) * 4 + n2(x / 7, z / 7) * 1.5;
    let h = 5 + island * (8 + hills);
    // Plat weitje in het midden om lekker te bouwen
    const dc = Math.hypot(x - cx, z - cz);
    if (dc < 14) {
      const f = smooth01(clamp01((dc - 8) / 6));
      h = h * f + (SEA + 3) * (1 - f);
    }
    heights[x + z * SX] = Math.max(2, Math.min(SY - 12, Math.round(h)));
  }

  for (let x = 0; x < SX; x++) for (let z = 0; z < SZ; z++) {
    const h = heights[x + z * SX];
    let top = B.GRASS, fill = B.DIRT;
    if (h <= SEA + 1) { top = B.SAND; fill = B.SAND; }
    if (h >= SEA + 8) top = B.SNOW;
    column(w, x, z, h, top, fill);
    for (let y = h + 1; y <= SEA; y++) w.data[x + SX * (z + SZ * y)] = B.WATER;
  }

  // Bomen, bloemen en graspollen
  const trees = [];
  for (let x = 3; x < SX - 3; x++) for (let z = 3; z < SZ - 3; z++) {
    const h = heights[x + z * SX];
    if (w.get(x, h, z) !== B.GRASS) continue;
    const dc = Math.hypot(x - cx, z - cz);
    const p = r();
    if (dc > 9 && p < 0.014 && trees.every(([tx, tz]) => Math.abs(tx - x) + Math.abs(tz - z) > 5)) {
      trees.push([x, z]);
      tree(w, x, h + 1, z, r);
    } else if (p < 0.05) {
      w.set(x, h + 1, z, r() < 0.5 ? B.FLOWER_RED : B.FLOWER_YELLOW);
    } else if (p < 0.12) {
      w.set(x, h + 1, z, B.TALLGRASS);
    }
  }
}

function tree(w, x, y, z, r) {
  const hgt = 4 + Math.floor(r() * 2);
  const top = y + hgt;
  for (let ly = top - 2; ly <= top + 1; ly++) {
    const rad = ly >= top ? 1 : 2;
    for (let dx = -rad; dx <= rad; dx++) for (let dz = -rad; dz <= rad; dz++) {
      if (Math.abs(dx) === rad && Math.abs(dz) === rad && (ly === top + 1 || r() < 0.5)) continue;
      if (w.get(x + dx, ly, z + dz) === AIR) w.set(x + dx, ly, z + dz, B.LEAVES);
    }
  }
  for (let i = 0; i < hgt; i++) w.set(x, y + i, z, B.LOG);
}

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
function smooth01(t) { return t * t * (3 - 2 * t); }
