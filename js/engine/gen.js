// De wereld maken, chunk voor chunk. Elke chunk hangt alleen af van de wereldsoort, de seed
// en de plek, dus een chunk kan in een worker gemaakt worden en is later precies na te maken.
// De recepten in biomes.js rekenen nog in de oude hoogtes (zee op 10); hier schuift alles
// SHIFT blokken omhoog.

import { AIR, B } from '../blocks.js';
import { BIOMES, biomeWeights, worldType } from '../biomes.js';
import { structureCells, structureBounds } from '../structures.js';
import { hash, rng, simplex2, fbm } from './noise.js';
import { CHUNK, SY, SEA, SHIFT, CENTER } from './constants.js';
import { biomeTree, TREE_RADIUS } from './trees.js';
import { Climate, THEMES } from './climate.js';
import { Underground } from './caves.js';
import { villageCells, villageStyle, VILLAGE_STYLES, VILLAGE_RADIUS } from './village.js';

const OLD_SEA = SEA - SHIFT;      // 10
// Versie van de generator. 2 (fase 4H): ook de themawerelden zijn eindeloos met meerdere
// landschappen. Bewaarde werelden van vóór 4H (versie 1) houden de oude themawerelden.
export const GEN_VERSION = 2;
const REGION = 128;               // per stuk van 128 x 128 blokken hoogstens één bouwwerk
const S = { biome: 1, tree: 2, prio: 3, treeSeed: 4, plant: 5, plantH: 6, flower: 7, region: 8, rx: 9, rz: 10, kind: 11, pond: 12, palms: 13, village: 14, mine: 15 };
const MINE_REGION = 112;           // per stuk van 112 x 112 hoogstens één mijnschacht
const MINE_ARM = 22;               // zo lang is elke gang vanaf het midden
const MINE_WORLDS = new Set(['world', 'jungle', 'desert', 'tundra', 'savanna', 'dino']);
const POND = new Set(['oasis', 'wateringHole']);
const STRUCTURE_BLOCK = { igloo: B.SNOW, pyramid: B.SANDSTONE, temple: B.MOSSY_COBBLE, lionRock: B.STONE, shipwreck: B.SAND, ruin: B.GRASS, nest: B.GRASS, dig: B.DIRT };
// Bouwwerken bij de bouwplek: dezelfde plekken als in de oude werelden van 96 x 96
const HOME_STRUCTURES = {
  jungle: [['temple', 20, -15]],
  desert: [['pyramid', -23, 8], ['oasis', 20, 12], ['oasis', -13, -23], ['oasis', 13, -23]],
  tundra: [['igloo', 13, -8], ['igloo', -18, 12]],
  savanna: [['lionRock', 15, -5], ['wateringHole', -17, 9]],
  dino: [['nest', 15, -11], ['dig', -17, 12]],
  adventure: [['temple', -21, -21], ['igloo', 20, -20], ['pyramid', -22, 21], ['lionRock', 20, 20],
    ['oasis', -24, 5], ['wateringHole', 27, 6]],
};
const ISLAND_TREES = [{ soort: 'oak', dichtheid: 0.014 }];

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth01 = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };
const index = (lx, y, lz) => lx + CHUNK * (lz + CHUNK * y);

export class Generator {
  // classic: een omgezette oude wereld. Het oude eiland ligt dan in een ring van zee.
  constructor(type, seed, { classic = false, gv = GEN_VERSION } = {}) {
    this.type = worldType(type);
    // De boerderij (fase 7B) is voor de generator gewoon een vlakke weide: de roofdieren vinden zo hun weg,
    // en het verschil zit in het spel (farm.js)
    if (this.type === 'farm') this.type = 'flat';
    this.gv = gv;
    this.seed = seed | 0;
    this.classic = classic;
    this.n1 = simplex2(seed); this.n2 = simplex2(seed + 99); this.river = simplex2(seed + 271);
    this.n3 = simplex2(seed + 512); this.cont = simplex2(seed + 777); this.coast = simplex2(seed + 901);
    this.rawCache = new Map();
    this.colCache = new Map();
    this.treeCache = new Map();
    this.regionCache = new Map();
    this.mineCache = new Map();
    // Grote wereld, en (vanaf versie 2) de themawerelden: het klimaat bepaalt hoogte en landschap
    this.climate = this.type === 'world' ? new Climate(this.seed)
      : THEMES[this.type] && gv >= 2 && !classic ? new Climate(this.seed, this.type) : null;
    this.underground = this.type === 'flat' ? null : new Underground(this.seed);
    this.home = [];
    if (!classic) for (const [kind, dx, dz] of HOME_STRUCTURES[this.type] || []) this.home.push(this.makeStructure(kind, CENTER + dx, CENTER + dz, true));
    // In de Grote wereld ligt er altijd een dorp binnen 300 blokken van de start
    if (this.climate) { const v = this.findVillage(); if (v) this.home.push(v); }
    this.landmarks = this.home.map((s) => ({ kind: s.kind, x: s.x, y: s.y, z: s.z, ...(s.radius ? { radius: s.radius } : {}) }));
  }

