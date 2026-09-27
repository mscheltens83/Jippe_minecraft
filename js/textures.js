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
};

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

// Teken een klein 3D-blokje (voor de onderbalk en de kist)
export function drawBlockIcon(atlas, id, size = 96) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const b = BLOCKS[id];
  const [top, , side] = atlas.faceTiles[id];
  const src = (tile) => [(tile % ATLAS_COLS) * TILE, Math.floor(tile / ATLAS_COLS) * TILE];
  const k = size / 64;
  if (b.render === 'cross') {
    const [sx, sy] = src(side);
    ctx.drawImage(atlas.canvas, sx, sy, TILE, TILE, 6 * k, 6 * k, 52 * k, 52 * k);
    return c;
  }
  const face = (tile, a, bb, cc, d, e, f, dark) => {
    const [sx, sy] = src(tile);
    ctx.setTransform(a * k, bb * k, cc * k, d * k, e * k, f * k);
    ctx.drawImage(atlas.canvas, sx, sy, TILE, TILE, 0, 0, TILE, TILE);
    if (dark && b.render !== 'cutout') {
      ctx.fillStyle = `rgba(0,0,0,${dark})`;
      ctx.fillRect(0, 0, TILE, TILE);
    }
  };
  const s = 1.75, h = 0.875;
  face(side, s, h, 0, s, 4, 18, 0.18);      // links
  face(side, s, -h, 0, s, 32, 32, 0.34);    // rechts
  face(top, s, h, -s, h, 32, 4, 0);         // boven
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return c;
}
