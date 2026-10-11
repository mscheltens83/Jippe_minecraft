// De hand met het gekozen blok, rechtsonder in beeld (alleen als je door je eigen ogen kijkt).
// Beweegt zacht mee met lopen en zwaait bij bouwen en slopen. Een stempel, dier, plantje of
// gereedschap houd je als plaatje vast.

import * as THREE from '../lib/three.module.min.js';
import { BLOCKS, isSpecial } from './blocks.js';

const SKIN = '#f1c7a0';

export class Hand {
  constructor(camera, atlas, icons) {
    this.atlas = atlas;
    this.icons = icons;          // plaatjes uit de kist (data-URL per id)
    this.group = new THREE.Group();
    this.group.position.set(0.55, -0.34, -0.9);
    this.group.rotation.set(0.15, -0.55, 0);
    camera.add(this.group);
    this.color = new THREE.Color(1, 1, 1);
    this.materials = [];         // alle materialen van de hand (krijgen samen het licht van de plek)
    // de arm (een blokje huid, schuin vanaf de rand van het scherm)
    this.arm = this.mesh(new THREE.BoxGeometry(0.12, 0.12, 0.45), this.material({ color: SKIN }));
    this.arm.position.set(0.07, -0.1, 0.2);
    this.group.add(this.arm);
    this.holder = new THREE.Group();
    this.group.add(this.holder);
    this.cache = new Map();      // id -> mesh van het blok in de hand
    this.tileMats = new Map();
    this.item = null;
    this.phase = 0; this.swingT = 0; this.bob = 0;
  }

  material(opts) {
    const m = new THREE.MeshBasicMaterial({ ...opts, depthTest: false, depthWrite: false, fog: false, transparent: !!opts.map });
    this.materials.push(m);
    return m;
  }

  mesh(geo, mat) {
    const m = new THREE.Mesh(geo, mat);
    m.renderOrder = 20; // altijd bovenop, ook als je tegen een muur staat
    m.frustumCulled = false;
    return m;
  }

  // Materiaal met één tegel uit de atlas
  tile(index) {
    let mat = this.tileMats.get(index);
    if (mat) return mat;
    const c = document.createElement('canvas');
    c.width = c.height = 16;
    c.getContext('2d').drawImage(this.atlas.canvas, (index % 16) * 16, Math.floor(index / 16) * 16, 16, 16, 0, 0, 16, 16);
    const t = new THREE.CanvasTexture(c);
    t.magFilter = t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
    mat = this.material({ map: t, alphaTest: 0.5 });
    this.tileMats.set(index, mat);
    return mat;
  }

  build(id) {
    const b = BLOCKS[id];
    if (!isSpecial(id) && b && b.render !== 'cross' && !b.icon) {
      // een blokje met de echte tegels: [+x, -x, boven, onder, +z, -z]
      const t = this.atlas.faceTiles[id];
      const m = this.mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), [3, 4, 0, 1, 5, 6].map((k) => this.tile(t[k])));
      m.rotation.y = 0.75;
      return m;
    }
    // een plaatje (plantje, fakkel, stempel, dier, emmer, zaadjes)
    const tex = new THREE.Texture();
    const img = new Image();
    img.onload = () => { tex.image = img; tex.needsUpdate = true; };
    img.src = this.icons[id] || '';
    tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter;
    const m = this.mesh(new THREE.PlaneGeometry(0.22, 0.22), this.material({ map: tex, alphaTest: 0.3, side: THREE.DoubleSide }));
    m.rotation.y = 0.5;
    return m;
  }

  setItem(id) {
    if (id === this.item) return;
    this.item = id;
    this.holder.clear();
    if (id == null) return;
    if (!this.cache.has(id)) this.cache.set(id, this.build(id));
    this.holder.add(this.cache.get(id));
  }

  // Vooraf: een blokje en een plaatje in de hand zetten, zodat hun shaders bij het opstarten al
  // vertaald worden (anders hapert het spel als je voor het eerst op spelen tikt). Geeft een functie
  // die alles weer terugzet.
  prewarm(blockId, iconId) {
    const was = this.group.visible, item = this.item;
    this.group.visible = true;
    this.holder.clear();
    for (const id of [blockId, iconId]) {
      if (!this.cache.has(id)) this.cache.set(id, this.build(id));
      this.holder.add(this.cache.get(id));
    }
    return () => { this.holder.clear(); this.item = undefined; this.group.visible = was; this.setItem(item); };
  }

  // Zwaaien bij bouwen of slopen
  swing() { this.swingT = 1; }

  update(dt, player, visible, tint) {
    this.group.visible = visible;
    if (!visible) return;
    const speed = Math.hypot(player.vx, player.vz);
    const walking = player.onGround && speed > 0.5 && !player.flying;
    this.bob += ((walking ? 1 : 0) - this.bob) * Math.min(1, dt * 8);
    this.phase += dt * (5 + speed * 1.5);
    this.swingT = Math.max(0, this.swingT - dt * 4);
    const s = Math.sin(this.swingT * Math.PI);
    this.group.position.set(0.55 + Math.cos(this.phase) * 0.025 * this.bob, -0.34 + Math.abs(Math.sin(this.phase)) * 0.03 * this.bob - s * 0.08, -0.9 + s * 0.08);
    this.group.rotation.set(0.15 - s * 0.9, -0.55, s * 0.2);
    if (tint && !tint.equals(this.color)) {
      this.color.copy(tint);
      for (const m of this.materials) {
        if (m === this.arm.material) m.color.set(SKIN).multiply(tint);
        else m.color.copy(tint);
      }
    }
  }
}
