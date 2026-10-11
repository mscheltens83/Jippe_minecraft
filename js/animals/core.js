// Gemeenschappelijke beweging, botsingen en houdingen voor alle dieren.
import * as THREE from '../../lib/three.module.min.js';
import { WATERY, blockBoxes } from '../blocks.js';
import { SY } from '../world.js';
import { cachedModel, MODEL_MAT, ownMaterial } from '../models.js';
import { SPECIES } from './species.js';
import { updateSkills } from './skills.js';

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
export class Animal {
  constructor(type, x, y, z, yaw, variant = null) {
    this.type = type; this.def = SPECIES[type];
    // Soorten met meer kleuren (paard, kat, ...): elk dier kiest er één
    const n = this.def.varianten || 0;
    this.variant = n ? ((variant ?? Math.floor(Math.random() * n)) % n + n) % n : 0;
    this.model = cachedModel(n ? `${type}:${this.variant}` : type, () => this.def.bouw(this.variant));
    Object.assign(this, this.model);
    this.group = new THREE.Group();
    this.group.add(...this.parts, ...this.legs);
    // Ver weg: één vorm in rusthouding in plaats van alle losse stukjes (zie setFar)
    this.lod = new THREE.Mesh(this.merged, MODEL_MAT);
    this.lod.visible = false;
    this.lodOn = false;
    this.group.add(this.lod);
    this.mat = ownMaterial(this.group);
    this.wings ||= [];
    this.rest = new Map();
    this.group.traverse((o) => { if (o !== this.group) this.rest.set(o, { p: o.position.clone(), r: o.rotation.clone() }); });
    this.x = x; this.y = y; this.z = z; this.yaw = yaw; this.targetYaw = yaw;
    this.vy = 0; this.onGround = false; this.inWater = false;
    this.walking = false; this.graze = false; this.state = 'rust';
    this.timer = 1 + Math.random() * 3; this.time = Math.random() * 10;
    this.phase = 0; this.swing = 0; this.happy = 0;
    this.tame = false; this.tameClicks = 0; this.tameUntil = 0; this.riding = false; this.following = false;
    this.hunger = 180 + Math.random() * 180; this.sleep = 0;
    this.hunt = null; this.huntPause = 0; this.fleeFrom = null; this.eatTime = 0;
    this.hay = null; this.hayCheck = 0;
    this.sprint = 0; this.sprintWait = 5 + Math.random() * 10; this.dustTime = 0;
    this.skillWait = 0; this.sprayed = false; this.browsing = false;
    this.sleepPuff = 0; this.elapsed = 0; this.clockElapsed = 0;
    this.baby = 0; this.love = 0; this.breedWait = 0; this.sitting = false; // fokken en zitten (fase 4G)
    this.box = new THREE.Box3();
    this.sync(); this.show(0);
  }

  solid(world, x, y, z) {
    const bx = Math.floor(x), bz = Math.floor(z);
    for (let by = Math.floor(y - 0.5); by <= Math.floor(y); by++) {
      for (const q of blockBoxes(world, bx, by, bz, true)) {
        if (x >= bx + q[0] && x < bx + q[3] && y >= by + q[1] && y < by + q[4] && z >= bz + q[2] && z < bz + q[5]) return true;
      }
    }
    return false;
  }
  has(skill) { return this.def.kunstjes.includes(skill); }

  // Ver weg tekenen we het dier als één stuk (minder werk voor de iPad), dichtbij met alle bewegingen
  setFar(on) {
    if (this.lodOn === on) return;
    this.lodOn = on;
    for (const p of this.parts) p.visible = !on;
    for (const l of this.legs) l.visible = !on;
    this.lod.visible = on;
    if (!on) { // zadel en tong staan alleen aan als dat hoort
      if (this.saddle) this.saddle.visible = this.tame;
      if (this.tongue) this.tongue.visible = this.state === 'eten';
    }
  }
  waterSurface(world, x = this.x, z = this.z) {
    const ix = Math.floor(x), iz = Math.floor(z);
    for (let y = Math.min(SY - 1, Math.floor(this.y + 1)); y >= Math.floor(this.y) - 2; y--) {
      if (!WATERY[world.get(ix, y, iz)]) continue;
      while (y < SY - 1 && WATERY[world.get(ix, y + 1, iz)]) y++;
      return y + 1;
    }
    return null;
  }

