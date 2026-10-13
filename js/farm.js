// Boerderij in Gevaar (fase 7): een wereld waarin roofdieren de andere dieren komen halen.
// Een roofdier sluipt aan, pakt een of twee dieren van je boerderij en gaat dan weer weg; later komt er weer
// een. Opgegeten dieren komen na een tijdje terug. Jippe zelf kan niets overkomen: roofdieren rennen weg als hij
// dichtbij komt of BOE roept. Hij beschermt de dieren met hekken en hokken en lokt ze met eten naar binnen.
// Alles hier is "regie": de dieren zelf bewegen met animals/core.js, de jacht-markering en het vluchten van de
// prooi komen uit animals/hunt.js.
import { BLOCKS } from './blocks.js';
import { ICONS } from './icons.js';
import { SPECIES } from './animals/species.js';
import { speech } from './speech.js';
import { reachable } from './animals/hunt.js';

// Dit zijn de dieren van je boerderij (prooi, en wie met eten gelokt kan worden)
export const FARM_PREY = new Set(['pig', 'chicken', 'sheep', 'cow', 'rabbit', 'goat']);

export const BOO_COOL = 15;       // zo lang moet de BOE-knop opladen (seconden)
const BOO_RANGE = 12;             // zo ver rennen roofdieren weg voor een BOE
const SCARE_DIST = 6;             // komt Jippe zo dichtbij, dan rent het roofdier weg
const FIRST_RAID = 70;            // het eerste roofdier komt na zoveel seconden
const WARN_DIST = 14;             // zo dichtbij sluipt het roofdier voordat de jacht begint

// De roofdieren die op bezoek komen. from = na hoeveel bezoeken hij voor het eerst komt, eats = wat hij lust,
// bites = hoeveel dieren hij per bezoek pakt, speed = hoe snel hij rent als hij jaagt.
export const RAIDERS = {
  fox: { from: 0, eats: ['chicken', 'rabbit'], bites: 1, speed: 5.5, weight: 3 },
  lioness: { from: 3, eats: ['pig', 'sheep', 'cow'], bites: 1, speed: 5.8, weight: 2 },
  lion: { from: 4, eats: ['pig', 'sheep', 'cow'], bites: 1, speed: 6, weight: 2 },
  cheetah: { from: 8, eats: ['rabbit', 'chicken', 'sheep', 'goat'], bites: 2, speed: 8.5, weight: 2 },
  tiger: { from: 10, eats: ['cow', 'pig', 'sheep', 'goat'], bites: 2, speed: 6.3, weight: 2 },
};

// Welke roofdieren kunnen er na `raids` bezoeken komen?
export function raidersAt(raids) {
  return Object.keys(RAIDERS).filter((type) => RAIDERS[type].from <= raids);
}

// Een roofdier kiezen; de nieuwste soorten komen vaker, zodat het steeds spannender wordt
export function pickRaider(raids, rnd = Math.random) {
  const list = raidersAt(raids).map((type) => [type, RAIDERS[type].weight * (RAIDERS[type].from > raids - 6 && RAIDERS[type].from > 0 ? 2 : 1)]);
  let pick = rnd() * list.reduce((m, [, w]) => m + w, 0);
  for (const [type, w] of list) { pick -= w; if (pick <= 0) return type; }
  return list[list.length - 1][0];
}

// Hoeveel seconden tussen twee bezoeken: steeds korter, en 's nachts nog korter
export function raidGap(raids, night = false) {
  return Math.max(55, 110 - raids * 3) * (night ? 0.7 : 1);
}

// Een dier dat dit roofdier lust en dat hij mag pakken (geen jong, geen tam dier)
export function isPreyFor(type, b) {
  return !!RAIDERS[type] && RAIDERS[type].eats.includes(b.type) && !b.baby && !b.tame && !b.riding && !b.raider;
}

const alive = (g, a) => g.animals.list.includes(a);

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

