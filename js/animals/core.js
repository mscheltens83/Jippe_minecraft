// Gemeenschappelijke beweging, botsingen en houdingen voor alle dieren.
import * as THREE from '../../lib/three.module.min.js';
import { WATERY, blockBoxes } from '../blocks.js';
import { SY } from '../world.js';
import { cachedModel, MODEL_MAT, ownMaterial } from '../models.js';
import { SPECIES } from './species.js';
import { updateSkills } from './skills.js';

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
// Natuurlijker bewegen (6.4): dieren die graag bij elkaar blijven (kudde, koppel, groep)
export const HERD = new Set(['cow', 'sheep', 'pig', 'chicken', 'goat', 'llama', 'horse', 'zebra', 'reindeer', 'penguin', 'elephant',
  'giraffe', 'camel', 'meerkat', 'triceratops', 'stegosaurus', 'parasaur', 'brachio']);
const PARTNERS = { lion: ['lion', 'lioness'], lioness: ['lion', 'lioness'] };
export class Animal {
  constructor(type, x, y, z, yaw, variant = null) {
    this.type = type; this.def = SPECIES[type];
    // Soorten met meer kleuren (paard, kat, ...): elk dier kiest er één
    const n = this.def.varianten || 0;
    this.variant = n ? ((variant ?? Math.floor(Math.random() * n)) % n + n) % n : 0;
    this.model = cachedModel(n ? `${type}:${this.variant}` : type, () => this.def.bouw(this.variant));
    Object.assign(this, this.model);
    this.group = new THREE.Group();
    this.group.rotation.order = 'YXZ'; // eerst draaien (yaw), dan kantelen en leunen ten opzichte van het dier zelf
    this.group.add(...this.parts, ...this.legs);
    // Ver weg: één vorm in rusthouding in plaats van alle losse stukjes (zie setFar)
    this.lod = new THREE.Mesh(this.merged, MODEL_MAT);
    this.lod.visible = false;
    this.lodOn = false;
    this.group.add(this.lod);
    this.mat = ownMaterial(this.group);
    this.wings ||= [];
    this.rest = new Map();
    this.group.traverse((o) => { if (o !== this.group) this.rest.set(o, { p: o.position.clone(), r: o.rotation.clone() }); });
    this.x = x; this.y = y; this.z = z; this.yaw = yaw; this.targetYaw = yaw;
    this.vy = 0; this.onGround = false; this.inWater = false;
    this.walking = false; this.graze = false; this.state = 'rust';
    this.timer = 1 + Math.random() * 3; this.time = Math.random() * 10;
    this.phase = 0; this.swing = 0; this.happy = 0;
    this.tame = false; this.tameClicks = 0; this.tameUntil = 0; this.riding = false; this.following = false;
    this.hunger = 180 + Math.random() * 180; this.sleep = 0;
    this.hunt = null; this.huntPause = 0; this.fleeFrom = null; this.eatTime = 0;
    this.hay = null; this.hayCheck = 0;
    this.sprint = 0; this.sprintWait = 5 + Math.random() * 10; this.dustTime = 0;
    this.skillWait = 0; this.sprayed = false; this.browsing = false;
    this.sleepPuff = 0; this.elapsed = 0; this.clockElapsed = 0;
    this.baby = 0; this.love = 0; this.breedWait = 0; this.sitting = false; // fokken en zitten (fase 4G)
    // Natuurlijker bewegen (6.4): snelheid nu, doelplek, liggen, kop, vooruit kijken
    this.speedCur = 0; this.goal = null; this.lying = 0; this.yawRate = 0; this.headYaw = 0;
    this.lookT = Math.random() * 0.25; this.seed = Math.random() * 100; this.groupT = Math.random();
    this.box = new THREE.Box3();
    this.sync(); this.show(0);
  }

  solid(world, x, y, z) {
    const bx = Math.floor(x), bz = Math.floor(z);
    for (let by = Math.floor(y - 0.5); by <= Math.floor(y); by++) {
      for (const q of blockBoxes(world, bx, by, bz, true)) {
        if (x >= bx + q[0] && x < bx + q[3] && y >= by + q[1] && y < by + q[4] && z >= bz + q[2] && z < bz + q[5]) return true;
      }
    }
    return false;
  }
  has(skill) { return this.def.kunstjes.includes(skill); }

