// Onder de grond: grotten (lange tunnels en grote zalen), meertjes onderin, steensoorten en ertsen.
// Alles hangt alleen af van de seed en de chunk, dus het past overal naadloos op elkaar.

import { AIR, B } from '../blocks.js';
import { hash, rng, simplex2, simplex3 } from './noise.js';
import { CHUNK, SY, SEA } from './constants.js';

const SX = 4, SYG = 8;                     // grof raster voor de 3D-ruis (sneller)
const GX = CHUNK / SX + 1, GY = SY / SYG + 1;
const CARVE = new Uint8Array(256);         // wat een grot mag weghalen
for (const id of [B.STONE, B.DIRT, B.GRAVEL, B.GRANITE, B.DIORITE, B.ANDESITE, B.SANDSTONE, B.RED_DIRT, B.CLAY,
  B.TERRACOTTA_ORANGE, B.TERRACOTTA_BROWN, B.COAL_ORE, B.IRON_ORE]) CARVE[id] = 1;
const STONES = new Uint8Array(256);
for (const id of [B.STONE, B.GRANITE, B.DIORITE, B.ANDESITE]) STONES[id] = 1;

// [blok, gemiddeld aantal per chunk, grootte, laagste y, hoogste y]
const VEINS = [
  [B.GRANITE, 5, 30, 2, 110], [B.DIORITE, 4, 30, 2, 110], [B.ANDESITE, 5, 30, 2, 110],
  [B.GRAVEL, 3, 18, 2, 90], [B.DIRT, 3, 16, 2, 90],
];
const ORES = [
  [B.COAL_ORE, 14, 8, 5, 115], [B.IRON_ORE, 9, 6, 5, 80], [B.COPPER_ORE, 6, 8, 30, 90],
  [B.GOLD_ORE, 3, 6, 4, 36], [B.LAPIS_ORE, 2, 5, 4, 34], [B.REDSTONE_ORE, 4, 6, 4, 22], [B.DIAMOND_ORE, 1.3, 5, 3, 16],
];
const at = (lx, y, lz) => lx + CHUNK * (lz + CHUNK * y);

export class Underground {
  constructor(seed) {
    this.seed = seed | 0;
    this.a = simplex3(seed + 1201); this.b = simplex3(seed + 1202); this.room = simplex3(seed + 1203);
    this.entrance = simplex2(seed + 1204);
    this.grid = new Float32Array(GX * GY * GX * 3);
  }

  // cols[lx + lz * 16] = { h, reserved, noCaves }; entrances: tunnels mogen tot aan het gras komen
  carve(buf, cx, cz, cols, entrances) {
    const x0 = cx * CHUNK, z0 = cz * CHUNK;
    let maxH = 0;
    for (const c of cols) if (!c.noCaves && !c.reserved) maxH = Math.max(maxH, c.h);
    if (maxH < 8) return;
    const gyMax = Math.min(GY - 1, Math.ceil(maxH / SYG) + 1), g = this.grid;
    for (let gy = 0; gy <= gyMax; gy++) for (let gz = 0; gz < GX; gz++) for (let gx = 0; gx < GX; gx++) {
      const X = x0 + gx * SX, Y = gy * SYG, Z = z0 + gz * SX, i = ((gy * GX + gz) * GX + gx) * 3;
      g[i] = this.a(X / 38, Y / 20, Z / 38);
      g[i + 1] = this.b(X / 38, Y / 20, Z / 38);
      g[i + 2] = this.room(X / 64, Y / 30, Z / 64);
    }
    const v = [0, 0, 0];
    const sample = (lx, y, lz) => {
      const fx = lx / SX, fy = y / SYG, fz = lz / SX;
      const ix = Math.min(GX - 2, Math.floor(fx)), iy = Math.min(gyMax - 1, Math.floor(fy)), iz = Math.min(GX - 2, Math.floor(fz));
      const tx = fx - ix, ty = fy - iy, tz = fz - iz;
      for (let k = 0; k < 3; k++) {
        const p = (x, y2, z) => g[((y2 * GX + z) * GX + x) * 3 + k];
        const c00 = p(ix, iy, iz) * (1 - tx) + p(ix + 1, iy, iz) * tx, c10 = p(ix, iy + 1, iz) * (1 - tx) + p(ix + 1, iy + 1, iz) * tx;
        const c01 = p(ix, iy, iz + 1) * (1 - tx) + p(ix + 1, iy, iz + 1) * tx, c11 = p(ix, iy + 1, iz + 1) * (1 - tx) + p(ix + 1, iy + 1, iz + 1) * tx;
        v[k] = (c00 * (1 - ty) + c10 * ty) * (1 - tz) + (c01 * (1 - ty) + c11 * ty) * tz;
      }
      return v;
    };
    for (let lz = 0; lz < CHUNK; lz++) for (let lx = 0; lx < CHUNK; lx++) {
      const c = cols[lx + lz * CHUNK];
      if (c.reserved || c.noCaves) continue;
      let top = c.h - 5;
      // Een ingang: hier mag een tunnel tot aan het gras komen (op het land, niet bij water)
      if (entrances && c.h > SEA + 3 && this.entrance((x0 + lx) / 60, (z0 + lz) / 60) > 0.62) top = c.h;
      for (let y = 5; y <= top; y++) {
        const i = at(lx, y, lz);
        if (!CARVE[buf[i]]) continue;
        const [a, b, room] = sample(lx, y, lz);
        const tunnel = Math.abs(a) < 0.075 && Math.abs(b) < 0.075;
        if (tunnel || (room > 0.62 && y < SEA - 6)) buf[i] = y <= 11 ? B.WATER : AIR;
      }
    }
  }

  // Steensoorten en ertsen: kleine klompjes in de steen
  veins(buf, cx, cz, cols, emeralds) {
    const r = rng(hash(this.seed, cx, cz, 901) * 4294967296);
    const blob = (id, size, y0, y1, replace) => {
      let lx = Math.floor(r() * CHUNK), lz = Math.floor(r() * CHUNK), y = y0 + Math.floor(r() * (y1 - y0 + 1));
      for (let k = 0; k < size; k++) {
        if (lx >= 0 && lx < CHUNK && lz >= 0 && lz < CHUNK && y > 0 && y < SY) {
          const i = at(lx, y, lz);
          if (replace[buf[i]]) buf[i] = id;
        }
        const axis = Math.floor(r() * 3), step = r() < 0.5 ? -1 : 1;
        if (axis === 0) lx += step; else if (axis === 1) y += step; else lz += step;
      }
    };
    const stoneOnly = new Uint8Array(256); stoneOnly[B.STONE] = 1;
    const times = (n) => Math.floor(n) + (r() < n % 1 ? 1 : 0);
    for (const [id, n, size, y0, y1] of VEINS) for (let k = times(n); k > 0; k--) blob(id, size, y0, y1, stoneOnly);
    for (const [id, n, size, y0, y1] of ORES) for (let k = times(n); k > 0; k--) blob(id, size, y0, y1, STONES);
    if (emeralds) for (let k = times(3); k > 0; k--) blob(B.EMERALD_ORE, 2, SEA + 2, SY - 8, STONES);
  }
}
