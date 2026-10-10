// Alle bloktypes van JippeCraft, plus de "speciale" dingen uit de kist (stempels en dieren).
// `tex` verwijst naar texturen uit textures.js (top / zijkant / onderkant).
// render: 'solid' (dicht blok), 'cutout' (met gaatjes: glas, bladeren),
//         'glass' (gekleurd doorzichtig glas), 'water', 'cross' (plantje),
//         'shape' (bijzondere vorm uit kleine blokjes: trap, deur)

export const AIR = 0;
export const B = {
  GRASS: 1, DIRT: 2, STONE: 3, COBBLE: 4, LOG: 5, PLANKS: 6, LEAVES: 7, GLASS: 8,
  BRICK: 9, SAND: 10, WATER: 11, SNOW: 12, GOLD: 13, DIAMOND: 14, LAMP: 15,
  BOOKSHELF: 16, PUMPKIN: 17, MELON: 18, RAINBOW: 19,
  WOOL_RED: 20, WOOL_ORANGE: 21, WOOL_YELLOW: 22, WOOL_GREEN: 23, WOOL_LIGHTBLUE: 24,
  WOOL_BLUE: 25, WOOL_PURPLE: 26, WOOL_PINK: 27, WOOL_WHITE: 28, WOOL_BLACK: 29,
  FLOWER_RED: 30, FLOWER_YELLOW: 31, BEDROCK: 32, TALLGRASS: 33,
  BOUNCE: 34, FIREWORK: 35,
  GLASS_RED: 36, GLASS_YELLOW: 37, GLASS_GREEN: 38, GLASS_BLUE: 39, GLASS_PURPLE: 40,
  STAIRS: 41, // 41..44: trap in 4 richtingen
  DOOR: 45,   // 45..60: deur (richting x onder/boven x dicht/open)
  JUNGLE_LOG: 61, JUNGLE_LEAVES: 62, VINE: 63, BAMBOO: 64, FERN: 65, JUNGLE_FLOWER: 66,
  MOSSY_COBBLE: 67, SANDSTONE: 68, CARVED_SANDSTONE: 69, CACTUS: 70, DEAD_BUSH: 71,
  PALM_LOG: 72, PALM_LEAVES: 73, RED_SAND: 74, TERRACOTTA_ORANGE: 75, TERRACOTTA_BROWN: 76,
  TREASURE: 77, TREASURE_OPEN: 78, ICE: 79, PACKED_ICE: 80, SPRUCE_LOG: 81,
  SPRUCE_LEAVES: 82, SNOWY_LEAVES: 83, DRY_GRASS: 84, RED_DIRT: 85,
  ACACIA_LOG: 86, ACACIA_LEAVES: 87, TALL_DRY_GRASS: 88, TERMITE: 89, MUD: 90,
  FENCE: 91, GATE: 92, // hekdeur 92..99: vier richtingen, open/dicht
  HAY: 100,
  // Grote wereld: ertsen, steensoorten en natuur
  COAL_ORE: 101, IRON_ORE: 102, COPPER_ORE: 103, GOLD_ORE: 104, LAPIS_ORE: 105, REDSTONE_ORE: 106,
  DIAMOND_ORE: 107, EMERALD_ORE: 108, GRANITE: 109, DIORITE: 110, ANDESITE: 111, GRAVEL: 112, CLAY: 113,
  BIRCH_LOG: 114, BIRCH_LEAVES: 115, MUSHROOM_RED: 116, MUSHROOM_BROWN: 117, LILY_PAD: 118,
  CORNFLOWER: 119, TULIP: 120,
  // Licht en slapen
  TORCH: 121,        // 121: fakkel op de grond, 122..125: tegen een muur (muur aan kant 0..3)
  LANTERN: 126, LANTERN_HANGING: 127, GLOWSTONE: 128, JACK_O_LANTERN: 129, CAMPFIRE: 130,
  BED: 131,          // 131..150: bed in 10 kleuren, steeds voeteneind en hoofdeind
  // Blokken en bouwen (fase 4F). De nummers liggen vast: ze staan in bewaarde werelden.
  WOOL_MAGENTA: 151, WOOL_GRAY: 152, WOOL_LIGHTGRAY: 153, WOOL_CYAN: 154, WOOL_BROWN: 155, WOOL_DARKGREEN: 156,
  CARPET: 160,       // 160..175: tapijt in 16 kleuren (volgorde van COLORS)
  CONCRETE: 176,     // 176..191: beton
  TERRACOTTA: 192,   // 192..207: gekleurde terracotta
  GLASS2: 208,       // 208..218: de 11 glaskleuren die er nog niet waren
  PANE: 220,         // 220: glazen paneel, 221..236: gekleurde panelen
  POLISHED_GRANITE: 240, POLISHED_DIORITE: 241, POLISHED_ANDESITE: 242, STONE_BRICKS: 243, MOSSY_STONE_BRICKS: 244,
  CRACKED_STONE_BRICKS: 245, SMOOTH_STONE: 246, QUARTZ: 247, OBSIDIAN: 248, IRON_BLOCK: 249, COPPER_BLOCK: 250,
  EMERALD_BLOCK: 251, LAPIS_BLOCK: 252, SEA_LANTERN: 253,
  BIRCH_PLANKS: 260, SPRUCE_PLANKS: 261, JUNGLE_PLANKS: 262, ACACIA_PLANKS: 263,
  LOG_AXIS: 264,     // 264..273: liggende stammen, per houtsoort langs x en langs z
  STAIRS_UP: 280,    // 280..283: eikenhouten trap ondersteboven
  STAIRS2: 284,      // 284..363: trappen van de andere 10 materialen (8 standen elk)
  SLAB: 370,         // 370..391: platen (onder, boven) van 11 materialen
  FENCE2: 392,       // 392..395: hekken van berk, spar, jungle en acacia
  GATE2: 400,        // 400..431: hekdeuren van de andere houtsoorten
  DOOR2: 440,        // 440..503: deuren van de andere houtsoorten
  CRAFTING_TABLE: 510, FURNACE: 511, // 511..518: oven (richting x aan/uit)
  CHEST: 519,        // 519..526: kist (richting x dicht/open)
  LADDER: 527,       // 527..530: ladder tegen een muur
  FLOWER_POT: 531, JUKEBOX: 533, CAKE: 534, // 534..537: taart met 0..3 happen eruit
  SUNFLOWER: 540,    // 540 onder, 541 boven
  SUGAR_CANE: 542, SEAWEED: 543, CORAL_RED: 544, CORAL_YELLOW: 545, CORAL_BLUE: 546, FARMLAND: 547,
  WHEAT: 548, CARROTS: 552, POTATOES: 556, // elk 4 groeistappen
  WATER_FLOW: 560,   // 560..566: stromend water (1 = vlak bij de bron, 7 = het verst); 567: vallend water
};

// De 16 kleuren (zelfde volgorde als in Minecraft) met het id van de wol in die kleur
export const COLORS = [
  ['white', 'Wit', 28], ['orange', 'Oranje', 21], ['magenta', 'Magenta', 151], ['lightblue', 'Lichtblauw', 24],
  ['yellow', 'Geel', 22], ['lime', 'Groen', 23], ['pink', 'Roze', 27], ['gray', 'Grijs', 152],
  ['lightgray', 'Lichtgrijs', 153], ['cyan', 'Cyaan', 154], ['purple', 'Paars', 26], ['blue', 'Blauw', 25],
  ['brown', 'Bruin', 155], ['green', 'Donkergroen', 156], ['red', 'Rood', 20], ['black', 'Zwart', 29],
];
// Glas per kleur: de 5 oude glaskleuren hebben hun eigen id gehouden
const OLD_GLASS = { red: 36, yellow: 37, lime: 38, blue: 39, purple: 40 };
const NEW_GLASS = ['white', 'orange', 'magenta', 'lightblue', 'pink', 'gray', 'lightgray', 'cyan', 'brown', 'green', 'black'];
export function glassId(color) { return OLD_GLASS[color] ?? B.GLASS2 + NEW_GLASS.indexOf(color); }

