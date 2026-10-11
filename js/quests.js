// Opdrachtjes met stickers (fase 5B). Het spel meldt wat Jippe doet (note); is een opdrachtje
// daarmee gehaald, dan komt er een sticker bij. Geen tekst nodig: de iPad leest alles voor.
// Een opdrachtje: { id, groep, icon, tekst, on: welke melding, doel: hoe vaak (of hoeveel
// verschillende, met `soorten`), match(data): telt deze melding mee? }

import { B, BLOCKS } from './blocks.js';
import { DINOS } from './animals/species.js';

export const QUEST_GROUPS = [
  { key: 'bouwen', title: 'Bouwen', icon: 'build' },
  { key: 'dieren', title: 'Dieren', icon: 'pig' },
  { key: 'ontdekken', title: 'Ontdekken', icon: 'goHome' },
  { key: 'werelden', title: 'Werelden', icon: 'portal' },
  { key: 'dinos', title: "Dino's", icon: 'dino' },
  { key: 'schatten', title: 'Schatten', icon: 'chest' },
  { key: 'rijden', title: 'Rails en water', icon: 'minecart' },
  { key: 'knoppen', title: 'Knoppen', icon: 'lever' },
];

const THEMES = ['jungle', 'desert', 'tundra', 'savanna', 'dino'];

export const QUESTS = [
  // Bouwen
  { id: 'eersteBlok', groep: 'bouwen', icon: 'build', tekst: 'Bouw een blok.', on: 'place' },
  { id: 'honderd', groep: 'bouwen', icon: 'tower', tekst: 'Bouw honderd blokken.', on: 'place', doel: 100 },
  { id: 'bedInHuis', groep: 'bouwen', icon: 'home', tekst: 'Zet een bed in een huis, met een dak erboven.', on: 'place', match: (d) => d.bed && d.roof },
  { id: 'fakkelGrot', groep: 'bouwen', icon: 'torch', tekst: 'Zet een fakkel in een donkere grot.', on: 'place', match: (d) => d.id === B.TORCH && d.dark },
  { id: 'regenboog', groep: 'bouwen', icon: 'palette', tekst: 'Bouw met het regenboogblok.', on: 'place', match: (d) => d.id === B.RAINBOW },
  { id: 'stempel', groep: 'bouwen', icon: 'house', tekst: 'Zet een stempel neer: een huisje, een boom of een toren.', on: 'stamp' },
  { id: 'zaadje', groep: 'bouwen', icon: 'seeds', tekst: 'Plant een zaadje of een wortel op de akker.', on: 'plant' },
  // Dieren
  { id: 'aaien', groep: 'dieren', icon: 'heart', tekst: 'Aai vijf verschillende dieren.', on: 'pet', doel: 5, soorten: (d) => d.type },
  { id: 'temmen', groep: 'dieren', icon: 'dog', tekst: 'Maak een dier tam: aai het drie keer.', on: 'tame' },
  { id: 'paard', groep: 'dieren', icon: 'horse', tekst: 'Rijd op een paard.', on: 'ride', match: (d) => d.type === 'horse' },
  { id: 'jong', groep: 'dieren', icon: 'carrot', tekst: 'Geef twee dieren hun lievelingseten. Dan krijgen ze een jong.', on: 'breed' },
  { id: 'album10', groep: 'dieren', icon: 'book', tekst: 'Vind tien dieren voor je album.', on: 'album', match: (d) => d.count >= 10 },
  { id: 'hondZit', groep: 'dieren', icon: 'dog', tekst: 'Laat een tamme hond zitten: tik erop.', on: 'sit' },
  { id: 'golemBloem', groep: 'dieren', icon: 'golem', tekst: 'Krijg een bloem van de ijzergolem in het dorp.', on: 'golemFlower' },
  { id: 'zwemrit', groep: 'dieren', icon: 'dolphin', tekst: 'Maak een dolfijn of een walvis tam en zwem erop.', on: 'ride', match: (d) => d.type === 'dolphin' || d.type === 'whale' },
  { id: 'dolfijnsprong', groep: 'dieren', icon: 'dolphin', tekst: 'Spring met een dolfijn uit het water: druk bovenaan op de springknop.', on: 'dolphinLeap' },
  // Ontdekken
  { id: 'dorp', groep: 'ontdekken', icon: 'villageHouse', tekst: 'Vind een dorp.', on: 'near', match: (d) => d.kind === 'village' },
  { id: 'tempel', groep: 'ontdekken', icon: 'temple', tekst: 'Vind een tempel of een piramide.', on: 'near', match: (d) => d.kind === 'temple' || d.kind === 'pyramid' },
  { id: 'schipwrak', groep: 'ontdekken', icon: 'worlds', tekst: 'Vind een schipwrak aan het strand.', on: 'near', match: (d) => d.kind === 'shipwreck' },
  { id: 'wolken', groep: 'ontdekken', icon: 'up', tekst: 'Klim of vlieg hoger dan de wolken.', on: 'height', match: (d) => d.y > 112 },
  { id: 'diep', groep: 'ontdekken', icon: 'pick', tekst: 'Ga diep onder de grond.', on: 'height', match: (d) => d.y < 22 },
  { id: 'duiken', groep: 'ontdekken', icon: 'fish', tekst: 'Zwem onder water.', on: 'dive' },
  { id: 'slapen', groep: 'ontdekken', icon: 'home', tekst: "Slaap 's nachts in een bed.", on: 'sleep' },
  { id: 'diamant', groep: 'ontdekken', icon: 'pick', tekst: 'Vind diamant onder de grond en sloop het.', on: 'break', match: (d) => d.id === B.DIAMOND_ORE },
  // Werelden
  { id: 'portaalAan', groep: 'werelden', icon: 'wand', tekst: 'Steek een portaal aan met de toverstaf.', on: 'portalLit' },
  { id: 'portaal', groep: 'werelden', icon: 'portal', tekst: 'Ga door een portaal.', on: 'portal' },
  { id: 'alleWerelden', groep: 'werelden', icon: 'bigWorld', tekst: 'Bezoek de Jungle, de Woestijn, de Toendra, de Savanne en de Dinowereld.', on: 'world', doel: 5, soorten: (d) => (THEMES.includes(d.type) ? d.type : null) },
  // Dino's
  { id: 'dino', groep: 'dinos', icon: 'dino', tekst: 'Vind een dino voor je album.', on: 'album', match: (d) => DINOS.includes(d.type) },
  { id: 'ei', groep: 'dinos', icon: 'raptor', tekst: 'Tik op een dino-ei en laat het uitkomen.', on: 'hatch' },
  { id: 'trex', groep: 'dinos', icon: 'trex', tekst: 'Maak een T-rex tam en rijd erop.', on: 'ride', match: (d) => d.type === 'trex' },
  { id: 'fossiel', groep: 'dinos', icon: 'stegosaurus', tekst: 'Vind een fossiel en graaf het uit.', on: 'break', match: (d) => d.id === B.FOSSIL },
  // Schatten (fase 5C)
  { id: 'schat', groep: 'schatten', icon: 'chest', tekst: 'Open een schatkist. Die staan in tempels, piramides, schipwrakken en dorpen.', on: 'treasure' },
  { id: 'drieSchatten', groep: 'schatten', icon: 'gold', tekst: 'Open drie schatkisten.', on: 'treasure', doel: 3 },
  { id: 'verkleden', groep: 'schatten', icon: 'hatCrown', tekst: 'Trek iets anders aan in je boek.', on: 'dress' },
  // Rails en water (fase 5D)
  { id: 'rails', groep: 'rijden', icon: 'rail', tekst: 'Leg tien rails neer.', on: 'place', doel: 10, match: (d) => d.rail },
  { id: 'karretje', groep: 'rijden', icon: 'minecart', tekst: 'Rijd een stuk met het karretje over de rails.', on: 'cartRide' },
  { id: 'bootje', groep: 'rijden', icon: 'boat', tekst: 'Vaar een stuk met het bootje.', on: 'boatRide' },
  // Knoppen en hendels (fase 5E)
  { id: 'hendelDeur', groep: 'knoppen', icon: 'lever', tekst: 'Zet een hendel of een knop naast een deur, en tik erop: de deur gaat open.', on: 'signal', match: (d) => d.door },
  { id: 'lampAan', groep: 'knoppen', icon: 'torch', tekst: 'Zet een schakellamp aan met een hendel of een knop.', on: 'signal', match: (d) => d.lamp },
  { id: 'drukplaat', groep: 'knoppen', icon: 'plate', tekst: 'Ga op een drukplaat staan.', on: 'plate' },
  { id: 'vulkaan', groep: 'dinos', icon: 'pteranodon', tekst: 'Ga naar een vulkaan in de Dinowereld.', on: 'biome', match: (d) => d.biome === 'volcano' },
];
export const QUEST_BY_ID = new Map(QUESTS.map((q) => [q.id, q]));