  // Vier punten langs het lijf; een lange nek mag ook niet door een dak steken.
  clearAt(world, x, y, z) {
    const r = this.def.w * 0.43, d = this.def.d * 0.3, sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    const rx = Math.abs(cos * r) + Math.abs(sin * d), rz = Math.abs(sin * r) + Math.abs(cos * d);
    // Niet een stuk wereld in dat (nog) niet geladen is
    if (!world.isLoaded(x - rx, z - rz) || !world.isLoaded(x + rx, z + rz) || !world.isLoaded(x - rx, z + rz) || !world.isLoaded(x + rx, z - rz)) return false;
    for (let bx = Math.floor(x - rx); bx <= Math.floor(x + rx); bx++) for (let bz = Math.floor(z - rz); bz <= Math.floor(z + rz); bz++) {
      for (let by = Math.floor(y - 0.5); by <= Math.floor(y + this.def.h); by++) {
        for (const q of blockBoxes(world, bx, by, bz, true)) {
          if (bx + q[0] < x + rx && bx + q[3] > x - rx && bz + q[2] < z + rz && bz + q[5] > z - rz &&
            by + q[1] < y + this.def.h - 0.05 && by + q[4] > y + 0.05) return false;
        }
      }
    }
    return true;
  }

  touches(world, y) {
    if (this.solid(world, this.x, y, this.z)) return true;
    const r = this.def.w * 0.43, d = this.def.d * 0.3, sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    for (const side of [-r, r]) for (const end of [-d, d]) {
      if (this.solid(world, this.x + cos * side + sin * end, y, this.z - sin * side + cos * end)) return true;
    }
    return false;
  }

  choose() {
    // 's Nachts gaan bijna alle dieren slapen (tamme dieren en wie bereden wordt niet)
    // (een nachtdier zoals de vos slaapt juist overdag)
    const night = (this.def.nachtdier ? !Animal.night : Animal.night) && !this.tame && !this.riding;
    if (!this.walking && this.onGround && Math.random() < (night ? 0.8 : this.def.slaapkans)) {
      this.sleep = night ? 30 + Math.random() * 40 : 12 + Math.random() * 20; this.walking = false; this.graze = false; return;
    }
    this.walking = !this.walking && Math.random() < 0.75;
    this.timer = this.walking ? 1.5 + Math.random() * 3 : 1 + Math.random() * 3.5;
    this.graze = !this.walking && Math.random() < 0.5;
    if (this.walking) this.targetYaw = this.yaw + (Math.random() - 0.5) * Math.PI * 1.5;
  }

  move(dt, world) {
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    const nx = this.x - sin * this.speedNow * dt, nz = this.z - cos * this.speedNow * dt;
    let blocked = !this.clearAt(world, nx, this.y, nz);
    // Vissen, dolfijnen en inktvissen blijven in het water
    if (this.def.onderwater && this.inWater) {
      const ahead = world.get(Math.floor(nx - sin * this.def.d * 0.4), Math.floor(this.y + this.def.h / 2), Math.floor(nz - cos * this.def.d * 0.4));
      if (blocked || !WATERY[ahead]) { this.targetYaw = this.yaw + Math.PI * (0.6 + Math.random() * 0.8); return false; }
      this.x = nx; this.z = nz;
      return true;
    }
    if (!blocked && this.hay && Math.hypot(nx - this.hay.x, nz - this.hay.z) > 6) {
      this.targetYaw = Math.atan2(-(this.hay.x - this.x), -(this.hay.z - this.z));
      return false;
    }
    if (blocked && (this.onGround || this.inWater && this.has('zwemmen')) && this.clearAt(world, nx, this.y + 1.05, nz)) {
      this.vy = this.inWater ? 8 : 6.4;
      return; // Eerst boven het opstapje komen, dan pas vooruit.
    }
    const water = this.waterSurface(world, nx, nz);
    if (!blocked && !this.flight && !this.inWater && !(water !== null && this.has('zwemmen'))) {
      const fx = nx - sin * this.def.d * 0.3, fz = nz - cos * this.def.d * 0.3;
      const fy = Math.floor(this.y - 0.05);
      if (water !== null || !this.solid(world, fx, fy, fz) && !this.solid(world, fx, fy - 1, fz)) blocked = true;
    }
    if (blocked) {
      if (!this.hunt && !this.fleeFrom) this.targetYaw = this.yaw + Math.PI * (0.6 + Math.random() * 0.8);
    } else { this.x = nx; this.z = nz; }
    return !blocked;
  }

