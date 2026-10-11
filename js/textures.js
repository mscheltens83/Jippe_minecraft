// Alle texturen worden hier met code getekend als 16x16 pixel-art.
// Ze komen samen in één "atlas" (een groot plaatje met alle tegeltjes).

import { BLOCKS } from './blocks.js';
import { DEFAULT_TINT } from './engine/tint.js';

export const TILE = 16;
export const ATLAS_COLS = 16;
export const ATLAS_SIZE = TILE * ATLAS_COLS; // 256 px

// Kleine voorspelbare random-generator, zodat de texturen elke keer hetzelfde zijn
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Tile {
  constructor(seed) {
    this.d = new Uint8ClampedArray(TILE * TILE * 4);
    this.r = rng(seed);
  }
  set(x, y, c, a = 255) {
    if (x < 0 || y < 0 || x >= TILE || y >= TILE) return;
    const i = (y * TILE + x) * 4;
    this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2]; this.d[i + 3] = c[3] ?? a;
  }
  get(x, y) {
    const i = (y * TILE + x) * 4;
    return [this.d[i], this.d[i + 1], this.d[i + 2], this.d[i + 3]];
  }
  // Vul met een kleur plus wat ruis
  noise(base, amount) {
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      this.set(x, y, shade(base, 1 + (this.r() - 0.5) * amount));
    }
  }
  specks(color, chance) {
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      if (this.r() < chance) this.set(x, y, shade(color, 1 + (this.r() - 0.5) * 0.1));
    }
  }
  clear() { this.d.fill(0); }
}

function shade(c, f) { return [c[0] * f, c[1] * f, c[2] * f]; }

const GRASS = [96, 172, 62];
const DIRT = [134, 96, 67];
const WOOD = [184, 142, 88];
const BARK = [104, 78, 48];

function dirt(t) {
  t.noise(DIRT, 0.22);
  t.specks([102, 72, 50], 0.12);
  t.specks([158, 118, 84], 0.07);
}

function planks(t) {
  for (let r = 0; r < 4; r++) {
    const f = 0.92 + t.r() * 0.13;
    const seam = r % 2 ? 4 : 11;
    for (let y = r * 4; y < r * 4 + 4; y++) for (let x = 0; x < TILE; x++) {
      let c = shade(WOOD, f * (1 + (t.r() - 0.5) * 0.08));
      if (t.r() < 0.08) c = shade(c, 0.88);
      if (y % 4 === 3 || x === seam) c = shade(WOOD, 0.66);
      t.set(x, y, c);
    }
  }
}

const WOOL = {
  red: [204, 52, 46], orange: [238, 128, 36], yellow: [246, 212, 54], green: [112, 192, 52],
  lightblue: [104, 178, 232], blue: [52, 74, 184], purple: [134, 62, 184], pink: [242, 152, 188],
  white: [236, 236, 236], black: [38, 38, 44],
};

const RAINBOW = [
  [232, 62, 62], [246, 142, 42], [250, 222, 62], [92, 202, 82],
  [62, 202, 212], [72, 112, 232], [152, 82, 212], [242, 122, 192],
];

const GEN = {
  grass_top(t) {
    t.noise(GRASS, 0.25);
    t.specks([72, 142, 46], 0.16);
    t.specks([124, 196, 78], 0.1);
  },
  grass_side(t) {
    dirt(t);
    for (let x = 0; x < TILE; x++) {
      const depth = 3 + (t.r() < 0.5 ? 1 : 0) + (t.r() < 0.2 ? 1 : 0);
      for (let y = 0; y < depth; y++) {
        t.set(x, y, shade(GRASS, (y === 0 ? 1.08 : 1) * (1 + (t.r() - 0.5) * 0.22)));
      }
    }
  },
  dirt,
  stone(t) {
    t.noise([128, 128, 130], 0.14);
    for (let i = 0; i < 7; i++) {
      const x = Math.floor(t.r() * 16), y = Math.floor(t.r() * 16), len = 2 + Math.floor(t.r() * 3);
      for (let k = 0; k < len; k++) t.set(x + k, y, [104, 104, 106]);
    }
    t.specks([150, 150, 152], 0.06);
  },
  cobble(t) {
    // Voronoi-steentjes met donkere voegen
    const pts = [];
    for (let i = 0; i < 8; i++) pts.push([t.r() * 16, t.r() * 16, 0.8 + t.r() * 0.35]);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      let d1 = 99, d2 = 99, cell = 0;
      pts.forEach((p, i) => {
        for (const ox of [-16, 0, 16]) for (const oy of [-16, 0, 16]) {
          const d = Math.hypot(x + 0.5 - p[0] - ox, y + 0.5 - p[1] - oy);
          if (d < d1) { d2 = d1; d1 = d; cell = i; } else if (d < d2) d2 = d;
        }
      });
      if (d2 - d1 < 1.1) t.set(x, y, [74, 74, 76]);
      else t.set(x, y, shade([132, 132, 134], pts[cell][2] * (1 + (t.r() - 0.5) * 0.12)));
    }
  },
  log_side(t) {
    const cols = [];
    for (let x = 0; x < TILE; x++) cols.push(0.85 + t.r() * 0.25);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      let c = shade(BARK, cols[x] * (1 + (t.r() - 0.5) * 0.12));
      if (x % 5 === 2 && t.r() < 0.8) c = shade(BARK, 0.72);
      t.set(x, y, c);
    }
  },
  log_top(t) {
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
      let c;
      if (d > 6.5) c = shade(BARK, 1 + (t.r() - 0.5) * 0.15);
      else c = shade(Math.floor(d) % 2 ? [184, 148, 98] : [162, 126, 80], 1 + (t.r() - 0.5) * 0.08);
      t.set(x, y, c);
    }
  },
  planks,
  leaves(t) {
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      if (t.r() < 0.16) { t.set(x, y, [0, 0, 0, 0]); continue; }
      let c = shade([62, 142, 46], 1 + (t.r() - 0.5) * 0.35);
      if (t.r() < 0.15) c = [42, 106, 32];
      t.set(x, y, c);
    }
  },
  glass(t) {
    t.clear();
    for (let i = 0; i < TILE; i++) {
      t.set(i, 0, [214, 238, 250]); t.set(i, 15, [170, 205, 225]);
      t.set(0, i, [214, 238, 250]); t.set(15, i, [170, 205, 225]);
    }
    for (const [x, y] of [[3, 2], [2, 3], [4, 2], [2, 4], [3, 3], [12, 11], [11, 12], [12, 12]]) t.set(x, y, [255, 255, 255]);
  },
  brick(t) {
    for (let y = 0; y < TILE; y++) {
      const row = Math.floor(y / 4);
      for (let x = 0; x < TILE; x++) {
        const off = row % 2 ? 4 : 0;
        const brick = Math.floor((x + off) / 8) + row * 3;
        if (y % 4 === 3 || (x + off) % 8 === 7) t.set(x, y, shade([184, 174, 164], 1 + (t.r() - 0.5) * 0.08));
        else t.set(x, y, shade([152, 64, 50], (0.9 + ((brick * 37) % 10) / 50) * (1 + (t.r() - 0.5) * 0.14)));
      }
    }
  },
  sand(t) {
    t.noise([222, 210, 152], 0.1);
    t.specks([200, 186, 130], 0.12);
    t.specks([236, 228, 180], 0.08);
  },
  water(t) {
    t.noise([56, 112, 214], 0.1);
    for (let i = 0; i < 6; i++) {
      const y = Math.floor(t.r() * 16), x = Math.floor(t.r() * 16), len = 3 + Math.floor(t.r() * 4);
      for (let k = 0; k < len; k++) t.set((x + k) % 16, y, [100, 156, 238]);
    }
  },
  snow(t) {
    t.noise([242, 246, 252], 0.05);
    t.specks([214, 226, 242], 0.1);
  },
  gold(t) {
    bevel(t, [246, 202, 60], [255, 238, 128], [206, 152, 30]);
    for (const [x, y] of [[4, 4], [5, 3], [11, 9], [10, 10]]) t.set(x, y, [255, 255, 230]);
  },
  diamond(t) {
    bevel(t, [98, 222, 226], [186, 252, 252], [48, 168, 180]);
    for (let i = 0; i < 4; i++) {
      t.set(4 + i, 7 - i, [60, 190, 200]); t.set(8 + i, 4 + i, [60, 190, 200]);
      t.set(4 + i, 8 + i, [60, 190, 200]); t.set(8 + i, 11 - i, [60, 190, 200]);
    }
    for (const [x, y] of [[4, 3], [3, 4], [12, 11]]) t.set(x, y, [255, 255, 255]);
  },
  lamp(t) {
    t.noise([252, 214, 116], 0.12);
    for (let i = 0; i < 10; i++) {
      const x = Math.floor(t.r() * 14), y = Math.floor(t.r() * 14);
      const c = t.r() < 0.5 ? [206, 150, 72] : [255, 248, 200];
      t.set(x, y, c); t.set(x + 1, y, c); t.set(x, y + 1, c);
    }
    for (let i = 0; i < TILE; i++) {
      t.set(i, 0, [200, 146, 70]); t.set(i, 15, [200, 146, 70]);
      t.set(0, i, [200, 146, 70]); t.set(15, i, [200, 146, 70]);
    }
  },
  bookshelf(t) {
    planks(t);
    const cols = [[190, 50, 50], [52, 84, 180], [60, 150, 70], [220, 180, 50], [130, 60, 160], [120, 80, 50], [40, 140, 150]];
    for (const top of [1, 9]) {
      let x = 1;
      while (x < 15) {
        const w = 1 + (t.r() < 0.5 ? 1 : 0);
        const h = 5 + (t.r() < 0.4 ? 1 : 0);
        const c = cols[Math.floor(t.r() * cols.length)];
        for (let bx = x; bx < Math.min(15, x + w); bx++) {
          for (let y = top; y < top + 6; y++) {
            if (y >= top + 6 - h) t.set(bx, y, shade(c, bx === x ? 1.1 : 0.95));
            else t.set(bx, y, [60, 42, 26]);
          }
        }
        x += w;
      }
      for (let y = top; y < top + 6; y++) { t.set(0, y, shade(WOOD, 0.7)); t.set(15, y, shade(WOOD, 0.7)); }
    }
  },
  pumpkin_face(t) {
    pumpkinBase(t);
    const dark = [74, 36, 12];
    // ogen (driehoekjes) en een lachende mond
    for (const ex of [4, 11]) { t.set(ex, 4, dark); for (let x = ex - 1; x <= ex + 1; x++) t.set(x, 5, dark); }
    t.set(3, 9, dark); t.set(12, 9, dark);
    for (let x = 3; x <= 12; x++) t.set(x, 10, dark);
    for (let x = 5; x <= 10; x++) t.set(x, 11, dark);
    t.set(6, 10, [226, 128, 32]); t.set(9, 10, [226, 128, 32]);
  },
  pumpkin_top(t) {
    pumpkinBase(t);
    for (let y = 6; y < 10; y++) for (let x = 6; x < 10; x++) t.set(x, y, shade([104, 122, 44], 1 + (t.r() - 0.5) * 0.2));
  },
  melon_side(t) {
    t.noise([104, 172, 52], 0.12);
    for (let y = 0; y < TILE; y++) {
      for (const sx of [1, 5, 9, 13]) {
        const x = sx + (Math.sin(y * 0.8 + sx) > 0.3 ? 1 : 0);
        t.set(x, y, [52, 112, 32]);
      }
    }
  },
  melon_top(t) {
    t.noise([112, 178, 58], 0.12);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
      if (Math.floor(d) === 3 || Math.floor(d) === 7) t.set(x, y, [60, 120, 36]);
    }
  },
  rainbow(t) {
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      t.set(x, y, shade(RAINBOW[Math.floor(y / 2)], 1 + (t.r() - 0.5) * 0.1));
    }
    for (let i = 0; i < 5; i++) t.set(Math.floor(t.r() * 16), Math.floor(t.r() * 16), [255, 255, 255]);
  },
  rainbow_top(t) {
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      const d = Math.floor(Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)));
      t.set(x, y, shade(RAINBOW[7 - d], 1 + (t.r() - 0.5) * 0.1));
    }
  },
  flower_red(t) {
    t.clear();
    stem(t);
    const red = [222, 42, 42], yel = [250, 222, 62];
    for (let y = 2; y <= 7; y++) for (let x = 5; x <= 10; x++) {
      const d = Math.hypot(x - 7.5, y - 4.5);
      if (d < 3) t.set(x, y, shade(red, 1 + (t.r() - 0.5) * 0.15));
    }
    t.set(7, 4, yel); t.set(8, 4, yel); t.set(7, 5, yel); t.set(8, 5, yel);
  },
  flower_yellow(t) {
    t.clear();
    stem(t);
    for (let y = 2; y <= 7; y++) for (let x = 5; x <= 10; x++) {
      const d = Math.hypot(x - 7.5, y - 4.5);
      if (d < 2.9) t.set(x, y, d < 1.2 ? [232, 176, 20] : shade([252, 216, 42], 1 + (t.r() - 0.5) * 0.15));
    }
  },
  tallgrass(t) {
    t.clear();
    for (let i = 0; i < 7; i++) {
      let x = 1 + t.r() * 13;
      const h = 6 + Math.floor(t.r() * 7);
      const lean = (t.r() - 0.5) * 0.5;
      const c = [[72, 152, 50], [92, 172, 62], [60, 132, 42]][i % 3];
      for (let k = 0; k < h; k++) {
        t.set(Math.round(x), 15 - k, c);
        x += lean;
      }
    }
  },
  bedrock(t) {
    t.noise([84, 84, 86], 0.4);
    t.specks([40, 40, 42], 0.25);
  },
  bounce(t) {
    // groen stuiterblok (net als slijm): lichte rand, donkerder kern, glimmertjes
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      const edge = x === 0 || y === 0 || x === 15 || y === 15;
      const inner = x >= 4 && x <= 11 && y >= 4 && y <= 11;
      const c = edge ? [88, 170, 70] : inner ? [104, 196, 84] : [140, 226, 110];
      t.set(x, y, shade(c, 1 + (t.r() - 0.5) * 0.08));
    }
    for (const [x, y] of [[2, 2], [3, 2], [2, 3], [6, 5], [5, 6]]) t.set(x, y, [214, 255, 196]);
  },
  firework_side(t) {
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      const stripe = (x + y) % 6 < 2;
      t.set(x, y, shade(stripe ? [246, 240, 230] : [212, 44, 54], 1 + (t.r() - 0.5) * 0.08));
    }
    // sterretjes
    for (const [cx, cy] of [[4, 4], [11, 10]]) {
      for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) t.set(cx + dx, cy + dy, [255, 214, 60]);
    }
  },
  firework_top(t) {
    t.noise([180, 36, 44], 0.1);
    for (let i = 0; i < TILE; i++) { t.set(i, 0, [120, 20, 28]); t.set(i, 15, [120, 20, 28]); t.set(0, i, [120, 20, 28]); t.set(15, i, [120, 20, 28]); }
    // lontje in het midden
    for (let y = 5; y < 11; y++) { t.set(7, y, [90, 80, 70]); t.set(8, y, [110, 100, 90]); }
    t.set(7, 4, [255, 210, 60]); t.set(8, 4, [255, 150, 40]); t.set(8, 3, [255, 240, 150]);
  },
  door_lower(t) {
    doorWood(t);
    // paneeltje en deurklink
    for (let x = 4; x <= 11; x++) { t.set(x, 3, shade(WOOD, 0.68)); t.set(x, 12, shade(WOOD, 0.68)); }
    for (let y = 3; y <= 12; y++) { t.set(4, y, shade(WOOD, 0.68)); t.set(11, y, shade(WOOD, 0.68)); }
    t.set(12, 1, [230, 200, 80]); t.set(13, 1, [200, 170, 60]);
  },
  door_upper(t) {
    doorWood(t);
    // raampje met vier ruitjes
    for (let y = 3; y <= 11; y++) for (let x = 3; x <= 12; x++) {
      const bar = x === 3 || x === 12 || y === 3 || y === 11 || x === 7 || x === 8 || y === 7;
      t.set(x, y, bar ? shade(WOOD, 0.7) : [178, 224, 246]);
    }
    t.set(4, 4, [255, 255, 255]); t.set(9, 4, [255, 255, 255]); t.set(4, 8, [240, 250, 255]);
  },
};

