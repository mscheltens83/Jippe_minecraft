// Blokkige figuurtjes (dieren en het poppetje) bouwen uit gekleurde blokjes.
// De kleuren krijgen dezelfde schaduw per kant als de blokken in de wereld.

import * as THREE from '../lib/three.module.min.js';

export const MODEL_MAT = new THREE.MeshBasicMaterial({ vertexColors: true });

// Volgorde van de zijkanten in BoxGeometry: +x, -x, +y, -y, +z, -z
const SHADES = [0.8, 0.8, 1.0, 0.55, 0.68, 0.68].map((s) => Math.pow(s, 2.2));

// Eén blokje: breedte w, hoogte h, diepte d, met het midden op (x, y, z)
export function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  const c = new THREE.Color(color);
  const cols = new Float32Array(24 * 3);
  for (let f = 0; f < 6; f++) {
    for (let v = 0; v < 4; v++) {
      const i = (f * 4 + v) * 3;
      cols[i] = c.r * SHADES[f]; cols[i + 1] = c.g * SHADES[f]; cols[i + 2] = c.b * SHADES[f];
    }
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  return g;
}

// Meerdere blokjes samenvoegen tot één vorm (minder werk voor de iPad)
export function merge(geos) {
  let nv = 0, ni = 0;
  for (const g of geos) { nv += g.attributes.position.count; ni += g.index.count; }
  const pos = new Float32Array(nv * 3), col = new Float32Array(nv * 3), idx = new Uint16Array(ni);
  let ov = 0, oi = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array, ov * 3);
    col.set(g.attributes.color.array, ov * 3);
    const src = g.index.array;
    for (let i = 0; i < src.length; i++) idx[oi + i] = src[i] + ov;
    ov += g.attributes.position.count;
    oi += src.length;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}

// Een onderdeel dat kan draaien (poot, arm, hoofd) rond een scharnierpunt
export function part(geos, pivotX, pivotY, pivotZ) {
  const g = merge(Array.isArray(geos) ? geos : [geos]);
  g.translate(-pivotX, -pivotY, -pivotZ);
  const m = new THREE.Mesh(g, MODEL_MAT);
  m.position.set(pivotX, pivotY, pivotZ);
  return m;
}

// Elk dier krijgt eigen scharnieren, maar deelt de vormen met zijn soortgenoten.
// De cache bezit de geometrie: een dier weghalen mag die dus niet opruimen.
const MODEL_CACHE = new Map();
export function cachedModel(key, build) {
  if (!MODEL_CACHE.has(key)) MODEL_CACHE.set(key, build());
  const source = MODEL_CACHE.get(key), copies = new Map();
  const roots = [...source.parts, ...source.legs];
  const pair = (a, b) => {
    copies.set(a, b);
    a.children.forEach((child, i) => pair(child, b.children[i]));
  };
  for (const root of roots) pair(root, root.clone());
  const result = {};
  for (const [name, value] of Object.entries(source)) {
    result[name] = Array.isArray(value) ? value.map((v) => copies.get(v) || v) : copies.get(value) || value;
  }
  return result;
}
