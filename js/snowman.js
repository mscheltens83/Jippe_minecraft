// Twee sneeuwblokken met een pompoen worden een vriendelijk wandelend sneeuwpopje.
import * as THREE from '../lib/three.module.min.js';
import { B, BLOCKS } from './blocks.js';
import { box, part, cachedModel } from './models.js';

function buildSnowman() {
  const body = part([
    box(.94, .9, .88, '#f8fbff', 0, .48, 0),
    box(.76, .78, .72, '#ffffff', 0, 1.25, 0),
    box(.12, .12, .025, '#2c3034', 0, 1.38, -.37),
    box(.12, .12, .025, '#2c3034', 0, 1.08, -.37),
  ], 0, 1, 0);
  const head = part([
    box(.8, .78, .8, '#df8c32', 0, 2.15, 0),
    box(.18, .12, .18, '#6a8b38', 0, 2.61, 0),
    box(.12, .13, .03, '#40372e', -.2, 2.25, -.415),
    box(.12, .13, .03, '#40372e', .2, 2.25, -.415),
    box(.18, .12, .32, '#f3ba54', 0, 2.02, -.52),
    box(.35, .05, .03, '#623a28', 0, 1.83, -.42),
  ], 0, 2.05, 0);
  const arms = [-1, 1].map((s) => part([
    box(.62, .09, .09, '#8a603d', s * .67, 1.48, 0),
    box(.09, .3, .08, '#8a603d', s * .94, 1.63, 0),
  ], s * .38, 1.48, 0));
  return { parts: [body, head, ...arms], legs: [], body, head, arms };
}

class Snowman {
  constructor(x, y, z, yaw = 0) {
    const m = cachedModel('snowman', buildSnowman);
    this.body = m.body; this.head = m.head; this.arms = m.arms;
    this.group = new THREE.Group(); this.group.add(...m.parts);
    this.x = x; this.y = y; this.z = z; this.yaw = yaw; this.targetYaw = yaw;
    this.homeX = x; this.homeZ = z; this.time = 0; this.timer = 1 + Math.random() * 2;
    this.walking = false; this.sync();
  }
  sync() { this.group.position.set(this.x, this.y, this.z); this.group.rotation.y = this.yaw; }
  update(dt, world) {
    if (dt <= 0) return;
    this.time += dt; this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 1.5 + Math.random() * 3;
      this.walking = Math.random() < .7;
      this.targetYaw = Math.hypot(this.x - this.homeX, this.z - this.homeZ) > 6
        ? Math.atan2(this.x - this.homeX, this.z - this.homeZ) : this.yaw + (Math.random() - .5) * 2.5;
    }
    const delta = Math.atan2(Math.sin(this.targetYaw - this.yaw), Math.cos(this.targetYaw - this.yaw));
    this.yaw += delta * Math.min(1, dt * 2);
    if (this.walking) {
      const nx = this.x - Math.sin(this.yaw) * dt * .65, nz = this.z - Math.cos(this.yaw) * dt * .65;
      const bx = Math.floor(nx), bz = Math.floor(nz), surface = world.surfaceY(bx, bz), ny = surface + 1;
      if (bx > 1 && bx < 94 && bz > 1 && bz < 94 && Math.abs(ny - this.y) <= 1 &&
        BLOCKS[world.get(bx, ny, bz)].replaceable && BLOCKS[world.get(bx, ny + 1, bz)].replaceable &&
        BLOCKS[world.get(bx, ny + 2, bz)].replaceable && world.get(bx, surface, bz) !== B.WATER) {
        this.x = nx; this.z = nz; this.y = ny;
      } else { this.walking = false; this.timer = .4; }
    }
    this.arms.forEach((a, i) => { a.rotation.z = (i ? 1 : -1) * (.18 + Math.sin(this.time * 5) * .35); });
    this.head.rotation.y = Math.sin(this.time * 1.5) * .16;
    this.group.position.y = this.y + (this.walking ? Math.abs(Math.sin(this.time * 6)) * .045 : 0);
    this.group.position.x = this.x; this.group.position.z = this.z; this.group.rotation.y = this.yaw;
  }
}

export class Snowmen {
  constructor(scene) { this.scene = scene; this.list = []; }
  spawn(x, y, z, yaw = 0) {
    if (this.list.length >= 20) return null;
    const snowman = new Snowman(x, y, z, yaw);
    this.scene.add(snowman.group); this.list.push(snowman); return snowman;
  }
  remove(snowman) {
    const i = this.list.indexOf(snowman);
    if (i >= 0) { this.scene.remove(snowman.group); this.list.splice(i, 1); }
  }
  clear() { for (const snowman of this.list) this.scene.remove(snowman.group); this.list = []; }
  update(dt, world) { for (const snowman of this.list) snowman.update(dt, world); }
  serialize() { return this.list.map((s) => ({ x: s.x, y: s.y, z: s.z, yaw: s.yaw })); }
  load(data) {
    this.clear();
    if (!Array.isArray(data)) return;
    for (const s of data) if ([s?.x, s?.y, s?.z, s?.yaw].every(Number.isFinite)) this.spawn(s.x, s.y, s.z, s.yaw);
  }
}
