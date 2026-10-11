// De Wilde Nacht (fase 6): overdag heb je even de tijd om een huis te bouwen, want als het donker
// wordt, komen alle dieren op je af. Raken ze je, dan ben je een hartje kwijt; alle hartjes op is
// "gepakt". Overleef je de nacht, dan komt de volgende nacht (steeds moeilijker).
// Het is een losse spelstand op een eigen eiland: van deze wereld wordt niets bewaard.
import * as THREE from '../lib/three.module.min.js';
import { B, BLOCKS, blockBoxes } from './blocks.js';
import { ICONS } from './icons.js';
import { speech } from './speech.js';

export const HEARTS = 5;          // zoveel hartjes heb je
export const ARENA = 44;          // zo ver mag je van het midden (daarna is de mist te dik)
export const FALL_HURT = 4;       // een val van zoveel blokken kost een hartje
const DUSK_FROM = 0.5, DUSK_TO = 0.7, NIGHT = 0.78, DAWN = 0.96;
export const BOO_COOL = 15;       // zo lang moet de BOE-knop opladen (seconden)
const BOO_RANGE = 7, BOO_TIME = 4;

// Wat de dieren kunnen (fase 6C)
export const SNEAKERS = new Set(['chicken', 'rabbit', 'fox', 'cat', 'meerkat']);   // glippen door gaatjes, bang voor licht
export const JUMPERS = new Set(['goat', 'frog', 'raptor']);                         // springen 2 blokken hoog
export const CLIMBERS = new Set(['monkey']);                                         // klimmen tegen muren op
export const FLYERS = new Set(['parrot', 'snowyOwl', 'pteranodon']);                 // komen van boven
// Slopers: hoe sterk een blok mag zijn dat ze kapot krijgen
export const BASHERS = { pig: 2, cow: 2, polarBear: 2, hippo: 2, elephant: 4, triceratops: 4, trex: 10 };
// Gravers: graven zich naar beneden door aarde, gras en zand (zoals in het echt), maar slopen geen muren
export const DIGGERS = { rabbit: 2, fox: 2, meerkat: 2 };

// ---------- je eigen bouwstenen (fase 6D) ----------
// In de Wilde Nacht heb je alleen deze blokken, met een aantal. Sloop je iets, dan krijg je het
// terug (aarde van gras, planken van een boomstam, keien van steen). Elke overleefde nacht verdien je meer.
export const STOCK_ITEMS = [B.DIRT, B.PLANKS, B.COBBLE, B.BRICK, B.GLASS, B.IRON_BLOCK, B.OBSIDIAN, B.DOOR, B.TORCH];
export const START_STOCK = { [B.DIRT]: 24, [B.PLANKS]: 30, [B.COBBLE]: 10, [B.GLASS]: 4, [B.DOOR]: 1, [B.TORCH]: 3 };
export function nightReward(n) {
  if (n === 1) return { [B.PLANKS]: 20, [B.COBBLE]: 10, [B.GLASS]: 4, [B.TORCH]: 4 };
  if (n === 2) return { [B.COBBLE]: 15, [B.BRICK]: 8, [B.IRON_BLOCK]: 2, [B.DOOR]: 1 };
  if (n === 3) return { [B.BRICK]: 12, [B.IRON_BLOCK]: 4, [B.TORCH]: 4, [B.PLANKS]: 10 };
  if (n === 4) return { [B.IRON_BLOCK]: 6, [B.OBSIDIAN]: 2, [B.COBBLE]: 20 };
  return { [B.IRON_BLOCK]: 6, [B.OBSIDIAN]: 3, [B.BRICK]: 10 };
}
// Bij welk vakje van je voorraad hoort dit blok? (een deur telt één keer, een fakkel tegen de muur is ook een fakkel)
export function stockKey(id) {
  const b = BLOCKS[id];
  if (!b) return null;
  if (b.shape === 'door') return b.upper ? null : B.DOOR;
  if (id === B.TORCH || b.family === B.TORCH) return B.TORCH;
  return STOCK_ITEMS.includes(id) ? id : null;
}
// Wat je terugkrijgt als je dit blok sloopt: [vakje, aantal] of null
export function gainFor(id) {
  const key = stockKey(id);
  if (key) return [key, 1];
  if (id === B.GRASS || id === B.DIRT) return [B.DIRT, 1];
  if (id === B.STONE) return [B.COBBLE, 1];
  if (BLOCKS[id]?.sound === 'wood' && /stam/i.test(BLOCKS[id].name)) return [B.PLANKS, 2];
  return null;
}

// Hoe vaak je erop moet beuken voordat een blok kapot is (Infinity = nooit)
export function blockStrength(id) {
  const b = BLOCKS[id];
  if (!b?.solid) return 0;
  if (!b.breakable || id === B.OBSIDIAN || b.sound === 'metal') return Infinity;
  if (b.sound === 'glass') return 1;
  if (b.sound === 'grass' || b.sound === 'sand' || b.sound === 'wool') return 2;
  if (b.sound === 'wood') return 4;
  if (/bakste/i.test(b.name)) return 10; // bakstenen
  return 8;
}

// Valt er iets om als (x, y-1, z) weg is? Alles wat vanaf (x, y, z) aan elkaar vastzit en nergens
// op of naast de hoogte van het gat (of lager) steun heeft, valt. Geeft die blokken terug (of []).
export function looseBlocks(world, x, y, z, limit = 300) {
  const solid = (cx, cy, cz) => blockBoxes(world, cx, cy, cz, true).length > 0;
  if (!solid(x, y, z)) return [];
  const base = y - 1, seen = new Set([`${x},${y},${z}`]), cells = [[x, y, z]];
  for (let i = 0; i < cells.length; i++) {
    const [cx, cy, cz] = cells[i];
    if (cy <= base || cells.length > limit) return [];
    for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0], [0, -1, 0]]) {
      const nx = cx + dx, ny = cy + dy, nz = cz + dz, k = `${nx},${ny},${nz}`;
      if (seen.has(k) || !solid(nx, ny, nz)) continue;
      seen.add(k); cells.push([nx, ny, nz]);
    }
  }
  return cells;
}