// Houtsoorten: stam, planken en het tegelvoorvoegsel
export const WOODS = [
  { key: 'oak', name: 'Eiken', log: B.LOG, planks: B.PLANKS, tex: 'log', planksTex: 'planks' },
  { key: 'birch', name: 'Berken', log: B.BIRCH_LOG, planks: B.BIRCH_PLANKS, tex: 'birch_log', planksTex: 'birch_planks' },
  { key: 'spruce', name: 'Sparren', log: B.SPRUCE_LOG, planks: B.SPRUCE_PLANKS, tex: 'spruce_log', planksTex: 'spruce_planks' },
  { key: 'jungle', name: 'Jungle', log: B.JUNGLE_LOG, planks: B.JUNGLE_PLANKS, tex: 'jungle_log', planksTex: 'jungle_planks' },
  { key: 'acacia', name: 'Acacia', log: B.ACACIA_LOG, planks: B.ACACIA_PLANKS, tex: 'acacia_log', planksTex: 'acacia_planks' },
];
// Materialen voor trappen en platen (0..4 zijn de houtsoorten). block = het volle blok (twee platen op elkaar).
export const MATERIALS = [
  ...WOODS.map((w) => ({ name: w.name, block: w.planks, sound: 'wood' })),
  { name: 'Keien', block: B.COBBLE, sound: 'stone' }, { name: 'Stenen', block: B.STONE, sound: 'stone' },
  { name: 'Stenen bakstenen', block: B.STONE_BRICKS, sound: 'stone' }, { name: 'Bakstenen', block: B.BRICK, sound: 'stone' },
  { name: 'Zandstenen', block: B.SANDSTONE, sound: 'sand' }, { name: 'Kwarts', block: B.QUARTZ, sound: 'stone' },
];
export function stairsId(mat, dir, upside = false) {
  if (mat === 0) return upside ? B.STAIRS_UP + dir : B.STAIRS + dir;
  return B.STAIRS2 + (mat - 1) * 8 + dir + (upside ? 4 : 0);
}
export function slabId(mat, top = false) { return B.SLAB + mat * 2 + (top ? 1 : 0); }

// Kleuren van de bedden (dezelfde als de wol)
export const BED_COLORS = ['red', 'orange', 'yellow', 'green', 'lightblue', 'blue', 'purple', 'pink', 'white', 'black'];
const BED_NAMES = ['Rood', 'Oranje', 'Geel', 'Groen', 'Lichtblauw', 'Blauw', 'Paars', 'Roze', 'Wit', 'Zwart'];
export function bedId(color, head) { return B.BED + color * 2 + (head ? 1 : 0); }
export function torchId(wall = -1) { return wall < 0 ? B.TORCH : B.TORCH + 1 + wall; }

// Richtingen: 0 = -z (noord), 1 = +x (oost), 2 = +z (zuid), 3 = -x (west)
export const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

// Blokken hebben een id onder MAX_ID; stempels, dieren en gereedschap uit de kist vanaf ITEM_BASE
export const MAX_ID = 1024;
export const ITEM_BASE = 60000;
export const BLOCKS = [];
export const OPAQUE = new Uint8Array(MAX_ID);
export const EMIT = new Uint8Array(MAX_ID);   // hoeveel licht een blok zelf geeft (0..15)
const FULL_BOX = [[0, 0, 0, 1, 1, 1]];
const NO_BOXES = Object.freeze([]); // lucht en plantjes: steeds dezelfde lege lijst, geen nieuw werk voor de iPad

const EXTRA = ['axis', 'mat', 'upside', 'slabTop', 'wood', 'lit', 'bites', 'crop', 'stage', 'level', 'waterlogged', 'boxBuf'];
function def(id, name, tex, opts = {}) {
  const t = typeof tex === 'string' ? { top: tex, side: tex, bottom: tex } : tex;
  const render = opts.render || 'solid';
  BLOCKS[id] = {
    id,
    name,
    tex: t,
    render,
    solid: opts.solid ?? (render !== 'water' && render !== 'cross'),
    opaque: render === 'solid',
    replaceable: opts.replaceable ?? (render === 'cross' || render === 'water'),
    breakable: opts.breakable ?? true,
    glow: !!opts.glow,
    sound: opts.sound || 'stone',
    family: opts.family ?? id, // voor trap/deur: het blok dat in de kist staat
    boxes: opts.boxes || null, // kleine blokjes (0..1) voor bijzondere vormen
    shape: opts.shape || null,
    dir: opts.dir ?? 0,
    upper: !!opts.upper,
    open: !!opts.open,
    climb: !!opts.climb,
    foliage: !!opts.foliage,
    light: opts.light || 0,
    bed: opts.bed ?? null,     // { color, head }
    icon: opts.icon || null,   // plat plaatje in de kist in plaats van een blokje
  };
  // Extra eigenschappen van sommige blokken (fase 4F): stand, materiaal, groeistap, ...
  for (const k of EXTRA) if (k in opts) BLOCKS[id][k] = opts[k];
  OPAQUE[id] = render === 'solid' ? 1 : 0;
  EMIT[id] = opts.light || 0;
}

BLOCKS[AIR] = {
  id: 0, name: 'lucht', render: 'none', solid: false, opaque: false, replaceable: true,
  breakable: false, family: 0, boxes: null, shape: null,
};

