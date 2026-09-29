// De grote savannedieren en het kleine stokstaartje, met bewegende oren en snoeten.
import { box, part } from '../models.js';

function face(y, z, spread, size = 0.1) {
  return [-spread, spread].flatMap((x) => [box(size, size, 0.025, '#fffdf5', x, y, z), box(size * 0.55, size * 0.6, 0.02, '#252326', x, y, z - 0.02)]);
}
function feet(w, h, color, xs, zs, hoof = color) {
  return xs.flatMap((x) => zs.map((z) => part([box(w, h, w, color, x, h / 2, z), box(w + 0.04, 0.15, w + 0.08, hoof, x, 0.075, z)], x, h, z)));
}

export function buildElephant() {
  const grey = '#a0a4aa';
  const body = part([box(1.5, 1.24, 1.9, grey, 0, 1.3, 0)], 0, 1.3, 0);
  const head = part([box(0.9, 0.88, 0.8, grey, 0, 1.67, -1.1), ...face(1.8, -1.515, 0.27, 0.14),
    box(0.11, 0.11, 0.5, '#fff1d1', -0.34, 1.31, -1.5), box(0.11, 0.11, 0.5, '#fff1d1', 0.34, 1.31, -1.5)], 0, 1.55, -0.85);
  const ears = [-1, 1].map((s) => part([box(0.55, 0.94, 0.14, grey, s * 0.74, 1.7, -1.08), box(0.35, 0.65, 0.025, '#beadb0', s * 0.74, 1.7, -1.165)], s * 0.47, 1.7, -1.08));
  const trunk = [];
  for (let i = 0; i < 4; i++) {
    const segment = part([box(0.25 - i * 0.025, 0.31, 0.27 - i * 0.025, grey, 0, -0.15, 0)], 0, 0, 0);
    segment.position.set(0, i ? -0.27 : 1.5, i ? 0 : -1.53);
    if (i) trunk[i - 1].add(segment);
    trunk.push(segment);
  }
  const tail = part([box(0.1, 0.5, 0.1, '#787e85', 0, 1.02, 1.03)], 0, 1.3, 1.03);
  return { parts: [body, head, ...ears, trunk[0], tail], body, head, ears, trunk, tail,
    legs: feet(0.35, 0.76, grey, [-0.5, 0.5], [-0.61, 0.61], '#c9cace'), pattern: [1, -1, -1, 1] };
}

export function buildGiraffe() {
  const yellow = '#e6c469', brown = '#a36c35';
  const patches = (w, h, d, cx, cy, cz, rows, cols) => {
    const geos = [box(w, h, d, yellow, cx, cy, cz)];
    for (const s of [-1, 1]) for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      geos.push(box(0.025, h / rows * 0.5, d / cols * 0.55, brown, cx + s * (w / 2 + 0.008), cy - h / 2 + (row + 0.5) * h / rows, cz - d / 2 + (col + 0.5) * d / cols));
    }
    return geos;
  };
  const body = part(patches(0.76, 0.7, 1.36, 0, 1.45, 0, 2, 5), 0, 1.45, 0);
  const neck = part(patches(0.33, 1.65, 0.38, 0, 2.45, -0.56, 6, 2), 0, 1.65, -0.56);
  const head = part([box(0.42, 0.3, 0.65, yellow, 0, 3.21, -0.77), ...face(3.27, -1.11, 0.115),
    box(0.06, 0.2, 0.06, brown, -0.13, 3.45, -0.62), box(0.06, 0.2, 0.06, brown, 0.13, 3.45, -0.62)], 0, 3.2, -0.55);
  // De kop en oren draaien mee met de lange nek.
  head.position.sub(neck.position); neck.add(head);
  const ears = [-1, 1].map((s) => part([box(0.22, 0.1, 0.14, yellow, s * 0.28, 0.12, 0)], s * 0.2, 0.12, 0));
  head.add(...ears);
  const tail = part([box(0.08, 0.62, 0.08, yellow, 0, 1.32, 0.76), box(0.15, 0.18, 0.12, brown, 0, 1.01, 0.76)], 0, 1.64, 0.76);
  return { parts: [body, neck, tail], body, head, neck, ears, tail, legs: feet(0.16, 1.2, yellow, [-0.24, 0.24], [-0.43, 0.43], brown), pattern: [1, -1, -1, 1] };
}

