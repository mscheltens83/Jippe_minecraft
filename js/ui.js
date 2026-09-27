// Alles wat je op het scherm ziet bovenop de 3D-wereld: knoppen, onderbalk, kist en menu.

import { ICONS } from './icons.js';
import { BLOCKS, PALETTE } from './blocks.js';
import { drawBlockIcon } from './textures.js';

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

export class UI {
  constructor(root, atlas, h) {
    this.h = h;
    this.icons = {};
    for (const id of PALETTE) this.icons[id] = drawBlockIcon(atlas, id, 96).toDataURL();

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

    const mode = el('div', 'mode');
    this.buildBtn = button('mode-build', 'build', 'Bouwen');
    this.breakBtn = button('mode-break', 'pick', 'Slopen');
    onPress(this.buildBtn, () => h.onMode('build'));
    onPress(this.breakBtn, () => h.onMode('break'));
    mode.append(this.buildBtn, this.breakBtn);
    this.hud.appendChild(mode);

    this.undoBtn = button('undo-btn', 'undo', 'Terug');
    onPress(this.undoBtn, () => h.onUndo());
    this.hud.appendChild(this.undoBtn);

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

    // --- de kist met alle blokken ---
    this.palette = el('div', 'overlay palette');
    this.palette.hidden = true;
    const pcard = el('div', 'palette-card');
    const phead = el('div', 'palette-head');
    phead.appendChild(el('div', 'palette-title', ICONS.chest));
    const pclose = button('close-btn', 'close', 'Sluiten');
    onPress(pclose, () => this.closePalette());
    phead.appendChild(pclose);
    const grid = el('div', 'palette-grid');
    for (const id of PALETTE) {
      const b = el('button', 'pal-item');
      b.type = 'button';
      b.setAttribute('aria-label', BLOCKS[id].name);
      b.innerHTML = `<img src="${this.icons[id]}" alt=""><span>${BLOCKS[id].name}</span>`;
      // 'click' in plaats van meteen bij aanraken, zodat je de kist ook kunt scrollen
      b.addEventListener('click', () => { h.onPick(id); this.closePalette(); });
      grid.appendChild(b);
    }
    pcard.append(phead, grid);
    this.palette.appendChild(pcard);
    this.palette.addEventListener('pointerdown', (e) => { if (e.target === this.palette) this.closePalette(); });
    root.appendChild(this.palette);

    // --- menu / startscherm ---
    this.menu = el('div', 'overlay menu');
    const card = el('div', 'menu-card');
    card.appendChild(el('h1', 'logo', 'Jippe<span>Craft</span>'));

    this.mainPanel = el('div', 'panel');
    this.playBtn = button('play-btn', 'play', 'Spelen');
    onPress(this.playBtn, () => h.onPlay());
    const row = el('div', 'menu-row');
    this.soundBtn = button('small', 'soundOn', 'Geluid');
    onPress(this.soundBtn, () => h.onToggleSound());
    const newBtn = button('small', 'island', 'Nieuwe wereld');
    onPress(newBtn, () => this.showPanel('new'));
    this.restoreBtn = button('small', 'restore', 'Vorige wereld');
    onPress(this.restoreBtn, () => this.showPanel('restore'));
    row.append(labeled(this.soundBtn, 'Geluid'), labeled(newBtn, 'Nieuwe wereld'), labeled(this.restoreBtn, 'Vorige wereld'));
    this.restoreWrap = this.restoreBtn.parentElement;
    this.mainPanel.append(this.playBtn, row);

    this.newPanel = el('div', 'panel');
    this.newPanel.appendChild(el('p', 'hint', 'Wat voor wereld wil je?'));
    const choices = el('div', 'menu-row');
    for (const [type, icon, label] of [['island', 'island', 'Eiland'], ['flat', 'flat', 'Plat']]) {
      const b = button('choice', icon, label);
      onPress(b, () => { this.pendingType = type; this.showPanel('confirm'); });
      choices.appendChild(labeled(b, label));
    }
    const back1 = button('small', 'close', 'Terug');
    onPress(back1, () => this.showPanel('main'));
    this.newPanel.append(choices, labeled(back1, 'Terug'));

    this.confirmPanel = el('div', 'panel');
    this.confirmText = el('p', 'hint');
    const yesNo = el('div', 'menu-row');
    const yes = button('yes', 'check', 'Ja');
    const no = button('no', 'close', 'Nee');
    onPress(yes, () => {
      if (this.confirmAction === 'restore') h.onRestore();
      else h.onNewWorld(this.pendingType);
    });
    onPress(no, () => this.showPanel('main'));
    yesNo.append(labeled(yes, 'Ja'), labeled(no, 'Nee'));
    this.confirmPanel.append(this.confirmText, yesNo);

    card.append(this.mainPanel, this.newPanel, this.confirmPanel);
    this.menu.appendChild(card);
    root.appendChild(this.menu);
    this.showPanel('main');

    this.tapLayer = el('div', 'taps');
    root.appendChild(this.tapLayer);
  }

  showPanel(which) {
    if (which === 'restore') {
      this.confirmAction = 'restore';
      this.confirmText.textContent = 'Wil je je vorige wereld terug? Deze wereld wordt dan de vorige.';
      which = 'confirm';
    } else if (which === 'confirm') {
      this.confirmAction = 'new';
      this.confirmText.textContent = 'Een nieuwe wereld maken? Je huidige wereld wordt bewaard als "vorige wereld".';
    }
    this.mainPanel.hidden = which !== 'main';
    this.newPanel.hidden = which !== 'new';
    this.confirmPanel.hidden = which !== 'confirm';
  }

  setBackupAvailable(has) { this.restoreWrap.hidden = !has; }

  showMenu(hasBackup) {
    this.setBackupAvailable(hasBackup);
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

  openPalette() { this.palette.hidden = false; }
  closePalette() { this.palette.hidden = true; }

  setHotbar(ids, sel) {
    this.hotbar.innerHTML = '';
    ids.forEach((id, i) => {
      const b = el('button', 'slot' + (i === sel ? ' selected' : ''));
      b.type = 'button';
      b.setAttribute('aria-label', BLOCKS[id].name);
      b.innerHTML = `<img src="${this.icons[id]}" alt="">`;
      onPress(b, () => this.h.onSelect(i));
      this.hotbar.appendChild(b);
    });
    const chest = button('slot chest', 'chest', 'Alle blokken');
    onPress(chest, () => this.h.onChest());
    this.hotbar.appendChild(chest);
  }

  setMode(mode) {
    this.buildBtn.classList.toggle('on', mode === 'build');
    this.breakBtn.classList.toggle('on', mode === 'break');
    this.hud.dataset.mode = mode;
  }

  setFlying(f) {
    this.flyBtn.classList.toggle('on', f);
    this.downBtn.hidden = !f;
    this.jumpBtn.innerHTML = f ? ICONS.up : ICONS.jump;
  }

  setMuted(m) {
    this.soundBtn.innerHTML = m ? ICONS.soundOff : ICONS.soundOn;
  }

  // Een kringetje waar je tikte, groen bij bouwen en rood bij slopen
  tapRing(x, y, kind) {
    const r = el('div', 'tap-ring ' + kind);
    r.style.left = x + 'px';
    r.style.top = y + 'px';
    this.tapLayer.appendChild(r);
    setTimeout(() => r.remove(), 450);
  }
}

function labeled(btn, text) {
  const w = el('div', 'labeled');
  w.append(btn, el('span', '', text));
  return w;
}
