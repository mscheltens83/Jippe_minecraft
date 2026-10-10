// Alles wat je op het scherm ziet bovenop de 3D-wereld: knoppen, onderbalk, kist en menu.

import { ICONS, iconURL } from './icons.js';
import { ITEM, PALETTE, PALETTE_GROUPS, FAMILIES, FAMILY_OF, itemName, isSpecial } from './blocks.js';
import { drawBlockIcon } from './textures.js';
import { BIOMES } from './biomes.js';
import { VERSION } from './version.js';
import { ParentPanel } from './parent.js';

const SPECIAL_ICONS = {
  [ITEM.HOUSE]: 'house', [ITEM.TREE]: 'tree', [ITEM.TOWER]: 'tower', [ITEM.BRIDGE]: 'bridge',
  [ITEM.PIG]: 'pig', [ITEM.CHICKEN]: 'chicken', [ITEM.SHEEP]: 'sheep',
  [ITEM.LION]: 'lion', [ITEM.LIONESS]: 'lioness', [ITEM.CHEETAH]: 'cheetah', [ITEM.TIGER]: 'tiger',
  [ITEM.ELEPHANT]: 'elephant', [ITEM.GIRAFFE]: 'giraffe', [ITEM.ZEBRA]: 'zebra', [ITEM.HIPPO]: 'hippo', [ITEM.MEERKAT]: 'meerkat',
  [ITEM.MONKEY]: 'monkey', [ITEM.PARROT]: 'parrot', [ITEM.PANDA]: 'panda', [ITEM.FROG]: 'frog', [ITEM.SLOTH]: 'sloth',
  [ITEM.CAMEL]: 'camel', [ITEM.FENNEC]: 'fennec', [ITEM.LIZARD]: 'lizard', [ITEM.TURTLE]: 'turtle',
  [ITEM.POLAR_BEAR]: 'polarBear', [ITEM.PENGUIN]: 'penguin', [ITEM.REINDEER]: 'reindeer', [ITEM.ARCTIC_FOX]: 'arcticFox', [ITEM.SEAL]: 'seal', [ITEM.SNOWY_OWL]: 'snowyOwl',
  [ITEM.COW]: 'cow', [ITEM.HORSE]: 'horse', [ITEM.DOG]: 'dog', [ITEM.CAT]: 'cat', [ITEM.RABBIT]: 'rabbit', [ITEM.FOX]: 'fox', [ITEM.BEE]: 'bee', [ITEM.GOAT]: 'goat', [ITEM.LLAMA]: 'llama', [ITEM.FISH]: 'fish', [ITEM.DOLPHIN]: 'dolphin', [ITEM.SQUID]: 'squid',
  [ITEM.BUCKET]: 'bucket', [ITEM.WHEAT_SEEDS]: 'seeds', [ITEM.CARROT]: 'carrot', [ITEM.POTATO]: 'potato',
  [ITEM.IGLOO]: 'igloo', [ITEM.PYRAMID]: 'pyramid', [ITEM.TEMPLE]: 'temple', [ITEM.LION_ROCK]: 'lionRock',
};
const GROUP_ICONS = { Bouwen: 'build', Kleuren: 'palette', Natuur: 'tree', 'Licht en huis': 'torch', Planten: 'flower', Stempels: 'house', Dieren: 'pig' };

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

function button(cls, icon, label) {
  const b = el('button', 'btn ' + cls, ICONS[icon] || '');
  b.type = 'button';
  if (label) b.setAttribute('aria-label', label);
  return b;
}

// Reageer meteen bij aanraken (sneller dan 'click' op de iPad)
function onPress(elm, fn) {
  elm.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    elm.classList.add('pressed');
    fn(e);
  });
  const up = () => elm.classList.remove('pressed');
  elm.addEventListener('pointerup', up);
  elm.addEventListener('pointercancel', up);
  elm.addEventListener('pointerleave', up);
}