const STAINED = {
  red: [224, 64, 64], yellow: [248, 216, 64], green: [96, 196, 76], blue: [72, 116, 232], purple: [156, 84, 214],
};
for (const [name, c] of Object.entries(STAINED)) {
  GEN['glass_' + name] = (t) => {
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      const edge = x === 0 || y === 0 || x === 15 || y === 15;
      t.set(x, y, edge ? shade(c, 0.8) : c, edge ? 235 : 120);
    }
    for (const [x, y] of [[3, 2], [2, 3], [4, 2], [2, 4], [3, 3]]) t.set(x, y, [255, 255, 255], 200);
  };
}

function doorWood(t) {
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
    let c = shade(WOOD, 0.95 * (1 + (t.r() - 0.5) * 0.08));
    if (x % 5 === 0) c = shade(WOOD, 0.78);
    if (x === 0 || x === 15 || y === 0 || y === 15) c = shade(WOOD, 0.6);
    t.set(x, y, c);
  }
}

for (const [name, c] of Object.entries(WOOL)) {
  GEN['wool_' + name] = (t) => {
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      let f = 1 + (t.r() - 0.5) * 0.1;
      if ((x + y) % 4 === 0) f *= 1.06;
      if ((x - y + 16) % 4 === 0) f *= 0.93;
      t.set(x, y, shade(c, name === 'black' ? f * 1.1 : f));
    }
  };
}

// De nieuwe tegels staan achter de oude: hun kleuren blijven bij oude werelden gelijk.
function bark(t, color, moss = false) {
  mcBark(t, color, shade(color, 0.7)); // zelfde stijl als de eik (fase 4E)
  if (moss) t.specks([81, 112, 40], 0.12);
}

function rings(t, wood, rim) {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
    t.set(x, y, d > 6.5 ? rim : shade(wood, Math.floor(d) % 2 ? 0.85 : 1.08));
  }
}

function foliage(t, color, snowy = false) {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (t.r() < 0.13) continue;
    const snow = snowy && y < 3 + (x % 4);
    t.set(x, y, snow ? [233, 244, 250] : shade(color, 0.78 + t.r() * 0.45));
  }
}

