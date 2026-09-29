// Zet de blokken van één chunk (16x16 kolommen) om in 3D-vlakken.
// Alleen vlakken die je kunt zien worden gemaakt. In hoekjes komt een
// zachte schaduw (ambient occlusion), dat maakt bouwwerken duidelijk.

import { AIR, B, BLOCKS, OPAQUE } from './blocks.js';
import { SX, SY, SZ, CHUNK } from './world.js';
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

// helderheid is in sRGB bedacht; de renderer rekent lineair
const toLinear = (v) => Math.pow(v, 2.2);

function tileUV(tile, s, t) {
  const col = tile % ATLAS_COLS, row = Math.floor(tile / ATLAS_COLS);
  s = EPS + s * (1 - 2 * EPS);
  t = EPS + t * (1 - 2 * EPS);
  return [(col + s) / ATLAS_COLS, 1 - (row + 1 - t) / ATLAS_COLS];
}

// Texture-coördinaten zo dat "boven" op de zijkanten ook echt boven is
function faceST(a, sign, lx, ly, lz) {
  if (a === 0) return [sign > 0 ? 1 - lz : lz, ly];
  if (a === 2) return [sign > 0 ? lx : 1 - lx, ly];
  return [lx, sign > 0 ? 1 - lz : lz];
}

function faceVisible(b, id, nid) {
  if (nid === AIR) return true;
  if (OPAQUE[nid]) return false;
  // Binnen de grote nieuwe boomkruinen hoeven we geen verborgen bladvlakken te tekenen.
  if (b.foliage && BLOCKS[nid].foliage) return false;
  if (b.render === 'water') return nid !== B.WATER;
  if (id === nid && (b.render === 'glass' || id === B.GLASS)) return false;
  return true;
}

export function buildChunk(world, atlas, cx, cz) {
  const bufs = { solid: new Buf(), cutout: new Buf(), glass: new Buf(), water: new Buf() };
  const data = world.data;
  const get = (x, y, z) => {
    if (y < 0) return B.BEDROCK;
    if (x < 0 || z < 0 || x >= SX || z >= SZ || y >= SY) return AIR;
    return data[x + SX * (z + SZ * y)];
  };
  const x0 = cx * CHUNK, z0 = cz * CHUNK;
  const q = [0, 0, 0], L = [0, 0, 0];
  const verts = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const uvs = [[0, 0], [0, 0], [0, 0], [0, 0]];
  const cols = [0, 0, 0, 0];
  const aos = [0, 0, 0, 0];

  for (let y = 0; y < SY; y++) {
    for (let z = z0; z < z0 + CHUNK; z++) {
      for (let x = x0; x < x0 + CHUNK; x++) {
        const id = data[x + SX * (z + SZ * y)];
        if (id === AIR) continue;
        const b = BLOCKS[id];
        const tiles = atlas.faceTiles[id];

        // Plantjes: twee gekruiste vlakjes
        if (b.render === 'cross') {
          const t = tiles[2];
          const lo = 0.15, hi = 0.85;
          const c = toLinear(0.95);
          for (const [ax, az, bx, bz] of [[lo, lo, hi, hi], [hi, lo, lo, hi]]) {
            verts[0] = [x + ax, y, z + az]; verts[1] = [x + bx, y, z + bz];
            verts[2] = [x + bx, y + 1, z + bz]; verts[3] = [x + ax, y + 1, z + az];
            uvs[0] = tileUV(t, 0, 0); uvs[1] = tileUV(t, 1, 0); uvs[2] = tileUV(t, 1, 1); uvs[3] = tileUV(t, 0, 1);
            bufs.cutout.quad(verts, uvs, [c, c, c, c], false);
          }
          continue;
        }

        // Bijzondere vormen (trap, deur): losse kleine blokjes
        if (b.boxes) {
          for (const box of b.boxes) {
            for (let f = 0; f < 6; f++) {
              const F = FACES[f];
              const a = F.a, u = (a + 1) % 3, v = (a + 2) % 3;
              const onEdge = F.s > 0 ? box[3 + a] === 1 : box[a] === 0;
              if (onEdge) {
                q[0] = x; q[1] = y; q[2] = z; q[a] += F.s;
                if (OPAQUE[get(q[0], q[1], q[2])]) continue;
              }
              const tile = a === 1 ? (F.s > 0 ? tiles[0] : tiles[1]) : tiles[2];
              const corners = F.s > 0 ? CORNERS_POS : CORNERS_NEG;
              const c = toLinear(F.shade * 0.97);
              for (let i = 0; i < 4; i++) {
                L[a] = F.s > 0 ? box[3 + a] : box[a];
                L[u] = corners[i][0] ? box[3 + u] : box[u];
                L[v] = corners[i][1] ? box[3 + v] : box[v];
                verts[i] = [x + L[0], y + L[1], z + L[2]];
                const st = faceST(a, F.s, L[0], L[1], L[2]);
                uvs[i] = tileUV(tile, st[0], st[1]);
                cols[i] = c;
              }
              bufs.solid.quad(verts, uvs, cols, false);
            }
          }
          continue;
        }

        const buf = b.render === 'water' ? bufs.water : b.render === 'glass' ? bufs.glass
          : b.render === 'cutout' ? bufs.cutout : bufs.solid;
        const lowTop = b.render === 'water' && get(x, y + 1, z) !== B.WATER;
        const doAO = b.render === 'solid' && !b.glow;

        for (let f = 0; f < 6; f++) {
          const F = FACES[f];
          const a = F.a, u = (a + 1) % 3, v = (a + 2) % 3;
          q[0] = x; q[1] = y; q[2] = z; q[a] += F.s;
          if (!faceVisible(b, id, get(q[0], q[1], q[2]))) continue;

          const tile = a === 1 ? (F.s > 0 ? tiles[0] : tiles[1]) : tiles[2];
          const corners = F.s > 0 ? CORNERS_POS : CORNERS_NEG;

          for (let i = 0; i < 4; i++) {
            const du = corners[i][0], dv = corners[i][1];
            L[a] = F.s > 0 ? 1 : 0; L[u] = du; L[v] = dv;
            const vt = verts[i] = [x + L[0], y + L[1], z + L[2]];
            if (lowTop && L[1] === 1) vt[1] = y + WATER_TOP;
            const st = faceST(a, F.s, L[0], L[1], L[2]);
            uvs[i] = tileUV(tile, st[0], st[1]);

            // Ambient occlusion: kijk naar de 3 buren rond deze hoek
            let ao = 3;
            if (doAO) {
              const su = du ? 1 : -1, sv = dv ? 1 : -1;
              q[0] = x; q[1] = y; q[2] = z; q[a] += F.s;
              q[u] += su; const s1 = OPAQUE[get(q[0], q[1], q[2])];
              q[u] -= su; q[v] += sv; const s2 = OPAQUE[get(q[0], q[1], q[2])];
              q[u] += su; const c = OPAQUE[get(q[0], q[1], q[2])];
              ao = s1 && s2 ? 0 : 3 - (s1 + s2 + c);
            }
            aos[i] = ao;
            cols[i] = toLinear(b.glow ? 0.9 + 0.1 * F.shade : F.shade * AO[ao]);
          }
          const flip = aos[0] + aos[2] < aos[1] + aos[3];
          buf.quad(verts, uvs, cols, flip);
        }
      }
    }
  }
  return {
    solid: bufs.solid.result(), cutout: bufs.cutout.result(),
    glass: bufs.glass.result(), water: bufs.water.result(),
  };
}