  // Ver weg tekenen we het dier als één stuk (minder werk voor de iPad), dichtbij met alle bewegingen
  setFar(on) {
    if (this.lodOn === on) return;
    this.lodOn = on;
    for (const p of this.parts) p.visible = !on;
    for (const l of this.legs) l.visible = !on;
    this.lod.visible = on;
    if (!on) { // zadel en tong staan alleen aan als dat hoort
      if (this.saddle) this.saddle.visible = this.tame;
      if (this.tongue) this.tongue.visible = this.state === 'eten';
    }
  }
  waterSurface(world, x = this.x, z = this.z) {
    const ix = Math.floor(x), iz = Math.floor(z);
    for (let y = Math.min(SY - 1, Math.floor(this.y + 1)); y >= Math.floor(this.y) - 2; y--) {
      if (!WATERY[world.get(ix, y, iz)]) continue;
      while (y < SY - 1 && WATERY[world.get(ix, y + 1, iz)]) y++;
      return y + 1;
    }
    return null;
  }

  // Vier punten langs het lijf; een lange nek mag ook niet door een dak steken.
  clearAt(world, x, y, z) {
    const r = this.def.w * 0.43, d = this.def.d * 0.3, sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    const rx = Math.abs(cos * r) + Math.abs(sin * d), rz = Math.abs(sin * r) + Math.abs(cos * d);
    // Niet een stuk wereld in dat (nog) niet geladen is
    if (!world.isLoaded(x - rx, z - rz) || !world.isLoaded(x + rx, z + rz) || !world.isLoaded(x - rx, z + rz) || !world.isLoaded(x + rx, z - rz)) return false;
    for (let bx = Math.floor(x - rx); bx <= Math.floor(x + rx); bx++) for (let bz = Math.floor(z - rz); bz <= Math.floor(z + rz); bz++) {
      for (let by = Math.floor(y - 0.5); by <= Math.floor(y + this.def.h); by++) {
        for (const q of blockBoxes(world, bx, by, bz, true)) {
          if (bx + q[0] < x + rx && bx + q[3] > x - rx && bz + q[2] < z + rz && bz + q[5] > z - rz &&
            by + q[1] < y + this.def.h - 0.05 && by + q[4] > y + 0.05) return false;
        }
      }
    }
    return true;
  }

  touches(world, y) {
    if (this.solid(world, this.x, y, this.z)) return true;
    const r = this.def.w * 0.43, d = this.def.d * 0.3, sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    for (const side of [-r, r]) for (const end of [-d, d]) {
      if (this.solid(world, this.x + cos * side + sin * end, y, this.z - sin * side + cos * end)) return true;
    }
    return false;
  }

  choose() {
    // 's Nachts gaan bijna alle dieren slapen (tamme dieren en wie bereden wordt niet)
    // (een nachtdier zoals de vos slaapt juist overdag)
    const night = (this.def.nachtdier ? !Animal.night : Animal.night) && !this.tame && !this.riding;
    // Een jong dier dat ver van zijn moeder is, gaat eerst naar haar toe (ook voordat het gaat slapen)
    if (this.baby > 0) {
      const mom = this.groupTarget();
      if (mom) { this.walking = true; this.goal = mom; this.timer = 6; this.graze = false; return; }
    }
    if (!this.walking && this.onGround && Math.random() < (night ? 0.8 : this.def.slaapkans)) {
      this.sleep = night ? 30 + Math.random() * 40 : 12 + Math.random() * 20; this.walking = false; this.graze = false; return;
    }
    // Af en toe even gaan liggen (dieren op vier poten, op het land)
    if (!this.walking && this.onGround && this.legs.length === 4 && !this.inWater && Math.random() < 0.08) {
      this.lying = 6 + Math.random() * 8; this.timer = this.lying; this.graze = false; this.goal = null; return;
    }
    this.walking = !this.walking && Math.random() < 0.75;
    this.timer = this.walking ? 3 + Math.random() * 4 : 1.5 + Math.random() * 3.5;
    this.graze = !this.walking && Math.random() < 0.5;
    this.goal = null;
    if (this.walking) this.pickGoal();
  }