Object.assign(GEN, {
  jungle_log_side: (t) => bark(t, [83, 72, 39], true),
  jungle_log_top: (t) => rings(t, [154, 119, 61], [69, 62, 33]),
  jungle_leaves: (t) => foliage(t, [44, 115, 44]),
  vine(t) {
    for (let y = 0; y < 16; y++) {
      const x = 7 + Math.round(Math.sin(y * 0.7) * 2);
      t.set(x, y, [53, 124, 36]); t.set(x + 1, y, [105, 166, 49]);
      if (y % 3 === 0) for (let dx = -2; dx <= 2; dx++) t.set(x + dx, y, [68, 143, 42]);
    }
  },
  bamboo(t) {
    t.noise([131, 181, 76], 0.13);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      if (y === 3 || y === 12) t.set(x, y, [82, 132, 43]);
      else if (x % 5 === 0) t.set(x, y, [162, 204, 97]);
    }
  },
  bamboo_top: (t) => rings(t, [188, 214, 114], [91, 143, 43]),
  fern(t) {
    for (let y = 3; y < 16; y++) {
      t.set(7, y, [92, 171, 46]);
      if (y % 2) for (let dx = 1; dx <= Math.min(6, Math.floor(y / 2)); dx++) {
        t.set(7 - dx, y - dx + 1, [43, 126, 47]); t.set(7 + dx, y - dx + 1, [75, 153, 50]);
      }
    }
  },
  jungle_flower(t) {
    stem(t);
    for (let y = 1; y <= 8; y++) for (let x = 3; x <= 12; x++) {
      const dx = x - 7.5, dy = y - 4.5;
      if (dx * dx + dy * dy < 22) t.set(x, y, x % 3 === 0 ? [239, 125, 57] : [230, 61, 128]);
    }
    for (let x = 6; x <= 9; x++) t.set(x, 4, [255, 219, 78]);
  },
  mossy_cobble(t) { GEN.cobble(t); t.specks([56, 109, 45], 0.26); t.specks([91, 143, 56], 0.1); },
  sandstone(t) {
    t.noise([220, 196, 135], 0.08);
    for (const y of [3, 8, 13]) for (let x = 0; x < 16; x++) t.set(x, y, [195, 168, 109]);
  },
  sandstone_top(t) { t.noise([235, 211, 154], 0.07); t.specks([216, 190, 130], 0.1); },
  carved_sandstone(t) {
    GEN.sandstone_top(t);
    for (let i = 2; i <= 13; i++) {
      t.set(i, 2, [164, 134, 85]); t.set(i, 13, [164, 134, 85]);
      t.set(2, i, [164, 134, 85]); t.set(13, i, [164, 134, 85]);
    }
    for (let y = 5; y < 11; y++) for (let x = 5; x < 11; x++) if ((x + y) % 4 === 0) t.set(x, y, [186, 148, 88]);
  },
  cactus(t) {
    t.noise([64, 139, 59], 0.15);
    for (let x = 2; x < 16; x += 4) for (let y = 0; y < 16; y++) t.set(x, y, [96, 165, 64]);
    for (let y = 3; y < 16; y += 4) for (let x = 3; x < 16; x += 5) t.set(x, y, [215, 214, 144]);
  },
  cactus_top(t) {
    rings(t, [111, 167, 67], [44, 108, 44]);
    for (const [x, y] of [[7, 5], [6, 6], [8, 6], [7, 7]]) t.set(x, y, [243, 111, 157]);
    t.set(7, 6, [255, 219, 78]);
  },
  dead_bush(t) {
    for (let y = 5; y < 16; y++) { t.set(7, y, [138, 100, 58]); t.set(8, y, [113, 77, 40]); }
    for (let i = 0; i < 5; i++) {
      t.set(7 - i, 11 - i, [138, 100, 58]); t.set(8 + i, 9 - i, [157, 114, 65]);
      t.set(5, 7 - i, [138, 100, 58]); t.set(11, 6 - i, [157, 114, 65]);
    }
  },
  palm_log_side(t) {
    t.noise([153, 121, 70], 0.15);
    for (const y of [2, 6, 10, 14]) for (let x = 0; x < 16; x++) t.set(x, y, [111, 82, 42]);
  },
  palm_log_top: (t) => rings(t, [208, 179, 106], [123, 93, 47]),
  palm_leaves: (t) => foliage(t, [73, 172, 63]),
  red_sand(t) { t.noise([201, 114, 61], 0.12); t.specks([230, 146, 81], 0.13); },
  terracotta_orange: (t) => t.noise([192, 109, 64], 0.07),
  terracotta_brown: (t) => t.noise([124, 80, 57], 0.09),
  treasure(t) {
    planks(t);
    for (let y = 0; y < 16; y++) for (const x of [1, 2, 13, 14]) t.set(x, y, [237, 184, 47]);
    for (let x = 0; x < 16; x++) t.set(x, 5, [93, 59, 30]);
    for (let y = 4; y < 9; y++) for (let x = 6; x < 10; x++) t.set(x, y, [255, 218, 85]);
    t.set(7, 6, [87, 61, 31]); t.set(8, 6, [87, 61, 31]);
  },
  treasure_top(t) {
    planks(t);
    for (let y = 0; y < 16; y++) for (const x of [2, 3, 12, 13]) t.set(x, y, [241, 193, 63]);
  },
  treasure_gold(t) { t.noise([193, 134, 32], 0.2); t.specks([255, 224, 82], 0.4); t.specks([255, 251, 201], 0.07); },
  ice(t) {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const stripe = (x + y) % 13 < 2;
      t.set(x, y, stripe ? [229, 247, 255] : [139, 202, 236], stripe ? 220 : 150);
    }
  },
  packed_ice(t) {
    t.noise([151, 202, 230], 0.1);
    for (let y = 0; y < 16; y++) { t.set((4 + Math.floor(y / 3)) % 16, y, [234, 250, 255]); t.set(12 - Math.floor(y / 4), y, [108, 164, 205]); }
  },
  spruce_log_side: (t) => bark(t, [75, 56, 40]),
  spruce_log_top: (t) => rings(t, [152, 120, 83], [66, 46, 31]),
  spruce_leaves: (t) => foliage(t, [39, 92, 77]),
  snowy_leaves: (t) => foliage(t, [39, 92, 77], true),
  dry_grass_top(t) { t.noise([172, 173, 77], 0.18); t.specks([205, 194, 101], 0.15); },
  dry_grass_side(t) {
    GEN.red_dirt(t);
    for (let x = 0; x < 16; x++) for (let y = 0; y < 3 + (x % 3); y++) t.set(x, y, [172, 173, 77]);
  },
  red_dirt(t) { t.noise([155, 91, 57], 0.2); t.specks([118, 65, 41], 0.13); },
  acacia_log_side: (t) => bark(t, [116, 113, 99]),
  acacia_log_top: (t) => rings(t, [200, 128, 73], [97, 99, 85]),
  acacia_leaves: (t) => foliage(t, [113, 141, 58]),
  tall_dry_grass(t) {
    for (let x = 2; x <= 13; x += 3) for (let y = 3 + (x % 4); y < 16; y++) {
      t.set(x + Math.round(Math.sin(y * 0.25) * 2), y, x % 2 ? [201, 184, 93] : [162, 153, 70]);
    }
  },
  termite(t) { GEN.red_dirt(t); t.specks([74, 40, 25], 0.12); },
  mud(t) { t.noise([89, 66, 43], 0.1); t.specks([123, 102, 67], 0.12); t.specks([155, 134, 92], 0.03); },
  hay_side(t) {
    t.noise([209, 179, 69], 0.2);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      if (x % 3 === 0 && t.r() < 0.7) t.set(x, y, [238, 207, 94]);
      if (y === 4 || y === 11) t.set(x, y, [125, 97, 45]);
    }
  },
  hay_top(t) {
    rings(t, [225, 192, 77], [170, 139, 48]);
    for (let i = 0; i < 16; i++) { t.set(4, i, [125, 97, 45]); t.set(11, i, [125, 97, 45]); }
  },
});

// Grote wereld (achteraan, zodat de oude tegels hun kleuren houden)
function ore(t, color) {
  GEN.stone(t);
  const dark = shade(color, 0.7), light = shade(color, 1.18);
  for (let i = 0; i < 5; i++) {
    const cx = 2 + Math.floor(t.r() * 12), cy = 2 + Math.floor(t.r() * 12);
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1], [-1, 0], [0, -1]]) {
      if (t.r() < 0.75) t.set(cx + dx, cy + dy, dx + dy > 0 ? dark : dx + dy < 0 ? light : color);
    }
  }
}

function speckled(t, base, specks) {
  t.noise(base, 0.1);
  for (const [color, chance] of specks) t.specks(color, chance);
}

function petals(t, color, center) {
  t.clear();
  stem(t);
  for (let y = 2; y <= 7; y++) for (let x = 5; x <= 10; x++) {
    const d = Math.hypot(x - 7.5, y - 4.5);
    if (d < 2.8) t.set(x, y, d < 1 ? center : shade(color, 1 + (t.r() - 0.5) * 0.18));
  }
}

function mushroom(t, cap, dots) {
  t.clear();
  for (let y = 9; y < 16; y++) { t.set(7, y, [226, 214, 190]); t.set(8, y, [204, 192, 168]); }
  for (let y = 4; y <= 9; y++) for (let x = 3; x <= 12; x++) {
    const w = y === 4 ? 2 : y === 5 ? 4 : 5;
    if (Math.abs(x - 7.5) <= w) t.set(x, y, shade(cap, 1 + (t.r() - 0.5) * 0.12));
  }
  if (dots) for (const [x, y] of [[5, 6], [9, 5], [11, 8], [7, 8], [4, 8]]) t.set(x, y, [245, 240, 232]);
}

Object.assign(GEN, {
  coal_ore: (t) => ore(t, [44, 44, 46]),
  iron_ore: (t) => ore(t, [216, 175, 147]),
  copper_ore: (t) => ore(t, [206, 112, 72]),
  gold_ore: (t) => ore(t, [250, 214, 60]),
  lapis_ore: (t) => ore(t, [44, 84, 196]),
  redstone_ore: (t) => ore(t, [214, 30, 30]),
  diamond_ore: (t) => ore(t, [92, 232, 226]),
  emerald_ore: (t) => ore(t, [40, 200, 90]),
  granite: (t) => speckled(t, [158, 108, 86], [[[186, 132, 110], 0.18], [[124, 82, 66], 0.12], [[214, 176, 160], 0.04]]),
  diorite: (t) => speckled(t, [196, 196, 196], [[[120, 120, 122], 0.16], [[236, 236, 236], 0.12]]),
  andesite: (t) => speckled(t, [134, 136, 136], [[[108, 110, 110], 0.2], [[164, 166, 166], 0.12]]),
  gravel(t) {
    t.noise([126, 120, 116], 0.12);
    for (let i = 0; i < 26; i++) {
      const x = Math.floor(t.r() * 16), y = Math.floor(t.r() * 16);
      const c = [[90, 86, 84], [160, 154, 150], [118, 100, 88]][i % 3];
      t.set(x, y, c); t.set(x + 1, y, shade(c, 0.9));
    }
  },
  clay: (t) => speckled(t, [160, 166, 178], [[[146, 152, 164], 0.12], [[176, 182, 194], 0.08]]),
  birch_log_side(t) {
    t.noise([218, 216, 206], 0.06);
    for (let i = 0; i < 9; i++) {
      const x = Math.floor(t.r() * 14), y = Math.floor(t.r() * 16), len = 2 + Math.floor(t.r() * 3);
      for (let k = 0; k < len; k++) t.set(x + k, y, [48, 44, 40]);
    }
  },
  birch_log_top: (t) => rings(t, [212, 190, 140], [218, 216, 206]),
  birch_leaves: (t) => foliage(t, [112, 162, 74]),
  mushroom_red: (t) => mushroom(t, [208, 40, 36], true),
  mushroom_brown: (t) => mushroom(t, [150, 110, 80], false),
  lily_pad(t) {
    t.noise([52, 128, 44], 0.12);
    for (let i = 0; i < 16; i++) { t.set(i, i, [36, 100, 32]); t.set(15 - i, i, [36, 100, 32]); }
    t.specks([84, 160, 64], 0.08);
  },
  cornflower: (t) => petals(t, [70, 110, 230], [40, 60, 160]),
  tulip: (t) => petals(t, [240, 110, 150], [250, 220, 90]),
});

