// Ruis en toeval voor het maken van de wereld. Alles hangt alleen af van de seed en de plek,
// zodat elk stukje wereld (chunk) los gemaakt kan worden en er steeds precies hetzelfde uitkomt.

// Een getal tussen 0 en 1 voor een plek (en een extra "zout" voor verschillende doelen)
export function hash(seed, x, y = 0, z = 0) {
  let h = (seed | 0) ^ Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(z | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// Kleine voorspelbare random-generator (mulberry32)
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Simplex-ruis in 2D: zachte heuvels zonder herhaling. Geeft ongeveer -1..1.
const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
const GRAD2 = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];

export function simplex2(seed) {
  const grad = (i, j) => GRAD2[(hash(seed, i, j) * 8) | 0];
  const corner = (i, j, x, y) => {
    const t = 0.5 - x * x - y * y;
    if (t < 0) return 0;
    const g = grad(i, j), t2 = t * t;
    return t2 * t2 * (g[0] * x + g[1] * y);
  };
  return (x, y) => {
    const s = (x + y) * F2;
    const i = Math.floor(x + s), j = Math.floor(y + s);
    const t = (i + j) * G2;
    const x0 = x - (i - t), y0 = y - (j - t);
    const i1 = x0 > y0 ? 1 : 0, j1 = 1 - i1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    return 70 * (corner(i, j, x0, y0) + corner(i + i1, j + j1, x1, y1) + corner(i + 1, j + 1, x2, y2));
  };
}

// Simplex-ruis in 3D (voor grotten en overhangende bergen). Geeft ongeveer -1..1.
const GRAD3 = [[1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0], [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
  [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]];

export function simplex3(seed) {
  const corner = (i, j, k, x, y, z) => {
    const t = 0.6 - x * x - y * y - z * z;
    if (t < 0) return 0;
    const g = GRAD3[(hash(seed, i, j, k) * 12) | 0], t2 = t * t;
    return t2 * t2 * (g[0] * x + g[1] * y + g[2] * z);
  };
  return (x, y, z) => {
    const s = (x + y + z) / 3;
    const i = Math.floor(x + s), j = Math.floor(y + s), k = Math.floor(z + s);
    const t = (i + j + k) / 6;
    const x0 = x - (i - t), y0 = y - (j - t), z0 = z - (k - t);
    let i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) {
      if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
      else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
      else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
    } else if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
    else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
    else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    const G3 = 1 / 6;
    return 32 * (corner(i, j, k, x0, y0, z0)
      + corner(i + i1, j + j1, k + k1, x0 - i1 + G3, y0 - j1 + G3, z0 - k1 + G3)
      + corner(i + i2, j + j2, k + k2, x0 - i2 + 2 * G3, y0 - j2 + 2 * G3, z0 - k2 + 2 * G3)
      + corner(i + 1, j + 1, k + 1, x0 - 0.5, y0 - 0.5, z0 - 0.5));
  };
}

// Meerdere lagen ruis op elkaar: grote vormen plus kleine details (fBm)
export function fbm(noise, x, z, octaves = 4, lacunarity = 2, gain = 0.5) {
  let sum = 0, amp = 1, freq = 1, norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += noise(x * freq, z * freq) * amp;
    norm += amp; amp *= gain; freq *= lacunarity;
  }
  return sum / norm;
}
