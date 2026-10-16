// De lader: zorgt dat de chunks rond de speler gemaakt en getekend worden, en dat chunks
// ver weg weer opgeruimd worden. Het zware werk doen de workers; is er geen worker, dan doet
// de lader het zelf, een klein beetje per beeldje.

import { CHUNK, chunkKey } from './constants.js';
import { buildPad, meshChunk } from './mesher.js';
import { regionFor } from './light.js';
import { tintsFor } from './tint.js';

const WORKER_CACHE = 48; // zoveel chunks onthoudt elke worker (±3 MB)

export class ChunkLoader {
  constructor(world, scene, pool) {
    this.world = world;
    this.scene = scene;
    this.pool = pool;
    this.radius = 5;
    this.genJobs = new Set();
    this.meshJobs = new Set();
    this.ready = [];
    this.epoch = 0;
    this.applyBudget = 3;   // zoveel chunks per beeldje naar de beeldkaart sturen
    this.applyMs = 4;       // en niet langer dan zoveel ms (op een trage tablet dan één per beeldje: geen haperingen)
    this.sent = [];         // per worker: welke chunks (uid -> versie) hij al heeft, oudste eerst
  }

  // Nieuwe wereld: antwoorden voor de vorige wereld negeren
  reset() {
    this.epoch++;
    this.sent = []; this.pool?.tell?.({ type: 'reset' }); // de workers vergeten de chunks van de vorige wereld
    this.genJobs.clear();
    this.meshJobs.clear();
    this.ready.length = 0;
  }

  get pending() { return this.genJobs.size + this.meshJobs.size + this.ready.length; }

  // Dichtstbijzijnde eerst tekenen
  sortReady(pcx, pcz) {
    if (this.ready.length > 1) this.ready.sort((a, b) => Math.hypot(a.c.cx + 0.5 - pcx, a.c.cz + 0.5 - pcz) - Math.hypot(b.c.cx + 0.5 - pcx, b.c.cz + 0.5 - pcz));
  }

  // Is alles binnen de zichtafstand gemaakt en getekend?
  settled(px, pz) {
    const w = this.world, r = this.radius, pcx = px / CHUNK, pcz = pz / CHUNK;
    for (let cx = Math.floor(pcx - r - 1); cx <= Math.floor(pcx + r + 1); cx++) {
      for (let cz = Math.floor(pcz - r - 1); cz <= Math.floor(pcz + r + 1); cz++) {
        if (Math.hypot(cx + 0.5 - pcx, cz + 0.5 - pcz) > r + 0.5 || !w.allowed(cx, cz)) continue;
        if (!w.chunk(cx, cz)?.meshed) return false;
      }
    }
    return true;
  }

  update(px, pz, dirX = 0, dirZ = 0) {
    const w = this.world, r = this.radius;
    if (!w.gen) return;
    const pcx = px / CHUNK, pcz = pz / CHUNK;
    const dist = (cx, cz) => Math.hypot(cx + 0.5 - pcx, cz + 0.5 - pcz);

    // 1. Opruimen wat ver weg is
    for (const c of [...w.chunks.values()]) if (dist(c.cx, c.cz) > r + 3.5) w.unloadChunk(c.key);

    // 2. Wat dichtbij en vóór je ligt eerst
    const want = [];
    const R = Math.ceil(r + 2.5);
    for (let cx = Math.floor(pcx) - R; cx <= Math.floor(pcx) + R; cx++) {
      for (let cz = Math.floor(pcz) - R; cz <= Math.floor(pcz) + R; cz++) {
        const d = dist(cx, cz);
        // Laden tot iets verder dan tekenen: een chunk wordt pas getekend als ook zijn schuine buren er zijn
        if (d > r + 2 || !w.allowed(cx, cz)) continue;
        const ahead = d > 1 ? ((cx + 0.5 - pcx) * dirX + (cz + 0.5 - pcz) * dirZ) / d : 0;
        want.push([d - ahead * 1.5, cx, cz, d]);
      }
    }
    want.sort((a, b) => a[0] - b[0]);
    const sync = !this.pool?.ok;
    let syncGen = 0, syncMesh = 0;
    const t0 = performance.now();
    for (const [, cx, cz, d] of want) {
      const key = chunkKey(cx, cz);
      const c = w.chunks.get(key);
      if (!c) {
        if (this.genJobs.has(key)) continue;
        if (w.stored.has(key)) { w.loadChunk(cx, cz); continue; } // bewerkt: uit de opslag, gaat snel
        if (sync) {
          if (syncGen < 2 && performance.now() - t0 < 6) { w.loadChunk(cx, cz); syncGen++; }
        } else if (this.genJobs.size < 6) this.requestGen(cx, cz, key);
        continue;
      }
      if (d <= r + 0.5 && !c.meshed && !c.meshing && w.neighboursReady(cx, cz)) {
        if (sync) {
          if (syncMesh < 1 && performance.now() - t0 < 8) { this.meshNow(c); syncMesh++; }
        } else if (this.meshJobs.size < 4) this.requestMesh(c);
      }
    }

    // 3. Klaar gekomen chunks tekenen (een paar per beeldje)
    this.sortReady(pcx, pcz);
    const t1 = performance.now();
    for (let n = 0; this.ready.length && n < this.applyBudget && (n === 0 || performance.now() - t1 < this.applyMs); n++) {
      const job = this.ready.shift();
      job.c.meshing = false;
      if (w.chunks.get(job.c.key) !== job.c) continue;
      this.apply(job.c, job.sections, job.versions, job.light, job.around, job.merged);
    }
  }