function bevel(t, base, light, dark) {
  t.noise(base, 0.06);
  for (let i = 0; i < TILE; i++) {
    t.set(i, 0, light); t.set(0, i, light); t.set(i, 1, shade(light, 0.97)); t.set(1, i, shade(light, 0.97));
    t.set(i, 15, dark); t.set(15, i, dark); t.set(i, 14, shade(dark, 1.05)); t.set(14, i, shade(dark, 1.05));
  }
}

function pumpkinBase(t) {
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
    const rib = x % 4 === 3;
    t.set(x, y, shade(rib ? [204, 108, 22] : [232, 134, 32], 1 + (t.r() - 0.5) * 0.1));
  }
}

function stem(t) {
  const g = [62, 142, 42];
  for (let y = 7; y < 16; y++) { t.set(7, y, g); t.set(8, y, shade(g, 0.85)); }
  t.set(5, 11, g); t.set(6, 11, g); t.set(6, 12, g);
  t.set(10, 12, g); t.set(9, 12, g); t.set(9, 13, g);
}

// Licht en slapen. Fakkels en lantaarns zijn kleine vormen: alleen de kolommen en rijen waar
// het vormpje staat, zie je in de wereld. De rest is voor het plaatje in de kist.
const FLAME = [[255, 246, 170], [255, 214, 80], [250, 150, 40]];
function flame(t, x0, x1, y0, y1) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const edge = x === x0 || x === x1 || y === y0;
    t.set(x, y, FLAME[edge ? 2 : y === y1 ? 1 : 0]);
  }
}
function stick(t, x, y0, y1) {
  for (let y = y0; y <= y1; y++) { t.set(x, y, [138, 102, 58]); t.set(x + 1, y, [104, 74, 40]); }
}
function bedSide(t, color) {
  for (let y = 7; y < 16; y++) for (let x = 0; x < 16; x++) {
    let c;
    if (y <= 11) c = shade(color, (y === 7 ? 1.12 : 1) * (1 + (t.r() - 0.5) * 0.08));
    else if (y <= 13) c = shade([150, 110, 66], 1 + (t.r() - 0.5) * 0.1);
    else c = x <= 1 || x >= 14 ? [110, 80, 46] : [60, 45, 30];
    t.set(x, y, c);
  }
  for (let y = 0; y < 7; y++) for (let x = 0; x < 16; x++) t.set(x, y, color);
}

Object.assign(GEN, {
  torch_side(t) {
    t.clear();
    stick(t, 7, 8, 15);
    flame(t, 6, 9, 4, 7);
    t.set(7, 3, FLAME[2]); t.set(8, 3, FLAME[1]);
  },
  torch_wall(t) {
    t.clear();
    for (const x of [0, 7, 14]) { stick(t, x, 6, 12); flame(t, x, x + 1, 3, 5); }
  },
  torch_top(t) { t.noise([255, 206, 70], 0.12); },
  lantern_side(t) {
    t.clear();
    const metal = [52, 54, 64], glow = [255, 212, 96];
    for (let y = 0; y <= 5; y++) { t.set(7, y, y % 2 ? [92, 94, 104] : metal); t.set(8, y, y % 2 ? metal : [92, 94, 104]); }
    for (let y = 6; y <= 8; y++) for (let x = 6; x <= 9; x++) t.set(x, y, metal);
    for (let y = 9; y <= 15; y++) for (let x = 5; x <= 10; x++) {
      const frame = x === 5 || x === 10 || y === 9 || y === 15;
      t.set(x, y, frame ? metal : (x === 7 || x === 8) && y >= 11 && y <= 13 ? [255, 248, 200] : glow);
    }
  },
  lantern_top(t) { t.noise([52, 54, 64], 0.08); for (let i = 6; i <= 9; i++) t.set(i, 7, [92, 94, 104]); },
  glowstone(t) {
    t.noise([214, 168, 84], 0.14);
    for (let i = 0; i < 14; i++) {
      const x = Math.floor(t.r() * 15), y = Math.floor(t.r() * 15);
      const c = t.r() < 0.6 ? [255, 238, 168] : [255, 214, 120];
      t.set(x, y, c); t.set(x + 1, y, c); t.set(x, y + 1, c);
    }
    t.specks([150, 102, 48], 0.07);
  },
  jack_o_lantern(t) {
    pumpkinBase(t);
    const lit = [255, 224, 96], hot = [255, 248, 190];
    for (const ex of [4, 11]) { t.set(ex, 4, lit); for (let x = ex - 1; x <= ex + 1; x++) t.set(x, 5, lit); t.set(ex, 5, hot); }
    t.set(3, 9, lit); t.set(12, 9, lit);
    for (let x = 3; x <= 12; x++) t.set(x, 10, x > 4 && x < 11 ? hot : lit);
    for (let x = 5; x <= 10; x++) t.set(x, 11, lit);
  },
  campfire(t) {
    t.clear();
    for (let y = 2; y <= 11; y++) {
      const w = Math.round((y - 1) * 0.55 + (t.r() - 0.5));
      for (let x = 8 - w; x < 8 + w; x++) {
        const d = Math.abs(x - 7.5) / Math.max(1, w);
        t.set(x, y, FLAME[d > 0.7 || y < 4 ? 2 : d > 0.35 ? 1 : 0]);
      }
    }
    for (let y = 12; y <= 15; y++) for (let x = 1; x <= 14; x++) {
      const log = y === 12 || y === 15 ? [92, 66, 40] : [128, 92, 54];
      t.set(x, y, (x + y) % 5 === 0 ? [60, 42, 26] : log);
    }
    t.set(5, 13, [255, 150, 40]); t.set(10, 14, [255, 150, 40]);
  },
  bed_pillow(t) {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const rim = x === 0 || y === 0 || x === 15 || y === 15;
      const seam = x === 1 || y === 1 || x === 14 || y === 14;
      t.set(x, y, rim ? [150, 110, 66] : seam ? [200, 200, 204] : shade([244, 244, 240], 1 + (t.r() - 0.5) * 0.05));
    }
  },
});
for (const [name, color] of Object.entries(WOOL)) GEN['bed_' + name] = (t) => bedSide(t, color);


// ---------- Minecraft-stijl (fase 4E) ----------
// Elke tegel gebruikt een klein palet (3 tot 5 kleuren) en herkenbare vormen in plaats van ruis.
// Ze vervangen de oude tekeningen op dezelfde plek in de atlas.

// Kies per pixel een kleur uit het palet, met de kansen in `w` (samen 1)
function paletteNoise(t, pal, w) {
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
    let r = t.r(), i = 0;
    while (i < w.length - 1 && r > w[i]) { r -= w[i]; i++; }
    t.set(x, y, pal[i]);
  }
}
// Een klein plukje (blob) van een kleur
function blob(t, x, y, c, n = 3) {
  for (let k = 0; k < n; k++) { t.set(x, y, c); if (t.r() < 0.5) x = (x + 1) % 16; else y = (y + 1) % 16; }
}

const DIRT_PAL = [[134, 96, 67], [116, 83, 57], [96, 68, 46], [151, 110, 78]];
function mcDirt(t) {
  paletteNoise(t, DIRT_PAL, [0.5, 0.22, 0.12, 0.16]);
  for (let i = 0; i < 5; i++) blob(t, Math.floor(t.r() * 16), Math.floor(t.r() * 16), [148, 128, 106], 2);
}
function mcStone(t) {
  paletteNoise(t, [[127, 127, 127], [118, 118, 118], [136, 136, 136]], [0.6, 0.22, 0.18]);
  for (let i = 0; i < 9; i++) {
    const x = Math.floor(t.r() * 16), y = Math.floor(t.r() * 16), len = 2 + Math.floor(t.r() * 3);
    for (let k = 0; k < len; k++) t.set((x + k) % 16, y, i % 3 ? [104, 104, 104] : [148, 148, 148]);
    if (i % 3) t.set(x, (y + 1) % 16, [110, 110, 110]);
  }
}
function mcPlanks(t, base = [162, 130, 78]) {
  const dark = shade(base, 0.84), light = shade(base, 1.12), gap = shade(base, 0.64);
  for (let b = 0; b < 4; b++) {
    const seam = [3, 11, 6, 13][b];
    for (let y = b * 4; y < b * 4 + 4; y++) for (let x = 0; x < 16; x++) {
      let c = t.r() < 0.07 ? light : t.r() < 0.05 ? dark : base;
      if (y % 4 === 3) c = gap;
      else if (x === seam) c = gap;
      t.set(x, y, c);
    }
    // nerf: een paar korte donkere streepjes
    for (let k = 0; k < 2; k++) {
      const x = Math.floor(t.r() * 12), y = b * 4 + Math.floor(t.r() * 3);
      for (let i = 0; i < 3; i++) if (x + i !== seam) t.set(x + i, y, dark);
    }
  }
}
function mcBark(t, base, groove) {
  for (let x = 0; x < 16; x++) {
    const col = x % 4 === 1 ? groove : (x % 4 === 3 ? shade(base, 0.9) : base);
    for (let y = 0; y < 16; y++) {
      let c = col;
      if (x % 4 === 1 && t.r() < 0.18) c = base;           // onderbroken groef
      else if (x % 4 !== 1 && t.r() < 0.1) c = shade(base, 1.1);
      t.set(x, y, c);
    }
  }
}
function mcLeaves(t, base, holes = 0.14) {
  const dark = shade(base, 0.74), light = shade(base, 1.18);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.set(x, y, t.r() < 0.25 ? dark : t.r() < 0.2 ? light : base);
  // gaatjes in plukjes van 1 tot 3 pixels
  for (let i = 0; i < 256 * holes / 2; i++) blob(t, Math.floor(t.r() * 16), Math.floor(t.r() * 16), [0, 0, 0, 0], 1 + Math.floor(t.r() * 3));
}
function mcWool(t, c) {
  const light = shade(c, 1.07), dark = shade(c, 0.9);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    // geweven: schuine streepjes, om en om
    const k = (x + 2 * y) % 4, l = (x - 2 * y + 64) % 4;
    t.set(x, y, k === 0 ? light : l === 0 ? dark : c);
  }
}

