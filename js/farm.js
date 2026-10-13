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
import { abilityOf, column, passKind, enclosure, bestExit, nearLight } from './siege.js';
import { isSoil, blockStrength } from './storm.js';
import { blockBoxes } from './blocks.js';

// Dit zijn de dieren van je boerderij (prooi, en wie met eten gelokt kan worden)
export const FARM_PREY = new Set(['pig', 'chicken', 'sheep', 'cow', 'rabbit', 'goat']);

export const BOO_COOL = 15;       // zo lang moet de BOE-knop opladen (seconden)
const BOO_RANGE = 12;             // zo ver rennen roofdieren weg voor een BOE
const SCARE_DIST = 6;             // komt Jippe zo dichtbij, dan rent het roofdier weg
const GOLD_TIME = 150;             // zo lang moet een gouden dier veilig blijven voor de schat
const FIRST_RAID = 70;            // het eerste roofdier komt na zoveel seconden
const SCARED_OF_LIGHT = new Set(['fox', 'raptor']); // durft niet binnen 4 blokken van een fakkel
const FARM_CAP = 24;               // zoveel boerderijdieren komen er hoogstens vanzelf bij
const DIG_STEP = 0.5, BASH_STEP = 0.55; // zoveel seconden per blok graven of beuken
const WARN_DIST = 14;             // zo dichtbij sluipt het roofdier voordat de jacht begint