  // ---------- hoogte en landschap van één kolom (zonder bouwwerken) ----------

  biomeOf(x, z) {
    const weights = biomeWeights(this.type, x, z);
    if (weights.length === 1) return weights[0].type;
    let pick = hash(this.seed, x, z, S.biome);
    for (const b of weights) { pick -= b.weight; if (pick <= 0) return b.type; }
    return weights[weights.length - 1].type;
  }

  // Land of zee: de bouwplek ligt altijd op land; verderop wisselen land en zee elkaar af
  land(x, z, dist) {
    const c = fbm(this.cont, x / 420, z / 420, 3);
    let land = clamp01((c + 0.12) / 0.25);
    if (!this.classic) land = Math.max(land, 1 - smooth01((dist - 70) / 80));
    else land = Math.min(land, smooth01((dist - 110) / 50));
    return land;
  }

  raw(x, z) {
    const key = x * 65536 + z;
    let r = this.rawCache.get(key);
    if (r) return r;
    r = this.computeRaw(x, z);
    if (this.rawCache.size > 20000) this.rawCache.clear();
    this.rawCache.set(key, r);
    return r;
  }

  computeRaw(x, z) {
    const type = this.type, dist = Math.hypot(x - CENTER, z - CENTER);
    if (type === 'flat') return { h: OLD_SEA + 1 + SHIFT, biome: 'flat', plateau: 0 };
    if (this.climate) {
      // Grote wereld en themawerelden: het klimaat bepaalt hoogte en landschap; de bouwplek wordt vlak
      const c = this.climate.column(x, z), start = this.climate.theme ? THEMES[this.climate.theme].main : 'plains';
      let h = c.h;
      if (dist < 14) {
        const f = smooth01((dist - 8) / 6);
        h = h * f + (SEA + 3) * (1 - f);
      }
      const cold = this.climate.theme ? !!THEMES[this.climate.theme].cold : c.k.T < -0.42;
      // In de toendra ligt naast de bouwplek een bevroren meertje (zoals in de oude toendra)
      if (this.climate.theme === 'tundra' && Math.hypot(x - CENTER - 20, z - CENTER - 5) < 6) return { h: SEA - 2, biome: 'tundra', plateau: 0, cold };
      return { h: Math.round(h), biome: dist < 14 ? start : c.biome, plateau: c.biome === 'mesa' ? 1 : 0, cold };
    }
    if (type === 'island') {
      const hills = this.n1(x / 18, z / 18) * 4 + this.n2(x / 7, z / 7) * 1.5
        + Math.max(0, this.n3(x / 60, z / 60)) * 9 * smooth01((dist - 30) / 60); // verderop hogere heuvels
      let island;
      if (this.classic) island = this.land(x, z, dist);
      else {
        // Eén groot eiland van ongeveer 400 blokken, met een grillige kust
        const radius = 230 * (1 + 0.2 * fbm(this.coast, x / 90, z / 90, 2));
        island = clamp01((0.92 - dist / radius) / 0.3);
      }
      let h = 5 + island * (8 + hills);
      if (!this.classic && dist < 14) {
        const f = smooth01((dist - 8) / 6);
        h = h * f + (OLD_SEA + 3) * (1 - f);
      }
      return { h: Math.max(2, Math.min(36, Math.round(h))) + SHIFT, biome: 'island', plateau: 0 };
    }

    // Jungle, woestijn, toendra, savanne en avontuur
    const weights = biomeWeights(type, x, z);
    const biome = this.biomeOf(x, z);
    let height = 0, plateau = 0;
    for (const part of weights) {
      const b = BIOMES[part.type], h = b.hoogte;
      const hills = this.n1(x / h.schaal, z / (h.schaalZ || h.schaal)) * h.heuvels + this.n2(x / 8, z / 8) * 0.7;
      let local = h.basis + hills;
      const p = this.n2(x / 20, z / 20);
      if (part.type === 'desert' && p > 0.5) local = 18 + clamp01((p - 0.5) * 2) * 4;
      if (part.type === 'savanna' && p > 0.55) local += 5;
      if (part.type === biome && p > (biome === 'desert' ? 0.5 : 0.55)) plateau = 1;
      height += part.weight * local;
    }
    const land = this.land(x, z, dist);
    height = 5 + land * (height - 5);
    if (biome === 'jungle' && dist > 14 && land > 0.75 && Math.abs(this.river(x / 40, z / 40)) < 0.06) height = OLD_SEA - 2;
    if (!this.classic) {
      // Een bevroren meer, naast de bouwplek of in het noordoostelijke avonturengebied
      const lakeX = CENTER + (type === 'adventure' ? 25 : 20), lakeZ = CENTER + (type === 'adventure' ? -9 : 5);
      if (biome === 'tundra' && Math.hypot(x - lakeX, z - lakeZ) < 6) height = OLD_SEA - 2;
      if (dist < 14) {
        const f = smooth01((dist - 8) / 6);
        const base = type === 'adventure' ? OLD_SEA + 3 : BIOMES[type].hoogte.basis;
        height = height * f + base * (1 - f);
        if (dist <= 8) plateau = 0;
      }
    }
    return { h: Math.max(2, Math.min(28, Math.round(height))) + SHIFT, biome, plateau };
  }

