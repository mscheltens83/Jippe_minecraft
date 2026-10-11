// Eén album voor alle werelden. Stickers komen uit de echte 3D-modellen.
import * as THREE from '../lib/three.module.min.js';
import { Animal } from './animals/core.js';
import { SPECIES, ANIMAL_TYPES } from './animals/species.js';
import { ICONS, iconURL } from './icons.js';
import { QUESTS, QUEST_GROUPS, QUEST_BY_ID } from './quests.js';
import { speech } from './speech.js';
import { Avatar } from './avatar.js';
import { HATS, CAPES, SHIRTS, PANTS, STICKER_PRIZES } from './wardrobe.js';

const GROUPS = [
  { title: 'Boerderij', icon: 'island', types: ['pig', 'chicken', 'sheep'] },
  { title: 'Savanne', icon: 'savanna', types: ['lion', 'lioness', 'cheetah', 'elephant', 'giraffe', 'zebra', 'hippo', 'meerkat'] },
  { title: 'Jungle', icon: 'jungle', types: ['tiger', 'monkey', 'parrot', 'panda', 'frog', 'sloth'] },
  { title: 'Woestijn', icon: 'desert', types: ['camel', 'fennec', 'lizard', 'turtle'] },
  { title: 'Toendra', icon: 'tundra', types: ['polarBear', 'penguin', 'reindeer', 'arcticFox', 'seal', 'snowyOwl'] },
  { title: 'Vlakte en bos', icon: 'tree', types: ['cow', 'horse', 'dog', 'cat', 'rabbit', 'fox', 'bee'] },
  { title: 'Bergen', icon: 'bigWorld', types: ['goat', 'llama'] },
  { title: 'Zee', icon: 'worlds', types: ['fish', 'dolphin', 'squid'] },
  { title: 'Dorp', icon: 'house', types: ['villager', 'golem'] },
  { title: "Dino's", icon: 'dino', types: ['trex', 'brachio', 'triceratops', 'stegosaurus', 'parasaur', 'pteranodon', 'raptor'] },
];

function button(cls, icon, label) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = cls; b.innerHTML = ICONS[icon]; b.setAttribute('aria-label', label);
  return b;
}

// Het boek heeft tabbladen: de dieren die je vond, en (fase 5B) de stickers van de opdrachtjes
export class Album {
  constructor(root, known, onSound, onClear, quests = null, onClearStickers = null, wardrobe = null, onDress = null) {
    this.wardrobe = wardrobe; this.onDress = onDress;
    this.known = new Set((known || []).filter((type) => SPECIES[type]));
    this.onSound = onSound; this.onClear = onClear;
    this.quests = quests; this.onClearStickers = onClearStickers; this.tab = 'dieren'; this.lastTip = null;
    this.stickers = new Map(); this.preparing = false;
    this.overlay = document.createElement('div');
    this.overlay.className = 'overlay album'; this.overlay.hidden = true;
    const card = document.createElement('div'); card.className = 'album-card';
    const head = document.createElement('div'); head.className = 'album-head';
    const title = document.createElement('h2'); title.innerHTML = `${ICONS.book}<span>Mijn boek</span>`;
    const close = button('btn close-btn', 'close', 'Album sluiten');
    close.addEventListener('click', () => this.close());
    const tabs = document.createElement('div'); tabs.className = 'album-tabs';
    this.tabs = {};
    for (const [key, icon, label] of [['dieren', 'pig', 'Dieren'], ['stickers', 'star', 'Stickers'], ['kleren', 'hatCrown', 'Verkleden']]) {
      const t = button('album-tab', icon, label);
      t.insertAdjacentHTML('beforeend', `<span>${label}</span>`);
      t.addEventListener('click', () => { this.tab = key; this.confirm.hidden = true; this.render(); this.grid.scrollTop = 0; });
      this.tabs[key] = t; tabs.appendChild(t);
    }
    head.append(title, tabs, close);
    this.count = document.createElement('p'); this.count.className = 'album-count';
    // Stickers: een knop die een opdrachtje kiest en voorleest, en een tekstballon
    this.tipRow = document.createElement('div'); this.tipRow.className = 'quest-tip-row';
    const tip = button('btn quest-tip', 'speak', 'Wat zal ik doen?');
    tip.insertAdjacentHTML('beforeend', '<span>Wat zal ik doen?</span>');
    tip.addEventListener('click', () => this.suggest());
    this.bubble = document.createElement('p'); this.bubble.className = 'quest-bubble'; this.bubble.hidden = true;
    this.tipRow.append(tip, this.bubble);
    this.grid = document.createElement('div'); this.grid.className = 'album-grid';
    const foot = this.foot = document.createElement('div'); foot.className = 'album-foot';
    const clear = button('btn album-clear', 'trash', 'Album leegmaken');
    const clearLabel = document.createElement('span'); clearLabel.textContent = 'Album leegmaken';
    clear.addEventListener('click', () => {
      question.textContent = this.tab === 'stickers' ? 'Alle stickers uit het boek halen?' : 'Alle stickers uit het album halen?';
      this.confirm.hidden = false;
    });
    this.clearLabel = clearLabel;
    foot.append(clear, clearLabel);
    card.append(head, this.count, this.tipRow, this.grid, foot);
    this.overlay.appendChild(card);
    this.overlay.addEventListener('pointerdown', (e) => { if (e.target === this.overlay) this.close(); });
    this.confirm = document.createElement('div'); this.confirm.className = 'album-confirm'; this.confirm.hidden = true;
    const question = document.createElement('p'); question.textContent = 'Alle stickers uit het album halen?';
    const yes = button('btn yes', 'check', 'Ja, leegmaken');
    const no = button('btn no', 'close', 'Nee, bewaren');
    yes.addEventListener('click', () => {
      if (this.tab === 'stickers') { this.quests?.clear(); this.onClearStickers?.(); } else { this.known.clear(); this.onClear(); }
      this.confirm.hidden = true; this.render();
    });
    no.addEventListener('click', () => { this.confirm.hidden = true; });
    this.confirm.append(question, yes, no);
    this.overlay.appendChild(this.confirm);
    root.appendChild(this.overlay);
    this.notice = document.createElement('div'); this.notice.className = 'album-new'; this.notice.hidden = true;
    this.notice.setAttribute('aria-live', 'polite');
    root.appendChild(this.notice);
  }

