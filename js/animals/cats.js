// Jippes favorieten: manen, vlekjes en strepen zijn echte gekleurde blokjes.
import { box, part } from '../models.js';

export function buildCat(type) {
  const lion = type === 'lion' || type === 'lioness', tiger = type === 'tiger';
  const color = lion ? '#d9a45a' : tiger ? '#e8872a' : '#e8c068';
  const dark = lion ? '#8a4b1f' : '#29231e', cream = '#fff0d2';
  const width = tiger ? 0.8 : lion ? 0.68 : 0.44;
  const legHeight = type === 'cheetah' ? 0.65 : 0.43;
  const cy = legHeight + 0.26, headY = cy + 0.23;
  const bodyGeos = [box(width, 0.52, 1.3, color, 0, cy, 0), box(width * 0.8, 0.1, 1.16, cream, 0, cy - 0.23, 0)];
  if (tiger) {
    for (let z = -0.48; z < 0.6; z += 0.22) {
      bodyGeos.push(box(width + 0.025, 0.055, 0.065, dark, 0, cy + 0.26, z));
      for (const side of [-1, 1]) bodyGeos.push(box(0.025, 0.38, 0.065, dark, side * (width / 2 + 0.005), cy + 0.06, z));
    }
  } else if (!lion) {
    for (const side of [-1, 1]) for (let row = 0; row < 3; row++) for (let i = 0; i < 6; i++) {
      bodyGeos.push(box(0.025, 0.06, 0.075, dark, side * (width / 2 + 0.005), cy - 0.13 + row * 0.15, -0.51 + i * 0.2 + (row % 2) * 0.05));
    }
    for (let i = 0; i < 6; i++) bodyGeos.push(box(0.07, 0.02, 0.07, dark, i % 2 ? 0.1 : -0.1, cy + 0.27, -0.5 + i * 0.19));
  }
  const body = part(bodyGeos, 0, cy, 0);
  const hw = lion ? 0.52 : tiger ? 0.58 : 0.4;
  const headGeos = [box(hw, 0.46, 0.5, color, 0, headY, -0.8)];
  if (type === 'lion') headGeos.push(box(0.86, 0.78, 0.48, dark, 0, headY - 0.015, -0.61));
  for (const side of [-1, 1]) {
    headGeos.push(box(0.14, 0.16, 0.13, color, side * hw * 0.4, headY + 0.28, -0.78));
    headGeos.push(box(0.08, 0.08, 0.025, '#7b4b3b', side * hw * 0.4, headY + 0.28, -0.856));
    headGeos.push(box(hw * 0.42, 0.18, 0.09, cream, side * hw * 0.22, headY - 0.13, -1.065));
    headGeos.push(box(0.105, 0.105, 0.025, '#ffffff', side * hw * 0.29, headY + 0.05, -1.06));
    headGeos.push(box(0.055, 0.06, 0.02, '#24201c', side * hw * 0.29, headY + 0.05, -1.08));
    if (!lion) headGeos.push(box(0.035, tiger ? 0.06 : 0.2, 0.025, dark, side * hw * 0.29, headY - 0.07, -1.08));
    if (tiger) for (let i = 0; i < 2; i++) headGeos.push(box(0.025, 0.055, 0.24, dark, side * (hw / 2 + 0.008), headY + i * 0.13, -0.8));
  }
  headGeos.push(box(0.14, 0.09, 0.065, '#5a3a2a', 0, headY - 0.07, -1.12));
  headGeos.push(box(0.12, 0.025, 0.02, '#5a3a2a', 0, headY - 0.19, -1.115));
  const head = part(headGeos, 0, headY - 0.14, -0.6);
  const legs = [];
  for (const x of [-width * 0.32, width * 0.32]) for (const z of [-0.43, 0.43]) {
    const geos = [box(0.16, legHeight, 0.16, color, x, legHeight / 2, z), box(0.2, 0.13, 0.27, cream, x, 0.065, z - 0.05)];
    if (!lion) for (let i = 0; i < 3; i++) geos.push(box(0.175, 0.045, tiger ? 0.18 : 0.055, dark, x, 0.2 + i * 0.12, z));
    legs.push(part(geos, x, legHeight, z));
  }
  const tailGeos = [box(0.1, 0.1, 0.64, color, 0, cy + 0.08, 0.92), box(0.1, 0.25, 0.1, color, 0, cy + 0.16, 1.2)];
  if (lion) tailGeos.push(box(0.19, 0.2, 0.17, dark, 0, cy + 0.3, 1.2));
  else for (let i = 0; i < 3; i++) tailGeos.push(box(0.115, 0.115, 0.06, dark, 0, cy + 0.08, 0.85 + i * 0.14));
  const tail = part(tailGeos, 0, cy + 0.08, 0.6);
  return { parts: [body, head, tail], body, head, tail, legs, pattern: [1, -1, -1, 1] };
}