  // ---------- bouwwerken ----------

  // Is de grond hier vlak genoeg voor een dorp? (hoogstens 5 blokken verschil)
  villageSpot(x, z) {
    const raw = this.raw(x, z);
    if (!villageStyle(raw.biome) || raw.h <= SEA + 1) return false;
    let lo = Infinity, hi = -Infinity;
    for (let dx = -VILLAGE_RADIUS; dx <= VILLAGE_RADIUS; dx += VILLAGE_RADIUS / 2) for (let dz = -VILLAGE_RADIUS; dz <= VILLAGE_RADIUS; dz += VILLAGE_RADIUS / 2) {
      const r = this.raw(Math.round(x + dx), Math.round(z + dz));
      if (r.h <= SEA) return false;
      lo = Math.min(lo, r.h); hi = Math.max(hi, r.h);
    }
    return hi - lo <= 5;
  }

  findVillage() {
    for (let r = 90; r <= 300; r += 15) {
      for (let a = 0; a < 24; a++) {
        const t = (a + hash(this.seed, r, 0, S.village)) / 24 * Math.PI * 2;
        const x = Math.round(CENTER + Math.cos(t) * r), z = Math.round(CENTER + Math.sin(t) * r);
        if (this.villageSpot(x, z)) return this.makeStructure('village', x, z);
      }
    }
    return null;
  }

