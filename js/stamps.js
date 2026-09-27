// Stempels: met één tik een huisje, boom, toren of brug neerzetten.
// Ze worden gebouwd vanaf het vakje waar je tikte, van je af gericht.

import { AIR, B, BLOCKS, DIRS, doorId } from './blocks.js';

// Geeft een lijst met veranderingen {x, y, z, from, to} terug (zodat "terug" ook werkt)
export function buildStamp(kind, world, ox, oy, oz, dir) {
  const [fx, fz] = DIRS[dir];                 // vooruit (van je af)
  const [rx, rz] = DIRS[(dir + 1) % 4];       // naar rechts
  const cells = new Map();
  const at = (lx, ly, lz) => [ox + rx * lx + fx * lz, oy + ly, oz + rz * lx + fz * lz];
  // force: ook bestaande blokken vervangen (behalve de onbreekbare bodem)
  const put = (lx, ly, lz, id, force = true) => {
    const [x, y, z] = at(lx, ly, lz);
    if (!world.inside(x, y, z)) return;
    const cur = cells.has(key(x, y, z)) ? cells.get(key(x, y, z)).to : world.get(x, y, z);
    if (cur === B.BEDROCK) return;
    if (!force && !BLOCKS[cur].replaceable) return;
    cells.set(key(x, y, z), { x, y, z, to: id });
  };
  // fundering: vul gaten onder een vakje op tot op de grond
  const foundation = (lx, lz, id) => {
    for (let ly = -2; ly >= -8; ly--) {
      const [x, y, z] = at(lx, ly, lz);
      const cur = world.get(x, y, z);
      if (BLOCKS[cur].solid && cur !== B.LEAVES) break;
      put(lx, ly, lz, id);
    }
  };

  if (kind === 'house') {
    const back = (dir + 2) % 4; // de deur kijkt naar jou toe
    for (let lx = -2; lx <= 2; lx++) for (let lz = 0; lz <= 4; lz++) {
      const wall = Math.abs(lx) === 2 || lz === 0 || lz === 4;
      const corner = Math.abs(lx) === 2 && (lz === 0 || lz === 4);
      put(lx, -1, lz, wall ? B.COBBLE : B.PLANKS);
      foundation(lx, lz, B.COBBLE);
      for (let ly = 0; ly <= 2; ly++) put(lx, ly, lz, wall ? (corner ? B.LOG : B.PLANKS) : AIR);
    }
    put(0, 0, 0, doorId(back, false, false));
    put(0, 1, 0, doorId(back, true, false));
    put(-2, 1, 2, B.GLASS); put(2, 1, 2, B.GLASS); put(0, 1, 4, B.GLASS);
    put(-1, 0, 3, B.LAMP);
    // dak: een piramide van bakstenen
    for (let ly = 3, r = 3; r >= 0; ly++, r--) {
      for (let lx = -r; lx <= r; lx++) for (let lz = 2 - r; lz <= 2 + r; lz++) put(lx, ly, lz, B.BRICK);
    }
  } else if (kind === 'tree') {
    const h = 5;
    for (let ly = 3; ly <= 6; ly++) {
      const r = ly <= 4 ? 2 : 1;
      for (let lx = -r; lx <= r; lx++) for (let lz = -r; lz <= r; lz++) {
        if (Math.abs(lx) === r && Math.abs(lz) === r && (ly === 6 || r === 2 && ly === 4)) continue;
        put(lx, ly, lz, B.LEAVES, false);
      }
    }
    for (let ly = 0; ly < h; ly++) put(0, ly, 0, B.LOG);
    put(0, -1, 0, B.DIRT);
  } else if (kind === 'tower') {
    const back = (dir + 2) % 4;
    for (let lx = -1; lx <= 1; lx++) for (let lz = 0; lz <= 2; lz++) {
      const inner = lx === 0 && lz === 1;
      put(lx, -1, lz, B.COBBLE);
      foundation(lx, lz, B.COBBLE);
      for (let ly = 0; ly <= 5; ly++) put(lx, ly, lz, inner ? AIR : B.COBBLE);
      put(lx, 6, lz, B.COBBLE);
      if (Math.abs(lx) === 1 && lz !== 1) put(lx, 7, lz, B.COBBLE); // kantelen op de hoeken
    }
    put(0, 0, 0, doorId(back, false, false));
    put(0, 1, 0, doorId(back, true, false));
    for (const ly of [3, 5]) { put(0, ly, 0, B.GLASS); put(-1, ly, 1, B.GLASS); put(1, ly, 1, B.GLASS); put(0, ly, 2, B.GLASS); }
    put(0, 7, 1, B.LAMP);
  } else if (kind === 'bridge') {
    for (let lz = 0; lz <= 9; lz++) {
      for (let lx = -1; lx <= 1; lx++) put(lx, -1, lz, B.PLANKS);
      put(-1, 0, lz, lz % 3 === 0 ? B.LOG : B.PLANKS);
      put(1, 0, lz, lz % 3 === 0 ? B.LOG : B.PLANKS);
      put(0, 0, lz, AIR);
      put(0, 1, lz, AIR);
    }
    put(0, -1, 0, B.PLANKS);
  }

  const changes = [];
  for (const c of cells.values()) {
    const from = world.get(c.x, c.y, c.z);
    if (from !== c.to) changes.push({ x: c.x, y: c.y, z: c.z, from, to: c.to });
  }
  return changes;
}

function key(x, y, z) { return x + ',' + y + ',' + z; }