// Wat er in nacht n gebeurt: hoe lang je mag bouwen, hoe lang de nacht duurt, welke dieren komen
// en hoe snel ze zijn. Elke nacht is moeilijker (fase 6D maakt dit verder af).
export function nightPlan(n) {
  // nacht 1: sluipers en beukers; 2: springers, klimmers en de leeuw; 3: vliegers (nu heb je een dak nodig);
  // 4: rammers (slopen hout); 5: de T-rex (sloopt bijna alles)
  const kinds = ['pig', 'cow', 'chicken', 'rabbit', 'fox'];
  if (n >= 2) kinds.push('goat', 'monkey', 'lion');
  if (n >= 3) kinds.push('parrot', 'snowyOwl', 'tiger', 'polarBear');
  if (n >= 4) kinds.push('elephant', 'triceratops', 'pteranodon', 'raptor');
  if (n >= 5) kinds.push('trex');
  return {
    build: Math.max(45, 90 - (n - 1) * 10),
    night: 120,
    count: Math.min(20, 8 + (n - 1) * 2),
    kinds,
    speed: 1 + Math.min(0.5, (n - 1) * 0.08),
    waves: 3, // de dieren komen in drie golven, elke golf feller
  };
}

// Is het huis dicht? Vanaf de speler kijken welke lege vakjes je kunt bereiken zonder door een
// blok te gaan. Kom je ver weg, hoog in de lucht of diep onder de grond uit, dan is er een gat.
// gap: een vakje bij het gat (of waar je staat, als je nog buiten staat).
export function houseCheck(world, px, py, pz, R = 10, H = 8) {
  const sx = Math.floor(px), sy = Math.floor(py + 0.1), sz = Math.floor(pz);
  // Een open deur of hekdeur is een gat (de dieren kunnen erdoor)
  const open = (x, y, z) => { const b = BLOCKS[world.get(x, y, z)]; return (b?.open && (b.shape === 'door' || b.shape === 'gate')) || blockBoxes(world, x, y, z, true).length === 0; };
  const key = (x, y, z) => `${x},${y},${z}`;
  const parent = new Map([[key(sx, sy, sz), null]]);
  const queue = [[sx, sy, sz]];
  let escape = null;
  for (let i = 0; i < queue.length && !escape; i++) {
    const [x, y, z] = queue[i];
    if (Math.abs(x - sx) > R || Math.abs(z - sz) > R || y > sy + H || y < sy - 4 || parent.size > 8000) { escape = [x, y, z]; break; }
    for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0], [0, -1, 0]]) {
      const nx = x + dx, ny = y + dy, nz = z + dz, k = key(nx, ny, nz);
      if (parent.has(k) || !open(nx, ny, nz)) continue;
      parent.set(k, [x, y, z]);
      queue.push([nx, ny, nz]);
    }
  }
  if (!escape) return { closed: true, gap: null };
  // De weg naar buiten terug volgen: het eerste vakje (vanaf de speler) met open lucht erboven is het gat
  const path = [];
  for (let c = escape; c; c = parent.get(key(...c))) path.unshift(c);
  const sky = ([x, y, z]) => { for (let yy = y + 1; yy <= sy + H; yy++) if (!open(x, yy, z)) return false; return true; };
  const gap = path.find(sky) || path[Math.min(path.length - 1, 3)];
  return { closed: false, gap: { x: gap[0], y: gap[1], z: gap[2] }, outside: sky(path[0]) };
}

// Gloeiende rode ogen met een rode gloed eromheen, en boze wenkbrauwen (fase 6B).
// Ze zijn ook in het donker en door de mist heen te zien. Eén keer gemaakt, gedeeld door alle dieren.
let EYES = null;
function eyeParts() {
  if (EYES) return EYES;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d'), grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,60,30,0.9)'); grad.addColorStop(0.35, 'rgba(255,20,10,0.35)'); grad.addColorStop(1, 'rgba(255,0,0,0)');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 64, 64);
  EYES = {
    eye: new THREE.MeshBasicMaterial({ color: 0xff2a12, fog: false }),
    brow: new THREE.MeshBasicMaterial({ color: 0x120404 }),
    glow: new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), fog: false, depthWrite: false, blending: THREE.AdditiveBlending, transparent: true }),
    box: new THREE.BoxGeometry(1, 1, 1),
  };
  return EYES;
}

export function addEyes(a) {
  if (a.eyes || !a.head?.geometry) return;
  const E = eyeParts(), head = a.head;
  head.geometry.computeBoundingBox();
  const bb = head.geometry.boundingBox, hp = head.position;
  const w = bb.max.x - bb.min.x, h = bb.max.y - bb.min.y;
  const s = Math.max(0.05, Math.min(0.16, w * 0.17));
  const cx = hp.x + (bb.min.x + bb.max.x) / 2, y = hp.y + bb.min.y + h * 0.62, z = hp.z + bb.min.z - 0.015;
  const eyes = new THREE.Group();
  for (const side of [-1, 1]) {
    const x = cx + side * Math.max(s * 0.9, w * 0.24);
    const eye = new THREE.Mesh(E.box, E.eye);
    eye.scale.set(s, s * 0.75, 0.03); eye.position.set(x, y, z);
    const brow = new THREE.Mesh(E.box, E.brow);
    brow.scale.set(s * 1.5, s * 0.32, 0.04); brow.position.set(x - side * s * 0.1, y + s * 0.62, z - 0.005);
    brow.rotation.z = side * 0.45; // naar binnen omlaag: boos
    const glow = new THREE.Sprite(E.glow);
    glow.scale.setScalar(s * 6); glow.position.set(x, y, z - 0.05);
    eyes.add(eye, brow, glow);
  }
  a.group.add(eyes);
  a.eyes = eyes;
}

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

export class Storm {
  // opts.build / opts.night: andere tijden (voor de tests)
  constructor(game, opts = {}) {
    this.g = game;
    this.opts = opts;
    this.night = 1;
    this.hearts = HEARTS;
    this.phase = 'dag';
    this.left = 0;
    this.invuln = 0;
    this.shake = 0;
    this.knock = null;
    this.peak = null;
    this.mistAt = 0;
    this.t = 0;              // eigen klok (seconden) voor geluiden en schrikmomenten
    this.growlAt = 3; this.beatAt = 0; this.scrapeAt = 0; this.scareAt = 18; this.droneAt = 0;
    this.look = 0;
    this.booLeft = 0;
    this.damage = new Map(); // beschadigde blokken: "x,y,z" -> { x, y, z, id, hits, mesh }
    this.stock = { ...START_STOCK };
    this.wave = 1;
    this.checkAt = 0;
    this.buildHud();
  }

  // ---------- scherm ----------