// Knop die je ingedrukt houdt (springen, omlaag)
function onHold(elm, down, up) {
  elm.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    try { elm.setPointerCapture(e.pointerId); } catch { /* niet erg */ }
    elm.classList.add('pressed');
    down();
  });
  const end = () => { elm.classList.remove('pressed'); up(); };
  elm.addEventListener('pointerup', end);
  elm.addEventListener('pointercancel', end);
  elm.addEventListener('lostpointercapture', end);
}

// Lang vasthouden (voor het ouderscherm): pas na `ms` milliseconden gebeurt er iets
function onLongPress(elm, ms, fn) {
  let timer = null;
  const stop = () => { clearTimeout(timer); timer = null; elm.classList.remove('holding'); };
  elm.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    stop();
    elm.classList.add('holding');
    timer = setTimeout(() => { stop(); fn(); }, ms);
  });
  for (const type of ['pointerup', 'pointercancel', 'pointerleave']) elm.addEventListener(type, stop);
}

function labeled(btn, text) {
  const w = el('div', 'labeled');
  w.append(btn, el('span', '', text));
  return w;
}

export class UI {
  constructor(root, atlas, h) {
    this.h = h;
    this.icons = {};
    for (const id of PALETTE) {
      this.icons[id] = isSpecial(id) ? iconURL(SPECIAL_ICONS[id]) : drawBlockIcon(atlas, id, 96).toDataURL();
    }

    // --- spelknoppen ---
    this.hud = el('div', 'hud');
    root.appendChild(this.hud);

    this.stickBase = el('div', 'stick');
    this.stickKnob = el('div', 'stick-knob');
    this.stickBase.appendChild(this.stickKnob);
    this.hud.appendChild(this.stickBase);

    const menuBtn = button('menu-btn', 'home', 'Menu');
    onPress(menuBtn, () => h.onMenu());
    this.hud.appendChild(menuBtn);
    this.albumHudBtn = button('album-hud-btn', 'book', 'Dierenalbum');
    onPress(this.albumHudBtn, () => { h.onMenu(); h.onAlbum(); });
    this.hud.appendChild(this.albumHudBtn);
    // Naar huis: een kompasje met een huisje
    this.homeBtn = button('home-btn', 'goHome', 'Naar huis');
    onPress(this.homeBtn, () => h.onGoHome());
    this.hud.appendChild(this.homeBtn);
    // Pijltje boven de onderbalk dat naar huis wijst (alleen als je ver weg bent)
    this.compass = el('div', 'compass', ICONS.arrow + `<span class="compass-home">${ICONS.goHome}</span>`);
    this.compass.hidden = true;
    this.compassArrow = this.compass.querySelector('svg');
    this.hud.appendChild(this.compass);

    const mode = el('div', 'mode');
    this.buildBtn = button('mode-build', 'build', 'Bouwen');
    this.breakBtn = button('mode-break', 'pick', 'Slopen');
    onPress(this.buildBtn, () => h.onMode('build'));
    onPress(this.breakBtn, () => h.onMode('break'));
    mode.append(this.buildBtn, this.breakBtn);
    this.hud.appendChild(mode);

    const topRight = el('div', 'top-right');
    this.camBtn = button('cam-btn', 'person', 'Poppetje');
    onPress(this.camBtn, () => h.onCamera());
    this.undoBtn = button('undo-btn', 'undo', 'Terug');
    onPress(this.undoBtn, () => h.onUndo());
    topRight.append(this.camBtn, this.undoBtn);
    this.hud.appendChild(topRight);

    const right = el('div', 'right');
    this.jumpBtn = button('jump-btn', 'jump', 'Springen');
    onHold(this.jumpBtn, () => h.onJump(true), () => h.onJump(false));
    this.downBtn = button('down-btn', 'down', 'Omlaag');
    onHold(this.downBtn, () => h.onDown(true), () => h.onDown(false));
    this.flyBtn = button('fly-btn', 'fly', 'Vliegen');
    onPress(this.flyBtn, () => h.onFly());
    right.append(this.jumpBtn, this.downBtn, this.flyBtn);
    this.hud.appendChild(right);

    this.hotbar = el('div', 'hotbar');
    this.hud.appendChild(this.hotbar);

    // rondje dat vol loopt terwijl je vasthoudt om te slopen
    this.holdEl = el('div', 'hold-ring', '<svg viewBox="0 0 60 60"><circle cx="30" cy="30" r="24" class="track"/><circle cx="30" cy="30" r="24" class="fill"/></svg>');
    this.holdEl.hidden = true;
    this.holdFill = this.holdEl.querySelector('.fill');
    root.appendChild(this.holdEl);

    this.buildPalette(root);
    this.buildMenu(root);

    this.tapLayer = el('div', 'taps');
    root.appendChild(this.tapLayer);

    // Kort berichtje midden in beeld (met een plaatje, want Jippe leest nog niet veel)
    this.toast = el('div', 'toast');
    this.toast.hidden = true;
    root.appendChild(this.toast);
    // Blauwe tint onder water
    this.waterTint = el('div', 'underwater');
    this.waterTint.hidden = true;
    root.insertBefore(this.waterTint, this.hud);
    // Zwart scherm als je gaat slapen
    this.fader = el('div', 'sleep-fade');
    root.appendChild(this.fader);
  }

