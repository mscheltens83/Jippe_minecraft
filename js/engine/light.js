// Licht per blok, zoals in Minecraft. Elk vakje heeft twee lichtwaarden van 0 tot 15:
// - zonlicht: valt recht naar beneden tot het eerste dichte blok en kruipt dan opzij (1 minder per blok);
// - lamplicht: van fakkels, lantaarns en lampen (ook 1 minder per blok).
// Samen in één byte: zon * 16 + lamp.
//
// Een nieuwe chunk krijgt zijn licht in een stuk wereld van 3 x 3 chunks (in de worker). Licht
// komt nooit verder dan 15 blokken, dus dan klopt het licht in de middelste chunk precies.
// Bouwt of sloopt Jippe iets, dan werkt relight() alleen het stukje bij dat verandert
// (eerst het oude licht weghalen, dan opnieuw laten uitstralen), ook over chunkgrenzen heen.

import { OPAQUE, EMIT } from '../blocks.js';
import { CHUNK, SY, SECTION, chunkKey } from './constants.js';
import { local, CHUNK_SIZE } from './chunk.js';
import { PW, PH, padIndex, LIGHT_CURVE, LIGHT_LINEAR } from './mesher.js';

export { LIGHT_CURVE, LIGHT_LINEAR };

export const SKY_FULL = 0xf0; // open lucht: zon 15, lamp 0

// Een eenvoudige wachtrij van getallen die meegroeit
class Queue {
  constructor(n = 1 << 15) { this.a = new Int32Array(n); this.head = 0; this.tail = 0; }
  get size() { return this.tail - this.head; }
  shift() { return this.a[this.head++]; }
  push(v) {
    if (this.tail === this.a.length) {
      if (this.head > this.a.length >> 1) this.a.copyWithin(0, this.head, this.tail);
      else { const b = new Int32Array(this.a.length * 2); b.set(this.a.subarray(this.head, this.tail)); this.a = b; }
      this.tail -= this.head; this.head = 0;
    }
    this.a[this.tail++] = v;
  }
}

// Licht laten uitstralen in een stuk wereld (breedte W, diepte D, hoogte SY)
function spread(q, L, opaque, W, D) {
  const area = W * D;
  while (q.size) {
    const i = q.shift();
    const v = L[i] - 1;
    if (v <= 0) continue;
    const x = i % W, t = (i - x) / W, z = t % D, y = (t - z) / D;
    let n;
    if (x > 0 && !opaque[n = i - 1] && L[n] < v) { L[n] = v; q.push(n); }
    if (x < W - 1 && !opaque[n = i + 1] && L[n] < v) { L[n] = v; q.push(n); }
    if (z > 0 && !opaque[n = i - W] && L[n] < v) { L[n] = v; q.push(n); }
    if (z < D - 1 && !opaque[n = i + W] && L[n] < v) { L[n] = v; q.push(n); }
    if (y > 0 && !opaque[n = i - area] && L[n] < v) { L[n] = v; q.push(n); }
    if (y < SY - 1 && !opaque[n = i + area] && L[n] < v) { L[n] = v; q.push(n); }
  }
}

