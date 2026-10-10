// Zet de blokken van één sectie (16 x 16 x 16) om in 3D-vlakken. Alleen vlakken die je kunt
// zien worden gemaakt. In hoekjes komt een zachte schaduw (ambient occlusion).
// De blokken komen uit een "pad": de chunk plus één rij blokken van de buren eromheen, zodat
// dit ook in een worker kan (zonder de hele wereld). Het licht komt uit een even groot "lichtpad".
//
// Per hoekpunt gaan drie getallen naar de beeldkaart (in het kleurkanaal):
//   rood  = schaduw (kant van het blok en hoekjes), groen = zonlicht, blauw = lamplicht.
// De shader (scene.js) maakt daar met het daglicht van dat moment de echte helderheid van.
// Groen 2 betekent: dit blok gloeit zelf (lamp, gloeisteen) en is altijd helemaal licht.

import { AIR, B, BLOCKS, OPAQUE, WATERY, blockBoxes } from '../blocks.js';
import { CHUNK, SY, SECTION } from './constants.js';
import { local } from './chunk.js';
import { TINT_KIND } from './tint.js';

// Helderheid (sRGB) bij lichtwaarde 0..15: een zachte kromme, zodat een fakkel een mooie cirkel geeft
export const LIGHT_CURVE = Array.from({ length: 16 }, (_, l) => Math.pow(l / 15, 1.25));
// Hetzelfde, maar lineair (zoals de shader rekent)
export const LIGHT_LINEAR = new Float32Array(LIGHT_CURVE.map((v) => Math.pow(v, 2.2)));
const LT = LIGHT_LINEAR;
export const GLOW = 2;

const AO = [0.5, 0.68, 0.84, 1.0];
const WATER_TOP = 0.875;
export const KINDS = ['solid', 'cutout', 'glass', 'water'];

export const PW = CHUNK + 2, PH = SY + 2;
export const padIndex = (lx, y, lz) => (lx + 1) + PW * ((lz + 1) + PW * (y + 1));

// Per richting: as (0=x, 1=y, 2=z), teken en lichtsterkte
const FACES = [
  { a: 0, s: 1, shade: 0.8 }, { a: 0, s: -1, shade: 0.8 },
  { a: 1, s: 1, shade: 1.0 }, { a: 1, s: -1, shade: 0.55 },
  { a: 2, s: 1, shade: 0.68 }, { a: 2, s: -1, shade: 0.68 },
];
// Welke tegel bij welk vlak: boven en onder, anders de tegel van die kant (+x, -x, +z, -z)
const FACE_TILE = [3, 4, 0, 1, 5, 6];
const CORNERS_POS = [[0, 0], [1, 0], [1, 1], [0, 1]];
const CORNERS_NEG = [[0, 0], [0, 1], [1, 1], [1, 0]];

// helderheid is in sRGB bedacht; de renderer rekent lineair
const toLinear = (v) => Math.pow(v, 2.2);

const WHITE4 = [0xffffff, 0xffffff, 0xffffff, 0xffffff];

class Buf {
  constructor() { this.pos = []; this.uv = []; this.col = []; this.tint = []; this.idx = []; this.n = 0; }
  // cols = schaduw, skys = zonlicht, lamps = lamplicht, tints = kleur van het landschap (0xRRGGBB), per hoekpunt
  quad(verts, uvs, cols, flip, skys, lamps, tints = WHITE4) {
    const n = this.n;
    for (let i = 0; i < 4; i++) {
      this.pos.push(verts[i][0], verts[i][1], verts[i][2]);
      this.uv.push(uvs[i][0], uvs[i][1], uvs[i][2]);
      this.col.push(cols[i], skys[i], lamps[i]);
      const t = tints[i];
      this.tint.push(t >> 16, (t >> 8) & 255, t & 255);
    }
    if (flip) this.idx.push(n, n + 1, n + 3, n + 1, n + 2, n + 3);
    else this.idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
    this.n += 4;
  }
  result() {
    if (!this.n) return null;
    return {
      n: this.n, pos: new Float32Array(this.pos), uv: new Float32Array(this.uv), col: new Float32Array(this.col),
      tint: new Uint8Array(this.tint), idx: new Uint32Array(this.idx),
    };
  }
}

