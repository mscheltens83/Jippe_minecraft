// Testpagina ?texturen: alle tegels groot op een raster, met hun naam. Zo kan een ouder
// (of wie de texturen tekent) ze makkelijk bekijken en vergelijken.

import { TEXTURE_NAMES, TILE } from './textures.js';

export function showTextures(root, atlas) {
  const page = document.createElement('div');
  page.className = 'texview';
  page.innerHTML = `<h1>Texturen (${TEXTURE_NAMES.length})</h1>
    <p>Alle tegels van JippeCraft, 16 × 16 pixels, met code getekend. Gras, bladeren en water staan in de
    kleur van de vlakte; in de wereld kleuren ze mee met het landschap. Sluit met de knop rechtsboven.</p>`;
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'texview-close';
  close.textContent = 'Sluiten';
  close.addEventListener('click', () => page.remove());
  page.appendChild(close);
  const grid = document.createElement('div');
  grid.className = 'texview-grid';
  for (const name of TEXTURE_NAMES) {
    const i = atlas.index[name];
    const c = document.createElement('canvas');
    c.width = c.height = TILE;
    c.getContext('2d').drawImage(atlas.canvas, (i % 16) * TILE, Math.floor(i / 16) * TILE, TILE, TILE, 0, 0, TILE, TILE);
    const cell = document.createElement('figure');
    cell.append(c, Object.assign(document.createElement('figcaption'), { textContent: name }));
    grid.appendChild(cell);
  }
  page.appendChild(grid);
  root.appendChild(page);
  return page;
}
