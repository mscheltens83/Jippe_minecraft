// Gemeenschappelijke beweging, botsingen en houdingen voor alle dieren.
import * as THREE from '../../lib/three.module.min.js';
import { B, BLOCKS, blockBoxes } from '../blocks.js';
import { SX, SZ, SY } from '../world.js';
import { cachedModel } from '../models.js';
import { SPECIES } from './species.js';
import { updateSkills } from './skills.js';

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
export class Animal {
  constructor(type, x, y, z, yaw) {
    this.type = type; this.def = SPECIES[type];
    this.model = cachedModel(type, this.def.bouw);
    Object.assign(this, this.model);
    this.group = new THREE.Group();
    this.group.add(...this.parts, ...this.legs);
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
  waterSurface(world, x = this.x, z = this.z) {
    const ix = Math.floor(x), iz = Math.floor(z);
    for (let y = Math.min(SY - 1, Math.floor(this.y + 1)); y >= Math.floor(this.y) - 2; y--) {
      if (world.get(ix, y, iz) !== B.WATER) continue;
      while (y < SY - 1 && world.get(ix, y + 1, iz) === B.WATER) y++;
      return y + 1;
    }
    return null;
  }

  // Vier punten langs het lijf; een lange nek mag ook niet door een dak steken.
  clearAt(world, x, y, z) {
    const r = this.def.w * 0.43, d = this.def.d * 0.3, sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    const rx = Math.abs(cos * r) + Math.abs(sin * d), rz = Math.abs(sin * r) + Math.abs(cos * d);
    if (x - rx < 0.15 || z - rz < 0.15 || x + rx >= SX - 0.15 || z + rz >= SZ - 0.15) return false;
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
    if (!this.walking && this.onGround && Math.random() < this.def.slaapkans) {
      this.sleep = 12 + Math.random() * 20; this.walking = false; this.graze = false; return;
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

  update(dt, world, effects, all = [], animate = true, clockDt = dt) {
    this.time += dt;
    this.happy = Math.max(0, this.happy - dt);
    this.sleep = Math.max(0, this.sleep - clockDt);
    this.eatTime = Math.max(0, this.eatTime - dt);
    this.inWater = this.waterSurface(world) !== null;
    if (dt > 0 && !this.happy && !this.sleep && !this.hunt && !this.fleeFrom) {
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
    const asleep = this.state === 'slapen', happy = this.happy > 0, motion = Math.sin(this.phase) * 0.6 * this.swing;
    this.group.scale.set(1, 1, 1);
    this.group.position.y = this.y + (happy && this.def.dieet === 'boerderij' ? Math.abs(Math.sin(this.happy * 9)) * 0.12 : 0);
    this.legs.forEach((leg, i) => { leg.rotation.x = asleep ? (i % 2 ? -1.35 : 1.35) : motion * this.pattern[i]; });
    this.head.rotation.x = asleep ? 0.28 : this.graze && !this.walking ? 0.55 + Math.sin(this.time * 3) * 0.08 : this.walking ? Math.sin(this.phase * 2) * 0.06 : 0;
    if (this.tail) this.tail.rotation.y = Math.sin(this.time * (happy ? 12 : 3)) * (happy ? 0.5 : 0.2);
    if (asleep) {
      if (this.body) this.body.position.y -= 0.3;
      this.head.position.y -= Math.min(0.4, this.def.h * 0.3);
    }
    if (this.state === 'sluipen') { this.group.scale.y = 0.82; this.head.rotation.x = -0.18; }
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
      if (happy) { const dip = Math.sin(Math.PI * Math.min(1, this.happy / 1.8)); this.group.scale.y = 1 - dip * 0.9; }
      else if (this.walking) { this.body.rotation.x = -0.45; this.head.position.y -= 0.15; }
      else this.head.rotation.y = Math.sin(this.time * 1.8) * 0.5;
    }
    if (this.hiding) this.group.scale.y = this.type === 'turtle' ? .38 : .12;
    if (this.sliding) this.body.rotation.x = -.45;
    if (this.chewing) this.head.rotation.x = Math.sin(this.time * 7) * .08;
    if (this.type === 'panda' && happy) this.body.rotation.z = Math.sin(this.time * 8) * .6;
    if (this.type === 'polarBear' && happy) this.body.rotation.z = Math.sin(this.time * 8) * .45;
    if (this.type === 'seal' && happy) this.wings.forEach((wing, i) => { wing.rotation.z = (i ? -1 : 1) * Math.sin(this.time * 15) * .75; });
    if (this.type === 'snowyOwl' && happy) this.head.rotation.y = Math.sin(this.time * 4) * Math.PI;
  }

  pet(px, pz) {
    this.happy = 1.8; this.walking = false; this.graze = false; this.sleep = 0; this.sprint = 0;
    if (this.hunt) { this.hunt = null; this.huntPause = 30; }
    this.timer = 2.5; this.state = 'blij'; this.sprayed = false;
    if (this.onGround && this.def.dieet === 'boerderij') this.vy = 4.5;
    this.targetYaw = Math.atan2(-(px - this.x), -(pz - this.z)); this.show(0);
  }
}