Object.assign(GEN, {
  dirt: mcDirt,
  grass_top(t) {
    paletteNoise(t, [[104, 168, 64], [92, 152, 56], [116, 182, 72], [82, 140, 50]], [0.45, 0.25, 0.18, 0.12]);
    for (let i = 0; i < 10; i++) { const x = Math.floor(t.r() * 16), y = Math.floor(t.r() * 15); t.set(x, y, [124, 192, 78]); t.set(x, y + 1, [92, 152, 56]); }
  },
  grass_side(t) {
    mcDirt(t);
    // de grasrand hangt over de zijkant, met druppels van verschillende lengte
    const drip = [3, 4, 3, 5, 4, 3, 3, 6, 4, 3, 5, 3, 4, 4, 3, 5];
    for (let x = 0; x < 16; x++) {
      const len = drip[(x * 7 + Math.floor(t.r() * 2)) % 16];
      for (let y = 0; y < len; y++) t.set(x, y, y === len - 1 ? [86, 144, 52] : t.r() < 0.3 ? [116, 182, 72] : [104, 168, 64]);
    }
  },
  stone: mcStone,
  planks: (t) => mcPlanks(t),
  log_side: (t) => mcBark(t, [109, 85, 50], [78, 60, 34]),
  leaves: (t) => mcLeaves(t, [72, 150, 52]),
  jungle_leaves: (t) => mcLeaves(t, [50, 128, 40], 0.1),
  birch_leaves: (t) => mcLeaves(t, [112, 162, 74]),
  spruce_leaves: (t) => mcLeaves(t, [44, 96, 74], 0.1),
  acacia_leaves: (t) => mcLeaves(t, [118, 146, 58]),
  palm_leaves: (t) => mcLeaves(t, [80, 170, 66], 0.16),
  sand(t) {
    paletteNoise(t, [[219, 207, 163], [207, 193, 146], [230, 221, 182], [196, 180, 132]], [0.55, 0.2, 0.15, 0.1]);
  },
  snow(t) {
    paletteNoise(t, [[245, 250, 255], [232, 240, 250], [252, 254, 255]], [0.6, 0.22, 0.18]);
  },
  water(t) {
    paletteNoise(t, [[60, 110, 210], [54, 100, 198], [66, 118, 220]], [0.6, 0.25, 0.15]);
    // golfjes: korte lichte streepjes, telkens een rij lager iets verschoven
    for (let y = 1; y < 16; y += 3) {
      const x0 = (y * 5) % 16;
      for (let k = 0; k < 5; k++) t.set((x0 + k) % 16, y + (k > 1 && k < 4 ? -1 : 0), [116, 162, 240]);
    }
  },
});
for (const [name, c] of Object.entries(WOOL)) GEN['wool_' + name] = (t) => mcWool(t, name === 'black' ? shade(c, 1.15) : c);

// ---------- Blokken en bouwen (fase 4F) ----------

// De 16 kleuren van Minecraft. De eerste 10 wolkleuren bestonden al (WOOL), deze 6 komen erbij.
export const NEW_WOOL = { magenta: [190, 70, 190], gray: [72, 76, 82], lightgray: [156, 156, 150], cyan: [22, 150, 160], brown: [118, 76, 44], darkgreen: [84, 110, 28] };
export const COLOR_RGB = {
  white: WOOL.white, orange: WOOL.orange, magenta: NEW_WOOL.magenta, lightblue: WOOL.lightblue, yellow: WOOL.yellow,
  lime: WOOL.green, pink: WOOL.pink, gray: NEW_WOOL.gray, lightgray: NEW_WOOL.lightgray, cyan: NEW_WOOL.cyan,
  purple: WOOL.purple, blue: WOOL.blue, brown: NEW_WOOL.brown, green: NEW_WOOL.darkgreen, red: WOOL.red, black: WOOL.black,
};
const NEW_GLASS = ['white', 'orange', 'magenta', 'lightblue', 'pink', 'gray', 'lightgray', 'cyan', 'brown', 'green', 'black'];
const mixRGB = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

function concrete(t, c) { paletteNoise(t, [c, shade(c, 0.96), shade(c, 1.04)], [0.7, 0.15, 0.15]); }
function terracotta(t, c) {
  const base = mixRGB(c, [150, 92, 66], 0.45);
  paletteNoise(t, [base, shade(base, 0.94), shade(base, 1.05)], [0.7, 0.15, 0.15]);
}
function stained(t, c) {
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
    const edge = x === 0 || y === 0 || x === 15 || y === 15;
    t.set(x, y, edge ? shade(c, 0.8) : c, edge ? 235 : 120);
  }
  for (const [x, y] of [[3, 2], [2, 3], [4, 2], [2, 4], [3, 3]]) t.set(x, y, [255, 255, 255], 200);
}
function smoothBlock(t, base) {
  paletteNoise(t, [base, shade(base, 0.97), shade(base, 1.03)], [0.7, 0.15, 0.15]);
  for (let i = 0; i < 16; i++) { t.set(i, 0, shade(base, 1.08)); t.set(0, i, shade(base, 1.08)); t.set(i, 15, shade(base, 0.85)); t.set(15, i, shade(base, 0.85)); }
}
function stoneBricks(t, extra) {
  mcStone(t);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const row = Math.floor(y / 8), off = row ? 4 : 12;
    if (y % 8 === 7 || (x + off) % 16 === 15 || (x + off) % 8 === 7 && row === 0 && x > 8) t.set(x, y, [88, 88, 90]);
  }
  if (extra) extra(t);
}
function metalBlock(t, c) {
  bevel(t, c, shade(c, 1.25), shade(c, 0.7));
  for (let i = 3; i <= 12; i++) { t.set(i, 4, shade(c, 0.85)); t.set(i, 11, shade(c, 1.12)); }
}
// Deur in een houtkleur
function door(t, base, upper) {
  const dark = shade(base, 0.68);
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
    let c = shade(base, 0.95 * (1 + (t.r() - 0.5) * 0.08));
    if (x % 5 === 0) c = shade(base, 0.8);
    if (x === 0 || x === 15 || y === 0 || y === 15) c = shade(base, 0.6);
    t.set(x, y, c);
  }
  if (upper) {
    for (let y = 3; y <= 11; y++) for (let x = 3; x <= 12; x++) {
      const bar = x === 3 || x === 12 || y === 3 || y === 11 || x === 7 || x === 8 || y === 7;
      t.set(x, y, bar ? dark : [178, 224, 246]);
    }
  } else {
    for (let x = 4; x <= 11; x++) { t.set(x, 3, dark); t.set(x, 12, dark); }
    for (let y = 3; y <= 12; y++) { t.set(4, y, dark); t.set(11, y, dark); }
    t.set(12, 1, [230, 200, 80]); t.set(13, 1, [200, 170, 60]);
  }
}
// Tegel een kwartslag gedraaid (voor liggende stammen)
function rotated(src) {
  return (t) => {
    src(t);
    const d = new Uint8ClampedArray(t.d);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      const i = (y * TILE + x) * 4, j = ((15 - x) * TILE + y) * 4;
      t.d[i] = d[j]; t.d[i + 1] = d[j + 1]; t.d[i + 2] = d[j + 2]; t.d[i + 3] = d[j + 3];
    }
  };
}
function crop(t, stage, top) {
  t.clear();
  const h = 4 + stage * 3, stem = [82, 150, 44];
  for (const x of [2, 5, 9, 12]) for (let y = 15; y > 15 - h; y--) t.set(x + (y % 3 === 0 ? 1 : 0), y, y % 4 ? stem : shade(stem, 0.85));
  if (stage === 3 && top) for (const x of [2, 5, 9, 12]) for (let y = 16 - h; y < 19 - h; y++) { t.set(x, y, top); t.set(x + 1, y, shade(top, 0.85)); }
}

// Portaalsteen (fase 4H): donkere steenblokken met een gloeiende steen in de kleur van de wereld,
// en het portaal zelf: golvend licht, kringen rond het midden, een beetje doorzichtig
function portalTiles(list) {
  return Object.fromEntries(list.flatMap(([key, c]) => [
    ['portal_stone_' + key, (t) => {
      paletteNoise(t, [[44, 40, 58], [56, 50, 72], [34, 30, 46]], [0.5, 0.3, 0.2]);
      for (let i = 0; i < 16; i++) { t.set(i, 0, [24, 20, 32]); t.set(0, i, [24, 20, 32]); t.set(i, 8, [28, 24, 38]); }
      for (let y = 5; y < 11; y++) for (let x = 5; x < 11; x++) {
        const d = Math.abs(x - 7.5) + Math.abs(y - 7.5);
        if (d < 3.6) t.set(x, y, shade(c, d < 1.6 ? 1.15 : 0.85));
      }
    }],
    ['portal_' + key, (t) => {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const r = Math.hypot(x - 7.5, y - 7.5), a = Math.atan2(y - 7.5, x - 7.5);
        const swirl = 0.5 + 0.5 * Math.sin(r * 1.3 + a * 2 + t.r() * 0.6);
        t.set(x, y, shade(c, 0.55 + swirl * 0.6), 150 + Math.floor(swirl * 80));
      }
    }],
  ]));
}

