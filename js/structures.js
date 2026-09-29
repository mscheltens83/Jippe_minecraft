// Bouwwerken voor nieuwe werelden én stempels. Alles wordt één keer bij het maken gebouwd.
import { AIR, B } from './blocks.js';

export function structureCells(kind, small = false) {
  const cells = new Map();
  const put = (x, y, z, id) => cells.set(x + ',' + y + ',' + z, [x, y, z, id]);
  if (kind === 'pyramid' || kind === 'temple') {
    const rad = kind === 'temple' || small ? 4 : 7;
    const block = kind === 'temple' ? B.MOSSY_COBBLE : B.SANDSTONE;
    for (let y = -1; y <= rad; y++) {
      const r = rad - Math.max(0, y);
      for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) put(x, y, z, block);
    }
    // Een gang van twee blokken hoog, met een kamertje waar je zelf in kunt lopen.
    for (let z = -rad; z <= 0; z++) for (let y = 0; y < 2; y++) put(0, y, z, AIR);
    for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) for (let y = 0; y < 3; y++) put(x, y, z, AIR);
    put(0, 0, 1, B.TREASURE);
    put(0, 2, 1, B.LAMP);
    if (kind === 'pyramid') {
      for (const x of [-1, 1]) for (let y = 0; y <= 1; y++) put(x, y, -rad, B.CARVED_SANDSTONE);
    }
  } else if (kind === 'igloo') {
    for (let y = -1; y <= 3; y++) {
      const r = y < 2 ? 3 : y === 2 ? 2 : 1;
      for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) {
        const d = Math.hypot(x, z);
        if (d > r + 0.35) continue;
        put(x, y, z, y < 0 || y === 3 || d > r - 1.25 ? B.SNOW : AIR);
      }
    }
    // Kort tunneltje: sneeuw aan de zijkanten en bovenop, open in het midden.
    for (let z = -5; z <= -2; z++) {
      put(0, -1, z, B.SNOW);
      for (const x of [-1, 1]) for (let y = 0; y <= 1; y++) put(x, y, z, B.SNOW);
      for (let x = -1; x <= 1; x++) put(x, 2, z, B.SNOW);
      for (let y = 0; y <= 1; y++) put(0, y, z, AIR);
    }
    put(1, 0, 1, B.WOOL_BLUE);
  } else if (kind === 'lionRock') {
    for (let x = -4; x <= 4; x++) for (let z = 0; z <= 5; z++) {
      const h = Math.abs(x) <= 2 && z >= 2 ? 6 : Math.abs(x) <= 3 ? 2 : 1;
      for (let y = -1; y <= h; y++) put(x, y, z, B.STONE);
    }
    // Het vlak steekt echt boven de grond uit. Rechts ligt een brede trap naar boven.
    for (let x = -2; x <= 2; x++) for (let z = -3; z <= 5; z++) put(x, 6, z, B.STONE);
    for (let z = -2; z <= 4; z++) for (let x = 3; x <= 4; x++) {
      for (let y = -1; y <= z + 2; y++) put(x, y, z, B.STONE);
    }
  }
  return [...cells.values()];
}

// Afmetingen inclusief ingang/helling; zo komen er geen bomen door een bouwwerk.
export function structureBounds(kind, small = false) {
  if (kind === 'igloo') return [-3, 3, -5, 3];
  if (kind === 'lionRock') return [-4, 4, -3, 5];
  const r = kind === 'temple' || small ? 4 : 7;
  return [-r, r, -r, r];
}

export function generateStructures(w, heights, width, depth, r) {
  const reserved = new Uint8Array(width * depth), palms = [], landmarks = [];
  const cx = width / 2, cz = depth / 2;
  const pad = (x, z, bounds, base, block) => {
    const [x0, x1, z0, z1] = bounds;
    for (let dx = x0 - 1; dx <= x1 + 1; dx++) for (let dz = z0 - 1; dz <= z1 + 1; dz++) {
      const px = x + dx, pz = z + dz;
      if (px < 1 || pz < 1 || px >= width - 1 || pz >= depth - 1) continue;
      if (Math.hypot(px - cx, pz - cz) <= 8) continue;
      const i = px + pz * width, old = heights[i];
      for (let y = Math.min(old, base); y <= Math.max(old, base, 10); y++) w.set(px, y, pz, y <= base ? block : AIR);
      heights[i] = base;
      reserved[i] = 1;
    }
  };
  const build = (kind, dx, dz) => {
    const x = cx + dx, z = cz + dz;
    const base = Math.max(11, heights[x + z * width]);
    const block = kind === 'igloo' ? B.SNOW : kind === 'pyramid' ? B.SANDSTONE : kind === 'temple' ? B.MOSSY_COBBLE : B.STONE;
    pad(x, z, structureBounds(kind), base, block);
    for (const [lx, ly, lz, id] of structureCells(kind)) w.set(x + lx, base + 1 + ly, z + lz, id);
    landmarks.push({ kind, x, y: base + 1, z });
  };
  const pond = (kind, dx, dz) => {
    const x = cx + dx, z = cz + dz;
    const radius = kind === 'oasis' ? 3 + Math.floor(r() * 3) : 5 + Math.floor(r() * 3);
    const base = Math.max(12, Math.min(15, heights[x + z * width]));
    const bank = kind === 'oasis' ? B.GRASS : B.MUD;
    pad(x, z, [-radius - 2, radius + 2, -radius - 2, radius + 2], base, kind === 'oasis' ? B.SAND : B.RED_DIRT);
    for (let dx = -radius - 2; dx <= radius + 2; dx++) for (let dz = -radius - 2; dz <= radius + 2; dz++) {
      const d = Math.hypot(dx, dz), px = x + dx, pz = z + dz;
      if (d > radius + 2) continue;
      if (d < radius) {
        w.set(px, base - 3, pz, kind === 'oasis' ? B.SAND : B.MUD);
        w.set(px, base - 2, pz, B.WATER); w.set(px, base - 1, pz, B.WATER); w.set(px, base, pz, AIR);
        heights[px + pz * width] = base - 3;
      } else w.set(px, base, pz, bank);
    }
    if (kind === 'oasis') {
      const n = 3 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2;
        palms.push([x + Math.round(Math.cos(a) * (radius + 1)), base + 1, z + Math.round(Math.sin(a) * (radius + 1))]);
      }
    }
    landmarks.push({ kind, x, y: base, z, radius });
  };
  if (w.type === 'jungle') build('temple', 20, -15);
  else if (w.type === 'desert') {
    build('pyramid', -23, 8);
    pond('oasis', 20, 12); pond('oasis', -13, -23); pond('oasis', 13, -23);
  } else if (w.type === 'tundra') { build('igloo', 13, -8); build('igloo', -18, 12); }
  else if (w.type === 'savanna') { build('lionRock', 15, -5); pond('wateringHole', -17, 9); }
  else if (w.type === 'adventure') {
    build('temple', -21, -21); build('igloo', 20, -20);
    build('pyramid', -22, 21); build('lionRock', 20, 20);
    pond('oasis', -24, 5); pond('wateringHole', 27, 6);
  }
  return { reserved, palms, landmarks };
}
