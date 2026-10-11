// Dieren beheren, bij hun landschap neerzetten, aaien en bewaren.
import * as THREE from '../lib/three.module.min.js';
import { B, WATERY } from './blocks.js';
import { HOME, CHUNK } from './world.js';
import { hash } from './engine/noise.js';
import { BIOMES, biomeAt } from './biomes.js';
import { Animal } from './animals/core.js';
import { SPECIES, MAX_ANIMALS } from './animals/species.js';
import { VILLAGE_RADIUS } from './engine/village.js';
import { updateHunt } from './animals/hunt.js';
export { SPECIES, MAX_ANIMALS } from './animals/species.js';

const GROUND = [B.GRASS, B.MOSS, B.BASALT, B.DRY_GRASS, B.SAND, B.RED_SAND, B.RED_DIRT, B.MUD, B.SNOW, B.ICE, B.PACKED_ICE];
export class Animals {
  constructor(scene, effects = null) {
    this.scene = scene; this.effects = effects; this.list = []; this.frame = 0;
    this.predators = true; this.caught = []; this.onCatch = null;
    this.tmp = new THREE.Vector3(); this.frustum = new THREE.Frustum(); this.matrix = new THREE.Matrix4();
  }
  get full() { return this.list.length >= MAX_ANIMALS; }
  clear() {
    for (const a of this.list) if (a.hunt?.phase === 'stalk') this.effects?.warnAt?.(a.hunt.target, false);
    for (const a of this.list) { this.scene.remove(a.group); a.mat.dispose(); }
    this.list = []; // Gedeelde geometrie blijft in de cache voor de volgende wereld.
  }
  remove(a) {
    const index = this.list.indexOf(a);
    if (index < 0) return;
    if (a.hunt) this.stopHunt(a);
    this.scene.remove(a.group); a.mat.dispose(); this.list.splice(index, 1);
  }
  stopHunt(a, seconds = 0) {
    if (a.hunt) {
      if (a.hunt.phase === 'stalk') this.effects?.warnAt?.(a.hunt.target, false);
      a.hunt.target.fleeFrom = null;
    }
    a.hunt = null; a.huntPause = Math.max(a.huntPause, seconds);
    a.walking = false;
  }
  setPredators(on) {
    this.predators = !!on;
    if (!on) for (const a of this.list) if (a.hunt) this.stopHunt(a);
  }
  spawn(type, x, y, z, yaw = Math.random() * Math.PI * 2, variant = null) {
    if (!SPECIES[type] || this.full) return null;
    const a = new Animal(type, x, y, z, yaw, variant);
    this.scene.add(a.group); this.list.push(a); return a;
  }

  populate(world) {
    const recipes = world.type === 'adventure'
      ? [['island', [['pig', 4], ['sheep', 3], ['chicken', 4]]],
        ['jungle', [['tiger', 2], ...BIOMES.jungle.dieren.slice(1).map(([type]) => [type, 1])]],
        ['desert', [['meerkat', 1], ...BIOMES.desert.dieren.slice(1).map(([type]) => [type, 1])]],
        ['tundra', BIOMES.tundra.dieren.map(([type]) => [type, 1])],
        ['savanna', [['lion', 1], ['lioness', 1], ['cheetah', 1], ['elephant', 1], ['giraffe', 1], ['zebra', 3], ['hippo', 1], ['meerkat', 2]]]]
      : [[world.type, BIOMES[world.type]?.dieren || []]];
    for (const [biome, want] of recipes) for (const [type, n] of want) {
      let herd = null;
      for (let i = 0; i < n; i++) {
        let a = null;
        // De eerste leeuw ligt op het brede, overhangende vlak van zijn rots.
        const rock = world.landmarks.find((l) => l.kind === 'lionRock');
        if (type === 'lion' && i === 0 && rock) {
          a = this.spawn(type, rock.x + 0.5, rock.y + 7, rock.z + 0.5, 0);
          if (a) { a.sleep = 25; a.state = 'slapen'; a.show(0); }
        }
        if (!a && type === 'hippo') {
          const pool = world.landmarks.find((l) => l.kind === 'wateringHole');
          if (pool) a = this.spawn(type, pool.x + 0.5, pool.y - SPECIES[type].floatDepth, pool.z + 0.5, 0);
        }
        if (a) continue;
        // Eén proefmodel en een vaste kandidatenlijst, ook voor dichtbegroeide seeds.
        const probe = new Animal(type, 0, 0, 0, Math.random() * Math.PI * 2);
        const count = (HOME - 4) * (HOME - 4), offset = Math.floor(Math.random() * count);
        for (let tries = 0; tries < count; tries++) {
          const index = (offset + tries * 97) % count;
          const x = 2 + index % (HOME - 4), z = 2 + Math.floor(index / (HOME - 4));
          const dist = Math.hypot(x - HOME / 2, z - HOME / 2);
          if (world.type === 'adventure' && (biomeAt(world.type, x + .5, z + .5) !== biome || (biome === 'island' ? dist > 6 : dist < 14))) continue;
          if (world.type !== 'adventure' && SPECIES[type].dieet === 'boerderij' && (dist < 6 || dist > 26)) continue;
          if (SPECIES[type].dieet !== 'boerderij' && dist < 10) continue;
          if (type === 'tiger' && i === 0 && dist > 28) continue;
          if (type === 'zebra' && herd && Math.hypot(x - herd.x, z - herd.z) > 8) continue;
          const y = world.surfaceY(x, z);
          if (!GROUND.includes(world.get(x, y, z)) || world.get(x, y + 1, z) === B.WATER) continue;
          if (!probe.clearAt(world, x + 0.5, y + 1, z + 0.5)) continue;
          a = this.spawn(type, x + 0.5, y + 1, z + 0.5, probe.yaw);
          if (type === 'zebra' && !herd) herd = a;
          break;
        }
      }
    }
  }

