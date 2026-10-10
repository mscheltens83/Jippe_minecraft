// Verkleden (fase 5C): hoeden, capes en de kleur van je kleren. De pet en alle kleuren heb je
// meteen; de rest vind je in schatkisten. Heb je alles, dan zit er goud in de kist.
import { box } from './models.js';

export const HATS = [
  { id: 'none', naam: 'Geen hoed', icon: 'close' },
  { id: 'cap', naam: 'Pet', een: 'een pet', icon: 'hatCap' },
  { id: 'crown', naam: 'Kroon', een: 'een kroon', icon: 'hatCrown' },
  { id: 'pirate', naam: 'Piratenhoed', een: 'een piratenhoed', icon: 'hatPirate' },
  { id: 'cowboy', naam: 'Cowboyhoed', een: 'een cowboyhoed', icon: 'hatCowboy' },
  { id: 'wizard', naam: 'Tovenaarshoed', een: 'een tovenaarshoed', icon: 'hatWizard' },
  { id: 'knight', naam: 'Ridderhelm', een: 'een ridderhelm', icon: 'hatKnight' },
  { id: 'dino', naam: 'Dino-kap', een: 'een dino-kap', icon: 'hatDino' },
  { id: 'flowers', naam: 'Bloemenkrans', een: 'een bloemenkrans', icon: 'hatFlowers' },
];
export const CAPES = [
  { id: 'none', naam: 'Geen cape', icon: 'close' },
  { id: 'red', naam: 'Rode cape', een: 'een rode cape', icon: 'capeRed' },
  { id: 'blue', naam: 'Blauwe cape', een: 'een blauwe cape', icon: 'capeBlue' },
  { id: 'rainbow', naam: 'Regenboogcape', een: 'een regenboogcape', icon: 'capeRainbow' },
];
export const SHIRTS = ['#e8503d', '#f08a24', '#f6d036', '#5cb84a', '#3f7fd0', '#8a4fc8', '#ec6fa6', '#f2f0ea', '#3a3a40'];
export const PANTS = ['#2f5da8', '#3a3a40', '#6b4526', '#5cb84a', '#c23b2f', '#9aa4ad'];
// Dit krijg je met een sticker in plaats van uit een schatkist
export const STICKER_PRIZES = { trex: 'hat:dino', alleWerelden: 'cape:rainbow' };

const FREE = ['hat:none', 'hat:cap', 'cape:none'];
const PRIZES = [...HATS, ...CAPES].filter((x) => x.een).map((x) => (HATS.includes(x) ? 'hat:' : 'cape:') + x.id)
  .filter((k) => !FREE.includes(k) && !Object.values(STICKER_PRIZES).includes(k));
export const itemOf = (key) => {
  const [kind, id] = key.split(':');
  return (kind === 'hat' ? HATS : CAPES).find((x) => x.id === id);
};

export class Wardrobe {
  constructor(saved = {}) {
    this.unlocked = new Set([...FREE, ...(saved.unlocked || [])].filter((k) => itemOf(k)));
    this.hat = this.has('hat:' + saved.hat) ? saved.hat : 'none';
    this.cape = this.has('cape:' + saved.cape) ? saved.cape : 'none';
    this.shirt = SHIRTS.includes(saved.shirt) ? saved.shirt : SHIRTS[0];
    this.pants = PANTS.includes(saved.pants) ? saved.pants : PANTS[0];
    this.gold = Number.isFinite(saved.gold) ? saved.gold : 0;
  }
  has(key) { return this.unlocked.has(key); }
  get look() { return { hat: this.hat, cape: this.cape, shirt: this.shirt, pants: this.pants }; }

  // Uit een schatkist: iets wat je nog niet had (of goud). Geeft { key, item } of { gold }
  treasure(random = Math.random) {
    const open = PRIZES.filter((k) => !this.has(k));
    if (!open.length) { this.gold++; return { gold: this.gold }; }
    const key = open[Math.floor(random() * open.length)];
    this.unlocked.add(key);
    return { key, item: itemOf(key) };
  }
  unlock(key) {
    if (this.has(key) || !itemOf(key)) return null;
    this.unlocked.add(key);
    return itemOf(key);
  }

  save() { return { unlocked: [...this.unlocked], hat: this.hat, cape: this.cape, shirt: this.shirt, pants: this.pants, gold: this.gold }; }
}

// ---------- vormen voor het poppetje (dezelfde maten als in avatar.js) ----------

