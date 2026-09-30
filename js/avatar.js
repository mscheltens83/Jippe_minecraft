// Het eigen poppetje, te zien als de camera achter je hangt.

import * as THREE from '../lib/three.module.min.js';
import { box, part } from './models.js';

const SKIN = '#f1c7a0', HAIR = '#6b4526', SHIRT = '#e8503d', PANTS = '#2f5da8', SHOES = '#3a3a3a';

export class Avatar {
  constructor(scene) {
    this.group = new THREE.Group();
    // benen (scharnier bij de heup)
    this.legs = [-0.125, 0.125].map((x) => part([
      box(0.24, 0.55, 0.24, PANTS, x, 0.375, 0),
      box(0.25, 0.1, 0.27, SHOES, x, 0.05, -0.01),
    ], x, 0.65, 0));
    this.body = part([box(0.5, 0.62, 0.26, SHIRT, 0, 0.96, 0)], 0, 0.96, 0);
    // armen (scharnier bij de schouder)
    this.arms = [-0.37, 0.37].map((x) => part([
      box(0.22, 0.4, 0.22, SHIRT, x, 1.06, 0),
      box(0.2, 0.2, 0.2, SKIN, x, 0.76, 0),
    ], x, 1.22, 0));
    // hoofd met haar, ogen en mond (voorkant is -z)
    this.head = part([
      box(0.44, 0.42, 0.44, SKIN, 0, 1.48, 0),
      box(0.46, 0.12, 0.46, HAIR, 0, 1.66, 0),
      box(0.46, 0.3, 0.1, HAIR, 0, 1.52, 0.19),
      box(0.1, 0.07, 0.02, '#ffffff', -0.1, 1.5, -0.225),
      box(0.1, 0.07, 0.02, '#ffffff', 0.1, 1.5, -0.225),
      box(0.05, 0.07, 0.02, '#2f6fd6', -0.08, 1.5, -0.235),
      box(0.05, 0.07, 0.02, '#2f6fd6', 0.08, 1.5, -0.235),
      box(0.16, 0.03, 0.02, '#b5654f', 0, 1.36, -0.225),
    ], 0, 1.27, 0);
    this.group.add(this.body, this.head, ...this.legs, ...this.arms);
    this.group.visible = false;
    this.phase = 0;
    this.swing = 0;
    scene.add(this.group);
  }

  update(dt, p, visible) {
    this.group.visible = visible;
    if (!visible) return;
    const speed = Math.hypot(p.vx, p.vz);
    const walking = speed > 0.3 && (p.onGround || p.inWater);
    this.swing += ((walking ? Math.min(1, speed / 4) : 0) - this.swing) * Math.min(1, dt * 8);
    this.phase += dt * (4 + speed * 1.6);
    const s = Math.sin(this.phase) * 0.8 * this.swing;
    this.legs[0].rotation.x = p.riding ? -1.15 : s;
    this.legs[1].rotation.x = p.riding ? -1.15 : -s;
    // vliegen: armen wijd, benen samen
    const fly = p.flying ? 1 : 0;
    this.arms[0].rotation.x = p.riding ? -0.55 : -s;
    this.arms[1].rotation.x = p.riding ? -0.55 : s;
    this.arms[0].rotation.z = -0.9 * fly - 0.05;
    this.arms[1].rotation.z = 0.9 * fly + 0.05;
    this.head.rotation.x = Math.max(-0.7, Math.min(0.7, p.pitch * 0.7));
    this.group.position.set(p.x, p.y + (p.riding ? 0.66 : 0), p.z);
    this.group.rotation.y = p.yaw;
  }
}
