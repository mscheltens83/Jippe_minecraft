// De dino's van de Dinowereld (fase 5A): blokkig zoals de andere dieren, en allemaal vriendelijk.
// De voorkant is -z, de grond is y = 0.
import { box, part } from '../models.js';

const EYE = '#1f252a', WHITE = '#fffdf5';

// Twee oogjes op een kop (x = halve breedte tussen de ogen)
function eyes(x, y, z, size = 0.1) {
  return [-x, x].flatMap((ex) => [box(size, size, 0.03, WHITE, ex, y, z), box(size * 0.55, size * 0.6, 0.02, EYE, ex, y, z - 0.02)]);
}
// Poten: een kolom met een donkere voet
function leg(w, h, color, foot, x, z) {
  return part([box(w, h, w, color, x, h / 2, z), box(w + 0.06, 0.14, w + 0.12, foot, x, 0.07, z - 0.03)], x, h, z);
}
// Een staart uit stukken die steeds dunner worden
function tail(color, y, z, len, thick, n = 3, extra = []) {
  const geos = [...extra];
  let zz = z;
  for (let i = 0; i < n; i++) {
    const t = thick * (1 - i * 0.28), l = len / n;
    geos.push(box(t, t, l, color, 0, y - i * 0.08, zz + l / 2));
    zz += l;
  }
  return part(geos, 0, y, z);
}
// Zadel op de rug (zichtbaar als het dier tam is)
function saddle(w, y, z, d = 0.7) {
  const s = part([box(w, 0.14, d, '#7a4b2a', 0, y, z), box(w + 0.04, 0.08, 0.12, '#c99a3a', 0, y + 0.02, z - d / 2)], 0, y, z);
  s.visible = false;
  return s;
}

export function buildTrex() {
  const g = '#5f8f3e', belly = '#d8c58a';
  const legs = [-1, 1].map((s) => leg(0.42, 1.35, g, '#3f6528', s * 0.38, 0.35));
  const body = part([box(1.15, 1.15, 1.9, g, 0, 1.95, 0.15), box(0.9, 0.7, 1.4, belly, 0, 1.6, 0.05),
    ...[-1, 1].map((s) => box(0.14, 0.42, 0.14, g, s * 0.45, 1.75, -0.7))], 0, 1.95, 0); // armpjes
  const head = part([box(0.85, 0.75, 1.25, g, 0, 2.95, -1.25), box(0.75, 0.12, 0.2, WHITE, 0, 2.62, -1.8),
    ...eyes(0.3, 3.15, -1.88, 0.12), box(0.5, 0.1, 0.1, '#3f6528', 0, 3.35, -1.2)], 0, 2.7, -0.7);
  const jaw = part([box(0.75, 0.22, 1.05, belly, 0, 2.45, -1.25), box(0.65, 0.1, 0.18, WHITE, 0, 2.6, -1.68)], 0, 2.5, -0.75);
  const t = tail(g, 2.0, 1.05, 2.6, 0.75);
  const s = saddle(0.95, 2.6, 0.2);
  return { parts: [body, head, jaw, t, s], body, head, jaw, tail: t, saddle: s, legs, pattern: [1, -1] };
}

export function buildBrachio() {
  const c = '#8a9aa8', dark = '#6c7c8a';
  const legs = [[-0.5, -0.8], [0.5, -0.8], [-0.5, 0.8], [0.5, 0.8]].map(([x, z]) => leg(0.45, 1.65, c, dark, x, z));
  const body = part([box(1.5, 1.4, 2.6, c, 0, 2.3, 0), box(1.2, 0.2, 2.2, '#b9c4cc', 0, 1.55, 0)], 0, 2.3, 0);
  const neck = part([box(0.55, 2.8, 0.55, c, 0, 4.0, -1.35)], 0, 2.7, -1.2);
  const head = part([box(0.62, 0.55, 0.95, c, 0, 5.55, -1.65), ...eyes(0.22, 5.68, -2.13, 0.1), box(0.4, 0.12, 0.3, dark, 0, 5.85, -1.5)], 0, 5.4, -1.35);
  head.position.sub(neck.position); neck.add(head);
  const t = tail(c, 2.5, 1.3, 2.8, 0.6, 4);
  const s = saddle(1.05, 3.08, 0.1, 0.9);
  return { parts: [body, neck, t, s], body, neck, head, tail: t, saddle: s, legs, pattern: [1, -1, -1, 1] };
}

export function buildTriceratops() {
  const c = '#b0703c', frill = '#d9a441', horn = '#f4ead2';
  const legs = [[-0.42, -0.6], [0.42, -0.6], [-0.42, 0.65], [0.42, 0.65]].map(([x, z]) => leg(0.36, 0.72, c, '#7c4c26', x, z));
  const body = part([box(1.3, 1.05, 2.1, c, 0, 1.25, 0.1)], 0, 1.25, 0);
  const head = part([box(0.95, 0.75, 0.95, c, 0, 1.3, -1.35), box(1.6, 1.15, 0.18, frill, 0, 1.8, -0.9),
    ...[-1, 1].map((s) => box(0.12, 0.12, 0.75, horn, s * 0.28, 1.72, -2.0)), box(0.12, 0.2, 0.25, horn, 0, 1.25, -1.9),
    ...eyes(0.3, 1.45, -1.84, 0.1)], 0, 1.3, -0.9);
  const t = tail(c, 1.3, 1.15, 1.4, 0.5);
  const s = saddle(1.05, 1.85, 0.2);
  return { parts: [body, head, t, s], body, head, tail: t, saddle: s, legs, pattern: [1, -1, -1, 1] };
}