  open() {
    this.overlay.hidden = false;
    this.confirm.hidden = true;
    this.render();
    if (!this.stickers.size) setTimeout(() => this.prepare(), 0);
  }
  close() {
    this.overlay.hidden = true; this.confirm.hidden = true;
    this.previewRenderer?.dispose(); this.previewRenderer?.forceContextLoss(); this.previewRenderer = null;
  }
  get openNow() { return !this.overlay.hidden; }

  discover(type) {
    if (!SPECIES[type] || this.known.has(type)) return false;
    this.known.add(type);
    if (this.openNow) this.render();
    this.showNotice('Nieuw!', this.stickers.get(type) || iconURL(type), SPECIES[type].naam);
    return true;
  }

  showNotice(title, img, label) {
    // Komt er een tweede bij terwijl de eerste nog in beeld is? Dan na elkaar
    if (!this.notice.hidden) { (this.noticeQueue ||= []).push([title, img, label]); return; }
    this.lastNotice = { title, label }; // voor de tests: het bordje staat maar even in beeld
    this.notice.innerHTML = `<span>${title}</span><img src="${img}" alt=""><strong>${label}</strong>`;
    this.notice.hidden = false;
    const target = document.querySelector('.album-hud-btn')?.getBoundingClientRect();
    if (target) {
      this.notice.style.setProperty('--fly-x', `${target.left + target.width / 2 - innerWidth / 2}px`);
      this.notice.style.setProperty('--fly-y', `${target.top + target.height / 2 - innerHeight * .45}px`);
    }
    this.notice.classList.remove('fly'); void this.notice.offsetWidth; this.notice.classList.add('fly');
    clearTimeout(this.noticeTimer);
    this.noticeTimer = setTimeout(() => {
      this.notice.hidden = true;
      const next = this.noticeQueue?.shift();
      if (next) this.showNotice(...next);
    }, 2200);
  }