const WOODS4 = { birch: [196, 178, 120], spruce: [116, 86, 52], jungle: [160, 116, 80], acacia: [168, 90, 50] };
Object.assign(GEN, {
  polished_granite: (t) => smoothBlock(t, [160, 108, 86]),
  polished_diorite: (t) => smoothBlock(t, [200, 200, 202]),
  polished_andesite: (t) => smoothBlock(t, [132, 136, 136]),
  stone_bricks: (t) => stoneBricks(t),
  mossy_stone_bricks: (t) => stoneBricks(t, (tt) => { for (let i = 0; i < 30; i++) blob(tt, Math.floor(tt.r() * 16), Math.floor(tt.r() * 16), [86, 116, 52], 2); }),
  cracked_stone_bricks: (t) => stoneBricks(t, (tt) => { let x = 3, y = 1; for (let i = 0; i < 14; i++) { tt.set(x, y, [70, 70, 72]); x += tt.r() < 0.5 ? 1 : 0; y++; } }),
  smooth_stone: (t) => smoothBlock(t, [160, 160, 160]),
  quartz: (t) => { smoothBlock(t, [236, 230, 222]); for (let i = 2; i < 14; i += 4) for (let x = 2; x < 14; x++) t.set(x, i, [224, 218, 210]); },
  obsidian: (t) => { paletteNoise(t, [[20, 16, 32], [32, 22, 52], [14, 10, 22], [56, 40, 86]], [0.5, 0.25, 0.17, 0.08]); },
  iron_block: (t) => metalBlock(t, [216, 216, 216]),
  copper_block: (t) => metalBlock(t, [196, 108, 72]),
  emerald_block: (t) => metalBlock(t, [42, 196, 96]),
  lapis_block: (t) => metalBlock(t, [38, 74, 168]),
  // Portaalsteen (fase 4H): donkere steenblokken met een gloeiende steen in de kleur van de wereld
  ...portalTiles([['green', [76, 214, 96]], ['yellow', [246, 214, 72]], ['white', [236, 244, 255]], ['orange', [246, 148, 52]]]),
  sea_lantern: (t) => {
    paletteNoise(t, [[186, 222, 214], [212, 236, 230], [160, 204, 196]], [0.5, 0.3, 0.2]);
    for (let i = 0; i < 16; i++) { t.set(i, i, [240, 252, 248]); t.set(15 - i, i, [240, 252, 248]); }
  },
  crafting_table_top: (t) => { mcPlanks(t); for (let i = 1; i < 15; i++) { t.set(i, 1, [96, 66, 36]); t.set(i, 14, [96, 66, 36]); t.set(1, i, [96, 66, 36]); t.set(14, i, [96, 66, 36]); t.set(i, 7, [120, 86, 50]); t.set(7, i, [120, 86, 50]); } },
  crafting_table_side: (t) => {
    mcPlanks(t);
    for (let y = 2; y < 9; y++) t.set(4, y, [92, 70, 44]);          // hamer
    for (let x = 2; x < 7; x++) t.set(x, 2, [140, 140, 150]);
    for (let y = 2; y < 9; y++) t.set(11, y, [92, 70, 44]);         // zaag
    for (let y = 3; y < 8; y++) t.set(12, y, [170, 170, 180]);
  },
  furnace_side: (t) => { GEN.cobble(t); },
  furnace_top: (t) => smoothBlock(t, [118, 118, 118]),
  furnace_front: (t) => { GEN.cobble(t); for (let y = 8; y < 13; y++) for (let x = 4; x < 12; x++) t.set(x, y, [36, 36, 38]); for (let x = 4; x < 12; x++) t.set(x, 7, [90, 90, 92]); },
  furnace_front_lit: (t) => { GEN.cobble(t); for (let y = 8; y < 13; y++) for (let x = 4; x < 12; x++) t.set(x, y, y > 10 ? [255, 160, 40] : [255, 214, 90]); for (let x = 4; x < 12; x++) t.set(x, 7, [90, 90, 92]); },
  chest_side: (t) => { mcPlanks(t, [176, 126, 60]); for (let i = 0; i < 16; i++) { t.set(i, 5, [70, 46, 24]); t.set(0, i, [96, 66, 36]); t.set(15, i, [96, 66, 36]); } },
  chest_front: (t) => { GEN.chest_side(t); for (let y = 4; y <= 7; y++) for (let x = 7; x <= 8; x++) t.set(x, y, [210, 210, 220]); },
  chest_top: (t) => { mcPlanks(t, [176, 126, 60]); for (let i = 0; i < 16; i++) { t.set(i, 0, [96, 66, 36]); t.set(i, 15, [96, 66, 36]); t.set(0, i, [96, 66, 36]); t.set(15, i, [96, 66, 36]); } },
  ladder: (t) => {
    t.clear();
    for (let y = 0; y < 16; y++) { t.set(2, y, [128, 94, 54]); t.set(3, y, [104, 76, 42]); t.set(12, y, [128, 94, 54]); t.set(13, y, [104, 76, 42]); }
    for (const y of [2, 6, 10, 14]) for (let x = 4; x < 12; x++) t.set(x, y, x % 2 ? [140, 104, 60] : [120, 88, 50]);
  },
  flower_pot: (t) => { paletteNoise(t, [[150, 76, 54], [136, 66, 46], [164, 86, 62]], [0.6, 0.2, 0.2]); for (let i = 0; i < 16; i++) t.set(i, 9, [110, 54, 38]); },
  jukebox_side: (t) => { mcPlanks(t, [120, 80, 56]); for (let i = 0; i < 16; i++) { t.set(i, 0, [80, 52, 36]); t.set(i, 15, [80, 52, 36]); } },
  jukebox_top: (t) => { GEN.jukebox_side(t); for (let x = 3; x < 13; x++) for (let y = 6; y < 10; y++) t.set(x, y, [40, 30, 26]); },
  cake_top: (t) => { paletteNoise(t, [[248, 244, 240], [236, 232, 228]], [0.8, 0.2]); for (const [x, y] of [[3, 4], [10, 3], [7, 8], [12, 11], [4, 12]]) t.set(x, y, [220, 40, 40]); },
  cake_side: (t) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.set(x, y, y < 9 ? [250, 246, 242] : y < 10 ? [220, 40, 40] : [196, 140, 90]);
    for (let x = 0; x < 16; x += 3) t.set(x, 9 - (x % 2), [250, 246, 242]);
  },
  cake_inner: (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.set(x, y, y < 9 ? [250, 246, 242] : (x + y) % 5 ? [230, 190, 140] : [220, 60, 60]); },
  sunflower_bottom: (t) => { t.clear(); for (let y = 0; y < 16; y++) { t.set(7, y, [70, 140, 40]); t.set(8, y, [58, 120, 34]); } for (let x = 3; x < 7; x++) t.set(x, 8 + (6 - x), [80, 160, 50]); for (let x = 9; x < 13; x++) t.set(x, 4 + (x - 9), [80, 160, 50]); },
  sunflower_top: (t) => {
    t.clear();
    for (let y = 8; y < 16; y++) { t.set(7, y, [70, 140, 40]); t.set(8, y, [58, 120, 34]); }
    for (let y = 1; y < 10; y++) for (let x = 3; x < 13; x++) {
      const d = Math.hypot(x - 7.5, y - 5);
      if (d < 4.6) t.set(x, y, d < 2.2 ? [110, 70, 30] : [250, 210, 40]);
    }
  },
  sugar_cane: (t) => { t.clear(); for (const x0 of [3, 8, 12]) for (let y = 0; y < 16; y++) { t.set(x0, y, y % 5 === 0 ? [150, 200, 110] : [120, 180, 80]); t.set(x0 + 1, y, [96, 156, 64]); } },
  seaweed: (t) => { t.clear(); for (const x0 of [4, 10]) for (let y = 0; y < 16; y++) t.set(x0 + Math.round(Math.sin(y * 0.6 + x0) * 1.5), y, y % 3 ? [52, 140, 60] : [74, 170, 80]); },
  coral_red: (t) => { t.clear(); for (const [x, h] of [[3, 9], [6, 13], [9, 11], [12, 8]]) for (let y = 16 - h; y < 16; y++) { t.set(x, y, [230, 70, 90]); if (y % 3 === 0) t.set(x + 1, y, [250, 110, 120]); } },
  coral_yellow: (t) => { t.clear(); for (const [x, h] of [[3, 10], [7, 12], [11, 9]]) for (let y = 16 - h; y < 16; y++) { t.set(x, y, [240, 210, 60]); t.set(x + 1, y, y % 2 ? [250, 230, 100] : [220, 190, 40]); } },
  coral_blue: (t) => { t.clear(); for (const [x, h] of [[2, 8], [5, 12], [9, 13], [13, 9]]) for (let y = 16 - h; y < 16; y++) { t.set(x, y, [60, 110, 230]); if (y % 4 === 1) { t.set(x - 1, y, [90, 140, 250]); t.set(x + 1, y, [90, 140, 250]); } } },
  farmland: (t) => { paletteNoise(t, [[96, 62, 38], [82, 52, 32], [110, 72, 44]], [0.6, 0.2, 0.2]); for (let y = 1; y < 16; y += 4) for (let x = 0; x < 16; x++) t.set(x, y, [66, 42, 26]); },
});
for (let s = 0; s < 4; s++) {
  GEN['wheat_' + s] = (t) => crop(t, s, [222, 190, 90]);
  GEN['carrots_' + s] = (t) => crop(t, s, [240, 130, 30]);
  GEN['potatoes_' + s] = (t) => crop(t, s, [200, 170, 100]);
}
for (const [name, c] of Object.entries(NEW_WOOL)) GEN['wool_' + name] = (t) => mcWool(t, c);
for (const [name, c] of Object.entries(COLOR_RGB)) {
  GEN['concrete_' + name] = (t) => concrete(t, c);
  GEN['terracotta_' + name] = (t) => terracotta(t, c);
}
for (const name of NEW_GLASS) GEN['glass_' + name] = (t) => stained(t, COLOR_RGB[name]);
for (const [name, c] of Object.entries(WOODS4)) {
  GEN[name + '_planks'] = (t) => mcPlanks(t, c);
  GEN['door_lower_' + name] = (t) => door(t, c, false);
  GEN['door_upper_' + name] = (t) => door(t, c, true);
}
for (const log of ['log_side', 'birch_log_side', 'spruce_log_side', 'jungle_log_side', 'acacia_log_side']) GEN[log + '_r'] = rotated(GEN[log]);