export function buildStegosaurus() {
  const c = '#7d9a4a', plate = '#c2603a';
  const legs = [[-0.4, -0.75, 0.6], [0.4, -0.75, 0.6], [-0.4, 0.7, 0.85], [0.4, 0.7, 0.85]].map(([x, z, h]) => leg(0.34, h, c, '#55692f', x, z));
  const plates = [];
  for (let i = 0; i < 6; i++) {
    const z = -0.9 + i * 0.4, h = 0.45 + Math.sin(i / 5 * Math.PI) * 0.35;
    plates.push(box(0.12, h, 0.36, plate, (i % 2 ? 1 : -1) * 0.13, 1.85 + h / 2, z));
  }
  const body = part([box(1.1, 0.95, 2.4, c, 0, 1.35, 0), ...plates], 0, 1.35, 0);
  const head = part([box(0.45, 0.4, 0.65, c, 0, 0.95, -1.6), ...eyes(0.15, 1.04, -1.94, 0.08)], 0, 1.0, -1.2);
  const t = tail(c, 1.35, 1.2, 1.8, 0.5, 3, [-1, 1].map((s) => box(0.4, 0.08, 0.08, plate, s * 0.25, 1.15, 2.7))); // stekels
  return { parts: [body, head, t], body, head, tail: t, legs, pattern: [1, -1, -1, 1] };
}

export function buildParasaur() {
  const c = '#4f8fb0', stripe = '#f0c84a';
  const legs = [-1, 1].map((s) => leg(0.3, 1.0, c, '#355f77', s * 0.28, 0.3));
  const stripes = [-0.5, -0.1, 0.3, 0.7].map((z) => box(0.92, 0.08, 0.12, stripe, 0, 2.05, z));
  const body = part([box(0.9, 1.0, 1.8, c, 0, 1.55, 0.1), ...stripes, ...[-1, 1].map((s) => box(0.12, 0.45, 0.12, c, s * 0.38, 1.3, -0.65))], 0, 1.55, 0);
  const head = part([box(0.38, 0.75, 0.4, c, 0, 2.25, -0.85), box(0.5, 0.45, 0.8, c, 0, 2.6, -1.2),
    box(0.16, 0.16, 1.1, '#e0623a', 0, 2.95, -0.7), ...eyes(0.18, 2.72, -1.61, 0.09), box(0.36, 0.1, 0.2, '#e8d9a8', 0, 2.45, -1.55)], 0, 2.0, -0.7);
  const t = tail(c, 1.6, 1.0, 1.8, 0.5);
  return { parts: [body, head, t], body, head, tail: t, legs, pattern: [1, -1] };
}

export function buildPteranodon() {
  const c = '#c8a06a', wing = '#a36a3c';
  const body = part([box(0.36, 0.36, 1.0, c, 0, 0.62, 0)], 0, 0.62, 0);
  const head = part([box(0.26, 0.3, 0.5, c, 0, 0.82, -0.68), box(0.12, 0.12, 0.65, '#e8c27a', 0, 0.78, -1.2),
    box(0.08, 0.22, 0.6, wing, 0, 1.02, -0.3), ...eyes(0.1, 0.9, -0.94, 0.07)], 0, 0.75, -0.45);
  const wings = [-1, 1].map((s) => part([box(1.35, 0.06, 0.62, wing, s * 0.85, 0.7, -0.05), box(0.5, 0.05, 0.3, c, s * 1.55, 0.7, 0.05)], s * 0.18, 0.7, 0));
  const legs = [-1, 1].map((s) => part([box(0.08, 0.42, 0.08, '#7a5530', s * 0.12, 0.21, 0.25)], s * 0.12, 0.42, 0.25));
  return { parts: [body, head, ...wings], body, head, wings, legs, pattern: [1, -1] };
}

export function buildRaptor() {
  const c = '#8a6a4a', stripe = '#5a3f2a';
  const legs = [-1, 1].map((s) => leg(0.16, 0.5, c, '#4a3422', s * 0.15, 0.1));
  const body = part([box(0.45, 0.48, 0.9, c, 0, 0.76, 0), ...[-0.25, 0.05, 0.3].map((z) => box(0.47, 0.06, 0.1, stripe, 0, 1.0, z)),
    ...[-1, 1].map((s) => box(0.07, 0.25, 0.07, c, s * 0.2, 0.62, -0.42))], 0, 0.76, 0);
  const head = part([box(0.34, 0.32, 0.6, c, 0, 1.08, -0.66), ...eyes(0.12, 1.16, -0.97, 0.07), box(0.28, 0.06, 0.1, WHITE, 0, 0.96, -0.9)], 0, 1.0, -0.4);
  const t = tail(c, 0.82, 0.45, 1.0, 0.24);
  return { parts: [body, head, t], body, head, tail: t, legs, pattern: [1, -1] };
}
