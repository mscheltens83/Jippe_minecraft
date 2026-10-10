// Het klimaat van de Grote wereld, zoals in Minecraft: vier trage ruiswaarden per plek
// (land/zee, temperatuur, vocht en ruigheid) bepalen samen de hoogte en het landschap.
// Zo lopen biomen vloeiend in elkaar over en zijn ze groot genoeg om in te spelen.

import { hash, simplex2, fbm } from './noise.js';
import { SEA, SY, CENTER } from './constants.js';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth01 = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

export const RIVER_WIDTH = 0.032;

// Themawerelden (fase 4H): alleen landschappen uit één familie, en bergen naar verhouding
export const THEMES = {
  jungle: { main: 'jungle', bergen: 0.6 },
  desert: { main: 'desert', bergen: 0.35 },
  tundra: { main: 'tundra', bergen: 1, cold: true },
  savanna: { main: 'savanna', bergen: 0.45 },
};

export class Climate {
  constructor(seed, theme = null) {
    this.seed = seed | 0;
    this.theme = THEMES[theme] ? theme : null;
    this.bergen = this.theme ? THEMES[this.theme].bergen : 1;
    this.cont = simplex2(seed + 1101); this.temp = simplex2(seed + 1102); this.hum = simplex2(seed + 1103);
    this.ero = simplex2(seed + 1104); this.riv = simplex2(seed + 1105); this.hill = simplex2(seed + 1106);
    this.detail = simplex2(seed + 1107); this.peak = simplex2(seed + 1108); this.patch = simplex2(seed + 1109);
    this.jitter = simplex2(seed + 1110);
    // Schuif het klimaat zo, dat de bouwplek in een vlakte ligt met bos in de buurt
    [this.sx, this.sz] = this.findStart();
  }

  // De ruwe klimaatwaarden op een (verschoven) plek
  sample(X, Z) {
    const C = fbm(this.cont, X / 900, Z / 900, 4) * 1.4;
    const T = fbm(this.temp, X / 700, Z / 700, 3) * 1.5 + this.jitter(X / 18, Z / 18) * 0.025;
    const H = fbm(this.hum, X / 600, Z / 600, 3) * 1.5 + this.jitter(Z / 18, X / 18) * 0.025;
    const E = fbm(this.ero, X / 520, Z / 520, 3) * 1.4;
    const R = Math.abs(fbm(this.riv, X / 380, Z / 380, 3));
    const L = smooth01((C + 0.16) / 0.14);          // 0 = zee, 1 = land
    const M = smooth01((E - 0.22) / 0.38) * L;      // hoe bergachtig
    return { C, T, H, E, R, L, M };
  }

  // Landschap bij deze klimaatwaarden (zonder rivier, strand en zee)
  landBiome(k, X, Z) {
    const { T, H, E } = k;
    if (this.theme) return this.themeBiome(k, X, Z);
    if (T < -0.42) return H < 0.05 ? 'tundra' : 'taiga';
    if (T < -0.15) return 'taiga';
    if (T < 0.32) {
      if (H < -0.18) return this.patch(X / 160, Z / 160) > 0.55 ? 'flowerField' : 'plains';
      if (H < 0.22) return 'forest';
      if (H < 0.42) return 'birchForest';
      return 'swamp';
    }
    if (H < -0.28) return 'desert';
    if (H < -0.06) return E > 0.05 ? 'mesa' : 'desert';
    if (H < 0.3) return 'savanna';
    return 'jungle';
  }

  // Landschap in een themawereld
  themeBiome(k, X, Z) {
    const { T, H, E } = k;
    switch (this.theme) {
      case 'jungle': return H > 0.38 ? 'swamp' : this.patch(X / 140, Z / 140) > 0.45 ? 'bamboo' : 'jungle';
      case 'desert': return E > 0.08 && H > -0.35 ? 'mesa' : 'desert';
      case 'tundra': return T < 0.05 ? 'tundra' : 'taiga';
      case 'savanna': return H > 0.35 ? 'plains' : 'savanna';
      default: return this.theme;
    }
  }

