// Alle texturen worden hier met code getekend als 16x16 pixel-art.
// Ze komen samen in één "atlas" (een groot plaatje met alle tegeltjes).

import { BLOCKS } from './blocks.js';

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
      let c = edge ? [88, 170, 70] : inner ? [104, 196, 84] : [140, 226, 110];
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
  t.noise(color, 0.16);
  for (let x = 1; x < 16; x += 4) for (let y = 0; y < 16; y++) {
    if (t.r() < 0.85) t.set(x, y, shade(color, 0.65));
  }
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

// Maak de atlas: een canvas met alle tegels, plus handige opzoektabellen
export function createAtlas() {
  const names = Object.keys(GEN);
  if (names.length > ATLAS_COLS * ATLAS_COLS) throw new Error('De textuuratlas is vol');
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = ATLAS_SIZE;
  const ctx = canvas.getContext('2d');
  const index = {};
  const tiles = {};
  names.forEach((name, i) => {
    const t = new Tile(1000 + i * 7919);
    GEN[name](t);
    const img = new ImageData(t.d, TILE, TILE);
    ctx.putImageData(img, (i % ATLAS_COLS) * TILE, Math.floor(i / ATLAS_COLS) * TILE);
    index[name] = i;
    tiles[name] = t;
  });

  // Per blok: tegelnummer voor [boven, onder, zijkant]
  const faceTiles = [];
  // Per blok: een paar kleuren voor de brokjes bij het slopen
  const particleColors = [];
  for (const b of BLOCKS) {
    if (!b || !b.tex) continue;
    faceTiles[b.id] = [index[b.tex.top], index[b.tex.bottom], index[b.tex.side]];
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
  return { canvas, index, faceTiles, particleColors };
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

  if (b.render === 'cross') {
    const [sx, sy] = src(atlas.faceTiles[id][2]);
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
