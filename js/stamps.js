// Stempels: met één tik een huisje, boom, toren of brug neerzetten.
// Ze worden gebouwd vanaf het vakje waar je tikte, van je af gericht.

import { AIR, B, BLOCKS, DIRS, doorId } from './blocks.js';
import { structureCells, structureBounds } from './structures.js';
import { house, well, VILLAGE_STYLES } from './engine/village.js';
import { portalCells } from './portal.js';

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
  // Staat de vloer van de stempel al op iets stevigs (de grond, of het dak van je eigen huis)? Dan hoeft er
  // niets onder (anders vul je het holle huis eronder met keien)
  const sitsOnSolid = (x, y, z) => { const cur = world.get(x, y, z); return BLOCKS[cur].solid && cur !== B.LEAVES; };
  // fundering: vul gaten onder een vakje op tot op de grond
  const foundation = (lx, lz, id) => {
    if (sitsOnSolid(...at(lx, -1, lz))) return;
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
  } else if (kind.startsWith('portal')) {
    // Een kant-en-klaar portaal (al aangestoken), 3 blokken voor je, dwars op je kijkrichting
    const color = Number(kind.slice(6)) || 0, axis = dir % 2 === 0 ? 0 : 1;
    const x = ox + fx * 3, z = oz + fz * 3;
    for (const [cx, cy, cz, id] of portalCells(color, axis, x, oy, z)) {
      if (world.inside(cx, cy, cz) && world.get(cx, cy, cz) !== B.BEDROCK) cells.set(key(cx, cy, cz), { x: cx, y: cy, z: cz, to: id });
    }
  } else if (kind === 'villageHouse' || kind === 'well') {
    // Uit het dorp: in wereld-richtingen gebouwd (de deur kijkt naar jou), 4 blokken voor je
    const cx = ox + fx * 4, cz = oz + fz * 4, cols = new Set();
    const putWorld = (x, y, z, id) => {
      const wx = cx + x, wy = oy + y, wz = cz + z;
      if (!world.inside(wx, wy, wz) || world.get(wx, wy, wz) === B.BEDROCK) return;
      cells.set(key(wx, wy, wz), { x: wx, y: wy, z: wz, to: id });
      if (y === -1) cols.add(wx + ',' + wz);
    };
    if (kind === 'well') well(putWorld, VILLAGE_STYLES.plains);
    else house(putWorld, VILLAGE_STYLES.plains, 0, 0, (dir + 2) % 4, { bed: 0 });
    // fundering onder de vloer tot op de grond (niet als de vloer al op iets stevigs staat, zoals een dak)
    for (const c of cols) {
      const [wx, wz] = c.split(',').map(Number);
      if (sitsOnSolid(wx, oy - 1, wz)) continue;
      for (let y = oy - 2; y >= oy - 8; y--) {
        const cur = world.get(wx, y, wz);
        if (BLOCKS[cur].solid && cur !== B.LEAVES) break;
        cells.set(key(wx, y, wz), { x: wx, y, z: wz, to: B.COBBLE });
      }
    }
  } else if (['igloo', 'pyramid', 'temple', 'lionRock'].includes(kind)) {
    const bounds = structureBounds(kind, true);
    for (const [x, y, z, id] of structureCells(kind, true)) {
      const forward = z - bounds[2];
      put(x, y, forward, id);
      if (y === -1) foundation(x, forward, id);
    }
  }

  const changes = [];
  for (const c of cells.values()) {
    const from = world.get(c.x, c.y, c.z);
    if (from !== c.to) changes.push({ x: c.x, y: c.y, z: c.z, from, to: c.to });
  }
  return changes;
}

function key(x, y, z) { return x + ',' + y + ',' + z; }
