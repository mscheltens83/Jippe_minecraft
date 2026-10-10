// Maten van de eindeloze wereld.
export const CHUNK = 16;          // een chunk is 16 x 16 blokken breed
export const SY = 128;            // en 128 blokken hoog
export const SECTION = 16;        // voor het tekenen in stukken van 16 hoog
export const SEA = 48;            // waterhoogte
export const SHIFT = 38;          // oude werelden (zee op 10) schuiven zoveel omhoog
export const CENTER = 48;         // midden van de bouwplek (zoals in de oude werelden van 96 x 96)
export const HOME = 96;           // het oude stuk wereld: x en z van 0 tot 96
export const BORDER = 4096;       // verder dan dit van het midden kun je niet
export const MAX_CHUNK = Math.ceil((CENTER + BORDER) / CHUNK) + 2;

// Eén getal per chunk (sneller dan tekst als sleutel)
export const chunkKey = (cx, cz) => (cx + 1024) * 2048 + (cz + 1024);
export const keyCx = (key) => Math.floor(key / 2048) - 1024;
export const keyCz = (key) => (key % 2048) - 1024;
