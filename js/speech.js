// Voorlezen (fase 5B): Jippe kan nog niet alles lezen, dus de iPad zegt het hardop
// met de Nederlandse stem van het toestel. Zonder stem gebeurt er gewoon niets.
let voice = null;
function pickVoice() {
  const all = window.speechSynthesis?.getVoices?.() || [];
  voice = all.find((v) => /^nl[-_]NL/i.test(v.lang)) || all.find((v) => /^nl/i.test(v.lang)) || null;
}
if (typeof window !== 'undefined' && window.speechSynthesis) {
  pickVoice();
  window.speechSynthesis.addEventListener?.('voiceschanged', pickVoice);
}

export const speech = {
  enabled: true,
  silent: false, // de tests: nooit echt praten (op sommige computers houdt dat het spel even op)
  last: '', // voor de tests: wat er het laatst gezegd werd
  say(text) {
    this.last = text;
    if (!this.enabled || this.silent) return false;
    try {
      const s = window.speechSynthesis;
      if (!s) return false;
      s.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'nl-NL'; u.rate = 0.92; u.pitch = 1.1;
      if (voice) u.voice = voice;
      s.speak(u);
      return true;
    } catch { return false; }
  },
};
