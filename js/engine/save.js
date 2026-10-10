// Bewaren in IndexedDB (veel meer ruimte dan localStorage): per wereldplek één beschrijving
// (soort, seed, speler, dieren, plaatje) en alleen de chunks die Jippe veranderd heeft.
// Lukt IndexedDB niet (bijvoorbeeld in een privévenster), dan blijft alles in het geheugen.

import { keyCx, keyCz, chunkKey } from './constants.js';
import { toBase64, fromBase64 } from './chunk.js';

const DB = 'jippecraft';
const VERSION = 1;

function promisify(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function done(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('opslaan afgebroken'));
  });
}

// Safari laat IndexedDB vlak na het laden van een pagina soms 'hangen'. Even porren met
// indexedDB.databases() maakt hem wakker (hoogstens 2 seconden, daarna gewoon doorgaan).
async function wakeUp() {
  if (!indexedDB.databases) return;
  let timer;
  await Promise.race([
    new Promise((resolve) => { const poke = () => indexedDB.databases().then(resolve, resolve); poke(); timer = setInterval(poke, 100); }),
    new Promise((resolve) => setTimeout(resolve, 2000)),
  ]);
  clearInterval(timer);
}

const chunkId = (slot, key) => `${slot}:${keyCx(key)},${keyCz(key)}`;
const range = (slot) => IDBKeyRange.bound(`${slot}:`, `${slot}:￿`);

export class WorldStore {
  constructor() {
    this.db = null;
    this.memory = null; // reserve als IndexedDB niet werkt
    this.queue = Promise.resolve();
  }

  async open() {
    try {
      if (!globalThis.indexedDB) throw new Error('geen IndexedDB');
      await wakeUp();
      const req = indexedDB.open(DB, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('werelden')) db.createObjectStore('werelden');
        if (!db.objectStoreNames.contains('chunks')) db.createObjectStore('chunks');
      };
      this.db = await promisify(req);
      // Vraag de browser de opslag niet zomaar op te ruimen
      navigator.storage?.persist?.().catch(() => {});
    } catch (e) {
      console.warn('IndexedDB werkt niet; werelden blijven alleen in het geheugen', e);
      this.db = null;
      this.memory = { werelden: new Map(), chunks: new Map() };
    }
    return this;
  }

  // Alleen in het geheugen (de meetrit): de bewaarde werelden worden niet aangeraakt
  memoryOnly() {
    this.db = null;
    this.memory = { werelden: new Map(), chunks: new Map() };
    return this;
  }

  // De verbinding netjes sluiten voordat de pagina weggaat (wat nog bezig is, wordt eerst afgemaakt)
  close() {
    this.db?.close();
    this.db = null;
    this.memory = { werelden: new Map(), chunks: new Map() };
  }

  get persistent() { return !!this.db; }

  // Eén actie tegelijk, in volgorde
  enqueue(fn) {
    const p = this.queue.then(fn, fn);
    this.queue = p.catch(() => {});
    return p;
  }

  async loadMetas(slots) {
    const out = {};
    if (!this.db) { for (const s of slots) out[s] = this.memory.werelden.get(s) || null; return out; }
    const tx = this.db.transaction('werelden', 'readonly'), store = tx.objectStore('werelden');
    await Promise.all(slots.map(async (s) => { out[s] = (await promisify(store.get(s))) || null; }));
    return out;
  }

  async loadChunks(slot) {
    const out = new Map();
    if (!this.db) {
      for (const [id, v] of this.memory.chunks) if (id.startsWith(slot + ':')) out.set(parseKey(id), v);
      return out;
    }
    const tx = this.db.transaction('chunks', 'readonly'), store = tx.objectStore('chunks');
    const [keys, values] = await Promise.all([promisify(store.getAllKeys(range(slot))), promisify(store.getAll(range(slot)))]);
    keys.forEach((id, i) => out.set(parseKey(id), toU16(values[i])));
    return out;
  }

  // Beschrijving plus de veranderde chunks in één keer bewaren
  save(slot, meta, chunks = new Map()) {
    return this.enqueue(async () => {
      if (!this.db) {
        if (meta) this.memory.werelden.set(slot, meta);
        for (const [key, v] of chunks) this.memory.chunks.set(chunkId(slot, key), v);
        return;
      }
      const tx = this.db.transaction(['werelden', 'chunks'], 'readwrite');
      if (meta) tx.objectStore('werelden').put(meta, slot);
      const store = tx.objectStore('chunks');
      for (const [key, v] of chunks) if (v) store.put(v, chunkId(slot, key));
      await done(tx);
    });
  }

  // Een wereldplek helemaal leegmaken (bij opnieuw beginnen)
  clearSlot(slot) {
    return this.enqueue(async () => {
      if (!this.db) {
        this.memory.werelden.delete(slot);
        for (const id of [...this.memory.chunks.keys()]) if (id.startsWith(slot + ':')) this.memory.chunks.delete(id);
        return;
      }
      const tx = this.db.transaction(['werelden', 'chunks'], 'readwrite');
      tx.objectStore('werelden').delete(slot);
      tx.objectStore('chunks').delete(range(slot));
      await done(tx);
    });
  }

  // Wacht tot alles wat in de rij staat bewaard is
  flush() { return this.queue; }

  // Reservekopie: alle werelden als één stuk tekst (JSON)
  async exportAll(slots) {
    await this.flush();
    const metas = await this.loadMetas(slots), out = {};
    for (const slot of slots) {
      if (!metas[slot]) continue;
      const chunks = {};
      for (const [key, v] of await this.loadChunks(slot)) chunks[`${keyCx(key)},${keyCz(key)}`] = toBase64(v);
      out[slot] = { meta: metas[slot], chunks };
    }
    return out;
  }

  // Reservekopie terugzetten: alle plekken worden vervangen door wat in de kopie staat
  async importAll(slots, data) {
    for (const slot of slots) await this.clearSlot(slot);
    for (const slot of slots) {
      const d = data?.[slot];
      if (!d?.meta || d.meta.v !== 4) continue;
      const chunks = new Map();
      for (const [id, b64] of Object.entries(d.chunks || {})) {
        const [cx, cz] = id.split(',').map(Number);
        if (Number.isInteger(cx) && Number.isInteger(cz) && typeof b64 === 'string') chunks.set(chunkKey(cx, cz), fromBase64(b64));
      }
      await this.save(slot, d.meta, chunks);
    }
  }
}

function parseKey(id) {
  const [cx, cz] = id.slice(id.indexOf(':') + 1).split(',').map(Number);
  return chunkKey(cx, cz);
}

function toU16(v) {
  if (v instanceof Uint16Array) return v;
  if (v instanceof ArrayBuffer) return new Uint16Array(v);
  if (ArrayBuffer.isView(v)) return new Uint16Array(v.buffer, v.byteOffset, v.byteLength >> 1);
  return new Uint16Array(v || []);
}
