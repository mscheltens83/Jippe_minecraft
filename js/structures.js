// Bouwwerken voor nieuwe werelden én stempels. Alles wordt één keer bij het maken gebouwd.
import { AIR, B, stairsId, slabId } from './blocks.js';

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
    put(-1, 0, 1, B.TREASURE);
  } else if (kind === 'shipwreck') {
    // Een gestrand schip: romp van sparrenhout, een gebroken mast met een gescheurd zeil en een schatkist
    const hull = B.SPRUCE_PLANKS;
    for (let z = -6; z <= 6; z++) {
      const half = Math.abs(z) >= 5 ? 1 : 2; // smaller bij de punten
      for (let x = -half; x <= half; x++) {
        put(x, -1, z, hull);
        if (Math.abs(x) === half) { put(x, 0, z, hull); if (Math.abs(z) < 5 && z < 3) put(x, 1, z, hull); }
        else put(x, 0, z, AIR);
      }
      if (Math.abs(z) === 6) put(0, 0, z, hull);
    }
    for (let x = -1; x <= 1; x++) for (const z of [-3, 2]) put(x, 1, z, slabId(2)); // stukken dek
    for (let y = 0; y <= 4; y++) put(0, y, -1, B.SPRUCE_LOG);           // gebroken mast
    put(0, 2, 0, B.WOOL_WHITE); put(0, 3, 0, B.WOOL_WHITE); put(0, 3, 1, B.WOOL_WHITE);
    put(1, 0, 4, B.TREASURE);
    put(-2, 0, 6, stairsId(2, 0)); put(2, 0, -6, stairsId(2, 2));
  } else if (kind === 'ruin') {
    // Een oude ruïne in het bos: half ingestorte muren van mossige keien, met een schatkist
    const height = [[2, 1, 3, 0, 2, 1, 2], [1, 0, 0, 0, 0, 0, 2], [3, 0, 0, 0, 0, 0, 1], [0, 0, 0, 0, 0, 0, 0], [2, 0, 0, 0, 0, 0, 3], [1, 0, 0, 0, 0, 0, 2], [3, 2, 1, 0, 1, 2, 2]];
    for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) {
      const wall = Math.abs(x) === 3 || Math.abs(z) === 3;
      put(x, -1, z, (x * 7 + z * 3) % 3 ? B.MOSSY_COBBLE : B.COBBLE);
      if (wall) for (let y = 0; y < height[x + 3][z + 3]; y++) put(x, y, z, (x + y + z) % 2 ? B.MOSSY_COBBLE : B.COBBLE);
      else for (let y = 0; y < 4; y++) put(x, y, z, AIR);
    }
    put(0, 0, 1, B.TREASURE);
    put(-1, 0, -1, B.MOSSY_COBBLE); put(1, 0, 2, slabId(5));
    put(-2, 0, 2, B.MUSHROOM_BROWN); put(2, 0, -2, B.FERN);
  } else if (kind === 'nest') {
    // Dinonest (fase 5A): een kring van hooi met drie eieren, tussen de varens
    for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) {
      const d = Math.hypot(x, z);
      if (d > 2.6) continue;
      put(x, -1, z, B.HAY);
      if (d > 1.6) put(x, 0, z, (x + z) % 2 ? B.HAY : AIR);
      else for (let y = 0; y < 3; y++) put(x, y, z, AIR);
    }
    put(0, 0, 0, B.DINO_EGG); put(1, 0, 0, B.DINO_EGG + 1); put(0, 0, 1, B.DINO_EGG + 2);
    put(-1, 0, -1, B.TREASURE);
    for (const [x, z] of [[3, 0], [-3, 1], [0, -3], [2, 2]]) put(x, 0, z, B.FERN);
  } else if (kind === 'dig') {
    // Opgraving (fase 5A): een kuil met een ladder, en fossielen in de wanden en de bodem
    for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) {
      const edge = Math.abs(x) === 3 || Math.abs(z) === 3;
      if (edge) { put(x, 0, z, (x + z) % 2 ? B.FENCE : AIR); continue; }
      for (let y = -4; y <= -1; y++) put(x, y, z, Math.abs(x) === 2 || Math.abs(z) === 2 ? ((x * 3 + y + z * 5) % 4 ? B.STONE : B.FOSSIL) : AIR);
      put(x, -5, z, (x + z) % 3 ? B.GRAVEL : B.FOSSIL);
      for (let y = 0; y < 3; y++) put(x, y, z, AIR);
    }
    for (let y = -4; y <= -1; y++) put(0, y, 1, B.LADDER + 2); // ladder tegen de wand aan de kant +z
    put(0, 0, 3, AIR);
    put(-1, -4, -1, B.FOSSIL); put(1, -4, 0, B.AMBER); put(-1, -4, 1, B.TREASURE);
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
    put(-1, 7, 4, B.TREASURE); // een schat bovenop de rots
  }
  return [...cells.values()];
}

// Afmetingen inclusief ingang/helling; zo komen er geen bomen door een bouwwerk.
export function structureBounds(kind, small = false) {
  if (kind === 'igloo') return [-3, 3, -5, 3];
  if (kind === 'lionRock') return [-4, 4, -3, 5];
  if (kind === 'shipwreck') return [-2, 2, -6, 6];
  if (kind === 'ruin' || kind === 'nest' || kind === 'dig') return [-3, 3, -3, 3];
  const r = kind === 'temple' || small ? 4 : 7;
  return [-r, r, -r, r];
}
