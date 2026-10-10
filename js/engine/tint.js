// Kleur per landschap, zoals in Minecraft: gras, bladeren en water worden grijs getekend en
// per kolom gekleurd. De kleur wordt gemengd over 5 x 5 kolommen, zodat de overgang tussen
// twee landschappen zacht verloopt in plaats van met een rechte rand.

import { B, MAX_ID } from '../blocks.js';
import { CHUNK } from './constants.js';

// [gras, bladeren, water] per landschap (0xRRGGBB)
export const TINTS = {
  plains: [0x91bd59, 0x77ab2f, 0x3f76e4],
  flowerField: [0x79c05a, 0x59ae30, 0x3f76e4],
  forest: [0x79c05a, 0x59ae30, 0x3f76e4],
  birchForest: [0x88bb67, 0x6ba941, 0x3f76e4],
  taiga: [0x86b783, 0x68a464, 0x3d57d6],
  tundra: [0x80b497, 0x60a17b, 0x3d57d6],
  mountains: [0x8ab689, 0x6da36b, 0x3f76e4],
  jungle: [0x59c93c, 0x30bb0b, 0x14a2c5],
  desert: [0xbfb755, 0xaea42a, 0x32a598],
  savanna: [0xbfb755, 0xaea42a, 0x2c8b9c],
  mesa: [0x90814d, 0x9e814d, 0x4e7f81],
  swamp: [0x6a7039, 0x6a7039, 0x617b64],
  beach: [0x91bd59, 0x77ab2f, 0x44aff5],
  ocean: [0x8eb971, 0x71a74d, 0x3f76e4],
  river: [0x8eb971, 0x71a74d, 0x3f76e4],
};
TINTS.island = TINTS.flat = TINTS.world = TINTS.adventure = TINTS.plains;
TINTS.bamboo = TINTS.jungle;
// Dinowereld (fase 5A): fris oergroen, in het oerbos donkerder
TINTS.dino = TINTS.dinoPlains = [0x7cc44e, 0x5aae2e, 0x3a8fd0];
TINTS.dinoForest = [0x5fae3c, 0x3f9a24, 0x2f7fb8];
TINTS.volcano = [0x8a9a5a, 0x6f8a40, 0x4a6f80];
export const DEFAULT_TINT = TINTS.plains;

// Welke blokken meekleuren: 1 = graskleur, 2 = bladkleur, 3 = waterkleur
export const TINT_KIND = new Uint8Array(MAX_ID);
for (const id of [B.GRASS, B.TALLGRASS, B.FERN]) TINT_KIND[id] = 1;
for (const id of [B.LEAVES, B.JUNGLE_LEAVES, B.VINE]) TINT_KIND[id] = 2;
for (let id = B.WATER_FLOW; id < B.WATER_FLOW + 8; id++) TINT_KIND[id] = 3;
TINT_KIND[B.WATER] = 3;

// Kleuren voor de 16 x 16 kolommen van een chunk: per kolom 3 getallen (gras, blad, water).
// biomeAt(x, z) geeft de naam van het landschap op die plek.
export function chunkTints(biomeAt, cx, cz) {
  const R = 2, W = CHUNK + 2 * R;
  // Eerst per kolom de kleur van het landschap (met een rand van 2 kolommen eromheen)
  const raw = new Float32Array(W * W * 9);
  for (let z = 0; z < W; z++) for (let x = 0; x < W; x++) {
    const t = TINTS[biomeAt(cx * CHUNK + x - R, cz * CHUNK + z - R)] || DEFAULT_TINT, o = (x + W * z) * 9;
    for (let k = 0; k < 3; k++) {
      raw[o + k * 3] = t[k] >> 16; raw[o + k * 3 + 1] = (t[k] >> 8) & 255; raw[o + k * 3 + 2] = t[k] & 255;
    }
  }
  // Dan middelen over 5 x 5
  const out = new Uint32Array(CHUNK * CHUNK * 3), sum = new Float32Array(9);
  for (let lz = 0; lz < CHUNK; lz++) for (let lx = 0; lx < CHUNK; lx++) {
    sum.fill(0);
    for (let dz = 0; dz <= 2 * R; dz++) for (let dx = 0; dx <= 2 * R; dx++) {
      const o = (lx + dx + W * (lz + dz)) * 9;
      for (let k = 0; k < 9; k++) sum[k] += raw[o + k];
    }
    const n = (2 * R + 1) * (2 * R + 1), o = (lx + CHUNK * lz) * 3;
    for (let k = 0; k < 3; k++) {
      out[o + k] = (Math.round(sum[k * 3] / n) << 16) | (Math.round(sum[k * 3 + 1] / n) << 8) | Math.round(sum[k * 3 + 2] / n);
    }
  }
  return out;
}

// Kleuren van een chunk uit de generator van de wereld
export function tintsFor(gen, cx, cz) {
  return chunkTints((x, z) => gen.raw(x, z).biome, cx, cz);
}