  // Verkleden (fase 5C): kies een hoed, een cape en de kleur van je kleren
  renderWardrobe() {
    const w = this.wardrobe;
    if (!w) return;
    const found = [...w.unlocked].filter((k) => !k.endsWith(':none') && k !== 'hat:cap').length;
    this.count.textContent = `Schatten gevonden: ${found}` + (w.gold ? ` en ${w.gold} keer goud` : '');
    this.grid.textContent = '';
    const top = document.createElement('div'); top.className = 'wardrobe-top';
    this.preview = document.createElement('img'); this.preview.className = 'wardrobe-preview'; this.preview.alt = '';
    top.appendChild(this.preview);
    this.grid.appendChild(top);
    const section = (title, icon, items) => {
      const sec = document.createElement('section'); sec.className = 'album-section';
      const h = document.createElement('h3'); h.innerHTML = `${ICONS[icon]}<span>${title}</span>`;
      const list = document.createElement('div'); list.className = 'album-items wardrobe-items';
      list.append(...items); sec.append(h, list); this.grid.appendChild(sec);
    };
    const pick = (kind, item, key) => {
      const b = document.createElement('button'); b.type = 'button';
      const locked = key && !w.has(key), on = w[kind] === item.id;
      b.className = 'album-sticker wardrobe-item' + (on ? ' found' : '') + (locked ? ' locked' : '');
      b.dataset.item = kind + ':' + item.id;
      b.setAttribute('aria-label', item.naam);
      b.innerHTML = ICONS[item.icon] + (locked ? `<i class="lock">${ICONS.lock}</i>` : '') + `<span>${locked ? '?' : item.naam}</span>`;
      b.addEventListener('click', () => {
        if (locked) {
          const quest = Object.entries(STICKER_PRIZES).find(([, k]) => k === key)?.[0];
          speech.say(quest ? `Die krijg je met een sticker: ${QUEST_BY_ID.get(quest).tekst}` : 'Die vind je in een schatkist!');
          b.classList.remove('bounce'); void b.offsetWidth; b.classList.add('bounce');
          return;
        }
        w[kind] = item.id; this.onDress?.(); this.renderWardrobe();
      });
      return b;
    };
    const color = (kind, c) => {
      const b = document.createElement('button'); b.type = 'button';
      b.className = 'wardrobe-color' + (w[kind] === c ? ' active' : '');
      b.dataset.item = kind + ':' + c;
      b.style.color = c; b.innerHTML = ICONS[kind === 'shirt' ? 'shirt' : 'pants'];
      b.setAttribute('aria-label', kind === 'shirt' ? 'Shirt' : 'Broek');
      b.addEventListener('click', () => { w[kind] = c; this.onDress?.(); this.renderWardrobe(); });
      return b;
    };
    section('Hoed', 'hatCrown', HATS.map((h) => pick('hat', h, 'hat:' + h.id)));
    section('Cape', 'capeRed', CAPES.map((c) => pick('cape', c, 'cape:' + c.id)));
    section('Shirt', 'shirt', SHIRTS.map((c) => color('shirt', c)));
    section('Broek', 'pants', PANTS.map((c) => color('pants', c)));
    this.drawPreview();
  }

