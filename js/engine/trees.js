// Boomvormen. `w` is een schrijver met put (altijd) en leaf (alleen in lucht), zodat een boom
// die over de rand van een chunk hangt in elke chunk precies hetzelfde uitkomt.
import { B } from '../blocks.js';

// Gewone eik (eilandwereld)
export function oak(w, x, y, z, r) {
  const hgt = 4 + Math.floor(r() * 2);
  const top = y + hgt;
  for (let ly = top - 2; ly <= top + 1; ly++) {
    const rad = ly >= top ? 1 : 2;
    for (let dx = -rad; dx <= rad; dx++) for (let dz = -rad; dz <= rad; dz++) {
      if (Math.abs(dx) === rad && Math.abs(dz) === rad && (ly === top + 1 || r() < 0.5)) continue;
      w.leaf(x + dx, ly, z + dz, B.LEAVES);
    }
  }
  for (let i = 0; i < hgt; i++) w.put(x, y + i, z, B.LOG);
}

// Dezelfde kleine bouwstenen, maar duidelijk verschillende boomvormen per wereld.
export function biomeTree(w, kind, x, y, z, r) {
  if (kind === 'giantJungle' || kind === 'jungle') {
    const giant = kind === 'giantJungle', height = giant ? 12 + Math.floor(r() * 5) : 6 + Math.floor(r() * 3);
    const radius = giant ? 4 : 2, top = y + height;
    for (let dy = -2; dy <= 1; dy++) for (let dx = -radius; dx <= radius; dx++) for (let dz = -radius; dz <= radius; dz++) {
      if (Math.hypot(dx, dz) > radius + (dy === 1 ? -1 : 0.5)) continue;
      w.leaf(x + dx, top + dy, z + dz, B.JUNGLE_LEAVES);
    }
    for (let dy = 0; dy < height; dy++) for (let dx = 0; dx < (giant ? 2 : 1); dx++) for (let dz = 0; dz < (giant ? 2 : 1); dz++) w.put(x + dx, y + dy, z + dz, B.JUNGLE_LOG);
    // Lianen hangen aan de rand van de kruin
    for (let dx = -radius; dx <= radius; dx++) for (let dz = -radius; dz <= radius; dz++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== radius || Math.hypot(dx, dz) > radius + 0.5 || r() > 0.5) continue;
      const len = 3 + Math.floor(r() * 4);
      for (let dy = 3; dy < 3 + len; dy++) w.leaf(x + dx, top - dy, z + dz, B.VINE);
    }
  } else if (kind === 'spruce') {
    const height = 6 + Math.floor(r() * 4);
    for (let dy = 2; dy <= height; dy++) {
      const radius = Math.max(0, Math.ceil((height - dy) / 3));
      for (let dx = -radius; dx <= radius; dx++) for (let dz = -radius; dz <= radius; dz++) {
        if (Math.abs(dx) + Math.abs(dz) > radius + 1) continue;
        w.leaf(x + dx, y + dy, z + dz, dy % 2 === 0 || dy === height ? B.SNOWY_LEAVES : B.SPRUCE_LEAVES);
      }
    }
    for (let dy = 0; dy < height; dy++) w.put(x, y + dy, z, B.SPRUCE_LOG);
  } else if (kind === 'acacia') {
    const height = 4 + Math.floor(r() * 3);
    for (let dy = 0; dy < height; dy++) w.put(x + (dy > 2 ? 1 : 0), y + dy, z, B.ACACIA_LOG);
    w.put(x + 1, y + 2, z, B.ACACIA_LOG);
    for (let dy = 0; dy < 2; dy++) for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) {
      if (Math.hypot(dx, dz) <= (dy ? 2.7 : 3.5)) w.leaf(x + 1 + dx, y + height + dy, z + dz, B.ACACIA_LEAVES);
    }
  } else if (kind === 'palm') {
    const height = 6 + Math.floor(r() * 3);
    for (let dy = 0; dy < height; dy++) w.put(x, y + dy, z, B.PALM_LOG);
    w.leaf(x, y + height, z, B.PALM_LEAVES);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]]) {
      for (let k = 1; k <= 3; k++) w.leaf(x + dx * k, y + height - (k === 3 ? 1 : 0), z + dz * k, B.PALM_LEAVES);
    }
  } else if (kind === 'oak') oak(w, x, y, z, r);
  else if (kind === 'birch') {
    // Slanke berk: witte stam, smalle kruin
    const hgt = 5 + Math.floor(r() * 3), top = y + hgt;
    for (let ly = top - 3; ly <= top + 1; ly++) {
      const rad = ly >= top ? 1 : ly === top - 3 ? 1 : 2;
      for (let dx = -rad; dx <= rad; dx++) for (let dz = -rad; dz <= rad; dz++) {
        if (Math.abs(dx) === rad && Math.abs(dz) === rad && (rad === 2 || ly === top + 1) && r() < 0.7) continue;
        w.leaf(x + dx, ly, z + dz, B.BIRCH_LEAVES);
      }
    }
    for (let i = 0; i < hgt; i++) w.put(x, y + i, z, B.BIRCH_LOG);
  } else if (kind === 'bigOak') {
    // Grote eik: hoge stam, brede ronde kruin en een paar takken
    const hgt = 7 + Math.floor(r() * 3), top = y + hgt;
    for (let dy = -3; dy <= 2; dy++) for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) {
      const d = Math.hypot(dx, dy * 1.3, dz);
      if (d <= 3.9 - r() * 0.6) w.leaf(x + dx, top + dy, z + dz, B.LEAVES);
    }
    for (let i = 0; i < hgt; i++) w.put(x, y + i, z, B.LOG);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (r() < 0.6) { w.put(x + dx, top - 2, z + dz, B.LOG); w.put(x + dx * 2, top - 1, z + dz * 2, B.LOG); }
  } else if (kind === 'treeFern') {
    // Boomvaren (Dinowereld): een dunne stam met bovenop een ster van lange, hangende bladeren
    const height = 4 + Math.floor(r() * 4), top = y + height;
    for (let dy = 0; dy < height; dy++) w.put(x, y + dy, z, B.TREE_FERN_LOG);
    w.leaf(x, top, z, B.TREE_FERN_LEAVES);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
      const len = dx && dz ? 2 : 3;
      for (let k = 1; k <= len; k++) w.leaf(x + dx * k, top - (k === len ? 1 : 0), z + dz * k, B.TREE_FERN_LEAVES);
    }
  } else if (kind === 'araucaria') {
    // Apenboom (Dinowereld): een hoge, kale stam met een platte kruin in lagen
    const height = 10 + Math.floor(r() * 5), top = y + height;
    for (let dy = 0; dy < height; dy++) w.put(x, y + dy, z, B.ARAUCARIA_LOG);
    for (const [dy, rad] of [[-3, 2], [-1, 3], [0, 3.5], [1, 2.5]]) {
      for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) {
        if (Math.hypot(dx, dz) <= rad && r() > 0.08) w.leaf(x + dx, top + dy, z + dz, B.ARAUCARIA_LEAVES);
      }
    }
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) w.put(x + dx, top - 1, z + dz, B.ARAUCARIA_LOG);
  } else if (kind === 'cycad') {
    // Palmvaren (Dinowereld): een korte, dikke stam met een kuif van bladeren
    const height = 1 + Math.floor(r() * 2), top = y + height;
    for (let dy = 0; dy < height; dy++) w.put(x, y + dy, z, B.TREE_FERN_LOG);
    w.leaf(x, top, z, B.TREE_FERN_LEAVES);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { w.leaf(x + dx, top, z + dz, B.TREE_FERN_LEAVES); w.leaf(x + dx * 2, top - 1, z + dz * 2, B.TREE_FERN_LEAVES); }
  } else if (kind === 'swampOak') {
    // Moerasboom: lage, platte kruin met lianen
    const hgt = 5 + Math.floor(r() * 2), top = y + hgt;
    for (let dy = -1; dy <= 1; dy++) {
      const rad = dy === 1 ? 2 : 3;
      for (let dx = -rad; dx <= rad; dx++) for (let dz = -rad; dz <= rad; dz++) {
        if (Math.abs(dx) === rad && Math.abs(dz) === rad) continue;
        w.leaf(x + dx, top + dy, z + dz, B.LEAVES);
      }
    }
    for (let i = 0; i < hgt; i++) w.put(x, y + i, z, B.LOG);
    for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== 3 || Math.abs(dx) === Math.abs(dz) || r() > 0.4) continue;
      const len = 2 + Math.floor(r() * 3);
      for (let dy = 2; dy < 2 + len; dy++) w.leaf(x + dx, top - dy, z + dz, B.VINE);
    }
  }
}

// Hoe ver een boom opzij reikt (voor het zoeken naar bomen die in een chunk hangen)
export const TREE_REACH = 5;
export const TREE_RADIUS = { giantJungle: 4, acacia: 4, spruce: 3, jungle: 2, palm: 3, oak: 2, birch: 2, bigOak: 4, swampOak: 3, treeFern: 3, araucaria: 4, cycad: 2 };