// Het licht van een rechthoek chunks in één keer uitrekenen.
// chunkAt(cx, cz) geeft de blokken (Uint16Array) of null (buiten de wereld: lucht).
// Alleen chunks met aan alle kanten nog een chunk erbij krijgen precies het goede licht.
export class LightRegion {
  constructor(cx0, cz0, nx, nz, chunkAt) {
    this.cx0 = cx0; this.cz0 = cz0;
    const W = this.W = nx * CHUNK, D = this.D = nz * CHUNK, area = W * D;
    const N = area * SY;
    const opaque = new Uint8Array(N), sky = this.sky = new Uint8Array(N), blk = this.blk = new Uint8Array(N);
    const q = new Queue();

    // Blokken overnemen; lampen en fakkels gaan meteen in de wachtrij
    for (let cz = 0; cz < nz; cz++) for (let cx = 0; cx < nx; cx++) {
      const blocks = chunkAt(cx0 + cx, cz0 + cz);
      if (!blocks) continue;
      const ox = cx * CHUNK, oz = cz * CHUNK;
      for (let y = 0; y < SY; y++) for (let lz = 0; lz < CHUNK; lz++) {
        let i = local(0, y, lz), r = ox + W * (oz + lz) + area * y;
        for (let lx = 0; lx < CHUNK; lx++, i++, r++) {
          const id = blocks[i];
          if (OPAQUE[id]) opaque[r] = 1;
          const e = EMIT[id];
          if (e) { blk[r] = e; q.push(r); }
        }
      }
    }
    spread(q, blk, opaque, W, D);

    // Zonlicht: recht naar beneden tot het eerste dichte blok
    const height = new Uint8Array(area);
    for (let col = 0; col < area; col++) {
      let y = SY - 1;
      for (; y >= 0; y--) { const r = col + area * y; if (opaque[r]) break; sky[r] = 15; }
      height[col] = y + 1;
    }
    // ... en opzij, waar de buurkolom hoger begint (onder een overhang, langs een rotswand, een grot in)
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
      const col = x + W * z;
      let hn = 0;
      if (x > 0) hn = Math.max(hn, height[col - 1]);
      if (x < W - 1) hn = Math.max(hn, height[col + 1]);
      if (z > 0) hn = Math.max(hn, height[col - W]);
      if (z < D - 1) hn = Math.max(hn, height[col + W]);
      for (let y = height[col]; y < hn; y++) q.push(col + area * y);
    }
    spread(q, sky, opaque, W, D);
  }

  // Het licht van één chunk, zoals het in Chunk.light bewaard wordt
  chunkLight(cx, cz) {
    const out = new Uint8Array(CHUNK_SIZE), { W, D, sky, blk } = this, area = W * D;
    const ox = (cx - this.cx0) * CHUNK, oz = (cz - this.cz0) * CHUNK;
    for (let y = 0; y < SY; y++) for (let lz = 0; lz < CHUNK; lz++) {
      let i = local(0, y, lz), r = ox + W * (oz + lz) + area * y;
      for (let lx = 0; lx < CHUNK; lx++, i++, r++) out[i] = (sky[r] << 4) | blk[r];
    }
    return out;
  }

  // Licht voor de mesher: de chunk plus één rij blokken eromheen (net als het blokken-pad)
  lightPad(cx, cz) {
    const pad = new Uint8Array(PW * PW * PH), { W, D, sky, blk } = this, area = W * D;
    const ox = (cx - this.cx0) * CHUNK, oz = (cz - this.cz0) * CHUNK;
    for (let y = 0; y < SY; y++) for (let lz = -1; lz <= CHUNK; lz++) {
      let r = ox - 1 + W * (oz + lz) + area * y, p = padIndex(-1, y, lz);
      for (let lx = -1; lx <= CHUNK; lx++, r++, p++) pad[p] = (sky[r] << 4) | blk[r];
    }
    for (let lz = -1; lz <= CHUNK; lz++) for (let lx = -1; lx <= CHUNK; lx++) pad[padIndex(lx, SY, lz)] = SKY_FULL;
    return pad;
  }
}

// Het licht van één chunk uitrekenen met de wereld eromheen (op de hoofdthread)
export function regionFor(world, cx0, cz0, nx, nz) {
  return new LightRegion(cx0, cz0, nx, nz, (cx, cz) => world.chunk(cx, cz)?.blocks || null);
}

// Lichtpad uit het bewaarde licht van de chunk en zijn buren. Heeft een buur nog geen licht
// (helemaal aan de rand van wat geladen is), dan schatten we: boven het hoogste blok zon, anders donker.
export function buildLightPad(world, cx, cz) {
  const pad = new Uint8Array(PW * PW * PH);
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    const c = world.chunk(cx + dx, cz + dz);
    const lx0 = dx < 0 ? CHUNK - 1 : 0, lx1 = dx > 0 ? 0 : CHUNK - 1;
    const lz0 = dz < 0 ? CHUNK - 1 : 0, lz1 = dz > 0 ? 0 : CHUNK - 1;
    for (let y = 0; y < SY; y++) for (let lz = lz0; lz <= lz1; lz++) {
      const pz = lz + dz * CHUNK;
      for (let lx = lx0; lx <= lx1; lx++) {
        let v = SKY_FULL;
        if (c?.light) v = c.light[local(lx, y, lz)];
        else if (c) v = y >= c.height[lx + CHUNK * lz] ? SKY_FULL : 0;
        pad[padIndex(lx + dx * CHUNK, y, pz)] = v;
      }
    }
  }
  for (let lz = -1; lz <= CHUNK; lz++) for (let lx = -1; lx <= CHUNK; lx++) pad[padIndex(lx, SY, lz)] = SKY_FULL;
  return pad;
}

// ---------- bijwerken na bouwen of slopen ----------

const NB = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
let RC = null, RI = 0; // laatst gevonden chunk en plek (zonder steeds een nieuw object te maken)

// Zoek het vakje op; false als de chunk er niet is of nog geen licht heeft
function at(world, x, y, z) {
  if (y < 0 || y >= SY) return false;
  const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
  const c = world.chunk(cx, cz);
  if (!c?.light) return false;
  RC = c; RI = local(x - cx * CHUNK, y, z - cz * CHUNK);
  return true;
}
const getL = (sh) => (RC.light[RI] >> sh) & 15;
const setL = (sh, v) => { RC.light[RI] = (RC.light[RI] & ~(15 << sh)) | (v << sh); };