  // Waar gaat hij heen? Een jong dier naar zijn moeder, een kuddedier naar zijn kudde, anders een plekje
  // een paar blokken verderop (meestal ongeveer vooruit, zodat hij niet ineens omdraait)
  pickGoal() {
    const group = this.groupTarget();
    if (group) { this.goal = group; return; }
    const a = this.yaw + (Math.random() - 0.5) * Math.PI * 1.1, d = 3 + Math.random() * 6;
    this.goal = { x: this.x - Math.sin(a) * d, z: this.z - Math.cos(a) * d };
  }

  // Een plek bij de moeder (jong dier) of bij de kudde, of null als hij daar al dichtbij is
  groupTarget() {
    const all = this.others;
    if (!all) return null;
    const near = (x, z, r) => { const a = Math.random() * Math.PI * 2; return { x: x + Math.cos(a) * r, z: z + Math.sin(a) * r }; };
    const kin = PARTNERS[this.type] || [this.type];
    if (this.baby > 0) {
      let mom = null, best = 24;
      for (const o of all) {
        if (o === this || o.baby > 0 || !kin.includes(o.type)) continue;
        const d = Math.hypot(o.x - this.x, o.z - this.z);
        if (d < best) { best = d; mom = o; }
      }
      if (mom) return best > 2.5 ? { ...near(mom.x, mom.z, 1.2 + Math.random()), mom: true } : null;
    }
    if (!HERD.has(this.type)) return null;
    let n = 0, cx = 0, cz = 0;
    for (const o of all) {
      if (o === this || o.type !== this.type || o.riding) continue;
      if (Math.hypot(o.x - this.x, o.z - this.z) > 26) continue;
      cx += o.x; cz += o.z; n++;
    }
    if (!n) return null;
    cx /= n; cz /= n;
    return Math.hypot(cx - this.x, cz - this.z) > 4 ? near(cx, cz, 1 + Math.random() * 2.5) : null;
  }

  // Is de weg in richting `a` vrij? Een opstapje van één blok mag; een muur, een afgrond of (voor wie
  // niet zwemt) water niet. Een vis kijkt of er water is.
  pathClear(world, a) {
    const sin = Math.sin(a), cos = Math.cos(a);
    for (const dd of [0.8, 1.7]) {
      const ahead = dd + this.def.d * 0.3, x = this.x - sin * ahead, z = this.z - cos * ahead;
      if (!world.isLoaded(x, z)) return false;
      if (this.def.onderwater) {
        if (!WATERY[world.get(Math.floor(x), Math.floor(this.y + this.def.h / 2), Math.floor(z))]) return false;
        continue;
      }
      if (!this.clearAt(world, x, this.y, z) && !this.clearAt(world, x, this.y + 1.05, z)) return false;
      const fy = Math.floor(this.y - 0.05), ix = Math.floor(x), iz = Math.floor(z);
      const water = WATERY[world.get(ix, fy, iz)] || WATERY[world.get(ix, fy + 1, iz)];
      if (water) { if (!this.has('zwemmen') && !this.inWater) return false; continue; }
      if (!this.solid(world, x, fy, z) && !this.solid(world, x, fy - 1, z)) return false;
    }
    return true;
  }

  // Vooruit kijken: staat er iets in de weg, dan op tijd met een boog eromheen (of stoppen en omkeren)
  lookAhead(world) {
    const want = this.targetYaw;
    if (this.pathClear(world, this.yaw) && this.pathClear(world, want)) return;
    for (const off of [0.55, -0.55, 1.1, -1.1, 1.75, -1.75]) {
      const a = want + (this.seed > 50 ? off : -off); // het ene dier gaat liever links om, het andere rechts
      if (!this.pathClear(world, a)) continue;
      this.targetYaw = a;
      if (this.goal) this.goal = { x: this.x - Math.sin(a) * 4, z: this.z - Math.cos(a) * 4 };
      return;
    }
    this.walking = false; this.goal = null; this.timer = 0.8 + Math.random() * 1.5;
    this.targetYaw = this.yaw + Math.PI * (this.seed > 50 ? 0.9 : -0.9);
  }