  makeStructure(kind, x, z, home = false) {
    const raw = this.raw(x, z), oldH = raw.h - SHIFT;
    const s = { kind, x, z, home };
    if (kind === 'village') {
      const style = villageStyle(raw.biome) || VILLAGE_STYLES.plains;
      // de hoogte in het midden (gemiddeld over het dorp, zodat het zo min mogelijk afgraaft)
      let sum = 0, n = 0;
      for (let dx = -12; dx <= 12; dx += 6) for (let dz = -12; dz <= 12; dz += 6) { sum += this.raw(x + dx, z + dz).h; n++; }
      s.base = Math.max(SEA + 1, Math.round(sum / n));
      s.padBlock = style.ground;
      s.bounds = [-VILLAGE_RADIUS, VILLAGE_RADIUS, -VILLAGE_RADIUS, VILLAGE_RADIUS];
      const v = villageCells(Math.floor(hash(this.seed, x, z, S.village) * 4294967296), style);
      s.cells = v.cells;
      s.beds = v.beds.map((b) => ({ x: b.x + x, z: b.z + z, outX: b.outX + x, outZ: b.outZ + z })); // in wereldcoördinaten
      s.y = s.base + 1;
      s.pad = [x + s.bounds[0] - 1, x + s.bounds[1] + 1, z + s.bounds[2] - 1, z + s.bounds[3] + 1];
      return s;
    }
    if (POND.has(kind)) {
      s.radius = (kind === 'oasis' ? 3 : 5) + Math.floor(hash(this.seed, x, z, S.pond) * 3);
      s.base = Math.max(12, Math.min(15, oldH)) + SHIFT;
      s.padBlock = kind === 'oasis' ? B.SAND : B.RED_DIRT;
      s.bank = kind === 'oasis' ? B.GRASS : B.MUD;
      s.bounds = [-s.radius - 2, s.radius + 2, -s.radius - 2, s.radius + 2];
      s.y = s.base;
      s.palms = [];
      if (kind === 'oasis') {
        const n = 3 + Math.floor(hash(this.seed, x, z, S.palms) * 3);
        for (let i = 0; i < n; i++) {
          const a = i / n * Math.PI * 2;
          s.palms.push([x + Math.round(Math.cos(a) * (s.radius + 1)), s.base + 1, z + Math.round(Math.sin(a) * (s.radius + 1))]);
        }
      }
    } else if (kind === 'shipwreck' && raw.h < SEA) {
      // onder water: het water blijft staan, ook in de romp
      s.base = raw.h; s.wet = true;
      s.padBlock = B.SAND;
      s.bounds = structureBounds(kind);
      s.cells = structureCells(kind).map(([cx, cy, cz, id]) => [cx, cy, cz, id === AIR && raw.h + 1 + cy <= SEA ? B.WATER : id]);
      s.y = s.base + 1;
    } else {
      s.base = Math.max(11, oldH) + SHIFT;
      s.padBlock = STRUCTURE_BLOCK[kind];
      s.bounds = structureBounds(kind);
      s.cells = structureCells(kind);
      s.y = s.base + 1;
    }
    // Het stuk grond dat vlak gemaakt wordt (één blok ruimer dan het bouwwerk)
    s.pad = [x + s.bounds[0] - 1, x + s.bounds[1] + 1, z + s.bounds[2] - 1, z + s.bounds[3] + 1];
    return s;
  }

  region(rx, rz) {
    const key = rx * 65536 + rz;
    if (this.regionCache.has(key)) return this.regionCache.get(key);
    let s = null;
    if (this.type !== 'flat' && !(this.type === 'island' && !this.classic) && hash(this.seed, rx, rz, S.region) < 0.55) {
      const x = rx * REGION + 24 + Math.floor(hash(this.seed, rx, rz, S.rx) * 80);
      const z = rz * REGION + 24 + Math.floor(hash(this.seed, rx, rz, S.rz) * 80);
      const raw = this.raw(x, z);
      // in ondiepe zee kan een schipwrak liggen (onder water)
      const kinds = raw.biome === 'ocean' && raw.h >= SEA - 4 && this.climate ? ['shipwreck'] : BIOMES[raw.biome]?.bouwwerken || [];
      const kind = kinds[Math.floor(hash(this.seed, rx, rz, S.kind) * kinds.length)];
      // een schipwrak ligt aan de waterkant, de rest op het droge
      if (Math.hypot(x - CENTER, z - CENTER) > 170 && kinds.length && (raw.h > SEA + 1 || kind === 'shipwreck')) {
        // een dorp alleen op vlakke grond, en niet over een ander bouwwerk heen
        const ok = kind !== 'village' || (this.villageSpot(x, z) && !this.home.some((h) => Math.abs(h.x - x) < 60 && Math.abs(h.z - z) < 60));
        if (ok) s = this.makeStructure(kind, x, z);
      }
    }
    this.regionCache.set(key, s);
    return s;
  }

  // Mijnschacht diep onder de grond: twee gangen in een kruis met houten stutten en lantaarns
  mine(rx, rz) {
    const key = rx * 65536 + rz;
    if (this.mineCache.has(key)) return this.mineCache.get(key);
    let m = null;
    if (MINE_WORLDS.has(this.type) &&
      hash(this.seed, rx, rz, S.mine) < 0.35) {
      const x = rx * MINE_REGION + 28 + Math.floor(hash(this.seed, rx, rz, S.mine + 1) * 56);
      const z = rz * MINE_REGION + 28 + Math.floor(hash(this.seed, rx, rz, S.mine + 2) * 56);
      if (Math.hypot(x - CENTER, z - CENTER) > 40 && this.raw(x, z).h > SEA) m = { x, z, y: SEA - 20, cells: null };
    }
    this.mineCache.set(key, m);
    return m;
  }

