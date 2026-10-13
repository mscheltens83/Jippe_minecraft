// Over een hek heen, door de aarde, of er doorheen: wat een dier kan (fase 7C, Boerderij in Gevaar).
// Dezelfde regels gelden voor een roofdier dat naar binnen wil en een dier dat uit zijn hok wil.
// Alles hier is losse logica op de wereld (geen scherm, geen geluid), zodat het goed te testen is.
import { BLOCKS, blockBoxes } from './blocks.js';
import { blockStrength, isSoil } from './storm.js';

// Wat elke soort kan: jump = hoe hoog hij springt (in blokken; een hek is 1,5 hoog), dig = graaft door
// aarde, gras en zand, bash = beukt kapot wat niet sterker is dan dit (zie blockStrength)
export const ABILITIES = {
  fox: { jump: 1.1, dig: true },
  rabbit: { jump: 1.1, dig: true },
  chicken: { jump: 1.7 },
  goat: { jump: 2.3 },
  pig: { bash: 2 },
  cow: {},
  sheep: {},
  lioness: { jump: 1.7 },
  lion: { jump: 1.8 },
  cheetah: { jump: 1.7 },
  tiger: { jump: 2.3 },
};
export const abilityOf = (type) => ABILITIES[type] || {};

// Wat staat er in dit vakje, boven de grond y0 (tot `height` blokken boven het dier)? top = hoe hoog het is
// (een hek 1,5), soil = alles is aarde, gras of zand, strength = hoe sterk het sterkste blok is
export function column(world, x, z, y0, height = 2) {
  let top = 0, solid = false, soil = true, strength = 0;
  for (let y = y0; y < y0 + Math.ceil(height) + 3; y++) {
    const boxes = blockBoxes(world, x, y, z, true);
    if (!boxes.length) continue;
    const b = BLOCKS[world.get(x, y, z)];
    if (b?.open && (b.shape === 'door' || b.shape === 'gate')) continue; // een open deur of hekdeur is een gat
    solid = true;
    for (const q of boxes) top = Math.max(top, y + q[4] - y0);
    const id = world.get(x, y, z);
    if (!isSoil(id)) soil = false;
    strength = Math.max(strength, blockStrength(id));
  }
  return { top, solid, soil: solid && soil, strength };
}

// Hoe komt dit dier door een vakje met deze kolom? 'free' (er staat niets), 'jump', 'dig', 'bash' of null (lukt niet)
export function passKind(ability, col) {
  if (!col.solid) return 'free';
  if (ability.jump && col.top <= ability.jump) return 'jump';
  if (ability.dig && col.soil) return 'dig';
  if (ability.bash && col.strength <= ability.bash) return 'bash';
  return null;
}
export const COST = { free: 0, jump: 1, dig: 2, bash: 3 };

// Staat er een fakkel, lantaarn of ander licht binnen 4 blokken? (kleine roofdieren durven er niet langs)
export function nearLight(world, x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  for (let dx = -4; dx <= 4; dx++) for (let dy = -2; dy <= 2; dy++) for (let dz = -4; dz <= 4; dz++) {
    if (dx * dx + dy * dy + dz * dz <= 16.5 && (BLOCKS[world.get(ix + dx, iy + dy, iz + dz)]?.light || 0) >= 12) return true;
  }
  return false;
}

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// Zit dit dier in een hok? Alle vakjes waar hij zonder door iets heen te gaan kan komen (op zijn hoogte):
// komt hij buiten `radius` of zijn het er te veel, dan is het geen hok. Anders geeft dit ook de randen:
// elk vakje met iets erin dat aan het hok grenst, met het vakje erachter.
export function enclosure(world, x, y, z, height, radius = 10, maxCells = 600) {
  const sx = Math.floor(x), sz = Math.floor(z), y0 = Math.floor(y + 0.05);
  const free = (cx, cz) => !column(world, cx, cz, y0, height).solid;
  const key = (cx, cz) => cx + ',' + cz;
  const seen = new Set([key(sx, sz)]), cells = [[sx, sz]], edges = [];
  for (let i = 0; i < cells.length; i++) {
    const [cx, cz] = cells[i];
    if (Math.abs(cx - sx) > radius || Math.abs(cz - sz) > radius || cells.length > maxCells) return { closed: false, cells: [], edges: [] };
    for (const [dx, dz] of DIRS) {
      const nx = cx + dx, nz = cz + dz, k = key(nx, nz);
      if (seen.has(k)) continue;
      if (free(nx, nz)) { seen.add(k); cells.push([nx, nz]); } else edges.push({ from: [cx, cz], at: [nx, nz], beyond: [nx + dx, nz + dz], dir: [dx, dz] });
    }
  }
  return { closed: true, cells, edges, y: y0 };
}

// De beste plek om uit het hok te komen voor deze soort: { edge, kind } of null
export function bestExit(world, enc, type, height) {
  const ab = abilityOf(type);
  let best = null;
  for (const e of enc.edges) {
    const col = column(world, e.at[0], e.at[1], enc.y, height);
    const kind = passKind(ab, col);
    if (!kind || kind === 'free') continue;
    const beyond = column(world, e.beyond[0], e.beyond[1], enc.y, height);
    if (beyond.solid) continue; // erachter is weer een muur: daar kom je niet doorheen
    const cost = COST[kind] + col.top * 0.1;
    if (!best || cost < best.cost) best = { edge: e, kind, cost };
  }
  return best;
}