def(B.GRASS, 'Gras', { top: 'grass_top', side: 'grass_side', bottom: 'dirt' }, { sound: 'grass' });
def(B.DIRT, 'Aarde', 'dirt', { sound: 'grass' });
def(B.STONE, 'Steen', 'stone');
def(B.COBBLE, 'Keien', 'cobble');
def(B.LOG, 'Boomstam', { top: 'log_top', side: 'log_side', bottom: 'log_top' }, { sound: 'wood' });
def(B.PLANKS, 'Planken', 'planks', { sound: 'wood' });
def(B.LEAVES, 'Bladeren', 'leaves', { render: 'cutout', sound: 'grass' });
def(B.GLASS, 'Glas', 'glass', { render: 'cutout', sound: 'glass' });
def(B.BRICK, 'Bakstenen', 'brick');
def(B.SAND, 'Zand', 'sand', { sound: 'sand' });
def(B.WATER, 'Water', 'water', { render: 'water', sound: 'water' });
def(B.SNOW, 'Sneeuw', 'snow', { sound: 'sand' });
def(B.GOLD, 'Goud', 'gold', { sound: 'metal' });
def(B.DIAMOND, 'Diamant', 'diamond', { sound: 'metal' });
def(B.LAMP, 'Lamp', 'lamp', { glow: true, light: 15, sound: 'glass' });
def(B.BOOKSHELF, 'Boekenkast', { top: 'planks', side: 'bookshelf', bottom: 'planks' }, { sound: 'wood' });
def(B.PUMPKIN, 'Pompoen', { top: 'pumpkin_top', side: 'pumpkin_face', bottom: 'pumpkin_top' }, { sound: 'wood' });
def(B.MELON, 'Meloen', { top: 'melon_top', side: 'melon_side', bottom: 'melon_top' }, { sound: 'wood' });
def(B.RAINBOW, 'Regenboog', { top: 'rainbow_top', side: 'rainbow', bottom: 'rainbow_top' }, { glow: true, light: 10, sound: 'glass' });
def(B.WOOL_RED, 'Rood', 'wool_red', { sound: 'wool' });
def(B.WOOL_ORANGE, 'Oranje', 'wool_orange', { sound: 'wool' });
def(B.WOOL_YELLOW, 'Geel', 'wool_yellow', { sound: 'wool' });
def(B.WOOL_GREEN, 'Groen', 'wool_green', { sound: 'wool' });
def(B.WOOL_LIGHTBLUE, 'Lichtblauw', 'wool_lightblue', { sound: 'wool' });
def(B.WOOL_BLUE, 'Blauw', 'wool_blue', { sound: 'wool' });
def(B.WOOL_PURPLE, 'Paars', 'wool_purple', { sound: 'wool' });
def(B.WOOL_PINK, 'Roze', 'wool_pink', { sound: 'wool' });
def(B.WOOL_WHITE, 'Wit', 'wool_white', { sound: 'wool' });
def(B.WOOL_BLACK, 'Zwart', 'wool_black', { sound: 'wool' });
def(B.FLOWER_RED, 'Rode bloem', 'flower_red', { render: 'cross', sound: 'grass' });
def(B.FLOWER_YELLOW, 'Gele bloem', 'flower_yellow', { render: 'cross', sound: 'grass' });
def(B.BEDROCK, 'Bodem', 'bedrock', { breakable: false });
def(B.TALLGRASS, 'Grasplukje', 'tallgrass', { render: 'cross', sound: 'grass' });
def(B.BOUNCE, 'Stuiterblok', 'bounce', { sound: 'wool' });
def(B.FIREWORK, 'Vuurwerk', { top: 'firework_top', side: 'firework_side', bottom: 'firework_top' }, { sound: 'wool' });
def(B.GLASS_RED, 'Rood glas', 'glass_red', { render: 'glass', sound: 'glass' });
def(B.GLASS_YELLOW, 'Geel glas', 'glass_yellow', { render: 'glass', sound: 'glass' });
def(B.GLASS_GREEN, 'Groen glas', 'glass_green', { render: 'glass', sound: 'glass' });
def(B.GLASS_BLUE, 'Blauw glas', 'glass_blue', { render: 'glass', sound: 'glass' });
def(B.GLASS_PURPLE, 'Paars glas', 'glass_purple', { render: 'glass', sound: 'glass' });

// Trap: onderste helft vol, bovenste helft aan de kant van `dir` (daar loop je naartoe omhoog)
const STAIR_TOP = [[0, 0.5, 0, 1, 1, 0.5], [0.5, 0.5, 0, 1, 1, 1], [0, 0.5, 0.5, 1, 1, 1], [0, 0.5, 0, 0.5, 1, 1]];
for (let d = 0; d < 4; d++) {
  def(B.STAIRS + d, 'Trap', 'planks', {
    render: 'shape', shape: 'stairs', dir: d, family: B.STAIRS, sound: 'wood',
    boxes: [[0, 0, 0, 1, 0.5, 1], STAIR_TOP[d]],
  });
}

// Deur: een dun plankje aan de rand van het vakje. Open = plankje draait naar de zijkant.
const T = 3 / 16;
const PANEL = [[0, 0, 0, 1, 1, T], [1 - T, 0, 0, 1, 1, 1], [0, 0, 1 - T, 1, 1, 1], [0, 0, 0, T, 1, 1]];
export function doorId(dir, upper, open, wood = 0) {
  return (wood ? B.DOOR2 + (wood - 1) * 16 : B.DOOR) + dir * 4 + (upper ? 2 : 0) + (open ? 1 : 0);
}
for (let d = 0; d < 4; d++) {
  for (const upper of [false, true]) {
    for (const open of [false, true]) {
      const tex = upper ? 'door_upper' : 'door_lower';
      def(doorId(d, upper, open), 'Deur', { top: 'planks', side: tex, bottom: 'planks' }, {
        render: 'shape', shape: 'door', dir: d, upper, open, family: B.DOOR, sound: 'wood',
        boxes: [PANEL[open ? (d + 3) % 4 : d]],
      });
    }
  }
}