  buildHud() {
    const root = this.g.ui.hud.parentNode;
    this.bar = el('div', 'storm-bar');
    this.phaseEl = el('span', 'storm-phase');
    this.timeEl = el('span', 'storm-time');
    this.heartsEl = el('span', 'storm-hearts');
    this.bar.append(this.phaseEl, this.timeEl, this.heartsEl);
    this.g.ui.hud.appendChild(this.bar);
    // De BOE-knop: jaagt de dieren dichtbij even weg (en moet dan opladen)
    this.booBtn = el('button', 'btn storm-boo', `${ICONS.torch}<span>BOE!</span>`);
    this.booBtn.type = 'button';
    this.booBtn.setAttribute('aria-label', 'Boe! Dieren wegjagen');
    this.booBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.boo(); });
    this.g.ui.hud.appendChild(this.booBtn);
    this.flashEl = el('div', 'storm-flash');
    root.appendChild(this.flashEl);
    this.vignette = el('div', 'storm-vignette');
    root.insertBefore(this.vignette, this.g.ui.hud); // onder de knoppen, boven het spelbeeld
    this.endEl = el('div', 'storm-end');
    this.endEl.hidden = true;
    root.appendChild(this.endEl);
    this.shown = {};
  }

  destroy() {
    for (const e of [this.bar, this.booBtn, this.flashEl, this.vignette, this.endEl]) e.remove();
    for (const d of this.damage.values()) this.dropCrack(d);
    this.damage.clear();
    for (const a of this.animals()) this.g.animals.remove(a);
    this.g.scene.setStorm(0);
    this.g.sounds.drone(0);
  }

  render() {
    const phase = this.phase === 'dag' ? `${ICONS.sun}<b>Nacht ${this.night}</b> bouw een huis!`
      : this.phase === 'nacht' ? `${ICONS.wildNight}<b>Nacht ${this.night}</b> golf ${this.wave}/${this.plan.waves}`
        : this.phase === 'gepakt' ? `${ICONS.wildNight}<b>Nacht ${this.night}</b>` : `${ICONS.sun}<b>Nacht ${this.night}</b>`;
    const secs = Math.max(0, Math.ceil(this.left));
    const time = this.phase === 'dag' || this.phase === 'nacht' ? `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}` : '';
    if (this.shown.phase !== phase) { this.phaseEl.innerHTML = phase; this.shown.phase = phase; }
    if (this.shown.time !== time) { this.timeEl.textContent = time; this.shown.time = time; this.bar.classList.toggle('hurry', this.phase === 'dag' && secs <= 10); }
    if (this.shown.hearts !== this.hearts) {
      this.heartsEl.innerHTML = Array.from({ length: HEARTS }, (_, i) => `<i class="${i < this.hearts ? 'full' : 'empty'}">${ICONS.heart}</i>`).join('');
      this.shown.hearts = this.hearts;
    }
    this.bar.dataset.phase = this.phase;
  }

  // Groot bord midden in beeld (gepakt of overleefd) met knoppen
  showEnd(kind) {
    const g = this.g;
    g.playing = false; g.input.enabled = false; g.input.releaseAll();
    const caught = kind === 'gepakt';
    this.endEl.className = 'storm-end ' + kind;
    this.endEl.innerHTML = `<div class="storm-card"><h2>${caught ? 'Je bent gepakt!' : `Je hebt nacht ${this.night} overleefd!`}</h2>
      <p>${caught ? `Je hield het vol tot nacht ${this.night}.` : 'De zon komt op. De dieren rennen weg.'}</p>
      <div class="storm-stars">${Array.from({ length: HEARTS }, (_, i) => `<i class="${i < this.hearts ? 'full' : 'empty'}">${ICONS.heart}</i>`).join('')}</div>
      ${!caught && this.reward ? `<p class="storm-reward-title">Je verdient nieuwe bouwstenen:</p><div class="storm-reward">${Object.entries(this.reward)
    .map(([id, n]) => `<span><img src="${g.ui.icons[id]}" alt="">+${n}</span>`).join('')}</div>` : ''}
      <div class="storm-buttons"></div></div>`;
    const buttons = this.endEl.querySelector('.storm-buttons');
    const add = (cls, icon, label, fn) => {
      const b = el('button', 'btn storm-btn ' + cls, `${ICONS[icon] || ''}<span>${label}</span>`);
      b.type = 'button';
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); fn(); });
      buttons.appendChild(b);
    };
    if (caught) add('again', 'restore', 'Nog een keer', () => g.startStorm(this.opts));
    else add('next', 'wildNight', 'Volgende nacht', () => this.nextNight());
    add('stop', 'close', 'Stoppen', () => g.stopStorm());
    this.endEl.hidden = false;
    this.phase = kind;
    this.render();
  }

  // ---------- het verloop ----------

  begin() {
    const p = this.g.player;
    this.center = { x: p.x, z: p.z };
    this.beginDay();
  }

  beginDay() {
    const g = this.g;
    this.plan = nightPlan(this.night);
    this.phase = 'dag';
    this.total = this.left = this.opts.build ?? this.plan.build;
    this.lastTick = Math.ceil(this.left);
    this.endEl.hidden = true;
    // De golven: de eerste staat al te wachten, de tweede en derde komen tijdens de nacht
    const n1 = Math.ceil(this.plan.count * 0.4), n2 = Math.ceil((this.plan.count - n1) / 2);
    this.waveSizes = [n1, n2, this.plan.count - n1 - n2];
    this.wave = 1;
    this.spawnRing();
    const text = this.night === 1 ? 'Bouw snel een huis! Als het donker wordt, komen de dieren.' : `Nacht ${this.night}. Maak je huis sterker!`;
    speech.say(text);
    g.ui.say(this.night === 1 ? 'Bouw snel een huis!' : `Nacht ${this.night}: maak je huis sterker!`, 'home');
    g.daynight.set(DUSK_FROM);
    this.render();
  }

  beginNight() {
    const g = this.g;
    this.phase = 'nacht';
    this.left = this.opts.night ?? this.plan.night;
    g.daynight.set(NIGHT);
    g.sounds.animal('lion');
    speech.say('Daar komen ze!');
    const house = this.checkHouse();
    g.ui.say(house.closed ? 'Daar komen ze!' : 'Daar komen ze! Je huis is nog open!', 'wildNight');
    this.render();
  }

  survived() {
    const g = this.g, p = g.player;
    g.sounds.drone(0);
    this.phase = 'ochtend';
    this.left = 3;
    for (let i = 0; i < 5; i++) setTimeout(() => g.particles.firework(p.x + (Math.random() - 0.5) * 8, p.y + 2, p.z + (Math.random() - 0.5) * 8), i * 350);
    g.sounds.magic();
    speech.say(`Hoera! Je hebt nacht ${this.night} overleefd!`);
    // Beloning: nieuwe bouwstenen
    this.reward = nightReward(this.night);
    for (const [id, n] of Object.entries(this.reward)) this.stock[id] = (this.stock[id] || 0) + n;
    g.ui.setCounts?.(this.counts());
    g.note('stormNight', { night: this.night });
    const best = g.settings.wildeNacht?.record || 0;
    if (this.night > best) { g.settings.wildeNacht = { ...(g.settings.wildeNacht || {}), record: this.night }; g.saveSettings(); }
  }

  caught(a) {
    const g = this.g;
    g.sounds.drone(0);
    g.sounds.roar(0, 1.2);
    speech.say('Je bent gepakt!');
    this.showEnd('gepakt');
  }

  nextNight() {
    const g = this.g;
    this.night++;
    this.hearts = Math.min(HEARTS, this.hearts + 2);
    g.playing = true; g.input.enabled = true;
    this.beginDay();
  }

  // Elke nacht staat de eerste golf dieren eerst in een kring om je heen (ver weg) en kijkt naar je
  spawnRing() {
    for (const a of this.animals()) this.g.animals.remove(a);
    return this.spawnGroup(this.waveSizes[0], 0);
  }

  // Een groepje dieren aan de rand. offset: waar in de lijst met soorten we beginnen (latere golven
  // krijgen de nieuwere, gevaarlijkere soorten van deze nacht)
  spawnGroup(count, offset) {
    const g = this.g, w = g.world, c = this.center, plan = this.plan, made = [];
    w.ensureArea(Math.floor(c.x) - 36, Math.floor(c.z) - 36, Math.floor(c.x) + 36, Math.floor(c.z) + 36);
    for (let i = 0, tries = 0; i < count && tries < count * 8; tries++) {
      const type = plan.kinds[(offset + i + this.night) % plan.kinds.length];
      const angle = (tries / count) * Math.PI * 2 + Math.random() * 0.4, r = 24 + Math.random() * 7;
      const x = Math.floor(c.x + Math.cos(angle) * r), z = Math.floor(c.z + Math.sin(angle) * r);
      const y = w.surfaceY(x, z) + 1;
      const a = g.animals.spawn(type, x + 0.5, y, z + 0.5, Math.atan2(-(c.x - x), -(c.z - z)));
      if (!a) break;
      if (!a.clearAt(w, a.x, a.y, a.z) || w.get(x, y, z) !== 0) { g.animals.remove(a); continue; }
      a.storm = true; a.wild = false; a.waveBoost = 1 + 0.12 * (this.wave - 1);
      addEyes(a);
      made.push(a);
      i++;
    }
    return made;
  }

  // Een nieuwe golf: er komen er meer aan, en ze zijn feller
  nextWave() {
    const g = this.g, p = g.player;
    this.wave++;
    const offset = this.waveSizes.slice(0, this.wave - 1).reduce((m, v) => m + v, 0);
    const made = this.spawnGroup(this.waveSizes[this.wave - 1], offset);
    g.sounds.roar(0, 0.9);
    this.shake = Math.max(this.shake, 0.3);
    speech.say(this.wave === this.plan.waves ? 'De laatste golf! Hou vol!' : 'Er komen er meer aan!');
    g.ui.say(`Golf ${this.wave}!`, 'wildNight');
    for (const a of made) this.stare(a, p);
    this.render();
    return made.length;
  }

  animals() { return this.g.animals.list.filter((a) => a.storm); }

  update(dt) {
    if (this.phase === 'gepakt' || this.phase === 'overleefd') return;
    const g = this.g, p = g.player;
    this.t += dt;
    this.invuln = Math.max(0, this.invuln - dt);
    this.shake = Math.max(0, this.shake - dt);
    this.keepInside(p);
    this.knockStep(dt, p);
    this.fall(p);
    this.booLeft = Math.max(0, this.booLeft - dt);
    this.booBtn.style.setProperty('--cool', String(this.booLeft / BOO_COOL));
    this.booBtn.classList.toggle('ready', this.booLeft <= 0);
    if (this.t >= this.checkAt) { this.checkAt = this.t + 0.5; this.checkDamage(); }
    if (this.phase === 'dag') {
      this.left -= dt;
      g.daynight.set(DUSK_FROM + (1 - Math.max(0, this.left) / this.total) * (DUSK_TO - DUSK_FROM)); // de zon zakt
      for (const a of this.animals()) this.stare(a, p);
      this.setLook(0.35 * (1 - Math.max(0, this.left) / this.total));
      this.growls(p, 14, 4, 0.45); // af en toe gromt er een in de verte
      const s = Math.ceil(this.left);
      if (s !== this.lastTick && s > 0 && s <= 10) {
        this.lastTick = s;
        g.sounds.tick();
        if (s === 10) { speech.say('Nog tien tellen!'); this.checkHouse(true); } else if (s <= 3) speech.say(String(s));
      }
      if (this.left <= 0) this.beginNight();
    } else if (this.phase === 'nacht') {
      this.left -= dt;
      g.daynight.set(NIGHT);
      const total = this.opts.night ?? this.plan.night;
      if (this.wave < this.plan.waves && total - this.left >= total * this.wave / this.plan.waves) this.nextWave();
      for (const a of this.animals()) this.chase(a, dt, p);
      this.setLook(1);
      this.scary(p);
      if (this.left <= 0) this.survived();
    } else if (this.phase === 'ochtend') {
      this.left -= dt;
      g.daynight.set(DAWN + (1 - Math.max(0, this.left) / 3) * 0.06);
      for (const a of this.animals()) this.flee(a, p);
      this.setLook(Math.max(0, this.left) / 3);
      if (this.left <= 0) this.showEnd('overleefd');
    }
    if (this.phase === 'dag' || this.phase === 'nacht' || this.phase === 'ochtend') this.render();
  }

  // ---------- eng (fase 6B) ----------

  setLook(v) {
    if (Math.abs(v - this.look) < 0.01 && v !== 0) return;
    this.look = v;
    this.g.scene.setStorm(v);
    this.vignette.style.opacity = String(0.7 * v); // niet te donker: je moet nog kunnen bouwen
  }

  // Waar komt een geluid vandaan? -1 = links, 1 = rechts (kijkend zoals de speler kijkt)
  pan(x, z) {
    const p = this.g.player, dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz) || 1;
    return Math.max(-1, Math.min(1, (dx * Math.cos(p.yaw) - dz * Math.sin(p.yaw)) / d));
  }

  // Een willekeurig dier binnen `range` gromt (hoogstens om de `gap` seconden)
  growls(p, range, gap, vol = 1) {
    if (this.t < this.growlAt) return;
    this.growlAt = this.t + gap * (0.6 + Math.random() * 0.8);
    const near = this.animals().filter((a) => Math.hypot(a.x - p.x, a.z - p.z) < range);
    const a = near[Math.floor(Math.random() * near.length)];
    if (!a) return;
    const d = Math.hypot(a.x - p.x, a.z - p.z);
    this.g.sounds.growl(this.pan(a.x, a.z), vol * Math.max(0.25, 1 - d / range));
  }

  // 's Nachts: hartslag als ze dichtbij zijn, grommen, krabben en bonken tegen je huis,
  // een dreigende bromtoon die steeds harder wordt, en af en toe een schrikmoment
  scary(p) {
    const g = this.g, all = this.animals();
    let nearest = Infinity;
    for (const a of all) nearest = Math.min(nearest, Math.hypot(a.x - p.x, a.z - p.z));
    if (nearest < 10 && this.t >= this.beatAt) {
      const k = nearest / 10;
      g.sounds.heartbeat(0.3 + 0.7 * (1 - k));
      this.beatAt = this.t + 0.35 + k * 0.75;
      this.vignette.classList.remove('beat'); void this.vignette.offsetWidth; this.vignette.classList.add('beat');
    }
    this.growls(p, 16, 2.2);
    if (this.t >= this.scrapeAt) {
      this.scrapeAt = this.t + 0.45 + Math.random() * 0.6;
      const at = all.find((a) => Math.hypot(a.x - p.x, a.z - p.z) < 4.5 && !this.clearLine(a, p));
      if (at) {
        const pan = this.pan(at.x, at.z);
        if (Math.random() < 0.45) { g.sounds.bonk(pan); this.shake = Math.max(this.shake, 0.1); } else g.sounds.scratch(pan);
      }
    }
    if (this.t >= this.droneAt) {
      this.droneAt = this.t + 1;
      const total = this.opts.night ?? this.plan.night;
      g.sounds.drone(0.5 + 0.5 * (1 - Math.max(0, this.left) / total));
    }
    if (this.t >= this.scareAt) { this.scareAt = this.t + 22 + Math.random() * 18; this.jumpScare(p); }
  }

  // Schrikmoment: zit je in je huis en kijk je naar een raam? Dan staat er ineens een dier voor
  // het raam, met een brul. Geen raam: een brul en een klap tegen de muur.
  jumpScare(p) {
    const g = this.g, w = g.world;
    const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), px = Math.floor(p.x), py = Math.floor(p.y), pz = Math.floor(p.z);
    let best = null;
    for (let dx = -5; dx <= 5; dx++) for (let dz = -5; dz <= 5; dz++) for (let dy = 0; dy <= 2; dy++) {
      const b = BLOCKS[w.get(px + dx, py + dy, pz + dz)];
      if (!b?.solid || b.sound !== 'glass') continue;
      const vx = dx + 0.5 - (p.x - px), vz = dz + 0.5 - (p.z - pz), d = Math.hypot(vx, vz);
      if (d < 1.2 || d > 6) continue;
      const dot = (vx * fx + vz * fz) / d;
      if (dot < 0.55 || (best && dot <= best.dot)) continue;
      // de buitenkant van het raam (sx, sz: de richting naar buiten)
      const sx = Math.abs(vx) > Math.abs(vz) ? Math.sign(vx) : 0, sz = sx ? 0 : Math.sign(vz);
      const oy = w.surfaceY(px + dx + sx, pz + dz + sz) + 1;
      if (oy > py + dy + 1 || oy < py + dy - 3) continue;
      best = { dot, wx: px + dx + 0.5, wz: pz + dz + 0.5, sx, sz, y: oy };
    }
    const scary = ['trex', 'tiger', 'lion', 'polarBear', 'elephant', 'lioness'];
    const all = this.animals().sort((a, b) => scary.indexOf(b.type) - scary.indexOf(a.type));
    if (best) {
      // Met zijn kop tegen het raam: het midden van het dier ligt een halve lengte van het glas af
      const spot = (a) => {
        const off = 0.5 + a.def.d / 2 + 0.05;
        return { x: best.wx + best.sx * off, y: best.y, z: best.wz + best.sz * off, yaw: Math.atan2(best.sx, best.sz) };
      };
      const a = all.find((x) => {
        const s = spot(x), keep = x.yaw;
        x.yaw = s.yaw;
        const ok = x.clearAt(w, s.x, s.y, s.z);
        x.yaw = keep;
        return ok;
      });
      if (a) {
        const s = spot(a);
        a.x = s.x; a.y = s.y; a.z = s.z; a.vy = 0;
        a.yaw = a.targetYaw = s.yaw;
        a.scare = 1.6; a.walking = false; a.sync();
        g.sounds.roar(this.pan(a.x, a.z));
        this.shake = 0.6;
        this.scared = (this.scared || 0) + 1;
        return;
      }
    }
    if (houseCheck(w, p.x, p.y, p.z).closed) { const side = Math.random() < 0.5 ? -1 : 1; g.sounds.roar(side * 0.8, 0.8); g.sounds.bonk(side * 0.8); this.shake = 0.3; }
  }

  // Overdag: stilstaan en staren
  stare(a, p) {
    a.walking = false; a.sleep = 0; a.graze = false; a.timer = 5; a.hunt = null; a.chaseSpeed = 0; a.flight = null;
    a.targetYaw = Math.atan2(-(p.x - a.x), -(p.z - a.z));
  }

  // 's Nachts: op je af. Loopt een dier vast (tegen een muur of boom), dan probeert hij het even opzij,
  // of hij sloopt de muur, springt eroverheen of klimt erop (fase 6C), elk dier op zijn eigen manier.
  chase(a, dt, p) {
    const dx = p.x - a.x, dz = p.z - a.z, dist = Math.hypot(dx, dz), ux = dx / (dist || 1), uz = dz / (dist || 1);
    a.sleep = 0; a.happy = 0; a.graze = false; a.timer = 5; a.hunt = null; a.hiding = false;
    if (a.scare > 0) { a.scare -= dt; a.walking = false; a.targetYaw = Math.atan2(-dx, -dz); return; } // staat voor het raam te staren
    a.chaseSpeed = Math.min(6.2, Math.max(3.2, a.def.speed * 2.6)) * this.plan.speed * (a.waveBoost || 1);
    a.stormCool = Math.max(0, (a.stormCool || 0) - dt);
    // BOE! Even weg van je af
    if (a.boo > 0) { a.boo -= dt; a.walking = true; a.flight = null; a.chaseSpeed = 5.5; a.targetYaw = Math.atan2(ux, uz); return; }
    if (FLYERS.has(a.type)) { this.fly(a, p, dist); return; }
    const w = this.g.world, front = this.front(a, ux, uz);
    // Kleine dieren durven niet in het licht van een fakkel (binnen 3 blokken)
    if (SNEAKERS.has(a.type)) {
      if ((a.lightT = (a.lightT || 0) - dt) <= 0) { a.lightT = 0.3; a.afraid = this.nearLight(front.x, Math.floor(a.y + 0.5), front.z); }
      if (a.afraid) { a.walking = false; a.targetYaw = Math.atan2(-dx, -dz); return; }
    }
    // Zit Jippe onder de grond (een kelder, een gang), recht onder het dier? Dan graaft het naar beneden:
    // slopers en gravers, door blokken die niet te sterk voor ze zijn
    const digPower = BASHERS[a.type] || DIGGERS[a.type];
    if (digPower && a.onGround && p.y < a.y - 1.2 && dist < Math.max(1.2, Math.max(a.def.w, a.def.d) * 0.4)) {
      const cell = this.digCell(a, p, digPower);
      // Boven een open gat, maar met een hoek op iets sterks (de rand van een stenen muur): opzij glijden
      if (cell === 'slide') { a.walking = true; a.targetYaw = Math.atan2(-dx, -dz); return; }
      if (cell) {
        a.walking = false;
        if ((a.bashT = (a.bashT ?? 0.6) - dt) <= 0) { a.bashT = 0.9 / this.plan.speed; this.bash(a, cell[0], cell[1], cell[2], 0, 0, true); }
        return;
      }
    }
    // Slopers beuken op het blok dat in de weg staat (als ze er sterk genoeg voor zijn)
    const power = BASHERS[a.type];
    if (power && front.wall) {
      const strength = blockStrength(w.get(front.x, front.wall, front.z));
      if (strength && strength <= power) {
        a.walking = false; a.targetYaw = Math.atan2(-dx, -dz);
        if ((a.bashT = (a.bashT ?? 0.6) - dt) <= 0) { a.bashT = 0.9 / this.plan.speed; this.bash(a, front.x, front.wall, front.z, ux, uz); }
        return;
      }
    }
    // Springers springen over een muur van 2 hoog, klimmers klimmen erop
    if (JUMPERS.has(a.type) && a.onGround && front.solid[0] && front.solid[1] && !front.solid[2]) a.vy = 9.3;
    if (CLIMBERS.has(a.type) && front.solid[0] && a.clearAt(w, a.x, a.y + 0.35, a.z)) { a.y += 3 * dt; a.vy = 0; a.climbing = 0.15; }
    let yaw = Math.atan2(-dx, -dz);
    if ((a.backoff = Math.max(0, (a.backoff || 0) - dt)) > 0) yaw += Math.PI; // na een aanval even terug
    else if ((a.detour = Math.max(0, (a.detour || 0) - dt)) > 0) yaw += a.detourSide * 1.25;
    else if ((a.progressT = (a.progressT || 0) + dt) > 1) {
      if ((a.lastDist ?? Infinity) - dist < 0.4 && dist > 2.5) { a.detour = 0.9; a.detourSide = Math.random() < 0.5 ? -1 : 1; }
      a.lastDist = dist; a.progressT = 0;
    }
    a.targetYaw = yaw;
    const reach = Math.max(a.def.w, a.def.d) / 2 + 0.75;
    a.walking = dist > reach * 0.7 || a.backoff > 0;
    if (dist < reach && p.y < a.y + a.def.h + 0.3 && a.y < p.y + 1.8 && a.stormCool <= 0 && this.invuln <= 0 && this.clearLine(a, p)) this.hurt(a);
  }

  // Wat staat er vlak voor het dier (in de richting van de speler)? solid[i]: blok op hoogte y+i;
  // wall: de hoogte van het eerste blok dat in de weg staat (of null)
  front(a, ux, uz) {
    const w = this.g.world, probe = Math.max(a.def.w, a.def.d) / 2 + 0.35;
    const x = Math.floor(a.x + ux * probe), z = Math.floor(a.z + uz * probe), y0 = Math.floor(a.y + 0.05);
    const solid = [0, 1, 2].map((i) => blockBoxes(w, x, y0 + i, z, true).length > 0);
    let wall = null;
    for (let y = y0; y < a.y + Math.min(a.def.h, 2.6); y++) if (blockBoxes(w, x, y, z, true).length) { wall = y; break; }
    return { x, z, y0, solid, wall };
  }

  // Welk blok onder het dier graaft hij weg? Alle blokken onder zijn lijf moeten weg voordat hij valt;
  // eerst het blok het dichtst bij Jippe. Blijft hij alleen nog met een hoek op iets te sterks staan terwijl
  // onder zijn midden een gat is: 'slide' (opzij glijden). Staat hij midden op iets te sterks: null.
  digCell(a, p, power) {
    const w = this.g.world, r = a.def.w * 0.43, d = a.def.d * 0.3, sin = Math.sin(a.yaw), cos = Math.cos(a.yaw);
    const rx = Math.abs(cos * r) + Math.abs(sin * d), rz = Math.abs(sin * r) + Math.abs(cos * d);
    let best = null, bestD = Infinity, strong = false;
    // (ook de laag waar zijn voeten in staan: in een smal gat steunt een hoek van zijn lijf soms op de rand)
    const levels = [...new Set([Math.floor(a.y - 0.5), Math.floor(a.y)])];
    for (const by of levels) for (let bx = Math.floor(a.x - rx); bx <= Math.floor(a.x + rx); bx++) for (let bz = Math.floor(a.z - rz); bz <= Math.floor(a.z + rz); bz++) {
      if (!blockBoxes(w, bx, by, bz, true).length) continue;
      const strength = blockStrength(w.get(bx, by, bz));
      if (!strength || strength > power) { strong = true; continue; }
      const dd = Math.hypot(bx + 0.5 - p.x, bz + 0.5 - p.z);
      if (dd < bestD) { bestD = dd; best = [bx, by, bz]; }
    }
    if (!strong) return best;
    // Iets te sterks onder hem: alleen verder als er onder zijn midden al een gat is
    const centerOpen = !blockBoxes(w, Math.floor(a.x), Math.floor(a.y - 0.5), Math.floor(a.z), true).length;
    return centerOpen ? (best || 'slide') : null;
  }

  // Vliegers vliegen recht op je af als dat kan; anders cirkelen ze boven je. Zonder dak duiken ze naar binnen.
  fly(a, p, dist) {
    const open = this.openAbove(p);
    const low = (dist < 3 && open) || this.clearLine(a, p);
    a.flight = { x: p.x, y: low ? p.y + 0.9 : p.y + 5.5, z: p.z, left: 1 };
    a.walking = dist > 0.6;
    a.targetYaw = Math.atan2(-(p.x - a.x), -(p.z - a.z));
    const reach = Math.max(a.def.w, a.def.d) / 2 + 0.75;
    if (dist < reach && p.y < a.y + a.def.h + 0.3 && a.y < p.y + 1.8 && a.stormCool <= 0 && this.invuln <= 0 && this.clearLine(a, p)) this.hurt(a);
  }

  // Staat er een fakkel, lantaarn of ander licht binnen 3 blokken?
  nearLight(x, y, z) {
    const w = this.g.world;
    for (let dx = -3; dx <= 3; dx++) for (let dy = -2; dy <= 2; dy++) for (let dz = -3; dz <= 3; dz++) {
      if (dx * dx + dy * dy + dz * dz <= 10.5 && (BLOCKS[w.get(x + dx, y + dy, z + dz)]?.light || 0) >= 12) return true;
    }
    return false;
  }

  // Is er boven de speler een dak (binnen 7 blokken)?
  openAbove(p) {
    const w = this.g.world, x = Math.floor(p.x), z = Math.floor(p.z);
    for (let y = Math.floor(p.y) + 2; y <= Math.floor(p.y) + 8; y++) if (blockBoxes(w, x, y, z, true).length) return false;
    return true;
  }

  // Eén beuk tegen een blok: scheurtjes, en bij genoeg beuken gaat het kapot
  bash(a, x, y, z, ux, uz, dig = false) {
    const g = this.g, w = g.world, id = w.get(x, y, z), strength = blockStrength(id), key = `${x},${y},${z}`;
    let d = this.damage.get(key);
    if (!d || d.id !== id) { if (d) this.dropCrack(d); d = { x, y, z, id, hits: 0, mesh: null }; this.damage.set(key, d); }
    d.hits++;
    const p = g.player, near = Math.hypot(x + 0.5 - p.x, z + 0.5 - p.z);
    if (dig) g.sounds.scratch(this.pan(x + 0.5, z + 0.5), Math.max(0.4, 1 - near / 12)); // graven: krabbelen
    else g.sounds.bonk(this.pan(x + 0.5, z + 0.5), Math.max(0.3, 1 - near / 16));
    if (near < 7) this.shake = Math.max(this.shake, 0.15);
    g.particles.burst(x, y, z, g.atlas?.particleColors?.[id] || [[0.6, 0.5, 0.4]], 5);
    if (d.hits < strength) { this.showCrack(d, Math.min(3, Math.floor(d.hits / strength * 4))); return; }
    this.dropCrack(d); this.damage.delete(key);
    this.breakBlock(x, y, z, ux, uz);
    a.bashT = 0.4;
  }

  breakBlock(x, y, z, ux = 0, uz = 0) {
    const g = this.g, w = g.world, id = w.get(x, y, z), b = BLOCKS[id];
    w.set(x, y, z, 0);
    if (b.shape === 'door') { const oy = b.upper ? y - 1 : y + 1; if (BLOCKS[w.get(x, oy, z)].family === b.family) w.set(x, oy, z, 0); }
    g.sounds.break(b.sound);
    g.particles.burst(x, y, z, g.atlas?.particleColors?.[id] || [[0.6, 0.5, 0.4]], 16);
    this.broken = (this.broken || 0) + 1;
    this.collapse(x, y + 1, z, ux, uz);
  }

  // Een toren zonder steun valt om (in de richting waarin het dier duwde): hoe hoger, hoe verder opzij
  collapse(x, y, z, ux, uz) {
    const g = this.g, cells = looseBlocks(g.world, x, y, z);
    if (!cells.length) return 0;
    cells.sort((m, n) => m[1] - n[1]);
    for (const [cx, cy, cz] of cells) {
      const shift = Math.round((cy - y + 1) * 0.6);
      g.physics.drop(cx, cy, cz, cx + Math.round(ux * shift), cz + Math.round(uz * shift));
    }
    g.sounds.break('stone');
    this.shake = Math.max(this.shake, 0.45);
    this.collapsed = (this.collapsed || 0) + cells.length;
    return cells.length;
  }

  showCrack(d, stage) {
    const sc = this.g.scene;
    if (!d.mesh) {
      d.mesh = new THREE.Mesh(sc.crack.geometry, sc.crack.material.clone());
      d.mesh.position.set(d.x + 0.5, d.y + 0.5, d.z + 0.5);
      sc.scene.add(d.mesh);
    }
    d.mesh.material.map = sc.crackTex[stage];
    d.mesh.material.needsUpdate = true;
  }

  dropCrack(d) {
    if (!d.mesh) return;
    this.g.scene.scene.remove(d.mesh);
    d.mesh.material.dispose();
    d.mesh = null;
  }

  // Jippe heeft gebouwd of gesloopt: een beschadigd blok op die plek is weer heel, en de voorraad
  // bouwstenen wordt bijgewerkt (bouwen kost een blok, slopen geeft er een terug)
  edited(changes) {
    for (const c of changes) {
      const key = `${c.x},${c.y},${c.z}`, d = this.damage.get(key);
      if (d) { this.dropCrack(d); this.damage.delete(key); this.g.note('stormRepair'); }
      if (c.to) { const k = stockKey(c.to); if (k) this.stock[k] = Math.max(0, (this.stock[k] || 0) - 1); }
      if (c.from && !c.to) { const gain = gainFor(c.from); if (gain) this.stock[gain[0]] = (this.stock[gain[0]] || 0) + gain[1]; }
    }
    this.g.ui.setCounts?.(this.counts());
  }

  // Heb je nog zo'n blok?
  hasStock(id) {
    const k = stockKey(id);
    return !!k && (this.stock[k] || 0) > 0;
  }

  // Aantallen voor de onderbalk (in de volgorde van de vakjes)
  counts() { return this.g.hotbar.map((id) => this.stock[stockKey(id)] ?? 0); }

  // Een beschadigd blok dat (op een andere manier) veranderd is, is weer heel
  checkDamage() {
    const w = this.g.world;
    for (const [key, d] of this.damage) if (w.get(d.x, d.y, d.z) !== d.id) { this.dropCrack(d); this.damage.delete(key); }
  }

  // BOE! Alle dieren dichtbij schrikken en rennen even weg. Daarna moet de knop opladen.
  boo() {
    const g = this.g, p = g.player;
    if (this.booLeft > 0 || (this.phase !== 'dag' && this.phase !== 'nacht')) { g.sounds.nope(); return 0; }
    this.booLeft = BOO_COOL;
    let n = 0;
    for (const a of this.animals()) {
      if (Math.hypot(a.x - p.x, a.z - p.z) > BOO_RANGE) continue;
      a.boo = BOO_TIME; a.scare = 0; a.flight = null; n++;
    }
    g.particles.burst(p.x - 0.5, p.y + 0.6, p.z - 0.5, [[1, 0.55, 0.1], [1, 0.85, 0.25], [1, 0.3, 0.05]], 50, true);
    g.sounds.whoosh(); g.sounds.roar(0, 0.35);
    speech.say('Boe!');
    g.ui.say(n ? 'BOE! Weg jullie!' : 'BOE!', 'torch');
    this.boos = (this.boos || 0) + 1;
    if (n) g.note('boo', { n });
    this.render();
    return n;
  }

  // Bij zonsopkomst: weg van je af, en dan verdwijnen ze
  flee(a, p) {
    a.sleep = 0; a.timer = 5; a.walking = true; a.chaseSpeed = 4; a.flight = null; a.boo = 0;
    a.targetYaw = Math.atan2(-(a.x - p.x), -(a.z - p.z));
  }

  // Zit er een blok tussen het dier en de speler? (dan kan hij je niet raken). Op twee hoogtes van
  // de speler, vanaf het dier (ook van boven: een vlieger boven het dak kan niet door het dak heen)
  clearLine(a, p) {
    const w = this.g.world, ay = a.y + Math.min(a.def.h, 1.5) / 2;
    for (const py of [p.y + 0.4, p.y + 1.4]) {
      // een groot dier raakt je op jouw hoogte; een vlieger komt echt van boven
      const from = a.flight ? ay : Math.max(Math.min(ay, py + 1), py - 1);
      for (const t of [0.2, 0.4, 0.6, 0.8]) {
        const x = Math.floor(a.x + (p.x - a.x) * t), z = Math.floor(a.z + (p.z - a.z) * t), y = Math.floor(from + (py - from) * t);
        if (blockBoxes(w, x, y, z, true).length) return false;
      }
    }
    return true;
  }

  // Een hartje kwijt (a = het dier dat je raakte; null = gevallen)
  hurt(a) {
    const g = this.g, p = g.player;
    if (this.phase !== 'dag' && this.phase !== 'nacht') return;
    this.hearts = Math.max(0, this.hearts - 1);
    this.invuln = 1;
    this.shake = 0.35;
    if (a) {
      a.stormCool = 1.6; a.backoff = 0.7;
      const dx = p.x - a.x, dz = p.z - a.z, d = Math.hypot(dx, dz) || 1;
      this.knock = { x: dx / d * 8, z: dz / d * 8, t: 0.25 };
      p.vy = Math.max(p.vy, 5); p.onGround = false;
      g.sounds.animal(a.type);
    }
    g.sounds.place('wood');
    this.flashEl.classList.remove('on');
    void this.flashEl.offsetWidth; // animatie opnieuw starten
    this.flashEl.classList.add('on');
    this.render();
    if (this.hearts === 0) this.caught(a);
  }

  knockStep(dt, p) {
    if (!this.knock) return;
    const w = this.g.world, step = Math.min(dt, this.knock.t);
    p.moveAxis(w, 0, this.knock.x * step);
    p.moveAxis(w, 2, this.knock.z * step);
    if ((this.knock.t -= dt) <= 0) this.knock = null;
  }

  // Vallen: van 4 blokken of hoger kost een hartje (in het water niet)
  fall(p) {
    if (p.onGround || p.inWater || p.climbing || p.flying) {
      if (this.peak !== null && p.onGround && !p.inWater && this.peak - p.y >= FALL_HURT) this.hurt(null);
      this.peak = null;
    } else this.peak = Math.max(this.peak ?? p.y, p.y);
  }

  // Niet te ver weg: daar is de mist te dik
  keepInside(p) {
    const dx = p.x - this.center.x, dz = p.z - this.center.z, d = Math.hypot(dx, dz);
    if (d <= ARENA) return;
    p.x = this.center.x + dx / d * ARENA; p.z = this.center.z + dz / d * ARENA;
    p.vx = p.vz = 0;
    const now = performance.now();
    if (now > this.mistAt) { this.g.ui.say('De mist is te dik. Hier kun je niet verder!', 'wildNight'); this.mistAt = now + 4000; }
  }

  // Is je huis dicht? Zo niet: zeggen en het gat laten glinsteren
  checkHouse(early = false) {
    const g = this.g, p = g.player;
    const house = houseCheck(g.world, p.x, p.y, p.z);
    if (!house.closed) {
      const t = house.outside ? 'Je staat nog buiten! Bouw een huis om je heen.' : 'Pas op, je huis is nog open!';
      speech.say(t);
      if (early) g.ui.say(t, 'home');
      // Het gat laten glinsteren (niet als je nog buiten staat: dan zou het op je eigen plek glinsteren)
      if (!house.outside) { const { x, y, z } = house.gap; g.particles.sparkle(x, y, z, x + 1, y + 1, z + 1, 30); }
    } else if (early) {
      g.ui.say('Goed zo, je huis is dicht!', 'home');
    }
    this.house = house;
    return house;
  }
}
