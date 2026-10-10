// Portalen (fase 4H), zoals de Nether in Minecraft: een rechthoekig frame van portaalsteen
// (minstens 4 breed en 5 hoog), aangestoken met de toverstaf, vult zich met gloeiend licht.
// De kleur van de steen bepaalt naar welke themawereld het portaal gaat.

import { AIR, B, BLOCKS, PORTAL_COLORS, portalId } from './blocks.js';

export const PORTAL_THEMES = PORTAL_COLORS.map((c) => c.theme);
const MAX_INSIDE = 21; // een portaal is hoogstens 21 x 21 vanbinnen
const MIN_W = 2, MIN_H = 3; // vanbinnen minstens 2 breed en 3 hoog (frame: 4 x 5)

const isStone = (id, color) => BLOCKS[id]?.portalColor === color;
const isFree = (id) => id === AIR || BLOCKS[id]?.portal !== undefined || (BLOCKS[id]?.replaceable && BLOCKS[id]?.render === 'cross');

// Zoek het portaal waar dit stuk portaalsteen bij hoort. Geeft { color, axis, cells } of null.
// axis 0: het frame staat langs x (je loopt er in de z-richting doorheen), axis 1: langs z.
export function findPortal(world, x, y, z) {
  const color = BLOCKS[world.get(x, y, z)]?.portalColor;
  if (color === undefined) return null;
  for (const axis of [0, 1]) {
    const [ux, uz] = axis ? [0, 1] : [1, 0];
    // probeer de vakjes naast deze steen (in het vlak van het frame) als binnenkant
    for (const [du, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const sx = x + ux * du, sy = y + dy, sz = z + uz * du;
      if (!isFree(world.get(sx, sy, sz))) continue;
      const found = flood(world, sx, sy, sz, ux, uz, color);
      if (found) return { color, axis, cells: found };
    }
  }
  return null;
}

// Vul vanaf één vakje alle vrije vakjes in het vlak; het moet een rechthoek zijn met een rand van
// portaalsteen van dezelfde kleur
function flood(world, sx, sy, sz, ux, uz, color) {
  const seen = new Set(), stack = [[0, 0]], cells = [];
  let u0 = 0, u1 = 0, y0 = 0, y1 = 0;
  while (stack.length) {
    const [u, v] = stack.pop(), key = u + ',' + v;
    if (seen.has(key)) continue;
    seen.add(key);
    const x = sx + ux * u, y = sy + v, z = sz + uz * u, id = world.get(x, y, z);
    if (isStone(id, color)) continue;
    if (!isFree(id)) return null; // iets anders in de weg: geen portaal
    cells.push([x, y, z]);
    u0 = Math.min(u0, u); u1 = Math.max(u1, u); y0 = Math.min(y0, v); y1 = Math.max(y1, v);
    if (u1 - u0 >= MAX_INSIDE || y1 - y0 >= MAX_INSIDE) return null; // te groot (of niet dicht)
    stack.push([u + 1, v], [u - 1, v], [u, v + 1], [u, v - 1]);
  }
  const w = u1 - u0 + 1, h = y1 - y0 + 1;
  if (w < MIN_W || h < MIN_H || cells.length !== w * h) return null; // geen rechthoek
  // de rand (zonder de hoeken) moet helemaal van portaalsteen zijn
  for (let u = u0; u <= u1; u++) for (const v of [y0 - 1, y1 + 1]) if (!isStone(world.get(sx + ux * u, sy + v, sz + uz * u), color)) return null;
  for (let v = y0; v <= y1; v++) for (const u of [u0 - 1, u1 + 1]) if (!isStone(world.get(sx + ux * u, sy + v, sz + uz * u), color)) return null;
  return cells;
}

// Een kant-en-klaar portaal (frame 4 x 5, binnenkant 2 x 3) rond (x, y, z) = linksonder van de binnenkant.
// lit: meteen aangestoken. Geeft een lijst [x, y, z, id].
export function portalCells(color, axis, x, y, z, lit = true) {
  const [ux, uz] = axis ? [0, 1] : [1, 0], out = [];
  for (let u = -1; u <= MIN_W; u++) for (let v = -1; v <= MIN_H; v++) {
    const frame = u < 0 || u >= MIN_W || v < 0 || v >= MIN_H;
    out.push([x + ux * u, y + v, z + uz * u, frame ? B.PORTAL_STONE + color : lit ? portalId(color, axis) : AIR]);
  }
  return out;
}

// Het portaal waar de speler in staat (of null)
export function portalAt(world, x, y, z) {
  for (const dy of [0.2, 1.2]) {
    const b = BLOCKS[world.get(Math.floor(x), Math.floor(y + dy), Math.floor(z))];
    if (b?.portal !== undefined) return b.portal;
  }
  return null;
}
