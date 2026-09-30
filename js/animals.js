// Dieren beheren, bij hun landschap neerzetten, aaien en bewaren.
import * as THREE from '../lib/three.module.min.js';
import { B } from './blocks.js';
import { SX, SZ } from './world.js';
import { BIOMES, biomeAt } from './biomes.js';
import { Animal } from './animals/core.js';
import { SPECIES, MAX_ANIMALS } from './animals/species.js';
import { updateHunt } from './animals/hunt.js';
export { SPECIES, MAX_ANIMALS } from './animals/species.js';

const GROUND = [B.GRASS, B.DRY_GRASS, B.SAND, B.RED_SAND, B.RED_DIRT, B.MUD];
export class Animals {
  constructor(scene, effects = null) {
    this.scene = scene; this.effects = effects; this.list = []; this.frame = 0;
    this.predators = true; this.caught = []; this.onCatch = null;
    this.tmp = new THREE.Vector3(); this.frustum = new THREE.Frustum(); this.matrix = new THREE.Matrix4();
  }
  get full() { return this.list.length >= MAX_ANIMALS; }
  clear() {
    for (const a of this.list) if (a.hunt?.phase === 'stalk') this.effects?.warnAt?.(a.hunt.target, false);
    for (const a of this.list) this.scene.remove(a.group);
    this.list = []; // Gedeelde geometrie blijft in de cache voor de volgende wereld.
  }
  remove(a) {
    const index = this.list.indexOf(a);
    if (index < 0) return;
    if (a.hunt) this.stopHunt(a);
    this.scene.remove(a.group); this.list.splice(index, 1);
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
  spawn(type, x, y, z, yaw = Math.random() * Math.PI * 2) {
    if (!SPECIES[type] || this.full) return null;
    const a = new Animal(type, x, y, z, yaw);
    this.scene.add(a.group); this.list.push(a); return a;
  }

  populate(world) {
    const recipes = world.type === 'adventure'
      ? [['island', [['pig', 4], ['sheep', 3], ['chicken', 4]]], ['jungle', [['tiger', 2]]],
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
        const count = (SX - 4) * (SZ - 4), offset = Math.floor(Math.random() * count);
        for (let tries = 0; tries < count; tries++) {
          const index = (offset + tries * 97) % count;
          const x = 2 + index % (SX - 4), z = 2 + Math.floor(index / (SX - 4));
          const dist = Math.hypot(x - SX / 2, z - SZ / 2);
          if (world.type === 'adventure' && (biomeAt(world.type, x, z) !== biome || (biome === 'island' ? dist > 6 : dist < 14))) continue;
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

  update(dt, world, viewer = null, camera = null, clockDt = dt) {
    this.frame++;
    this.caught.length = 0;
    if (camera) {
      camera.updateMatrixWorld(); this.matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      this.frustum.setFromProjectionMatrix(this.matrix);
    }
    for (let i = 0; i < this.list.length; i++) {
      const a = this.list[i], visible = !camera || this.frustum.intersectsBox(a.box);
      if (a.riding) {
        a.elapsed = 0; a.clockElapsed = 0; a.group.visible = true; a.show(dt);
        continue;
      }
      const far = viewer && Math.hypot(a.x - viewer.x, a.z - viewer.z) > 40;
      a.elapsed += dt;
      a.clockElapsed += clockDt;
      if (!far || (this.frame + i) % 4 === 0) {
        if (a.tame && a.def.rijdbaar && viewer && a.clockElapsed > 0) {
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

  serialize() {
    const r = (v) => Math.round(v * 100) / 100;
    return this.list.map((a) => ({ t: a.type, x: r(a.x), y: r(a.y), z: r(a.z), yaw: r(a.yaw),
      tame: !!a.tame, hunger: Number.isFinite(a.hunger) ? a.hunger : 180 + Math.random() * 180,
      sleep: Number.isFinite(a.sleep) ? a.sleep : 0,
      huntPause: Number.isFinite(a.huntPause) ? a.huntPause : 0 }));
  }
  load(arr) {
    this.clear();
    if (!Array.isArray(arr)) return;
    for (const o of arr) {
      if (!SPECIES[o?.t] || ![o.x, o.y, o.z, o.yaw].every(Number.isFinite)) continue;
      const a = this.spawn(o.t, o.x, o.y, o.z, o.yaw);
      if (!a) break;
      a.tame = !!o.tame;
      a.hunger = Number.isFinite(o.hunger) ? Math.max(0, o.hunger) : 180 + Math.random() * 180;
      a.sleep = Number.isFinite(o.sleep) ? Math.max(0, o.sleep) : 0;
      a.huntPause = Number.isFinite(o.huntPause) ? Math.max(0, o.huntPause) : 0;
      a.state = a.sleep ? 'slapen' : 'rust'; a.show(0);
    }
  }
}