  gravity(dt, world) {
    if (this.flight) {
      const next = this.y + Math.max(-dt * 3, Math.min(dt * 3, this.flight.y - this.y));
      if (this.clearAt(world, this.x, next, this.z)) this.y = next;
      this.vy = 0; this.onGround = false; return;
    }
    if (this.climbing > 0) { this.climbing = Math.max(0, this.climbing - dt); this.vy = 0; return; }
    const surface = this.waterSurface(world);
    this.inWater = surface !== null;
    if (this.def.onderwater && this.inWater && this.vy <= 0) { this.swim(dt, world, surface); return; }
    if (this.inWater && this.has('zwemmen') && this.vy <= 0) {
      this.y += (surface - this.def.floatDepth - this.y) * Math.min(1, dt * 7);
      this.vy = 0; this.onGround = false; return;
    }
    this.vy = Math.max(-20, this.vy - 20 * dt);
    if (this.inWater && !this.has('zwemmen')) this.vy = Math.min(this.vy + 32 * dt, 1.6);
    let ny = this.y + this.vy * dt;
    this.onGround = false;
    if (this.vy <= 0 && this.touches(world, ny)) {
      ny = Math.floor(ny) + 1; this.vy = 0; this.onGround = true;
    } else if (this.vy > 0 && this.touches(world, ny + this.def.h)) {
      ny = this.y; this.vy = 0;
    }
    this.y = ny;
    // Een blok op een dier gebouwd: zet hem erboven zodat hij niet vastzit.
    if (this.solid(world, this.x, this.y + 0.05, this.z)) { this.y = Math.floor(this.y + 0.05) + 1; this.vy = 0; }
    if (this.y < -3) this.y = 60;
  }

  // Onder water zwemmen op een eigen diepte; af en toe een andere diepte kiezen
  swim(dt, world, surface) {
    const ix = Math.floor(this.x), iz = Math.floor(this.z);
    let bottom = Math.floor(this.y);
    while (bottom > 0 && WATERY[world.get(ix, bottom - 1, iz)] && bottom > this.y - 10) bottom--;
    const top = surface - this.def.h - 0.1, low = Math.min(top, bottom + 0.15);
    if (this.swimY == null || (this.swimWait = (this.swimWait ?? 0) - dt) <= 0) {
      this.swimY = low + Math.random() * Math.max(0, top - low);
      this.swimWait = 3 + Math.random() * 5;
    }
    const target = Math.max(low, Math.min(top, this.swimY));
    const next = this.y + Math.max(-dt * 1.2, Math.min(dt * 1.2, target - this.y));
    if (this.clearAt(world, this.x, next, this.z)) this.y = next;
    this.vy = 0; this.onGround = false;
  }

