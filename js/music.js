// Een rustig muziekje, helemaal met code gemaakt (geen muziekbestanden).
// Zachte akkoorden (C - Am - F - G) met een eenvoudig melodietje in de pentatonische toonladder.

const CHORDS = [
  [48, 52, 55], // C
  [45, 48, 52], // Am
  [41, 45, 48], // F
  [43, 47, 50], // G
];
const SCALE = [60, 62, 64, 67, 69, 72, 74, 76, 79]; // C D E G A C D E G
const BEAT = 60 / 72;

const freq = (n) => 440 * Math.pow(2, (n - 69) / 12);

export class Music {
  constructor(sounds) {
    this.sounds = sounds;
    this.on = true;
    this.timer = null;
    this.bus = null;
    this.phrase = [];
  }

  // Een melodie van 4 maten die twee keer herhaald wordt, dan een nieuwe
  makePhrase() {
    const notes = [];
    let i = 2 + Math.floor(Math.random() * 3);
    for (let s = 0; s < 16; s++) {
      if (Math.random() < 0.35 && s % 4 !== 0) { notes.push(null); continue; }
      i = Math.max(0, Math.min(SCALE.length - 1, i + Math.floor(Math.random() * 5) - 2));
      notes.push(SCALE[i]);
    }
    return notes;
  }

  start() {
    const ctx = this.sounds.ctx;
    if (!this.on || !ctx || this.timer) return;
    if (!this.bus) {
      this.bus = ctx.createGain();
      this.bus.connect(this.sounds.master);
    }
    this.bus.gain.cancelScheduledValues(ctx.currentTime);
    this.bus.gain.setValueAtTime(0.0001, ctx.currentTime);
    this.bus.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + 2);
    this.step = 0;
    this.next = ctx.currentTime + 0.2;
    this.timer = setInterval(() => this.schedule(), 120);
  }

  stop() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
    const ctx = this.sounds.ctx;
    if (ctx && this.bus) {
      this.bus.gain.cancelScheduledValues(ctx.currentTime);
      this.bus.gain.setValueAtTime(this.bus.gain.value, ctx.currentTime);
      this.bus.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    }
  }

  schedule() {
    const ctx = this.sounds.ctx;
    if (!ctx || ctx.state !== 'running') return;
    if (this.next < ctx.currentTime) this.next = ctx.currentTime + 0.05;
    while (this.next < ctx.currentTime + 0.6) {
      this.playStep(this.step, this.next);
      this.next += BEAT;
      this.step++;
    }
  }

  playStep(step, t) {
    if (step % 32 === 0 || !this.phrase.length) this.phrase = this.makePhrase();
    const bar = Math.floor(step / 4) % 4;
    if (step % 4 === 0) {
      // akkoord voor de hele maat, en een lage bastoon
      for (const n of CHORDS[bar]) this.note('sine', freq(n), t, BEAT * 4, 0.05, 0.6);
      this.note('triangle', freq(CHORDS[bar][0] - 12), t, BEAT * 1.8, 0.08, 0.05);
    }
    if (step % 4 === 2) this.note('triangle', freq(CHORDS[bar][0] - 12), t, BEAT * 1.5, 0.05, 0.05);
    const m = this.phrase[step % 16];
    if (m) this.note('triangle', freq(m), t, BEAT * 0.9, 0.07, 0.02);
  }

  note(type, f, t, dur, vol, attack) {
    const ctx = this.sounds.ctx;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.bus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
}
