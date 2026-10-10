// Eén chunk: 16 x 16 kolommen van 128 blokken hoog, in 8 secties van 16 hoog.
import { OPAQUE } from '../blocks.js';
import { CHUNK, SY, SECTION, chunkKey } from './constants.js';

export const SECTIONS = SY / SECTION;
export const CHUNK_SIZE = CHUNK * CHUNK * SY;

// Plek van een blok binnen de chunk (laag voor laag, net als vroeger in de hele wereld)
export const local = (lx, y, lz) => lx + CHUNK * (lz + CHUNK * y);

export class Chunk {
  constructor(cx, cz, blocks) {
    this.cx = cx; this.cz = cz;
    this.key = chunkKey(cx, cz);
    this.blocks = blocks;
    this.edited = false;          // door Jippe veranderd: moet bewaard worden
    this.version = 0;             // telt op bij elke verandering
    this.sectionVersion = new Uint32Array(SECTIONS);
    this.meshed = false;          // al eens getekend
    this.meshing = false;         // een worker is ermee bezig
    this.light = null;            // licht per blok (zon * 16 + lamp), komt bij het eerste tekenen
    this.height = heights(blocks); // per kolom: vanaf deze hoogte schijnt de zon
  }
}

// Per kolom het eerste vakje boven het hoogste dichte blok
export function heights(blocks) {
  const h = new Uint8Array(CHUNK * CHUNK);
  for (let col = 0; col < CHUNK * CHUNK; col++) {
    let y = SY - 1;
    while (y >= 0 && !OPAQUE[blocks[col + CHUNK * CHUNK * y]]) y--;
    h[col] = y + 1;
  }
  return h;
}

// Inpakken voor de opslag: paren [aantal, blok] (aantal tot 65535)
export function encodeRLE(blocks) {
  const out = new Uint16Array(blocks.length * 2);
  let o = 0;
  for (let i = 0; i < blocks.length;) {
    const v = blocks[i];
    let n = 1;
    while (n < 65535 && i + n < blocks.length && blocks[i + n] === v) n++;
    out[o++] = n; out[o++] = v;
    i += n;
  }
  return out.slice(0, o);
}

export function decodeRLE(rle, valid = null) {
  const out = new Uint16Array(CHUNK_SIZE);
  let p = 0;
  for (let i = 0; i + 1 < rle.length; i += 2) {
    const n = rle[i], v = valid && !valid(rle[i + 1]) ? 0 : rle[i + 1];
    if (p + n > out.length) throw new Error('chunk te groot');
    out.fill(v, p, p + n);
    p += n;
  }
  if (p !== out.length) throw new Error('chunk onvolledig');
  return out;
}

// Voor de reservekopie (tekst): Uint16Array <-> base64
export function toBase64(u16) {
  const u8 = new Uint8Array(u16.buffer, u16.byteOffset, u16.byteLength);
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
}

export function fromBase64(str) {
  const s = atob(str);
  const u8 = new Uint8Array(s.length & ~1);
  for (let i = 0; i < u8.length; i++) u8[i] = s.charCodeAt(i);
  return new Uint16Array(u8.buffer);
}
