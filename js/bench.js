// Meetrit: de camera vliegt een vaste route over een savanne met 60 dieren en meet hoe
// vlot het spel loopt. Starten met ?meet achter het adres (?meet=10 voor 10 seconden),
// of met de knop op het ouderscherm. Er wordt niets bewaard aan de werelden van Jippe.

import { CENTER, SEA } from './world.js';
import { BIOMES } from './biomes.js';
import { frameStats, deviceInfo } from './perf.js';
import { VERSION } from './version.js';

export const BENCH_SEED = 4242;
const WARMUP = 2;          // eerst even inlopen (shaders, eerste beeldjes); telt niet mee
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
  constructor(game, seconds) {
    this.game = game;
    this.seconds = Math.max(2, Math.min(120, seconds || 30));
    this.t = -WARMUP;
    this.times = [];
    this.calls = [];
    this.triangles = [];
    this.done = false;

    // Alles klaarzetten zonder iets te bewaren
    game.readOnly = true;
    game.fixedQuality = true;
    game.setViewDistance(6); // vaste zichtafstand, zodat metingen te vergelijken zijn
    game.freshWorld('savanna', BENCH_SEED);
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

  // Elk beeldje na het tekenen: meten
  after(dt, info) {
    if (this.done || this.t <= 0) return;
    if (dt > 0 && dt < 1) this.times.push(dt);
    this.calls.push(info.render.calls);
    this.triangles.push(info.render.triangles);
    if (this.t >= this.seconds) this.finish();
  }

  finish() {
    this.done = true;
    const g = this.game, s = frameStats(this.times) || { n: 0, fps: 0, p50: 0, p95: 0, max: 0 };
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
    };
    g.benchResult = r;
    g.playing = false;
    try { localStorage.setItem(KEY, JSON.stringify([...loadMeasurements(), r].slice(-5))); } catch { /* niet erg */ }
    this.showCard(r);
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
      ['Apparaat', `${r.apparaat} · ${r.gpu}`],
      ['Versie', `${r.versie} · ${r.datum}`],
    ];
    card.innerHTML = `<div class="bench-card"><h2>Meetrit klaar</h2>
      <p class="bench-big"><strong>${Math.round(r.fps)}</strong> beelden per seconde</p>
      <table>${rows.map(([k, v]) => `<tr><th>${k}</th><td>${escapeHTML(String(v))}</td></tr>`).join('')}</table>
      <p class="bench-tip">Maak een schermafbeelding, of kopieer de uitslag.</p>
      <div class="bench-buttons"><button type="button" class="bench-copy">Kopieer</button>
      <button type="button" class="bench-again">Opnieuw</button><button type="button" class="bench-play">Naar het spel</button></div></div>`;
    card.querySelector('.bench-copy').addEventListener('click', (e) => copyText(benchLine(r), e.currentTarget));
    card.querySelector('.bench-again').addEventListener('click', () => location.reload());
    card.querySelector('.bench-play').addEventListener('click', () => { location.href = location.pathname; });
    this.game.ui.hud.parentNode.appendChild(card);
  }
}

// Eén regel om te plakken in docs/metingen.md
export function benchLine(r) {
  return `| ${r.datum} | ${r.versie} | ${r.apparaat} | ${r.gpu} | ${r.seconden} s | ${r.fps} | ${r.p50} | ${r.p95} | ${r.traagst} | ${r.tekenen} (max ${r.tekenenMax}) | ${r.driehoeken} | ${r.scherpte} · ${r.beeld} |`;
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