// Natuur en bouwstenen van de nieuwe werelden. Een cactus doet geen pijn.
const logTex = (name) => ({ top: name + '_top', side: name + '_side', bottom: name + '_top' });
def(B.JUNGLE_LOG, 'Junglehout', logTex('jungle_log'), { sound: 'wood' });
def(B.JUNGLE_LEAVES, 'Junglebladeren', 'jungle_leaves', { render: 'cutout', foliage: true, sound: 'grass' });
def(B.VINE, 'Liaan', 'vine', { render: 'cross', climb: true, sound: 'grass' });
def(B.BAMBOO, 'Bamboe', { top: 'bamboo_top', side: 'bamboo', bottom: 'bamboo_top' }, {
  render: 'shape', boxes: [[5.5 / 16, 0, 5.5 / 16, 10.5 / 16, 1, 10.5 / 16]], sound: 'wood',
});
def(B.FERN, 'Varen', 'fern', { render: 'cross', sound: 'grass' });
def(B.JUNGLE_FLOWER, 'Oerwoudbloem', 'jungle_flower', { render: 'cross', sound: 'grass' });
def(B.MOSSY_COBBLE, 'Mossige keien', 'mossy_cobble');
def(B.SANDSTONE, 'Zandsteen', { top: 'sandstone_top', side: 'sandstone', bottom: 'sandstone_top' }, { sound: 'sand' });
def(B.CARVED_SANDSTONE, 'Bewerkt zandsteen', 'carved_sandstone', { sound: 'sand' });
def(B.CACTUS, 'Cactus', { top: 'cactus_top', side: 'cactus', bottom: 'cactus_top' }, {
  render: 'shape', boxes: [[1 / 16, 0, 1 / 16, 15 / 16, 1, 15 / 16]], sound: 'grass',
});
def(B.DEAD_BUSH, 'Dode struik', 'dead_bush', { render: 'cross', sound: 'wood' });
def(B.PALM_LOG, 'Palmhout', logTex('palm_log'), { sound: 'wood' });
def(B.PALM_LEAVES, 'Palmbladeren', 'palm_leaves', { render: 'cutout', foliage: true, sound: 'grass' });
def(B.RED_SAND, 'Rood zand', 'red_sand', { sound: 'sand' });
def(B.TERRACOTTA_ORANGE, 'Terracotta oranje', 'terracotta_orange');
def(B.TERRACOTTA_BROWN, 'Terracotta bruin', 'terracotta_brown');
const chestBase = [[1 / 16, 0, 1 / 16, 15 / 16, 10 / 16, 15 / 16]];
def(B.TREASURE, 'Schatkist', { top: 'treasure_top', side: 'treasure', bottom: 'planks' }, {
  render: 'shape', boxes: [...chestBase, [1 / 16, 10 / 16, 1 / 16, 15 / 16, 14 / 16, 15 / 16]], sound: 'wood',
});
def(B.TREASURE_OPEN, 'Schatkist (open)', { top: 'treasure_gold', side: 'treasure', bottom: 'planks' }, {
  render: 'shape', boxes: [...chestBase, [1 / 16, 10 / 16, 12 / 16, 15 / 16, 1, 15 / 16]], sound: 'wood',
});
def(B.ICE, 'IJs', 'ice', { render: 'glass', sound: 'glass' });
def(B.PACKED_ICE, 'Pakijs', 'packed_ice', { sound: 'glass' });
def(B.SPRUCE_LOG, 'Sparrenhout', logTex('spruce_log'), { sound: 'wood' });
def(B.SPRUCE_LEAVES, 'Sparrennaalden', 'spruce_leaves', { render: 'cutout', foliage: true, sound: 'grass' });
def(B.SNOWY_LEAVES, 'Besneeuwde naalden', { top: 'snow', side: 'snowy_leaves', bottom: 'spruce_leaves' }, {
  render: 'cutout', foliage: true, sound: 'grass',
});
def(B.DRY_GRASS, 'Droog gras', { top: 'dry_grass_top', side: 'dry_grass_side', bottom: 'red_dirt' }, { sound: 'grass' });
def(B.RED_DIRT, 'Rode aarde', 'red_dirt', { sound: 'grass' });
def(B.ACACIA_LOG, 'Acaciahout', logTex('acacia_log'), { sound: 'wood' });
def(B.ACACIA_LEAVES, 'Acaciabladeren', 'acacia_leaves', { render: 'cutout', foliage: true, sound: 'grass' });
def(B.TALL_DRY_GRASS, 'Hoog droog gras', 'tall_dry_grass', { render: 'cross', sound: 'grass' });
def(B.TERMITE, 'Termietenheuvel', 'termite', { sound: 'sand' });
def(B.MUD, 'Modder', 'mud', { sound: 'grass' });
const FENCE_POST = [6 / 16, 0, 6 / 16, 10 / 16, 1.5, 10 / 16];
const FENCE_ARMS = [
  [[7 / 16, 5 / 16, 0, 9 / 16, 7 / 16, 8 / 16], [7 / 16, 1, 0, 9 / 16, 1.2, 8 / 16]],
  [[8 / 16, 5 / 16, 7 / 16, 1, 7 / 16, 9 / 16], [8 / 16, 1, 7 / 16, 1, 1.2, 9 / 16]],
  [[7 / 16, 5 / 16, 8 / 16, 9 / 16, 7 / 16, 1], [7 / 16, 1, 8 / 16, 9 / 16, 1.2, 1]],
  [[0, 5 / 16, 7 / 16, 8 / 16, 7 / 16, 9 / 16], [0, 1, 7 / 16, 8 / 16, 1.2, 9 / 16]],
];
const FENCE_BARRIERS = [
  [7 / 16, 0, 0, 9 / 16, 1.5, 8 / 16], [8 / 16, 0, 7 / 16, 1, 1.5, 9 / 16],
  [7 / 16, 0, 8 / 16, 9 / 16, 1.5, 1], [0, 0, 7 / 16, 8 / 16, 1.5, 9 / 16],
];
def(B.FENCE, 'Hek', 'planks', { render: 'shape', shape: 'fence', boxes: [FENCE_POST], sound: 'wood' });
export function gateId(dir, open, wood = 0) { return (wood ? B.GATE2 + (wood - 1) * 8 : B.GATE) + dir * 2 + (open ? 1 : 0); }
for (let d = 0; d < 4; d++) for (const open of [false, true]) {
  // Open staat het hekblad langs de zijkant; de doorgang blijft breed genoeg.
  const alongX = d % 2 === 0;
  const panel = alongX ? [
    [0, 0, 7 / 16, 2 / 16, 1.5, 9 / 16], [14 / 16, 0, 7 / 16, 1, 1.5, 9 / 16],
    [2 / 16, 5 / 16, 7 / 16, 14 / 16, 7 / 16, 9 / 16],
    [2 / 16, 1, 7 / 16, 14 / 16, 1.2, 9 / 16],
  ] : [
    [7 / 16, 0, 0, 9 / 16, 1.5, 2 / 16], [7 / 16, 0, 14 / 16, 9 / 16, 1.5, 1],
    [7 / 16, 5 / 16, 2 / 16, 9 / 16, 7 / 16, 14 / 16],
    [7 / 16, 1, 2 / 16, 9 / 16, 1.2, 14 / 16],
  ];
  const folded = alongX ? (d === 0 ? [0, 0, 1 / 16, 1 / 16, 1.5, 15 / 16] : [15 / 16, 0, 1 / 16, 1, 1.5, 15 / 16])
    : (d === 1 ? [1 / 16, 0, 15 / 16, 15 / 16, 1.5, 1] : [1 / 16, 0, 0, 15 / 16, 1.5, 1 / 16]);
  WOODS.forEach((w, wood) => {
    def(gateId(d, open, wood), wood ? w.name + ' hekdeur' : 'Hekdeur', w.planksTex, {
      render: 'shape', shape: 'gate', dir: d, open, wood, family: gateId(0, false, wood), boxes: open ? [folded] : panel, sound: 'wood',
    });
  });
}
WOODS.forEach((w, wood) => { if (wood) def(B.FENCE2 + wood - 1, w.name + ' hek', w.planksTex, { render: 'shape', shape: 'fence', wood, boxes: [FENCE_POST], sound: 'wood' }); });
def(B.HAY, 'Hooibaal', { top: 'hay_top', side: 'hay_side', bottom: 'hay_top' }, { sound: 'grass' });

// Grote wereld: ertsen en steensoorten onder de grond, berkenbos, moeras en bloemenvelden
def(B.COAL_ORE, 'Kolen', 'coal_ore');
def(B.IRON_ORE, 'IJzererts', 'iron_ore');
def(B.COPPER_ORE, 'Kopererts', 'copper_ore');
def(B.GOLD_ORE, 'Gouderts', 'gold_ore');
def(B.LAPIS_ORE, 'Lapis', 'lapis_ore');
def(B.REDSTONE_ORE, 'Redstone', 'redstone_ore');
def(B.DIAMOND_ORE, 'Diamanterts', 'diamond_ore');
def(B.EMERALD_ORE, 'Smaragd', 'emerald_ore');
def(B.GRANITE, 'Graniet', 'granite');
def(B.DIORITE, 'Dioriet', 'diorite');
def(B.ANDESITE, 'Andesiet', 'andesite');
def(B.GRAVEL, 'Grind', 'gravel', { sound: 'sand' });
def(B.CLAY, 'Klei', 'clay', { sound: 'sand' });
def(B.BIRCH_LOG, 'Berkenhout', logTex('birch_log'), { sound: 'wood' });
def(B.BIRCH_LEAVES, 'Berkenbladeren', 'birch_leaves', { render: 'cutout', foliage: true, sound: 'grass' });
def(B.MUSHROOM_RED, 'Rode paddenstoel', 'mushroom_red', { render: 'cross', sound: 'grass' });
def(B.MUSHROOM_BROWN, 'Bruine paddenstoel', 'mushroom_brown', { render: 'cross', sound: 'grass' });
def(B.LILY_PAD, 'Waterlelie', 'lily_pad', {
  render: 'shape', boxes: [[1 / 16, 0, 1 / 16, 15 / 16, 1 / 16, 15 / 16]], sound: 'grass',
});
def(B.CORNFLOWER, 'Korenbloem', 'cornflower', { render: 'cross', sound: 'grass' });
def(B.TULIP, 'Tulp', 'tulip', { render: 'cross', sound: 'grass' });