// Plek op de tegel (s naar rechts, t omhoog) en het nummer van de tegel (de laag in de texture-array).
// Rij 0 van een tegel is de bovenkant, dus v = 1 - t.
function tileUV(tile, s, t) {
  return [s, 1 - t, tile];
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
  // Binnen de grote boomkruinen hoeven we geen verborgen bladvlakken te tekenen.
  if (b.foliage && BLOCKS[nid].foliage) return false;
  if (b.render === 'water') return !WATERY[nid];
  if (id === nid && (b.render === 'glass' || id === B.GLASS)) return false;
  return true;
}

// Een pad maken uit de wereld (op de hoofdthread). Buiten de wereld: lucht, onderin: bodem.
export function buildPad(world, cx, cz) {
  const pad = new Uint16Array(PW * PW * PH);
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    const c = world.chunk(cx + dx, cz + dz);
    if (!c) continue;
    const lx0 = dx < 0 ? CHUNK - 1 : 0, lx1 = dx > 0 ? 0 : CHUNK - 1;
    const lz0 = dz < 0 ? CHUNK - 1 : 0, lz1 = dz > 0 ? 0 : CHUNK - 1;
    for (let y = 0; y < SY; y++) for (let lz = lz0; lz <= lz1; lz++) {
      const pz = lz + dz * CHUNK;
      for (let lx = lx0; lx <= lx1; lx++) pad[padIndex(lx + dx * CHUNK, y, pz)] = c.blocks[local(lx, y, lz)];
    }
  }
  for (let i = 0; i < PW * PW; i++) pad[i] = B.BEDROCK; // laag y = -1
  return pad;
}

// Welke secties hebben iets anders dan lucht? (bitmasker)
export function filledSections(pad) {
  let mask = 0;
  for (let s = 0; s < SY / SECTION; s++) {
    for (let y = s * SECTION; y < (s + 1) * SECTION && !(mask & (1 << s)); y++) {
      for (let lz = 0; lz < CHUNK; lz++) {
        const row = padIndex(0, y, lz);
        let hit = false;
        for (let lx = 0; lx < CHUNK; lx++) if (pad[row + lx] !== AIR) { hit = true; break; }
        if (hit) { mask |= 1 << s; break; }
      }
    }
  }
  return mask;
}

