// Meetrit: de camera vliegt een vaste route over een savanne met 60 dieren en meet hoe
// vlot het spel loopt. Starten met ?meet achter het adres (?meet=10 voor 10 seconden),
// of met de knop op het ouderscherm. Er wordt niets bewaard aan de werelden van Jippe.
// Na de gewone meetrit (zonder getal achter ?meet) komen nog vijf korte extra rondjes, die laten
// zien waar het werk zit: gewoon, met minder pixels, zonder dieren, met een kleine zichtafstand en
// helemaal zuinig (de laagste stand van de automatische kwaliteit).

import { CENTER, SEA } from './world.js';
import { BIOMES } from './biomes.js';
import { frameStats, deviceInfo } from './perf.js';
import { VERSION } from './version.js';
import { MIN_RATIO } from './quality.js';

export const BENCH_SEED = 4242;
const WARMUP = 2;          // eerst even inlopen (shaders, eerste beeldjes); telt niet mee
const EXTRA = [            // de extra rondjes: elk 8 seconden (het begin van de route), na 1,5 seconde inlopen
  { key: 'gewoon', naam: 'Extra rondje, gewoon (om mee te vergelijken)' },
  { key: 'pixels', naam: 'Met minder pixels (scherpte 0,75)' },
  { key: 'dieren', naam: 'Zonder dieren' },
  { key: 'zicht', naam: 'Kleine zichtafstand (3)' },
  { key: 'zuinig', naam: 'Zuinig (zicht 3, scherpte 0,6)' },
];
const EXTRA_SECONDS = 8, EXTRA_WARMUP = 1.5;
const KEY = 'jippecraft.metingen.v1';

// Vaste route: een rondje om het midden, steeds kijkend over de hele wereld heen
export function benchPath(f) {
  const a = f * Math.PI * 2;
  const r = 30 + Math.sin(a * 3) * 4;
  const x = CENTER + Math.cos(a) * r, z = CENTER + Math.sin(a) * r;
  const y = SEA + 20 + Math.sin(a * 2) * 2;
  const yaw = Math.atan2(-(CENTER - x), -(CENTER - z));
  return { x, y, z, yaw, pitch: -0.42 };
}

export function loadMeasurements() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch { return []; }
}

export class Bench {
  constructor(game, seconds, { extra = false } = {}) {
    this.game = game;
    this.seconds = Math.max(2, Math.min(120, seconds || 30));
    this.t = -WARMUP;
    this.times = [];
    this.calls = [];
    this.triangles = [];
    this.logic = [];             // ms rekenwerk van het spel per beeldje (vóór het tekenen)
    this.draw = [];              // ms om het beeldje klaar te zetten voor de beeldkaart
    this.done = false;
    this.extra = extra ? EXTRA.map((e) => ({ ...e })) : [];
    this.phase = -1;             // -1 = de gewone meetrit, daarna de extra rondjes
    this.noAnimals = false;

    // Alles klaarzetten zonder iets te bewaren
    game.readOnly = true;
    game.fixedQuality = true;
    game.setViewDistance(6); // vaste zichtafstand, zodat metingen te vergelijken zijn
    game.freshWorld('savanna', BENCH_SEED, 1); // altijd de oude savanne, zodat metingen te vergelijken blijven
    this.fillAnimals();
    game.scene.rebuildAll(game.world);
    game.ui.hideMenu();
    game.ui.hud.hidden = true;
    game.playing = true;
    game.input.enabled = false;
    game.player.flying = true;
    game.thirdPerson = false;
    this.place(0);
  }

  // Aanvullen tot het maximum, met dieren uit de savanne
  fillAnimals() {
    const { animals, world } = this.game;
    const kinds = BIOMES.savanna.dieren.map(([type]) => type);
    let tries = 0;
    for (let i = 0; !animals.full && tries < 2000; tries++) {
      const x = 10 + Math.floor(((tries * 37) % 76)), z = 10 + Math.floor(((tries * 53) % 76));
      const y = world.surfaceY(x, z);
      if (y < SEA) continue;
      animals.spawn(kinds[i++ % kinds.length], x + 0.5, y + 1, z + 0.5);
    }
  }

  place(f) {
    const p = this.game.player, s = benchPath(f);
    p.x = s.x; p.y = s.y; p.z = s.z; p.vx = p.vy = p.vz = 0;
    p.yaw = s.yaw; p.pitch = s.pitch;
  }

