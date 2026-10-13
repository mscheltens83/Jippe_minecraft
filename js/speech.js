// Voorlezen (fase 5B): Jippe kan nog niet alles lezen, dus de iPad zegt het hardop
// met de Nederlandse stem van het toestel. Zonder stem gebeurt er gewoon niets.
//
// say(tekst): zegt het meteen en kapt af wat er nog gezegd werd (voor wat nu gebeurt).
// tip(tekst, sleutel, elke): een tip; komt na wat er nu gezegd wordt, en wordt niet vaker herhaald dan
// om de `elke` seconden (zodat hij niet gaat zeuren).
let voice = null;
function pickVoice() {
  const all = window.speechSynthesis?.getVoices?.() || [];
  voice = all.find((v) => /^nl[-_]NL/i.test(v.lang)) || all.find((v) => /^nl/i.test(v.lang)) || null;
}
if (typeof window !== 'undefined' && window.speechSynthesis) {
  pickVoice();
  window.speechSynthesis.addEventListener?.('voiceschanged', pickVoice);
}

const LOG_MAX = 80;
const MAX_QUEUE = 2; // er wachten hoogstens twee tips; de oudste valt af

export const speech = {
  enabled: true,
  silent: false, // de tests: nooit echt praten (op sommige computers houdt dat het spel even op)
  last: '', // voor de tests: wat er het laatst gezegd werd
  log: [],  // voor de tests: alles wat gezegd werd (of gezegd zou zijn), nieuwste laatst
  queue: [],
  busy: false,
  said: new Map(), // sleutel -> wanneer deze tip het laatst gezegd is
  token: 0,

  record(text) {
    this.last = text;
    this.log.push(text);
    if (this.log.length > LOG_MAX) this.log.shift();
  },

  say(text) {
    this.record(text);
    this.queue.length = 0;
    if (!this.enabled || this.silent) { this.busy = false; return false; }
    return this.utter(text, true);
  },

  tip(text, key = text, every = 60) {
    const now = Date.now(), before = this.said.get(key);
    if (before && now - before < every * 1000) return false;
    this.said.set(key, now);
    this.record(text);
    if (!this.enabled || this.silent) return true;
    if (this.queue.length >= MAX_QUEUE) this.queue.shift();
    this.queue.push(text);
    this.next();
    return true;
  },

  next() {
    if (this.busy || !this.queue.length) return;
    this.utter(this.queue.shift(), false);
  },

  utter(text, interrupt) {
    try {
      const s = window.speechSynthesis;
      if (!s) return false;
      if (interrupt) s.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'nl-NL'; u.rate = 0.92; u.pitch = 1.1;
      if (voice) u.voice = voice;
      const id = ++this.token;
      this.busy = true;
      // Klaar met praten: de volgende. (Sommige toestellen melden het einde niet; dan helpt de reservetijd.)
      const done = () => { if (this.token !== id) return; this.busy = false; this.next(); };
      u.onend = done; u.onerror = done;
      setTimeout(done, 2500 + text.length * 110).unref?.();
      s.speak(u);
      return true;
    } catch { this.busy = false; return false; }
  },
};
