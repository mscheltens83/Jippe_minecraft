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
};

// Richtingen: 0 = -z (noord), 1 = +x (oost), 2 = +z (zuid), 3 = -x (west)
export const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

export const BLOCKS = [];
export const OPAQUE = new Uint8Array(256);

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

// ---------- speciale dingen uit de kist (geen blokken) ----------

export const ITEM = { HOUSE: 200, TREE: 201, TOWER: 202, BRIDGE: 203, PIG: 210, CHICKEN: 211, SHEEP: 212 };
export const SPECIALS = {
  [ITEM.HOUSE]: { name: 'Huisje', kind: 'stamp', stamp: 'house' },
  [ITEM.TREE]: { name: 'Boom', kind: 'stamp', stamp: 'tree' },
  [ITEM.TOWER]: { name: 'Toren', kind: 'stamp', stamp: 'tower' },
  [ITEM.BRIDGE]: { name: 'Brug', kind: 'stamp', stamp: 'bridge' },
  [ITEM.PIG]: { name: 'Varken', kind: 'animal', animal: 'pig' },
  [ITEM.CHICKEN]: { name: 'Kip', kind: 'animal', animal: 'chicken' },
  [ITEM.SHEEP]: { name: 'Schaap', kind: 'animal', animal: 'sheep' },
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
      B.PUMPKIN, B.MELON, B.STAIRS, B.DOOR, B.BOUNCE, B.FIREWORK,
      B.WOOL_RED, B.WOOL_ORANGE, B.WOOL_YELLOW, B.WOOL_GREEN, B.WOOL_LIGHTBLUE,
      B.WOOL_BLUE, B.WOOL_PURPLE, B.WOOL_PINK, B.WOOL_WHITE, B.WOOL_BLACK,
      B.GLASS_RED, B.GLASS_YELLOW, B.GLASS_GREEN, B.GLASS_BLUE, B.GLASS_PURPLE,
      B.FLOWER_RED, B.FLOWER_YELLOW, B.TALLGRASS,
    ],
  },
  { title: 'Stempels', items: [ITEM.HOUSE, ITEM.TREE, ITEM.TOWER, ITEM.BRIDGE] },
  { title: 'Dieren', items: [ITEM.PIG, ITEM.CHICKEN, ITEM.SHEEP] },
];
export const PALETTE = PALETTE_GROUPS.flatMap((g) => g.items);

export const DEFAULT_HOTBAR = [
  B.GRASS, B.PLANKS, B.COBBLE, B.BRICK, B.GLASS, B.DOOR, B.WOOL_RED, B.RAINBOW, ITEM.HOUSE,
];

export function isSolid(id) { return BLOCKS[id]?.solid ?? false; }
export function isOpaque(id) { return OPAQUE[id] === 1; }