// Rails: twee ijzeren staven op houten bielzen. corner: [x, y] van de hoek waar een bocht omheen loopt
function railTile(t, corner) {
  t.clear();
  const wood = [124, 88, 52], woodDark = [96, 66, 38], iron = [168, 170, 178], ironDark = [110, 112, 120];
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    let along, across; // positie langs het spoor (0..) en dwars erop (0 = midden)
    if (corner === null) { along = y; across = x - 7.5; }
    else if (corner === 'ew') { along = x; across = y - 7.5; }
    else { const r = Math.hypot(x + 0.5 - corner[0], y + 0.5 - corner[1]); along = Math.atan2(y + 0.5 - corner[1], x + 0.5 - corner[0]) * 8 * 1.3; across = r - 8; }
    const a = Math.abs(across);
    if (a >= 4 && a < 5.6) t.set(x, y, a < 4.8 ? iron : ironDark);            // de staven
    else if (a < 7 && ((Math.floor(along) % 4) + 4) % 4 < 2) t.set(x, y, a > 6 ? woodDark : wood); // bielzen
  }
}

// ---------- Dinowereld (fase 5A) ----------
function egg(t, base, spots) {
  t.clear();
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const d = Math.hypot((x - 7.5) / 6.5, (y - 9) / 7.5);
    if (d > 1) continue;
    t.set(x, y, shade(base, 1.12 - d * 0.25 + (t.r() - 0.5) * 0.06));
  }
  for (let i = 0; i < 9; i++) {
    const x = 3 + Math.floor(t.r() * 10), y = 3 + Math.floor(t.r() * 12);
    if (t.get(x, y)[3]) { t.set(x, y, spots); if (t.get(x + 1, y)[3]) t.set(x + 1, y, spots); }
  }
}
Object.assign(GEN, {
  basalt_side(t) {
    paletteNoise(t, [[72, 72, 78], [58, 58, 64], [86, 86, 92]], [0.5, 0.3, 0.2]);
    for (let x = 0; x < 16; x += 4) for (let y = 0; y < 16; y++) t.set(x, y, [44, 44, 50]); // zuilen
  },
  basalt_top(t) {
    paletteNoise(t, [[78, 78, 84], [64, 64, 70], [90, 90, 96]], [0.5, 0.3, 0.2]);
    for (let i = 0; i < 16; i++) { t.set(i, 7, [48, 48, 54]); t.set(7, i, [48, 48, 54]); t.set(i, 15, [48, 48, 54]); t.set(15, i, [48, 48, 54]); }
  },
  magma(t) {
    paletteNoise(t, [[120, 40, 20], [150, 54, 22], [96, 30, 18]], [0.5, 0.3, 0.2]);
    for (let i = 0; i < 7; i++) {
      let x = Math.floor(t.r() * 16), y = Math.floor(t.r() * 16);
      for (let k = 0; k < 7; k++) { t.set(x, y, k % 3 ? [255, 150, 40] : [255, 210, 90]); x = (x + (t.r() < 0.5 ? 1 : 15)) % 16; y = (y + 1) % 16; }
    }
  },
  moss(t) {
    paletteNoise(t, [[88, 120, 44], [76, 106, 38], [104, 136, 52], [66, 92, 34]], [0.45, 0.25, 0.18, 0.12]);
    for (let i = 0; i < 8; i++) blob(t, Math.floor(t.r() * 16), Math.floor(t.r() * 16), [118, 150, 60], 2);
  },
  tree_fern_log_side(t) {
    mcBark(t, [96, 74, 46], [62, 46, 28]);
    for (let y = 1; y < 16; y += 4) for (let x = 0; x < 16; x++) if ((x + y) % 3) t.set(x, y, [74, 98, 42]); // oude bladvoeten
  },
  tree_fern_log_top: (t) => rings(t, [146, 112, 66], [76, 58, 34]),
  tree_fern_leaves(t) {
    t.clear();
    for (let k = 0; k < 4; k++) {
      const y0 = 1 + k * 4;
      for (let x = 0; x < 16; x++) {
        t.set(x, y0 + 1, [56, 128, 44]);
        if (x % 2 === 0) { t.set(x, y0, [86, 160, 58]); t.set(x, y0 + 2, [44, 106, 38]); }
      }
    }
  },
  araucaria_log_side: (t) => mcBark(t, [118, 86, 60], [80, 58, 40]),
  araucaria_log_top: (t) => rings(t, [176, 132, 88], [92, 66, 44]),
  araucaria_leaves: (t) => mcLeaves(t, [46, 96, 58], 0.12),
  giant_fern_bottom(t) {
    t.clear();
    for (let y = 0; y < 16; y++) { t.set(7, y, [70, 132, 44]); t.set(8, y, [58, 112, 38]); }
    for (let y = 2; y < 16; y += 3) for (let dx = 1; dx <= 6; dx++) { t.set(7 - dx, y - (dx >> 1), [52, 128, 44]); t.set(8 + dx, y - (dx >> 1), [70, 150, 52]); }
  },
  giant_fern_top(t) {
    t.clear();
    for (let y = 4; y < 16; y++) { t.set(7, y, [70, 132, 44]); t.set(8, y, [58, 112, 38]); }
    for (let y = 3; y < 16; y += 3) for (let dx = 1; dx <= Math.min(7, 2 + (y >> 1)); dx++) { t.set(7 - dx, y + (dx >> 1), [52, 128, 44]); t.set(8 + dx, y + (dx >> 1), [70, 150, 52]); }
  },
  horsetail(t) {
    t.clear();
    for (const x0 of [3, 8, 12]) {
      const h = x0 === 8 ? 15 : 11;
      for (let y = 16 - h; y < 16; y++) { t.set(x0, y, y % 3 === 0 ? [40, 70, 30] : [96, 150, 60]); if (y % 3 === 1) { t.set(x0 - 1, y, [118, 170, 72]); t.set(x0 + 1, y, [118, 170, 72]); } }
    }
  },
  fossil(t) {
    GEN.stone(t);
    const bone = [232, 224, 200], dark = [196, 186, 160];
    for (let x = 3; x < 13; x++) { t.set(x, 8, bone); t.set(x, 9, dark); }        // ruggengraat
    for (const x of [4, 7, 10]) for (let y = 4; y < 13; y++) if (y !== 8 && y !== 9) t.set(x, y, y < 8 ? bone : dark); // ribben
    for (let y = 6; y < 11; y++) { t.set(13, y, bone); t.set(14, y, bone); }      // kop
  },
  amber(t) {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const edge = x === 0 || y === 0 || x === 15 || y === 15;
      t.set(x, y, edge ? [196, 110, 20] : shade([238, 160, 40], 0.9 + t.r() * 0.2), edge ? 255 : 190);
    }
    t.set(7, 7, [60, 40, 20]); t.set(8, 7, [60, 40, 20]); t.set(6, 6, [90, 70, 50]); t.set(9, 6, [90, 70, 50]); // een muggetje
  },
  // Rails (fase 5D): bovenaan is noord (-z), rechts is oost (+x)
  rail_ns: (t) => railTile(t, null),
  rail_ew: (t) => railTile(t, 'ew'),
  rail_c0: (t) => railTile(t, [16, 0]),
  rail_c1: (t) => railTile(t, [16, 16]),
  rail_c2: (t) => railTile(t, [0, 16]),
  rail_c3: (t) => railTile(t, [0, 0]),
  rail_side: (t) => t.clear(), // de zijkant van de dunne rails zie je niet
  // Knoppen en hendels (fase 5E): uit is grijs en hout, aan is rood (zoals redstone)
  lever_off: (t) => { mcPlanks(t); for (let i = 0; i < 16; i++) t.set(i, i % 16, [96, 66, 36]); },
  lever_on: (t) => { paletteNoise(t, [[200, 40, 30], [230, 70, 50], [160, 30, 24]], [0.5, 0.3, 0.2]); },
  button_off: (t) => smoothBlock(t, [150, 150, 150]),
  button_on: (t) => paletteNoise(t, [[210, 50, 40], [240, 90, 60], [170, 36, 28]], [0.5, 0.3, 0.2]),
  plate_off: (t) => smoothBlock(t, [168, 168, 168]),
  plate_on: (t) => { smoothBlock(t, [168, 168, 168]); for (let i = 2; i < 14; i++) { t.set(i, 2, [220, 60, 40]); t.set(i, 13, [220, 60, 40]); t.set(2, i, [220, 60, 40]); t.set(13, i, [220, 60, 40]); } },
  lamp_off: (t) => { paletteNoise(t, [[92, 60, 40], [70, 46, 30], [110, 74, 48]], [0.5, 0.3, 0.2]); for (let i = 0; i < 16; i++) { t.set(i, 0, [50, 34, 22]); t.set(0, i, [50, 34, 22]); t.set(i, 8, [60, 40, 26]); t.set(8, i, [60, 40, 26]); } },
  lamp_on: (t) => { paletteNoise(t, [[255, 200, 90], [255, 230, 140], [240, 160, 60]], [0.5, 0.3, 0.2]); for (let i = 0; i < 16; i++) { t.set(i, 0, [150, 96, 40]); t.set(0, i, [150, 96, 40]); t.set(i, 8, [200, 130, 50]); t.set(8, i, [200, 130, 50]); } },
  dino_egg_green: (t) => egg(t, [176, 214, 140], [76, 130, 60]),
  dino_egg_blue: (t) => egg(t, [168, 206, 236], [60, 104, 170]),
  dino_egg_red: (t) => egg(t, [240, 214, 186], [196, 70, 52]),
  ...portalTiles([['red', [236, 64, 56]]]),
});

// Tegels die meekleuren met het landschap (0 = gras, 1 = blad, 2 = water). In de wereld worden ze
// grijs getekend en kleurt de shader ze; in de kist en de onderbalk krijgen ze de kleur van de vlakte.
const TINT_TILES = { grass_top: 0, grass_side: 0, tallgrass: 0, fern: 0, leaves: 1, jungle_leaves: 1, vine: 1, water: 2 };
// Bij deze dichte tegels kleurt maar een deel mee (de grasrand); dat staat in de doorzichtigheid van de laag
const PARTLY = { grass_side: (c) => c[1] > c[0] * 1.15 && c[1] > c[2] };
const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

