// Brokjes die wegspringen als je een blok sloopt (en een wolkje bij bouwen).

import * as THREE from '../lib/three.module.min.js';
import { BLOCKS } from './blocks.js';

const MAX = 240;

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
    this.m = new THREE.Matrix4();
    this.c = new THREE.Color();
  }

  burst(x, y, z, colors, n = 16, puff = false) {
    for (let i = 0; i < n; i++) {
      if (this.list.length >= MAX) this.list.shift();
      const col = colors[Math.floor(Math.random() * colors.length)];
      this.list.push({
        x: x + 0.2 + Math.random() * 0.6,
        y: y + 0.2 + Math.random() * 0.6,
        z: z + 0.2 + Math.random() * 0.6,
        vx: (Math.random() - 0.5) * (puff ? 2 : 4),
        vy: puff ? 0.5 + Math.random() * 1.5 : 2 + Math.random() * 3,
        vz: (Math.random() - 0.5) * (puff ? 2 : 4),
        g: puff ? 1.5 : 14,
        life: 0,
        max: puff ? 0.45 : 0.55 + Math.random() * 0.35,
        size: puff ? 0.1 + Math.random() * 0.08 : 0.07 + Math.random() * 0.08,
        col,
      });
    }
  }

  update(dt, world) {
    let n = 0;
    this.list = this.list.filter((p) => (p.life += dt) < p.max);
    for (const p of this.list) {
      p.vy -= p.g * dt;
      const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt, nz = p.z + p.vz * dt;
      if (BLOCKS[world.get(Math.floor(nx), Math.floor(ny), Math.floor(nz))]?.solid) {
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