export class Farm {
  constructor(game, saved = {}) {
    this.g = game;
    this.raids = saved.raids | 0;           // hoeveel roofdier-bezoeken er al geweest zijn
    this.eaten = saved.eaten | 0;
    this.repelled = saved.repelled | 0;     // bezoeken zonder dat er een dier is gepakt
    this.pending = (saved.pending || []).filter((e) => SPECIES[e.type]).map((e) => ({ type: e.type, variant: e.variant ?? null, left: Number(e.left) || 20 }));
    this.cool = Number.isFinite(saved.cool) ? saved.cool : FIRST_RAID;
    this.active = [];                       // roofdieren die nu op bezoek zijn
    this.booLeft = 0;
    this.t = 0;
    const sp = game.world.spawnPoint();
    this.home = { x: sp.x, z: sp.z };      // hier komen opgegeten dieren terug
    this.shown = {};
    game.animals.preyTypes = FARM_PREY;
    game.animals.setPredators(false);       // alleen de roofdieren van deze regie jagen
    this.buildHud();
  }

  save() {
    return { raids: this.raids, eaten: this.eaten, repelled: this.repelled, cool: Math.round(this.cool),
      pending: this.pending.map((e) => ({ type: e.type, variant: e.variant, left: Math.round(e.left) })) };
  }

  // ---------- scherm ----------