  // Een plaatje van het poppetje met deze kleren (een eigen WebGL-doek, zolang het boek open is)
  drawPreview() {
    try {
      if (!this.previewRenderer) {
        const canvas = document.createElement('canvas');
        this.previewRenderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, preserveDrawingBuffer: true });
        this.previewRenderer.setPixelRatio(1); this.previewRenderer.setSize(160, 200, false);
      }
      const scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(-0.75, 0.75, 1.3, -0.6, 0.1, 20);
      const av = new Avatar(scene, this.wardrobe.look);
      av.group.visible = true; av.group.rotation.y = 0.5; // schuin van voren
      cam.position.set(0, 1.3, -6); cam.lookAt(0, 1.0, 0);
      this.previewRenderer.render(scene, cam);
      this.preview.src = this.previewRenderer.domElement.toDataURL('image/png');
      av.group.traverse((o) => o.geometry?.dispose());
    } catch (e) { console.warn('Geen voorbeeld van het poppetje', e); }
  }

  renderStickers() {
    const scroll = this.grid.scrollTop, q = this.quests;
    const done = q ? q.done.size : 0;
    this.count.textContent = `${done} van ${QUESTS.length} stickers`;
    this.grid.textContent = '';
    for (const group of QUEST_GROUPS) {
      const section = document.createElement('section'); section.className = 'album-section';
      const heading = document.createElement('h3'); heading.innerHTML = `${ICONS[group.icon]}<span>${group.title}</span>`;
      const list = document.createElement('div'); list.className = 'album-items';
      for (const quest of QUESTS.filter((x) => x.groep === group.key)) {
        const got = !!q?.done.has(quest.id), part = q ? q.progress(quest) : 0;
        const b = document.createElement('button'); b.type = 'button';
        b.className = 'album-sticker quest' + (got ? ' found' : ' unknown');
        b.dataset.quest = quest.id;
        b.setAttribute('aria-label', quest.tekst);
        b.innerHTML = `${ICONS[quest.icon]}${got ? '' : '<span>?</span>'}` +
          (!got && part > 0 ? `<i class="quest-bar"><b style="width:${Math.round(part * 100)}%"></b></i>` : '');
        // Tikken leest het opdrachtje voor
        b.addEventListener('click', () => {
          this.bubble.textContent = (got ? 'Gedaan! ' : '') + quest.tekst; this.bubble.hidden = false;
          speech.say(quest.tekst);
          b.classList.remove('bounce'); void b.offsetWidth; b.classList.add('bounce');
        });
        list.appendChild(b);
      }
      section.append(heading, list); this.grid.appendChild(section);
    }
    this.grid.scrollTop = scroll;
  }

  // Een opdrachtje dat nog niet gedaan is: laten zien en voorlezen
  suggest() {
    const q = this.quests?.suggest(this.lastTip);
    const text = q ? q.tekst : 'Je hebt alle stickers! Goed zo!';
    this.lastTip = q?.id ?? null;
    this.bubble.textContent = text; this.bubble.hidden = false;
    this.bubble.classList.remove('pop'); void this.bubble.offsetWidth; this.bubble.classList.add('pop');
    speech.say(text);
    return q;
  }

  // Een opdrachtje is net gehaald: de sticker vliegt in beeld en naar het boek
  stickerEarned(q) {
    if (this.openNow) this.render();
    this.showNotice('Sticker!', iconURL(q.icon), q.tekst.replace(/\.$/, ''));
    speech.say('Goed zo! Je hebt een nieuwe sticker!');
  }

  render() {
    for (const [key, t] of Object.entries(this.tabs)) t.classList.toggle('active', key === this.tab);
    this.tipRow.hidden = this.tab !== 'stickers';
    this.foot.hidden = this.tab === 'kleren';
    if (this.tab === 'kleren') { this.renderWardrobe(); return; }
    this.clearLabel.textContent = this.tab === 'stickers' ? 'Stickers leegmaken' : 'Album leegmaken';
    if (this.tab === 'stickers') { this.renderStickers(); return; }
    const scroll = this.grid.scrollTop;
    this.count.textContent = `${this.known.size} van ${ANIMAL_TYPES.length} dieren gevonden`;
    this.grid.textContent = '';
    for (const group of GROUPS) {
      const section = document.createElement('section'); section.className = 'album-section';
      const heading = document.createElement('h3'); heading.innerHTML = `${ICONS[group.icon]}<span>${group.title}</span>`;
      const list = document.createElement('div'); list.className = 'album-items';
      for (const type of group.types) {
        const found = this.known.has(type);
        const b = document.createElement('button'); b.type = 'button';
        b.className = 'album-sticker' + (found ? ' found' : ' unknown');
        b.setAttribute('aria-label', found ? SPECIES[type].naam : 'Nog niet gevonden');
        b.dataset.type = type;
        const img = document.createElement('img'); img.src = this.stickers.get(type) || iconURL(type); img.alt = '';
        const label = document.createElement('span'); label.textContent = found ? SPECIES[type].naam : '?';
        b.append(img, label);
        if (found) b.addEventListener('click', () => {
          this.onSound(type);
          b.classList.remove('bounce'); void b.offsetWidth; b.classList.add('bounce');
        });
        list.appendChild(b);
      }
      section.append(heading, list); this.grid.appendChild(section);
    }
    this.grid.scrollTop = scroll;
  }

  // Een tijdelijk WebGL-doek tekent de figuren één voor één, zonder nieuwe bestanden.
  prepare() {
    if (this.preparing || this.stickers.size) return;
    this.preparing = true;
    let renderer;
    try {
      const canvas = document.createElement('canvas');
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, preserveDrawingBuffer: true });
      renderer.setPixelRatio(1); renderer.setSize(128, 128, false);
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 50);
      for (const type of ANIMAL_TYPES) {
        const a = new Animal(type, 0, 0, 0, Math.PI / 6);
        const def = SPECIES[type], span = Math.max(1.55, def.h * 1.3, def.w * 1.9, def.d * .9);
        camera.left = -span / 2; camera.right = span / 2;
        camera.top = span / 2; camera.bottom = -span / 2;
        camera.position.set(span * .85, def.h * .5 + span * .45, -span * 1.3);
        camera.lookAt(0, def.h * .5, 0); camera.updateProjectionMatrix();
        scene.add(a.group); renderer.render(scene, camera);
        this.stickers.set(type, canvas.toDataURL('image/png'));
        scene.remove(a.group);
      }
    } catch (e) {
      // Een ouder toestel kan een tweede WebGL-context weigeren; SVG-iconen blijven werken.
      console.warn('Album gebruikt diereniconen', e);
    } finally {
      renderer?.dispose(); renderer?.forceContextLoss();
      this.preparing = false;
      if (this.openNow) this.render();
    }
  }
}
