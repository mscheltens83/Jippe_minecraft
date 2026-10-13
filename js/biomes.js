// Wereldrecepten. Avontuur mengt de vier gebieden over acht blokken met elkaar.
import { B } from './blocks.js';

const sky = (boven, horizon, mist, mistBegin, mistEind, wolken = 46, zon = '#fff4b0') =>
  ({ boven, horizon, mist, mistBegin, mistEind, wolken, zon });
const oldSky = sky('#4aa3ec', '#c9ecff', '#9ad8ff', 45, 125);
const farmAnimals = [['pig', 4], ['sheep', 3], ['chicken', 4]];

// kies: staat als kaart in het menu "Nieuwe wereld". De andere recepten zijn landschappen
// binnen de Grote wereld (of Avontuur, dat je niet meer nieuw kunt kiezen).
export const BIOMES = {
  world: {
    naam: 'Grote wereld', icon: 'bigWorld', kies: true, zee: true, lucht: oldSky, dieren: farmAnimals,
    grond: { top: B.GRASS, onder: B.DIRT }, hoogte: { basis: 13, heuvels: 4, schaal: 18 }, achtergrond: 'vogels', muziek: 'island',
  },
  island: { naam: 'Eiland', icon: 'island', kies: true, lucht: oldSky, dieren: farmAnimals, grond: { top: B.GRASS, onder: B.DIRT }, hoogte: { basis: 13, heuvels: 4, schaal: 18 } },
  // Boerderij in Gevaar (fase 7B): een eiland met een boerderij; roofdieren komen dieren halen (js/farm.js)
  farm: {
    naam: 'Boerderij', icon: 'farm', kies: true, lucht: oldSky, grond: { top: B.GRASS, onder: B.DIRT }, hoogte: { basis: 13, heuvels: 4, schaal: 18 },
    dieren: [['cow', 3], ['pig', 3], ['sheep', 3], ['chicken', 4], ['rabbit', 2]],
  },
  flat: { naam: 'Plat', icon: 'flat', kies: true, lucht: oldSky, dieren: farmAnimals, grond: { top: B.GRASS, onder: B.DIRT }, hoogte: { basis: 11, heuvels: 0, schaal: 18 } },
  jungle: {
    naam: 'Jungle', icon: 'jungle', zee: true, kies: true,
    lucht: sky('#3f9fdc', '#bfe8d0', '#a9d8c0', 30, 90, 38),
    grond: { top: B.GRASS, onder: B.DIRT, onderWater: B.SAND }, hoogte: { basis: 13, heuvels: 6, schaal: 22 },
    bomen: [{ soort: 'giantJungle', dichtheid: 0.006 }, { soort: 'jungle', dichtheid: 0.02 }],
    planten: [{ blok: B.JUNGLE_LEAVES, dichtheid: 0.03 }, { blok: B.FERN, dichtheid: 0.08 },
      { blok: B.JUNGLE_FLOWER, dichtheid: 0.02 }, { blok: B.BAMBOO, dichtheid: 0.004, hoog: [3, 6] }, { blok: B.MELON, dichtheid: 0.002 }],
    bouwwerken: ['temple'], dieren: [['tiger', 3], ['monkey', 3], ['parrot', 3], ['panda', 2], ['frog', 3], ['sloth', 2]], weer: 'blaadjes', achtergrond: 'vogels', muziek: 'jungle',
  },
  desert: {
    naam: 'Woestijn', icon: 'desert', zee: true, kies: true,
    lucht: sky('#5fb0e8', '#f3e2b0', '#f0dca8', 50, 130, 12, '#fff1a0'),
    grond: { top: B.SAND, onder: B.SAND, onderWater: B.SAND }, hoogte: { basis: 12, heuvels: 3, schaal: 30, schaalZ: 12 },
    bomen: [], planten: [{ blok: B.CACTUS, dichtheid: 0.01, hoog: [1, 3] }, { blok: B.DEAD_BUSH, dichtheid: 0.01 }],
    bouwwerken: ['pyramid', 'oasis', 'village'], dieren: [['meerkat', 3], ['camel', 3], ['fennec', 3], ['lizard', 3], ['turtle', 2]], weer: null, achtergrond: 'wind', muziek: 'woestijn',
  },
  tundra: {
    naam: 'Toendra', icon: 'tundra', zee: true, kies: true,
    lucht: sky('#7fb2dc', '#e6f2fb', '#dfeaf5', 40, 110, 42, '#f6fbff'),
    grond: { top: B.SNOW, onder: B.DIRT, onderWater: B.SAND }, hoogte: { basis: 12, heuvels: 4, schaal: 24 },
    bomen: [{ soort: 'spruce', dichtheid: 0.012 }], planten: [{ blok: B.SNOW, dichtheid: 0.004 }, { blok: B.PACKED_ICE, dichtheid: 0.001, hoog: [4, 8] }],
    bouwwerken: ['igloo', 'village'], dieren: [['polarBear', 2], ['penguin', 4], ['reindeer', 3], ['arcticFox', 3], ['seal', 2], ['snowyOwl', 2]], weer: 'sneeuw', achtergrond: 'wind', muziek: 'toendra',
  },
  savanna: {
    naam: 'Savanne', icon: 'savanna', zee: true, kies: true,
    lucht: sky('#58a6e0', '#f6d9a0', '#efd29a', 50, 130, 20, '#ffe296'),
    grond: { top: B.DRY_GRASS, onder: B.RED_DIRT, onderWater: B.SAND }, hoogte: { basis: 12, heuvels: 2, schaal: 30 },
    bomen: [{ soort: 'acacia', dichtheid: 0.006 }], planten: [{ blok: B.TALL_DRY_GRASS, dichtheid: 0.12 }, { blok: B.TERMITE, dichtheid: 0.002, hoog: [2, 4] }],
    bouwwerken: ['lionRock', 'wateringHole', 'village'],
    dieren: [['lion', 2], ['lioness', 1], ['cheetah', 2], ['elephant', 2], ['giraffe', 2], ['zebra', 4], ['hippo', 1], ['meerkat', 3]],
    weer: null, achtergrond: 'krekels', muziek: 'savanne',
  },
  dino: {
    naam: 'Dinowereld', icon: 'dino', zee: true, kies: true,
    lucht: sky('#5aa6d6', '#e8e0b8', '#d8d4b0', 40, 120, 34, '#fff0b8'),
    grond: { top: B.GRASS, onder: B.DIRT, onderWater: B.SAND }, hoogte: { basis: 13, heuvels: 5, schaal: 24 },
    bomen: [{ soort: 'cycad', dichtheid: 0.004 }, { soort: 'treeFern', dichtheid: 0.003 }],
    planten: [{ blok: B.FERN, dichtheid: 0.1 }, { blok: B.HORSETAIL, dichtheid: 0.05 }],
    bouwwerken: ['nest', 'dig'], dieren: [['triceratops', 3], ['stegosaurus', 2], ['parasaur', 3], ['raptor', 2], ['pteranodon', 2], ['brachio', 1], ['trex', 1]],
    achtergrond: 'vogels', muziek: 'dino',
  },
  adventure: { naam: 'Avontuur', icon: 'adventure', zee: true, lucht: oldSky },

  // ---------- landschappen in de Grote wereld (naast jungle, woestijn, toendra en savanne) ----------
  plains: {
    naam: 'Vlakte', lucht: oldSky, grond: { top: B.GRASS, onder: B.DIRT },
    bomen: [{ soort: 'oak', dichtheid: 0.002 }],
    planten: [{ blok: B.TALLGRASS, dichtheid: 0.14 }, { blok: B.FLOWER_YELLOW, dichtheid: 0.012 }, { blok: B.FLOWER_RED, dichtheid: 0.012 }, { blok: B.CORNFLOWER, dichtheid: 0.006 }],
    bouwwerken: ['village'], dieren: [['pig', 2], ['sheep', 2], ['chicken', 2], ['cow', 3], ['horse', 2], ['rabbit', 2]], achtergrond: 'vogels', muziek: 'island',
  },
  flowerField: {
    naam: 'Bloemenveld', lucht: oldSky, grond: { top: B.GRASS, onder: B.DIRT },
    bomen: [{ soort: 'oak', dichtheid: 0.002 }],
    planten: [{ blok: B.FLOWER_RED, dichtheid: 0.07 }, { blok: B.FLOWER_YELLOW, dichtheid: 0.07 }, { blok: B.CORNFLOWER, dichtheid: 0.06 },
      { blok: B.TULIP, dichtheid: 0.06 }, { blok: B.TALLGRASS, dichtheid: 0.06 }],
    dieren: [['sheep', 3], ['chicken', 2], ['bee', 3], ['rabbit', 2]], achtergrond: 'vogels', muziek: 'island',
  },
  forest: {
    naam: 'Bos', lucht: oldSky, grond: { top: B.GRASS, onder: B.DIRT },
    bomen: [{ soort: 'bigOak', dichtheid: 0.005 }, { soort: 'oak', dichtheid: 0.035 }, { soort: 'birch', dichtheid: 0.008 }],
    planten: [{ blok: B.TALLGRASS, dichtheid: 0.06 }, { blok: B.FERN, dichtheid: 0.03 }, { blok: B.MUSHROOM_BROWN, dichtheid: 0.006 },
      { blok: B.MUSHROOM_RED, dichtheid: 0.004 }, { blok: B.FLOWER_RED, dichtheid: 0.004 }],
    bouwwerken: ['ruin'], dieren: [['pig', 2], ['chicken', 1], ['dog', 2], ['rabbit', 2], ['bee', 1]], achtergrond: 'vogels', muziek: 'island',
  },
  birchForest: {
    naam: 'Berkenbos', lucht: oldSky, grond: { top: B.GRASS, onder: B.DIRT },
    bomen: [{ soort: 'birch', dichtheid: 0.035 }],
    planten: [{ blok: B.TALLGRASS, dichtheid: 0.08 }, { blok: B.FLOWER_YELLOW, dichtheid: 0.01 }, { blok: B.TULIP, dichtheid: 0.005 }],
    bouwwerken: ['ruin'], dieren: [['sheep', 2], ['chicken', 1], ['cow', 2], ['rabbit', 2]], achtergrond: 'vogels', muziek: 'island',
  },
  taiga: {
    naam: 'Sparrenbos', lucht: sky('#6fa6d8', '#d7e8f2', '#c9dcea', 45, 120, 40), grond: { top: B.GRASS, onder: B.DIRT },
    bomen: [{ soort: 'spruce', dichtheid: 0.035 }],
    planten: [{ blok: B.FERN, dichtheid: 0.09 }, { blok: B.TALLGRASS, dichtheid: 0.04 }, { blok: B.MUSHROOM_BROWN, dichtheid: 0.004 }],
    bouwwerken: ['village'], dieren: [['reindeer', 2], ['arcticFox', 2], ['fox', 3], ['dog', 2], ['rabbit', 2]], achtergrond: 'wind', muziek: 'toendra',
  },
  mountains: {
    naam: 'Bergen', lucht: sky('#5e9fdc', '#dce9f5', '#d2e2f0', 50, 140, 30, '#fffbe8'), grond: { top: B.GRASS, onder: B.DIRT },
    bomen: [{ soort: 'spruce', dichtheid: 0.006 }],
    planten: [{ blok: B.TALLGRASS, dichtheid: 0.05 }],
    dieren: [['goat', 3], ['llama', 2], ['sheep', 2]], achtergrond: 'wind', muziek: 'toendra',
  },
  mesa: {
    naam: 'Mesa', lucht: sky('#5fb0e8', '#f1c99a', '#e9c290', 50, 130, 12, '#fff1a0'), grond: { top: B.RED_SAND, onder: B.RED_SAND },
    bomen: [], planten: [{ blok: B.DEAD_BUSH, dichtheid: 0.012 }, { blok: B.CACTUS, dichtheid: 0.004, hoog: [1, 3] }],
    dieren: [['lizard', 2], ['fennec', 1]], achtergrond: 'wind', muziek: 'woestijn',
  },
  bamboo: {
    naam: 'Bamboebos', lucht: sky('#3f9fdc', '#bfe8d0', '#a9d8c0', 30, 90, 38), grond: { top: B.GRASS, onder: B.DIRT },
    bomen: [{ soort: 'jungle', dichtheid: 0.004 }],
    planten: [{ blok: B.BAMBOO, dichtheid: 0.09, hoog: [4, 9] }, { blok: B.FERN, dichtheid: 0.05 }, { blok: B.JUNGLE_FLOWER, dichtheid: 0.01 }],
    dieren: [['panda', 3], ['parrot', 2], ['monkey', 1]], weer: 'blaadjes', achtergrond: 'vogels', muziek: 'jungle',
  },
  // ---------- landschappen in de Dinowereld (fase 5A) ----------
  dinoPlains: {
    naam: 'Varenvlakte', lucht: sky('#5aa6d6', '#e8e0b8', '#d8d4b0', 40, 120, 34, '#fff0b8'), grond: { top: B.GRASS, onder: B.DIRT },
    bomen: [{ soort: 'cycad', dichtheid: 0.004 }, { soort: 'treeFern', dichtheid: 0.002 }],
    planten: [{ blok: B.FERN, dichtheid: 0.1 }, { blok: B.HORSETAIL, dichtheid: 0.05 }, { blok: B.GIANT_FERN, dichtheid: 0.015, boven: B.GIANT_FERN + 1 }, { blok: B.TALLGRASS, dichtheid: 0.04 }],
    bouwwerken: ['nest', 'dig'], dieren: [['triceratops', 3], ['stegosaurus', 2], ['parasaur', 3], ['trex', 1], ['raptor', 2]], achtergrond: 'vogels', muziek: 'dino',
  },
  dinoForest: {
    naam: 'Oerbos', lucht: sky('#4f9ccf', '#cfe2bf', '#bcd4ac', 32, 100, 36), grond: { top: B.MOSS, onder: B.DIRT },
    bomen: [{ soort: 'araucaria', dichtheid: 0.006 }, { soort: 'treeFern', dichtheid: 0.03 }, { soort: 'cycad', dichtheid: 0.01 }],
    planten: [{ blok: B.GIANT_FERN, dichtheid: 0.06, boven: B.GIANT_FERN + 1 }, { blok: B.FERN, dichtheid: 0.12 }, { blok: B.HORSETAIL, dichtheid: 0.03 }, { blok: B.MUSHROOM_BROWN, dichtheid: 0.004 }],
    bouwwerken: ['nest'], dieren: [['brachio', 2], ['raptor', 2], ['pteranodon', 1], ['stegosaurus', 1]], weer: 'blaadjes', achtergrond: 'vogels', muziek: 'dino',
  },
  volcano: {
    naam: 'Vulkanen', lucht: sky('#7f93a8', '#d9b9a0', '#b8a090', 30, 100, 24, '#ffd8a0'), grond: { top: B.BASALT, onder: B.BASALT },
    bomen: [], planten: [{ blok: B.DEAD_BUSH, dichtheid: 0.004 }],
    dieren: [['pteranodon', 2]], weer: 'as', achtergrond: 'wind', muziek: 'dino',
  },
  swamp: {
    naam: 'Moeras', lucht: sky('#5f8fae', '#b9c9a8', '#a8b898', 30, 95, 40), grond: { top: B.GRASS, onder: B.DIRT },
    bomen: [{ soort: 'swampOak', dichtheid: 0.012 }],
    planten: [{ blok: B.TALLGRASS, dichtheid: 0.1 }, { blok: B.FERN, dichtheid: 0.03 }, { blok: B.MUSHROOM_BROWN, dichtheid: 0.01 }, { blok: B.MUSHROOM_RED, dichtheid: 0.004 }],
    dieren: [['frog', 3]], achtergrond: 'krekels', muziek: 'jungle',
  },
  beach: {
    naam: 'Strand', lucht: oldSky, grond: { top: B.SAND, onder: B.SAND },
    bomen: [{ soort: 'palm', dichtheid: 0.003 }], planten: [],
    bouwwerken: ['shipwreck'], dieren: [['turtle', 2]], achtergrond: 'wind', muziek: 'island',
  },
  ocean: { naam: 'Zee', lucht: oldSky, grond: { top: B.SAND, onder: B.SAND }, bomen: [], planten: [], dieren: [['fish', 5], ['dolphin', 2], ['squid', 2], ['jellyfish', 2], ['puffer', 2], ['whale', 1]], achtergrond: 'wind', muziek: 'island' },
  river: { naam: 'Rivier', lucht: oldSky, grond: { top: B.SAND, onder: B.SAND }, bomen: [], planten: [], dieren: [['fish', 3], ['puffer', 1]], achtergrond: 'vogels', muziek: 'island' },
};