  move(dt, world) {
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    const nx = this.x - sin * this.speedCur * dt, nz = this.z - cos * this.speedCur * dt;
    let blocked = !this.clearAt(world, nx, this.y, nz);
    // Vissen, dolfijnen en inktvissen blijven in het water
    if (this.def.onderwater && this.inWater) {
      const ahead = world.get(Math.floor(nx - sin * this.def.d * 0.4), Math.floor(this.y + this.def.h / 2), Math.floor(nz - cos * this.def.d * 0.4));
      if (blocked || !WATERY[ahead]) { this.targetYaw = this.yaw + Math.PI * (0.6 + Math.random() * 0.8); return false; }
      this.x = nx; this.z = nz;
      return true;
    }
    if (!blocked && this.hay && Math.hypot(nx - this.hay.x, nz - this.hay.z) > 6) {
      this.targetYaw = Math.atan2(-(this.hay.x - this.x), -(this.hay.z - this.z)); this.goal = null;
      return false;
    }
    if (blocked && (this.onGround || this.inWater && this.has('zwemmen')) && this.clearAt(world, nx, this.y + 1.05, nz)) {
      this.vy = this.inWater ? 8 : 6.4;
      return; // Eerst boven het opstapje komen, dan pas vooruit.
    }
    const water = this.waterSurface(world, nx, nz);
    // (een dier dat in de Wilde Nacht op je afrent, springt wel van een muur af)
    if (!blocked && !this.flight && !this.chaseSpeed && !this.inWater && !(water !== null && this.has('zwemmen'))) {
      const fx = nx - sin * this.def.d * 0.3, fz = nz - cos * this.def.d * 0.3;
      const fy = Math.floor(this.y - 0.05);
      if (water !== null || !this.solid(world, fx, fy, fz) && !this.solid(world, fx, fy - 1, fz)) blocked = true;
    }
    if (blocked) {
      // Toch ergens tegenaan: afremmen en opzij een nieuwe kant op (niet ineens helemaal omdraaien)
      if (!this.hunt && !this.fleeFrom && !this.chaseSpeed) {
        this.targetYaw = this.yaw + (this.seed > 50 ? 1 : -1) * Math.PI * (0.45 + Math.random() * 0.35);
        this.goal = null; this.speedCur *= 0.5;
      }
    } else { this.x = nx; this.z = nz; }
    return !blocked;
  }

  gravity(dt, world) {
    if (this.flight) {
      const next = this.y + Math.max(-dt * 3, Math.min(dt * 3, this.flight.y - this.y));
      if (this.clearAt(world, this.x, next, this.z)) this.y = next;
      this.vy = 0; this.onGround = false; return;
    }
    if (this.climbing > 0) { this.climbing = Math.max(0, this.climbing - dt); this.vy = 0; return; }
    const surface = this.waterSurface(world);
    this.inWater = surface !== null;
    if (this.def.onderwater && this.inWater && this.vy <= 0) { this.swim(dt, world, surface); return; }
    if (this.inWater && this.has('zwemmen') && this.vy <= 0) {
      this.y += (surface - this.def.floatDepth - this.y) * Math.min(1, dt * 7);
      this.vy = 0; this.onGround = false; return;
    }
    this.vy = Math.max(-20, this.vy - 20 * dt);
    if (this.inWater && !this.has('zwemmen')) this.vy = Math.min(this.vy + 32 * dt, 1.6);
    let ny = this.y + this.vy * dt;
    this.onGround = false;
    if (this.vy <= 0 && this.touches(world, ny)) {
      ny = Math.floor(ny) + 1; this.vy = 0; this.onGround = true;
    } else if (this.vy > 0 && this.touches(world, ny + this.def.h)) {
      ny = this.y; this.vy = 0;
    }
    this.y = ny;
    // Een blok op een dier gebouwd: zet hem erboven zodat hij niet vastzit.
    if (this.solid(world, this.x, this.y + 0.05, this.z)) { this.y = Math.floor(this.y + 0.05) + 1; this.vy = 0; }
    if (this.y < -3) this.y = 60;
  }

