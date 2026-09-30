// Brokjes die wegspringen als je een blok sloopt, wolkjes bij bouwen,
// vuurwerk dat de lucht in gaat en hartjes bij de dieren.

import * as THREE from '../lib/three.module.min.js';
import { BLOCKS } from './blocks.js';
import { createHeartCanvas } from './textures.js';

const MAX = 700;
const FIREWORK_COLORS = [
  [1, 0.3, 0.35], [1, 0.8, 0.2], [0.35, 0.9, 0.4], [0.35, 0.65, 1], [0.8, 0.45, 1], [1, 0.55, 0.85], [1, 1, 1],
];

export class Particles {
  constructor(scene) {
    this.mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: '#ffffff' }),
      MAX,
    );
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    scene.add(this.mesh);
    this.list = [];
    this.rockets = [];
    this.m = new THREE.Matrix4();
    this.c = new THREE.Color();
    this.onBang = null;

    // hartjes zijn plaatjes die altijd naar je toe kijken
    const heart = new THREE.CanvasTexture(createHeartCanvas());
    heart.magFilter = THREE.NearestFilter;
    heart.minFilter = THREE.NearestFilter;
    heart.colorSpace = THREE.SRGBColorSpace;
    this.heartMat = new THREE.SpriteMaterial({ map: heart, transparent: true, depthWrite: false });
    this.hearts = [];
    const sleep = document.createElement('canvas'); sleep.width = 64; sleep.height = 32;
    const ctx = sleep.getContext('2d');
    ctx.font = 'bold 25px sans-serif'; ctx.lineWidth = 4; ctx.strokeStyle = '#334e68'; ctx.fillStyle = '#ffffff';
    ctx.strokeText('Zzz', 4, 26); ctx.fillText('Zzz', 4, 26);
    const sleepMap = new THREE.CanvasTexture(sleep);
    this.sleepMat = new THREE.SpriteMaterial({ map: sleepMap, transparent: true, depthWrite: false });
    this.zzz = [];
    const warn = document.createElement('canvas'); warn.width = warn.height = 64;
    const wc = warn.getContext('2d');
    wc.fillStyle = '#ffffff'; wc.strokeStyle = '#7b4833'; wc.lineWidth = 4;
    wc.beginPath(); wc.arc(32, 29, 25, 0, Math.PI * 2); wc.fill(); wc.stroke();
    wc.font = 'bold 42px sans-serif'; wc.fillStyle = '#e78d25'; wc.textAlign = 'center'; wc.fillText('!', 32, 45);
    this.warnMat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(warn), transparent: true, depthWrite: false });
    this.warnings = new Map();
    this.scene = scene;
  }

  add(p) {
    if (this.list.length >= MAX) this.list.shift();
    this.list.push(p);
  }

  burst(x, y, z, colors, n = 16, puff = false) {
    for (let i = 0; i < n; i++) {
      this.add({
        x: x + 0.2 + Math.random() * 0.6,
        y: y + 0.2 + Math.random() * 0.6,
        z: z + 0.2 + Math.random() * 0.6,
        vx: (Math.random() - 0.5) * (puff ? 2 : 4),
        vy: puff ? 0.5 + Math.random() * 1.5 : 2 + Math.random() * 3,
        vz: (Math.random() - 0.5) * (puff ? 2 : 4),
        g: puff ? 1.5 : 14,
        drag: 1,
        life: 0,
        max: puff ? 0.45 : 0.55 + Math.random() * 0.35,
        size: puff ? 0.1 + Math.random() * 0.08 : 0.07 + Math.random() * 0.08,
        col: colors[Math.floor(Math.random() * colors.length)],
        collide: true,
      });
    }
  }

  // Toverglitters rond een stempel
  sparkle(x0, y0, z0, x1, y1, z1, n = 60) {
    for (let i = 0; i < n; i++) {
      this.add({
        x: x0 + Math.random() * (x1 - x0), y: y0 + Math.random() * (y1 - y0), z: z0 + Math.random() * (z1 - z0),
        vx: (Math.random() - 0.5) * 0.6, vy: 0.6 + Math.random() * 1.2, vz: (Math.random() - 0.5) * 0.6,
        g: 0, drag: 1, life: 0, max: 0.6 + Math.random() * 0.6, size: 0.08 + Math.random() * 0.07,
        col: Math.random() < 0.5 ? [1, 0.95, 0.5] : [1, 1, 1], collide: false,
      });
    }
  }

  // Vuurpijl: gaat omhoog en knalt dan uit elkaar
  firework(x, y, z) {
    this.rockets.push({ x, y, z, vy: 15, life: 0, max: 0.75 + Math.random() * 0.3, trail: 0 });
  }

  explode(r) {
    const a = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];
    const b = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];
    for (let i = 0; i < 120; i++) {
      const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      const sp = 5 + Math.random() * 3;
      this.add({
        x: r.x, y: r.y, z: r.z,
        vx: Math.sin(ph) * Math.cos(th) * sp, vy: Math.cos(ph) * sp, vz: Math.sin(ph) * Math.sin(th) * sp,
        g: 2.5, drag: 0.97, life: 0, max: 1.2 + Math.random() * 0.8, size: 0.12 + Math.random() * 0.06,
        col: i % 2 ? a : b, collide: false,
      });
    }
    this.onBang?.(r.x, r.y, r.z);
  }

  heartsAt(x, y, z, size = 1) {
    for (let i = 0; i < 4; i++) {
      let s = this.hearts.find((h) => !h.alive);
      if (!s) {
        if (this.hearts.length > 24) return;
        s = { sprite: new THREE.Sprite(this.heartMat.clone()), alive: false };
        this.scene.add(s.sprite);
        this.hearts.push(s);
      }
      s.alive = true;
      s.life = -i * 0.15;
      s.sprite.visible = false;
      s.sprite.position.set(x + (Math.random() - 0.5) * 0.5, y, z + (Math.random() - 0.5) * 0.5);
      s.sprite.scale.set(0.35 * size, 0.32 * size, 1);
    }
  }

  sleepAt(x, y, z) {
    let s = this.zzz.find((p) => !p.alive);
    if (!s) {
      if (this.zzz.length >= 24) return;
      s = { sprite: new THREE.Sprite(this.sleepMat.clone()), alive: false };
      this.scene.add(s.sprite); this.zzz.push(s);
    }
    s.alive = true; s.life = 0; s.sprite.visible = true;
    s.sprite.position.set(x, y, z); s.sprite.scale.set(0.65, 0.33, 1);
  }

  dustAt(x, y, z) {
    for (let i = 0; i < 3; i++) this.add({
      x: x + (Math.random() - 0.5) * 0.6, y: y + 0.1, z: z + (Math.random() - 0.5) * 0.6,
      vx: (Math.random() - 0.5) * 0.8, vy: 0.5, vz: (Math.random() - 0.5) * 0.8,
      g: 0, drag: 1, life: 0, max: 0.45, size: 0.16, col: [0.83, 0.72, 0.5], collide: false,
    });
  }

  warnAt(animal, on) {
    const current = this.warnings.get(animal);
    if (!on) {
      if (current && --current.count <= 0) {
        this.scene.remove(current.sprite); current.sprite.material.dispose(); this.warnings.delete(animal);
      }
      return;
    }
    if (current) { current.count++; return; }
    const sprite = new THREE.Sprite(this.warnMat.clone());
    sprite.scale.set(0.7, 0.7, 1); this.scene.add(sprite); this.warnings.set(animal, { sprite, count: 1 });
  }

  poofAt(x, y, z, feathers = false) {
    this.burst(x - 0.5, y - 0.5, z - 0.5, [[1, 1, 1], [0.92, 0.96, 1]], 70, true);
    this.sparkle(x - 0.6, y - 0.3, z - 0.6, x + 0.6, y + 0.7, z + 0.6, 24);
    if (feathers) this.burst(x - 0.5, y - 0.4, z - 0.5, [[1, 1, 1], [1, 0.95, 0.72]], 12, true);
  }

  waterAt(x, y, z, dx, dz) {
    for (let i = 0; i < 40; i++) this.add({
      x, y, z, vx: dx * (1.5 + Math.random() * 1.5) + (Math.random() - 0.5),
      vy: 3 + Math.random() * 3, vz: dz * (1.5 + Math.random() * 1.5) + (Math.random() - 0.5),
      g: 9, drag: 1, life: 0, max: 1 + Math.random() * 0.5, size: 0.07 + Math.random() * 0.04,
      col: i % 3 ? [0.35, 0.7, 1] : [0.75, 0.9, 1], collide: true,
    });
  }

  update(dt, world) {
    for (const [animal, warning] of this.warnings) warning.sprite.position.set(animal.x, animal.y + animal.def.h + 0.6 + Math.sin(animal.time * 5) * 0.08, animal.z);
    // vuurpijlen
    for (const r of this.rockets) {
      r.life += dt;
      r.y += r.vy * dt;
      r.trail -= dt;
      if (r.trail <= 0) {
        r.trail = 0.02;
        this.add({
          x: r.x + (Math.random() - 0.5) * 0.1, y: r.y, z: r.z + (Math.random() - 0.5) * 0.1,
          vx: 0, vy: -1, vz: 0, g: 0, drag: 1, life: 0, max: 0.35, size: 0.09,
          col: Math.random() < 0.5 ? [1, 0.75, 0.3] : [1, 0.95, 0.7], collide: false,
        });
      }
      if (r.life >= r.max) this.explode(r);
    }
    this.rockets = this.rockets.filter((r) => r.life < r.max);

    // hartjes zweven omhoog en vervagen
    for (const pool of [this.hearts, this.zzz]) for (const h of pool) {
      if (!h.alive) continue;
      h.life += dt;
      if (h.life < 0) continue;
      h.sprite.visible = true;
      h.sprite.position.y += dt * 1.1;
      h.sprite.material.opacity = Math.max(0, 1 - h.life / 1.3);
      if (h.life > 1.3) { h.alive = false; h.sprite.visible = false; }
    }

    let n = 0;
    this.list = this.list.filter((p) => (p.life += dt) < p.max);
    for (const p of this.list) {
      p.vy -= p.g * dt;
      if (p.drag !== 1) { const d = Math.pow(p.drag, dt * 60); p.vx *= d; p.vy *= d; p.vz *= d; }
      const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt, nz = p.z + p.vz * dt;
      if (p.collide && BLOCKS[world.get(Math.floor(nx), Math.floor(ny), Math.floor(nz))]?.solid) {
        p.vx *= 0.4; p.vz *= 0.4; p.vy = Math.abs(p.vy) * 0.25;
      } else { p.x = nx; p.y = ny; p.z = nz; }
      const s = p.size * (1 - Math.pow(p.life / p.max, 3));
      this.m.makeScale(s, s, s).setPosition(p.x, p.y, p.z);
      this.mesh.setMatrixAt(n, this.m);
      this.c.setRGB(p.col[0], p.col[1], p.col[2], THREE.SRGBColorSpace);
      this.mesh.setColorAt(n, this.c);
      n++;
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
