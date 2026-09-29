// Dieren: varkentjes, kippen en schaapjes die rondscharrelen.
// Tik je erop, dan maken ze geluid en komen er hartjes uit.

import * as THREE from '../lib/three.module.min.js';
import { B, BLOCKS } from './blocks.js';
import { SX, SZ } from './world.js';
import { box, part } from './models.js';

const MAX_ANIMALS = 40;

function eyes(y, z, spread, size = 0.1) {
  const out = [];
  for (const x of [-spread, spread]) {
    out.push(box(size, size, 0.02, '#ffffff', x, y, z));
    out.push(box(size * 0.55, size * 0.55, 0.02, '#1b1b1b', x, y - size * 0.1, z - 0.012));
  }
  return out;
}

function legs(w, h, color, xs, zs, extra) {
  const out = [];
  for (const x of xs) for (const z of zs) {
    const geos = [box(w, h, w, color, x, h / 2, z)];
    if (extra) geos.push(extra(x, z));
    out.push(part(geos, x, h, z));
  }
  return out;
}

function buildPig() {
  const PINK = '#f4a7b6', DARK = '#dd8196';
  const body = part([box(0.6, 0.5, 0.9, PINK, 0, 0.55, 0)], 0, 0.55, 0);
  const head = part([
    box(0.5, 0.46, 0.44, PINK, 0, 0.72, -0.62),
    box(0.26, 0.16, 0.06, DARK, 0, 0.66, -0.87),
    box(0.05, 0.06, 0.02, '#8a3b4c', -0.06, 0.66, -0.905),
    box(0.05, 0.06, 0.02, '#8a3b4c', 0.06, 0.66, -0.905),
    ...eyes(0.8, -0.845, 0.13),
  ], 0, 0.62, -0.42);
  return { parts: [body, head], head, legs: legs(0.18, 0.3, DARK, [-0.18, 0.18], [-0.3, 0.3]), pattern: [1, -1, -1, 1] };
}

function buildSheep() {
  const WOOL = '#f4f2ea', FACE = '#8c8c8c', LEG = '#777777';
  const body = part([box(0.72, 0.62, 1.0, WOOL, 0, 0.78, 0)], 0, 0.78, 0);
  const head = part([
    box(0.38, 0.38, 0.36, FACE, 0, 0.95, -0.62),
    box(0.44, 0.14, 0.32, WOOL, 0, 1.17, -0.6),
    box(0.14, 0.06, 0.02, '#555555', 0, 0.86, -0.805),
    ...eyes(1.0, -0.805, 0.1),
  ], 0, 0.9, -0.45);
  return { parts: [body, head], head, legs: legs(0.16, 0.47, LEG, [-0.2, 0.2], [-0.32, 0.32]), pattern: [1, -1, -1, 1] };
}

function buildChicken() {
  const WHITE = '#fbfbf7', YEL = '#f2b233', RED = '#d9342b';
  const body = part([
    box(0.36, 0.34, 0.46, WHITE, 0, 0.44, 0.02),
    box(0.2, 0.2, 0.1, WHITE, 0, 0.6, 0.28),
  ], 0, 0.44, 0);
  const head = part([
    box(0.24, 0.3, 0.2, WHITE, 0, 0.74, -0.2),
    box(0.12, 0.08, 0.1, YEL, 0, 0.74, -0.35),
    box(0.08, 0.1, 0.04, RED, 0, 0.65, -0.32),
    box(0.06, 0.08, 0.12, RED, 0, 0.93, -0.2),
    ...eyes(0.8, -0.305, 0.08, 0.07),
  ], 0, 0.6, -0.15);
  const wings = [-0.21, 0.21].map((x) => part([box(0.06, 0.22, 0.3, '#ececec', x, 0.46, 0.02)], x, 0.56, 0.02));
  const lg = legs(0.06, 0.27, YEL, [-0.08, 0.08], [0.02], (x, z) => box(0.12, 0.03, 0.14, YEL, x, 0.015, z - 0.03));
  return { parts: [body, head, ...wings], head, wings, legs: lg, pattern: [1, -1] };
}

const TYPES = {
  pig: { w: 0.7, h: 0.95, speed: 1.1, build: buildPig },
  chicken: { w: 0.45, h: 0.95, speed: 1.35, build: buildChicken },
  sheep: { w: 0.8, h: 1.25, speed: 0.95, build: buildSheep },
};

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