  // Een nieuw stuk wereld krijgt soms een paar dieren van zijn landschap. Die zijn "wild":
  // als het vol raakt, maken de wilde dieren die het verst weg zijn plaats voor nieuwe.
  spawnInChunk(world, cx, cz, viewer = null) {
    const x0 = cx * CHUNK, z0 = cz * CHUNK;
    const village = this.spawnVillages(world, cx, cz, viewer);
    if (village) return village;
    const home = Math.hypot(x0 + 8 - HOME / 2, z0 + 8 - HOME / 2);
    const biome = world.biomeAt ? world.biomeAt(x0 + 8, z0 + 8) : biomeAt(world.type, x0 + 8, z0 + 8);
    // Zee en rivier: waar diep water is, zwemt vaak een groepje (ongeveer in een op de drie chunks),
    // in elke wereld (ook rond het eiland) en al vlak bij de bouwplek
    const sea = this.waterColumn(world, x0 + 8, z0 + 8);
    if (sea && sea.depth >= 2) return home < 20 ? 0 : this.spawnSea(world, cx, cz, biome, sea, viewer);
    // Bij de bouwplek wonen al dieren; verderop af en toe een groepje (ongeveer 1 op de 14 chunks)
    if (home < 80 || hash(world.seed, cx, cz, 701) > 0.07) return 0;
    const kinds = (BIOMES[biome]?.dieren || []).filter(([t]) => !SPECIES[t].onderwater);
    if (!kinds.length) return 0;
    const [type] = kinds[Math.floor(hash(world.seed, cx, cz, 702) * kinds.length)];
    const n = type === 'zebra' ? 3 : SPECIES[type].onderwater ? 2 + Math.floor(hash(world.seed, cx, cz, 703) * 3) : 1 + Math.floor(hash(world.seed, cx, cz, 703) * 2);
    if (SPECIES[type].onderwater) return this.spawnInWater(world, type, cx, cz, n, viewer);
    const probe = new Animal(type, 0, 0, 0, hash(world.seed, cx, cz, 704) * Math.PI * 2);
    let made = 0;
    for (let i = 0; i < n * 6 && made < n; i++) {
      const x = x0 + 1 + Math.floor(hash(world.seed, cx, cz, 710 + i) * (CHUNK - 2));
      const z = z0 + 1 + Math.floor(hash(world.seed, cx, cz, 760 + i) * (CHUNK - 2));
      const y = world.surfaceY(x, z);
      if (!GROUND.includes(world.get(x, y, z)) || world.get(x, y + 1, z) === B.WATER) continue;
      if (!probe.clearAt(world, x + 0.5, y + 1, z + 0.5)) continue;
      if (this.full && !this.recycle(viewer)) break;
      const a = this.spawn(type, x + 0.5, y + 1, z + 0.5, probe.yaw);
      if (a) { a.wild = true; made++; }
    }
    return made;
  }

