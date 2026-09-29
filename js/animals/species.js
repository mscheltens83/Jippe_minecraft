// Eén recept per soort. Nieuwe soorten kunnen dezelfde beweging en vaardigheden gebruiken.
import { buildPig, buildChicken, buildSheep } from './farm.js';
import { buildCat } from './cats.js';
import { buildElephant, buildGiraffe, buildZebra, buildHippo, buildMeerkat } from './savanna.js';

const farm = { werelden: ['island', 'flat'], dieet: 'boerderij', slaapkans: 0, kunstjes: [] };
const cat = { werelden: ['savanna'], dieet: 'roofdier', slaapkans: 0.12, kunstjes: ['slapen'] };
export const SPECIES = {
  pig: { ...farm, naam: 'Varken', w: 0.7, h: 0.95, d: 1.8, speed: 1.1, bouw: buildPig, geluid: 'pig' },
  chicken: { ...farm, naam: 'Kip', w: 0.45, h: 0.98, d: 0.8, speed: 1.35, bouw: buildChicken, geluid: 'chicken' },
  sheep: { ...farm, naam: 'Schaap', w: 0.8, h: 1.25, d: 1.7, speed: 0.95, bouw: buildSheep, geluid: 'sheep' },
  lion: { ...cat, naam: 'Leeuw', w: 0.9, h: 1.35, d: 2.7, speed: 1.4, rensnelheid: 5, bouw: () => buildCat('lion'), geluid: 'roar', rijdbaar: true, slaapkans: 0.6 },
  lioness: { ...cat, naam: 'Leeuwin', w: 0.78, h: 1.35, d: 2.7, speed: 1.6, rensnelheid: 5, bouw: () => buildCat('lioness'), geluid: 'growl', rijdbaar: true, slaapkans: 0.35 },
  cheetah: { ...cat, naam: 'Cheetah', w: 0.62, h: 1.55, d: 2.7, speed: 1.7, rensnelheid: 9, bouw: () => buildCat('cheetah'), geluid: 'purr', kunstjes: ['rennen', 'slapen'] },
  tiger: { ...cat, naam: 'Tijger', werelden: ['jungle'], w: 0.95, h: 1.35, d: 2.7, speed: 1.25, rensnelheid: 5, bouw: () => buildCat('tiger'), geluid: 'tiger', kunstjes: ['zwemmen', 'water', 'slapen'], floatDepth: 0.45 },
  elephant: { naam: 'Olifant', werelden: ['savanna'], w: 2.05, h: 2.2, d: 3.6, speed: 0.8, bouw: buildElephant, geluid: 'trumpet', kunstjes: ['spuiten'], slaapkans: 0.04 },
  giraffe: { naam: 'Giraf', werelden: ['savanna'], w: 0.95, h: 3.6, d: 2.3, speed: 1.05, bouw: buildGiraffe, geluid: 'giraffe', kunstjes: ['bladeren'], slaapkans: 0.03 },
  zebra: { naam: 'Zebra', werelden: ['savanna'], w: 0.8, h: 2.15, d: 2.6, speed: 1.5, bouw: buildZebra, geluid: 'neigh', kunstjes: ['kudde'], slaapkans: 0.04 },
  hippo: { naam: 'Nijlpaard', werelden: ['savanna'], w: 1.4, h: 1.4, d: 3.1, speed: 0.7, bouw: buildHippo, geluid: 'hippo', kunstjes: ['zwemmen', 'water'], floatDepth: 0.6, slaapkans: 0.1 },
  meerkat: { naam: 'Stokstaartje', werelden: ['savanna', 'desert'], w: 0.42, h: 1.05, d: 0.9, speed: 1.4, bouw: buildMeerkat, geluid: 'chirp', kunstjes: ['opduiken'], slaapkans: 0.03 },
};

export const STATES = ['rust', 'lopen', 'grazen', 'slapen', 'sluipen', 'jagen', 'vluchten', 'eten', 'blij', 'volgen', 'bereden'];
export const MAX_ANIMALS = 60;
