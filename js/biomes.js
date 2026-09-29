// Wereldrecepten. Avontuur mengt de vier gebieden over acht blokken met elkaar.
import { B } from './blocks.js';

const sky = (boven, horizon, mist, mistBegin, mistEind, wolken = 46, zon = '#fff4b0') =>
  ({ boven, horizon, mist, mistBegin, mistEind, wolken, zon });
const oldSky = sky('#4aa3ec', '#c9ecff', '#9ad8ff', 45, 125);
const farmAnimals = [['pig', 4], ['sheep', 3], ['chicken', 4]];

export const BIOMES = {
  island: { naam: 'Eiland', icon: 'island', lucht: oldSky, dieren: farmAnimals, grond: { top: B.GRASS, onder: B.DIRT }, hoogte: { basis: 13, heuvels: 4, schaal: 18 } },
  flat: { naam: 'Plat', icon: 'flat', lucht: oldSky, dieren: farmAnimals, grond: { top: B.GRASS, onder: B.DIRT }, hoogte: { basis: 11, heuvels: 0, schaal: 18 } },
  jungle: {
    naam: 'Jungle', icon: 'jungle', zee: true,
    lucht: sky('#3f9fdc', '#bfe8d0', '#a9d8c0', 30, 90, 38),
    grond: { top: B.GRASS, onder: B.DIRT, onderWater: B.SAND }, hoogte: { basis: 13, heuvels: 6, schaal: 22 },
    bomen: [{ soort: 'giantJungle', dichtheid: 0.006 }, { soort: 'jungle', dichtheid: 0.02 }],
    planten: [{ blok: B.JUNGLE_LEAVES, dichtheid: 0.03 }, { blok: B.FERN, dichtheid: 0.08 },
      { blok: B.JUNGLE_FLOWER, dichtheid: 0.02 }, { blok: B.BAMBOO, dichtheid: 0.004, hoog: [3, 6] }, { blok: B.MELON, dichtheid: 0.002 }],
    bouwwerken: ['temple'], dieren: [['tiger', 3]], weer: 'blaadjes', achtergrond: 'vogels', muziek: 'jungle',
  },
  desert: {
    naam: 'Woestijn', icon: 'desert', zee: true,
    lucht: sky('#5fb0e8', '#f3e2b0', '#f0dca8', 50, 130, 12, '#fff1a0'),
    grond: { top: B.SAND, onder: B.SAND, onderWater: B.SAND }, hoogte: { basis: 12, heuvels: 3, schaal: 30, schaalZ: 12 },
    bomen: [], planten: [{ blok: B.CACTUS, dichtheid: 0.01, hoog: [1, 3] }, { blok: B.DEAD_BUSH, dichtheid: 0.01 }],
    bouwwerken: ['pyramid', 'oasis'], dieren: [['meerkat', 3]], weer: null, achtergrond: 'wind', muziek: 'woestijn',
  },
  tundra: {
    naam: 'Toendra', icon: 'tundra', zee: true,
    lucht: sky('#7fb2dc', '#e6f2fb', '#dfeaf5', 40, 110, 42, '#f6fbff'),
    grond: { top: B.SNOW, onder: B.DIRT, onderWater: B.SAND }, hoogte: { basis: 12, heuvels: 4, schaal: 24 },
    bomen: [{ soort: 'spruce', dichtheid: 0.012 }], planten: [{ blok: B.SNOW, dichtheid: 0.004 }, { blok: B.PACKED_ICE, dichtheid: 0.001, hoog: [4, 8] }],
    bouwwerken: ['igloo'], weer: 'sneeuw', achtergrond: 'wind', muziek: 'toendra',
  },
  savanna: {
    naam: 'Savanne', icon: 'savanna', zee: true,
    lucht: sky('#58a6e0', '#f6d9a0', '#efd29a', 50, 130, 20, '#ffe296'),
    grond: { top: B.DRY_GRASS, onder: B.RED_DIRT, onderWater: B.SAND }, hoogte: { basis: 12, heuvels: 2, schaal: 30 },
    bomen: [{ soort: 'acacia', dichtheid: 0.006 }], planten: [{ blok: B.TALL_DRY_GRASS, dichtheid: 0.12 }, { blok: B.TERMITE, dichtheid: 0.002, hoog: [2, 4] }],
    bouwwerken: ['lionRock', 'wateringHole'],
    dieren: [['lion', 2], ['lioness', 1], ['cheetah', 2], ['elephant', 2], ['giraffe', 2], ['zebra', 4], ['hippo', 1], ['meerkat', 3]],
    weer: null, achtergrond: 'krekels', muziek: 'savanne',
  },
  adventure: { naam: 'Avontuur', icon: 'adventure', zee: true, lucht: oldSky },
};

const smooth = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };

// De weide in het midden blijft vrij om te bouwen en voor de boerderijdieren.
export function biomeWeights(type, x = 48, z = 48) {
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

// Alleen bij het kiezen van het bovenblok gebruiken we ruis: geen harde rechte grens.
export function chooseBiome(type, x, z, r) {
  const weights = biomeWeights(type, x, z);
  let pick = r();
  for (const b of weights) { pick -= b.weight; if (pick <= 0) return b.type; }
  return weights[weights.length - 1].type;
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