  // Onder water zwemmen op een eigen diepte; af en toe een andere diepte kiezen
  swim(dt, world, surface) {
    const ix = Math.floor(this.x), iz = Math.floor(this.z);
    let bottom = Math.floor(this.y);
    while (bottom > 0 && WATERY[world.get(ix, bottom - 1, iz)] && bottom > this.y - 10) bottom--;
    const top = surface - this.def.h - 0.1, low = Math.min(top, bottom + 0.15);
    if (this.swimY == null || (this.swimWait = (this.swimWait ?? 0) - dt) <= 0) {
      this.swimY = low + Math.random() * Math.max(0, top - low);
      this.swimWait = 3 + Math.random() * 5;
    }
    const target = Math.max(low, Math.min(top, this.swimY));
    const next = this.y + Math.max(-dt * 1.2, Math.min(dt * 1.2, target - this.y));
    if (this.clearAt(world, this.x, next, this.z)) this.y = next;
    this.vy = 0; this.onGround = false;
  }

  update(dt, world, effects, all = [], animate = true, clockDt = dt) {
    this.time += dt;
    // Karretje en bootje lopen niet zelf: ze vallen of drijven alleen (fase 5D)
    if (this.def.voertuig) {
      this.walking = false; this.sleep = 0; this.happy = 0;
      for (let left = dt; left > 0.00001;) { const step = Math.min(0.025, left); left -= step; this.gravity(step, world); }
      this.sync(); if (animate) this.show(dt);
      return;
    }
    this.others = all;
    this.happy = Math.max(0, this.happy - dt);
    this.sleep = Math.max(0, this.sleep - clockDt);
    this.lying = Math.max(0, this.lying - dt);
    if (this.lying && (this.walking || this.sleep || this.happy || this.hunt || this.fleeFrom || this.following)) this.lying = 0;
    this.eatTime = Math.max(0, this.eatTime - dt);
    this.inWater = this.waterSurface(world) !== null;
    if (this.sitting) { this.walking = false; this.graze = false; this.sleep = 0; }
    else if (dt > 0 && !this.happy && !this.sleep && !this.hunt && !this.fleeFrom) {
      this.timer -= dt;
      if (this.timer <= 0) this.choose();
    }
    // Op weg naar een doelplek: met een lichte slinger, en stoppen als hij er is
    const free = !this.hunt && !this.fleeFrom && !this.chaseSpeed && !this.following && !this.flight && !this.riding;
    if (free && this.walking && this.goal && dt > 0) {
      const gx = this.goal.x - this.x, gz = this.goal.z - this.z;
      if (Math.hypot(gx, gz) < 0.8) { this.walking = false; this.goal = null; this.timer = 1 + Math.random() * 3; this.graze = Math.random() < 0.5; }
      else this.targetYaw = Math.atan2(-gx, -gz) + Math.sin(this.time * 0.9 + this.seed) * 0.22;
    }
    // Een jong dier dat te ver van zijn moeder is, of een kuddedier ver van de kudde, gaat er snel weer heen
    if (free && dt > 0 && !this.walking && !this.sleep && !this.sitting && (this.groupT -= dt) <= 0) {
      this.groupT = 1 + Math.random();
      // ('s nachts gaan kuddedieren slapen waar ze zijn; alleen een jong dier zoekt nog zijn moeder op)
      const night = (this.def.nachtdier ? !Animal.night : Animal.night) && !this.tame;
      if ((this.baby > 0 || (HERD.has(this.type) && !night)) && this.timer > 0.5) {
        const g = this.groupTarget();
        if (g && (this.baby > 0 || Math.hypot(g.x - this.x, g.z - this.z) > 7)) { this.lying = 0; this.walking = true; this.goal = g; this.timer = 6; }
      }
    }
    // Vissen zwemmen in een school: dezelfde kant op als de vissen om hen heen, en bij elkaar
    if (this.type === 'fish' && this.inWater && dt > 0 && (this.schoolT = (this.schoolT ?? Math.random()) - dt) <= 0) {
      this.schoolT = 0.4;
      let n = 0, sx = 0, sz = 0, cx = 0, cz = 0;
      for (const o of all) {
        if (o === this || o.type !== 'fish' || Math.hypot(o.x - this.x, o.z - this.z) > 6) continue;
        sx -= Math.sin(o.yaw); sz -= Math.cos(o.yaw); cx += o.x; cz += o.z; n++;
      }
      if (n) {
        cx = cx / n - this.x; cz = cz / n - this.z;
        const dx = sx / n + cx * 0.15, dz = sz / n + cz * 0.15;
        if (Math.hypot(dx, dz) > 0.05) { this.targetYaw = Math.atan2(-dx, -dz); this.walking = true; this.goal = null; this.timer = Math.max(this.timer, 1); }
      }
    }
    if (!this.hunt && !this.fleeFrom && !this.chaseSpeed) updateSkills(this, dt, world, effects, all);
    if (this.walking && dt > 0 && !this.hunt && !this.chaseSpeed && !this.flight && (this.lookT -= dt) <= 0) { this.lookT = 0.25; this.lookAhead(world); }
    this.state = this.happy ? 'blij' : this.eatTime ? 'eten' : this.sleep ? 'slapen' : this.lying ? 'liggen' : this.hunt?.phase === 'stalk' ? 'sluipen'
      : this.hunt ? 'jagen' : this.fleeFrom ? 'vluchten' : this.following && this.walking ? 'volgen'
        : this.walking ? 'lopen' : this.graze ? 'grazen' : 'rust';
    // chaseSpeed: in de Wilde Nacht rennen de dieren op je af (storm.js)
    this.speedNow = this.chaseSpeed ? this.chaseSpeed : this.hunt ? (this.hunt.phase === 'stalk' ? 0.6
      : this.type === 'cheetah' ? (this.hunt.elapsed % 3 < 2 ? 8 : 2.5) : this.def.rensnelheid)
      : this.fleeFrom ? 3.5 : this.sprint > 0 ? this.def.rensnelheid : this.def.speed * (this.goal?.mom ? 1.4 : 1); // een jong dier haalt zijn moeder in
    if (this.sliding) this.speedNow *= 2;
    if (this.dash > 0) this.speedNow = Math.max(this.speedNow, this.def.speed * 2.5);
    const moving = (this.walking && !this.happy || this.dash > 0) && !this.sleep && !this.lying;
    // Haast (jagen, vluchten, rennen, volgen): snel optrekken en scherp draaien. Anders rustig op gang
    // komen, uitlopen, en in een boog draaien in plaats van ter plekke.
    const urgent = !!(this.hunt || this.fleeFrom || this.chaseSpeed || this.sprint > 0 || this.dash > 0 || this.following || this.flight);
    const want = moving ? this.speedNow : 0;
    const acc = urgent ? 30 : want > this.speedCur ? 2.6 : this.happy || this.sleep ? 12 : 5;
    this.speedCur += clamp(want - this.speedCur, -acc * dt, acc * dt);
    const turn = clamp(wrap(this.targetYaw - this.yaw) * Math.min(1, dt * 4), -(urgent ? 7 : 2.4) * dt, (urgent ? 7 : 2.4) * dt);
    this.yaw += turn;
    this.yawRate = dt > 0 ? turn / dt : 0;
    // Verre dieren krijgen vier beeldjes tegelijk: kleine stappen houden botsingen betrouwbaar.
    for (let left = dt; left > 0.00001;) {
      const step = Math.min(0.025, left); left -= step;
      if (this.speedCur > 0.02) {
        const moved = this.move(step, world);
        if (this.hunt?.phase === 'chase') this.hunt.blocked = moved ? 0 : (this.hunt.blocked || 0) + step;
      }
      this.gravity(step, world);
    }
    // Pootjes: hoe sneller, hoe snellere en grotere passen (stappen, draven, rennen)
    if (this.speedCur > 0.05) {
      this.phase += dt * Math.min(26, (2.5 + this.speedCur * 6) / Math.sqrt(Math.max(0.5, this.def.h * 0.8)));
      this.swing = Math.min(1, this.swing + dt * 4);
    } else this.swing = Math.max(0, this.swing - dt * 4);
    if (animate && this.sleep && (this.sleepPuff -= dt) <= 0) {
      effects?.sleepAt?.(this.x, this.y + this.def.h * 0.65, this.z); this.sleepPuff = 1.5;
    }
    this.sync();
    if (animate) this.show(dt);
  }