  say(text, icon) {
    this.toast.innerHTML = `${ICONS[icon] || ''}<span>${text}</span>`;
    this.toast.hidden = false;
    this.toast.classList.remove('show');
    void this.toast.offsetWidth; // animatie opnieuw starten
    this.toast.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.toast.hidden = true; }, 2200);
  }

  fade(on) { this.fader.classList.toggle('on', on); }

  setUnderwater(on) { this.waterTint.hidden = !on; }

  // --- de kist met blokken, natuur, stempels en dieren ---
  buildPalette(root) {
    const h = this.h;
    this.palette = el('div', 'overlay palette');
    this.palette.hidden = true;
    const pcard = el('div', 'palette-card');
    const phead = el('div', 'palette-head');
    const tabs = el('div', 'pal-tabs');
    this.palScroll = el('div', 'palette-grid');
    this.palGroups = PALETTE_GROUPS.map((g, gi) => {
      const tab = el('button', 'pal-tab', `${ICONS[GROUP_ICONS[g.title]]}<span>${g.title}</span>`);
      tab.type = 'button';
      tab.setAttribute('aria-label', g.title);
      onPress(tab, () => this.showGroup(gi));
      tabs.appendChild(tab);
      const grid = el('div', 'pal-items');
      for (const id of g.items) {
        const section = g.sections?.find((s) => s.items[0] === id);
        if (section) grid.appendChild(el('div', 'pal-section', `${ICONS[section.icon]}<span>${section.title}</span>`));
        const family = FAMILIES.get(id);
        const b = el('button', 'pal-item' + (isSpecial(id) ? ' special' : '') + (family ? ' family' : ''));
        b.type = 'button';
        b.setAttribute('aria-label', itemName(id));
        b.innerHTML = `<img src="${this.icons[id]}" alt=""><span>${itemName(id)}</span>`;
        // 'click' in plaats van meteen bij aanraken, zodat je de kist ook kunt scrollen
        b.addEventListener('click', () => {
          if (b.dataset.held) { delete b.dataset.held; return; }
          h.onPick(id); this.closePalette();
        });
        // Familie: ingedrukt houden toont alle soorten (houtsoorten, kleuren, ...)
        if (family) {
          let timer = null;
          const stop = () => clearTimeout(timer);
          b.addEventListener('pointerdown', () => { stop(); timer = setTimeout(() => { b.dataset.held = '1'; this.showVariants(b, family); }, 450); });
          for (const t of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(t, stop);
          b.addEventListener('contextmenu', (e) => e.preventDefault());
        }
        grid.appendChild(b);
      }
      this.palScroll.appendChild(grid);
      return { tab, grid, items: g.items };
    });
    const pclose = button('close-btn', 'close', 'Sluiten');
    onPress(pclose, () => this.closePalette());
    phead.append(tabs, pclose);
    pcard.append(phead, this.palScroll);
    this.palette.appendChild(pcard);
    this.palette.addEventListener('pointerdown', (e) => { if (e.target === this.palette) this.closePalette(); });
    root.appendChild(this.palette);
    this.showGroup(0);
  }

  // Een rij met alle soorten van een familie, net boven het vakje
  showVariants(anchor, ids) {
    this.hideVariants();
    const row = this.variants = el('div', 'pal-variants');
    for (const id of ids) {
      const v = el('button', 'pal-variant');
      v.type = 'button';
      v.setAttribute('aria-label', itemName(id));
      v.innerHTML = `<img src="${this.icons[id]}" alt=""><span>${itemName(id)}</span>`;
      v.addEventListener('click', () => { this.h.onPick(id); this.closePalette(); });
      row.appendChild(v);
    }
    this.palette.appendChild(row);
    const a = anchor.getBoundingClientRect(), r = row.getBoundingClientRect();
    row.style.left = Math.max(8, Math.min(innerWidth - r.width - 8, a.left + a.width / 2 - r.width / 2)) + 'px';
    row.style.top = Math.max(8, Math.min(innerHeight - r.height - 8, a.top - r.height - 6)) + 'px'; // altijd binnen beeld
  }

  hideVariants() { this.variants?.remove(); this.variants = null; }

  showGroup(i) {
    this.palGroups.forEach((g, j) => { g.tab.classList.toggle('on', i === j); g.grid.hidden = i !== j; });
    this.palScroll.scrollTop = 0;
  }

  // --- menu / startscherm ---
  buildMenu(root) {
    const h = this.h;
    this.menu = el('div', 'overlay menu');
    const card = el('div', 'menu-card');
    card.appendChild(el('h1', 'logo', 'Jippe<span>Craft</span>'));

    this.panels = {};
    const main = this.panels.main = el('div', 'panel');
    this.playBtn = button('play-btn', 'play', 'Spelen');
    onPress(this.playBtn, () => h.onPlay());
    const row = el('div', 'menu-row');
    this.soundBtn = button('small', 'soundOn', 'Geluid');
    onPress(this.soundBtn, () => h.onToggleSound());
    this.musicBtn = button('small', 'music', 'Muziek');
    onPress(this.musicBtn, () => h.onToggleMusic());
    const worldsBtn = button('small worlds-btn', 'worlds', 'Werelden');
    onPress(worldsBtn, () => this.showPanel('worlds'));
    this.albumBtn = button('small album-btn', 'book', 'Album');
    onPress(this.albumBtn, () => h.onAlbum());
    row.append(labeled(this.soundBtn, 'Geluid'), labeled(this.musicBtn, 'Muziek'),
      labeled(worldsBtn, 'Werelden'), labeled(this.albumBtn, 'Album'));
    this.predatorsBtn = button('small predators-btn', 'lion', 'Roofdieren jagen');
    this.predatorsBtn.innerHTML = ICONS.lion + ICONS.pig;
    this.predatorsBtn.setAttribute('aria-pressed', 'true');
    onPress(this.predatorsBtn, () => h.onTogglePredators());
    // Klein versienummer; 3 seconden vasthouden opent het ouderscherm
    this.versionBtn = el('button', 'version', 'versie ' + VERSION);
    this.versionBtn.type = 'button';
    this.versionBtn.setAttribute('aria-label', 'Versie ' + VERSION + ' (vasthouden voor ouders)');
    onLongPress(this.versionBtn, 3000, () => this.showPanel('parent'));
    main.append(this.playBtn, row, labeled(this.predatorsBtn, 'Roofdieren jagen'), this.versionBtn);

    const worlds = this.panels.worlds = el('div', 'panel');
    this.slotRow = el('div', 'slots');
    const back1 = button('small', 'close', 'Terug');
    onPress(back1, () => this.showPanel('main'));
    worlds.append(this.slotRow, labeled(back1, 'Terug'));

    const type = this.panels.type = el('div', 'panel');
    type.appendChild(el('p', 'hint', 'Wat voor wereld wil je?'));
    const choices = el('div', 'world-choices');
    for (const [t, biome] of Object.entries(BIOMES)) {
      if (!biome.kies) continue; // Avontuur en de landschappen binnen de Grote wereld staan er niet bij
      const b = button('choice ' + t, biome.icon, biome.naam);
      onPress(b, () => {
        this.pendingType = t;
        if (this.pendingEmpty) h.onNewWorld(this.pendingSlot, t);
        else this.showPanel('confirm');
      });
      choices.appendChild(labeled(b, biome.naam));
    }
    const back2 = button('small', 'close', 'Terug');
    onPress(back2, () => this.showPanel('worlds'));
    type.append(choices, labeled(back2, 'Terug'));

    const confirm = this.panels.confirm = el('div', 'panel');
    this.confirmThumb = el('div', 'confirm-thumb');
    const text = el('p', 'hint', 'Deze wereld weggooien en een nieuwe maken?');
    const yesNo = el('div', 'menu-row');
    const yes = button('yes', 'check', 'Ja');
    const no = button('no', 'close', 'Nee');
    onPress(yes, () => h.onNewWorld(this.pendingSlot, this.pendingType));
    onPress(no, () => this.showPanel('worlds'));
    yesNo.append(labeled(yes, 'Ja'), labeled(no, 'Nee'));
    confirm.append(this.confirmThumb, text, yesNo);

    this.parent = new ParentPanel({ ...h.parent, onBack: () => this.showPanel('main') });
    this.panels.parent = this.parent.el;

    card.append(main, worlds, type, confirm, this.parent.el);
    this.menu.appendChild(card);
    root.appendChild(this.menu);
    this.showPanel('main');
  }

  renderSlots() {
    const slots = this.h.getSlots();
    this.slotRow.textContent = '';
    for (const s of slots) {
      const wrap = el('div', 'slot-wrap');
      const card = el('button', 'slot-card' + (s.current ? ' current' : '') + (s.empty ? ' empty' : ''));
      card.type = 'button';
      card.setAttribute('aria-label', 'Wereld ' + s.n);
      if (s.empty) card.innerHTML = ICONS.plus;
      else if (s.thumb) card.style.backgroundImage = `url("${s.thumb}")`;
      else card.innerHTML = ICONS[BIOMES[s.type]?.icon || 'island'];
      onPress(card, () => {
        if (s.empty) { this.pendingSlot = s.n; this.pendingEmpty = true; this.showPanel('type'); } else this.h.onSlot(s.n);
      });
      const label = el('div', 'slot-label');
      label.appendChild(el('span', '', 'Wereld ' + s.n));
      if (!s.empty) {
        const again = button('slot-again', 'restore', 'Opnieuw beginnen');
        onPress(again, () => {
          this.pendingSlot = s.n;
          this.pendingEmpty = false;
          this.confirmThumb.style.backgroundImage = s.thumb ? `url("${s.thumb}")` : '';
          this.confirmThumb.innerHTML = s.thumb ? '' : ICONS[BIOMES[s.type]?.icon || 'island'];
          this.showPanel('type');
        });
        label.appendChild(again);
      }
      wrap.append(card, label);
      this.slotRow.appendChild(wrap);
    }
  }

  showPanel(which) {
    if (which === 'worlds') this.renderSlots();
    if (which === 'parent') this.parent.refresh();
    for (const [name, p] of Object.entries(this.panels)) p.hidden = name !== which;
  }

  showMenu() {
    this.showPanel('main');
    this.menu.hidden = false;
    this.hud.classList.add('dim');
  }

  hideMenu() {
    this.menu.hidden = true;
    this.hud.classList.remove('dim');
  }

  get menuOpen() { return !this.menu.hidden; }
  get paletteOpen() { return !this.palette.hidden; }

  // Open de kist op het tabblad van het blok dat je nu vasthoudt
  // Er is net een blok gekopieerd terwijl de kistknop werd vastgehouden
  markPicked() { this.picked = true; }

  openPalette(current) {
    const head = FAMILY_OF.get(current) ?? current;
    const gi = this.palGroups.findIndex((g) => g.items.includes(head));
    this.showGroup(Math.max(0, gi));
    this.palette.hidden = false;
  }
  closePalette() { this.palette.hidden = true; this.hideVariants(); }

  setHotbar(ids, sel) {
    this.hotbar.textContent = '';
    ids.forEach((id, i) => {
      const b = el('button', 'slot' + (i === sel ? ' selected' : '') + (isSpecial(id) ? ' special' : ''));
      b.type = 'button';
      b.setAttribute('aria-label', itemName(id));
      b.innerHTML = `<img src="${this.icons[id]}" alt="">`;
      onPress(b, () => this.h.onSelect(i));
      this.hotbar.appendChild(b);
    });
    this.hotbar.appendChild(this.chest || (this.chest = this.chestButton()));
  }

  // Kort tikken: de kist open. Vasthouden en met een andere vinger op een blok tikken:
  // dat blok komt in je hand ("blok kopiëren"). De knop wordt één keer gemaakt, zodat hij
  // blijft bestaan als de onderbalk verandert terwijl je hem vasthoudt.
  chestButton() {
    const chest = button('slot chest', 'chest', 'Alle blokken');
    let timer = null;
    chest.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      try { chest.setPointerCapture(e.pointerId); } catch { /* niet erg */ }
      chest.classList.add('pressed');
      this.picked = false;
      timer = setTimeout(() => { this.picking = true; chest.classList.add('picking'); }, 350);
    });
    const end = (open) => {
      clearTimeout(timer);
      chest.classList.remove('pressed', 'picking');
      this.picking = false;
      if (open && !this.picked) this.h.onChest(); // lang vastgehouden zonder te kopiëren: dan toch de kist
    };
    chest.addEventListener('pointerup', () => end(true));
    chest.addEventListener('pointercancel', () => end(false));
    return chest;
  }

  // angle: richting van huis op het scherm (0 = recht vooruit, met de klok mee), of null
  setCompass(angle) {
    if (angle === null) { this.compass.hidden = true; return; }
    this.compass.hidden = false;
    this.compassArrow.style.transform = `rotate(${Math.round(angle * 180 / Math.PI)}deg)`;
  }

  setMode(mode) {
    this.buildBtn.classList.toggle('on', mode === 'build');
    this.breakBtn.classList.toggle('on', mode === 'break');
    this.hud.dataset.mode = mode;
  }

  setFlying(f, climbing = false) {
    this.flyBtn.classList.toggle('on', f);
    // De omlaag-knop is er altijd: vliegend en klimmend omlaag, lopend sluipen, in water duiken
    this.downBtn.hidden = !!this.riding;
    this.downBtn.setAttribute('aria-label', f || climbing ? 'Omlaag' : 'Sluipen');
    this.jumpBtn.innerHTML = f || climbing ? ICONS.up : ICONS.jump;
  }

  setRiding(on) {
    this.flyBtn.innerHTML = on ? ICONS.dismount : ICONS.fly;
    this.flyBtn.setAttribute('aria-label', on ? 'Afstappen' : 'Vliegen');
    this.riding = on;
    this.downBtn.hidden = on;
  }

  setThirdPerson(on) { this.camBtn.classList.toggle('on', on); }
  setMuted(m) { this.soundBtn.innerHTML = m ? ICONS.soundOff : ICONS.soundOn; }
  setMusic(on) { this.musicBtn.innerHTML = on ? ICONS.music : ICONS.musicOff; }
  setPredators(on) {
    this.predatorsBtn.classList.toggle('off', !on);
    this.predatorsBtn.setAttribute('aria-pressed', String(on));
  }

  holdRing(x, y, p) {
    this.holdEl.hidden = false;
    this.holdEl.style.left = x + 'px';
    this.holdEl.style.top = y + 'px';
    this.holdFill.style.strokeDashoffset = String(150.8 * (1 - Math.min(1, p)));
  }

  hideHoldRing() { this.holdEl.hidden = true; }

  // Een kringetje waar je tikte, groen bij bouwen en rood bij slopen
  tapRing(x, y, kind) {
    const r = el('div', 'tap-ring ' + kind);
    r.style.left = x + 'px';
    r.style.top = y + 'px';
    this.tapLayer.appendChild(r);
    setTimeout(() => r.remove(), 450);
  }
}