// tints: kleur van gras, blad en water per kolom (uit tint.js); zonder tints blijft alles grijs-wit
export function meshSection(pad, lpad, faceTiles, cx, cz, s, tints = null) {
  const bufs = { solid: new Buf(), cutout: new Buf(), glass: new Buf(), water: new Buf() };
  const X0 = cx * CHUNK, Z0 = cz * CHUNK;
  const get = (x, y, z) => {
    const lx = x - X0, lz = z - Z0;
    if (y < -1 || y > SY || lx < -1 || lx > CHUNK || lz < -1 || lz > CHUNK) return AIR;
    if (y === SY) return AIR;
    return pad[padIndex(lx, y, lz)];
  };
  const light = (x, y, z) => {
    const lx = x - X0, lz = z - Z0;
    if (y < -1 || y > SY || lx < -1 || lx > CHUNK || lz < -1 || lz > CHUNK) return 0xf0;
    return lpad[padIndex(lx, y, lz)];
  };
  const padWorld = { get };
  const q = [0, 0, 0], L = [0, 0, 0];
  const verts = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const uvs = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const cols = [0, 0, 0, 0];
  const skys = [0, 0, 0, 0], lamps = [0, 0, 0, 0];
  const aos = [0, 0, 0, 0];
  const tint4 = [0xffffff, 0xffffff, 0xffffff, 0xffffff];
  // Hetzelfde licht op alle 4 hoeken
  const flat = (l) => { const a = LT[l >> 4], b = LT[l & 15]; skys[0] = skys[1] = skys[2] = skys[3] = a; lamps[0] = lamps[1] = lamps[2] = lamps[3] = b; };
  // Gloeit zelf: altijd helemaal licht
  const glow = () => { skys[0] = skys[1] = skys[2] = skys[3] = GLOW; lamps[0] = lamps[1] = lamps[2] = lamps[3] = 0; };
  const y0 = s * SECTION;

  for (let y = y0; y < y0 + SECTION; y++) {
    for (let lz = 0; lz < CHUNK; lz++) {
      for (let lx = 0; lx < CHUNK; lx++) {
        const id = pad[padIndex(lx, y, lz)];
        if (id === AIR) continue;
        const b = BLOCKS[id];
        const tiles = faceTiles[id];
        if (!b || !tiles) continue;
        const x = X0 + lx, z = Z0 + lz;
        const tk = TINT_KIND[id];
        tint4[0] = tint4[1] = tint4[2] = tint4[3] = tk && tints ? tints[(lx + CHUNK * lz) * 3 + tk - 1] : 0xffffff;

        // Plantjes: twee gekruiste vlakjes
        if (b.render === 'cross') {
          const t = tiles[2];
          const lo = 0.15, hi = 0.85;
          const c = toLinear(0.95);
          if (b.light) glow(); else flat(light(x, y, z));
          for (const [ax, az, bx, bz] of [[lo, lo, hi, hi], [hi, lo, lo, hi]]) {
            verts[0] = [x + ax, y, z + az]; verts[1] = [x + bx, y, z + bz];
            verts[2] = [x + bx, y + 1, z + bz]; verts[3] = [x + ax, y + 1, z + az];
            uvs[0] = tileUV(t, 0, 0); uvs[1] = tileUV(t, 1, 0); uvs[2] = tileUV(t, 1, 1); uvs[3] = tileUV(t, 0, 1);
            bufs.cutout.quad(verts, uvs, [c, c, c, c], false, skys, lamps, tint4);
          }
          continue;
        }

        // Bijzondere vormen (trap, deur, hek): losse kleine blokjes, met het licht van hun eigen vakje
        if (b.boxes) {
          if (b.light) glow(); else flat(light(x, y, z));
          for (const box of blockBoxes(padWorld, x, y, z)) {
            for (let f = 0; f < 6; f++) {
              const F = FACES[f];
              const a = F.a, u = (a + 1) % 3, v = (a + 2) % 3;
              const onEdge = F.s > 0 ? box[3 + a] === 1 : box[a] === 0;
              if (onEdge) {
                q[0] = x; q[1] = y; q[2] = z; q[a] += F.s;
                if (OPAQUE[get(q[0], q[1], q[2])]) continue;
              }
              const tile = tiles[FACE_TILE[f]];
              const corners = F.s > 0 ? CORNERS_POS : CORNERS_NEG;
              const c = toLinear(F.shade * 0.97);
              for (let i = 0; i < 4; i++) {
                L[a] = F.s > 0 ? box[3 + a] : box[a];
                L[u] = corners[i][0] ? box[3 + u] : box[u];
                L[v] = corners[i][1] ? box[3 + v] : box[v];
                verts[i] = [x + L[0], y + L[1], z + L[2]];
                const st = faceST(a, F.s, L[0], L[1], L[2]);
                if (a !== 1 && box[4] > 1) st[1] /= box[4];
                uvs[i] = tileUV(tile, st[0], st[1]);
                cols[i] = c;
              }
              (bufs[b.boxBuf] || bufs.solid).quad(verts, uvs, cols, false, skys, lamps);
            }
          }
          continue;
        }

        const buf = b.render === 'water' ? bufs.water : b.render === 'glass' ? bufs.glass
          : b.render === 'cutout' ? bufs.cutout : bufs.solid;
        // Water: lager naarmate het verder van de bron stroomt (bron en vallend water bijna vol)
        const lowTop = b.render === 'water' && !WATERY[get(x, y + 1, z)];
        const waterTop = b.level > 0 && b.level < 8 ? WATER_TOP * (8 - b.level) / 8 : WATER_TOP;
        const doAO = b.render === 'solid' && !b.glow;

        for (let f = 0; f < 6; f++) {
          const F = FACES[f];
          const a = F.a, u = (a + 1) % 3, v = (a + 2) % 3;
          q[0] = x; q[1] = y; q[2] = z; q[a] += F.s;
          if (q[1] < 0) continue; // de onderkant van de bodem zie je nooit
          if (!faceVisible(b, id, get(q[0], q[1], q[2]))) continue;

          const tile = tiles[FACE_TILE[f]];
          const corners = F.s > 0 ? CORNERS_POS : CORNERS_NEG;
          // Licht van het vakje voor dit vlak
          const fx = q[0], fy = q[1], fz = q[2];
          const fl = light(fx, fy, fz);
          if (b.glow) glow(); else flat(fl);

          for (let i = 0; i < 4; i++) {
            const du = corners[i][0], dv = corners[i][1];
            L[a] = F.s > 0 ? 1 : 0; L[u] = du; L[v] = dv;
            const vt = verts[i] = [x + L[0], y + L[1], z + L[2]];
            if (lowTop && L[1] === 1) vt[1] = y + waterTop;
            const st = faceST(a, F.s, L[0], L[1], L[2]);
            uvs[i] = tileUV(tile, st[0], st[1]);

            // Ambient occlusion: kijk naar de 3 buren rond deze hoek. Het licht van die buren
            // (als ze niet dicht zijn) middelen we met het vakje voor het vlak: zacht licht.
            let ao = 3;
            if (doAO) {
              const su = du ? 1 : -1, sv = dv ? 1 : -1;
              q[0] = fx; q[1] = fy; q[2] = fz;
              q[u] += su; const s1 = OPAQUE[get(q[0], q[1], q[2])];
              const l1 = s1 ? 0 : light(q[0], q[1], q[2]);
              q[u] -= su; q[v] += sv; const s2 = OPAQUE[get(q[0], q[1], q[2])];
              const l2 = s2 ? 0 : light(q[0], q[1], q[2]);
              q[u] += su; const c = OPAQUE[get(q[0], q[1], q[2])];
              const useC = !c && !(s1 && s2);
              const l3 = useC ? light(q[0], q[1], q[2]) : 0;
              ao = s1 && s2 ? 0 : 3 - (s1 + s2 + c);
              let sk = LT[fl >> 4], lp = LT[fl & 15], n = 1;
              if (!s1) { sk += LT[l1 >> 4]; lp += LT[l1 & 15]; n++; }
              if (!s2) { sk += LT[l2 >> 4]; lp += LT[l2 & 15]; n++; }
              if (useC) { sk += LT[l3 >> 4]; lp += LT[l3 & 15]; n++; }
              skys[i] = sk / n; lamps[i] = lp / n;
            }
            aos[i] = ao;
            cols[i] = toLinear(b.glow ? 0.9 + 0.1 * F.shade : F.shade * AO[ao]);
          }
          const flip = aos[0] + aos[2] < aos[1] + aos[3];
          buf.quad(verts, uvs, cols, flip, skys, lamps, tint4);
        }
      }
    }
  }
  const out = {};
  for (const k of KINDS) out[k] = bufs[k].result();
  return out;
}