// De voortgang: welke stickers je hebt, en tellers voor opdrachtjes die vaker moeten
export class Quests {
  constructor(saved = {}, onDone = null) {
    this.done = new Set((saved.done || []).filter((id) => QUEST_BY_ID.has(id)));
    this.count = { ...(saved.count || {}) };
    this.kinds = Object.fromEntries(Object.entries(saved.kinds || {}).map(([k, v]) => [k, new Set(v)]));
    this.onDone = onDone;
  }

  // Het spel meldt iets. Geeft de opdrachtjes terug die daarmee net klaar zijn.
  note(event, data = {}) {
    const finished = [];
    for (const q of QUESTS) {
      if (q.on !== event || this.done.has(q.id)) continue;
      if (q.match && !q.match(data)) continue;
      const goal = q.doel || 1;
      let n;
      if (q.soorten) {
        const kind = q.soorten(data);
        if (kind == null) continue;
        (this.kinds[q.id] ||= new Set()).add(kind);
        n = this.kinds[q.id].size;
      } else n = this.count[q.id] = (this.count[q.id] || 0) + 1;
      if (n >= goal) { this.done.add(q.id); delete this.count[q.id]; delete this.kinds[q.id]; finished.push(q); }
    }
    for (const q of finished) this.onDone?.(q);
    return finished;
  }

  // Hoe ver is Jippe met dit opdrachtje? (0..1)
  progress(q) {
    if (this.done.has(q.id)) return 1;
    const n = q.soorten ? this.kinds[q.id]?.size || 0 : this.count[q.id] || 0;
    return Math.min(1, n / (q.doel || 1));
  }

  // Een opdrachtje dat nog niet gedaan is (voor "Wat zal ik doen?"), liefst niet het vorige
  suggest(last = null, random = Math.random) {
    const open = QUESTS.filter((q) => !this.done.has(q.id) && q.id !== last);
    return open.length ? open[Math.floor(random() * open.length)] : null;
  }

  save() {
    return { done: [...this.done], count: this.count, kinds: Object.fromEntries(Object.entries(this.kinds).map(([k, v]) => [k, [...v]])) };
  }
  clear() { this.done.clear(); this.count = {}; this.kinds = {}; }
}

// Staat er een dak boven dit vakje? (voor "bed in een huis")
export function hasRoof(world, x, y, z) {
  for (let dy = 1; dy <= 5; dy++) if (BLOCKS[world.get(x, y + dy, z)]?.solid) return true;
  return false;
}
