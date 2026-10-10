// Natuurkunde, rustig en voorspelbaar (zoals Minecraft):
// - zand, rood zand en grind vallen naar beneden als er niets onder zit;
// - water stroomt vanuit een bron 7 blokken ver opzij en altijd naar beneden; twee bronnen naast
//   elkaar maken een nieuwe bron;
// - plantjes, fakkels en ladders zonder steun vallen om;
// - gewassen groeien in 4 stappen (±5 minuten) en gras groeit langzaam over aarde.
// Alleen wat in de buurt verandert, wordt bekeken (een wachtrij), elke 0,25 seconde een stapje.
// Wat de natuurkunde doet, gaat niet in de terug-knop: alleen wat Jippe zelf deed.

import { AIR, B, BLOCKS, OPAQUE, WATERY, DIRS, MAX_ID, TALL_PLANTS } from '../blocks.js';
import { SY } from './constants.js';

export const TICK = 0.25;
const MAX_PER_TICK = 600;
const GROW_CHANCE = 1 / 100;   // per gewas per seconde: gemiddeld 100 s per groeistap, 3 stappen = 5 minuten

export const GRAVITY = new Uint8Array(MAX_ID);
for (const id of [B.SAND, B.RED_SAND, B.GRAVEL]) GRAVITY[id] = 1;

const isFlow = (id) => id >= B.WATER_FLOW && id < B.WATER_FLOW + 8;
const flowLevel = (id) => id - B.WATER_FLOW + 1;
const flowId = (level) => B.WATER_FLOW + level - 1; // 1..7, 8 = vallend water
const isSource = (id) => id === B.WATER || (WATERY[id] && !isFlow(id) && BLOCKS[id].render !== 'water');
// Waar water in mag stromen: lucht, stromend water en plantjes die wegspoelen
const canHoldWater = (id) => id === AIR || isFlow(id) || (BLOCKS[id]?.render === 'cross' && BLOCKS[id].replaceable && !WATERY[id]);
// Waar een vallend blok doorheen valt
const fallsThrough = (id) => id === AIR || (BLOCKS[id]?.replaceable ?? true);

export class Physics {
  constructor(world, hooks = {}) {
    this.world = world;
    this.hooks = hooks;          // { onBreak(x, y, z, id), onFall(entity), onLand(entity), onChange() }
    this.queue = new Map();      // "x,y,z" -> [x, y, z]
    this.falling = [];           // vallende blokken { x, y, z, id, vy }
    this.crops = new Map();      // "x,y,z" -> [x, y, z]
    this.timer = 0;
    this.slow = 0;
    this.enabled = true;
  }

  reset() { this.queue.clear(); this.crops.clear(); for (const f of this.falling) this.hooks.onLand?.(f, false); this.falling = []; }

  schedule(x, y, z) {
    if (y < 0 || y >= SY) return;
    this.queue.set(x + ',' + y + ',' + z, [x, y, z]);
  }

  // Een blok veranderde: dat vakje en de 6 buren nakijken
  notify(x, y, z, id) {
    this.schedule(x, y, z);
    this.schedule(x + 1, y, z); this.schedule(x - 1, y, z);
    this.schedule(x, y + 1, z); this.schedule(x, y - 1, z);
    this.schedule(x, y, z + 1); this.schedule(x, y, z - 1);
    if (BLOCKS[id]?.crop) this.crops.set(x + ',' + y + ',' + z, [x, y, z]);
  }

  // Een bewaarde chunk kan gewassen bevatten: die moeten blijven groeien
  scanChunk(c) {
    if (!c.edited) return;
    const b = c.blocks, x0 = c.cx * 16, z0 = c.cz * 16;
    for (let i = 0; i < b.length; i++) {
      if (!BLOCKS[b[i]]?.crop) continue;
      const lx = i % 16, lz = Math.floor(i / 16) % 16, y = Math.floor(i / 256);
      this.crops.set((x0 + lx) + ',' + y + ',' + (z0 + lz), [x0 + lx, y, z0 + lz]);
    }
  }

  update(dt, player) {
    if (!this.enabled) return;
    this.updateFalling(dt);
    this.timer += dt;
    while (this.timer >= TICK) { this.timer -= TICK; this.tick(); }
    this.slow += dt;
    if (this.slow >= 1) { this.slow -= 1; this.randomTicks(player); }
  }

  tick() {
    if (!this.queue.size) return;
    const work = [...this.queue.values()].slice(0, MAX_PER_TICK);
    for (const [x, y, z] of work) this.queue.delete(x + ',' + y + ',' + z);
    for (const [x, y, z] of work) this.check(x, y, z);
  }

  set(x, y, z, id) {
    if (this.world.set(x, y, z, id)) this.hooks.onChange?.();
  }