  mineCells(m) {
    if (m.cells) return m.cells;
    const cells = [], put = (x, y, z, id) => cells.push([x, y, z, id]);
    for (const [ax, az] of [[1, 0], [0, 1]]) {
      for (let t = -MINE_ARM; t <= MINE_ARM; t++) {
        const cx = m.x + ax * t, cz = m.z + az * t;
        if (this.raw(cx, cz).h < m.y + 8) continue; // nooit vlak onder de zeebodem
        for (let s = -1; s <= 1; s++) {
          const x = cx + az * s, z = cz + ax * s;
          for (let y = 0; y < 3; y++) put(x, m.y + y, z, AIR);
          put(x, m.y - 1, z, (t + s) % 3 ? B.STONE : B.PLANKS);
        }
        if (t % 4 === 0 && Math.abs(t) > 1) {
          for (const s of [-1, 1]) { put(cx + az * s, m.y, cz + ax * s, B.FENCE); put(cx + az * s, m.y + 1, cz + ax * s, B.FENCE); }
          for (let s = -1; s <= 1; s++) put(cx + az * s, m.y + 2, cz + ax * s, B.PLANKS);
          if (t % 8 === 0) put(cx, m.y + 1, cz, B.LANTERN_HANGING);
        }
      }
    }
    put(m.x + MINE_ARM, m.y, m.z, B.TREASURE);
    m.cells = cells;
    return cells;
  }

  minesNear(x0, z0, x1, z1) {
    const out = [];
    for (let rx = Math.floor((x0 - MINE_ARM) / MINE_REGION); rx <= Math.floor((x1 + MINE_ARM) / MINE_REGION); rx++) {
      for (let rz = Math.floor((z0 - MINE_ARM) / MINE_REGION); rz <= Math.floor((z1 + MINE_ARM) / MINE_REGION); rz++) {
        const m = this.mine(rx, rz);
        if (m && m.x + MINE_ARM + 1 >= x0 && m.x - MINE_ARM - 1 <= x1 && m.z + MINE_ARM + 1 >= z0 && m.z - MINE_ARM - 1 <= z1) out.push(m);
      }
    }
    return out;
  }

  // Bouwwerken waarvan het vlakke stuk grond deze kolom raakt
  structuresAt(x, z) {
    const out = [];
    const test = (s) => {
      if (!s || x < s.pad[0] || x > s.pad[1] || z < s.pad[2] || z > s.pad[3]) return;
      if (s.home && Math.hypot(x - CENTER, z - CENTER) <= 8) return; // de bouwplek blijft vrij
      out.push(s);
    };
    for (const s of this.home) test(s);
    test(this.region(Math.floor(x / REGION), Math.floor(z / REGION)));
    return out;
  }

  structuresNear(x0, z0, x1, z1) {
    const out = this.home.filter((s) => s.pad[1] >= x0 && s.pad[0] <= x1 && s.pad[3] >= z0 && s.pad[2] <= z1);
    for (let rx = Math.floor(x0 / REGION); rx <= Math.floor(x1 / REGION); rx++) {
      for (let rz = Math.floor(z0 / REGION); rz <= Math.floor(z1 / REGION); rz++) {
        const s = this.region(rx, rz);
        if (s && s.pad[1] >= x0 && s.pad[0] <= x1 && s.pad[3] >= z0 && s.pad[2] <= z1) out.push(s);
      }
    }
    return out;
  }

  // ---------- kolom met bouwwerken erbij ----------

  column(x, z) {
    const key = x * 65536 + z;
    let c = this.colCache.get(key);
    if (c) return c;
    const raw = this.raw(x, z), b = BIOMES[raw.biome];
    c = { h: raw.h, biome: raw.biome, plateau: raw.plateau, reserved: false, pad: null, pond: null };
    if (this.type === 'island' || this.type === 'flat') {
      c.top = B.GRASS; c.fill = B.DIRT;
      if (this.type === 'island' && raw.h <= SEA + 1) { c.top = B.SAND; c.fill = B.SAND; }
      if (this.type === 'island' && raw.h >= SEA + 8) c.top = B.SNOW;
    } else if (this.climate) {
      this.worldGround(c, x, z);
    } else {
      c.top = raw.h <= SEA ? B.SAND : b.grond.top;
      c.fill = b.grond.onder;
      if (raw.biome === 'desert' && raw.plateau && raw.h > SEA + 4) c.top = B.RED_SAND;
      if (raw.biome === 'savanna' && raw.plateau && raw.h > SEA + 4) c.top = B.STONE;
    }
    for (const s of this.structuresAt(x, z)) {
      c.pad = s; c.reserved = true;
      if (POND.has(s.kind)) {
        const d = Math.hypot(x - s.x, z - s.z);
        c.pond = d < s.radius ? 'water' : d <= s.radius + 2 ? 'bank' : null;
      }
    }
    if (this.colCache.size > 20000) this.colCache.clear();
    this.colCache.set(key, c);
    return c;
  }

