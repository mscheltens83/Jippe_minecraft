// Zet de blokken van één chunk (16x16 kolommen) om in 3D-vlakken.
// Alleen vlakken die je kunt zien worden gemaakt. In hoekjes komt een
// zachte schaduw (ambient occlusion), dat maakt bouwwerken duidelijk.

import { AIR, B, BLOCKS } from './blocks.js';
import { SY, CHUNK } from './world.js';
import { ATLAS_COLS } from './textures.js';

const AO = [0.5, 0.68, 0.84, 1.0];
const WATER_TOP = 0.875;
const EPS = 0.0005;

// Per richting: as (0=x, 1=y, 2=z), teken en lichtsterkte
const FACES = [
  { a: 0, s: 1, shade: 0.8 }, { a: 0, s: -1, shade: 0.8 },
  { a: 1, s: 1, shade: 1.0 }, { a: 1, s: -1, shade: 0.55 },
  { a: 2, s: 1, shade: 0.68 }, { a: 2, s: -1, shade: 0.68 },
];
const CORNERS_POS = [[0, 0], [1, 0], [1, 1], [0, 1]];
const CORNERS_NEG = [[0, 0], [0, 1], [1, 1], [1, 0]];

class Buf {
  constructor() { this.pos = []; this.uv = []; this.col = []; this.idx = []; this.n = 0; }
  quad(verts, uvs, cols, flip) {
    const n = this.n;
    for (let i = 0; i < 4; i++) {
      this.pos.push(verts[i][0], verts[i][1], verts[i][2]);
      this.uv.push(uvs[i][0], uvs[i][1]);
      this.col.push(cols[i], cols[i], cols[i]);
    }
    if (flip) this.idx.push(n, n + 1, n + 3, n + 1, n + 2, n + 3);
    else this.idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
    this.n += 4;
  }
  result() {
    if (!this.n) return null;
    return {
      pos: new Float32Array(this.pos),
      uv: new Float32Array(this.uv),
      col: new Float32Array(this.col),
      idx: this.n > 65000 ? new Uint32Array(this.idx) : new Uint16Array(this.idx),
    };
  }
}

function toLinear(v) { return Math.pow(v, 2.2); }

function tileUV(tile, s, t) {
  const col = tile % ATLAS_COLS, row = Math.floor(tile / ATLAS_COLS);
  s = EPS + s * (1 - 2 * EPS);
  t = EPS + t * (1 - 2 * EPS);
  return [(col + s) / ATLAS_COLS, 1 - (row + 1 - t) / ATLAS_COLS];
}

function faceVisible(b, id, nid) {
  if (nid === AIR) return true;
  const nb = BLOCKS[nid];
  if (nb.opaque) return false;
  if (b.render === 'water') return nid !== B.WATER;
  if (id === nid && id === B.GLASS) return false;
  return true;
}

export function buildChunk(world, atlas, cx, cz) {
  const solid = new Buf(), cutout = new Buf(), water = new Buf();
  const x0 = cx * CHUNK, z0 = cz * CHUNK;
  const occ = (x, y, z) => (BLOCKS[world.get(x, y, z)].opaque ? 1 : 0);
  const p = [0, 0, 0], q = [0, 0, 0];
  const verts = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const uvs = [[0, 0], [0, 0], [0, 0], [0, 0]];
  const cols = [0, 0, 0, 0];
  const aos = [0, 0, 0, 0];

  for (let y = 0; y < SY; y++) {
    for (let z = z0; z < z0 + CHUNK; z++) {
      for (let x = x0; x < x0 + CHUNK; x++) {
        const id = world.get(x, y, z);
        if (id === AIR) continue;
        const b = BLOCKS[id];
        const tiles = atlas.faceTiles[id];

        if (b.render === 'cross') {
          const t = tiles[2];
          const lo = 0.15, hi = 0.85;
          for (const [ax, az, bx, bz] of [[lo, lo, hi, hi], [hi, lo, lo, hi]]) {
            verts[0] = [x + ax, y, z + az]; verts[1] = [x + bx, y, z + bz];
            verts[2] = [x + bx, y + 1, z + bz]; verts[3] = [x + ax, y + 1, z + az];
            uvs[0] = tileUV(t, 0, 0); uvs[1] = tileUV(t, 1, 0); uvs[2] = tileUV(t, 1, 1); uvs[3] = tileUV(t, 0, 1);
            const c = toLinear(0.95);
            cutout.quad(verts, uvs, [c, c, c, c], false);
          }
          continue;
        }

        const buf = b.render === 'water' ? water : b.render === 'cutout' ? cutout : solid;
        const lowTop = b.render === 'water' && world.get(x, y + 1, z) !== B.WATER;
        p[0] = x; p[1] = y; p[2] = z;

        for (let f = 0; f < 6; f++) {
          const F = FACES[f];
          const a = F.a, u = (a + 1) % 3, v = (a + 2) % 3;
          q[0] = x; q[1] = y; q[2] = z; q[a] += F.s;
          const nid = world.get(q[0], q[1], q[2]);
          if (!faceVisible(b, id, nid)) continue;

          const tile = a === 1 ? (F.s > 0 ? tiles[0] : tiles[1]) : tiles[2];
          const corners = F.s > 0 ? CORNERS_POS : CORNERS_NEG;

          for (let i = 0; i < 4; i++) {
            const du = corners[i][0], dv = corners[i][1];
            const vt = verts[i] = [x, y, z];
            vt[a] += F.s > 0 ? 1 : 0;
            vt[u] += du;
            vt[v] += dv;
            if (lowTop && vt[1] === y + 1) vt[1] = y + WATER_TOP;

            // Texture-coördinaten zo dat "boven" op de zijkanten ook echt boven is
            let s, t;
            if (a === 0) { t = du; s = F.s > 0 ? 1 - dv : dv; }
            else if (a === 2) { t = dv; s = F.s > 0 ? du : 1 - du; }
            else { s = dv; t = F.s > 0 ? 1 - du : du; }
            uvs[i] = tileUV(tile, s, t);

            // Ambient occlusion: kijk naar de 3 buren rond deze hoek
            let ao = 3;
            if (b.render === 'solid' && !b.glow) {
              const su = du ? 1 : -1, sv = dv ? 1 : -1;
              q[0] = x; q[1] = y; q[2] = z; q[a] += F.s;
              q[u] += su; const s1 = occ(q[0], q[1], q[2]);
              q[u] -= su; q[v] += sv; const s2 = occ(q[0], q[1], q[2]);
              q[u] += su; const c = occ(q[0], q[1], q[2]);
              ao = s1 && s2 ? 0 : 3 - (s1 + s2 + c);
            }
            aos[i] = ao;
            // helderheid is in sRGB bedacht; de renderer rekent lineair
            cols[i] = toLinear(b.glow ? 0.9 + 0.1 * F.shade : F.shade * AO[ao]);
          }
          const flip = aos[0] + aos[2] < aos[1] + aos[3];
          buf.quad(verts, uvs, cols, flip);
        }
      }
    }
  }
  return { solid: solid.result(), cutout: cutout.result(), water: water.result() };
}