// Hoed: blokjes rond het hoofd (het hoofd is 0.44 breed, met het midden op y = 1.48)
export function hatGeos(id) {
  const g = [];
  switch (id) {
    case 'cap':
      g.push(box(0.48, 0.12, 0.48, '#e8503d', 0, 1.74, 0), box(0.4, 0.04, 0.22, '#c23b2f', 0, 1.69, -0.32));
      break;
    case 'crown':
      g.push(box(0.48, 0.12, 0.48, '#f2c230', 0, 1.76, 0));
      for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2], [0, -0.2], [0, 0.2], [-0.2, 0], [0.2, 0]]) g.push(box(0.08, 0.12, 0.08, '#f2c230', x, 1.87, z));
      g.push(box(0.08, 0.08, 0.02, '#d83b3b', 0, 1.76, -0.25), box(0.06, 0.06, 0.02, '#3f7fd0', -0.14, 1.76, -0.25), box(0.06, 0.06, 0.02, '#5cb84a', 0.14, 1.76, -0.25));
      break;
    case 'pirate':
      g.push(box(0.62, 0.06, 0.58, '#26221f', 0, 1.72, 0), box(0.46, 0.2, 0.34, '#26221f', 0, 1.85, 0), box(0.1, 0.1, 0.02, '#f4f1ea', 0, 1.85, -0.18));
      break;
    case 'cowboy':
      g.push(box(0.84, 0.04, 0.84, '#8a5a2b', 0, 1.71, 0), box(0.44, 0.22, 0.44, '#8a5a2b', 0, 1.83, 0), box(0.46, 0.05, 0.46, '#3a2a20', 0, 1.75, 0));
      break;
    case 'wizard':
      g.push(box(0.66, 0.04, 0.66, '#5a3aa0', 0, 1.71, 0), box(0.42, 0.2, 0.42, '#5a3aa0', 0, 1.82, 0), box(0.3, 0.2, 0.3, '#5a3aa0', 0, 2.0, 0.02),
        box(0.18, 0.18, 0.18, '#5a3aa0', 0, 2.18, 0.05), box(0.08, 0.14, 0.08, '#5a3aa0', 0, 2.33, 0.08), box(0.1, 0.1, 0.02, '#ffd84a', 0, 1.84, -0.22));
      break;
    case 'knight':
      g.push(box(0.5, 0.5, 0.5, '#b8bec6', 0, 1.49, 0), box(0.4, 0.06, 0.02, '#1c2a33', 0, 1.52, -0.26), box(0.06, 0.18, 0.02, '#1c2a33', 0, 1.42, -0.26),
        box(0.08, 0.2, 0.3, '#d83b3b', 0, 1.82, 0.05));
      break;
    case 'dino':
      g.push(box(0.5, 0.16, 0.52, '#6cb04a', 0, 1.75, 0.01), box(0.5, 0.3, 0.08, '#6cb04a', 0, 1.6, 0.25));
      for (let i = 0; i < 4; i++) g.push(box(0.06, 0.12 - i * 0.015, 0.1, '#f08a24', 0, 1.88 - i * 0.03, -0.15 + i * 0.13));
      g.push(box(0.08, 0.08, 0.02, '#fff', -0.12, 1.77, -0.27), box(0.08, 0.08, 0.02, '#fff', 0.12, 1.77, -0.27));
      break;
    case 'flowers': {
      const colors = ['#ff7aa2', '#ffd84a', '#ffffff', '#8fb8ff'];
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * Math.PI * 2;
        g.push(box(0.09, 0.09, 0.09, i % 2 ? '#5cb84a' : colors[(i / 2) % 4], Math.sin(a) * 0.25, 1.72, Math.cos(a) * 0.25));
      }
      break;
    }
    default: break;
  }
  return g;
}

// Cape: hangt aan de schouders, op de rug
export function capeGeos(id) {
  if (id === 'none') return [];
  if (id === 'rainbow') {
    const stripes = ['#e8503d', '#f08a24', '#f6d036', '#5cb84a', '#3f7fd0', '#8a4fc8'];
    return stripes.map((c, i) => box(0.52 / 6, 0.9, 0.04, c, -0.26 + 0.52 / 12 + i * 0.52 / 6, 0.8, 0.17));
  }
  return [box(0.54, 0.9, 0.04, id === 'blue' ? '#3f7fd0' : '#c8302a', 0, 0.8, 0.17), box(0.56, 0.06, 0.06, '#f2c230', 0, 1.24, 0.16)];
}