  // Bovenste blokken in de Grote wereld
  worldGround(c, x, z) {
    const b = BIOMES[c.biome], h = c.h;
    c.cold = this.raw(x, z).cold;
    c.top = b.grond.top; c.fill = b.grond.onder;
    if (h <= SEA) {
      // Onder water: zand, in diepe zee grind, in rivieren soms klei
      c.top = c.biome === 'river' && hash(this.seed, x, z, S.flower) < 0.3 ? B.CLAY : h < SEA - 10 ? B.GRAVEL : B.SAND;
      c.fill = B.SAND;
    } else if (c.biome === 'volcano') {
      // Vulkanen: basalt, en hoe hoger hoe meer gloeiende magmasteen (bij de kraters)
      const hot = h > SEA + 34 ? 0.3 : h > SEA + 20 ? 0.08 : 0.015;
      c.top = hash(this.seed, x, z, S.flower) < hot ? B.MAGMA : B.BASALT; c.fill = B.BASALT;
    } else if (c.biome === 'mountains') {
      c.top = h > SEA + 44 ? B.SNOW : h > SEA + 24 ? B.STONE : B.GRASS;
      c.fill = c.top === B.GRASS ? B.DIRT : B.STONE;
    } else if (h > SEA + 50) { c.top = B.SNOW; c.fill = B.STONE; }
  }

  fillColumn(buf, lx, lz, c) {
    const h = c.h, desert = c.biome === 'desert', island = this.type === 'island' || this.type === 'flat';
    const under = c.biome === 'tundra' ? 2 : 3;
    buf[index(lx, 0, lz)] = B.BEDROCK;
    for (let y = 1; y <= h; y++) {
      let id;
      if (island) id = y === h ? c.top : y >= h - 3 ? c.fill : B.STONE;
      else if (desert) {
        id = y === h ? c.top : y >= h - 2 ? (c.top === B.RED_SAND ? B.RED_SAND : B.SAND)
          : c.plateau ? (Math.floor(y / 3) % 2 ? B.TERRACOTTA_ORANGE : B.TERRACOTTA_BROWN) : B.SANDSTONE;
      } else if (c.biome === 'mesa' && h > SEA) {
        // Mesa: lagen oranje en bruin terracotta onder het rode zand
        id = y === h ? c.top : y >= h - 1 ? B.RED_SAND : (Math.floor(y / 3) % 3 ? B.TERRACOTTA_ORANGE : B.TERRACOTTA_BROWN);
      } else id = y === h ? c.top : y >= h - under ? c.fill : B.STONE;
      buf[index(lx, y, lz)] = id;
    }
    const frozen = c.biome === 'tundra' || c.cold;
    for (let y = h + 1; y <= SEA; y++) buf[index(lx, y, lz)] = frozen && y === SEA ? B.ICE : B.WATER;
    const s = c.pad;
    if (!s) return;
    // Vlak stuk grond voor een bouwwerk, zonder water erboven
    for (let y = Math.min(h, s.base); y <= Math.max(h, s.base, SEA); y++) buf[index(lx, y, lz)] = y <= s.base ? s.padBlock : s.wet && y <= SEA ? B.WATER : AIR;
    if (c.pond === 'water') {
      buf[index(lx, s.base - 3, lz)] = s.kind === 'oasis' ? B.SAND : B.MUD;
      buf[index(lx, s.base - 2, lz)] = B.WATER;
      buf[index(lx, s.base - 1, lz)] = B.WATER;
      buf[index(lx, s.base, lz)] = AIR;
    } else if (c.pond === 'bank') buf[index(lx, s.base, lz)] = s.bank;
  }

  // ---------- bomen ----------

  treeRecipe(biome) {
    if (this.type === 'flat') return null;
    return this.type === 'island' ? ISLAND_TREES : BIOMES[biome].bomen;
  }