  update(dt, world, effects, all = [], animate = true, clockDt = dt) {
    this.time += dt;
    // Karretje en bootje lopen niet zelf: ze vallen of drijven alleen (fase 5D)
    if (this.def.voertuig) {
      this.walking = false; this.sleep = 0; this.happy = 0;
      for (let left = dt; left > 0.00001;) { const step = Math.min(0.025, left); left -= step; this.gravity(step, world); }
      this.sync(); if (animate) this.show(dt);
      return;
    }
    this.happy = Math.max(0, this.happy - dt);
    this.sleep = Math.max(0, this.sleep - clockDt);
    this.eatTime = Math.max(0, this.eatTime - dt);
    this.inWater = this.waterSurface(world) !== null;
    if (this.sitting) { this.walking = false; this.graze = false; this.sleep = 0; }
    else if (dt > 0 && !this.happy && !this.sleep && !this.hunt && !this.fleeFrom) {
      this.timer -= dt;
      if (this.timer <= 0) this.choose();
    }
    if (!this.hunt && !this.fleeFrom) updateSkills(this, dt, world, effects, all);
    this.state = this.happy ? 'blij' : this.eatTime ? 'eten' : this.sleep ? 'slapen' : this.hunt?.phase === 'stalk' ? 'sluipen'
      : this.hunt ? 'jagen' : this.fleeFrom ? 'vluchten' : this.following && this.walking ? 'volgen'
        : this.walking ? 'lopen' : this.graze ? 'grazen' : 'rust';
    this.speedNow = this.hunt ? (this.hunt.phase === 'stalk' ? 0.6
      : this.type === 'cheetah' ? (this.hunt.elapsed % 3 < 2 ? 8 : 2.5) : this.def.rensnelheid)
      : this.fleeFrom ? 3.5 : this.sprint > 0 ? this.def.rensnelheid : this.def.speed;
    this.yaw += wrap(this.targetYaw - this.yaw) * Math.min(1, dt * 4);
    if (this.sliding) this.speedNow *= 2;
    if (this.dash > 0) this.speedNow = Math.max(this.speedNow, this.def.speed * 2.5);
    const moving = (this.walking && !this.happy || this.dash > 0) && !this.sleep;
    // Verre dieren krijgen vier beeldjes tegelijk: kleine stappen houden botsingen betrouwbaar.
    for (let left = dt; left > 0.00001;) {
      const step = Math.min(0.025, left); left -= step;
      if (moving) {
        const moved = this.move(step, world);
        if (this.hunt?.phase === 'chase') this.hunt.blocked = moved ? 0 : (this.hunt.blocked || 0) + step;
      }
      this.gravity(step, world);
    }
    if (moving) { this.phase += dt * (this.hunt || this.fleeFrom || this.sprint ? 21 : 9); this.swing = Math.min(1, this.swing + dt * 5); }
    else this.swing = Math.max(0, this.swing - dt * 5);
    if (animate && this.sleep && (this.sleepPuff -= dt) <= 0) {
      effects?.sleepAt?.(this.x, this.y + this.def.h * 0.65, this.z); this.sleepPuff = 1.5;
    }
    this.sync();
    if (animate) this.show(dt);
  }

  sync() {
    this.group.position.set(this.x, this.y, this.z); this.group.rotation.y = this.yaw;
    const sin = Math.abs(Math.sin(this.yaw)), cos = Math.abs(Math.cos(this.yaw));
    const rx = (cos * this.def.w + sin * this.def.d) / 2, rz = (sin * this.def.w + cos * this.def.d) / 2;
    this.box.min.set(this.x - rx, this.y, this.z - rz);
    this.box.max.set(this.x + rx, this.y + this.def.h, this.z + rz);
  }

