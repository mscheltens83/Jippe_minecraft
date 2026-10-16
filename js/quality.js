// Automatische kwaliteit: haalt het apparaat het niet, dan tekenen we minder scherp, minder ver en
// zuiniger; is het snel, dan juist scherper en verder. Hier staat alleen het rekenwerk (zonder
// three.js), zodat de unit-tests het kunnen controleren; main.js voert de stappen uit.

export const WINDOW = 1.5;           // zo vaak (seconden spelen) kijken we hoe vlot het ging
const SLOW = 1 / 42;                 // langzamer dan 42 beeldjes per seconde: een stap lager
const VERY_SLOW = 1 / 20;            // langzamer dan 20 (een oude tablet): twee stappen tegelijk
const FAST = 1 / 57;                 // sneller dan 57: een stap hoger (alleen als het nog nooit te traag was)
const HICCUP = 0.5;                  // een beeldje van meer dan een halve seconde (laden, terug uit de achtergrond) telt niet mee
export const MIN_RATIO = 0.6;        // nog minder scherp wordt te wazig

// Een oud of goedkoop Android-apparaat begint zuiniger (minder scherp, minder ver kijken). Is het
// toch snel, dan gaat het binnen een paar seconden vanzelf omhoog.
export function isAndroid(ua = globalThis.navigator?.userAgent || '') {
  return /Android/i.test(ua);
}

// Eén stap lager. q = { ratio, view, zuinig }. Eerst minder scherp (tot 1), dan minder ver kijken
// (tot 4 chunks), dan zuinig (dieren eerder als één stuk, geen wolken), dan nog minder scherp en
// minder ver. Geeft null als het niet lager kan.
export function lower(q) {
  if (q.ratio > 1) return { ...q, ratio: Math.max(1, q.ratio - 0.25) };
  if (q.view > 4) return { ...q, view: q.view - 1 };
  if (!q.zuinig) return { ...q, zuinig: true };
  if (q.ratio > 0.75) return { ...q, ratio: 0.75 };
  if (q.view > 3) return { ...q, view: 3 };
  if (q.ratio > MIN_RATIO) return { ...q, ratio: MIN_RATIO };
  return null;
}

// Eén stap hoger: eerst scherper, dan verder kijken. Geeft null als het niet hoger kan.
export function raise(q, maxRatio, maxView) {
  if (q.ratio < maxRatio) return { ...q, ratio: Math.min(maxRatio, q.ratio + 0.25) };
  if (q.view < maxView) return { ...q, view: q.view + 1 };
  return null;
}

// Telt de beeldjes en zegt na elk stukje van WINDOW seconden wat er moet gebeuren:
// 1 of 2 = zoveel stappen lager, -1 = een stap hoger, 0 = goed zo.
export class QualityMeter {
  constructor() {
    this.time = 0;
    this.frames = 0;
    this.warmup = 2;       // de eerste stukjes na het starten tellen niet mee (shaders, wereld laden)
    this.lowered = false;  // ooit te traag geweest? Dan nooit meer omhoog (anders blijft het wisselen)
  }

  // seconds = echte tijd sinds het vorige beeldje
  frame(seconds) {
    if (!(seconds > 0) || seconds > HICCUP) return 0;
    this.time += seconds;
    this.frames++;
    if (this.time < WINDOW) return 0;
    const avg = this.time / this.frames;
    this.time = 0;
    this.frames = 0;
    if (this.warmup > 0) { this.warmup--; return 0; }
    if (avg > SLOW) { this.lowered = true; return avg > VERY_SLOW ? 2 : 1; }
    if (avg < FAST && !this.lowered) { this.warmup = 1; return -1; } // na hoger even afwachten (er komt wereld bij)
    return 0;
  }

  // Even niet meten (bijvoorbeeld in het menu): het halve stukje weggooien
  pause() { this.time = 0; this.frames = 0; }
}