// De soorten wereld die je kunt hebben (de rest zijn landschappen binnen een wereld)
export const WORLD_TYPES = ['world', 'island', 'farm', 'flat', 'jungle', 'desert', 'tundra', 'savanna', 'dino', 'adventure'];
export const worldType = (t) => (WORLD_TYPES.includes(t) ? t : 'island');

const smooth = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };

// De weide in het midden blijft vrij om te bouwen en voor de boerderijdieren.
export function biomeWeights(type, x = 48, z = 48) {
  if (type === 'farm') type = 'flat'; // de boerderij is een vlakke weide
  if (type !== 'adventure') return [{ type: BIOMES[type] ? type : 'island', weight: 1 }];
  const east = smooth((x - 44) / 8), south = smooth((z - 44) / 8);
  const wild = smooth((Math.hypot(x - 48, z - 48) - 8) / 6);
  return [
    { type: 'island', weight: 1 - wild },
    { type: 'jungle', weight: (1 - east) * (1 - south) * wild },
    { type: 'tundra', weight: east * (1 - south) * wild },
    { type: 'desert', weight: (1 - east) * south * wild },
    { type: 'savanna', weight: east * south * wild },
  ].filter((b) => b.weight > 0);
}

export function biomeAt(type, x, z) {
  return biomeWeights(type, x, z).reduce((a, b) => b.weight > a.weight ? b : a).type;
}

// Kleuren en mist mengen zonder een nieuwe renderer of textuur te maken.
export function biomeView(type, x, z) {
  const weights = biomeWeights(type, x, z), lucht = {};
  for (const key of ['boven', 'horizon', 'mist', 'zon']) {
    const channels = [0, 0, 0];
    for (const b of weights) {
      const color = parseInt(BIOMES[b.type].lucht[key].slice(1), 16);
      channels.forEach((_, i) => { channels[i] += ((color >> (16 - i * 8)) & 255) * b.weight; });
    }
    lucht[key] = '#' + channels.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  }
  for (const key of ['mistBegin', 'mistEind', 'wolken']) lucht[key] = weights.reduce((n, b) => n + BIOMES[b.type].lucht[key] * b.weight, 0);
  return { lucht };
}