// Licht en slapen. Fakkels en lantaarns zijn klein: je loopt er doorheen.
const TORCH_WALL = [
  [7 / 16, 3 / 16, 0, 9 / 16, 13 / 16, 2 / 16], [14 / 16, 3 / 16, 7 / 16, 1, 13 / 16, 9 / 16],
  [7 / 16, 3 / 16, 14 / 16, 9 / 16, 13 / 16, 1], [0, 3 / 16, 7 / 16, 2 / 16, 13 / 16, 9 / 16],
];
def(B.TORCH, 'Fakkel', { top: 'torch_top', side: 'torch_side', bottom: 'torch_top' }, {
  render: 'shape', solid: false, replaceable: false, light: 14, sound: 'wood', icon: 'torch_side',
  boxes: [[7 / 16, 0, 7 / 16, 9 / 16, 10 / 16, 9 / 16]],
});
for (let d = 0; d < 4; d++) {
  def(B.TORCH + 1 + d, 'Fakkel', { top: 'torch_top', side: 'torch_wall', bottom: 'torch_top' }, {
    render: 'shape', solid: false, replaceable: false, light: 14, sound: 'wood', family: B.TORCH, dir: d,
    boxes: [TORCH_WALL[d]],
  });
}
def(B.LANTERN, 'Lantaarn', { top: 'lantern_top', side: 'lantern_side', bottom: 'lantern_top' }, {
  render: 'shape', solid: false, replaceable: false, light: 15, sound: 'metal', icon: 'lantern_side',
  boxes: [[5 / 16, 0, 5 / 16, 11 / 16, 7 / 16, 11 / 16], [6 / 16, 7 / 16, 6 / 16, 10 / 16, 9 / 16, 10 / 16]],
});
def(B.LANTERN_HANGING, 'Lantaarn', { top: 'lantern_top', side: 'lantern_side', bottom: 'lantern_top' }, {
  render: 'shape', solid: false, replaceable: false, light: 15, sound: 'metal', family: B.LANTERN,
  boxes: [[5 / 16, 1 / 16, 5 / 16, 11 / 16, 8 / 16, 11 / 16], [6 / 16, 8 / 16, 6 / 16, 10 / 16, 10 / 16, 10 / 16],
    [7.5 / 16, 10 / 16, 7.5 / 16, 8.5 / 16, 1, 8.5 / 16]],
});
def(B.GLOWSTONE, 'Gloeisteen', 'glowstone', { glow: true, light: 15, sound: 'glass' });
def(B.JACK_O_LANTERN, 'Pompoenlantaarn', { top: 'pumpkin_top', side: 'jack_o_lantern', bottom: 'pumpkin_top' }, {
  glow: true, light: 15, sound: 'wood',
});
def(B.CAMPFIRE, 'Kampvuur', 'campfire', { render: 'cross', light: 15, replaceable: false, sound: 'wood' });
BED_COLORS.forEach((color, c) => {
  for (const head of [false, true]) {
    def(bedId(c, head), BED_NAMES[c] + ' bed', { top: head ? 'bed_pillow' : 'wool_' + color, side: 'bed_' + color, bottom: 'planks' }, {
      render: 'shape', boxes: [[0, 0, 0, 1, 9 / 16, 1]], family: bedId(c, false), bed: { color: c, head }, sound: 'wool',
    });
  }
});

// ---------- Blokken en bouwen (fase 4F) ----------

// Steen en mooie blokken
def(B.POLISHED_GRANITE, 'Gepolijst graniet', 'polished_granite');
def(B.POLISHED_DIORITE, 'Gepolijst dioriet', 'polished_diorite');
def(B.POLISHED_ANDESITE, 'Gepolijst andesiet', 'polished_andesite');
def(B.STONE_BRICKS, 'Stenen bakstenen', 'stone_bricks');
def(B.MOSSY_STONE_BRICKS, 'Mossige stenen bakstenen', 'mossy_stone_bricks');
def(B.CRACKED_STONE_BRICKS, 'Gebarsten stenen bakstenen', 'cracked_stone_bricks');
def(B.SMOOTH_STONE, 'Gladde steen', 'smooth_stone');
def(B.QUARTZ, 'Kwarts', 'quartz');
def(B.OBSIDIAN, 'Obsidiaan', 'obsidian');
def(B.IRON_BLOCK, 'IJzerblok', 'iron_block', { sound: 'metal' });
def(B.COPPER_BLOCK, 'Koperblok', 'copper_block', { sound: 'metal' });
def(B.EMERALD_BLOCK, 'Smaragdblok', 'emerald_block', { sound: 'metal' });
def(B.LAPIS_BLOCK, 'Lapisblok', 'lapis_block', { sound: 'metal' });
def(B.SEA_LANTERN, 'Zeelantaarn', 'sea_lantern', { glow: true, light: 15, sound: 'glass' });

// Hout: planken van de andere soorten en liggende stammen
WOODS.forEach((w, i) => {
  if (i) def(w.planks, w.name + ' planken', w.planksTex, { sound: 'wood' });
  const side = w.tex + '_side', top = w.tex + '_top', rot = side + '_r';
  // langs x: de jaarringen aan de kanten +x en -x, de schors liggend
  def(B.LOG_AXIS + i * 2, BLOCKS[w.log].name, { top: rot, bottom: rot, side: rot, px: top, nx: top }, { sound: 'wood', family: w.log, axis: 'x' });
  // langs z: jaarringen aan de kanten +z en -z
  def(B.LOG_AXIS + i * 2 + 1, BLOCKS[w.log].name, { top: side, bottom: side, side: rot, pz: top, nz: top }, { sound: 'wood', family: w.log, axis: 'z' });
});

// Trappen (ook ondersteboven) en platen van 11 materialen
const STAIR_LOW = STAIR_TOP.map((b) => [b[0], 0, b[2], b[3], 0.5, b[5]]);
const texOf = (id) => BLOCKS[id].tex;
MATERIALS.forEach((m, mat) => {
  for (let d = 0; d < 4; d++) for (const upside of [false, true]) {
    const id = stairsId(mat, d, upside);
    if (BLOCKS[id]) continue; // de gewone eikenhouten trap bestond al
    def(id, mat ? m.name + ' trap' : 'Trap', texOf(m.block), {
      render: 'shape', shape: 'stairs', dir: d, upside, mat, family: stairsId(mat, 0), sound: m.sound,
      boxes: upside ? [[0, 0.5, 0, 1, 1, 1], STAIR_LOW[d]] : [[0, 0, 0, 1, 0.5, 1], STAIR_TOP[d]],
    });
  }
  def(slabId(mat), m.name + ' plaat', texOf(m.block), { render: 'shape', shape: 'slab', mat, slabTop: false, family: slabId(mat), sound: m.sound, boxes: [[0, 0, 0, 1, 0.5, 1]] });
  def(slabId(mat, true), m.name + ' plaat', texOf(m.block), { render: 'shape', shape: 'slab', mat, slabTop: true, family: slabId(mat), sound: m.sound, boxes: [[0, 0.5, 0, 1, 1, 1]] });
});
for (let d = 0; d < 4; d++) BLOCKS[B.STAIRS + d].mat = 0;

// Deuren van de andere houtsoorten
WOODS.forEach((w, wood) => {
  if (!wood) return;
  for (let d = 0; d < 4; d++) for (const upper of [false, true]) for (const open of [false, true]) {
    def(doorId(d, upper, open, wood), w.name + ' deur', { top: w.planksTex, side: (upper ? 'door_upper_' : 'door_lower_') + w.key, bottom: w.planksTex }, {
      render: 'shape', shape: 'door', dir: d, upper, open, wood, family: doorId(0, false, false, wood), sound: 'wood',
      boxes: [PANEL[open ? (d + 3) % 4 : d]],
    });
  }
});
for (let k = 0; k < 16; k++) BLOCKS[B.DOOR + k].wood = 0;

// Een glazen paneel groeit vast aan buren (panelen, glas en volle blokken), net als een hek
const PANE_POST = [7 / 16, 0, 7 / 16, 9 / 16, 1, 9 / 16];
const PANE_ARMS = [[7 / 16, 0, 0, 9 / 16, 1, 7 / 16], [9 / 16, 0, 7 / 16, 1, 1, 9 / 16], [7 / 16, 0, 9 / 16, 9 / 16, 1, 1], [0, 0, 7 / 16, 7 / 16, 1, 9 / 16]];
function paneBoxes(world, x, y, z) {
  const boxes = [PANE_POST];
  for (let d = 0; d < 4; d++) {
    const [dx, dz] = DIRS[d], n = BLOCKS[world.get(x + dx, y, z + dz)];
    if (n && (n.shape === 'pane' || n.render === 'glass' || n.id === B.GLASS || (n.solid && !n.boxes))) boxes.push(PANE_ARMS[d]);
  }
  return boxes;
}

