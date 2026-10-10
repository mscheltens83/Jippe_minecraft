// Dorpen (fase 4G), zoals in Minecraft: een waterput in het midden, paden in een kruis, 4 tot 8
// huisjes in de stijl van het landschap, een bibliotheek, akkers en lantaarnpalen. Alles als
// lijst blokken rond het midden (x, z = 0; y = 0 is de eerste laag boven de grond, y = -1 de grond).
// Ook het dorpshuis en de waterput als stempel komen hiervandaan.

import { AIR, B, WOODS, stairsId, slabId, doorId, bedId, torchId } from '../blocks.js';
import { rng } from './noise.js';

export const VILLAGE_RADIUS = 19;

// Stijl per landschap: hout, muren, fundering, dak en pad
const WOOD = (w, extra) => ({ wood: w, log: WOODS[w].log, planks: WOODS[w].planks, walls: WOODS[w].planks, base: B.COBBLE, roof: w, path: B.GRAVEL, ground: B.GRASS, ...extra });
export const VILLAGE_STYLES = {
  plains: WOOD(0),
  taiga: WOOD(2),
  tundra: WOOD(2, { ground: B.SNOW, snowRoof: true }),
  savanna: WOOD(4, { base: B.TERRACOTTA_ORANGE, walls: WOODS[4].planks }),
  desert: { wood: 0, log: B.CARVED_SANDSTONE, planks: B.SANDSTONE, walls: B.SANDSTONE, base: B.SANDSTONE, roof: 9, flat: true, path: B.SANDSTONE, ground: B.SAND },
};
export function villageStyle(biome) {
  return VILLAGE_STYLES[biome] || (biome === 'flowerField' || biome === 'forest' || biome === 'birchForest' ? VILLAGE_STYLES.plains : null);
}

function writer() {
  const cells = new Map();
  const put = (x, y, z, id) => cells.set(x + ',' + y + ',' + z, [x, y, z, id]);
  return { cells, put, list: () => [...cells.values()] };
}

// Een huisje van 5 x 5 (buitenmaat) met de deur aan kant `dir` (0 = -z, 1 = +x, 2 = +z, 3 = -x).
// Draai om het midden (cx, cz). Geeft de plek van het bed terug (voor de dorpeling).
export function house(put, st, cx, cz, dir, opts = {}) {
  const W = opts.wide ? 3 : 2, D = 2, H = 3; // halve breedte en diepte
  // lokaal: deur aan -z; draaien naar dir
  const rot = (x, z) => [[x, z], [-z, x], [-x, -z], [z, -x]][dir];
  const at = (x, y, z, id) => { const [rx, rz] = rot(x, z); put(cx + rx, y, cz + rz, id); };
  const rd = (d) => (d + dir) % 4; // richting draaien
  for (let x = -W; x <= W; x++) for (let z = -D; z <= D; z++) {
    at(x, -1, z, st.base);
    const edgeX = Math.abs(x) === W, edgeZ = Math.abs(z) === D;
    for (let y = 0; y < H; y++) {
      if (edgeX && edgeZ) at(x, y, z, st.log);
      else if (edgeX || edgeZ) at(x, y, z, y === 1 && (x === 0 || z === 0) && !(z === -D && x === 0) ? B.PANE : st.walls);
      else at(x, y, z, AIR);
    }
    at(x, 0, z, edgeX || edgeZ ? (edgeX && edgeZ ? st.log : st.walls) : AIR);
  }
  // vloer van planken binnen
  for (let x = -W + 1; x < W; x++) for (let z = -D + 1; z < D; z++) at(x, -1, z, st.planks === B.SANDSTONE ? B.SANDSTONE : st.planks);
  // deur
  at(0, 0, -D, doorId(rd(0), false, false, st.wood));
  at(0, 1, -D, doorId(rd(0), true, false, st.wood));
  // dak
  if (st.flat) {
    for (let x = -W - 1; x <= W + 1; x++) for (let z = -D - 1; z <= D + 1; z++) {
      const edge = Math.abs(x) === W + 1 || Math.abs(z) === D + 1;
      at(x, H, z, edge ? slabId(st.roof) : st.planks);
    }
  } else {
    // zadeldak: aan beide kanten trappen oplopend naar het midden (langs x), nok van planken
    for (let z = -D - 1; z <= D + 1; z++) {
      for (let s = 0; s <= W; s++) {
        const y = H + s;
        at(-W - 1 + s, y, z, stairsId(st.roof, rd(1)));
        at(W + 1 - s, y, z, stairsId(st.roof, rd(3)));
        if (Math.abs(z) === D) for (let x = -(W - s); x <= W - s; x++) at(x, y, z, st.planks); // gevels dicht
      }
      at(0, H + W, z, st.snowRoof ? B.SNOW : st.planks);
    }
  }
  // inrichting: bed achterin, fakkel, werkbank of boekenkasten
  const bed = rot(-W + 1, D - 1), out = rot(0, -D - 2);
  at(-W + 1, 0, D - 1, bedId(opts.bed ?? 0, true));
  at(-W + 1, 0, D - 2, bedId(opts.bed ?? 0, false));
  at(W - 1, 0, D - 1, opts.library ? B.BOOKSHELF : B.CRAFTING_TABLE);
  at(1, 0, -D + 1, torchId());
  if (opts.library) for (let x = -W + 2; x <= W - 1; x++) { at(x, 0, D - 1, B.BOOKSHELF); at(x, 1, D - 1, B.BOOKSHELF); }
  // bed: waar de dorpeling slaapt; out: de plek voor de deur
  return { x: cx + bed[0], z: cz + bed[1], outX: cx + out[0], outZ: cz + out[1] };
}

