// Een rustig muziekje, helemaal met code gemaakt (geen muziekbestanden).
// Zachte akkoorden (C - Am - F - G) met een eenvoudig melodietje in de pentatonische toonladder.

const CHORDS = [
  [48, 52, 55], // C
  [45, 48, 52], // Am
  [41, 45, 48], // F
  [43, 47, 50], // G
];
const SCALE = [60, 62, 64, 67, 69, 72, 74, 76, 79]; // C D E G A C D E G
const STYLES = {
  island: { chords: CHORDS, scale: SCALE, beat: 60 / 72, lead: 'triangle', pad: 'sine', noteLength: .9 },
  jungle: { chords: [[45, 48, 52], [43, 48, 52], [41, 45, 48], [43, 47, 50]],
    scale: [57, 60, 62, 64, 67, 69, 72, 74, 76], beat: 60 / 88, lead: 'triangle', pad: 'sine', noteLength: .38 },
  woestijn: { chords: [[40, 44, 47], [41, 45, 48], [44, 48, 52], [42, 45, 49]],
    scale: [64, 65, 68, 69, 71, 72, 74, 76, 77], beat: 60 / 78, lead: 'sawtooth', pad: 'triangle', noteLength: .5 },
  toendra: { chords: [[48, 52, 55], [45, 48, 52], [43, 47, 50], [41, 45, 48]],
    scale: [72, 74, 76, 79, 81, 84, 86, 88, 91], beat: 60 / 60, lead: 'sine', pad: 'sine', noteLength: 1.5 },
  savanne: { chords: [[48, 52, 55], [45, 48, 52], [41, 45, 48], [43, 47, 50]],
    scale: [60, 62, 64, 67, 69, 72, 74, 76, 79], beat: 60 / 82, lead: 'triangle', pad: 'sine', noteLength: .75, drum: true },
};

const freq = (n) => 440 * Math.pow(2, (n - 69) / 12);

export class Music {
  constructor(sounds) {
    this.sounds = sounds;
    this.on = true;
    this.timer = null;
    this.bus = null;
    this.phrase = [];
    this.style = 'island';
  }

  setStyle(name) {
    const next = STYLES[name] ? name : 'island';
    if (this.style === next) return;
    this.style = next; this.phrase = []; this.step = 0;
  }

  // Een melodie van 4 maten die twee keer herhaald wordt, dan een nieuwe
  makePhrase() {
    const notes = [];
    let i = 2 + Math.floor(Math.random() * 3);
    for (let s = 0; s < 16; s++) {
      if (Math.random() < 0.35 && s % 4 !== 0) { notes.push(null); continue; }
      const scale = STYLES[this.style].scale;
      i = Math.max(0, Math.min(scale.length - 1, i + Math.floor(Math.random() * 5) - 2));
      notes.push(scale[i]);
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
      this.next += STYLES[this.style].beat;
      this.step++;
    }
  }

  playStep(step, t) {
    const style = STYLES[this.style], beat = style.beat;
    if (step % 32 === 0 || !this.phrase.length) this.phrase = this.makePhrase();
    const bar = Math.floor(step / 4) % 4;
    if (step % 4 === 0) {
      // akkoord voor de hele maat, en een lage bastoon
      for (const n of style.chords[bar]) this.note(style.pad, freq(n), t, beat * 4, 0.04, 0.6);
      this.note('triangle', freq(style.chords[bar][0] - 12), t, beat * 1.8, 0.07, 0.05);
    }
    if (step % 4 === 2) this.note('triangle', freq(style.chords[bar][0] - 12), t, beat * 1.5, 0.05, 0.05);
    const m = this.phrase[step % 16];
    if (m) this.note(style.lead, freq(m), t, beat * style.noteLength, style.lead === 'sawtooth' ? .035 : .07, .02);
    if (style.drum && step % 2 === 0) this.drum(t, step % 4 === 0);
  }

  drum(t, low) {
    const ctx = this.sounds.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(low ? 110 : 260, t);
    o.frequency.exponentialRampToValueAtTime(low ? 55 : 130, t + .13);
    g.gain.setValueAtTime(.09, t); g.gain.exponentialRampToValueAtTime(.0001, t + .15);
    o.connect(g).connect(this.bus); o.start(t); o.stop(t + .16);
  }

  note(type, f, t, dur, vol, attack) {
    const ctx = this.sounds.ctx;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    if (type === 'sawtooth') {
      const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 950;
      o.connect(filter); filter.connect(g);
    } else o.connect(g);
    g.connect(this.bus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
}
