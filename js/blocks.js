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
};

// Richtingen: 0 = -z (noord), 1 = +x (oost), 2 = +z (zuid), 3 = -x (west)
export const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

export const BLOCKS = [];
export const OPAQUE = new Uint8Array(256);
const FULL_BOX = [[0, 0, 0, 1, 1, 1]];

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
  };
  OPAQUE[id] = render === 'solid' ? 1 : 0;
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
def(B.LAMP, 'Lamp', 'lamp', { glow: true, sound: 'glass' });
def(B.BOOKSHELF, 'Boekenkast', { top: 'planks', side: 'bookshelf', bottom: 'planks' }, { sound: 'wood' });
def(B.PUMPKIN, 'Pompoen', { top: 'pumpkin_top', side: 'pumpkin_face', bottom: 'pumpkin_top' }, { sound: 'wood' });
def(B.MELON, 'Meloen', { top: 'melon_top', side: 'melon_side', bottom: 'melon_top' }, { sound: 'wood' });
def(B.RAINBOW, 'Regenboog', { top: 'rainbow_top', side: 'rainbow', bottom: 'rainbow_top' }, { glow: true, sound: 'glass' });
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
export function doorId(dir, upper, open) { return B.DOOR + dir * 4 + (upper ? 2 : 0) + (open ? 1 : 0); }
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
export function gateId(dir, open) { return B.GATE + dir * 2 + (open ? 1 : 0); }
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
  def(gateId(d, open), 'Hekdeur', 'planks', {
    render: 'shape', shape: 'gate', dir: d, open, family: B.GATE, boxes: open ? [folded] : panel, sound: 'wood',
  });
}
def(B.HAY, 'Hooibaal', { top: 'hay_top', side: 'hay_side', bottom: 'hay_top' }, { sound: 'grass' });

