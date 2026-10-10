// Eén recept per soort. Nieuwe soorten kunnen dezelfde beweging en vaardigheden gebruiken.
import { buildPig, buildChicken, buildSheep } from './farm.js';
import { buildCat } from './cats.js';
import { buildElephant, buildGiraffe, buildZebra, buildHippo, buildMeerkat } from './savanna.js';
import { buildExtra } from './extras.js';
import { buildMc, VARIANTS } from './minecraft.js';
import { ITEM } from '../blocks.js';

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
  monkey: { naam: 'Aap', werelden: ['jungle'], w: .53, h: 1.12, d: .68, speed: 1.5, bouw: () => buildExtra('monkey'), geluid: 'monkey', kunstjes: ['klimmen', 'springen'], slaapkans: .03 },
  parrot: { naam: 'Papegaai', werelden: ['jungle'], w: .45, h: .83, d: .52, speed: 2.1, bouw: () => buildExtra('parrot'), geluid: 'parrot', kunstjes: ['vliegen'], slaapkans: 0 },
  panda: { naam: 'Panda', werelden: ['jungle'], w: .95, h: 1.3, d: 1.15, speed: .75, bouw: () => buildExtra('panda'), geluid: 'panda', kunstjes: ['bamboe'], slaapkans: .12 },
  frog: { naam: 'Kikker', werelden: ['jungle'], w: .55, h: .55, d: .55, speed: 1.2, bouw: () => buildExtra('frog'), geluid: 'frog', kunstjes: ['zwemmen', 'water', 'springen'], floatDepth: .22, slaapkans: 0 },
  sloth: { naam: 'Luiaard', werelden: ['jungle'], w: .58, h: 1.05, d: .72, speed: .3, bouw: () => buildExtra('sloth'), geluid: 'sloth', kunstjes: ['klimmen'], slaapkans: .08 },
  camel: { naam: 'Kameel', werelden: ['desert'], w: .95, h: 1.9, d: 1.85, speed: .85, bouw: () => buildExtra('camel'), geluid: 'camel', kunstjes: ['kauwen'], slaapkans: .03 },
  fennec: { naam: 'Woestijnvos', werelden: ['desert'], w: .55, h: .84, d: .9, speed: 1.8, bouw: () => buildExtra('fennec'), geluid: 'fennec', kunstjes: ['schieten'], slaapkans: .03 },
  lizard: { naam: 'Hagedis', werelden: ['desert'], w: .38, h: .36, d: .72, speed: 2.4, bouw: () => buildExtra('lizard'), geluid: 'lizard', kunstjes: ['schieten'], slaapkans: 0 },
  turtle: { naam: 'Schildpad', werelden: ['desert'], w: .74, h: .68, d: .9, speed: .35, bouw: () => buildExtra('turtle'), geluid: 'turtle', kunstjes: ['verstoppen'], slaapkans: .03 },
  polarBear: { naam: 'IJsbeer', werelden: ['tundra'], w: 1.25, h: 1.38, d: 1.7, speed: 1.0, bouw: () => buildExtra('polarBear'), geluid: 'bear', kunstjes: ['zwemmen', 'water'], floatDepth: .52, slaapkans: .06 },
  penguin: { naam: 'Pinguïn', werelden: ['tundra'], w: .63, h: 1.08, d: .58, speed: .85, bouw: () => buildExtra('penguin'), geluid: 'penguin', kunstjes: ['glijden', 'kudde'], slaapkans: .02 },
  reindeer: { naam: 'Rendier', werelden: ['tundra'], w: .88, h: 1.65, d: 1.55, speed: 1.3, bouw: () => buildExtra('reindeer'), geluid: 'reindeer', kunstjes: ['kudde'], slaapkans: .04 },
  arcticFox: { naam: 'Poolvos', werelden: ['tundra'], w: .58, h: .78, d: .92, speed: 1.7, bouw: () => buildExtra('arcticFox'), geluid: 'fox', kunstjes: ['opduiken'], slaapkans: .03 },
  seal: { naam: 'Zeehond', werelden: ['tundra'], w: .92, h: .7, d: 1.4, speed: .65, bouw: () => buildExtra('seal'), geluid: 'seal', kunstjes: ['zwemmen', 'water'], floatDepth: .3, slaapkans: .08 },
  snowyOwl: { naam: 'Sneeuwuil', werelden: ['tundra'], w: .62, h: 1.0, d: .65, speed: 2.0, bouw: () => buildExtra('snowyOwl'), geluid: 'owl', kunstjes: ['vliegen'], slaapkans: .04 },
  // Fase 4G: de Minecraft-dieren. varianten = aantal kleuren; onderwater = zwemt onder water;
  // nachtdier = slaapt overdag; springkracht = hoe hoog hij springt
  cow: { naam: 'Koe', werelden: [], w: .9, h: 1.4, d: 1.6, speed: .9, bouw: () => buildMc('cow'), geluid: 'moo', kunstjes: [], slaapkans: .04, dieet: 'boerderij' },
  horse: { naam: 'Paard', werelden: [], w: .75, h: 1.9, d: 1.9, speed: 1.3, rensnelheid: 6, bouw: (v) => buildMc('horse', v), varianten: VARIANTS.horse.length, geluid: 'neigh', kunstjes: [], slaapkans: .03, rijdbaar: true, rijsnelheid: 1.5 },
  dog: { naam: 'Hond', werelden: [], w: .5, h: .85, d: 1.05, speed: 1.6, rensnelheid: 6, bouw: () => buildMc('dog'), geluid: 'bark', kunstjes: [], slaapkans: .05, volger: true },
  cat: { naam: 'Kat', werelden: [], w: .4, h: .62, d: .85, speed: 1.3, bouw: (v) => buildMc('cat', v), varianten: VARIANTS.cat.length, geluid: 'meow', kunstjes: [], slaapkans: .15, volger: true },
  rabbit: { naam: 'Konijn', werelden: [], w: .38, h: .55, d: .55, speed: 1.6, bouw: (v) => buildMc('rabbit', v), varianten: VARIANTS.rabbit.length, geluid: 'squeak', kunstjes: ['springen', 'opduiken'], slaapkans: .04, springkracht: 4.5 },
  fox: { naam: 'Vos', werelden: [], w: .5, h: .7, d: .95, speed: 1.6, bouw: () => buildMc('fox'), geluid: 'fox', kunstjes: ['springen'], slaapkans: .1, nachtdier: true },
  bee: { naam: 'Bij', werelden: [], w: .34, h: .38, d: .44, speed: 1.8, bouw: () => buildMc('bee'), geluid: 'buzz', kunstjes: ['bloemen'], slaapkans: 0 },
  goat: { naam: 'Geit', werelden: [], w: .62, h: 1.15, d: 1.0, speed: 1.2, bouw: () => buildMc('goat'), geluid: 'bleat', kunstjes: ['springen'], slaapkans: .04, springkracht: 9 },
  llama: { naam: 'Lama', werelden: [], w: .75, h: 1.95, d: 1.25, speed: 1.0, bouw: (v) => buildMc('llama', v), varianten: VARIANTS.llama.length, geluid: 'camel', kunstjes: ['kudde', 'kauwen'], slaapkans: .04 },
  fish: { naam: 'Vis', werelden: [], w: .18, h: .3, d: .55, speed: 1.4, bouw: (v) => buildMc('fish', v), varianten: VARIANTS.fish.length, geluid: 'bubble', kunstjes: ['zwemmen'], slaapkans: 0, onderwater: true },
  dolphin: { naam: 'Dolfijn', werelden: [], w: .48, h: .5, d: 1.6, speed: 2.4, bouw: () => buildMc('dolphin'), geluid: 'click', kunstjes: ['zwemmen', 'dolfijnsprong'], slaapkans: 0, onderwater: true },
  squid: { naam: 'Inktvis', werelden: [], w: .6, h: 1.1, d: .6, speed: .6, bouw: () => buildMc('squid'), geluid: 'bubble', kunstjes: ['zwemmen'], slaapkans: 0, onderwater: true },
};
// Fokken (fase 4G): wat een soort graag eet. Twee gevoerde dieren van dezelfde soort (of groep,
// zoals leeuw en leeuwin) krijgen een jong. Vleeseters zijn hier niet kieskeurig.
const SEEDS = ITEM.WHEAT_SEEDS, CARROT = ITEM.CARROT, POTATO = ITEM.POTATO, ALL = [SEEDS, CARROT, POTATO];
const FOOD = {
  pig: [CARROT, POTATO], chicken: [SEEDS], sheep: [SEEDS], cow: [SEEDS], goat: [SEEDS], llama: [SEEDS],
  horse: [CARROT, SEEDS], rabbit: [CARROT], lion: ALL, lioness: ALL, tiger: ALL, cheetah: ALL, dog: ALL, cat: ALL, fox: ALL,
};
for (const [type, eten] of Object.entries(FOOD)) SPECIES[type].eten = eten;
SPECIES.lion.fokgroep = SPECIES.lioness.fokgroep = 'leeuw';
// Rijden (fase 4G): meer dieren met een zadel, elk met een eigen snelheid
Object.assign(SPECIES.camel, { rijdbaar: true, rijsnelheid: 1.0 });
Object.assign(SPECIES.elephant, { rijdbaar: true, rijsnelheid: 0.7 });
Object.assign(SPECIES.cheetah, { rijdbaar: true, rijsnelheid: 1.9 });
Object.assign(SPECIES.tiger, { rijdbaar: true, rijsnelheid: 1.3 });

// Het dorp (fase 4G deel 2)
SPECIES.villager = { naam: 'Dorpeling', w: .6, h: 1.95, d: .5, speed: .8, bouw: (v) => buildMc('villager', v), varianten: VARIANTS.villager.length, geluid: 'hmm', kunstjes: ['dorp'], slaapkans: .02 };
SPECIES.golem = { naam: 'IJzergolem', w: 1.3, h: 2.7, d: .8, speed: .55, bouw: () => buildMc('golem'), geluid: 'golem', kunstjes: ['dorp'], slaapkans: 0 };

// Alle soorten hebben deze velden (ook als ze in het recept ontbreken)
for (const def of Object.values(SPECIES)) { def.kunstjes ||= []; def.werelden ||= []; def.rensnelheid ||= def.speed * 2; }

export const STATES = ['rust', 'lopen', 'grazen', 'slapen', 'sluipen', 'jagen', 'vluchten', 'eten', 'blij', 'volgen', 'bereden'];
export const MAX_ANIMALS = 60;
