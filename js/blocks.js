// Alle bloktypes van JippeCraft.
// `tex` verwijst naar texturen uit textures.js (top / zijkant / onderkant).
// render: 'solid' (dicht blok), 'cutout' (met gaatjes: glas, bladeren),
//         'water' (doorzichtig), 'cross' (plantje: twee gekruiste vlakjes)

export const AIR = 0;
export const B = {
  GRASS: 1, DIRT: 2, STONE: 3, COBBLE: 4, LOG: 5, PLANKS: 6, LEAVES: 7, GLASS: 8,
  BRICK: 9, SAND: 10, WATER: 11, SNOW: 12, GOLD: 13, DIAMOND: 14, LAMP: 15,
  BOOKSHELF: 16, PUMPKIN: 17, MELON: 18, RAINBOW: 19,
  WOOL_RED: 20, WOOL_ORANGE: 21, WOOL_YELLOW: 22, WOOL_GREEN: 23, WOOL_LIGHTBLUE: 24,
  WOOL_BLUE: 25, WOOL_PURPLE: 26, WOOL_PINK: 27, WOOL_WHITE: 28, WOOL_BLACK: 29,
  FLOWER_RED: 30, FLOWER_YELLOW: 31, BEDROCK: 32, TALLGRASS: 33,
};

export const BLOCKS = [];

function def(id, name, tex, opts = {}) {
  const t = typeof tex === 'string' ? { top: tex, side: tex, bottom: tex } : tex;
  const render = opts.render || 'solid';
  BLOCKS[id] = {
    id,
    name,
    tex: t,
    render,
    // botst de speler ertegen?
    solid: opts.solid ?? (render === 'solid' || render === 'cutout'),
    // verbergt dit blok de vlakken van de buren?
    opaque: render === 'solid',
    // mag je hier doorheen bouwen (vervangen)?
    replaceable: opts.replaceable ?? (render === 'cross' || render === 'water'),
    breakable: opts.breakable ?? true,
    glow: !!opts.glow,
    sound: opts.sound || 'stone',
    palette: opts.palette ?? true,
  };
}

BLOCKS[AIR] = { id: 0, name: 'lucht', render: 'none', solid: false, opaque: false, replaceable: true, breakable: false, palette: false };

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
def(B.BEDROCK, 'Bodem', 'bedrock', { breakable: false, palette: false });
def(B.TALLGRASS, 'Grasplukje', 'tallgrass', { render: 'cross', sound: 'grass' });

// Volgorde in de kist
export const PALETTE = [
  B.GRASS, B.DIRT, B.SAND, B.STONE, B.COBBLE, B.BRICK, B.LOG, B.PLANKS, B.LEAVES,
  B.GLASS, B.WATER, B.SNOW, B.GOLD, B.DIAMOND, B.LAMP, B.RAINBOW, B.BOOKSHELF,
  B.PUMPKIN, B.MELON,
  B.WOOL_RED, B.WOOL_ORANGE, B.WOOL_YELLOW, B.WOOL_GREEN, B.WOOL_LIGHTBLUE,
  B.WOOL_BLUE, B.WOOL_PURPLE, B.WOOL_PINK, B.WOOL_WHITE, B.WOOL_BLACK,
  B.FLOWER_RED, B.FLOWER_YELLOW, B.TALLGRASS,
];

export const DEFAULT_HOTBAR = [
  B.GRASS, B.PLANKS, B.COBBLE, B.BRICK, B.GLASS, B.LOG, B.WOOL_RED, B.RAINBOW, B.LAMP,
];

export function isSolid(id) { return BLOCKS[id]?.solid ?? false; }
export function isOpaque(id) { return BLOCKS[id]?.opaque ?? false; }