  // Hoogte zonder de bouwplek (die maakt gen.js vlak)
  height(k, X, Z, biome) {
    const hills = fbm(this.hill, X / 42, Z / 42, 3) * (3 + 6 * smooth01((k.E + 0.1) / 0.5)) + this.detail(X / 9, Z / 9) * 1.2;
    const ocean = SEA - 7 + Math.min(0, k.C) * 22;
    let land = SEA + 2 + Math.max(0, k.C) * 9 + Math.max(-1.5, hills);
    // Bergen: scherpe ruggen tot ver boven de wolken
    if (k.M > 0) land += (0.45 + 0.55 * (1 - Math.abs(this.peak(X / 110, Z / 110)))) * 62 * k.M * this.bergen;
    if (biome === 'mesa') land += Math.round(smooth01((this.detail(X / 34, Z / 34) + 0.1) / 0.5) * 3) * 4;
    if (biome === 'swamp') land = lerp(land, SEA + (this.detail(X / 11, Z / 11) > 0.35 ? -1 : 0.4), 0.85);
    let h = lerp(ocean, land, k.L);
    // Rivier: een geul tot onder zeeniveau, met zachte oevers
    if (k.L > 0.55 && k.R < RIVER_WIDTH * 2.2) {
      const t = smooth01((k.R - RIVER_WIDTH * 0.45) / (RIVER_WIDTH * 1.75));
      h = Math.min(h, lerp(SEA - 3, h, t));
    }
    return h;
  }

  // Alles voor één kolom (in wereldcoördinaten)
  column(x, z) {
    const X = x + this.sx, Z = z + this.sz;
    const k = this.sample(X, Z);
    let biome = this.landBiome(k, X, Z);
    const h = this.height(k, X, Z, biome);
    if (k.L > 0.55 && k.R < RIVER_WIDTH && h <= SEA) biome = 'river';
    else if (h < SEA - 1 && k.L < 0.6) biome = 'ocean';
    else if (k.L < 0.9 && h <= SEA + 2 && k.C < 0) biome = biome === 'tundra' || biome === 'taiga' ? 'tundra' : biome === 'desert' || biome === 'mesa' ? 'desert' : 'beach';
    else if (k.M > 0.45 && h > SEA + 30 && (!this.theme || this.theme === 'tundra')) biome = 'mountains';
    return { h: Math.max(4, Math.min(SY - 4, h)), biome, k };
  }

  // Een startplek zoeken: vlakte op het midden, bos binnen 160 blokken en liefst water in de buurt
  findStart() {
    let fallback = null;
    for (let i = 0; i < 400; i++) {
      const sx = Math.floor((hash(this.seed, i, 3, 77) - 0.5) * 60000), sz = Math.floor((hash(this.seed, i, 4, 77) - 0.5) * 60000);
      const at = (dx, dz) => {
        const X = CENTER + dx + sx, Z = CENTER + dz + sz, k = this.sample(X, Z);
        return { k, biome: this.landBiome(k, X, Z) };
      };
      const mid = at(0, 0);
      if (mid.biome !== (this.theme ? THEMES[this.theme].main : 'plains') || mid.k.L < 0.98 || mid.k.M > 0.05 || mid.k.R < RIVER_WIDTH * 3) continue;
      if (this.theme) return [sx, sz]; // in een themawereld is het hoofdlandschap genoeg
      let forest = false, water = false;
      for (let r = 50; r <= 250 && !(forest && water); r += 50) {
        for (let a = 0; a < 16; a++) {
          const p = at(Math.cos(a / 16 * Math.PI * 2) * r, Math.sin(a / 16 * Math.PI * 2) * r);
          if (r <= 150 && (p.biome === 'forest' || p.biome === 'birchForest')) forest = true;
          if (p.k.L < 0.5 || p.k.R < RIVER_WIDTH) water = true;
        }
      }
      if (forest && water) return [sx, sz];
      if (forest && !fallback) fallback = [sx, sz];
    }
    return fallback || [0, 0];
  }
}