  // Een dorp in deze chunk (het midden): dorpelingen bij hun huis, twee katten en een ijzergolem
  spawnVillages(world, cx, cz, viewer = null) {
    const x0 = cx * CHUNK, z0 = cz * CHUNK;
    const list = world.gen?.structuresNear?.(x0, z0, x0 + CHUNK - 1, z0 + CHUNK - 1) || [];
    let made = 0;
    for (const v of list) {
      if (v.kind !== 'village' || v.x < x0 || v.x >= x0 + CHUNK || v.z < z0 || v.z >= z0 + CHUNK) continue;
      const village = { x: v.x + .5, z: v.z + .5, r: VILLAGE_RADIUS - 2 }, y = v.base + 1;
      const add = (type, x, z, variant = null) => {
        if (this.full && !this.recycle(viewer)) return null;
        const a = this.spawn(type, x, y, z, Math.random() * Math.PI * 2, variant);
        if (a) { a.village = village; made++; }
        return a;
      };
      v.beds.forEach((b, i) => {
        const a = add('villager', b.outX + .5, b.outZ + .5, i % 3);
        if (a) a.home = { x: b.x, y, z: b.z, outX: b.outX, outZ: b.outZ };
      });
      add('cat', v.x + 3.5, v.z - 3.5); add('cat', v.x - 3.5, v.z + 4.5);
      add('golem', v.x + 4.5, v.z + 4.5);
    }
    return made;
  }

  // Vissen, dolfijnen en inktvissen: in water van minstens 2 diep, ergens tussen bodem en oppervlak
  // Een of twee groepjes zeedieren in een waterchunk. De kans hangt af van hoe diep en open het water is.
  spawnSea(world, cx, cz, biome, sea, viewer) {
    const ocean = biome === 'ocean' || sea.depth >= 5;
    if (hash(world.seed, cx, cz, 705) > (ocean ? 0.35 : 0.2)) return 0;
    const own = (BIOMES[biome]?.dieren || []).filter(([t]) => SPECIES[t].onderwater);
    const kinds = (own.length ? own : ocean ? BIOMES.ocean.dieren : BIOMES.river.dieren)
      .filter(([t]) => SPECIES[t].h + 1 <= sea.depth); // een walvis alleen in diep water
    if (!kinds.length) return 0;
    const total = kinds.reduce((sum, [, w]) => sum + w, 0);
    const pick = (r) => { for (const [t, w] of kinds) if ((r -= w / total) < 0) return t; return kinds[0][0]; };
    let made = 0;
    for (let g = 0; g < (ocean && hash(world.seed, cx, cz, 706) < 0.35 ? 2 : 1); g++) {
      const type = pick(hash(world.seed, cx, cz, 707 + g)), r = hash(world.seed, cx, cz, 709 + g);
      const n = type === 'whale' ? 1 : type === 'fish' ? 3 + Math.floor(r * 4) : 2 + Math.floor(r * 2);
      made += this.spawnInWater(world, type, cx, cz, n, viewer, g * 300);
    }
    return made;
  }

  spawnInWater(world, type, cx, cz, n, viewer, salt = 0) {
    const x0 = cx * CHUNK, z0 = cz * CHUNK, def = SPECIES[type];
    let made = 0;
    for (let i = 0; i < n * 6 && made < n; i++) {
      const x = x0 + 1 + Math.floor(hash(world.seed, cx, cz, 810 + salt + i) * (CHUNK - 2));
      const z = z0 + 1 + Math.floor(hash(world.seed, cx, cz, 860 + salt + i) * (CHUNK - 2));
      const top = this.waterColumn(world, x, z);
      if (!top || top.depth < Math.max(2, def.h + 1)) continue;
      if (this.full && !this.recycle(viewer)) break;
      const y = top.bottom + 0.2 + hash(world.seed, cx, cz, 900 + salt + i) * Math.max(0, top.depth - def.h - 0.5);
      const a = this.spawn(type, x + 0.5, y, z + 0.5, hash(world.seed, cx, cz, 950 + salt + i) * Math.PI * 2);
      if (a) { a.wild = true; made++; }
    }
    return made;
  }

  // Water in deze kolom: bodem en diepte (of null als er bovenaan geen water staat)
  waterColumn(world, x, z) {
    const floor = world.surfaceY(x, z);
    let y = floor + 1;
    if (!WATERY[world.get(x, y, z)]) return null;
    while (y < 126 && WATERY[world.get(x, y + 1, z)]) y++;
    return { bottom: floor + 1, surface: y + 1, depth: y - floor };
  }

