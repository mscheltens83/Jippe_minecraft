// Plaatjes voor de knoppen (SVG). Dik en duidelijk, zodat je niets hoeft te lezen.

const S = 'stroke="#1c2a33" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';
const svg = (body) => `<svg viewBox="0 0 48 48" aria-hidden="true">${body}</svg>`;

export const ICONS = {
  home: svg(`<path d="M8 24 L24 9 L40 24 L36 24 L36 39 L12 39 L12 24 Z" fill="#fff" ${S}/><rect x="20" y="28" width="8" height="11" fill="#e0a45a" ${S}/>`),
  build: svg(`<path d="M6 17 L20 10 L34 17 L20 24 Z" fill="#8fdc6a" ${S}/><path d="M6 17 L6 33 L20 40 L20 24 Z" fill="#b0784a" ${S}/><path d="M34 17 L34 33 L20 40 L20 24 Z" fill="#8c5a34" ${S}/><circle cx="36" cy="34" r="9" fill="#fff" ${S}/><path d="M36 29 V39 M31 34 H41" fill="none" stroke="#2b9a3a" stroke-width="3.5" stroke-linecap="round"/>`),
  pick: svg(`<path d="M22 22 L9 39" fill="none" stroke="#1c2a33" stroke-width="8" stroke-linecap="round"/><path d="M22 22 L9 39" fill="none" stroke="#a8743f" stroke-width="4" stroke-linecap="round"/><path d="M8 14 C 16 6, 32 6, 40 14 L 36 17 C 30 12, 18 12, 12 17 Z" fill="#9fe6ef" ${S} transform="rotate(45 24 16) translate(0 4)"/>`),
  undo: svg(`<path d="M14 20 H30 C36 20, 40 24, 40 30 C40 36, 36 40, 30 40 H20" fill="none" stroke="#1c2a33" stroke-width="9" stroke-linecap="round"/><path d="M14 20 H30 C36 20, 40 24, 40 30 C40 36, 36 40, 30 40 H20" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/><path d="M6 20 L16 10 L16 30 Z" fill="#fff" ${S}/>`),
  fly: svg(`<path d="M6 32 C 8 18, 22 9, 42 9 C 39 13, 36 15, 32 16 C 36 17, 38 19, 37 22 C 33 23, 30 23, 27 24 C 29 26, 29 28, 26 30 C 19 32, 12 33, 6 32 Z" fill="#fff" ${S}/><path d="M12 30 C 18 24, 24 20, 32 16" fill="none" stroke="#9ab" stroke-width="2"/>`),
  up: svg(`<path d="M24 8 L40 26 L30 26 L30 40 L18 40 L18 26 L8 26 Z" fill="#fff" ${S}/>`),
  down: svg(`<path d="M24 40 L40 22 L30 22 L30 8 L18 8 L18 22 L8 22 Z" fill="#fff" ${S}/>`),
  jump: svg(`<path d="M24 6 L38 21 L30 21 L30 32 L18 32 L18 21 L10 21 Z" fill="#fff" ${S}/><rect x="9" y="37" width="30" height="5" rx="2" fill="#fff" ${S}/>`),
  chest: svg(`<rect x="6" y="18" width="36" height="22" rx="2" fill="#b77b3d" ${S}/><path d="M6 18 C 6 10, 42 10, 42 18 Z" fill="#d49a55" ${S}/><path d="M6 22 H42" ${S} fill="none"/><rect x="20" y="19" width="8" height="9" rx="1.5" fill="#f5d34a" ${S}/>`),
  soundOn: svg(`<path d="M8 19 H16 L26 10 V38 L16 29 H8 Z" fill="#fff" ${S}/><path d="M31 18 C 34 21, 34 27, 31 30 M36 13 C 42 19, 42 29, 36 35" fill="none" ${S}/>`),
  soundOff: svg(`<path d="M8 19 H16 L26 10 V38 L16 29 H8 Z" fill="#fff" ${S}/><path d="M32 18 L42 30 M42 18 L32 30" fill="none" stroke="#e8553d" stroke-width="4" stroke-linecap="round"/>`),
  play: svg(`<path d="M15 9 L39 24 L15 39 Z" fill="#fff" ${S}/>`),
  close: svg(`<path d="M12 12 L36 36 M36 12 L12 36" fill="none" stroke="#1c2a33" stroke-width="9" stroke-linecap="round"/><path d="M12 12 L36 36 M36 12 L12 36" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`),
  check: svg(`<path d="M9 25 L20 36 L40 13" fill="none" stroke="#1c2a33" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 25 L20 36 L40 13" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`),
  island: svg(`<path d="M2 36 C 8 33, 12 39, 18 36 C 24 33, 28 39, 34 36 C 40 33, 44 39, 46 36 V46 H2 Z" fill="#4f93e0" ${S}/><path d="M5 36 C 9 27, 15 23, 22 23 C 30 23, 38 28, 43 36 Z" fill="#6cc24a" ${S}/><rect x="16" y="15" width="4" height="10" fill="#8a5a37" ${S}/><rect x="11" y="6" width="14" height="11" rx="1" fill="#3f9a3a" ${S}/><rect x="31" y="3" width="10" height="10" fill="#ffd84a" ${S}/>`),
  flat: svg(`<rect x="4" y="22" width="40" height="18" fill="#9a6a45" ${S}/><rect x="4" y="18" width="40" height="7" fill="#6cc24a" ${S}/><circle cx="36" cy="9" r="5" fill="#ffd84a" ${S}/>`),
  restore: svg(`<path d="M10 24 A 14 14 0 1 0 15 13" fill="none" stroke="#1c2a33" stroke-width="9" stroke-linecap="round"/><path d="M10 24 A 14 14 0 1 0 15 13" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/><path d="M8 8 L18 10 L12 19 Z" fill="#fff" ${S}/><path d="M24 16 V25 L30 29" fill="none" stroke="#1c2a33" stroke-width="3" stroke-linecap="round"/>`),
};