  check(x, y, z) {
    const w = this.world;
    if (!w.isLoaded(x, z)) return;
    const id = w.get(x, y, z), b = BLOCKS[id];
    // 1. vallen
    if (GRAVITY[id] && y > 0 && fallsThrough(w.get(x, y - 1, z))) {
      this.set(x, y, z, AIR);
      const f = { x, y, z, id, vy: 0 };
      this.falling.push(f);
      this.hooks.onFall?.(f);
      return;
    }
    // 2. steun
    if (id !== AIR && !this.supported(x, y, z, id, b)) {
      this.set(x, y, z, b.waterlogged ? B.WATER : AIR);
      this.hooks.onBreak?.(x, y, z, id);
      return;
    }
    // 3. water
    if (canHoldWater(id)) this.flow(x, y, z, id);
  }

  // Heeft dit blok iets nodig om op te staan of tegenaan te hangen?
  supported(x, y, z, id, b) {
    const w = this.world, below = w.get(x, y - 1, z);
    if (b.crop) return below === B.FARMLAND;
    if (id === B.SUGAR_CANE) return [B.SAND, B.RED_SAND, B.GRASS, B.DIRT, B.SUGAR_CANE].includes(below);
    if (TALL_PLANTS.has(b.family)) return b.upper ? below === b.family : !!OPAQUE[below];
    if (b.waterlogged) return !!OPAQUE[below] || below === B.SEAWEED;
    if (b.render === 'cross' && !b.climb) return !!OPAQUE[below];
    if (id === B.TORCH || id === B.LANTERN || (id >= B.CARPET && id < B.CARPET + 16)) return !!BLOCKS[below]?.solid;
    if (id === B.LANTERN_HANGING) return !!BLOCKS[w.get(x, y + 1, z)]?.solid;
    if ((b.family === B.TORCH && id !== B.TORCH) || b.family === B.LADDER) {
      const [dx, dz] = DIRS[b.dir];
      return !!OPAQUE[w.get(x + dx, y, z + dz)];
    }
    return true;
  }

  // Water: welk water hoort in dit vakje?
  flow(x, y, z, id) {
    const w = this.world;
    let want = AIR;
    const below = w.get(x, y - 1, z);
    if (WATERY[w.get(x, y + 1, z)]) want = flowId(8);             // water erboven: vallend water
    else {
      let best = 99, sources = 0;
      for (const [dx, dz] of DIRS) {
        const n = w.get(x + dx, y, z + dz);
        if (isSource(n)) { sources++; best = 0; continue; }
        if (!isFlow(n)) continue;
        // Stromend water spreidt alleen opzij als het op de grond staat (niet terwijl het nog valt)
        const bn = w.get(x + dx, y - 1, z + dz);
        if (!BLOCKS[bn]?.solid && !isSource(bn)) continue;
        const l = flowLevel(n);
        best = Math.min(best, l === 8 ? 0 : l);
      }
      if (sources >= 2 && (OPAQUE[below] || isSource(below))) want = B.WATER; // nieuwe bron
      else if (best + 1 <= 7) want = flowId(best + 1);
    }
    if (want === id || (want === AIR && !isFlow(id))) return;
    this.set(x, y, z, want);
  }

  // Vallende blokken: vallen met zwaartekracht en worden weer een blok als ze landen
  updateFalling(dt) {
    if (!this.falling.length) return;
    const w = this.world;
    this.falling = this.falling.filter((f) => {
      f.vy = Math.max(-30, f.vy - 22 * dt);
      const ny = f.y + f.vy * dt;
      if (ny <= 0) { this.hooks.onLand?.(f, false); return false; }
      // Elk vakje onderweg nakijken, zodat het blok nooit door een dunne laag heen valt
      let cell = -1;
      for (let c = Math.floor(f.y) - 1; c >= Math.floor(ny); c--) if (!fallsThrough(w.get(f.x, c, f.z))) { cell = c; break; }
      if (cell >= 0) {
        const ly = cell + 1;
        const there = w.get(f.x, ly, f.z);
        const ok = fallsThrough(there);
        if (ok) this.set(f.x, ly, f.z, f.id);
        f.y = ly;
        this.hooks.onLand?.(f, ok);
        return false;
      }
      f.y = ny;
      return true;
    });
  }

  // Elke seconde: gewassen groeien een beetje, en gras groeit over aarde in de buurt
  randomTicks(player) {
    const w = this.world;
    for (const [key, [x, y, z]] of this.crops) {
      if (!w.isLoaded(x, z)) continue;
      const b = BLOCKS[w.get(x, y, z)];
      if (!b?.crop) { this.crops.delete(key); continue; }
      if (b.stage < 3 && Math.random() < GROW_CHANCE) this.set(x, y, z, b.id + 1);
    }
    if (!player) return;
    for (let i = 0; i < 40; i++) {
      const x = Math.floor(player.x + (Math.random() - 0.5) * 24), z = Math.floor(player.z + (Math.random() - 0.5) * 24);
      const y = Math.floor(player.y + (Math.random() - 0.5) * 8);
      if (w.get(x, y, z) !== B.DIRT || OPAQUE[w.get(x, y + 1, z)] || WATERY[w.get(x, y + 1, z)]) continue;
      let near = false;
      for (const [dx, dz] of DIRS) for (let dy = -1; dy <= 1; dy++) if (w.get(x + dx, y + dy, z + dz) === B.GRASS) near = true;
      if (near && Math.random() < 0.3) this.set(x, y, z, B.GRASS);
    }
  }
}