// De waterput: een rand van keien met water, vier palen en een dakje
export function well(put, st, cx = 0, cz = 0) {
  for (let x = -2; x <= 1; x++) for (let z = -2; z <= 1; z++) {
    const edge = x === -2 || x === 1 || z === -2 || z === 1;
    put(cx + x, -1, cz + z, edge ? B.COBBLE : B.WATER);
    put(cx + x, -2, cz + z, edge ? B.COBBLE : B.WATER);
    put(cx + x, -3, cz + z, B.COBBLE);
    if (edge) put(cx + x, 0, cz + z, B.COBBLE);
    if ((x === -2 || x === 1) && (z === -2 || z === 1)) { put(cx + x, 1, cz + z, B.FENCE); put(cx + x, 2, cz + z, B.FENCE); }
    put(cx + x, 3, cz + z, slabId(5));
  }
  put(cx + 0, 3, cz + 0, B.COBBLE);
}

function lampPost(put, x, z) {
  put(x, 0, z, B.FENCE); put(x, 1, z, B.FENCE); put(x, 2, z, B.LANTERN);
}

// Akker: water in het midden, akkerland met gewassen eromheen, rand van stammen
function farm(put, st, cx, cz, crop) {
  for (let x = -3; x <= 3; x++) for (let z = -2; z <= 2; z++) {
    const edge = Math.abs(x) === 3 || Math.abs(z) === 2;
    if (edge) { put(cx + x, -1, cz + z, st.log === B.CARVED_SANDSTONE ? B.SANDSTONE : st.log); continue; }
    if (x === 0) { put(cx + x, -1, cz + z, B.WATER); continue; }
    put(cx + x, -1, cz + z, B.FARMLAND);
    put(cx + x, 0, cz + z, crop + ((x + z + 6) % 2 ? 3 : 2));
  }
}

// Een heel dorp. Geeft de blokken en de bedden (waar de dorpelingen wonen).
export function villageCells(seed, style) {
  const st = style || VILLAGE_STYLES.plains, r = rng(seed >>> 0), w = writer(), put = w.put;
  const R = VILLAGE_RADIUS - 2;
  // paden in een kruis (3 breed)
  for (let i = -R; i <= R; i++) for (let k = -1; k <= 1; k++) { put(i, -1, k, st.path); put(k, -1, i, st.path); }
  well(put, st);
  // plekken langs de paden: [midden x, midden z, deur-richting]
  const lots = [
    [-6, -6, 2], [6, -6, 2], [-6, 6, 0], [6, 6, 0], [-14, -6, 2], [14, -6, 2], [-14, 6, 0], [14, 6, 0],
    [-6, -14, 1], [6, -14, 3], [-6, 14, 1], [6, 14, 3],
  ];
  // schudden (vast per dorp)
  for (let i = lots.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [lots[i], lots[j]] = [lots[j], lots[i]]; }
  const houses = 4 + Math.floor(r() * 5), beds = [];
  let used = 0;
  // eerst twee akkers, dan de bibliotheek, dan de huisjes
  const crops = [B.WHEAT, B.CARROTS, B.POTATOES];
  for (let f = 0; f < 2; f++) { const [x, z] = lots[used++]; farm(put, st, x, z, crops[Math.floor(r() * crops.length)]); }
  for (let h = 0; h < houses && used < lots.length; h++) {
    const [x, z, dir] = lots[used++];
    beds.push(house(put, st, x, z, dir, { library: h === 0, wide: h === 0, bed: Math.floor(r() * 10) }));
    // een paadje van de deur naar het grote pad
    const [dx, dz] = [[0, -1], [1, 0], [0, 1], [-1, 0]][dir];
    for (let s = 3; s <= 6; s++) {
      const px = x + dx * s, pz = z + dz * s;
      if (Math.abs(px) <= 1 || Math.abs(pz) <= 1) break;
      put(px, -1, pz, st.path);
    }
  }
  // lantaarnpalen bij de put en aan de uiteinden van de paden
  for (const [x, z] of [[3, 3], [-4, -4], [R - 1, 2], [-R + 1, -2], [2, R - 1], [-2, -R + 1]]) lampPost(put, x, z);
  put(-3, 0, 3, B.TREASURE); // een schatkist bij de put (fase 5C)
  return { cells: w.list(), beds };
}

// Stempels: één dorpshuis en de waterput
export function stampHouseCells(style = VILLAGE_STYLES.plains) {
  const w = writer();
  house(w.put, style, 0, 0, 0, { bed: 0 });
  return w.list();
}
export function stampWellCells(style = VILLAGE_STYLES.plains) {
  const w = writer();
  well(w.put, style);
  return w.list();
}