  requestGen(cx, cz, key) {
    const w = this.world, epoch = this.epoch;
    this.genJobs.add(key);
    this.pool.run({ type: 'gen', worldType: w.type, seed: w.seed, classic: w.classic, gv: w.gv, cx, cz }).then((res) => {
      if (epoch !== this.epoch) return;
      this.genJobs.delete(key);
      if (!w.chunks.has(key) && !w.stored.has(key)) w.addChunk(cx, cz, res.blocks, false);
    }, () => { if (epoch === this.epoch) this.genJobs.delete(key); });
  }

  // De blokken voor een worker: de chunk en zijn 8 buren. Wat de worker al heeft (zelfde chunk,
  // zelfde versie) sturen we niet nog eens: zo kopieert het spel bij het vliegen ±9 keer minder.
  meshBlocks(c, index) {
    const sent = this.sent[index] ||= new Map(), uids = [], blocks = [], around = [], drop = [];
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const n = this.world.chunk(c.cx + dx, c.cz + dz);
      around.push(n ? n.version : -1);
      if (!n) { uids.push(null); blocks.push(null); continue; }
      const has = sent.get(n.uid) === n.version;
      sent.delete(n.uid); sent.set(n.uid, n.version); // achteraan: net gebruikt
      uids.push(n.uid); blocks.push(has ? null : n.blocks.slice());
    }
    while (sent.size > WORKER_CACHE) { const old = sent.keys().next().value; sent.delete(old); drop.push(old); }
    return { uids, blocks, around, drop };
  }

  requestMesh(c) {
    const epoch = this.epoch, versions = c.sectionVersion.slice();
    const index = this.pool.pick();
    const { uids, blocks, around, drop } = this.meshBlocks(c, index);
    c.meshing = true;
    this.meshJobs.add(c.key);
    const w = this.world;
    this.pool.run({ type: 'mesh', uids, blocks, drop, cx: c.cx, cz: c.cz, worldType: w.type, seed: w.seed, classic: w.classic, gv: w.gv }, blocks.filter(Boolean).map((b) => b.buffer), index).then((res) => {
      if (epoch !== this.epoch) return;
      this.meshJobs.delete(c.key);
      // c.meshing blijft aan tot de chunk echt getekend is, anders vragen we hem nog eens aan
      c.tints ||= res.tints;
      this.ready.push({ c, sections: res.sections, merged: res.merged, versions, light: res.light, around });
    }, () => {
      if (epoch !== this.epoch) return;
      this.meshJobs.delete(c.key);
      c.meshing = false;
      this.sent[index]?.clear(); // klopt de cache van deze worker niet meer? Dan volgende keer alles opnieuw
      this.pool.workers[index]?.postMessage({ type: 'reset' });
    });
  }

  meshNow(c) {
    const versions = c.sectionVersion.slice();
    const region = regionFor(this.world, c.cx - 1, c.cz - 1, 3, 3);
    c.light = region.chunkLight(c.cx, c.cz);
    c.tints ||= tintsFor(this.world.gen, c.cx, c.cz);
    const sections = meshChunk(buildPad(this.world, c.cx, c.cz), region.lightPad(c.cx, c.cz), this.scene.atlas.faceTiles, c.cx, c.cz, c.tints);
    this.apply(c, sections, versions, c.light, null);
  }

  // merged: de secties al per soort samengevoegd (door de worker), of null
  apply(c, sections, versions, light, around, merged = null) {
    let mask = 0;
    // Is er in de buurt gebouwd terwijl de worker bezig was? Dan klopt het licht misschien niet meer:
    // opnieuw uitrekenen (hier) en de hele chunk nog eens tekenen.
    if (around && this.world.aroundVersions(c.cx, c.cz).some((v, i) => v !== around[i])) {
      light = regionFor(this.world, c.cx - 1, c.cz - 1, 3, 3).chunkLight(c.cx, c.cz);
      mask = (1 << versions.length) - 1;
    }
    c.light = light;
    this.scene.setChunkSections(c, sections, merged);
    c.meshed = true;
    // Veranderd terwijl de worker bezig was? Dan die secties nog eens op de hoofdthread
    for (let s = 0; s < versions.length; s++) if (versions[s] !== c.sectionVersion[s]) mask |= 1 << s;
    if (mask) this.world.dirtySections.set(c.key, (this.world.dirtySections.get(c.key) || 0) | mask);
  }
}
