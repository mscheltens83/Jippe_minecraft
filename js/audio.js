// Geluidjes, helemaal zelf gemaakt met de Web Audio API (geen geluidsbestanden).

export class Sounds {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  // Moet vanuit een tik/klik worden aangeroepen (anders blijft iPad stil)
  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.55;
        this.master.connect(this.ctx.destination);
        const len = this.ctx.sampleRate;
        this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noise.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch { this.ctx = null; }
  }

  ok() { return this.ctx && !this.muted && this.ctx.state === 'running'; }

  tone(type, f0, f1, dur, vol, delay = 0) {
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  hiss(filter, freq, q, dur, vol, delay = 0) {
    const c = this.ctx, t = c.currentTime + delay;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = filter; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.master);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }

  place(kind) {
    if (!this.ok()) return;
    const p = 0.9 + Math.random() * 0.2;
    switch (kind) {
      case 'glass': this.tone('sine', 1400 * p, 1300 * p, 0.18, 0.18); this.tone('sine', 2100 * p, 2000 * p, 0.12, 0.08); break;
      case 'metal': this.tone('triangle', 900 * p, 880 * p, 0.25, 0.16); this.tone('sine', 1350 * p, 1340 * p, 0.2, 0.08); break;
      case 'wool': this.hiss('lowpass', 700, 0.7, 0.09, 0.35); this.tone('sine', 180 * p, 120, 0.08, 0.25); break;
      case 'wood': this.tone('triangle', 320 * p, 170, 0.1, 0.35); this.hiss('bandpass', 900, 1.2, 0.06, 0.3); break;
      case 'water': this.tone('sine', 300 * p, 900 * p, 0.12, 0.25); this.tone('sine', 500 * p, 1200 * p, 0.1, 0.12, 0.05); break;
      case 'grass': case 'sand': this.hiss('lowpass', 1100, 0.8, 0.1, 0.45); this.tone('sine', 200 * p, 110, 0.08, 0.25); break;
      default: this.tone('sine', 240 * p, 110, 0.1, 0.4); this.hiss('bandpass', 1400, 1, 0.06, 0.3);
    }
  }

  break(kind) {
    if (!this.ok()) return;
    const p = 0.85 + Math.random() * 0.3;
    switch (kind) {
      case 'glass':
        this.hiss('highpass', 3000, 0.8, 0.25, 0.3);
        for (let i = 0; i < 3; i++) this.tone('sine', (1800 + Math.random() * 1600) * p, 1500, 0.12, 0.08, i * 0.04);
        break;
      case 'water': this.tone('sine', 900 * p, 250, 0.15, 0.25); break;
      case 'wool': this.hiss('lowpass', 900, 0.7, 0.14, 0.4); break;
      case 'wood': this.hiss('bandpass', 700 * p, 1.5, 0.16, 0.55); this.tone('triangle', 200 * p, 90, 0.12, 0.3); break;
      case 'grass': case 'sand': this.hiss('bandpass', 1500 * p, 0.9, 0.16, 0.5); break;
      default: this.hiss('bandpass', 1100 * p, 1.2, 0.18, 0.6); this.tone('square', 120 * p, 60, 0.08, 0.08);
    }
  }

  pop() { if (this.ok()) this.tone('sine', 520, 880, 0.08, 0.22); }
  jump() { if (this.ok()) this.tone('sine', 260, 420, 0.1, 0.1); }
  undo() { if (this.ok()) { this.tone('sine', 700, 400, 0.12, 0.2); } }
  whoosh() { if (this.ok()) this.hiss('bandpass', 500, 0.6, 0.35, 0.35); }
  nope() { if (this.ok()) { this.tone('triangle', 200, 170, 0.09, 0.2); this.tone('triangle', 160, 140, 0.1, 0.2, 0.1); } }
}