// De roofdieren die op bezoek komen. from = na hoeveel bezoeken hij voor het eerst komt, eats = wat hij lust,
// bites = hoeveel dieren hij per bezoek pakt, speed = hoe snel hij rent als hij jaagt.
export const RAIDERS = {
  fox: { from: 0, eats: ['chicken', 'rabbit'], bites: 1, speed: 5.5, weight: 3 },
  lioness: { from: 3, eats: ['pig', 'sheep', 'cow'], bites: 1, speed: 5.8, weight: 2 },
  lion: { from: 4, eats: ['pig', 'sheep', 'cow'], bites: 1, speed: 6, weight: 2 },
  cheetah: { from: 8, eats: ['rabbit', 'chicken', 'sheep', 'goat'], bites: 2, speed: 8.5, weight: 2 },
  tiger: { from: 10, eats: ['cow', 'pig', 'sheep', 'goat'], bites: 2, speed: 6.3, weight: 2 },
  raptor: { from: 12, eats: ['chicken', 'rabbit', 'sheep'], bites: 1, speed: 7, weight: 2, pack: 2 },           // komen met z'n tweeën
  pteranodon: { from: 16, eats: ['chicken', 'rabbit', 'sheep'], bites: 1, speed: 6, weight: 2, flyer: true },   // vliegt: bouw een dak
  trex: { from: 22, eats: ['cow', 'pig', 'sheep', 'goat'], bites: 2, speed: 5.5, weight: 1, boss: true },       // de baas
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

// ---------- gesproken tekst en tips ----------
// De naam van een dier om uit te spreken, met het goede lidwoord: "de kip", "het varken", "de T-rex"
const HET = new Set(['pig', 'sheep', 'rabbit']);
export const spoken = (type) => (type === 'trex' ? 'T-rex' : SPECIES[type].naam.toLowerCase());
export const de = (type, hoofdletter = false) => { const w = HET.has(type) ? 'het' : 'de'; return hoofdletter ? w[0].toUpperCase() + w.slice(1) : w; };

// Wat elk roofdier kan, en wat je er dan aan doet: dit zegt het spel erbij als hij eraan komt
export const RAIDER_TIPS = {
  fox: 'Een vos kan graven door aarde. Maak je muur van hout of steen, of zet een fakkel neer.',
  lioness: 'Een leeuwin springt over een laag hek. Maak je hek twee hoog!',
  lion: 'Een leeuw springt over een laag hek. Maak je hek twee hoog!',
  cheetah: 'De cheetah is supersnel en springt over een laag hek. Maak je hek twee hoog!',
  tiger: 'De tijger springt heel hoog. Bouw een dubbel hek, of een muur van drie hoog.',
  raptor: 'Raptors springen over een laag hek, maar ze zijn bang voor een fakkel.',
  pteranodon: 'De pteranodon vliegt! Bouw een dak boven je dieren.',
  trex: 'De T-rex slaat hout en steen kapot! Alleen een muur van ijzer houdt hem tegen. Of roep BOE!',
};
// Wat je doet als een dier wil ontsnappen, per manier waarop hij het probeert
export const ESCAPE_TIPS = {
  jump: 'Maak het hek hoger, dan kan hij er niet overheen.',
  dig: 'Hij graaft! Maak de muur van hout of steen.',
  bash: 'Hij beukt de muur kapot! Maak de muur van planken of steen.',
};
// Af en toe een tip als het rustig is, in deze volgorde
export const CALM_TIPS = [
  ['hek', 'Tip: bouw een hok van hekken om je dieren. Roofdieren kunnen er niet doorheen.'],
  ['lok', 'Tip: houd zaadjes of een wortel vast. Dan lopen de dieren achter je aan, het hok in.'],
  ['fakkel', 'Tip: een fakkel houdt de vos weg.'],
  ['boe', 'Tip: tik op de BOE knop om een roofdier weg te jagen.'],
  ['dubbel', 'Tip: maak je hek twee hoog, dan springen de katten er niet overheen.'],
  ['dak', 'Tip: bouw een dak boven je hok. Dan kunnen vliegers er niet in.'],
  ['poort', 'Tip: doe de poort dicht. Een open poort is een gat.'],
];

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
    this.pending = (saved.pending || []).filter((e) => SPECIES[e.type]).map((e) => ({ type: e.type, variant: e.variant ?? null, left: Number(e.left) || 20, golden: !!e.golden }));
    this.cool = Number.isFinite(saved.cool) ? saved.cool : FIRST_RAID;
    this.active = [];                       // roofdieren die nu op bezoek zijn
    this.booLeft = 0;
    this.t = 0;
    this.escape = null;                     // een dier dat uit zijn hok wil
    this.gold = null;                       // een gouden gast die je veilig moet houden: { a, left }
    this.goldCool = 200 + Math.random() * 120;
    this.newCool = 120 + Math.random() * 60; // volgende nieuwe dier uit het bos
    this.joined = 0;
    this.tipNo = saved.tipNo | 0;           // welke rustige tip de volgende is
    this.force = null;                      // (voor de tests: dit roofdier laten komen)
    this.hint = saved.raids === undefined;  // een nieuwe boerderij: één keer uitleggen
    this.escapeCool = 45 + Math.random() * 30;
    const sp = game.world.spawnPoint();
    this.home = { x: sp.x, z: sp.z };      // hier komen opgegeten dieren terug
    this.shown = {};
    game.animals.preyTypes = FARM_PREY;
    game.animals.setPredators(false);       // alleen de roofdieren van deze regie jagen
    this.buildHud();
  }

  save() {
    return { raids: this.raids, eaten: this.eaten, repelled: this.repelled, cool: Math.round(this.cool), tipNo: this.tipNo,
      pending: this.pending.map((e) => ({ type: e.type, variant: e.variant, left: Math.round(e.left), golden: e.golden || undefined })) };
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

  render(throttle = false) {
    const g = this.g;
    // De tellers en de klok veranderen langzaam: vier keer per seconde is genoeg (scheelt op een oude tablet)
    if (!throttle || (this.hudT = (this.hudT || 0) - 1) <= 0) {
      this.hudT = 8;
      let n = 0;
      for (const a of g.animals.list) if (FARM_PREY.has(a.type) && !a.raider) n++;
      const back = this.pending.length;
      const count = `${ICONS.cow}<b>${n}</b>${back ? `<i class="farm-back">+${back}</i>` : ''}${this.gold ? ICONS.star : ''}`;
      if (this.shown.count !== count) { this.countEl.innerHTML = count; this.shown.count = count; }
      const first = this.active[0];
      let time;
      if (first) time = `${ICONS[first.type] || ICONS.lion}<b class="alert">!</b>`;
      else { const s = Math.max(0, Math.ceil(this.cool)); time = `${ICONS.lion}<b>${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}</b>`; }
      if (this.shown.time !== time) { this.timeEl.innerHTML = time; this.shown.time = time; this.bar.classList.toggle('alarm', !!first); }
    }
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
    this.endEscape();
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
    this.updateEscape(dt);
    this.updateGuests(dt);
    if ((this.lureT = (this.lureT || 0) - dt) <= 0) {
      this.lureT = 1;
      const lured = g.animals.list.filter((a) => a.lured).length;
      if (lured >= 5) g.note('lure', { n: lured });
    }
    if (g.playing) this.render(true);
  }

  // Een dier dat dit roofdier mag pakken, bij voorkeur dichtbij Jippe (dan ziet hij het gebeuren)
  pickTarget(type, near = null) {
    const g = this.g, p = g.player;
    const all = g.animals.list.filter((b) => isPreyFor(type, b));
    const gold = this.gold?.a;
    if (!near && gold && all.includes(gold) && Math.random() < 0.7) return gold; // een gouden dier valt extra op
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
    const g = this.g, type = this.force || pickRaider(this.raids), prey = this.pickTarget(type);
    if (!prey) { this.cool = 15; return null; }
    const at = this.spot(prey.x, prey.z, 30, 36, 22);
    if (!at) { this.cool = 8; return null; }
    const def = RAIDERS[type], made = [];
    for (let i = 0; i < (def.pack || 1); i++) {
      const r = this.spawnRaider(type, i ? this.pickTarget(type) || prey : prey, { x: at.x + (i ? (i % 2 ? 2 : -2) : 0), y: at.y, z: at.z + (i ? 2 : 0) });
      if (r) made.push(r);
    }
    if (!made.length) { this.cool = 5; return null; }
    const a = made[0].a, naam = SPECIES[type].naam, many = made.length > 1;
    g.sounds.growl(this.pan(a.x, a.z), 1);
    if (def.boss) g.sounds.roar(this.pan(a.x, a.z), 1);
    const text = def.boss ? `De ${naam} komt eraan!` : many ? `Pas op! ${made.length} ${spoken(type)}s komen eraan!` : `Pas op! Een ${spoken(type)} komt eraan!`;
    speech.say(text);
    speech.tip(RAIDER_TIPS[type], 'raider-' + type, 150);       // wat hij kan, en wat je dan bouwt
    if (this.raids === 0) speech.tip('Tik op de BOE knop, of loop erheen, om hem weg te jagen.', 'boe-eerst', 900);
    g.ui.say(many ? `${made.length} ${naam}s komen eraan!` : `${naam} komt eraan!`, type);
    g.note('farmRaid', { type });
    return made[0];
  }

  // Eén roofdier neerzetten (een vlieger hoog in de lucht), op weg naar zijn prooi
  spawnRaider(type, prey, at) {
    const g = this.g, def = RAIDERS[type];
    const a = g.animals.spawn(type, at.x, at.y + (def.flyer ? 9 : 0), at.z, Math.atan2(-(prey.x - at.x), -(prey.z - at.z)));
    if (!a) return null;
    if (!a.clearAt(g.world, a.x, a.y, a.z)) { g.animals.remove(a); return null; }
    a.raider = true; a.wild = false; a.tame = false; a.walking = true; a.timer = 5; a.sleep = 0;
    const r = { a, type, def, phase: 'aantocht', target: prey, t: 0, age: 0, bites: 0, chaseT: 0, marked: null };
    this.active.push(r);
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
    // Is Jippe ver weg gegaan (dan staat het roofdier stil in een stuk wereld dat niet geladen is), of duurt het te lang? Dan is dit bezoek voorbij.
    if (r.age > 160 || !g.world.isLoaded(a.x, a.z)) { this.finish(r); return; }
    a.timer = 5; a.sleep = 0; a.graze = false; a.happy = 0; a.lying = 0; a.sitting = false; // hij laat zich niet afleiden
    const hunting = r.phase === 'aantocht' || r.phase === 'sluipen' || r.phase === 'jacht' || r.phase === 'eten';
    if (hunting && r.age > 2 && Math.hypot(p.x - a.x, p.z - a.z) < SCARE_DIST) { this.scare(r); return; }
    // Kleine roofdieren durven niet bij een fakkel
    if (hunting && SCARED_OF_LIGHT.has(r.type) && (r.lightT = (r.lightT || 0) - dt) <= 0) {
      r.lightT = 0.4;
      if (nearLight(g.world, a.x, a.y + 0.5, a.z)) { this.scare(r, 'licht'); return; }
    }
    const prey = r.target, flies = !!r.def.flyer;
    if ((r.phase === 'aantocht' || r.phase === 'sluipen' || r.phase === 'jacht') && !alive(g, prey)) {
      const next = this.pickTarget(r.type, a);
      if (next) { r.target = next; r.phase = 'aantocht'; r.t = 0; this.unmark(r); a.hunt = null; } else this.leave(r);
      return;
    }
    switch (r.phase) {
      case 'aantocht': {
        // Zacht naderen: Jippe heeft even tijd om te reageren
        if (flies) this.fly(r, prey.x, prey.y + 9, prey.z);
        else if (this.cross(r, prey.x, prey.z, dt)) break;
        const d = this.steer(r, prey.x, prey.z, r.def.speed * 0.5, dt);
        if (d < WARN_DIST) {
          r.phase = 'sluipen'; r.t = 0;
          a.hunt = { target: prey, phase: 'stalk', elapsed: 0, blocked: 0, sidestep: 0, raid: true };
          this.mark(r, prey);
        }
        break;
      }
      case 'sluipen': {
        if (flies) this.fly(r, prey.x, prey.y + 6, prey.z);
        this.steer(r, prey.x, prey.z, flies ? 2 : 0.8, dt);
        if (r.t >= 2.2) {
          r.phase = 'jacht'; r.t = 0; r.chaseT = 0;
          this.unmark(r);
          a.hunt.phase = 'chase'; prey.fleeFrom = a;
          g.sounds.animal(r.type);
        }
        break;
      }
      case 'jacht': {
        if (flies) {
          // Een vlieger duikt alleen naar beneden als er geen dak boven zijn prooi zit
          const open = this.openAbove(prey), near = Math.hypot(a.x - prey.x, a.z - prey.z) < 1.8;
          this.fly(r, prey.x, prey.y + (open ? (near ? 0.9 : 4) : 6), prey.z);
        } else if (this.cross(r, prey.x, prey.z, dt)) break; // bezig met graven (dat telt niet mee voor de tijd)
        r.chaseT += dt;
        const d = this.steer(r, prey.x, prey.z, r.def.speed, dt);
        if (d < Math.max(0.95, a.def.d * 0.45 + 0.3) && Math.abs(a.y - prey.y) < 1.6 && reachable(g.world, a, prey, true)) this.devour(r, prey);
        else if (r.chaseT > 22) this.giveUp(r);
        break;
      }
      case 'eten': {
        a.walking = false; a.chaseSpeed = 0.0001;
        if (flies) this.fly(r, a.x, a.y, a.z);
        if (r.t >= 1.6) {
          const next = r.bites < r.def.bites ? this.pickTarget(r.type, a) : null;
          if (next) { r.target = next; r.phase = 'sluipen'; r.t = 0; a.hunt = { target: next, phase: 'stalk', elapsed: 0, blocked: 0, sidestep: 0, raid: true }; this.mark(r, next); } else this.leave(r);
        }
        break;
      }
      case 'weg':
      case 'verjaagd': {
        if (flies) this.fly(r, a.x, r.climb ?? (r.climb = a.y + 14), a.z);
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
    this.pending.push({ type: prey.type, variant: prey.variant ?? null, left: 40 + Math.random() * 30, golden: !!prey.golden });
    if (prey.golden) { this.gold = null; this.g.ui.say('Het gouden dier is weg! Maar het komt terug.', prey.type); }
    this.eaten++; r.bites++;
    a.hunt = null; a.walking = false; a.chaseSpeed = 0.0001; a.eatTime = 1.4;
    r.phase = 'eten'; r.t = 0;
    const naam = spoken(prey.type);
    g.ui.say(`Oei, ${de(prey.type)} ${naam} is weg! ${HET.has(prey.type) ? 'Het' : 'Hij'} komt straks terug.`, prey.type);
    speech.say(`Oei, ${de(prey.type)} ${naam} is opgegeten! Maar ${HET.has(prey.type) ? 'het' : 'hij'} komt straks terug.`);
    speech.tip('Snel, bouw een hek om de andere dieren!', 'na-eten', 120);
    g.note('farmEaten', { type: prey.type });
    g.markDirty();
  }

  // Het roofdier komt er niet bij en geeft het op
  giveUp(r) {
    const g = this.g;
    if (r.target) r.target.fleeFrom = null;
    if (!r.bites) { this.repelled++; g.ui.say('Het roofdier geeft het op!', r.type); speech.say('Het roofdier geeft het op! Goed gedaan, je hek werkt!'); g.note('farmRepel', { type: r.type }); }
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
  scare(r, why = 'dichtbij') {
    const g = this.g, a = r.a, p = g.player;
    this.unmark(r);
    if (r.target) r.target.fleeFrom = null;
    a.hunt = null;
    r.phase = 'verjaagd'; r.t = 0;
    const dx = a.x - p.x, dz = a.z - p.z, d = Math.hypot(dx, dz) || 1;
    r.exit = { x: a.x + dx / d * 60, z: a.z + dz / d * 60 };
    this.repelled += r.bites ? 0 : 1;
    g.sounds.animal(r.type);
    if (why === 'licht') { g.ui.say('Bang voor het licht!', 'torch'); speech.say('Het roofdier is bang voor het licht! Zet meer fakkels neer.'); g.note('farmLicht', { type: r.type }); }
    else if (!r.bites) { g.ui.say('Weggejaagd!', r.type); speech.say('Weggejaagd!'); }
    g.note('farmScare', { type: r.type, why });
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

  // ---------- over een hek, door de aarde of er doorheen (fase 7C) ----------

  // Staat er een hek of muur tussen dit dier en zijn doel? Dan springt hij erover (als hij hoog genoeg springt),
  // of hij graaft of beukt alles weg waar zijn lijf tegenaan komt (als hij dat kan). Geeft true terug zolang
  // hij aan het graven of beuken is.
  cross(o, tx, tz, dt) {
    const g = this.g, w = g.world, a = o.a, ab = abilityOf(o.type);
    if (o.work) return this.work(o, dt);
    if (!a.onGround) return false;
    const dx = tx - a.x, dz = tz - a.z, d = Math.hypot(dx, dz) || 1, ux = dx / d, uz = dz / d, y0 = Math.floor(a.y + 0.05);
    // 1. Springen: het vakje vlak voor zijn neus
    const probe = Math.max(a.def.w * 0.43, a.def.d * 0.3) + 0.5; // net voorbij waar zijn lijf een muur raakt
    const fx = Math.floor(a.x + ux * probe), fz = Math.floor(a.z + uz * probe);
    if (ab.jump && (fx !== Math.floor(a.x) || fz !== Math.floor(a.z))) {
      const col = column(w, fx, fz, y0, a.def.h);
      if (col.solid && col.top > 1.05 && passKind(ab, col) === 'jump'
        && !column(w, Math.floor(a.x + ux * (probe + 1)), Math.floor(a.z + uz * (probe + 1)), y0, a.def.h).solid) { // over een dikke muur springt hij niet
        a.vy = Math.min(11, Math.sqrt(2 * 20 * (col.top + 0.45))); a.onGround = false;
        return false;
      }
    }
    // 2. Graven of beuken: alle vakjes waar zijn lijf tegenaan komt
    if (!ab.dig && !ab.bash) return false;
    const cells = this.blockers(a, ux, uz, ab, y0);
    if (!cells?.length) return false;
    o.work = { kind: ab.bash && !cells.every(([cx, cz]) => column(w, cx, cz, y0, a.def.h).soil && ab.dig) ? 'bash' : 'dig', cells, y0, t: 0 };
    return true;
  }

  // Alle vakjes met iets erin waar het lijf van dit dier tegenaan komt als hij een stapje naar voren zet,
  // als hij ze allemaal kapot kan krijgen. Anders null (een sterk blok erbij: dan lukt het niet).
  blockers(a, ux, uz, ab, y0) {
    const w = this.g.world, nx = a.x + ux * 0.6, nz = a.z + uz * 0.6;
    const r = a.def.w * 0.43, d = a.def.d * 0.3, sin = Math.sin(a.yaw), cos = Math.cos(a.yaw);
    const rx = Math.abs(cos * r) + Math.abs(sin * d), rz = Math.abs(sin * r) + Math.abs(cos * d);
    const cells = [];
    for (let bx = Math.floor(nx - rx); bx <= Math.floor(nx + rx); bx++) for (let bz = Math.floor(nz - rz); bz <= Math.floor(nz + rz); bz++) {
      const col = column(w, bx, bz, y0, a.def.h);
      if (!col.solid || col.top <= 1.05) continue; // een opstapje doet hij zelf
      if (!((ab.dig && col.soil) || (ab.bash && col.strength <= ab.bash))) return null;
      cells.push([bx, bz]);
    }
    return cells;
  }

  // Graven of beuken: het laagste blok van het vakje eerst. Geeft true terug zolang er iets te doen is.
  work(o, dt) {
    const g = this.g, w = g.world, a = o.a, k = o.work;
    a.walking = false; a.chaseSpeed = 0.0001;
    const top = k.y0 + Math.ceil(a.def.h) + 3;
    // het eerste vakje waar nog iets staat, en daarin het laagste blok
    let x = 0, y = 0, z = 0, found = false;
    for (const [cx, cz] of k.cells) {
      for (let yy = k.y0; yy < top; yy++) if (blockBoxes(w, cx, yy, cz, true).length) { x = cx; y = yy; z = cz; found = true; break; }
      if (found) break;
    }
    if (!found) { this.workDone(o); return false; } // er staat niets meer
    a.targetYaw = Math.atan2(-(x + 0.5 - a.x), -(z + 0.5 - a.z));
    if ((k.t += dt) < (k.kind === 'dig' ? DIG_STEP : a.def.h > 2 ? BASH_STEP * 0.55 : BASH_STEP)) return true; // een groot dier beukt sneller
    k.t = 0;
    const id = w.get(x, y, z), ab = abilityOf(o.type);
    const can = k.kind === 'dig' ? isSoil(id) : blockStrength(id) <= (ab.bash || 0);
    if (!can) { this.workDone(o); return false; } // inmiddels vervangen door iets sterks
    w.set(x, y, z, 0);
    const near = Math.hypot(x + 0.5 - g.player.x, z + 0.5 - g.player.z);
    if (k.kind === 'dig') g.sounds.scratch(this.pan(x + 0.5, z + 0.5), Math.max(0.4, 1 - near / 14)); else g.sounds.bonk(this.pan(x + 0.5, z + 0.5), Math.max(0.3, 1 - near / 16));
    g.particles.burst(x, y, z, g.atlas?.particleColors?.[id] || [[0.6, 0.5, 0.4]], 8);
    g.markDirty();
    return true;
  }

  // Klaar met graven of beuken: weer vers beginnen met lopen (anders denkt hij dat hij vastzit)
  workDone(o) {
    o.work = null;
    o.px = undefined; o.progress = 0; o.stuck = 0; o.detour = 0;
  }

  // Een vlieger blijft in de lucht op deze plek
  fly(r, x, y, z) { r.a.flight = { x, y, z, left: 1 }; }

  // Is er boven dit dier open lucht (tot 10 blokken)? Dan kan een vlieger naar beneden duiken.
  openAbove(prey) {
    const w = this.g.world, x = Math.floor(prey.x), z = Math.floor(prey.z), y = Math.floor(prey.y);
    for (let yy = y + Math.ceil(prey.def.h) + 1; yy <= y + 10; yy++) if (blockBoxes(w, x, yy, z, true).length) return false;
    return true;
  }

  // ---------- uitbrekers ----------

  // Af en toe wil een dier uit zijn hok. Zit hij in een hok met een zwakke plek (een laag hek, een muur van
  // aarde, een open poort kan altijd), dan gaat hij erheen en probeert hij eruit te komen. Jippe ziet een
  // uitroepteken en kan het hok nog repareren.
  updateEscape(dt) {
    const g = this.g, w = g.world, p = g.player;
    if (!this.escape) {
      if ((this.escapeCool -= dt) > 0) return;
      this.escapeCool = 8; // niets gevonden: over een tijdje nog eens kijken
      const cands = g.animals.list.filter((a) => FARM_PREY.has(a.type) && !a.raider && !a.baby && !a.tame && !a.lured && !a.fleeFrom && !a.riding
        && Math.hypot(a.x - p.x, a.z - p.z) < 40);
      for (let tries = 0; tries < 3 && cands.length; tries++) { // hoogstens drie dieren per keer bekijken: het zoeken kost op een oude tablet tijd
        const a = cands.splice(Math.floor(Math.random() * cands.length), 1)[0];
        const enc = enclosure(w, a.x, a.y, a.z, a.def.h, 10);
        if (!enc.closed) continue;
        const best = bestExit(w, enc, a.type, a.def.h);
        if (!best) continue;
        this.escape = { a, type: a.type, enc, best, phase: 'wachten', t: 0, marked: false };
        g.particles.warnAt(a, true); this.escape.marked = true;
        const naam = spoken(a.type);
        g.sounds.animal(a.type);
        speech.say(`Pas op! ${de(a.type, true)} ${naam} wil ontsnappen!`);
        speech.tip(ESCAPE_TIPS[best.kind], 'uitbreker-' + best.kind, 90);
        g.ui.say(`${de(a.type, true)} ${naam} wil ontsnappen!`, a.type);
        g.note('farmUitbreker', { type: a.type, kind: best.kind });
        return;
      }
      return;
    }
    const e = this.escape, a = e.a;
    if (!alive(g, a)) { this.endEscape(); this.escapeCool = 40; return; }
    e.t += dt;
    a.timer = 5; a.sleep = 0; a.graze = false; a.lying = 0; a.goal = null;
    const [bx, bz] = e.best.edge.at, [fx, fz] = e.best.edge.from, [ex, ez] = e.best.edge.beyond;
    if (e.phase === 'wachten') {
      // Naar de zwakke plek lopen en daar even blijven staan: nu kan Jippe nog repareren
      this.steer(e, fx + 0.5 + (bx - fx) * 0.15, fz + 0.5 + (bz - fz) * 0.15, 1.6, dt);
      if (e.t >= 4) {
        const col = column(w, bx, bz, e.enc.y, a.def.h), kind = passKind(abilityOf(e.type), col);
        if (!kind || kind === 'free') {
          const free = kind === 'free'; // niets meer in de weg: dan staat er een gat (gelukkig niet erg)
          if (!free) { g.ui.say('Gelukkig, het hok is dicht!', e.type); speech.say('Gelukkig, het hok is dicht! Goed gedaan!'); g.note('farmDicht', { type: e.type }); }
          this.endEscape(); this.escapeCool = 30 + Math.random() * 30;
          return;
        }
        e.phase = 'actie'; e.t = 0; e.kind = kind;
      }
    } else if (e.phase === 'actie') {
      if (this.cross(e, ex + 0.5, ez + 0.5, dt)) return; // aan het graven of beuken
      this.steer(e, ex + 0.5 + (ex - fx) * 6, ez + 0.5 + (ez - fz) * 6, 2.4, dt);
      const dist = Math.hypot(a.x - (ex + 0.5), a.z - (ez + 0.5));
      if (dist < 1.2 || e.t > 9) { e.phase = 'weg'; e.t = 0; }
    } else {
      this.steer(e, ex + 0.5 + (ex - fx) * 8, ez + 0.5 + (ez - fz) * 8, 2.4, dt);
      if (e.t > 4) {
        const naam = spoken(e.type);
        g.ui.say(`${de(e.type, true)} ${naam} is ontsnapt!`, e.type); speech.say(`Oei, ${de(e.type)} ${naam} is ontsnapt!`);
        speech.tip('Lok hem terug: houd zaadjes of een wortel vast, en loop naar je hok. Maak daarna de zwakke plek dicht.', 'ontsnapt', 90);
        this.escaped = (this.escaped || 0) + 1;
        this.endEscape(); this.escapeCool = 45 + Math.random() * 40;
      }
    }
  }

  endEscape() {
    const e = this.escape;
    if (!e) return;
    if (e.marked) this.g.particles.warnAt(e.a, false);
    if (this.g.animals.list.includes(e.a)) { e.a.chaseSpeed = 0; e.a.walking = false; e.a.timer = 1; }
    this.escape = null;
  }

  // ---------- gasten: nieuwe dieren en een gouden dier (fase 7D) ----------

  updateGuests(dt) {
    const g = this.g;
    if (this.hint && this.t > 4) {
      this.hint = false;
      speech.say('Bescherm je dieren! Bouw een hok met hekken.');
      speech.tip('Houd zaadjes of een wortel vast, dan lopen de dieren achter je aan, het hok in.', 'start-lok', 900);
      g.ui.say('Bescherm je dieren! Bouw een hok.', 'farm');
    }
    // Af en toe een tip als het rustig is
    if (!this.active.length && this.cool > 20 && (this.tipCool = (this.tipCool ?? 150) - dt) <= 0) {
      this.tipCool = 150 + Math.random() * 60;
      const [key, text] = CALM_TIPS[this.tipNo++ % CALM_TIPS.length];
      speech.tip(text, 'rustig-' + key, 100);
    }
    // Af en toe loopt er een nieuw dier uit het bos naar je boerderij toe
    if ((this.newCool -= dt) <= 0) { this.newCool = 150 + Math.random() * 90; this.newcomer(); }
    // Een gouden dier: houd hem een poosje veilig, dan krijg je een schat
    if (this.gold) {
      const gd = this.gold;
      if (!alive(g, gd.a)) { this.gold = null; this.goldCool = 120; return; }
      if ((gd.sparkT = (gd.sparkT || 0) - dt) <= 0) {
        gd.sparkT = 1.1;
        g.particles.sparkle(gd.a.x - 0.4, gd.a.y + 0.1, gd.a.z - 0.4, gd.a.x + 0.4, gd.a.y + gd.a.def.h + 0.6, gd.a.z + 0.4, 5);
      }
      if ((gd.left -= dt) <= 0) {
        const a = gd.a;
        a.golden = false; this.gold = null; this.goldCool = 300 + Math.random() * 120;
        g.sounds.magic();
        speech.say(`Het gouden dier is veilig geweest! Je krijgt een schat.`);
        g.ui.say('Het gouden dier is veilig! Een schat!', 'chest');
        g.treasureReward({ x: a.x - 0.5, y: a.y, z: a.z - 0.5 });
        g.note('farmGoud', { type: a.type });
        g.particles.firework(a.x, a.y + 2, a.z);
      }
    } else if (this.raids >= 3 && !this.pending.some((e) => e.golden) && (this.goldCool -= dt) <= 0) this.spawnGold();
  }

  // Een nieuw dier komt vanaf de rand van de wereld naar je boerderij lopen
  newcomer() {
    const g = this.g;
    if (g.animals.full || g.animals.list.filter((a) => FARM_PREY.has(a.type) && !a.raider).length >= FARM_CAP) return;
    const types = ['cow', 'pig', 'sheep', 'chicken', 'chicken', 'rabbit', 'goat'], type = types[Math.floor(Math.random() * types.length)];
    const at = this.spot(this.home.x, this.home.z, 40, 48, 22);
    if (!at) { this.newCool = 20; return; }
    const a = g.animals.spawn(type, at.x, at.y, at.z, Math.atan2(-(this.home.x - at.x), -(this.home.z - at.z)));
    if (!a) return;
    if (!a.clearAt(g.world, a.x, a.y, a.z)) { g.animals.remove(a); return; }
    a.wild = false; a.walking = true; a.timer = 60;
    a.goal = { x: this.home.x + (Math.random() - 0.5) * 10, z: this.home.z + (Math.random() - 0.5) * 10 };
    this.joined++;
    g.particles.sparkle(a.x - 0.5, a.y, a.z - 0.5, a.x + 0.5, a.y + a.def.h + 0.5, a.z + 0.5, 16);
    const naam = spoken(type);
    g.ui.say(`Een ${naam} komt naar je boerderij!`, type);
    speech.say(`Kijk, een ${naam} komt naar je boerderij!`);
    g.note('farmNieuw', { type });
  }

  spawnGold() {
    const g = this.g;
    this.goldCool = 60;
    if (g.animals.full) return;
    const type = ['chicken', 'cow', 'pig', 'sheep'][Math.floor(Math.random() * 4)];
    const at = this.spot(this.home.x, this.home.z, 6, 14);
    if (!at) return;
    const a = g.animals.spawn(type, at.x, at.y, at.z, Math.random() * Math.PI * 2);
    if (!a) return;
    if (!a.clearAt(g.world, a.x, a.y, a.z)) { g.animals.remove(a); return; }
    a.wild = false; a.golden = true; a.happy = 1.5;
    this.gold = { a, left: GOLD_TIME, sparkT: 0 };
    g.particles.firework(a.x, a.y + 2, a.z);
    g.sounds.magic();
    const naam = spoken(type);
    g.ui.say(`Een gouden ${naam}! Houd hem veilig.`, 'star');
    speech.say(`Kijk, een gouden ${naam}! Houd hem veilig, dan krijg je een schat.`);
    speech.tip('Roofdieren vinden hem extra lekker. Bouw een sterk hok om hem heen!', 'goud-tip', 300);
    g.note('farmGastGoud', { type });
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
    if (e.golden) { a.golden = true; this.gold = { a, left: GOLD_TIME, sparkT: 0 }; }
    g.particles.sparkle(a.x - 0.5, a.y, a.z - 0.5, a.x + 0.5, a.y + a.def.h + 0.5, a.z + 0.5, 30);
    g.particles.heartsAt(a.x, a.y + a.def.h + 0.15, a.z, 1.3);
    g.sounds.magic(); g.sounds.animal(e.type);
    const naam = spoken(e.type);
    g.ui.say(`Daar is ${de(e.type)} ${naam} weer!`, e.type);
    speech.say(`Daar is ${de(e.type)} ${naam} weer!`);
    g.note('farmBack', { type: e.type });
    g.markDirty();
    return true;
  }
}