// Alle secties van een chunk (lege secties slaan we over)
export function meshChunk(pad, lpad, faceTiles, cx, cz, tints = null, mask = filledSections(pad)) {
  const sections = [];
  for (let s = 0; s < SY / SECTION; s++) sections.push(mask & (1 << s) ? meshSection(pad, lpad, faceTiles, cx, cz, s, tints) : null);
  return sections;
}

// Secties samenvoegen tot één lijst per soort (minder tekenopdrachten)
export function mergeSections(sections, kind) {
  let n = 0, ni = 0;
  for (const s of sections) { const d = s?.[kind]; if (d) { n += d.n; ni += d.idx.length; } }
  if (!n) return null;
  const pos = new Float32Array(n * 3), uv = new Float32Array(n * 3), col = new Float32Array(n * 3), tint = new Uint8Array(n * 3);
  const idx = n > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  let ov = 0, oi = 0;
  for (const s of sections) {
    const d = s?.[kind];
    if (!d) continue;
    pos.set(d.pos, ov * 3); uv.set(d.uv, ov * 3); col.set(d.col, ov * 3); tint.set(d.tint, ov * 3);
    for (let i = 0; i < d.idx.length; i++) idx[oi + i] = d.idx[i] + ov;
    ov += d.n; oi += d.idx.length;
  }
  return { pos, uv, col, tint, idx };
}