// Een veranderd lichtvakje raakt de vlakken van de blokken eromheen: die secties opnieuw tekenen
function mark(dirty, x, y, z) {
  const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK), lx = x - cx * CHUNK, lz = z - cz * CHUNK;
  const s = Math.floor(y / SECTION), sy = y - s * SECTION;
  let m = 1 << s;
  if (sy === 0 && s > 0) m |= 1 << (s - 1);
  if (sy === SECTION - 1 && s < SY / SECTION - 1) m |= 1 << (s + 1);
  const x0 = lx === 0 ? -1 : 0, x1 = lx === CHUNK - 1 ? 1 : 0, z0 = lz === 0 ? -1 : 0, z1 = lz === CHUNK - 1 ? 1 : 0;
  for (let dx = x0; dx <= x1; dx++) for (let dz = z0; dz <= z1; dz++) {
    const key = chunkKey(cx + dx, cz + dz);
    dirty.set(key, (dirty.get(key) || 0) | m);
  }
}

// Eén lichtsoort bijwerken. `cells` zijn vakjes waarvan de eigen lichtwaarde ("basis") veranderde,
// `opened` is een vakje dat doorzichtig werd (daar mag het licht van de buren nu in).
function channel(world, sh, cells, bases, opened, dirty) {
  const rem = [], add = [];
  for (let k = 0; k < bases.length; k++) {
    const x = cells[k * 3], y = cells[k * 3 + 1], z = cells[k * 3 + 2], base = bases[k];
    if (!at(world, x, y, z)) continue;
    const cur = getL(sh);
    if (cur > base) {
      setL(sh, 0); rem.push(x, y, z, cur); mark(dirty, x, y, z);
      if (base > 0) { setL(sh, base); add.push(x, y, z); }
    } else if (base > cur) {
      setL(sh, base); add.push(x, y, z); mark(dirty, x, y, z);
    }
  }
  if (opened) {
    for (const [dx, dy, dz] of NB) {
      const x = opened[0] + dx, y = opened[1] + dy, z = opened[2] + dz;
      if (at(world, x, y, z) && getL(sh) > 0) add.push(x, y, z);
    }
  }
  // 1. Weghalen: alles wat (misschien) door het oude licht verlicht werd
  for (let h = 0; h < rem.length; h += 4) {
    const x = rem[h], y = rem[h + 1], z = rem[h + 2], v = rem[h + 3];
    for (const [dx, dy, dz] of NB) {
      const nx = x + dx, ny = y + dy, nz = z + dz;
      if (!at(world, nx, ny, nz)) continue;
      const nv = getL(sh);
      if (nv === 0) continue;
      if (nv < v) {
        setL(sh, 0); mark(dirty, nx, ny, nz); rem.push(nx, ny, nz, nv);
        const e = sh === 0 ? EMIT[RC.blocks[RI]] : 0; // een lamp blijft zelf licht geven
        if (e) { setL(sh, e); add.push(nx, ny, nz); }
      } else add.push(nx, ny, nz); // dit vakje krijgt zijn licht ergens anders vandaan
    }
  }
  // 2. Opnieuw laten uitstralen
  for (let h = 0; h < add.length; h += 3) {
    const x = add[h], y = add[h + 1], z = add[h + 2];
    if (!at(world, x, y, z)) continue;
    const v = getL(sh) - 1;
    if (v <= 0) continue;
    for (const [dx, dy, dz] of NB) {
      const nx = x + dx, ny = y + dy, nz = z + dz;
      if (!at(world, nx, ny, nz) || OPAQUE[RC.blocks[RI]] || getL(sh) >= v) continue;
      setL(sh, v); mark(dirty, nx, ny, nz); add.push(nx, ny, nz);
    }
  }
}

// Na het veranderen van één blok. h0 en h1: de hoogte van die kolom ervoor en erna.
// Geeft per chunk een bitmasker van secties die opnieuw getekend moeten worden.
export function relight(world, x, y, z, oldId, newId, h0, h1) {
  const dirty = new Map();
  const opChanged = OPAQUE[oldId] !== OPAQUE[newId];
  if (!opChanged && EMIT[oldId] === EMIT[newId]) return dirty;
  const opened = opChanged && !OPAQUE[newId] ? [x, y, z] : null;
  // Lamplicht: alleen dit vakje heeft een andere basis
  channel(world, 0, [x, y, z], [EMIT[newId]], opened, dirty);
  if (!opChanged) return dirty;
  // Zonlicht: het stuk kolom tussen de oude en de nieuwe hoogte krijgt wel of geen zon meer
  const cells = [], bases = [];
  const lo = Math.min(h0, h1), hi = Math.max(h0, h1);
  for (let yy = lo; yy < hi; yy++) {
    cells.push(x, yy, z);
    bases.push(yy >= h1 && !OPAQUE[world.get(x, yy, z)] ? 15 : 0);
  }
  if (y < lo || y >= hi) { cells.push(x, y, z); bases.push(y >= h1 && !OPAQUE[newId] ? 15 : 0); }
  channel(world, 4, cells, bases, opened, dirty);
  return dirty;
}
