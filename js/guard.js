// Niet per ongeluk wegvegen. In Safari ga je terug naar de vorige website als je vanaf de rand van
// het scherm veegt, en de joystick verschijnt juist waar de duim neerkomt (ook vlak bij de rand).
// Twee vangnetten:
// 1. een aanraking die vlak bij de linker- of rechterrand begint, mag Safari niet als veeggebaar gebruiken;
// 2. lukt het toch, dan ga je terug naar een extra stap in de geschiedenis van JippeCraft zelf,
//    in plaats van naar de vorige website.
// Als app op het beginscherm heeft Safari deze gebaren niet; dan is dit niet nodig (maar kan het geen kwaad).

export const EDGE = 24; // zo dicht bij de rand (px) begint Safari's veeggebaar

export function standalone() {
  return navigator.standalone === true || !!window.matchMedia?.('(display-mode: standalone)').matches;
}

// Begint deze aanraking bij de rand, op het speelveld zelf (knoppen en lijsten blijven gewoon werken)?
export function edgeTouch(x, width, target) {
  return (x <= EDGE || x >= width - EDGE) && target?.tagName === 'CANVAS';
}

export function guardNavigation() {
  // (alleen op de echte website; niet in een ingebed venster zoals de claude.ai-versie)
  if (window.top !== window || !history.pushState) return;
  document.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    if (t && edgeTouch(t.clientX, window.innerWidth, e.target)) e.preventDefault();
  }, { passive: false });

  // Een extra stap in de geschiedenis, gemaakt bij een tik (Safari telt stappen zonder tik soms niet mee).
  // Terugvegen haalt die stap weg en blijft in het spel; bij de volgende tik komt hij terug.
  let armed = history.state?.jippecraft === true;
  const arm = () => {
    if (armed) return;
    armed = true;
    history.pushState({ jippecraft: true }, '');
  };
  document.addEventListener('pointerdown', arm, true);
  window.addEventListener('popstate', () => { armed = history.state?.jippecraft === true; });
}