  // Elk beeldje vóór het tekenen: camera verder langs de route
  step(dt) {
    if (this.done) return;
    // Eerst wachten tot de wereld rond de route helemaal gemaakt en getekend is (hoogstens 30 s)
    if (!this.ready) {
      const p = this.game.player;
      this.waited = (this.waited || 0) + dt;
      if (this.game.loader.settled(p.x, p.z) || this.waited > 30) this.ready = true;
      else { this.place(0); return; }
    }
    this.t += dt;
    this.place(Math.max(0, this.t) / this.seconds);
  }

  // Elk beeldje na het tekenen: meten (cpu = { logic, draw } in ms)
  after(dt, info, cpu = null) {
    if (this.done || this.t <= 0) return;
    if (this.phase >= 0) return this.afterExtra(dt);
    if (dt > 0 && dt < 1) this.times.push(dt);
    this.calls.push(info.render.calls);
    this.triangles.push(info.render.triangles);
    if (cpu) { this.logic.push(cpu.logic); this.draw.push(cpu.draw); }
    if (this.t >= this.seconds) {
      this.result = this.mainResult();
      if (this.extra.length) this.nextExtra(); else this.finish();
    }
  }

  // De extra rondjes: telkens één ding anders, verder dezelfde route
  afterExtra(dt) {
    const e = this.extra[this.phase];
    if (dt > 0 && dt < 1) e.times.push(dt);
    if (this.t >= EXTRA_SECONDS) {
      e.fps = round(frameStats(e.times)?.fps || 0, 1);
      if (this.phase + 1 < this.extra.length) this.nextExtra(); else this.finish();
    }
  }

  nextExtra() {
    const g = this.game, sc = g.scene;
    this.phase++;
    const e = this.extra[this.phase];
    e.times = [];
    this.t = -EXTRA_WARMUP;
    // terug naar gewoon, dan het ene verschil van dit rondje
    if (this.savedRatio) { sc.setPixelRatio(this.savedRatio); this.savedRatio = 0; g.resize(); }
    this.noAnimals = false;
    if (e.key === 'pixels') { this.savedRatio = sc.pixelRatio; sc.setPixelRatio(0.75); g.resize(); }
    if (e.key === 'dieren') { this.noAnimals = true; for (const a of g.animals.list) a.group.visible = false; }
    if (e.key === 'zicht' || e.key === 'zuinig') g.setViewDistance(3);
    if (e.key === 'zuinig') { this.savedRatio = sc.pixelRatio; sc.setPixelRatio(MIN_RATIO); g.resize(); g.setZuinig(true); }
    this.showLabel(`Meetrit: extra rondje ${this.phase + 1} van ${this.extra.length}`);
  }

  showLabel(text) {
    if (!this.label) {
      this.label = document.createElement('div');
      this.label.className = 'bench-label';
      this.game.ui.hud.parentNode.appendChild(this.label);
    }
    this.label.textContent = text;
  }

  finish() {
    this.done = true;
    const g = this.game;
    if (this.savedRatio) { g.scene.setPixelRatio(this.savedRatio); this.savedRatio = 0; g.resize(); }
    if (g.zuinig) g.setZuinig(false);
    this.noAnimals = false;
    this.label?.remove();
    const r = this.result || this.mainResult();
    if (this.extra.length) r.extra = Object.fromEntries(this.extra.map((e) => [e.key, e.fps || 0]));
    g.benchResult = r;
    g.playing = false;
    try { localStorage.setItem(KEY, JSON.stringify([...loadMeasurements(), r].slice(-5))); } catch { /* niet erg */ }
    this.showCard(r);
  }

