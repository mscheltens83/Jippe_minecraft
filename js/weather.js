// Zacht weer rond Jippe: veel vlokjes in één getekend object, zonder plaatjes.
import * as THREE from '../lib/three.module.min.js';
import { BIOMES } from './biomes.js';

export class Weather {
  constructor(scene, sounds) {
    this.sounds = sounds;
    this.kind = null; this.ambience = null; this.ambientTimer = 3;
    this.snowPos = Array.from({ length: 150 }, () => null);
    this.leafPos = Array.from({ length: 24 }, () => null);
    this.dummy = new THREE.Object3D();
    this.snow = new THREE.InstancedMesh(new THREE.BoxGeometry(.065, .065, .065),
      new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .84, depthWrite: false }), 150);
    this.leaves = new THREE.InstancedMesh(new THREE.BoxGeometry(.17, .025, .11),
      new THREE.MeshBasicMaterial({ color: '#86bb55', transparent: true, opacity: .82, depthWrite: false }), 24);
    this.snow.frustumCulled = false; this.leaves.frustumCulled = false;
    this.snow.visible = false; this.leaves.visible = false;
    scene.add(this.snow, this.leaves);
  }

  setBiome(biome) {
    const recipe = BIOMES[biome] || BIOMES.island;
    this.kind = recipe.weer;
    this.ambience = recipe.achtergrond || null;
    this.snow.visible = this.kind === 'sneeuw';
    this.leaves.visible = this.kind === 'blaadjes';
  }

  update(dt, world, player, quality, playing) {
    if (!playing || dt <= 0) return;
    if (this.kind === 'sneeuw') this.fall(this.snow, this.snowPos, quality < 1 ? 75 : 150,
      dt, world, player, .95);
    else if (this.kind === 'blaadjes') this.fall(this.leaves, this.leafPos, 24,
      dt, world, player, .42);
    this.background(dt);
  }

  fall(mesh, positions, count, dt, world, player, speed) {
    mesh.count = count;
    const { dummy } = this;
    for (let i = 0; i < count; i++) {
      let p = positions[i];
      if (!p || Math.abs(p.x - player.x) > 23 || Math.abs(p.z - player.z) > 23) {
        p = positions[i] = { x: player.x + (Math.random() - .5) * 42,
          y: player.y + Math.random() * 18, z: player.z + (Math.random() - .5) * 42,
          phase: Math.random() * Math.PI * 2 };
      }
      p.y -= dt * (speed + (i % 5) * .08);
      p.phase += dt * 1.8;
      p.x += Math.sin(p.phase) * dt * .17;
      const cellX = Math.floor(p.x), cellZ = Math.floor(p.z);
      if (p.cellX !== cellX || p.cellZ !== cellZ) {
        p.cellX = cellX; p.cellZ = cellZ; p.ground = world.surfaceY(cellX, cellZ);
      }
      if (p.y < Math.max(player.y - 6, p.ground + 1)) {
        p.y = player.y + 13 + Math.random() * 8;
        p.x = player.x + (Math.random() - .5) * 42;
        p.z = player.z + (Math.random() - .5) * 42;
        p.cellX = null; p.cellZ = null;
      }
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(0, p.phase * .3, mesh === this.leaves ? Math.sin(p.phase) * .5 : 0);
      dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  background(dt) {
    if (!this.ambience || !this.sounds.ok() || (this.ambientTimer -= dt) > 0) return;
    this.ambientTimer = 2.5 + Math.random() * 3;
    if (this.ambience === 'vogels') {
      this.sounds.tone('sine', 1100, 1550, .09, .035);
      this.sounds.tone('sine', 1250, 1750, .08, .025, .15);
    } else if (this.ambience === 'wind') {
      this.sounds.hiss('lowpass', 420, .5, .55, .045);
    } else if (this.ambience === 'krekels') {
      for (let i = 0; i < 3; i++) this.sounds.tone('sine', 2350, 2500, .055, .026, i * .12);
    }
  }
}