// 16 kleuren: wol, tapijt, beton, terracotta, glas en glazen panelen
const COLOR_TEX = (name) => (name === 'lime' ? 'green' : name === 'green' ? 'darkgreen' : name);
const NEW_WOOL_IDS = { magenta: B.WOOL_MAGENTA, gray: B.WOOL_GRAY, lightgray: B.WOOL_LIGHTGRAY, cyan: B.WOOL_CYAN, brown: B.WOOL_BROWN, green: B.WOOL_DARKGREEN };
COLORS.forEach(([color, name, woolId], i) => {
  if (NEW_WOOL_IDS[color]) def(woolId, name, 'wool_' + COLOR_TEX(color), { sound: 'wool' });
  def(B.CARPET + i, name + ' tapijt', 'wool_' + COLOR_TEX(color), { render: 'shape', boxes: [[0, 0, 0, 1, 1 / 16, 1]], sound: 'wool' });
  def(B.CONCRETE + i, name + ' beton', 'concrete_' + color);
  def(B.TERRACOTTA + i, name + ' terracotta', 'terracotta_' + color);
  if (NEW_GLASS.includes(color)) def(glassId(color), name + ' glas', 'glass_' + color, { render: 'glass', sound: 'glass' });
  const g = glassId(color);
  def(B.PANE + 1 + i, name + ' glazen paneel', BLOCKS[g].tex, { render: 'shape', shape: 'pane', boxBuf: 'glass', boxes: [PANE_POST], sound: 'glass' });
});
def(B.PANE, 'Glazen paneel', 'glass', { render: 'shape', shape: 'pane', boxBuf: 'cutout', boxes: [PANE_POST], sound: 'glass' });

// In huis
def(B.CRAFTING_TABLE, 'Werkbank', { top: 'crafting_table_top', side: 'crafting_table_side', bottom: 'planks' }, { sound: 'wood' });
const CHEST_LID = [[1 / 16, 10 / 16, 13 / 16, 15 / 16, 1, 15 / 16], [1 / 16, 10 / 16, 1 / 16, 3 / 16, 1, 15 / 16],
  [1 / 16, 10 / 16, 1 / 16, 15 / 16, 1, 3 / 16], [13 / 16, 10 / 16, 1 / 16, 15 / 16, 1, 15 / 16]];
const front = (d, tex, rest) => ({ ...rest, [['nz', 'px', 'pz', 'nx'][d]]: tex });
for (let d = 0; d < 4; d++) for (const lit of [false, true]) {
  def(B.FURNACE + d * 2 + (lit ? 1 : 0), 'Oven', front(d, lit ? 'furnace_front_lit' : 'furnace_front', { top: 'furnace_top', side: 'furnace_side', bottom: 'furnace_top' }), {
    dir: d, lit, family: B.FURNACE, light: lit ? 13 : 0, sound: 'stone',
  });
  def(B.CHEST + d * 2 + (lit ? 1 : 0), 'Kist', front(d, 'chest_front', { top: 'chest_top', side: 'chest_side', bottom: 'chest_top' }), {
    render: 'shape', dir: d, open: lit, family: B.CHEST, sound: 'wood',
    // open: het deksel staat rechtop aan de achterkant
    boxes: lit ? [[1 / 16, 0, 1 / 16, 15 / 16, 10 / 16, 15 / 16], CHEST_LID[d]] : [[1 / 16, 0, 1 / 16, 15 / 16, 14 / 16, 15 / 16]],
  });
  def(B.LADDER + d, 'Ladder', 'ladder', {
    render: 'shape', solid: false, replaceable: false, climb: true, dir: d, family: B.LADDER, boxBuf: 'cutout', sound: 'wood', icon: 'ladder',
    boxes: [[[0, 0, 0, 1, 1, 1 / 16], [15 / 16, 0, 0, 1, 1, 1], [0, 0, 15 / 16, 1, 1, 1], [0, 0, 0, 1 / 16, 1, 1]][d]],
  });
}
def(B.FLOWER_POT, 'Bloempot', 'flower_pot', { render: 'shape', boxes: [[5 / 16, 0, 5 / 16, 11 / 16, 6 / 16, 11 / 16]], sound: 'stone' });
def(B.JUKEBOX, 'Jukebox', { top: 'jukebox_top', side: 'jukebox_side', bottom: 'jukebox_side' }, { sound: 'wood' });
for (let bites = 0; bites < 4; bites++) {
  def(B.CAKE + bites, 'Taart', { top: 'cake_top', side: 'cake_side', bottom: 'cake_side', nx: bites ? 'cake_inner' : 'cake_side' }, {
    render: 'shape', bites, family: B.CAKE, sound: 'wool', boxes: [[(1 + bites * 3.5) / 16, 0, 1 / 16, 15 / 16, 0.5, 15 / 16]],
  });
}

// Planten
def(B.SUNFLOWER, 'Zonnebloem', 'sunflower_bottom', { render: 'cross', sound: 'grass', family: B.SUNFLOWER, icon: 'sunflower_top' });
def(B.SUNFLOWER + 1, 'Zonnebloem', 'sunflower_top', { render: 'cross', sound: 'grass', family: B.SUNFLOWER, upper: true });
def(B.SUGAR_CANE, 'Suikerriet', 'sugar_cane', { render: 'cross', sound: 'grass' });
def(B.SEAWEED, 'Zeewier', 'seaweed', { render: 'cross', waterlogged: true, sound: 'grass' });
def(B.CORAL_RED, 'Rood koraal', 'coral_red', { render: 'cross', waterlogged: true, sound: 'grass' });
def(B.CORAL_YELLOW, 'Geel koraal', 'coral_yellow', { render: 'cross', waterlogged: true, sound: 'grass' });
def(B.CORAL_BLUE, 'Blauw koraal', 'coral_blue', { render: 'cross', waterlogged: true, sound: 'grass' });
def(B.FARMLAND, 'Akker', { top: 'farmland', side: 'dirt', bottom: 'dirt' }, { render: 'shape', boxes: [[0, 0, 0, 1, 15 / 16, 1]], sound: 'grass' });
for (let st = 0; st < 4; st++) {
  def(B.WHEAT + st, 'Tarwe', 'wheat_' + st, { render: 'cross', crop: 'wheat', stage: st, family: B.WHEAT, sound: 'grass' });
  def(B.CARROTS + st, 'Wortels', 'carrots_' + st, { render: 'cross', crop: 'carrots', stage: st, family: B.CARROTS, sound: 'grass' });
  def(B.POTATOES + st, 'Aardappels', 'potatoes_' + st, { render: 'cross', crop: 'potatoes', stage: st, family: B.POTATOES, sound: 'grass' });
}

// Stromend water: level 1 (vlak bij de bron) tot 7, en 8 = vallend water
for (let level = 1; level <= 8; level++) {
  def(B.WATER_FLOW + level - 1, 'Water', 'water', { render: 'water', sound: 'water', family: B.WATER, level });
}
BLOCKS[B.WATER].level = 0;

// Vakjes met water erin: bron, stromend water en planten die onder water staan
export const WATERY = new Uint8Array(MAX_ID);
for (const b of BLOCKS) if (b && (b.render === 'water' || b.waterlogged)) WATERY[b.id] = 1;