  mainResult() {
    const g = this.game, s = frameStats(this.times) || { n: 0, fps: 0, p50: 0, p95: 0, max: 0 };
    const median = (list) => (list.length ? [...list].sort((a, b) => a - b)[Math.floor(list.length / 2)] : 0);
    const avg = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0);
    const dev = deviceInfo(g.scene.renderer);
    const r = {
      versie: VERSION,
      datum: new Date().toISOString().slice(0, 16).replace('T', ' '),
      apparaat: dev.device, gpu: dev.gpu, scherm: dev.screen, kernen: dev.cores,
      seconden: this.seconds, beeldjes: s.n,
      fps: round(s.fps, 1), p50: round(s.p50 * 1000, 1), p95: round(s.p95 * 1000, 1), traagst: round(s.max * 1000, 1),
      laagsteFps: s.p95 ? round(1 / s.p95, 1) : 0,
      tekenen: Math.round(avg(this.calls)), tekenenMax: Math.max(0, ...this.calls),
      driehoeken: Math.round(avg(this.triangles)), dieren: g.animals.list.length,
      scherpte: g.scene.pixelRatio, beeld: `${g.canvas.width}×${g.canvas.height}`,
      rekenen: round(median(this.logic), 1), klaarzetten: round(median(this.draw), 1),
    };
    return r;
  }

  showCard(r) {
    const card = document.createElement('div');
    card.className = 'overlay bench';
    const rows = [
      ['Gemiddeld', `${r.fps} beelden per seconde`],
      ['Gewoon beeldje (p50)', `${r.p50} ms`],
      ['Traagste 5% (p95)', `${r.p95} ms (${r.laagsteFps} fps)`],
      ['Traagste beeldje', `${r.traagst} ms`],
      ['Tekenopdrachten', `${r.tekenen} (max ${r.tekenenMax})`],
      ['Driehoeken', r.driehoeken.toLocaleString('nl-NL')],
      ['Dieren', r.dieren],
      ['Beeldscherpte', `${r.scherpte} (${r.beeld})`],
      ['Rekenwerk per beeldje', `${r.rekenen} ms spel, ${r.klaarzetten} ms tekenen klaarzetten`],
      ...EXTRA.filter((e) => r.extra?.[e.key] != null).map((e) => [e.naam, `${r.extra[e.key]} beelden per seconde`]),
      ['Apparaat', `${r.apparaat} · ${r.gpu}`],
      ['Versie', `${r.versie} · ${r.datum}`],
    ];
    card.innerHTML = `<div class="bench-card"><h2>Meetrit klaar</h2>
      <p class="bench-big"><strong>${Math.round(r.fps)}</strong> beelden per seconde</p>
      <table>${rows.map(([k, v]) => `<tr><th>${k}</th><td>${escapeHTML(String(v))}</td></tr>`).join('')}</table>
      <p class="bench-tip">Maak een schermafbeelding, of kopieer de uitslag.</p>
      <div class="bench-buttons"><button type="button" class="bench-copy">Kopieer</button>
      <button type="button" class="bench-again">Opnieuw</button><button type="button" class="bench-play">Naar het spel</button></div></div>`;
    card.querySelector('.bench-copy').addEventListener('click', (e) => copyText(benchText(r), e.currentTarget));
    card.querySelector('.bench-again').addEventListener('click', () => location.reload());
    card.querySelector('.bench-play').addEventListener('click', () => { location.href = location.pathname; });
    this.game.ui.hud.parentNode.appendChild(card);
  }
}

// Eén regel om te plakken in docs/metingen.md
export function benchLine(r) {
  return `| ${r.datum} | ${r.versie} | ${r.apparaat} | ${r.gpu} | ${r.seconden} s | ${r.fps} | ${r.p50} | ${r.p95} | ${r.traagst} | ${r.tekenen} (max ${r.tekenenMax}) | ${r.driehoeken} | ${r.scherpte} · ${r.beeld} |`;
}

// De regel voor de tabel, plus het rekenwerk en de extra rondjes
export function benchText(r) {
  const lines = [benchLine(r), `Rekenwerk per beeldje: ${r.rekenen} ms spel, ${r.klaarzetten} ms tekenen klaarzetten`];
  for (const e of EXTRA) if (r.extra?.[e.key] != null) lines.push(`${e.naam}: ${r.extra[e.key]} fps`);
  return lines.join('\n');
}

export function copyText(text, button) {
  const ok = () => { if (button) { const old = button.textContent; button.textContent = 'Gekopieerd!'; setTimeout(() => { button.textContent = old; }, 1500); } };
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(ok, () => fallbackCopy(text, ok));
  else fallbackCopy(text, ok);
}

function fallbackCopy(text, ok) {
  const area = document.createElement('textarea');
  area.value = text;
  area.style.position = 'fixed'; area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  try { if (document.execCommand('copy')) ok(); } catch { /* niet erg */ }
  area.remove();
}

function round(v, d) { const f = 10 ** d; return Math.round((v || 0) * f) / f; }
function escapeHTML(s) { return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
