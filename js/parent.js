// Ouderscherm: versie, apparaat, fouten en metingen, plus het meetscherm en de meetrit.
// Openen: houd in het menu het versienummer 3 seconden vast (kinderen doen dat niet zomaar).
// Hier staat wél tekst: het is voor ouders.

import { VERSION } from './version.js';
import { getErrors, clearErrors } from './errors.js';
import { deviceInfo } from './perf.js';
import { loadMeasurements, benchLine, copyText } from './bench.js';

export class ParentPanel {
  constructor(h) {
    this.h = h;
    this.el = document.createElement('div');
    this.el.className = 'panel parent';
    this.el.innerHTML = `<h2>Voor ouders</h2>
      <table class="parent-info"></table>
      <h3>Metingen</h3><ul class="parent-measure"></ul>
      <h3>Fouten</h3><ul class="parent-errors"></ul>
      <div class="parent-buttons">
        <button type="button" class="parent-btn parent-day"></button>
        <button type="button" class="parent-btn parent-caves"></button>
        <button type="button" class="parent-btn parent-fps"></button>
        <button type="button" class="parent-btn parent-bench">Meetrit (30 s)</button>
        <button type="button" class="parent-btn parent-copy">Kopieer alles</button>
        <button type="button" class="parent-btn parent-clear">Wis fouten</button>
        <button type="button" class="parent-btn parent-backup">Reservekopie maken</button>
        <button type="button" class="parent-btn parent-restore">Reservekopie terugzetten</button>
        <button type="button" class="parent-btn parent-back">Terug</button>
      </div>
      <p class="parent-note"></p>
      <input type="file" class="parent-file" accept=".json,application/json" hidden>`;
    const on = (cls, fn) => this.el.querySelector(cls).addEventListener('click', fn);
    on('.parent-fps', () => { h.onFps(); this.refresh(); });
    on('.parent-day', () => { h.onAlwaysDay(); this.refresh(); });
    on('.parent-caves', () => { h.onBrightCaves(); this.refresh(); });
    on('.parent-bench', () => h.onBench());
    on('.parent-copy', (e) => copyText(this.text(), e.currentTarget));
    on('.parent-clear', () => { clearErrors(); this.refresh(); });
    on('.parent-back', () => h.onBack());
    on('.parent-backup', () => this.run(() => h.onBackup(), 'Reservekopie gemaakt.'));
    const file = this.el.querySelector('.parent-file');
    on('.parent-restore', () => { file.value = ''; file.click(); });
    file.addEventListener('change', () => {
      const f = file.files?.[0];
      if (!f) return;
      if (!confirm('Alle werelden op deze iPad vervangen door de reservekopie?')) return;
      this.run(async () => h.onRestore(JSON.parse(await f.text())), 'Teruggezet. Het spel start opnieuw.');
    });
  }

  // Iets uitvoeren en laten zien of het lukte
  async run(fn, ok) {
    const note = this.el.querySelector('.parent-note');
    note.textContent = 'Even geduld…';
    try { await fn(); note.textContent = ok; } catch (e) { note.textContent = 'Dat lukte niet: ' + (e?.message || e); }
  }

  info() {
    const dev = deviceInfo(this.h.renderer());
    return [
      ['Versie', VERSION],
      ['Apparaat', dev.device],
      ['Beeldkaart', dev.gpu],
      ['Scherm', dev.screen],
      ['Beeldscherpte nu', String(this.h.pixelRatio())],
      ['Opstarten', this.h.bootTime() ? (this.h.bootTime() / 1000).toFixed(1).replace('.', ',') + ' s' : '…'],
      ['Werelden bewaard', String(this.h.savedWorlds())],
      ['Opslag', this.storage || '…'],
    ];
  }

  refresh() {
    const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    this.el.querySelector('.parent-info').innerHTML = this.info().map(([k, v]) => `<tr><th>${k}</th><td>${esc(v)}</td></tr>`).join('');
    const measure = loadMeasurements().slice(-3).reverse();
    this.el.querySelector('.parent-measure').innerHTML = measure.length
      ? measure.map((r) => `<li>${esc(r.datum)}: <strong>${r.fps} fps</strong> (p95 ${r.p95} ms, ${r.tekenen} tekenopdrachten)</li>`).join('')
      : '<li>Nog geen meetrit gedaan.</li>';
    const errors = getErrors().slice().reverse();
    this.el.querySelector('.parent-errors').innerHTML = errors.length
      ? errors.map((e) => `<li><time>${new Date(e.t).toLocaleString('nl-NL')}</time>${e.n > 1 ? ` (${e.n}×)` : ''}<br>${esc(e.msg.split('\n')[0])}</li>`).join('')
      : '<li class="parent-none">Geen fouten.</li>';
    this.el.querySelector('.parent-fps').textContent = this.h.fpsOn() ? 'Meetscherm uit' : 'Meetscherm aan';
    this.el.querySelector('.parent-day').textContent = this.h.alwaysDay() ? 'Dag en nacht: altijd dag' : 'Dag en nacht: aan';
    this.el.querySelector('.parent-caves').textContent = this.h.brightCaves() ? 'Grotten lichter: aan' : 'Grotten lichter: uit';
    if (!this.storage && navigator.storage?.estimate) {
      navigator.storage.estimate().then((s) => {
        this.storage = `${(s.usage / 1048576).toFixed(1)} MB gebruikt`;
        if (!this.el.hidden) this.refresh();
      }).catch(() => {});
    }
  }

  // Alles als tekst, om te plakken in een bericht
  text() {
    const lines = [`JippeCraft ${VERSION}`, ...this.info().map(([k, v]) => `${k}: ${v}`), '', 'Metingen:'];
    for (const r of loadMeasurements()) lines.push(benchLine(r));
    lines.push('', 'Fouten:');
    for (const e of getErrors()) lines.push(`${new Date(e.t).toISOString()} ${e.where || ''}${e.n > 1 ? ` (${e.n}x)` : ''}\n${e.msg}`);
    return lines.join('\n');
  }
}
