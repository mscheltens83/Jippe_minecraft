// Eén album voor alle werelden. Stickers komen uit de echte 3D-modellen.
import * as THREE from '../lib/three.module.min.js';
import { Animal } from './animals/core.js';
import { SPECIES } from './animals/species.js';
import { ICONS, iconURL } from './icons.js';
import { QUESTS, QUEST_GROUPS } from './quests.js';
import { speech } from './speech.js';

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
  constructor(root, known, onSound, onClear, quests = null, onClearStickers = null) {
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
    for (const [key, icon, label] of [['dieren', 'pig', 'Dieren'], ['stickers', 'star', 'Stickers']]) {
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
    const foot = document.createElement('div'); foot.className = 'album-foot';
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
  close() { this.overlay.hidden = true; this.confirm.hidden = true; }
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
    this.clearLabel.textContent = this.tab === 'stickers' ? 'Stickers leegmaken' : 'Album leegmaken';
    if (this.tab === 'stickers') { this.renderStickers(); return; }
    const scroll = this.grid.scrollTop;
    this.count.textContent = `${this.known.size} van ${Object.keys(SPECIES).length} dieren gevonden`;
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
      for (const type of Object.keys(SPECIES)) {
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