export function buildZebra() {
  const white = '#f5f3ed', black = '#30313b';
  const geos = [box(0.67, 0.7, 1.35, white, 0, 0.99, 0)];
  for (let z = -0.54; z < 0.6; z += 0.18) {
    geos.push(box(0.7, 0.04, 0.065, black, 0, 1.35, z));
    for (const s of [-1, 1]) geos.push(box(0.025, 0.69, 0.065, black, s * 0.343, 0.99, z));
  }
  const body = part(geos, 0, 0.99, 0);
  const head = part([box(0.34, 0.68, 0.4, white, 0, 1.53, -0.63), box(0.4, 0.34, 0.58, white, 0, 1.74, -0.88),
    box(0.32, 0.19, 0.14, black, 0, 1.65, -1.2), box(0.11, 0.66, 0.11, black, 0, 1.66, -0.4), ...face(1.8, -1.185, 0.12),
    ...[-1, 1].flatMap((s) => [box(0.11, 0.22, 0.1, white, s * 0.13, 2.0, -0.66), box(0.02, 0.045, 0.37, black, s * 0.176, 1.49, -0.63), box(0.02, 0.055, 0.5, black, s * 0.208, 1.88, -0.88)])], 0, 1.26, -0.46);
  const legs = feet(0.15, 0.68, white, [-0.23, 0.23], [-0.43, 0.43], black);
  for (const leg of legs) {
    const stripes = part([box(0.17, 0.055, 0.17, black, 0, -0.2, 0), box(0.17, 0.055, 0.17, black, 0, -0.39, 0)], 0, 0, 0);
    leg.add(stripes);
  }
  const tail = part([box(0.08, 0.5, 0.08, white, 0, 1.03, 0.77), box(0.14, 0.18, 0.12, black, 0, 0.81, 0.77)], 0, 1.28, 0.77);
  return { parts: [body, head, tail], body, head, tail, legs, pattern: [1, -1, -1, 1] };
}

export function buildHippo() {
  const purple = '#9d91aa';
  const body = part([box(1.23, 0.9, 1.7, purple, 0, 0.75, 0)], 0, 0.75, 0);
  const head = part([box(0.9, 0.53, 0.7, purple, 0, 0.93, -1.0), box(1.0, 0.21, 0.25, '#b3a2b8', 0, 0.9, -1.38),
    ...face(1.17, -1.34, 0.3, 0.12), ...[-1, 1].map((s) => box(0.16, 0.17, 0.13, purple, s * 0.4, 1.24, -0.83)),
    ...[-0.27, 0.27].map((x) => box(0.1, 0.035, 0.09, '#6b5971', x, 1.02, -1.43))], 0, 0.9, -0.7);
  const jaw = part([box(0.98, 0.2, 0.74, purple, 0, 0.64, -1.06), box(0.8, 0.025, 0.65, '#e9b1bb', 0, 0.75, -1.07),
    ...[-0.32, 0.32].map((x) => box(0.12, 0.16, 0.11, '#fff3d6', x, 0.81, -1.33))], 0, 0.74, -0.73);
  const tail = part([box(0.09, 0.26, 0.09, '#796e85', 0, 0.72, 0.95)], 0, 0.85, 0.95);
  return { parts: [body, head, jaw, tail], body, head, jaw, tail, legs: feet(0.3, 0.4, purple, [-0.4, 0.4], [-0.54, 0.54]), pattern: [1, -1, -1, 1] };
}

export function buildMeerkat() {
  const tan = '#d3b48a', dark = '#6e523c';
  const body = part([box(0.28, 0.52, 0.26, tan, 0, 0.43, 0), box(0.22, 0.36, 0.025, '#f0d9b3', 0, 0.43, -0.145),
    ...[-1, 1].map((s) => box(0.07, 0.25, 0.08, tan, s * 0.17, 0.42, -0.055))], 0, 0.2, 0);
  const head = part([box(0.3, 0.26, 0.25, tan, 0, 0.82, -0.02), box(0.16, 0.08, 0.14, dark, 0, 0.76, -0.19),
    ...[-1, 1].flatMap((s) => [box(0.09, 0.09, 0.06, dark, s * 0.15, 0.95, -0.015), box(0.1, 0.09, 0.025, dark, s * 0.085, 0.84, -0.156), box(0.04, 0.045, 0.02, '#ffffff', s * 0.085, 0.845, -0.173)])], 0, 0.7, 0);
  const tail = part([box(0.06, 0.06, 0.5, dark, 0, 0.12, 0.24)], 0, 0.15, 0.04);
  return { parts: [body, head, tail], body, head, tail, legs: feet(0.07, 0.18, dark, [-0.085, 0.085], [0]), pattern: [1, -1] };
}