// Kleurtegel omzetten naar grijs (voor de shader) en terug naar de kleur van de vlakte (voor plaatjes)
function makeTintable(t, name) {
  const tint = DEFAULT_TINT[TINT_TILES[name]], tr = tint >> 16, tg = (tint >> 8) & 255, tb = tint & 255;
  const lt = lum(tr, tg, tb), d = t.d, part = PARTLY[name];
  t.grey = new Uint8ClampedArray(d);
  t.mask = new Uint8Array(TILE * TILE);
  for (let i = 0, p = 0; p < d.length; i++, p += 4) {
    if (d[p + 3] === 0 || (part && !part([d[p], d[p + 1], d[p + 2]]))) continue;
    const g = Math.min(255, lum(d[p], d[p + 1], d[p + 2]) / lt * 255);
    t.grey[p] = t.grey[p + 1] = t.grey[p + 2] = g;
    d[p] = g * tr / 255; d[p + 1] = g * tg / 255; d[p + 2] = g * tb / 255;
    t.mask[i] = 1;
  }
}

// Namen van alle tegels (ook voor de tests: bestaat elke textuur die een blok noemt?)
export const TEXTURE_NAMES = Object.keys(GEN);

// Maak de atlas: een canvas met alle tegels, plus handige opzoektabellen
export function createAtlas() {
  const names = TEXTURE_NAMES;
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_SIZE;
  canvas.height = Math.ceil(names.length / ATLAS_COLS) * TILE; // groeit mee met het aantal tegels
  const ctx = canvas.getContext('2d');
  const index = {};
  const tiles = {};
  names.forEach((name, i) => {
    const t = new Tile(1000 + i * 7919);
    GEN[name](t);
    if (name in TINT_TILES) makeTintable(t, name);
    const img = new ImageData(t.d, TILE, TILE);
    ctx.putImageData(img, (i % ATLAS_COLS) * TILE, Math.floor(i / ATLAS_COLS) * TILE);
    index[name] = i;
    tiles[name] = t;
  });

  // Alle tegels ook als lagen onder elkaar (voor de texture-array met mipmaps in scene.js).
  // Doorzichtige pixels krijgen de gemiddelde kleur van de tegel, anders worden bladeren
  // in de verte donker omrand.
  const layers = new Uint8Array(TILE * TILE * 4 * names.length);
  names.forEach((name, i) => {
    const t = tiles[name], d = t.grey || t.d, out = layers.subarray(i * TILE * TILE * 4, (i + 1) * TILE * TILE * 4);
    let r = 0, g = 0, b = 0, n = 0;
    for (let p = 0; p < d.length; p += 4) if (d[p + 3] > 128) { r += d[p]; g += d[p + 1]; b += d[p + 2]; n++; }
    const avg = n ? [r / n, g / n, b / n] : [0, 0, 0];
    for (let p = 0; p < d.length; p += 4) {
      const see = d[p + 3] > 0;
      out[p] = see ? d[p] : avg[0]; out[p + 1] = see ? d[p + 1] : avg[1]; out[p + 2] = see ? d[p + 2] : avg[2];
      out[p + 3] = d[p + 3];
      if (PARTLY[name] || name === 'grass_top') out[p + 3] = t.mask[p >> 2] ? 0 : 255; // dicht blok: 0 = hier komt de graskleur
    }
  });

  // Per blok: tegelnummer voor [boven, onder, zijkant]
  const faceTiles = [];
  // Per blok: een paar kleuren voor de brokjes bij het slopen
  const particleColors = [];
  for (const b of BLOCKS) {
    if (!b || !b.tex) continue;
    // [boven, onder, zijkant, +x, -x, +z, -z]: een blok kan per kant een andere tegel hebben (oven, liggende stam)
    const side = index[b.tex.side], at = (k) => (b.tex[k] ? index[b.tex[k]] : side);
    faceTiles[b.id] = [index[b.tex.top], index[b.tex.bottom], side, at('px'), at('nx'), at('pz'), at('nz')];
    const t = tiles[b.tex.side];
    const cols = [];
    let tries = 0;
    while (cols.length < 6 && tries++ < 200) {
      const p = t.get(Math.floor(Math.random() * 16), Math.floor(Math.random() * 16));
      if (p[3] > 128) cols.push([p[0] / 255, p[1] / 255, p[2] / 255]);
    }
    if (!cols.length) cols.push([0.9, 0.95, 1]);
    particleColors[b.id] = cols;
  }
  return { canvas, index, faceTiles, particleColors, layers, count: names.length };
}

// Teken een klein 3D-blokje (voor de onderbalk en de kist).
// Werkt met kleine blokjes (0..1), zodat ook een trap er als trap uitziet.
export function drawBlockIcon(atlas, id, size = 96) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const b = BLOCKS[id];
  const k = size / 64;
  const src = (tile) => [(tile % ATLAS_COLS) * TILE, Math.floor(tile / ATLAS_COLS) * TILE];

  if (b.render === 'cross' || b.icon) {
    const [sx, sy] = src(b.icon ? atlas.index[b.icon] : atlas.faceTiles[id][2]);
    ctx.drawImage(atlas.canvas, sx, sy, TILE, TILE, 6 * k, 6 * k, 52 * k, 52 * k);
    return c;
  }
  if (b.shape === 'door') {
    // plat deurtje: bovenste helft met raampje, onderste helft met klink
    const up = src(atlas.index.door_upper), low = src(atlas.index.door_lower);
    ctx.drawImage(atlas.canvas, up[0], up[1], TILE, TILE, 18 * k, 4 * k, 28 * k, 28 * k);
    ctx.drawImage(atlas.canvas, low[0], low[1], TILE, TILE, 18 * k, 32 * k, 28 * k, 28 * k);
    return c;
  }
  if (b.shape === 'fence' || b.shape === 'gate') {
    // Grote, eenvoudige plaatjes: hek met latten; hekdeur met scharnieren en klink.
    const plank = (x, y, w, h) => {
      ctx.fillStyle = '#513018'; ctx.fillRect(x * k, y * k, w * k, h * k);
      ctx.fillStyle = '#a77542'; ctx.fillRect((x + 2) * k, (y + 2) * k, (w - 4) * k, (h - 4) * k);
    };
    if (b.shape === 'fence') {
      plank(4, 9, 11, 51); plank(49, 9, 11, 51);
      plank(12, 25, 42, 9); plank(12, 44, 42, 9);
    } else {
      plank(4, 9, 10, 51); plank(50, 9, 10, 51);
      plank(14, 19, 36, 9); plank(14, 42, 36, 9);
      ctx.fillStyle = '#f5cf65'; ctx.fillRect(41 * k, 33 * k, 6 * k, 6 * k);
    }
    return c;
  }

  // Isometrische projectie: x naar rechtsonder, z naar linksonder, y omhoog
  const P = (x, y, z) => [(32 + (x - z) * 28) * k, (32 + (x + z) * 14 - y * 28) * k];
  const [top, , side] = atlas.faceTiles[id];
  const darken = b.render === 'solid' || b.render === 'shape';
  const face = (tile, tl, tr, bl, u0, v0, u1, v1, dark) => {
    const [sx, sy] = src(tile);
    ctx.setTransform(tr[0] - tl[0], tr[1] - tl[1], bl[0] - tl[0], bl[1] - tl[1], tl[0], tl[1]);
    ctx.drawImage(atlas.canvas, sx + u0 * TILE, sy + v0 * TILE, Math.max(0.01, (u1 - u0) * TILE), Math.max(0.01, (v1 - v0) * TILE), 0, 0, 1.01, 1.01);
    if (dark && darken) {
      ctx.fillStyle = `rgba(0,0,0,${dark})`;
      ctx.fillRect(0, 0, 1.01, 1.01);
    }
  };
  const boxes = b.boxes || [[0, 0, 0, 1, 1, 1]];
  for (const [x0, y0, z0, x1, y1, z1] of boxes) {
    // voorkant links (+z), voorkant rechts (+x), bovenkant
    face(side, P(x0, y1, z1), P(x1, y1, z1), P(x0, y0, z1), x0, 1 - y1, x1, 1 - y0, 0.18);
    face(side, P(x1, y1, z1), P(x1, y1, z0), P(x1, y0, z1), 1 - z1, 1 - y1, 1 - z0, 1 - y0, 0.34);
    face(top, P(x0, y1, z0), P(x1, y1, z0), P(x0, y1, z1), x0, z0, x1, z1, 0);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return c;
}

// Scheurtjes die je ziet terwijl je een blok vasthoudt om te slopen (4 stapjes)
export function createCrackCanvases() {
  const r = rng(4242);
  const stages = [];
  const lines = [];
  for (let i = 0; i < 12; i++) {
    let x = 8, y = 8;
    const pts = [[x, y]];
    const ang = r() * Math.PI * 2;
    for (let k = 0; k < 6; k++) {
      x += Math.cos(ang + (r() - 0.5) * 1.2) * 1.4;
      y += Math.sin(ang + (r() - 0.5) * 1.2) * 1.4;
      pts.push([x, y]);
    }
    lines.push(pts);
  }
  for (let s = 0; s < 4; s++) {
    const c = document.createElement('canvas');
    c.width = c.height = TILE;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(20,20,20,0.9)';
    const n = 3 + s * 3;
    for (let i = 0; i < n; i++) {
      const pts = lines[i];
      const len = Math.min(pts.length, 2 + s * 2);
      for (let k = 0; k < len; k++) ctx.fillRect(Math.floor(pts[k][0]), Math.floor(pts[k][1]), 1, 1);
    }
    stages.push(c);
  }
  return stages;
}

// Pixel-hartje voor als je een dier aait
export function createHeartCanvas() {
  const rows = [
    '..XX..XX..',
    '.XWWXXRRX.',
    'XWRRRRRRRX',
    'XRRRRRRRRX',
    'XRRRRRRRRX',
    '.XRRRRRRX.',
    '..XRRRRX..',
    '...XRRX...',
    '....XX....',
  ];
  const c = document.createElement('canvas');
  c.width = 10; c.height = 9;
  const ctx = c.getContext('2d');
  const col = { X: '#8a1a2a', R: '#f0445c', W: '#ffd0d8' };
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (col[ch]) { ctx.fillStyle = col[ch]; ctx.fillRect(x, y, 1, 1); }
  }));
  return c;
}
