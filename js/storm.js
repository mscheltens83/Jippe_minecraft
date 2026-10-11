// De Wilde Nacht (fase 6): overdag heb je even de tijd om een huis te bouwen, want als het donker
// wordt, komen alle dieren op je af. Raken ze je, dan ben je een hartje kwijt; alle hartjes op is
// "gepakt". Overleef je de nacht, dan komt de volgende nacht (steeds moeilijker).
// Het is een losse spelstand op een eigen eiland: van deze wereld wordt niets bewaard.
import { BLOCKS, blockBoxes } from './blocks.js';
import { ICONS } from './icons.js';
import { speech } from './speech.js';

export const HEARTS = 5;          // zoveel hartjes heb je
export const ARENA = 44;          // zo ver mag je van het midden (daarna is de mist te dik)
export const FALL_HURT = 4;       // een val van zoveel blokken kost een hartje
const DUSK_FROM = 0.5, DUSK_TO = 0.7, NIGHT = 0.78, DAWN = 0.96;

// Wat er in nacht n gebeurt: hoe lang je mag bouwen, hoe lang de nacht duurt, welke dieren komen
// en hoe snel ze zijn. Elke nacht is moeilijker (fase 6D maakt dit verder af).
export function nightPlan(n) {
  const kinds = ['pig', 'cow', 'chicken', 'rabbit', 'fox'];
  if (n >= 2) kinds.push('lion', 'lioness');
  if (n >= 3) kinds.push('tiger', 'polarBear');
  if (n >= 4) kinds.push('elephant', 'trex');
  return {
    build: Math.max(45, 90 - (n - 1) * 10),
    night: 120,
    count: Math.min(20, 8 + (n - 1) * 2),
    kinds,
    speed: 1 + Math.min(0.5, (n - 1) * 0.08),
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
    this.flashEl = el('div', 'storm-flash');
    root.appendChild(this.flashEl);
    this.endEl = el('div', 'storm-end');
    this.endEl.hidden = true;
    root.appendChild(this.endEl);
    this.shown = {};
  }

  destroy() {
    for (const e of [this.bar, this.flashEl, this.endEl]) e.remove();
    for (const a of this.animals()) this.g.animals.remove(a);
  }

  render() {
    const phase = this.phase === 'dag' ? `${ICONS.sun}<b>Nacht ${this.night}</b> bouw een huis!`
      : this.phase === 'nacht' || this.phase === 'gepakt' ? `${ICONS.wildNight}<b>Nacht ${this.night}</b>` : `${ICONS.sun}<b>Nacht ${this.night}</b>`;
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
    this.phase = 'ochtend';
    this.left = 3;
    for (let i = 0; i < 5; i++) setTimeout(() => g.particles.firework(p.x + (Math.random() - 0.5) * 8, p.y + 2, p.z + (Math.random() - 0.5) * 8), i * 350);
    g.sounds.magic();
    speech.say(`Hoera! Je hebt nacht ${this.night} overleefd!`);
    const best = g.settings.wildeNacht?.record || 0;
    if (this.night > best) { g.settings.wildeNacht = { ...(g.settings.wildeNacht || {}), record: this.night }; g.saveSettings(); }
  }

  caught(a) {
    const g = this.g;
    g.sounds.animal(a?.type || 'lion');
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

  // Elke nacht staan de dieren eerst in een kring om je heen (ver weg) en kijken naar je
  spawnRing() {
    const g = this.g, w = g.world, c = this.center, plan = this.plan;
    for (const a of this.animals()) g.animals.remove(a);
    w.ensureArea(Math.floor(c.x) - 36, Math.floor(c.z) - 36, Math.floor(c.x) + 36, Math.floor(c.z) + 36);
    for (let i = 0, tries = 0; i < plan.count && tries < plan.count * 8; tries++) {
      const type = plan.kinds[(i + this.night) % plan.kinds.length];
      const angle = (tries / plan.count) * Math.PI * 2 + Math.random() * 0.4, r = 24 + Math.random() * 7;
      const x = Math.floor(c.x + Math.cos(angle) * r), z = Math.floor(c.z + Math.sin(angle) * r);
      const y = w.surfaceY(x, z) + 1;
      const a = g.animals.spawn(type, x + 0.5, y, z + 0.5, Math.atan2(-(c.x - x), -(c.z - z)));
      if (!a) break;
      if (!a.clearAt(w, a.x, a.y, a.z) || w.get(x, y, z) !== 0) { g.animals.remove(a); continue; }
      a.storm = true; a.wild = false;
      i++;
    }
  }

  animals() { return this.g.animals.list.filter((a) => a.storm); }

  update(dt) {
    if (this.phase === 'gepakt' || this.phase === 'overleefd') return;
    const g = this.g, p = g.player;
    this.invuln = Math.max(0, this.invuln - dt);
    this.shake = Math.max(0, this.shake - dt);
    this.keepInside(p);
    this.knockStep(dt, p);
    this.fall(p);
    if (this.phase === 'dag') {
      this.left -= dt;
      g.daynight.set(DUSK_FROM + (1 - Math.max(0, this.left) / this.total) * (DUSK_TO - DUSK_FROM)); // de zon zakt
      for (const a of this.animals()) this.stare(a, p);
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
      for (const a of this.animals()) this.chase(a, dt, p);
      if (this.left <= 0) this.survived();
    } else if (this.phase === 'ochtend') {
      this.left -= dt;
      g.daynight.set(DAWN + (1 - Math.max(0, this.left) / 3) * 0.06);
      for (const a of this.animals()) this.flee(a, p);
      if (this.left <= 0) this.showEnd('overleefd');
    }
    if (this.phase === 'dag' || this.phase === 'nacht' || this.phase === 'ochtend') this.render();
  }

  // Overdag: stilstaan en staren
  stare(a, p) {
    a.walking = false; a.sleep = 0; a.graze = false; a.timer = 5; a.hunt = null; a.chaseSpeed = 0;
    a.targetYaw = Math.atan2(-(p.x - a.x), -(p.z - a.z));
  }

  // 's Nachts: op je af. Loopt een dier vast (tegen een muur of boom), dan probeert hij het even opzij.
  chase(a, dt, p) {
    const dx = p.x - a.x, dz = p.z - a.z, dist = Math.hypot(dx, dz);
    a.sleep = 0; a.happy = 0; a.graze = false; a.timer = 5; a.hunt = null; a.hiding = false;
    a.chaseSpeed = Math.min(6.2, Math.max(3.2, a.def.speed * 2.6)) * this.plan.speed;
    a.stormCool = Math.max(0, (a.stormCool || 0) - dt);
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

  // Bij zonsopkomst: weg van je af, en dan verdwijnen ze
  flee(a, p) {
    a.sleep = 0; a.timer = 5; a.walking = true; a.chaseSpeed = 4;
    a.targetYaw = Math.atan2(-(a.x - p.x), -(a.z - p.z));
  }

  // Zit er een blok tussen het dier en de speler? (dan kan hij je niet raken)
  clearLine(a, p) {
    const w = this.g.world;
    for (const t of [0.3, 0.55, 0.8]) {
      const x = Math.floor(a.x + (p.x - a.x) * t), z = Math.floor(a.z + (p.z - a.z) * t);
      for (const y of [p.y + 0.4, p.y + 1.4]) if (blockBoxes(w, x, Math.floor(y), z, true).length) return false;
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
