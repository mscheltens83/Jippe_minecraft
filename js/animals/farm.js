// De oorspronkelijke boerderijdieren; de vormen blijven hetzelfde.
import { box, part } from '../models.js';

function eyes(y, z, spread, size = 0.1) {
  const out = [];
  for (const x of [-spread, spread]) {
    out.push(box(size, size, 0.02, '#ffffff', x, y, z));
    out.push(box(size * 0.55, size * 0.55, 0.02, '#1b1b1b', x, y - size * 0.1, z - 0.012));
  }
  return out;
}

function legs(w, h, color, xs, zs, extra) {
  const out = [];
  for (const x of xs) for (const z of zs) {
    const geos = [box(w, h, w, color, x, h / 2, z)];
    if (extra) geos.push(extra(x, z));
    out.push(part(geos, x, h, z));
  }
  return out;
}

export function buildPig() {
  const PINK = '#f4a7b6', DARK = '#dd8196';
  const body = part([box(0.6, 0.5, 0.9, PINK, 0, 0.55, 0)], 0, 0.55, 0);
  const head = part([
    box(0.5, 0.46, 0.44, PINK, 0, 0.72, -0.62),
    box(0.26, 0.16, 0.06, DARK, 0, 0.66, -0.87),
    box(0.05, 0.06, 0.02, '#8a3b4c', -0.06, 0.66, -0.905),
    box(0.05, 0.06, 0.02, '#8a3b4c', 0.06, 0.66, -0.905),
    ...eyes(0.8, -0.845, 0.13),
  ], 0, 0.62, -0.42);
  return { parts: [body, head], head, legs: legs(0.18, 0.3, DARK, [-0.18, 0.18], [-0.3, 0.3]), pattern: [1, -1, -1, 1] };
}

export function buildSheep() {
  const WOOL = '#f4f2ea', FACE = '#8c8c8c', LEG = '#777777';
  const body = part([box(0.72, 0.62, 1.0, WOOL, 0, 0.78, 0)], 0, 0.78, 0);
  const head = part([
    box(0.38, 0.38, 0.36, FACE, 0, 0.95, -0.62),
    box(0.44, 0.14, 0.32, WOOL, 0, 1.17, -0.6),
    box(0.14, 0.06, 0.02, '#555555', 0, 0.86, -0.805),
    ...eyes(1.0, -0.805, 0.1),
  ], 0, 0.9, -0.45);
  return { parts: [body, head], head, legs: legs(0.16, 0.47, LEG, [-0.2, 0.2], [-0.32, 0.32]), pattern: [1, -1, -1, 1] };
}

export function buildChicken() {
  const WHITE = '#fbfbf7', YEL = '#f2b233', RED = '#d9342b';
  const body = part([
    box(0.36, 0.34, 0.46, WHITE, 0, 0.44, 0.02),
    box(0.2, 0.2, 0.1, WHITE, 0, 0.6, 0.28),
  ], 0, 0.44, 0);
  const head = part([
    box(0.24, 0.3, 0.2, WHITE, 0, 0.74, -0.2),
    box(0.12, 0.08, 0.1, YEL, 0, 0.74, -0.35),
    box(0.08, 0.1, 0.04, RED, 0, 0.65, -0.32),
    box(0.06, 0.08, 0.12, RED, 0, 0.93, -0.2),
    ...eyes(0.8, -0.305, 0.08, 0.07),
  ], 0, 0.6, -0.15);
  const wings = [-0.21, 0.21].map((x) => part([box(0.06, 0.22, 0.3, '#ececec', x, 0.46, 0.02)], x, 0.56, 0.02));
  const lg = legs(0.06, 0.27, YEL, [-0.08, 0.08], [0.02], (x, z) => box(0.12, 0.03, 0.14, YEL, x, 0.015, z - 0.03));
  return { parts: [body, head, ...wings], head, wings, legs: lg, pattern: [1, -1] };
}