  buildHud() {
    const g = this.g;
    this.bar = el('div', 'farm-bar');
    this.countEl = el('span', 'farm-count');
    this.timeEl = el('span', 'farm-time');
    this.bar.append(this.countEl, this.timeEl);
    g.ui.hud.appendChild(this.bar);
    this.arrow = el('div', 'farm-arrow', `<div class="farm-arrow-in">${ICONS.arrow}</div>`);
    this.arrow.hidden = true;
    g.ui.hud.appendChild(this.arrow);
    // De BOE-knop: jaagt de roofdieren dichtbij weg (en moet dan opladen)
    this.booBtn = el('button', 'btn storm-boo', `${ICONS.torch}<span>BOE!</span>`);
    this.booBtn.type = 'button';
    this.booBtn.setAttribute('aria-label', 'Boe! Roofdieren wegjagen');
    this.booBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.boo(); });
    g.ui.hud.appendChild(this.booBtn);
  }

  render() {
    const g = this.g;
    const n = g.animals.list.filter((a) => FARM_PREY.has(a.type) && !a.raider).length, back = this.pending.length;
    const count = `${ICONS.cow}<b>${n}</b>${back ? `<i class="farm-back">+${back}</i>` : ''}`;
    if (this.shown.count !== count) { this.countEl.innerHTML = count; this.shown.count = count; }
    const first = this.active[0];
    let time;
    if (first) time = `${ICONS[first.type] || ICONS.lion}<b class="alert">!</b>`;
    else { const s = Math.max(0, Math.ceil(this.cool)); time = `${ICONS.lion}<b>${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}</b>`; }
    if (this.shown.time !== time) { this.timeEl.innerHTML = time; this.shown.time = time; this.bar.classList.toggle('alarm', !!first); }
    // De pijl naar het roofdier dat eraan komt
    const near = this.active.find((r) => r.phase === 'aantocht' || r.phase === 'sluipen' || r.phase === 'jacht');
    this.arrow.hidden = !near;
    if (near) {
      const p = g.player, dx = near.a.x - p.x, dz = near.a.z - p.z;
      const right = dx * Math.cos(p.yaw) - dz * Math.sin(p.yaw), ahead = -dx * Math.sin(p.yaw) - dz * Math.cos(p.yaw);
      const angle = Math.atan2(right, ahead);
      if (Math.abs(angle - (this.shown.angle ?? 99)) > 0.03) {
        this.arrow.firstChild.style.transform = `rotate(${angle}rad)`; this.shown.angle = angle;
      }
    }
    const cool = Math.ceil(this.booLeft / BOO_COOL * 60) / 60;
    if (cool !== this.shown.cool) {
      this.shown.cool = cool;
      this.booBtn.style.setProperty('--cool', String(cool));
      this.booBtn.classList.toggle('ready', cool <= 0);
    }
  }

  destroy() {
    for (const r of [...this.active]) { this.unmark(r); r.a.hunt = null; this.g.animals.remove(r.a); }
    this.active.length = 0;
    for (const e of [this.bar, this.arrow, this.booBtn]) e.remove();
    this.g.animals.preyTypes = null;
    this.g.animals.lure = null;
    for (const a of this.g.animals.list) { if (a.lured) { a.lured = false; a.following = false; } }
  }

  // ---------- het verloop ----------

  update(dt) {
    const g = this.g;
    this.t += dt;
    this.booLeft = Math.max(0, this.booLeft - dt);
    // Opgegeten dieren komen terug
    for (const e of [...this.pending]) {
      if ((e.left -= dt) > 0) continue;
      if (this.restore(e)) this.pending.splice(this.pending.indexOf(e), 1); else e.left = 8;
    }
    // Het volgende roofdier
    if (this.active.length < (this.raids >= 12 ? 2 : 1)) {
      this.cool -= dt;
      if (this.cool <= 0) this.startRaid();
    }
    for (const r of [...this.active]) this.step(r, dt);
    if ((this.lureT = (this.lureT || 0) - dt) <= 0) {
      this.lureT = 1;
      const lured = g.animals.list.filter((a) => a.lured).length;
      if (lured >= 5) g.note('lure', { n: lured });
    }
    if (g.playing) this.render();
  }

  // Een dier dat dit roofdier mag pakken, bij voorkeur dichtbij Jippe (dan ziet hij het gebeuren)
  pickTarget(type, near = null) {
    const g = this.g, p = g.player;
    const all = g.animals.list.filter((b) => isPreyFor(type, b));
    const close = all.filter((b) => Math.hypot(b.x - (near?.x ?? p.x), b.z - (near?.z ?? p.z)) < (near ? 16 : 45));
    const list = close.length ? close : near ? [] : all;
    return list[Math.floor(Math.random() * list.length)] || null;
  }

  // Een plek op het land, op ongeveer `d` blokken van (cx, cz), minstens `far` van Jippe
  spot(cx, cz, dmin, dmax, far = 0) {
    const g = this.g, w = g.world, p = g.player;
    for (let i = 0; i < 40; i++) {
      const ang = Math.random() * Math.PI * 2, d = dmin + Math.random() * (dmax - dmin);
      const x = Math.floor(cx + Math.cos(ang) * d), z = Math.floor(cz + Math.sin(ang) * d);
      if (!w.isLoaded(x, z) || Math.hypot(x + 0.5 - p.x, z + 0.5 - p.z) < far) continue;
      const y = w.surfaceY(x, z) + 1, below = BLOCKS[w.get(x, y - 1, z)];
      if (!below?.solid || below.sound === 'water' || w.get(x, y, z) !== 0 || w.get(x, y + 1, z) !== 0) continue;
      return { x: x + 0.5, y, z: z + 0.5 };
    }
    return null;
  }

  startRaid() {
    const g = this.g, type = pickRaider(this.raids), prey = this.pickTarget(type);
    if (!prey) { this.cool = 15; return null; }
    const at = this.spot(prey.x, prey.z, 30, 36, 22);
    if (!at) { this.cool = 8; return null; }
    const a = g.animals.spawn(type, at.x, at.y, at.z, Math.atan2(-(prey.x - at.x), -(prey.z - at.z)));
    if (!a) { this.cool = 10; return null; }
    if (!a.clearAt(g.world, a.x, a.y, a.z)) { g.animals.remove(a); this.cool = 5; return null; }
    a.raider = true; a.wild = false; a.tame = false; a.walking = true; a.timer = 5; a.sleep = 0;
    const r = { a, type, def: RAIDERS[type], phase: 'aantocht', target: prey, t: 0, age: 0, bites: 0, chaseT: 0, marked: null };
    this.active.push(r);
    const naam = SPECIES[type].naam;
    g.sounds.growl(this.pan(a.x, a.z), 1);
    speech.say(`Pas op! Een ${naam.toLowerCase()} komt eraan!`);
    g.ui.say(`${naam} komt eraan!`, type);
    g.note('farmRaid', { type });
    return r;
  }

  // Links (-1) of rechts (1) van Jippe
  pan(x, z) {
    const p = this.g.player, dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz) || 1;
    return Math.max(-1, Math.min(1, (dx * Math.cos(p.yaw) - dz * Math.sin(p.yaw)) / d));
  }

  mark(r, prey) { if (r.marked !== prey) { this.unmark(r); this.g.particles.warnAt(prey, true); r.marked = prey; } }
  unmark(r) { if (r.marked) { this.g.particles.warnAt(r.marked, false); r.marked = null; } }

  // Naar een plek lopen; loopt hij vast (boom, heuvel, hek), dan even opzij. Geeft de afstand terug.
  steer(r, tx, tz, speed, dt) {
    const a = r.a, dx = tx - a.x, dz = tz - a.z, dist = Math.hypot(dx, dz);
    a.chaseSpeed = speed; a.walking = true;
    let yaw = Math.atan2(-dx, -dz);
    if ((r.detour = Math.max(0, (r.detour || 0) - dt)) > 0) yaw += r.side * (r.turn || 1.3);
    else if ((r.progress = (r.progress || 0) + dt) > 1) {
      // Hij is niet vooruit gekomen (boom, heuvel, hek)? Dan een stukje opzij, en steeds iets langer en wijder
      // als het niet lukt. (Een prooi die wegrent is geen reden.)
      const moved = r.px === undefined ? Infinity : Math.hypot(a.x - r.px, a.z - r.pz);
      if (moved < speed * 0.25 && dist > 1.2) {
        r.stuck = Math.min(4, (r.stuck || 0) + 1);
        r.detour = 1 + r.stuck * 0.5; r.side = r.stuck % 2 ? (r.side || (Math.random() < 0.5 ? -1 : 1)) : -(r.side || 1);
        r.turn = 1.1 + 0.15 * r.stuck;
      } else if (moved > speed * 0.6) r.stuck = 0;
      r.px = a.x; r.pz = a.z; r.progress = 0;
    }
    a.targetYaw = yaw;
    return dist;
  }

  step(r, dt) {
    const g = this.g, a = r.a, p = g.player;
    r.age += dt; r.t += dt;
    if (!g.animals.list.includes(a)) { this.active.splice(this.active.indexOf(r), 1); this.raids++; this.cool = raidGap(this.raids); return; }
    a.timer = 5; a.sleep = 0; a.graze = false; a.happy = 0; a.lying = 0; a.sitting = false; // hij laat zich niet afleiden
    const hunting = r.phase === 'aantocht' || r.phase === 'sluipen' || r.phase === 'jacht' || r.phase === 'eten';
    if (hunting && r.age > 2 && Math.hypot(p.x - a.x, p.z - a.z) < SCARE_DIST) { this.scare(r); return; }
    const prey = r.target;
    if ((r.phase === 'aantocht' || r.phase === 'sluipen' || r.phase === 'jacht') && !alive(g, prey)) {
      const next = this.pickTarget(r.type, a);
      if (next) { r.target = next; r.phase = 'aantocht'; r.t = 0; this.unmark(r); a.hunt = null; } else this.leave(r);
      return;
    }
    switch (r.phase) {
      case 'aantocht': {
        // Zacht naderen: Jippe heeft even tijd om te reageren
        const d = this.steer(r, prey.x, prey.z, r.def.speed * 0.5, dt);
        if (d < WARN_DIST) {
          r.phase = 'sluipen'; r.t = 0;
          a.hunt = { target: prey, phase: 'stalk', elapsed: 0, blocked: 0, sidestep: 0, raid: true };
          this.mark(r, prey);
        }
        break;
      }
      case 'sluipen': {
        this.steer(r, prey.x, prey.z, 0.8, dt);
        if (r.t >= 2.2) {
          r.phase = 'jacht'; r.t = 0; r.chaseT = 0;
          this.unmark(r);
          a.hunt.phase = 'chase'; prey.fleeFrom = a;
          g.sounds.animal(r.type);
        }
        break;
      }
      case 'jacht': {
        r.chaseT += dt;
        const d = this.steer(r, prey.x, prey.z, r.def.speed, dt);
        if (d < Math.max(0.95, a.def.d * 0.45 + 0.3) && Math.abs(a.y - prey.y) < 1.6 && reachable(g.world, a, prey, true)) this.devour(r, prey);
        else if (r.chaseT > 22) this.giveUp(r);
        break;
      }
      case 'eten': {
        a.walking = false; a.chaseSpeed = 0.0001;
        if (r.t >= 1.6) {
          const next = r.bites < r.def.bites ? this.pickTarget(r.type, a) : null;
          if (next) { r.target = next; r.phase = 'sluipen'; r.t = 0; a.hunt = { target: next, phase: 'stalk', elapsed: 0, blocked: 0, sidestep: 0, raid: true }; this.mark(r, next); } else this.leave(r);
        }
        break;
      }
      case 'weg':
      case 'verjaagd': {
        const d = this.steer(r, r.exit.x, r.exit.z, r.phase === 'verjaagd' ? Math.max(r.def.speed, 5) : r.def.speed * 0.6, dt);
        const far = Math.hypot(p.x - a.x, p.z - a.z);
        if (d < 2 || far > 46 || r.t > (r.phase === 'verjaagd' ? 9 : 40)) this.finish(r);
        break;
      }
      default: break;
    }
  }

  // Het roofdier pakt de prooi: wolkje, geluid, en het dier komt later terug
  devour(r, prey) {
    const g = this.g, a = r.a;
    prey.fleeFrom = null;
    this.unmark(r);
    g.particles.poofAt(prey.x, prey.y + 0.6, prey.z, prey.type === 'chicken');
    g.animals.remove(prey);
    g.sounds.nom();
    this.pending.push({ type: prey.type, variant: prey.variant ?? null, left: 40 + Math.random() * 30 });
    this.eaten++; r.bites++;
    a.hunt = null; a.walking = false; a.chaseSpeed = 0.0001; a.eatTime = 1.4;
    r.phase = 'eten'; r.t = 0;
    const naam = SPECIES[prey.type].naam.toLowerCase();
    g.ui.say(`Oei, de ${naam} is weg! Hij komt straks terug.`, prey.type);
    speech.say(`Oei, de ${naam} is weg! Hij komt straks terug.`);
    g.note('farmEaten', { type: prey.type });
    g.markDirty();
  }

  // Het roofdier komt er niet bij en geeft het op
  giveUp(r) {
    const g = this.g;
    if (r.target) r.target.fleeFrom = null;
    if (!r.bites) { this.repelled++; g.ui.say('Het roofdier geeft het op!', r.type); speech.say('Het roofdier geeft het op! Goed gedaan!'); g.note('farmRepel', { type: r.type }); }
    this.leave(r);
  }

  // Tevreden (of teleurgesteld) naar de rand van de wereld lopen
  leave(r) {
    const a = r.a;
    this.unmark(r);
    if (r.target) r.target.fleeFrom = null;
    a.hunt = null;
    r.phase = 'weg'; r.t = 0;
    r.exit = this.exitFor(a);
  }

  // Jippe is te dichtbij, of er is BOE geroepen: het roofdier rent weg en komt later terug
  scare(r) {
    const g = this.g, a = r.a, p = g.player;
    this.unmark(r);
    if (r.target) r.target.fleeFrom = null;
    a.hunt = null;
    r.phase = 'verjaagd'; r.t = 0;
    const dx = a.x - p.x, dz = a.z - p.z, d = Math.hypot(dx, dz) || 1;
    r.exit = { x: a.x + dx / d * 60, z: a.z + dz / d * 60 };
    this.repelled += r.bites ? 0 : 1;
    g.sounds.animal(r.type);
    if (!r.bites) { g.ui.say('Weggejaagd!', r.type); speech.say('Weggejaagd!'); }
    g.note('farmScare', { type: r.type });
  }

  exitFor(a) {
    const dx = a.x - this.home.x, dz = a.z - this.home.z, d = Math.hypot(dx, dz);
    const ang = d > 1 ? Math.atan2(dz, dx) : Math.random() * Math.PI * 2;
    return { x: this.home.x + Math.cos(ang) * 70, z: this.home.z + Math.sin(ang) * 70 };
  }

  finish(r) {
    const g = this.g;
    this.unmark(r);
    r.a.hunt = null;
    g.particles.poofAt(r.a.x, r.a.y + 0.5, r.a.z);
    g.animals.remove(r.a);
    this.active.splice(this.active.indexOf(r), 1);
    this.raids++;
    this.cool = Math.min(raidGap(this.raids, g.daynight.night), r.phase === 'verjaagd' ? 45 : 999);
    g.markDirty();
  }

  // BOE! Alle roofdieren dichtbij schrikken en rennen weg. Daarna moet de knop opladen.
  boo() {
    const g = this.g, p = g.player;
    if (this.booLeft > 0) { g.sounds.nope(); return 0; }
    this.booLeft = BOO_COOL;
    let n = 0;
    for (const r of [...this.active]) {
      if (r.phase === 'weg' || r.phase === 'verjaagd' || Math.hypot(r.a.x - p.x, r.a.z - p.z) > BOO_RANGE) continue;
      this.scare(r); n++;
    }
    g.particles.burst(p.x - 0.5, p.y + 0.6, p.z - 0.5, [[1, 0.55, 0.1], [1, 0.85, 0.25], [1, 0.3, 0.05]], 50, true);
    g.sounds.whoosh(); g.sounds.roar(0, 0.35);
    speech.say('Boe!');
    g.ui.say(n ? 'BOE! Weg jullie!' : 'BOE!', 'torch');
    g.note('boo', { n });
    return n;
  }

  // Een opgegeten dier komt terug: een sterretje en een blij geluid
  restore(e) {
    const g = this.g;
    if (g.animals.full) return false;
    const at = this.spot(this.home.x, this.home.z, 6, 16);
    if (!at) return false;
    const a = g.animals.spawn(e.type, at.x, at.y, at.z, Math.random() * Math.PI * 2, e.variant);
    if (!a) return false;
    if (!a.clearAt(g.world, a.x, a.y, a.z)) { g.animals.remove(a); return false; }
    a.wild = false; a.happy = 1.5;
    g.particles.sparkle(a.x - 0.5, a.y, a.z - 0.5, a.x + 0.5, a.y + a.def.h + 0.5, a.z + 0.5, 30);
    g.particles.heartsAt(a.x, a.y + a.def.h + 0.15, a.z, 1.3);
    g.sounds.magic(); g.sounds.animal(e.type);
    const naam = SPECIES[e.type].naam.toLowerCase();
    g.ui.say(`Daar is de ${naam} weer!`, e.type);
    speech.say(`Daar is de ${naam} weer!`);
    g.note('farmBack', { type: e.type });
    g.markDirty();
    return true;
  }
}