  show(dt) {
    for (const [node, rest] of this.rest) { node.position.copy(rest.p); node.rotation.copy(rest.r); }
    if (this.saddle) this.saddle.visible = this.tame;
    if (this.flower) this.flower.visible = !!this.holdFlower;
    const asleep = this.state === 'slapen', happy = this.happy > 0, motion = Math.sin(this.phase) * 0.6 * this.swing;
    const size = this.baby > 0 ? 0.55 : 1; // een jong dier is half zo groot
    this.group.scale.set(size, size, size);
    this.group.position.y = this.y + (happy && this.def.dieet === 'boerderij' ? Math.abs(Math.sin(this.happy * 9)) * 0.12 : 0);
    this.legs.forEach((leg, i) => { leg.rotation.x = asleep ? (i % 2 ? -1.35 : 1.35) : motion * this.pattern[i]; });
    this.head.rotation.x = asleep ? 0.28 : this.graze && !this.walking ? 0.55 + Math.sin(this.time * 3) * 0.08 : this.walking ? Math.sin(this.phase * 2) * 0.06 : 0;
    if (this.tail) this.tail.rotation.y = Math.sin(this.time * (happy ? 12 : 3)) * (happy ? 0.5 : 0.2);
    if (asleep) {
      if (this.body) this.body.position.y -= 0.3;
      this.head.position.y -= Math.min(0.4, this.def.h * 0.3);
    }
    if (this.state === 'sluipen') { this.group.scale.y *= 0.82; this.head.rotation.x = -0.18; }
    if (this.sitting && this.legs.length === 4) {
      this.legs[2].rotation.x = this.legs[3].rotation.x = -1.3; this.legs[0].rotation.x = this.legs[1].rotation.x = 0;
      this.body.rotation.x = 0.35; this.body.position.y -= this.def.h * 0.12; this.head.position.y -= this.def.h * 0.05;
      if (this.saddle) this.saddle.position.y -= this.def.h * 0.05;
    }
    if (this.tongue) {
      this.tongue.visible = this.state === 'eten';
      if (this.state === 'eten') { this.head.rotation.x = -0.25 + Math.sin(this.time * 14) * 0.12; this.body.position.y -= 0.16; }
    }
    if (['lion', 'lioness', 'tiger'].includes(this.type) && happy) {
      this.head.rotation.x = -0.17; this.head.rotation.z = Math.sin(this.time * 22) * 0.15;
    }
    this.wings.forEach((wing, i) => { wing.rotation.z = happy ? (i ? -1 : 1) * Math.abs(Math.sin(this.time * 30) * 0.7) : 0; });
    this.ears?.forEach((ear, i) => { ear.rotation.y = (i ? -1 : 1) * Math.sin(this.time * (happy ? 16 : 3)) * 0.3; });
    if (this.trunk) this.trunk.forEach((segment, i) => { segment.rotation.x = happy ? (i ? 0.18 : 1.45) : Math.sin(this.time * 2 - i * 0.6) * 0.13; });
    if (this.neck) { this.neck.rotation.x = happy ? Math.sin(this.time * 8) * 0.13 : this.browsing ? -0.2 : 0; this.head.rotation.x = 0; }
    if (this.jaw && happy) { this.jaw.rotation.x = 0.72 * Math.sin(Math.PI * Math.min(1, this.happy / 1.8)); this.head.rotation.x = -0.25; }
    if (this.type === 'zebra' && happy) this.legs[1].rotation.x = -0.9 * Math.abs(Math.sin(this.time * 10));
    if (this.type === 'meerkat') {
      if (happy) { const dip = Math.sin(Math.PI * Math.min(1, this.happy / 1.8)); this.group.scale.y *= 1 - dip * 0.9; }
      else if (this.walking) { this.body.rotation.x = -0.45; this.head.position.y -= 0.15; }
      else this.head.rotation.y = Math.sin(this.time * 1.8) * 0.5;
    }
    if (this.hiding) this.group.scale.y *= this.type === 'turtle' ? .38 : .12;
    if (this.sliding) this.body.rotation.x = -.45;
    if (this.chewing) this.head.rotation.x = Math.sin(this.time * 7) * .08;
    if (this.type === 'panda' && happy) this.body.rotation.z = Math.sin(this.time * 8) * .6;
    if (this.type === 'polarBear' && happy) this.body.rotation.z = Math.sin(this.time * 8) * .45;
    if (this.type === 'seal' && happy) this.wings.forEach((wing, i) => { wing.rotation.z = (i ? -1 : 1) * Math.sin(this.time * 15) * .75; });
    if (this.type === 'snowyOwl' && happy) this.head.rotation.y = Math.sin(this.time * 4) * Math.PI;
    if (this.type === 'villager' && happy) this.head.rotation.x = Math.sin(this.time * 12) * 0.3; // knikken: hmm!
    if (this.type === 'golem' && happy) this.legs[1].rotation.x = -1.3; // steekt de bloem naar je uit
    if (this.type === 'jellyfish') { const s = 1 + Math.sin(this.time * 3) * 0.1; this.body.scale.set(1 / s, s, 1 / s); }
    if (this.type === 'puffer' && happy) this.group.scale.multiplyScalar(1 + 0.9 * Math.sin(Math.PI * Math.min(1, this.happy / 1.8))); // opblazen!
  }

  pet(px, pz) {
    this.happy = 1.8; this.walking = false; this.graze = false; this.sleep = 0; this.sprint = 0;
    if (this.hunt) { this.hunt = null; this.huntPause = 30; }
    this.timer = 2.5; this.state = 'blij'; this.sprayed = false;
    if (this.onGround && this.def.dieet === 'boerderij') this.vy = 4.5;
    this.targetYaw = Math.atan2(-(px - this.x), -(pz - this.z)); this.show(0);
  }
}

// Is het nacht? Wordt door het spel gezet (dan gaan de dieren slapen)
Animal.night = false;