// Dezelfde vormen dienen voor tekenen én botsen. Een hek groeit vast aan buren.
export function blockBoxes(world, x, y, z, collision = false) {
  const id = world.get(x, y, z), b = BLOCKS[id];
  if (!b?.solid) return [];
  if (id === B.FENCE) {
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
  HOUSE: 200, TREE: 201, TOWER: 202, BRIDGE: 203, IGLOO: 204, PYRAMID: 205, TEMPLE: 206, LION_ROCK: 207,
  PIG: 210, CHICKEN: 211, SHEEP: 212,
  LION: 213, LIONESS: 214, CHEETAH: 215, TIGER: 216, ELEPHANT: 217,
  GIRAFFE: 218, ZEBRA: 219, HIPPO: 220, MEERKAT: 221,
  MONKEY: 222, PARROT: 223, PANDA: 224, FROG: 225, SLOTH: 226,
  CAMEL: 227, FENNEC: 228, LIZARD: 229, TURTLE: 230,
  POLAR_BEAR: 231, PENGUIN: 232, REINDEER: 233, ARCTIC_FOX: 234, SEAL: 235, SNOWY_OWL: 236,
};
export const SPECIALS = {
  [ITEM.HOUSE]: { name: 'Huisje', kind: 'stamp', stamp: 'house' },
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
export function isSpecial(id) { return id >= 200; }

// Volgorde in de kist, per groep
export const PALETTE_GROUPS = [
  {
    title: 'Blokken',
    items: [
      B.GRASS, B.DIRT, B.SAND, B.STONE, B.COBBLE, B.BRICK, B.LOG, B.PLANKS, B.LEAVES,
      B.GLASS, B.WATER, B.SNOW, B.GOLD, B.DIAMOND, B.LAMP, B.RAINBOW, B.BOOKSHELF,
      B.PUMPKIN, B.MELON, B.STAIRS, B.DOOR, B.FENCE, B.GATE, B.HAY, B.BOUNCE, B.FIREWORK,
      B.WOOL_RED, B.WOOL_ORANGE, B.WOOL_YELLOW, B.WOOL_GREEN, B.WOOL_LIGHTBLUE,
      B.WOOL_BLUE, B.WOOL_PURPLE, B.WOOL_PINK, B.WOOL_WHITE, B.WOOL_BLACK,
      B.GLASS_RED, B.GLASS_YELLOW, B.GLASS_GREEN, B.GLASS_BLUE, B.GLASS_PURPLE,
      B.FLOWER_RED, B.FLOWER_YELLOW, B.TALLGRASS,
      B.MOSSY_COBBLE, B.SANDSTONE, B.CARVED_SANDSTONE, B.RED_SAND,
      B.TERRACOTTA_ORANGE, B.TERRACOTTA_BROWN, B.TREASURE, B.RED_DIRT,
    ],
  },
  {
    title: 'Natuur',
    sections: [
      { title: 'Jungle', icon: 'jungle', items: [B.JUNGLE_LOG, B.JUNGLE_LEAVES, B.VINE, B.BAMBOO, B.FERN, B.JUNGLE_FLOWER] },
      { title: 'Woestijn', icon: 'desert', items: [B.CACTUS, B.DEAD_BUSH, B.PALM_LOG, B.PALM_LEAVES] },
      { title: 'Toendra', icon: 'tundra', items: [B.ICE, B.PACKED_ICE, B.SPRUCE_LOG, B.SPRUCE_LEAVES, B.SNOWY_LEAVES] },
      { title: 'Savanne', icon: 'savanna', items: [B.DRY_GRASS, B.ACACIA_LOG, B.ACACIA_LEAVES, B.TALL_DRY_GRASS, B.TERMITE, B.MUD] },
    ],
    items: [61, 62, 63, 64, 65, 66, 70, 71, 72, 73, 79, 80, 81, 82, 83, 84, 86, 87, 88, 89, 90],
  },
  { title: 'Stempels', items: [ITEM.HOUSE, ITEM.TREE, ITEM.TOWER, ITEM.BRIDGE, ITEM.IGLOO, ITEM.PYRAMID, ITEM.TEMPLE, ITEM.LION_ROCK] },
  { title: 'Dieren', sections: [
    { title: 'Boerderij', icon: 'island', items: [ITEM.PIG, ITEM.CHICKEN, ITEM.SHEEP] },
    { title: 'Savanne', icon: 'savanna', items: [ITEM.LION, ITEM.LIONESS, ITEM.CHEETAH, ITEM.ELEPHANT, ITEM.GIRAFFE, ITEM.ZEBRA, ITEM.HIPPO, ITEM.MEERKAT] },
    { title: 'Jungle', icon: 'jungle', items: [ITEM.TIGER, ITEM.MONKEY, ITEM.PARROT, ITEM.PANDA, ITEM.FROG, ITEM.SLOTH] },
    { title: 'Woestijn', icon: 'desert', items: [ITEM.CAMEL, ITEM.FENNEC, ITEM.LIZARD, ITEM.TURTLE] },
    { title: 'Toendra', icon: 'tundra', items: [ITEM.POLAR_BEAR, ITEM.PENGUIN, ITEM.REINDEER, ITEM.ARCTIC_FOX, ITEM.SEAL, ITEM.SNOWY_OWL] },
  ], items: [ITEM.PIG, ITEM.CHICKEN, ITEM.SHEEP, ITEM.LION, ITEM.LIONESS, ITEM.CHEETAH,
    ITEM.ELEPHANT, ITEM.GIRAFFE, ITEM.ZEBRA, ITEM.HIPPO, ITEM.MEERKAT, ITEM.TIGER,
    ITEM.MONKEY, ITEM.PARROT, ITEM.PANDA, ITEM.FROG, ITEM.SLOTH,
    ITEM.CAMEL, ITEM.FENNEC, ITEM.LIZARD, ITEM.TURTLE,
    ITEM.POLAR_BEAR, ITEM.PENGUIN, ITEM.REINDEER, ITEM.ARCTIC_FOX, ITEM.SEAL, ITEM.SNOWY_OWL] },
];
export const PALETTE = PALETTE_GROUPS.flatMap((g) => g.items);

export const DEFAULT_HOTBAR = [
  B.GRASS, B.PLANKS, B.COBBLE, B.BRICK, B.GLASS, B.DOOR, B.WOOL_RED, B.RAINBOW, ITEM.HOUSE,
];

export function isSolid(id) { return BLOCKS[id]?.solid ?? false; }
export function isOpaque(id) { return OPAQUE[id] === 1; }