  sync() {
    this.group.position.set(this.x, this.y, this.z); this.group.rotation.y = this.yaw;
    const sin = Math.abs(Math.sin(this.yaw)), cos = Math.abs(Math.cos(this.yaw));
    const rx = (cos * this.def.w + sin * this.def.d) / 2, rz = (sin * this.def.w + cos * this.def.d) / 2;
    this.box.min.set(this.x - rx, this.y, this.z - rz);
    this.box.max.set(this.x + rx, this.y + this.def.h, this.z + rz);
  }

  show(dt) {
    for (const [node, rest] of this.rest) { node.position.copy(rest.p); node.rotation.copy(rest.r); }
    if (this.saddle) this.saddle.visible = this.tame;
    if (this.flower) this.flower.visible = !!this.holdFlower;
    const asleep = this.state === 'slapen', happy = this.happy > 0, lying = this.lying > 0 && !asleep;
    const gait = 0.75 + 0.35 * Math.min(1, this.speedCur / 3); // rennen: grotere passen
    const motion = Math.sin(this.phase) * 0.6 * this.swing * gait;
    const size = this.baby > 0 ? 0.55 : 1; // een jong dier is half zo groot
    this.group.scale.set(size, size, size);
    // Het lijf deint mee met de stappen
    const bob = asleep || lying ? 0 : this.swing * Math.abs(Math.sin(this.phase)) * Math.min(0.08, this.def.h * 0.035) * gait;
    this.group.position.y = this.y + bob + (happy && this.def.dieet === 'boerderij' ? Math.abs(Math.sin(this.happy * 9)) * 0.12 : 0);
    // Leunen in de bocht, en kantelen bij een sprong
    this.group.rotation.z = this.riding ? 0 : clamp(-this.yawRate * 0.07 * Math.min(1, this.speedCur), -0.16, 0.16);
    this.group.rotation.x = !this.onGround && !this.flight && !this.inWater && !this.riding ? clamp(-this.vy * 0.03, -0.25, 0.25) : 0;
    this.legs.forEach((leg, i) => { leg.rotation.x = asleep || lying ? (i % 2 ? -1.35 : 1.35) : motion * this.pattern[i]; });
    this.head.rotation.x = asleep ? 0.28 : this.graze && !this.walking ? 0.55 + Math.sin(this.time * 3) * 0.08 + Math.sin(this.time * 14) * 0.03
      : this.swing > 0.05 ? Math.sin(this.phase * 2) * 0.08 * this.swing : 0;
    // Rondkijken als hij stilstaat, en nieuwsgierig naar Jippe kijken als die dichtbij is
    let look = 0;
    if (!asleep && !happy && !this.graze && this.swing < 0.3) {
      const v = Animal.viewer;
      const dv = v ? Math.hypot(v.x - this.x, v.z - this.z) : Infinity;
      if (dv < 6) look = clamp(wrap(Math.atan2(-(v.x - this.x), -(v.z - this.z)) - this.yaw), -0.9, 0.9);
      else if ((this.time + this.seed) % 9 < 4.5) look = Math.sin((this.time + this.seed) * 0.8) * 0.6;
    }
    this.headYaw += (look - this.headYaw) * Math.min(1, dt * 3);
    this.head.rotation.y = this.headYaw;
    // De staart zwiept rustig, en af en toe een snelle zwiep
    if (this.tail) {
      const flick = (this.time + this.seed) % 6 < 0.5 ? Math.sin(this.time * 22) * 0.35 : 0;
      this.tail.rotation.y = Math.sin(this.time * (happy ? 12 : 3) + this.seed) * (happy ? 0.5 : 0.2) + flick;
    }
    if (asleep || lying) {
      if (this.body) this.body.position.y -= 0.3;
      this.head.position.y -= Math.min(0.4, this.def.h * 0.3);
    }
    if (this.state === 'sluipen') { this.group.scale.y *= 0.82; this.head.rotation.x = -0.18; }
    if (this.sitting && this.legs.length === 4) {
      this.legs[2].rotation.x = this.legs[3].rotation.x = -1.3; this.legs[0].rotation.x = this.legs[1].rotation.x = 0;
      this.body.rotation.x = 0.35; this.body.position.y -= this.def.h * 0.12; this.head.position.y -= this.def.h * 0.05;
      if (this.saddle) this.saddle.position.y -= this.def.h * 0.05;
    }
    if (this.tongue) {
      this.tongue.visible = this.state === 'eten';
      if (this.state === 'eten') { this.head.rotation.x = -0.25 + Math.sin(this.time * 14) * 0.12; this.body.position.y -= 0.16; }
    }
    if (['lion', 'lioness', 'tiger'].includes(this.type) && happy) {
      this.head.rotation.x = -0.17; this.head.rotation.z = Math.sin(this.time * 22) * 0.15;
    }
    this.wings.forEach((wing, i) => { wing.rotation.z = happy ? (i ? -1 : 1) * Math.abs(Math.sin(this.time * 30) * 0.7) : 0; });
    this.ears?.forEach((ear, i) => { ear.rotation.y = (i ? -1 : 1) * Math.sin(this.time * (happy ? 16 : 3)) * 0.3; });
    if (this.trunk) this.trunk.forEach((segment, i) => { segment.rotation.x = happy ? (i ? 0.18 : 1.45) : Math.sin(this.time * 2 - i * 0.6) * 0.13; });
    if (this.neck) { this.neck.rotation.x = happy ? Math.sin(this.time * 8) * 0.13 : this.browsing ? -0.2 : 0; this.head.rotation.x = 0; }
    if (this.jaw && happy) { this.jaw.rotation.x = 0.72 * Math.sin(Math.PI * Math.min(1, this.happy / 1.8)); this.head.rotation.x = -0.25; }
    if (this.type === 'zebra' && happy) this.legs[1].rotation.x = -0.9 * Math.abs(Math.sin(this.time * 10));
    if (this.type === 'meerkat') {
      if (happy) { const dip = Math.sin(Math.PI * Math.min(1, this.happy / 1.8)); this.group.scale.y *= 1 - dip * 0.9; }
      else if (this.walking) { this.body.rotation.x = -0.45; this.head.position.y -= 0.15; }
      else this.head.rotation.y = Math.sin(this.time * 1.8) * 0.5;
    }
    if (this.hiding) this.group.scale.y *= this.type === 'turtle' ? .38 : .12;
    if (this.sliding) this.body.rotation.x = -.45;
    if (this.chewing) this.head.rotation.x = Math.sin(this.time * 7) * .08;
    if (this.type === 'panda' && happy) this.body.rotation.z = Math.sin(this.time * 8) * .6;
    if (this.type === 'polarBear' && happy) this.body.rotation.z = Math.sin(this.time * 8) * .45;
    if (this.type === 'seal' && happy) this.wings.forEach((wing, i) => { wing.rotation.z = (i ? -1 : 1) * Math.sin(this.time * 15) * .75; });
    if (this.type === 'snowyOwl' && happy) this.head.rotation.y = Math.sin(this.time * 4) * Math.PI;
    if (this.type === 'villager' && happy) this.head.rotation.x = Math.sin(this.time * 12) * 0.3; // knikken: hmm!
    if (this.type === 'golem' && happy) this.legs[1].rotation.x = -1.3; // steekt de bloem naar je uit
    if (this.type === 'jellyfish') { const s = 1 + Math.sin(this.time * 3) * 0.1; this.body.scale.set(1 / s, s, 1 / s); }
    if (this.type === 'puffer' && happy) this.group.scale.multiplyScalar(1 + 0.9 * Math.sin(Math.PI * Math.min(1, this.happy / 1.8))); // opblazen!
  }

  pet(px, pz) {
    this.happy = 1.8; this.walking = false; this.graze = false; this.sleep = 0; this.sprint = 0; this.lying = 0; this.goal = null;
    if (this.hunt) { this.hunt = null; this.huntPause = 30; }
    this.timer = 2.5; this.state = 'blij'; this.sprayed = false;
    if (this.onGround && this.def.dieet === 'boerderij') this.vy = 4.5;
    this.targetYaw = Math.atan2(-(px - this.x), -(pz - this.z)); this.show(0);
  }
}

// Is het nacht? Wordt door het spel gezet (dan gaan de dieren slapen)
Animal.night = false;
// Waar is Jippe? (dieren dichtbij kijken naar hem) Wordt door Animals.update gezet
Animal.viewer = null;