class Animal {
  constructor(type, x, y, z, yaw) {
    this.type = type;
    this.def = TYPES[type];
    const m = this.def.build();
    this.group = new THREE.Group();
    this.group.add(...m.parts, ...m.legs);
    this.head = m.head;
    this.legs = m.legs;
    this.wings = m.wings || [];
    this.pattern = m.pattern;
    this.x = x; this.y = y; this.z = z;
    this.yaw = yaw; this.targetYaw = yaw;
    this.vy = 0;
    this.onGround = false;
    this.walking = false;
    this.graze = false;
    this.timer = 1 + Math.random() * 3;
    this.phase = 0;
    this.swing = 0;
    this.happy = 0;
    this.time = Math.random() * 10;
    this.box = new THREE.Box3();
  }

  solid(world, x, y, z) { return BLOCKS[world.get(Math.floor(x), Math.floor(y), Math.floor(z))].solid; }

  update(dt, world) {
    this.time += dt;
    this.timer -= dt;
    if (this.happy > 0) this.happy -= dt;
    if (this.timer <= 0) {
      this.walking = !this.walking && Math.random() < 0.75;
      this.timer = this.walking ? 1.5 + Math.random() * 3 : 1 + Math.random() * 3.5;
      this.graze = !this.walking && Math.random() < 0.5;
      if (this.walking) this.targetYaw = this.yaw + (Math.random() - 0.5) * Math.PI * 1.5;
    }
    this.yaw += wrap(this.targetYaw - this.yaw) * Math.min(1, dt * 4);

    const inWater = world.get(Math.floor(this.x), Math.floor(this.y + 0.3), Math.floor(this.z)) === B.WATER;
    if (this.walking && this.happy <= 0) {
      const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
      const v = this.def.speed * dt, r = this.def.w / 2;
      const nx = this.x - sin * v, nz = this.z - cos * v;
      const fx = nx - sin * r, fz = nz - cos * r;
      const fy = Math.floor(this.y + 0.01);
      let blocked = fx < 0.5 || fz < 0.5 || fx > SX - 0.5 || fz > SZ - 0.5;
      if (!blocked && this.solid(world, fx, fy, fz)) {
        // een opstapje van 1 blok: huppel erop
        if (this.onGround && !this.solid(world, fx, fy + 1, fz) && !this.solid(world, fx, fy + 2, fz)) this.vy = 6.4;
        else blocked = true;
      }
      if (!blocked && !inWater) {
        // niet het water in en niet van een hoge rand af
        const at = world.get(Math.floor(fx), fy, Math.floor(fz));
        const below = world.get(Math.floor(fx), fy - 1, Math.floor(fz));
        if (at === B.WATER || below === B.WATER) blocked = true;
        else if (!BLOCKS[below].solid && !this.solid(world, fx, fy - 2, fz)) blocked = true;
      }
      if (blocked) {
        this.targetYaw = this.yaw + Math.PI * (0.6 + Math.random() * 0.8);
      } else if (!this.solid(world, nx, this.y + 0.05, nz)) {
        this.x = nx; this.z = nz;
      }
      this.phase += dt * 9;
      this.swing = Math.min(1, this.swing + dt * 5);
    } else {
      this.swing = Math.max(0, this.swing - dt * 5);
    }

    // zwaartekracht, en drijven in het water
    this.vy -= 20 * dt;
    if (inWater) this.vy = Math.min(this.vy + 32 * dt, 1.6);
    this.vy = Math.max(this.vy, -20);
    let ny = this.y + this.vy * dt;
    this.onGround = false;
    if (this.vy <= 0 && this.solid(world, this.x, ny, this.z)) {
      ny = Math.floor(ny) + 1;
      this.vy = 0;
      this.onGround = true;
    } else if (this.vy > 0 && this.solid(world, this.x, ny + this.def.h, this.z)) {
      this.vy = 0;
      ny = this.y;
    }
    this.y = ny;
    // iemand heeft een blok op me gebouwd: klim eruit
    if (this.solid(world, this.x, this.y + 0.1, this.z)) { this.y = Math.floor(this.y + 0.1) + 1; this.vy = 0; }
    if (this.y < -3) this.y = 60;

    // laten zien
    const g = this.group;
    const hop = this.happy > 0 ? Math.abs(Math.sin(this.happy * 9)) * 0.12 : 0;
    g.position.set(this.x, this.y + hop, this.z);
    g.rotation.y = this.yaw;
    const s = Math.sin(this.phase) * 0.6 * this.swing;
    this.legs.forEach((l, i) => { l.rotation.x = s * this.pattern[i]; });
    const grazing = this.graze && !this.walking ? 0.55 + Math.sin(this.time * 3) * 0.08 : 0;
    this.head.rotation.x += ((this.walking ? Math.sin(this.phase * 2) * 0.06 : grazing) - this.head.rotation.x) * Math.min(1, dt * 6);
    const flap = this.happy > 0 ? Math.sin(this.time * 30) * 0.7 : 0;
    this.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * Math.abs(flap); });
    const h = this.def.w / 2;
    this.box.min.set(this.x - h, this.y, this.z - h);
    this.box.max.set(this.x + h, this.y + this.def.h, this.z + h);
  }

  pet(px, pz) {
    this.happy = 1.2;
    this.walking = false;
    this.graze = false;
    this.timer = 2;
    if (this.onGround) this.vy = 4.5;
    this.targetYaw = Math.atan2(-(px - this.x), -(pz - this.z));
  }

  dispose() {
    this.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  }
}