// Dezelfde vormen dienen voor tekenen én botsen. Een hek groeit vast aan buren.
export function blockBoxes(world, x, y, z, collision = false) {
  const id = world.get(x, y, z), b = BLOCKS[id];
  // Fakkels en lantaarns teken je wel, maar je botst er niet tegenaan
  if (!b?.solid) return collision || !b?.boxes ? NO_BOXES : b.boxes;
  if (b.shape === 'pane') return paneBoxes(world, x, y, z);
  if (b.shape === 'fence') {
    const boxes = [FENCE_POST];
    for (let d = 0; d < 4; d++) {
      const [dx, dz] = DIRS[d], neighbour = BLOCKS[world.get(x + dx, y, z + dz)];
      if (neighbour?.solid && (!neighbour.boxes || neighbour.shape === 'fence' || neighbour.shape === 'gate')) {
        boxes.push(...FENCE_ARMS[d]);
        if (collision) boxes.push(FENCE_BARRIERS[d]);
      }
    }
    return boxes;
  }
  if (b.shape === 'gate' && collision && !b.open) {
    const barrier = b.dir % 2 === 0 ? [0, 0, 7 / 16, 1, 1.5, 9 / 16]
      : [7 / 16, 0, 0, 9 / 16, 1.5, 1];
    return [...b.boxes, barrier];
  }
  return b.boxes || FULL_BOX;
}

// ---------- speciale dingen uit de kist (geen blokken) ----------

export const ITEM = {
  HOUSE: 60000, TREE: 60001, TOWER: 60002, BRIDGE: 60003, IGLOO: 60004, PYRAMID: 60005, TEMPLE: 60006, LION_ROCK: 60007,
  PIG: 60010, CHICKEN: 60011, SHEEP: 60012,
  LION: 60013, LIONESS: 60014, CHEETAH: 60015, TIGER: 60016, ELEPHANT: 60017,
  GIRAFFE: 60018, ZEBRA: 60019, HIPPO: 60020, MEERKAT: 60021,
  MONKEY: 60022, PARROT: 60023, PANDA: 60024, FROG: 60025, SLOTH: 60026,
  CAMEL: 60027, FENNEC: 60028, LIZARD: 60029, TURTLE: 60030,
  POLAR_BEAR: 60031, PENGUIN: 60032, REINDEER: 60033, ARCTIC_FOX: 60034, SEAL: 60035, SNOWY_OWL: 60036,
  // Gereedschap en zaden (fase 4F)
  BUCKET: 60100, WHEAT_SEEDS: 60101, CARROT: 60102, POTATO: 60103,
};
export const SPECIALS = {
  [ITEM.HOUSE]: { name: 'Huisje', kind: 'stamp', stamp: 'house' },
  [ITEM.BUCKET]: { name: 'Emmer water', kind: 'bucket' },
  [ITEM.WHEAT_SEEDS]: { name: 'Tarwezaadjes', kind: 'seed', crop: B.WHEAT },
  [ITEM.CARROT]: { name: 'Wortel', kind: 'seed', crop: B.CARROTS },
  [ITEM.POTATO]: { name: 'Aardappel', kind: 'seed', crop: B.POTATOES },
  [ITEM.TREE]: { name: 'Boom', kind: 'stamp', stamp: 'tree' },
  [ITEM.TOWER]: { name: 'Toren', kind: 'stamp', stamp: 'tower' },
  [ITEM.BRIDGE]: { name: 'Brug', kind: 'stamp', stamp: 'bridge' },
  [ITEM.IGLOO]: { name: 'Iglo', kind: 'stamp', stamp: 'igloo' },
  [ITEM.PYRAMID]: { name: 'Piramide', kind: 'stamp', stamp: 'pyramid' },
  [ITEM.TEMPLE]: { name: 'Tempel', kind: 'stamp', stamp: 'temple' },
  [ITEM.LION_ROCK]: { name: 'Leeuwenrots', kind: 'stamp', stamp: 'lionRock' },
  [ITEM.PIG]: { name: 'Varken', kind: 'animal', animal: 'pig' },
  [ITEM.CHICKEN]: { name: 'Kip', kind: 'animal', animal: 'chicken' },
  [ITEM.SHEEP]: { name: 'Schaap', kind: 'animal', animal: 'sheep' },
  [ITEM.LION]: { name: 'Leeuw', kind: 'animal', animal: 'lion' },
  [ITEM.LIONESS]: { name: 'Leeuwin', kind: 'animal', animal: 'lioness' },
  [ITEM.CHEETAH]: { name: 'Cheetah', kind: 'animal', animal: 'cheetah' },
  [ITEM.TIGER]: { name: 'Tijger', kind: 'animal', animal: 'tiger' },
  [ITEM.ELEPHANT]: { name: 'Olifant', kind: 'animal', animal: 'elephant' },
  [ITEM.GIRAFFE]: { name: 'Giraf', kind: 'animal', animal: 'giraffe' },
  [ITEM.ZEBRA]: { name: 'Zebra', kind: 'animal', animal: 'zebra' },
  [ITEM.HIPPO]: { name: 'Nijlpaard', kind: 'animal', animal: 'hippo' },
  [ITEM.MEERKAT]: { name: 'Stokstaartje', kind: 'animal', animal: 'meerkat' },
  [ITEM.MONKEY]: { name: 'Aap', kind: 'animal', animal: 'monkey' },
  [ITEM.PARROT]: { name: 'Papegaai', kind: 'animal', animal: 'parrot' },
  [ITEM.PANDA]: { name: 'Panda', kind: 'animal', animal: 'panda' },
  [ITEM.FROG]: { name: 'Kikker', kind: 'animal', animal: 'frog' },
  [ITEM.SLOTH]: { name: 'Luiaard', kind: 'animal', animal: 'sloth' },
  [ITEM.CAMEL]: { name: 'Kameel', kind: 'animal', animal: 'camel' },
  [ITEM.FENNEC]: { name: 'Woestijnvos', kind: 'animal', animal: 'fennec' },
  [ITEM.LIZARD]: { name: 'Hagedis', kind: 'animal', animal: 'lizard' },
  [ITEM.TURTLE]: { name: 'Schildpad', kind: 'animal', animal: 'turtle' },
  [ITEM.POLAR_BEAR]: { name: 'IJsbeer', kind: 'animal', animal: 'polarBear' },
  [ITEM.PENGUIN]: { name: 'Pinguïn', kind: 'animal', animal: 'penguin' },
  [ITEM.REINDEER]: { name: 'Rendier', kind: 'animal', animal: 'reindeer' },
  [ITEM.ARCTIC_FOX]: { name: 'Poolvos', kind: 'animal', animal: 'arcticFox' },
  [ITEM.SEAL]: { name: 'Zeehond', kind: 'animal', animal: 'seal' },
  [ITEM.SNOWY_OWL]: { name: 'Sneeuwuil', kind: 'animal', animal: 'snowyOwl' },
};

export function itemName(id) { return SPECIALS[id]?.name ?? BLOCKS[id]?.name ?? ''; }
export function isSpecial(id) { return id >= ITEM_BASE; }

// Tot versie 4.5 hadden stempels en dieren id 200 en hoger. Oude onderbalken zetten we om.
export function upgradeItemId(id) { return id >= 200 && id < 300 ? id - 200 + ITEM_BASE : id; }