  // Plaats maken voor een dier dat Jippe zelf neerzet: eerst het verste wilde dier (hoe ver ook),
  // anders het verste niet-tamme dier dat ver weg is (verder dan 32 blokken). Geeft true als het lukte.
  makeRoom(viewer) {
    if (!this.full) return true;
    if (this.recycle(viewer, 0)) return true;
    let far = null, best = 32;
    for (const a of this.list) {
      if (a.tame || a.riding || a.def.voertuig) continue;
      const d = Math.hypot(a.x - viewer.x, a.z - viewer.z);
      if (d > best) { best = d; far = a; }
    }
    if (far) this.remove(far);
    return !!far;
  }

  // Haal het verste wilde dier weg (verder dan `min` blokken); tamme en zelf neergezette dieren nooit
  recycle(viewer, min = 100) {
    if (!viewer) return false;
    let far = null, best = min;
    for (const a of this.list) {
      if (!a.wild || a.tame || a.riding) continue;
      const d = Math.hypot(a.x - viewer.x, a.z - viewer.z);
      if (d > best) { best = d; far = a; }
    }
    if (far) this.remove(far);
    return !!far;
  }

  update(dt, world, viewer = null, camera = null, clockDt = dt) {
    this.frame++;
    Animal.viewer = viewer;
    this.caught.length = 0;
    if (camera) {
      camera.updateMatrixWorld(); this.matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      this.frustum.setFromProjectionMatrix(this.matrix);
    }
    for (let i = 0; i < this.list.length; i++) {
      const a = this.list[i];
      // Staat het dier in een stuk wereld dat niet geladen is? Dan slaapt het even (onzichtbaar)
      if (!world.isLoaded(a.x, a.z)) { a.group.visible = false; continue; }
      const visible = !camera || this.frustum.intersectsBox(a.box);
      if (a.riding) {
        a.elapsed = 0; a.clockElapsed = 0; a.group.visible = true; a.show(dt);
        continue;
      }
      const dist = viewer ? Math.hypot(a.x - viewer.x, a.z - viewer.z) : 0, far = dist > 40;
      // Verder dan ±28 blokken: als één stuk tekenen (met een beetje speling, zodat het niet knippert)
      if (viewer) a.setFar(a.lodOn ? dist > 26 : dist > 30);
      a.elapsed += dt;
      a.clockElapsed += clockDt;
      // Wie in een dorp woont, blijft in de buurt van de waterput
      if (a.village && !a.tame && !a.inBed && Math.hypot(a.x - a.village.x, a.z - a.village.z) > a.village.r) {
        a.targetYaw = Math.atan2(-(a.village.x - a.x), -(a.village.z - a.z)); a.walking = true; a.timer = Math.max(a.timer, 1.5); a.goal = null;
      }
      if (!far || (this.frame + i) % 4 === 0) {
        if (a.tame && (a.def.rijdbaar || a.def.volger) && !a.sitting && viewer && a.clockElapsed > 0) {
          const dist = Math.hypot(a.x - viewer.x, a.z - viewer.z);
          a.following = dist > 6 && dist <= 20;
          if (a.following) {
            a.walking = true; a.sleep = 0; a.graze = false; a.timer = Math.max(a.timer, 0.3);
            a.targetYaw = Math.atan2(-(viewer.x - a.x), -(viewer.z - a.z));
          } else if (dist < 3) a.walking = false;
        }
        updateHunt(a, a.clockElapsed, world, this);
        a.update(a.elapsed, world, visible ? this.effects : null, this.list, visible, a.clockElapsed);
        a.elapsed = 0; a.clockElapsed = 0;
      } else if (visible && !a.group.visible) a.show(0);
      a.group.visible = visible;
    }
    for (const prey of this.caught) this.remove(prey);
    this.updateLove(clockDt);
  }