  // Mag hier een boom staan, en welke? (zonder te kijken naar andere bomen)
  treeCandidate(x, z) {
    const key = x * 65536 + z;
    if (this.treeCache.has(key)) return this.treeCache.get(key);
    let cand = null;
    const recipe = this.treeRecipe(this.column(x, z).biome);
    if (recipe?.length && Math.hypot(x - CENTER, z - CENTER) > (this.classic ? 9 : 13)) {
      const density = this.type === 'adventure' ? 0.5 : 1;
      let chance = hash(this.seed, x, z, S.tree);
      for (const t of recipe) {
        chance -= t.dichtheid * density;
        if (chance < 0) { cand = { kind: t.soort, prio: hash(this.seed, x, z, S.prio) }; break; }
      }
      if (cand && !this.treeFits(cand.kind, x, z)) cand = null;
    }
    if (this.treeCache.size > 20000) this.treeCache.clear();
    this.treeCache.set(key, cand);
    return cand;
  }

  treeFits(kind, x, z) {
    const c = this.column(x, z), b = BIOMES[c.biome];
    const ground = this.type === 'island' ? [B.GRASS] : [b.grond.top, B.RED_SAND];
    if (c.reserved || c.h <= SEA || !ground.includes(c.top)) return false;
    const r = TREE_RADIUS[kind] || 2;
    for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) if (this.column(x + dx, z + dz).reserved) return false;
    return true;
  }

  // Een boom groeit alleen als er in de buurt geen boom met voorrang staat
  treeAt(x, z) {
    const cand = this.treeCandidate(x, z);
    if (!cand) return null;
    const space = cand.kind === 'giantJungle' ? 9 : this.type === 'island' ? 5 : 6;
    for (let dx = -space; dx <= space; dx++) {
      const rest = space - Math.abs(dx);
      for (let dz = -rest; dz <= rest; dz++) {
        if (!dx && !dz) continue;
        const other = this.treeCandidate(x + dx, z + dz);
        if (other && other.prio > cand.prio) return null;
      }
    }
    return cand;
  }

  // ---------- één chunk maken ----------

  chunk(cx, cz) {
    const buf = new Uint16Array(CHUNK * CHUNK * SY);
    const x0 = cx * CHUNK, z0 = cz * CHUNK;
    const cols = [];
    for (let lz = 0; lz < CHUNK; lz++) for (let lx = 0; lx < CHUNK; lx++) {
      const c = this.column(x0 + lx, z0 + lz);
      cols.push(c);
      this.fillColumn(buf, lx, lz, c);
    }
    const inside = (x, y, z) => x >= x0 && x < x0 + CHUNK && z >= z0 && z < z0 + CHUNK && y >= 0 && y < SY;
    const put = (x, y, z, id) => { if (inside(x, y, z)) buf[index(x - x0, y, z - z0)] = id; };
    const writer = {
      put,
      leaf: (x, y, z, id) => { if (inside(x, y, z) && buf[index(x - x0, y, z - z0)] === AIR) buf[index(x - x0, y, z - z0)] = id; },
    };

    // Bouwwerken (alleen het stukje dat in deze chunk valt)
    const near = this.structuresNear(x0 - 16, z0 - 16, x0 + CHUNK + 16, z0 + CHUNK + 16);
    for (const s of near) {
      if (s.cells) for (const [lx, ly, lz, id] of s.cells) put(s.x + lx, s.base + 1 + ly, s.z + lz, id);
    }
    // Palmen rond een oase, daarna de andere bomen (steeds in dezelfde volgorde)
    for (const s of near) {
      for (const [px, py, pz] of s.palms || []) {
        if (px >= x0 - 4 && px < x0 + CHUNK + 4 && pz >= z0 - 4 && pz < z0 + CHUNK + 4) {
          biomeTree(writer, 'palm', px, py, pz, rng(hash(this.seed, px, pz, S.treeSeed) * 4294967296));
        }
      }
    }
    const planted = new Set();
    const reach = 5;
    for (let x = x0 - reach; x < x0 + CHUNK + reach; x++) {
      for (let z = z0 - reach; z < z0 + CHUNK + reach; z++) {
        const t = this.treeAt(x, z);
        if (!t) continue;
        const c = this.column(x, z);
        biomeTree(writer, t.kind, x, c.h + 1, z, rng(hash(this.seed, x, z, S.treeSeed) * 4294967296));
        if (x >= x0 && x < x0 + CHUNK && z >= z0 && z < z0 + CHUNK) planted.add((x - x0) + (z - z0) * CHUNK);
      }
    }
    this.plants(buf, x0, z0, cols, planted);
    // Onder de grond: grotten (niet bij de bouwplek) en daarna steensoorten en ertsen
    if (this.underground) {
      for (let lz = 0; lz < CHUNK; lz++) for (let lx = 0; lx < CHUNK; lx++) {
        const c = cols[lx + lz * CHUNK];
        c.noCaves = Math.hypot(x0 + lx - CENTER, z0 + lz - CENTER) < 24;
      }
      this.underground.carve(buf, cx, cz, cols, !!this.climate);
      this.underground.veins(buf, cx, cz, cols, cols.some((c) => c.biome === 'mountains'), this.type === 'dino');
      for (const m of this.minesNear(x0, z0, x0 + CHUNK - 1, z0 + CHUNK - 1)) for (const [x, y, z, id] of this.mineCells(m)) put(x, y, z, id);
    }
    if (this.rawCache.size > 6000) { this.rawCache.clear(); this.colCache.clear(); this.treeCache.clear(); }
    return buf;
  }

  plants(buf, x0, z0, cols, planted) {
    if (this.type === 'flat') return;
    for (let lz = 0; lz < CHUNK; lz++) for (let lx = 0; lx < CHUNK; lx++) {
      if (planted.has(lx + lz * CHUNK)) continue;
      const c = cols[lx + lz * CHUNK], x = x0 + lx, z = z0 + lz, h = c.h;
      if (c.biome === 'swamp' && !c.reserved && h < SEA && buf[index(lx, SEA + 1, lz)] === AIR && hash(this.seed, x, z, S.plant) < 0.12) {
        buf[index(lx, SEA + 1, lz)] = B.LILY_PAD; // waterlelies op het moeras
        continue;
      }
      if (c.reserved || h <= SEA || h + 1 >= SY || buf[index(lx, h + 1, lz)] !== AIR) continue;
      if (Math.hypot(x - CENTER, z - CENTER) <= (this.type === 'island' ? 0 : 9)) continue;
      if (this.type === 'island') {
        // Bloemen en graspollen op het eiland
        if (c.top !== B.GRASS) continue;
        const p = hash(this.seed, x, z, S.tree);
        if (p < 0.05) buf[index(lx, h + 1, lz)] = hash(this.seed, x, z, S.flower) < 0.5 ? B.FLOWER_RED : B.FLOWER_YELLOW;
        else if (p < 0.12) buf[index(lx, h + 1, lz)] = B.TALLGRASS;
        continue;
      }
      const b = BIOMES[c.biome];
      if (![b.grond.top, B.RED_SAND].includes(c.top)) continue;
      const density = this.type === 'adventure' ? 0.5 : 1;
      let chance = hash(this.seed, x, z, S.plant);
      for (const p of b.planten || []) {
        chance -= p.dichtheid * density;
        if (chance >= 0) continue;
        if (p.boven) { // een plant van twee blokken hoog (reuzenvaren)
          if (h + 2 < SY && buf[index(lx, h + 2, lz)] === AIR) { buf[index(lx, h + 1, lz)] = p.blok; buf[index(lx, h + 2, lz)] = p.boven; }
          break;
        }
        const height = p.hoog ? p.hoog[0] + Math.floor(hash(this.seed, x, z, S.plantH) * (p.hoog[1] - p.hoog[0] + 1)) : 1;
        for (let dy = 1; dy <= height && h + dy < SY; dy++) if (buf[index(lx, h + dy, lz)] === AIR) buf[index(lx, h + dy, lz)] = p.blok;
        if (p.blok === B.SNOW) { buf[index(lx, h + 1, lz)] = B.STONE; buf[index(lx, h + 2, lz)] = B.SNOW; }
        if (p.blok === B.BAMBOO) {
          for (const [dx, dz] of [[1, 0], [0, 1]]) {
            const nx = lx + dx, nz = lz + dz;
            if (nx >= CHUNK || nz >= CHUNK) continue;
            const n = cols[nx + nz * CHUNK];
            if (n.reserved || n.h !== h) continue;
            for (let dy = 1; dy < height; dy++) if (buf[index(nx, h + dy, nz)] === AIR) buf[index(nx, h + dy, nz)] = B.BAMBOO;
          }
        }
        break;
      }
    }
  }
}
