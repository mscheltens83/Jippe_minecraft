// De tijd van de dag. Een hele dag duurt 20 minuten: 13 minuten dag, 1 minuut avond,
// 5 minuten nacht en 1 minuut ochtend. De tijd loopt van 0 tot 1; 0 is net na zonsopkomst.

export const DAY_SECONDS = 20 * 60;
export const DAY_END = 13 / 20, DUSK_END = 14 / 20, NIGHT_END = 19 / 20;
export const NOON = 0.3;          // "altijd dag" en de meetrit: middag
export const NIGHT_LIGHT = 0.3;   // zo licht is het buiten 's nachts (maanlicht), 1 = middag

const smooth = (t) => t * t * (3 - 2 * t);
const SUNRISE = (NIGHT_END + 1) / 2 - 1; // midden in de ochtend (net voor 0)
const SUNSET = (DAY_END + DUSK_END) / 2; // midden in de avond

// Hoeveel zon er is: 1 overdag, 0 's nachts, met een zachte overgang
export function sunAmount(t) {
  t = ((t % 1) + 1) % 1;
  if (t < DAY_END) return 1;
  if (t < DUSK_END) return smooth(1 - (t - DAY_END) / (DUSK_END - DAY_END));
  if (t < NIGHT_END) return 0;
  return smooth((t - NIGHT_END) / (1 - NIGHT_END));
}

// Oranje gloed aan de horizon rond zonsopkomst en zonsondergang (0..1)
export function glowAmount(t) {
  const dist = (a, b) => { const d = Math.abs((((a - b) % 1) + 1) % 1); return Math.min(d, 1 - d); };
  const d = Math.min(dist(t, SUNSET), dist(t, SUNRISE));
  return Math.max(0, 1 - d / 0.035);
}

// Stand van de zon: 0 = opkomst (oost), PI/2 = hoog in de lucht, PI = ondergang (west).
// 's Nachts gaat de zon onder de grond verder en staat de maan aan de andere kant.
export function sunAngle(t) {
  const u = ((((t - SUNRISE) % 1) + 1) % 1), day = SUNSET - SUNRISE;
  if (u < day) return (u / day) * Math.PI;
  return Math.PI + ((u - day) / (1 - day)) * Math.PI;
}

// Daglicht (in sRGB): 1 overdag, NIGHT_LIGHT 's nachts
export function daylight(t) { return NIGHT_LIGHT + (1 - NIGHT_LIGHT) * sunAmount(t); }

export class DayNight {
  constructor() {
    this.time = 0.02;
    this.alwaysDay = false;  // ouderinstelling
    this.frozen = false;     // meetrit: tijd staat stil
  }

  // De tijd die je ziet ("altijd dag" is altijd middag)
  get now() { return this.alwaysDay ? NOON : this.time; }
  get sun() { return sunAmount(this.now); }
  get night() { return this.sun < 0.5; }

  update(dt) {
    if (this.frozen || this.alwaysDay) return;
    this.time = (this.time + dt / DAY_SECONDS) % 1;
  }

  set(t) { this.time = Number.isFinite(t) ? ((t % 1) + 1) % 1 : 0.02; }
  morning() { this.time = 0.01; }
}