  // Fokken: gevoerde dieren zoeken een maatje van dezelfde soort; samen krijgen ze een jong.
  // Een jong groeit in 10 minuten op.
  updateLove(dt) {
    for (const a of this.list) {
      if (a.baby > 0) { a.baby = Math.max(0, a.baby - dt); if (!a.baby) a.show(0); }
      if (a.breedWait > 0) a.breedWait = Math.max(0, a.breedWait - dt);
      if (a.love <= 0) continue;
      a.love = Math.max(0, a.love - dt);
      if ((a.heartWait = (a.heartWait ?? 0) - dt) <= 0) { this.effects?.heartsAt?.(a.x, a.y + a.def.h + 0.2, a.z, 0.6); a.heartWait = 1; }
      const group = a.def.fokgroep || a.type;
      let mate = null, best = 10;
      for (const b of this.list) {
        if (b === a || b.love <= 0 || b.baby > 0 || (b.def.fokgroep || b.type) !== group) continue;
        const d = Math.hypot(b.x - a.x, b.z - a.z);
        if (d < best) { best = d; mate = b; }
      }
      if (!mate) continue;
      if (best > (a.def.d + mate.def.d) * 0.35 + 0.6) {
        a.sitting = false; a.sleep = 0; a.walking = true; a.timer = Math.max(a.timer, 0.5);
        a.targetYaw = Math.atan2(-(mate.x - a.x), -(mate.z - a.z));
        continue;
      }
      this.breed(a, mate);
    }
  }

  breed(a, b) {
    a.love = b.love = 0;
    a.breedWait = b.breedWait = 300;
    a.walking = b.walking = false;
    const type = Math.random() < 0.5 ? a.type : b.type;
    const x = (a.x + b.x) / 2, y = Math.max(a.y, b.y), z = (a.z + b.z) / 2;
    const variant = a.type === b.type && a.def.varianten ? (Math.random() < 0.5 ? a.variant : b.variant) : null;
    const baby = this.spawn(type, x, y, z, a.yaw, variant);
    if (!baby) return null;
    baby.baby = 600; baby.tame = a.tame && b.tame; baby.show(0);
    this.effects?.heartsAt?.(x, y + 1, z, 1.6);
    this.onBreed?.(baby);
    return baby;
  }

  pick(ray, maxDist) {
    let best = null;
    for (const a of this.list) {
      const p = ray.intersectBox(a.box, this.tmp);
      if (!p) continue;
      const dist = p.distanceTo(ray.origin);
      if (dist <= maxDist && (!best || dist < best.dist)) best = { animal: a, dist };
    }
    return best;
  }

  serialize() { return this.list.map((a) => this.serializeOne(a)); }

  // Eén dier als gewone gegevens (ook om mee te nemen door een portaal)
  serializeOne(a) {
    const r = (v) => Math.round(v * 100) / 100;
    return { t: a.type, x: r(a.x), y: r(a.y), z: r(a.z), yaw: r(a.yaw), ...(a.def.varianten ? { v: a.variant } : {}),
      tame: !!a.tame, ...(a.wild ? { wild: true } : {}), ...(a.baby ? { baby: Math.round(a.baby) } : {}), ...(a.sitting ? { sit: true } : {}),
      ...(a.village ? { village: a.village } : {}), ...(a.home ? { home: a.home } : {}), ...(a.inBed ? { bed: true } : {}), hunger: Number.isFinite(a.hunger) ? a.hunger : 180 + Math.random() * 180,
      sleep: Number.isFinite(a.sleep) ? a.sleep : 0,
      huntPause: Number.isFinite(a.huntPause) ? a.huntPause : 0 };
  }

  load(arr) {
    this.clear();
    if (!Array.isArray(arr)) return;
    for (const o of arr) if (this.loadOne(o) === false) break;
  }

  // Eén dier terugzetten; false als er geen plek meer is
  loadOne(o) {
    if (!SPECIES[o?.t] || ![o.x, o.y, o.z, o.yaw].every(Number.isFinite)) return null;
    const a = this.spawn(o.t, o.x, o.y, o.z, o.yaw, Number.isInteger(o.v) ? o.v : null);
    if (!a) return false;
    a.tame = !!o.tame;
    a.wild = !!o.wild;
    a.baby = Number.isFinite(o.baby) ? Math.max(0, o.baby) : 0;
    a.sitting = !!o.sit;
    if (o.village && Number.isFinite(o.village.x)) a.village = o.village;
    if (o.home && Number.isFinite(o.home.x)) a.home = o.home;
    a.inBed = !!o.bed;
    a.hunger = Number.isFinite(o.hunger) ? Math.max(0, o.hunger) : 180 + Math.random() * 180;
    a.sleep = Number.isFinite(o.sleep) ? Math.max(0, o.sleep) : 0;
    a.huntPause = Number.isFinite(o.huntPause) ? Math.max(0, o.huntPause) : 0;
    a.state = a.sleep ? 'slapen' : 'rust'; a.show(0);
    return a;
  }
}