export class Animals {
  constructor(scene) {
    this.scene = scene;
    this.list = [];
    this.tmp = new THREE.Vector3();
  }

  get full() { return this.list.length >= MAX_ANIMALS; }

  clear() {
    for (const a of this.list) { this.scene.remove(a.group); a.dispose(); }
    this.list = [];
  }

  spawn(type, x, y, z, yaw = Math.random() * Math.PI * 2) {
    if (!TYPES[type] || this.full) return null;
    const a = new Animal(type, x, y, z, yaw);
    a.tame = false; a.hunger = 180 + Math.random() * 180; a.sleep = 0;
    this.scene.add(a.group);
    this.list.push(a);
    a.update(0, { get: () => 0 });
    return a;
  }

  // Een paar dieren neerzetten in een nieuwe wereld, op het gras rond het midden
  populate(world) {
    if (!['island', 'flat', 'adventure'].includes(world.type)) return;
    const want = [['pig', 4], ['sheep', 3], ['chicken', 4]];
    for (const [type, n] of want) {
      let placed = 0;
      for (let tries = 0; tries < 200 && placed < n; tries++) {
        const ang = Math.random() * Math.PI * 2;
        const dist = world.type === 'adventure' ? 3 + Math.random() * 3 : 6 + Math.random() * 20;
        const x = Math.floor(SX / 2 + Math.cos(ang) * dist), z = Math.floor(SZ / 2 + Math.sin(ang) * dist);
        const y = world.surfaceY(x, z);
        if (world.get(x, y, z) !== B.GRASS || world.get(x, y + 1, z) === B.WATER) continue;
        if (BLOCKS[world.get(x, y + 1, z)].solid) continue;
        this.spawn(type, x + 0.5, y + 1, z + 0.5);
        placed++;
      }
    }
  }

  update(dt, world) {
    for (const a of this.list) a.update(dt, world);
  }

  // Welk dier raakt de straal als eerste?
  pick(ray, maxDist) {
    let best = null;
    for (const a of this.list) {
      const p = ray.intersectBox(a.box, this.tmp);
      if (!p) continue;
      const d = p.distanceTo(ray.origin);
      if (d <= maxDist && (!best || d < best.dist)) best = { animal: a, dist: d };
    }
    return best;
  }

  serialize() {
    const r = (v) => Math.round(v * 100) / 100;
    return this.list.map((a) => ({
      t: a.type, x: r(a.x), y: r(a.y), z: r(a.z), yaw: r(a.yaw),
      tame: !!a.tame, hunger: Number.isFinite(a.hunger) ? a.hunger : 180 + Math.random() * 180,
      sleep: Number.isFinite(a.sleep) ? a.sleep : 0,
    }));
  }

  load(arr) {
    this.clear();
    if (!Array.isArray(arr)) return;
    for (const o of arr) {
      if (!TYPES[o?.t] || ![o.x, o.y, o.z, o.yaw].every(Number.isFinite)) continue;
      const a = this.spawn(o.t, o.x, o.y, o.z, o.yaw);
      if (!a) break;
      a.tame = !!o.tame;
      a.hunger = Number.isFinite(o.hunger) ? Math.max(0, o.hunger) : 180 + Math.random() * 180;
      a.sleep = Number.isFinite(o.sleep) ? Math.max(0, o.sleep) : 0;
    }
  }
}