// Volgorde in de kist, per groep
// Volgorde in de kist: tabbladen met secties (een sectie heeft een kopje met een plaatje)
const group = (title, sections) => ({ title, sections, items: sections.flatMap((x) => x.items) });
const range = (from, n) => Array.from({ length: n }, (_, i) => from + i);
// Families: in de kist één vakje (de eerste soort); ingedrukt houden toont alle soorten
export const FAMILIES = new Map([
  [B.LOG, WOODS.map((w) => w.log)],
  [B.PLANKS, WOODS.map((w) => w.planks)],
  [B.STAIRS, MATERIALS.map((_, m) => stairsId(m, 0))],
  [slabId(0), MATERIALS.map((_, m) => slabId(m))],
  [B.FENCE, [B.FENCE, ...range(B.FENCE2, 4)]],
  [B.GATE, WOODS.map((_, w) => gateId(0, false, w))],
  [B.DOOR, WOODS.map((_, w) => doorId(0, false, false, w))],
  [bedId(0, false), BED_COLORS.map((_, c) => bedId(c, false))],
]);
export const PALETTE_GROUPS = [
  group('Bouwen', [
    { title: 'Aarde en steen', icon: 'build', items: [
      B.GRASS, B.DIRT, B.SAND, B.RED_SAND, B.GRAVEL, B.CLAY, B.RED_DIRT, B.SNOW, B.STONE, B.COBBLE, B.MOSSY_COBBLE, B.SMOOTH_STONE,
      B.STONE_BRICKS, B.MOSSY_STONE_BRICKS, B.CRACKED_STONE_BRICKS, B.BRICK, B.SANDSTONE, B.CARVED_SANDSTONE,
      B.GRANITE, B.POLISHED_GRANITE, B.DIORITE, B.POLISHED_DIORITE, B.ANDESITE, B.POLISHED_ANDESITE, B.QUARTZ, B.OBSIDIAN,
      B.TERRACOTTA_ORANGE, B.TERRACOTTA_BROWN] },
    { title: 'Hout', icon: 'tree', items: [B.LOG, B.PLANKS, B.STAIRS, slabId(0), B.FENCE, B.GATE, B.DOOR, B.LEAVES, B.BOOKSHELF] },
    { title: 'Steen: trappen en platen', icon: 'jump', items: [...MATERIALS.map((_, m) => stairsId(m, 0)).slice(5), ...MATERIALS.map((_, m) => slabId(m)).slice(5)] },
    { title: 'Glas en water', icon: 'worlds', items: [B.GLASS, B.PANE, B.WATER, B.ICE, B.PACKED_ICE] },
    { title: 'Bijzonder', icon: 'chest', items: [
      B.GOLD, B.DIAMOND, B.IRON_BLOCK, B.COPPER_BLOCK, B.EMERALD_BLOCK, B.LAPIS_BLOCK, B.RAINBOW, B.BOUNCE, B.FIREWORK,
      B.HAY, B.PUMPKIN, B.MELON, B.TREASURE] },
  ]),
  group('Kleuren', [
    { title: 'Wol', icon: 'build', items: COLORS.map((c) => c[2]) },
    { title: 'Tapijt', icon: 'build', items: range(B.CARPET, 16) },
    { title: 'Beton', icon: 'build', items: range(B.CONCRETE, 16) },
    { title: 'Terracotta', icon: 'build', items: range(B.TERRACOTTA, 16) },
    { title: 'Glas', icon: 'worlds', items: COLORS.map((c) => glassId(c[0])) },
    { title: 'Glazen panelen', icon: 'worlds', items: range(B.PANE + 1, 16) },
  ]),
  group('Natuur', [
    { title: 'Jungle', icon: 'jungle', items: [B.JUNGLE_LEAVES, B.VINE, B.BAMBOO, B.JUNGLE_FLOWER] },
    { title: 'Woestijn', icon: 'desert', items: [B.CACTUS, B.DEAD_BUSH, B.PALM_LOG, B.PALM_LEAVES] },
    { title: 'Toendra', icon: 'tundra', items: [B.SPRUCE_LEAVES, B.SNOWY_LEAVES] },
    { title: 'Savanne', icon: 'savanna', items: [B.DRY_GRASS, B.ACACIA_LEAVES, B.TALL_DRY_GRASS, B.TERMITE, B.MUD] },
    { title: 'Bos en moeras', icon: 'bigWorld', items: [B.BIRCH_LEAVES] },
    { title: 'Onder de grond', icon: 'pick', items: [B.COAL_ORE, B.IRON_ORE, B.COPPER_ORE, B.GOLD_ORE, B.LAPIS_ORE, B.REDSTONE_ORE, B.DIAMOND_ORE, B.EMERALD_ORE] },
  ]),
  group('Licht en huis', [
    { title: 'Licht', icon: 'torch', items: [B.TORCH, B.LANTERN, B.GLOWSTONE, B.JACK_O_LANTERN, B.CAMPFIRE, B.LAMP, B.SEA_LANTERN] },
    { title: 'In huis', icon: 'house', items: [B.CRAFTING_TABLE, B.FURNACE, B.CHEST, B.LADDER, B.FLOWER_POT, B.JUKEBOX, B.CAKE] },
    { title: 'Bedden', icon: 'home', items: [bedId(0, false)] },
  ]),
  group('Planten', [
    { title: 'Bloemen', icon: 'flower', items: [B.FLOWER_RED, B.FLOWER_YELLOW, B.CORNFLOWER, B.TULIP, B.SUNFLOWER, B.TALLGRASS, B.FERN, B.MUSHROOM_RED, B.MUSHROOM_BROWN] },
    { title: 'Water', icon: 'worlds', items: [B.SUGAR_CANE, B.LILY_PAD, B.SEAWEED, B.CORAL_RED, B.CORAL_YELLOW, B.CORAL_BLUE, ITEM.BUCKET] },
    { title: 'Moestuin', icon: 'flower', items: [ITEM.WHEAT_SEEDS, ITEM.CARROT, ITEM.POTATO] },
  ]),
  { title: 'Stempels', items: [ITEM.HOUSE, ITEM.TREE, ITEM.TOWER, ITEM.BRIDGE, ITEM.IGLOO, ITEM.PYRAMID, ITEM.TEMPLE, ITEM.LION_ROCK] },
  group('Dieren', [
    { title: 'Boerderij', icon: 'island', items: [ITEM.PIG, ITEM.CHICKEN, ITEM.SHEEP] },
    { title: 'Savanne', icon: 'savanna', items: [ITEM.LION, ITEM.LIONESS, ITEM.CHEETAH, ITEM.ELEPHANT, ITEM.GIRAFFE, ITEM.ZEBRA, ITEM.HIPPO, ITEM.MEERKAT] },
    { title: 'Jungle', icon: 'jungle', items: [ITEM.TIGER, ITEM.MONKEY, ITEM.PARROT, ITEM.PANDA, ITEM.FROG, ITEM.SLOTH] },
    { title: 'Woestijn', icon: 'desert', items: [ITEM.CAMEL, ITEM.FENNEC, ITEM.LIZARD, ITEM.TURTLE] },
    { title: 'Toendra', icon: 'tundra', items: [ITEM.POLAR_BEAR, ITEM.PENGUIN, ITEM.REINDEER, ITEM.ARCTIC_FOX, ITEM.SEAL, ITEM.SNOWY_OWL] },
  ]),
];
// Alles wat je kunt kiezen (ook de soorten binnen een familie), zonder dubbele
export const PALETTE = [...new Set(PALETTE_GROUPS.flatMap((g) => g.items.flatMap((id) => FAMILIES.get(id) || [id])))];
// Bij welke familie hoort dit vakje? (voor "blok kopiëren")
export const FAMILY_OF = new Map();
for (const [head, list] of FAMILIES) for (const id of list) FAMILY_OF.set(id, head);

export const DEFAULT_HOTBAR = [
  B.GRASS, B.PLANKS, B.COBBLE, B.BRICK, B.GLASS, B.DOOR, B.WOOL_RED, B.RAINBOW, ITEM.HOUSE,
];

export function isSolid(id) { return BLOCKS[id]?.solid ?? false; }
export function isOpaque(id) { return OPAQUE[id] === 1; }
