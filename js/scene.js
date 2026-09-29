// De 3D-scene: lucht, zon, wolken, zee rondom en de chunk-meshes.

import * as THREE from '../lib/three.module.min.js';
import { SX, SZ, SY, CHUNK, SEA } from './world.js';
import { buildChunk } from './mesher.js';
import { createCrackCanvases } from './textures.js';

const SKY = new THREE.Color('#9ad8ff');

export class GameScene {
  constructor(canvas, atlas) {
    const dpr = window.devicePixelRatio || 1;
    const touch = window.matchMedia?.('(pointer: coarse)').matches;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: dpr < 2 && !touch,
      powerPreference: 'high-performance',
    });
    // Op een tablet beginnen we iets minder scherp: dat scheelt veel rekenwerk
    // en je ziet het bij pixel-art nauwelijks. Is de iPad snel, dan gaat het vanzelf omhoog.
    this.maxPixelRatio = Math.min(dpr, 2);
    this.pixelRatio = touch ? Math.min(this.maxPixelRatio, 1.5) : this.maxPixelRatio;
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = SKY;
    this.scene.fog = new THREE.Fog(SKY, 45, 125);

    this.camera = new THREE.PerspectiveCamera(72, 1, 0.08, 400);
    this.camera.rotation.order = 'YXZ';

    const tex = new THREE.CanvasTexture(atlas.canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    this.atlas = atlas;

    this.materials = {
      solid: new THREE.MeshBasicMaterial({ map: tex, vertexColors: true }),
      cutout: new THREE.MeshBasicMaterial({ map: tex, vertexColors: true, alphaTest: 0.5, side: THREE.DoubleSide }),
      glass: new THREE.MeshBasicMaterial({ map: tex, vertexColors: true, transparent: true, depthWrite: false }),
      water: new THREE.MeshBasicMaterial({
        map: tex, vertexColors: true, transparent: true, opacity: 0.72, depthWrite: false, side: THREE.DoubleSide,
      }),
    };

    this.chunks = new Map();
    this.buildSky();
    this.buildSea();
    this.buildClouds();
    this.buildHighlight();
    this.buildCrack();
  }

  buildCrack() {
    this.crackTex = createCrackCanvases().map((c) => {
      const t = new THREE.CanvasTexture(c);
      t.magFilter = THREE.NearestFilter;
      t.minFilter = THREE.NearestFilter;
      t.generateMipmaps = false;
      return t;
    });
    this.crack = new THREE.Mesh(
      new THREE.BoxGeometry(1.01, 1.01, 1.01),
      new THREE.MeshBasicMaterial({
        map: this.crackTex[0], transparent: true, depthWrite: false,
        polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      }),
    );
    this.crack.visible = false;
    this.crack.renderOrder = 3;
    this.scene.add(this.crack);
  }

  // Alles wat later pas zichtbaar wordt alvast klaarzetten, zodat het spel dan niet even hapert
  precompile() {
    this.crack.visible = true;
    this.highlight.visible = true;
    this.renderer.compile(this.scene, this.camera);
    this.crack.visible = false;
    this.highlight.visible = false;
  }

  // Scheurtjes op het blok dat je aan het slopen bent (stage 0..3)
  showCrack(hit, stage) {
    if (!hit) { this.crack.visible = false; return; }
    this.crack.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
    this.crack.material.map = this.crackTex[Math.max(0, Math.min(3, stage))];
    this.crack.visible = true;
  }

  buildSky() {
    // Grote bol met een kleurverloop van diepblauw (boven) naar lichtblauw (horizon)
    const geo = new THREE.SphereGeometry(300, 24, 12);
    const colors = [];
    const top = new THREE.Color('#4aa3ec'), hor = new THREE.Color('#c9ecff');
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const h = Math.max(0, pos.getY(i) / 300);
      const c = hor.clone().lerp(top, Math.pow(h, 0.6));
      colors.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    this.sky = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    this.sky.renderOrder = -10;
    this.scene.add(this.sky);

    // Vierkante zon, net als in Minecraft
    const sun = this.sun = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshBasicMaterial({ color: '#fff4b0', fog: false, depthWrite: false }),
    );
    sun.position.set(120, 200, -140);
    sun.lookAt(0, 0, 0);
    this.sky.add(sun);
  }

  setBiome(biome, instant = false) {
    const air = biome.lucht;
    this.biomeTarget = {
      boven: new THREE.Color(air.boven), horizon: new THREE.Color(air.horizon),
      mist: new THREE.Color(air.mist), zon: new THREE.Color(air.zon),
      mistBegin: air.mistBegin, mistEind: air.mistEind, wolken: air.wolken,
    };
    if (!this.biomeCurrent || instant) {
      this.biomeCurrent = { ...this.biomeTarget };
      for (const key of ['boven', 'horizon', 'mist', 'zon']) this.biomeCurrent[key] = this.biomeTarget[key].clone();
      this.applyBiome();
      this.biomeAnimating = false;
    } else this.biomeAnimating = true;
  }

  // Zacht overgaan als je in Avontuur een ander gebied inloopt (ongeveer twee seconden).
  updateBiome(dt) {
    if (!this.biomeAnimating) return;
    const current = this.biomeCurrent, target = this.biomeTarget;
    const k = 1 - Math.exp(-dt * 2);
    let difference = 0;
    for (const key of ['boven', 'horizon', 'mist', 'zon']) {
      current[key].lerp(target[key], k);
      difference += Math.abs(current[key].r - target[key].r) + Math.abs(current[key].g - target[key].g) + Math.abs(current[key].b - target[key].b);
    }
    for (const key of ['mistBegin', 'mistEind', 'wolken']) {
      current[key] += (target[key] - current[key]) * k;
      difference += Math.abs(current[key] - target[key]);
    }
    this.applyBiome();
    if (difference < 0.001) this.biomeAnimating = false;
  }

  applyBiome() {
    const b = this.biomeCurrent;
    this.scene.background.copy(b.mist);
    this.scene.fog.color.copy(b.mist);
    this.scene.fog.near = b.mistBegin; this.scene.fog.far = b.mistEind;
    this.sun.material.color.copy(b.zon);
    this.clouds.count = Math.max(0, Math.min(this.cloudData.length, Math.round(b.wolken)));
    const positions = this.sky.geometry.attributes.position, colors = this.sky.geometry.attributes.color;
    const color = this.biomeColor || (this.biomeColor = new THREE.Color());
    for (let i = 0; i < positions.count; i++) {
      const h = Math.pow(Math.max(0, positions.getY(i) / 300), 0.6);
      color.copy(b.horizon).lerp(b.boven, h);
      colors.setXYZ(i, color.r, color.g, color.b);
    }
    colors.needsUpdate = true;
  }

  buildSea() {
    // Zee rondom het eiland: vier stroken, met een gat waar de wereld zelf ligt
    const group = new THREE.Group();
    const waterMat = new THREE.MeshBasicMaterial({ color: '#3d7fd8', transparent: true, opacity: 0.8, depthWrite: false });
    const sandMat = new THREE.MeshBasicMaterial({ color: '#b9a46e' });
    const R = 500;
    const strips = [
      [-R, -R, SX + R, 0], [-R, SZ, SX + R, SZ + R], [-R, 0, 0, SZ], [SX, 0, SX + R, SZ],
    ];
    for (const [x1, z1, x2, z2] of strips) {
      const w = x2 - x1, d = z2 - z1;
      const top = new THREE.Mesh(new THREE.PlaneGeometry(w, d), waterMat);
      top.rotation.x = -Math.PI / 2;
      top.position.set(x1 + w / 2, SEA + 0.875, z1 + d / 2);
      top.renderOrder = 2;
      group.add(top);
      const bottom = new THREE.Mesh(new THREE.PlaneGeometry(w, d), sandMat);
      bottom.rotation.x = -Math.PI / 2;
      bottom.position.set(x1 + w / 2, 5, z1 + d / 2);
      group.add(bottom);
    }
    this.scene.add(group);
  }

  buildClouds() {
    // Wolken: platte witte blokken die langzaam wegdrijven
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.88 });
    const count = 46;
    this.clouds = new THREE.InstancedMesh(geo, mat, count);
    this.cloudData = [];
    const m = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      const c = {
        x: Math.random() * 360 - 130,
        z: Math.random() * 360 - 130,
        w: 6 + Math.random() * 16,
        d: 5 + Math.random() * 12,
        y: SY + 8 + Math.random() * 4,
      };
      this.cloudData.push(c);
      m.makeScale(c.w, 2, c.d).setPosition(c.x, c.y, c.z);
      this.clouds.setMatrixAt(i, m);
    }
    this.scene.add(this.clouds);
  }

  updateClouds(dt) {
    const m = new THREE.Matrix4();
    this.cloudData.forEach((c, i) => {
      c.x += dt * 0.8;
      if (c.x > 230) c.x -= 360;
      m.makeScale(c.w, 2, c.d).setPosition(c.x, c.y, c.z);
      this.clouds.setMatrixAt(i, m);
    });
    this.clouds.instanceMatrix.needsUpdate = true;
  }

  buildHighlight() {
    const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.004, 1.004, 1.004));
    this.highlight = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#1b1b1b', transparent: true, opacity: 0.6 }));
    this.highlight.visible = false;
    this.scene.add(this.highlight);
  }

  showHighlight(hit) {
    if (!hit) { this.highlight.visible = false; return; }
    this.highlight.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
    this.highlight.visible = true;
  }

  // Bouw de chunks opnieuw die veranderd zijn (max `budget` per beeldje)
  updateChunks(world, budget = 4) {
    let done = 0;
    for (const key of world.dirtyChunks) {
      if (done >= budget) break;
      world.dirtyChunks.delete(key);
      const [cx, cz] = key.split(',').map(Number);
      this.rebuildChunk(world, cx, cz);
      done++;
    }
  }

  rebuildAll(world) {
    for (const key of world.dirtyChunks) {
      const [cx, cz] = key.split(',').map(Number);
      this.rebuildChunk(world, cx, cz);
    }
    world.dirtyChunks.clear();
  }

  rebuildChunk(world, cx, cz) {
    const key = cx + ',' + cz;
    const old = this.chunks.get(key);
    if (old) for (const m of old) { this.scene.remove(m); m.geometry.dispose(); }
    const data = buildChunk(world, this.atlas, cx, cz);
    const meshes = [];
    for (const kind of ['solid', 'cutout', 'glass', 'water']) {
      const d = data[kind];
      if (!d) continue;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(d.pos, 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(d.uv, 2));
      geo.setAttribute('color', new THREE.BufferAttribute(d.col, 3));
      geo.setIndex(new THREE.BufferAttribute(d.idx, 1));
      geo.boundingSphere = new THREE.Sphere(
        new THREE.Vector3(cx * CHUNK + CHUNK / 2, SY / 2, cz * CHUNK + CHUNK / 2), Math.hypot(CHUNK, SY, CHUNK) / 2 + 1,
      );
      const mesh = new THREE.Mesh(geo, this.materials[kind]);
      if (kind === 'water' || kind === 'glass') mesh.renderOrder = 1;
      this.scene.add(mesh);
      meshes.push(mesh);
    }
    this.chunks.set(key, meshes);
  }

  resize(w, h) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  setPixelRatio(r) {
    this.pixelRatio = r;
    this.renderer.setPixelRatio(r);
  }

  render() {
    this.sky.position.copy(this.camera.position);
    this.renderer.render(this.scene, this.camera);
  }
}
