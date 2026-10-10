// JippeCraft: hier komt alles samen. Opstarten, de spel-lus, bouwen en slopen.

import { logError } from './errors.js'; // als eerste, zodat ook fouten tijdens het opstarten bewaard worden
import * as THREE from '../lib/three.module.min.js';
import { AIR, B, BLOCKS, OPAQUE, DEFAULT_HOTBAR, PALETTE, SPECIALS, doorId, gateId, isSpecial } from './blocks.js';
import { createAtlas } from './textures.js';
import { World, CHUNK } from './world.js';
import { WorkerPool } from './engine/pool.js';
import { ChunkLoader } from './engine/loader.js';
import { WorldStore } from './engine/save.js';
import { migrateSave, isOldSave } from './engine/migrate.js';
import { GameScene } from './scene.js';
import { Player, EYE } from './player.js';
import { raycast } from './raycast.js';
import { Input } from './input.js';
import { UI } from './ui.js';
import { Sounds } from './audio.js';
import { Music } from './music.js';
import { Particles } from './particles.js';
import { Storage } from './storage.js';
import { Animals } from './animals.js';
import { Avatar } from './avatar.js';
import { Album } from './album.js';
import { buildStamp } from './stamps.js';
import { BIOMES } from './biomes.js';
import { Weather } from './weather.js';
import { Snowmen } from './snowman.js';
import { PerfMeter } from './perf.js';
import { Bench } from './bench.js';
import { VERSION } from './version.js';

const REACH = 12;          // hoe ver weg je nog kunt bouwen
const MAX_UNDO = 300;
const BREAK_TIME = 0.5;    // zo lang vasthouden om een blok te slopen (seconden)
const CAM_BACK = 3.8;      // afstand van de camera achter het poppetje
const CAM_UP = 1.1;        // en zo veel erboven
const RIDE_BACK = 5;       // tijdens het rijden verder weg en hoger,
const RIDE_UP = 1.5;
const RIDE_TILT = -0.24;   // en iets meer naar beneden kijkend, zodat je het dier ziet
const SLOTS = [1, 2, 3, 4, 5, 6];   // zes wereld-plekken, de oude sleutels blijven gelijk

class Game {
  constructor(root) {
    root.textContent = '';
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'view';
    root.appendChild(this.canvas);

    this.atlas = createAtlas();
    this.world = new World();
    this.scene = new GameScene(this.canvas, this.atlas);
    this.player = new Player();
    this.sounds = new Sounds();
    this.music = new Music(this.sounds);
    this.particles = new Particles(this.scene.scene);
    this.animals = new Animals(this.scene.scene, this.particles);
    this.weather = new Weather(this.scene.scene, this.sounds);
    this.snowmen = new Snowmen(this.scene.scene);
    this.avatar = new Avatar(this.scene.scene);
    this.storage = new Storage();
    this.raycaster = new THREE.Raycaster();

    this.hotbar = [...DEFAULT_HOTBAR];
    this.sel = 0;
    this.mode = 'build';
    this.undoStack = [];
    this.playing = false;
    this.edits = 0;
    this.dirty = false;
    this.dirtyAt = 0;
    this.lastPosSave = 0;
    this.flash = null;
    this.breakState = null;
    this.thirdPerson = false;
    this.camDist = 0;
    this.thumb = null;
    this.lastThumb = 0;
    this.fixedQuality = /[?&]vast\b/.test(location.search);
    this.readOnly = false;    // tijdens de meetrit wordt niets bewaard
    this.bench = null;
    this.metas = {};          // korte beschrijving van elke wereldplek (voor het menu)
    this.spawned = new Set(); // chunks die al eens dieren kregen
    this.worldReady = false;
    this.home = null;         // thuis (startplek, later het bed)

    this.ui = new UI(root, this.atlas, {
      onPlay: () => this.play(),
      onMenu: () => this.openMenu(),
      onMode: (m) => this.setMode(m, true),
      onUndo: () => this.undo(),
      onJump: (v) => { this.input.jumpButton = v; },
      onDown: (v) => { this.input.downButton = v; },
      onFly: () => this.player.riding ? this.dismount() : this.toggleFly(),
      onCamera: () => this.toggleCamera(),
      onSelect: (i) => this.select(i),
      onChest: () => this.openChest(),
      onPick: (id) => this.pick(id),
      onToggleSound: () => this.toggleSound(),
      onToggleMusic: () => this.toggleMusic(),
      onTogglePredators: () => this.togglePredators(),
      onAlbum: () => this.album.open(),
      onGoHome: () => this.goHome(),
      getSlots: () => this.slotInfo(),
      onSlot: (n) => this.switchSlot(n),
      onNewWorld: (n, type) => this.newWorld(n, type),
      parent: {
        renderer: () => this.scene.renderer,
        pixelRatio: () => this.scene.pixelRatio,
        savedWorlds: () => this.slotInfo().filter((s) => !s.empty).length,
        fpsOn: () => this.perf.visible,
        onFps: () => this.toggleFps(),
        onBench: () => { this.saveNow(); location.href = location.pathname + '?meet'; },
        onBackup: () => this.backup(),
        onRestore: (data) => this.restore(data),
      },
    });
    this.input = new Input(this.canvas, this.ui.stickBase, this.ui.stickKnob);
    this.input.onKey = (e) => this.key(e);
    this.player.onJump = () => this.sounds.jump();
    this.player.onBounce = () => this.sounds.boing();
    this.particles.onBang = () => this.sounds.bang();

    const settings = this.storage.loadLocal('settings') || {};
    this.sounds.muted = !!settings.muted;
    this.settings = { ...settings, predators: settings.predators !== false, album: Array.isArray(settings.album) ? settings.album : [] };
    this.album = new Album(root, this.settings.album,
      (type) => { this.sounds.unlock(); this.sounds.animal(type); },
      () => { this.settings.album = []; this.saveSettings(); });
    this.animals.setPredators(this.settings.predators);
    this.animals.onCatch = () => { this.sounds.nom(); this.markDirty(); };
    this.music.on = settings.music !== false;
    this.thirdPerson = !!settings.third;
    this.ui.setMuted(this.sounds.muted);
    this.ui.setMusic(this.music.on);
    this.ui.setPredators(this.settings.predators);
    this.ui.setThirdPerson(this.thirdPerson);
    this.perf = new PerfMeter(root);
    this.perf.show(/[?&]fps\b/.test(location.search) || !!this.settings.fps);

    this.store = new WorldStore();
    const cores = navigator.hardwareConcurrency || 2;
    this.pool = new WorkerPool(this.atlas.faceTiles, Math.max(1, Math.min(2, cores - 1)));
    this.loader = new ChunkLoader(this.world, this.scene, this.pool);
    this.world.onChunkAdded = (c) => this.chunkAdded(c);
    this.world.onChunkRemoved = (c) => this.scene.removeChunk(c.key);
    const touch = window.matchMedia?.('(pointer: coarse)').matches;
    this.maxView = touch ? 7 : 10;
    this.setViewDistance(touch ? 6 : 8);
    // ?zicht=3: vaste zichtafstand (de test-browser zonder videokaart is anders erg traag)
    const zicht = location.search.match(/[?&]zicht=(\d+)/);
    if (zicht) this.setViewDistance(Math.max(2, Math.min(12, Number(zicht[1]))));

    window.addEventListener('resize', () => this.resize());
    window.visualViewport?.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      this.last = performance.now() / 1000;
      if (document.hidden) { this.input.releaseAll(); this.saveNow(); this.sounds.suspend(); }
    });
    window.addEventListener('pagehide', () => this.saveNow());
    // Op de iPad mag geluid pas aan na het loslaten van een vinger
    for (const type of ['pointerup', 'touchend', 'keydown']) {
      window.addEventListener(type, () => { this.sounds.unlock(); if (this.playing) this.music.start(); }, true);
    }

    this.frameTimes = [];
    this.warmup = 2;
    this.lowered = false;
  }

  // Opstarten: werelden uit de opslag halen (dat gaat in IndexedDB niet in één keer)
  async init() {
    await this.store.open();
    this.migrateOldSaves();
    await this.migrateToV4();
    this.metas = await this.store.loadMetas(SLOTS.map((n) => 'slot' + n));
    const meta = this.storage.loadLocal('meta') || {};
    this.slot = SLOTS.includes(meta.current) ? meta.current : 1;
    const loaded = await this.loadSlot(this.slot);
    if (!loaded) this.freshWorld('world'); // een nieuwe speler begint in de Grote wereld
    this.savedPos = this.posKey();
    this.scene.rebuildAll(this.world);
    this.scene.precompile();
    this.refreshUI();
    this.ui.showMenu();
    this.resize();
    this.last = performance.now() / 1000;
    requestAnimationFrame((t) => this.frame(t));
    return this;
  }

  // ---------- wereld & bewaren ----------

  setViewDistance(r) {
    this.viewDistance = r;
    this.loader.radius = r;
    this.scene.setViewDistance(r);
  }

  // Een nieuw stuk wereld: soms komen er een paar dieren van dat landschap bij
  chunkAdded(c) {
    if (this.spawned.has(c.key)) return;
    this.spawned.add(c.key);
    if (!this.worldReady || c.edited || this.readOnly) return;
    if (this.animals.spawnInChunk(this.world, c.cx, c.cz, this.player)) this.markDirty();
  }

  // Alles klaarzetten voor een andere wereld
  openWorld(fn) {
    this.worldReady = false;
    this.dismount();
    this.snowmen.clear();
    this.loader.reset();
    this.spawned = new Set();
    fn();
    for (const key of this.world.chunks.keys()) this.spawned.add(key);
    this.worldReady = true;
  }

  freshWorld(type, seed) {
    this.openWorld(() => this.world.generate(type, seed));
    this.resetSlot = true; // bij het eerstvolgende bewaren eerst de oude chunks van deze plek weghalen
    this.player.setPos(this.world.spawnPoint());
    this.player.yaw = 0;
    this.player.pitch = -0.25;
    this.player.flying = false;
    this.home = null;
    this.undoStack = [];
    this.thumb = null;
    this.animals.clear();
    this.animals.populate(this.world);
    this.updateBiome(true);
  }

  makeSave() {
    const p = this.player;
    // Tijdens automatisch bewaren mag Jippe blijven rijden; de bewaarde plek is naast de leeuw.
    const place = p.riding ? this.dismountSpot() : p;
    return {
      v: 4,
      t: Date.now(),
      type: this.world.type,
      seed: this.world.seed,
      classic: this.world.classic,
      player: { x: place.x, y: place.y, z: place.z, yaw: p.yaw, pitch: p.pitch, flying: p.flying },
      home: this.home,
      hotbar: this.hotbar,
      sel: this.sel,
      mode: this.mode,
      animals: this.animals.serialize(),
      snowmen: this.snowmen.serialize(),
      riding: false, // je stapt bij het laden altijd af, naast je dier
      spawned: [...this.spawned],
      thumb: this.thumb,
    };
  }

  // Een bewaarde wereld (v4) openen; `chunks` zijn de bewerkte chunks uit de opslag
  applySave(s, chunks = new Map()) {
    try {
      if (!s || s.v !== 4) return false;
      const p = s.player || {};
      const num = (v, d) => (Number.isFinite(v) ? v : d);
      let pos = null;
      this.resetSlot = false;
      this.openWorld(() => {
        this.world.open({ type: s.type, seed: s.seed || 1, classic: !!s.classic }, chunks);
        const sp = this.world.spawnPoint();
        pos = { x: num(p.x, sp.x), y: num(p.y, sp.y), z: num(p.z, sp.z) };
        // Ver van huis bewaard? Dan dat stuk wereld meteen maken
        this.world.ensureArea(Math.floor(pos.x) - CHUNK, Math.floor(pos.z) - CHUNK, Math.floor(pos.x) + CHUNK, Math.floor(pos.z) + CHUNK);
      });
      for (const key of s.spawned || []) this.spawned.add(key);
      this.player.setPos(pos);
      this.player.yaw = num(p.yaw, 0);
      this.player.pitch = num(p.pitch, -0.25);
      this.player.flying = !!p.flying;
      this.player.unstick(this.world);
      this.home = s.home && Number.isFinite(s.home.x) ? s.home : null;
      this.hotbar = Array.isArray(s.hotbar) && s.hotbar.length === DEFAULT_HOTBAR.length && s.hotbar.every((id) => PALETTE.includes(id))
        ? [...s.hotbar] : [...DEFAULT_HOTBAR];
      this.sel = Number.isInteger(s.sel) && s.sel >= 0 && s.sel < this.hotbar.length ? s.sel : 0;
      this.mode = s.mode === 'break' ? 'break' : 'build';
      // Een omgezette wereld van de eerste versie heeft nog geen dieren: die komen er nu bij
      if (Array.isArray(s.animals)) this.animals.load(s.animals);
      else { this.animals.clear(); this.animals.populate(this.world); }
      this.snowmen.load(s.snowmen);
      this.thumb = typeof s.thumb === 'string' ? s.thumb : null;
      this.undoStack = [];
      this.updateBiome(true);
      return true;
    } catch (e) {
      console.warn('Kon wereld niet laden', e);
      logError(e, 'wereld laden');
      return false;
    }
  }

  async loadSlot(n) {
    const meta = this.metas['slot' + n];
    if (!meta) return false;
    const chunks = await this.store.loadChunks('slot' + n);
    return this.applySave(meta, chunks);
  }

  // De eerste versie had één wereld + "vorige wereld": die worden wereld 1 en 2
  migrateOldSaves() {
    const st = this.storage;
    if (SLOTS.some((n) => st.loadLocal('slot' + n))) return;
    const w = st.loadLocal('world'), b = st.loadLocal('backup');
    const ok = (!w || st.saveLocal('slot1', w)) && (!b || st.saveLocal('slot2', b));
    if (ok && (w || b)) {
      st.saveLocal('world', null);
      st.saveLocal('backup', null);
      st.saveLocal('meta', { current: 1 });
    }
  }

  // Werelden van vóór de eindeloze wereld (localStorage) één keer omzetten naar IndexedDB.
  // De oude versie blijft in localStorage staan als reserve.
  async migrateToV4() {
    const metas = await this.store.loadMetas(SLOTS.map((n) => 'slot' + n));
    for (const n of SLOTS) {
      if (metas['slot' + n]) continue;
      const old = this.storage.loadLocal('slot' + n);
      if (!isOldSave(old)) continue;
      try {
        const { meta, chunks } = migrateSave(old);
        await this.store.save('slot' + n, meta, chunks);
      } catch (e) {
        console.warn('Kon oude wereld niet omzetten', n, e);
        logError(e, 'omzetten wereld ' + n);
      }
    }
  }

  saveNow() {
    if (this.readOnly || !this.worldReady) return Promise.resolve();
    const s = this.makeSave();
    const slot = 'slot' + this.slot;
    if (this.resetSlot) { this.store.clearSlot(slot); this.resetSlot = false; }
    this.metas[slot] = s;
    this.saving = this.store.save(slot, s, this.world.takeUnsaved()).catch((e) => logError(e, 'bewaren'));
    this.saveT = s.t;
    this.dirty = false;
    this.lastPosSave = performance.now() / 1000;
    this.savedPos = this.posKey();
    return this.saving;
  }

  saveSettings() {
    if (this.readOnly) return;
    this.storage.saveLocal('settings', { ...this.settings, muted: this.sounds.muted, music: this.music.on, third: this.thirdPerson });
  }

  // Grof afgeronde plek en kijkrichting: alleen bewaren als die echt veranderd is
  posKey() {
    const p = this.player;
    return [Math.round(p.x), Math.round(p.y), Math.round(p.z), Math.round(p.yaw * 4), p.flying].join(',');
  }

  markDirty() {
    this.dirty = true;
    this.dirtyAt = performance.now() / 1000;
  }

  // Klein plaatje van de wereld voor het werelden-menu
  grabThumb() {
    try {
      const c = this.thumbCanvas || (this.thumbCanvas = document.createElement('canvas'));
      c.width = 192; c.height = 120;
      const src = this.canvas;
      const scale = Math.max(c.width / src.width, c.height / src.height);
      const sw = c.width / scale, sh = c.height / scale;
      c.getContext('2d').drawImage(src, (src.width - sw) / 2, (src.height - sh) / 2, sw, sh, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.7);
    } catch { return this.thumb; }
  }

  captureThumb() {
    this.updateCamera(0);
    this.scene.render();
    this.thumb = this.grabThumb();
  }

  slotInfo() {
    return SLOTS.map((n) => {
      const s = n === this.slot ? { type: this.world.type, thumb: this.thumb } : this.metas['slot' + n];
      return { n, current: n === this.slot, empty: !s, thumb: s?.thumb || null, type: s?.type };
    });
  }

  async switchSlot(n) {
    if (n === this.slot) { this.play(); return; }
    const meta = this.metas['slot' + n];
    if (!meta || this.switching) return;
    this.switching = true;
    try {
      this.captureThumb();
      this.saveNow();
      const chunks = await this.store.loadChunks('slot' + n);
      if (!this.applySave(meta, chunks)) { this.sounds.nope(); return; }
      this.slot = n;
      this.storage.saveLocal('meta', { current: n });
      this.saveT = meta.t;
      this.edits = 0;
      this.scene.rebuildAll(this.world);
      this.refreshUI();
      this.play();
    } finally {
      this.switching = false;
    }
  }

  async newWorld(n, type) {
    if (this.switching) return;
    this.switching = true;
    try {
      if (n !== this.slot) { this.captureThumb(); this.saveNow(); }
      await this.store.clearSlot('slot' + n);
      delete this.metas['slot' + n];
      this.slot = n;
      this.storage.saveLocal('meta', { current: n });
      this.freshWorld(type);
      this.scene.rebuildAll(this.world);
      this.saveNow();
      this.refreshUI();
      this.play();
    } finally {
      this.switching = false;
    }
  }

  // ---------- menu & knoppen ----------

  refreshUI() {
    this.ui.setHotbar(this.hotbar, this.sel);
    this.ui.setMode(this.mode);
    this.ui.setFlying(this.player.flying, this.player.climbing);
  }

  play() {
    this.sounds.unlock();
    this.ui.hideMenu();
    this.ui.closePalette();
    this.playing = true;
    this.input.enabled = true;
    this.sounds.pop();
    this.music.start();
  }

  openMenu() {
    this.playing = false;
    this.input.enabled = false;
    this.input.releaseAll();
    this.captureThumb();
    this.saveNow();
    this.ui.closePalette();
    this.ui.showMenu();
  }

  setMode(m, sound) {
    this.mode = m;
    this.ui.setMode(m);
    if (sound) this.sounds.pop();
    this.markDirty();
  }

  select(i) {
    this.sel = i;
    this.ui.setHotbar(this.hotbar, this.sel);
    if (this.mode !== 'build') this.setMode('build');
    this.sounds.pop();
    this.markDirty();
  }

  openChest() {
    this.input.releaseAll();
    this.ui.openPalette(this.hotbar[this.sel]);
    this.sounds.pop();
  }

  pick(id) {
    const i = this.hotbar.indexOf(id);
    if (i >= 0) this.sel = i;
    else this.hotbar[this.sel] = id;
    this.ui.setHotbar(this.hotbar, this.sel);
    this.setMode('build');
    this.sounds.pop();
  }

  // Waar is thuis? Het bed (later) of de startplek
  homeSpot() {
    if (this.home) return this.home;
    const x = Math.floor(this.world.spawnPoint().x), z = Math.floor(this.world.spawnPoint().z);
    return { x: x + 0.5, y: null, z: z + 0.5 };
  }

  // Met een wolkje glitters naar huis (ook als je op een dier rijdt: dat gaat mee)
  goHome() {
    const p = this.player, target = this.homeSpot();
    const hx = Math.floor(target.x), hz = Math.floor(target.z);
    this.world.ensureArea(hx - 2 * CHUNK, hz - 2 * CHUNK, hx + 2 * CHUNK, hz + 2 * CHUNK);
    this.scene.rebuildAll(this.world);
    this.particles.sparkle(p.x - 0.5, p.y, p.z - 0.5, p.x + 0.5, p.y + 1.8, p.z + 0.5, 40);
    const y = target.y ?? this.world.surfaceY(hx, hz) + 1.01;
    p.setPos({ x: target.x, y, z: target.z });
    p.unstick(this.world);
    p.flying = false;
    this.ui.setFlying(false);
    this.syncRide(0);
    this.particles.sparkle(p.x - 0.5, p.y, p.z - 0.5, p.x + 0.5, p.y + 1.8, p.z + 0.5, 60);
    this.sounds.magic();
    this.updateBiome(true);
    this.markDirty();
  }

  // Het pijltje naar huis: alleen als je verder dan 50 blokken weg bent
  updateCompass() {
    const p = this.player, h = this.homeSpot();
    const dx = h.x - p.x, dz = h.z - p.z;
    if (!this.playing || Math.hypot(dx, dz) < 50) { this.ui.setCompass(null); return; }
    const sin = Math.sin(p.yaw), cos = Math.cos(p.yaw);
    this.ui.setCompass(Math.atan2(dx * cos - dz * sin, -dx * sin - dz * cos));
  }

  toggleFly() {
    const p = this.player;
    p.flying = !p.flying;
    if (p.flying) p.vy = 4;
    this.ui.setFlying(p.flying);
    this.sounds.whoosh();
  }

  toggleCamera() {
    if (this.player.riding) return;
    this.thirdPerson = !this.thirdPerson;
    this.ui.setThirdPerson(this.thirdPerson);
    this.saveSettings();
    this.sounds.pop();
  }

  toggleSound() {
    this.sounds.unlock();
    this.sounds.muted = !this.sounds.muted;
    this.saveSettings();
    this.ui.setMuted(this.sounds.muted);
    this.sounds.pop();
  }

  toggleMusic() {
    this.sounds.unlock();
    this.music.on = !this.music.on;
    this.saveSettings();
    this.ui.setMusic(this.music.on);
    if (this.music.on) this.music.start(); else this.music.stop();
  }

  // Reservekopie van alle werelden (en de instellingen) als bestand
  async backup() {
    this.captureThumb();
    await this.saveNow();
    const data = {
      app: 'JippeCraft', versie: VERSION, datum: new Date().toISOString(),
      instellingen: this.storage.loadLocal('settings'), huidige: this.slot,
      werelden: await this.store.exportAll(SLOTS.map((n) => 'slot' + n)),
    };
    const name = `jippecraft-reservekopie-${data.datum.slice(0, 10)}.json`;
    const file = new File([JSON.stringify(data)], name, { type: 'application/json' });
    // Op de iPad: via het deelmenu (bewaren in Bestanden); anders gewoon downloaden
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: name }); return; } catch (e) { if (e?.name === 'AbortError') return; }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    return data;
  }

  async restore(data) {
    if (data?.app !== 'JippeCraft' || !data.werelden) throw new Error('dit is geen reservekopie van JippeCraft');
    this.readOnly = true; // niets meer bewaren tot het spel opnieuw start
    await this.store.importAll(SLOTS.map((n) => 'slot' + n), data.werelden);
    if (data.instellingen) this.storage.saveLocal('settings', data.instellingen);
    if (SLOTS.includes(data.huidige)) this.storage.saveLocal('meta', { current: data.huidige });
    setTimeout(() => location.reload(), 800);
  }

  toggleFps() {
    this.settings.fps = !this.perf.visible;
    this.perf.show(this.settings.fps);
    this.saveSettings();
  }

  togglePredators() {
    this.settings.predators = !this.settings.predators;
    this.animals.setPredators(this.settings.predators);
    this.ui.setPredators(this.settings.predators);
    this.saveSettings();
    this.sounds.pop();
  }

  key(e) {
    if (e.code === 'Escape') {
      if (this.ui.paletteOpen) this.ui.closePalette();
      else if (this.playing) this.openMenu();
      else this.play();
      return;
    }
    if (this.ui.paletteOpen) return;
    if (e.code === 'KeyF') this.toggleFly();
    else if (e.code === 'KeyE') this.openChest();
    else if (e.code === 'KeyC') this.toggleCamera();
    else if (e.code === 'KeyM') this.toggleMusic();
    else if (e.code === 'KeyQ' || e.code === 'KeyB') this.setMode(this.mode === 'build' ? 'break' : 'build', true);
    else if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey)) this.undo();
    else if (/^Digit[1-9]$/.test(e.code)) this.select(Number(e.code.slice(5)) - 1);
  }

  // ---------- bouwen & slopen ----------

  reach() { return REACH + (this.thirdPerson ? this.camDist : 0); }

  setRay(x, y) {
    const w = window.innerWidth, h = window.innerHeight;
    this.raycaster.setFromCamera(new THREE.Vector2((x / w) * 2 - 1, -(y / h) * 2 + 1), this.scene.camera);
    return this.raycaster.ray;
  }

  rayFrom(x, y) {
    const ray = this.setRay(x, y);
    return raycast(this.world, ray.origin, ray.direction, this.reach());
  }

  // Welke kant kijk je op? (0 = -z, 1 = +x, 2 = +z, 3 = -x)
  facing() {
    const fx = -Math.sin(this.player.yaw), fz = -Math.cos(this.player.yaw);
    if (Math.abs(fx) > Math.abs(fz)) return fx > 0 ? 1 : 3;
    return fz > 0 ? 2 : 0;
  }

  // Het vakje waar iets nieuws komt: tegen het aangetikte vlak, of in een plantje/water
  targetCell(hit, id) {
    const inPlace = BLOCKS[hit.id].replaceable && hit.id !== id;
    return inPlace ? [hit.x, hit.y, hit.z] : [hit.x + hit.nx, hit.y + hit.ny, hit.z + hit.nz];
  }

  act(tap) {
    const mode = tap.alt ? (this.mode === 'build' ? 'break' : 'build') : this.mode;
    this.ui.tapRing(tap.x, tap.y, mode);
    const ray = this.setRay(tap.x, tap.y);
    const reach = this.reach();
    const hit = raycast(this.world, ray.origin, ray.direction, reach);
    const pet = this.animals.pick(ray, reach);
    if (pet && this.animalInFront(pet, hit)) { this.petAnimal(pet.animal); return; }
    if (!hit) return;
    const forceBreak = mode === 'break' && tap.alt;
    if (BLOCKS[hit.id].shape === 'door' && !forceBreak) { this.toggleDoor(hit); return; }
    if (BLOCKS[hit.id].shape === 'gate' && !forceBreak) { this.toggleGate(hit); return; }
    if (hit.id === B.TREASURE && !forceBreak) { this.openTreasure(hit); return; }
    if (hit.id === B.FIREWORK && !forceBreak) { this.launchFirework(hit); return; }
    if (mode === 'build') this.use(hit);
    else if (forceBreak) this.breakBlock(hit);
    else this.hintHold(hit);
  }

  // Staat het dier vóór het blok? (gras, bloemetjes en water staan niet in de weg)
  animalInFront(pet, hit) {
    return !hit || pet.dist < hit.dist || BLOCKS[hit.id].replaceable;
  }

  use(hit) {
    const item = this.hotbar[this.sel];
    if (!isSpecial(item)) { this.placeBlock(hit, item); return; }
    const sp = SPECIALS[item];
    if (sp.kind === 'stamp') this.placeStamp(hit, sp.stamp);
    else this.placeAnimal(hit, sp.animal);
  }

  placeBlock(hit, id) {
    const w = this.world, p = this.player;
    const [x, y, z] = this.targetCell(hit, id);
    const existing = w.get(x, y, z);
    const nb = BLOCKS[id];
    const nope = () => this.sounds.nope();
    if (!w.inside(x, y, z) || !BLOCKS[existing].replaceable || existing === id) return nope();
    if (nb.climb) {
      const supported = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]
        .some(([dx, dy, dz]) => { const id = w.get(x + dx, y + dy, z + dz); return BLOCKS[id].solid || id === B.VINE; });
      if (!supported) return nope();
    } else if (nb.render === 'cross' && !OPAQUE[w.get(x, y - 1, z)]) return nope();
    const f = this.facing();

    if (nb.shape === 'door') {
      // een deur is twee blokken hoog en kijkt naar jou toe
      const up = w.get(x, y + 1, z);
      if (!w.inside(x, y + 1, z) || !BLOCKS[up].replaceable) return nope();
      if (p.overlapsBlock(x, y, z) || p.overlapsBlock(x, y + 1, z)) return nope();
      const d = (f + 2) % 4;
      this.apply([
        { x, y, z, from: existing, to: doorId(d, false, false) },
        { x, y: y + 1, z, from: up, to: doorId(d, true, false) },
      ]);
    } else {
      const place = nb.shape === 'stairs' ? B.STAIRS + f : nb.shape === 'gate' ? gateId(f, false) : id;
      let lift = false;
      if (nb.shape === 'fence' || nb.shape === 'gate') {
        const box = p.box();
        if (x < box[3] && x + 1 > box[0] && z < box[5] && z + 1 > box[2] &&
          y < box[4] && y + 1.5 > box[1]) return nope();
      }
      if (BLOCKS[place].solid && p.overlapsBlock(x, y, z)) {
        // Bouw je onder je eigen voeten? Dan wip je erbovenop: zo bouw je een toren
        if (nb.shape !== 'fence' && nb.shape !== 'gate' && p.canLiftOver(w, y)) lift = true;
        else return nope();
      }
      this.apply([{ x, y, z, from: existing, to: place }]);
      if (place === B.PUMPKIN && this.snowmen.list.length < 20 &&
        w.get(x, y - 1, z) === B.SNOW && w.get(x, y - 2, z) === B.SNOW) {
        const changes = this.undoStack.at(-1);
        changes.push({ x, y, z, from: B.PUMPKIN, to: AIR },
          { x, y: y - 1, z, from: B.SNOW, to: AIR },
          { x, y: y - 2, z, from: B.SNOW, to: AIR });
        for (const c of changes.slice(1)) w.set(c.x, c.y, c.z, c.to);
        changes.snowman = this.snowmen.spawn(x + .5, y - 2, z + .5, p.yaw + Math.PI);
        this.particles.sparkle(x, y - 2, z, x + 1, y + 1, z + 1, 50);
        this.sounds.magic();
      }
      if (lift) p.liftTo(y + 1);
    }
    this.sounds.place(nb.sound);
    this.particles.burst(x, y, z, [[1, 1, 1], [0.92, 0.95, 1]], 7, true);
    this.flash = { x, y, z, until: performance.now() / 1000 + 0.35 };
  }

  placeStamp(hit, kind) {
    const [x, y, z] = this.targetCell(hit, -1);
    const changes = buildStamp(kind, this.world, x, y, z, this.facing());
    if (!changes.length) { this.sounds.nope(); return; }
    this.apply(changes);
    this.player.unstick(this.world);
    let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    for (const c of changes) {
      lo = [Math.min(lo[0], c.x), Math.min(lo[1], c.y), Math.min(lo[2], c.z)];
      hi = [Math.max(hi[0], c.x + 1), Math.max(hi[1], c.y + 1), Math.max(hi[2], c.z + 1)];
    }
    this.particles.sparkle(lo[0], lo[1], lo[2], hi[0], hi[1], hi[2], 80);
    this.sounds.magic();
  }

  placeAnimal(hit, type) {
    const w = this.world, p = this.player;
    const [x, y, z] = this.targetCell(hit, -1);
    if (!w.inside(x, y, z) || BLOCKS[w.get(x, y, z)].solid || this.animals.full) { this.sounds.nope(); return; }
    const yaw = Math.atan2(-(p.x - x - 0.5), -(p.z - z - 0.5));
    const a = this.animals.spawn(type, x + 0.5, y, z + 0.5, yaw);
    if (!a) { this.sounds.nope(); return; }
    // De kleine boerderijdieren houden de vertrouwde plaatsingsregel uit fase 2.
    if (a.def.dieet !== 'boerderij' && !a.clearAt(w, a.x, a.y, a.z)) { this.animals.remove(a); this.sounds.nope(); return; }
    this.sounds.animal(type);
    this.particles.heartsAt(x + 0.5, y + 1.1, z + 0.5);
    this.markDirty();
  }

  petAnimal(a) {
    if (a.tame && a.def.rijdbaar) { this.mountAnimal(a); return; }
    this.animals.stopHunt(a, 30);
    a.pet(this.player.x, this.player.z);
    this.sounds.animal(a.type);
    if (this.album.discover(a.type)) {
      this.settings.album = [...this.album.known];
      this.saveSettings();
      this.sounds.magic();
    }
    let heartSize = 1;
    if (a.def.rijdbaar && (a.type === 'lion' || a.type === 'lioness')) {
      const now = performance.now() / 1000;
      a.tameClicks = now <= a.tameUntil ? a.tameClicks + 1 : 1;
      a.tameUntil = now + 10;
      heartSize = 1 + (a.tameClicks - 1) * 0.4;
      if (a.tameClicks >= 3) {
        a.tame = true; a.hunger = 180 + Math.random() * 180;
        a.tameClicks = 0; a.tameUntil = 0; a.show(0);
        this.particles.sparkle(a.x - 0.7, a.y, a.z - 0.7, a.x + 0.7, a.y + 1.8, a.z + 0.7, 70);
        this.sounds.magic();
        this.markDirty();
      }
    }
    this.particles.heartsAt(a.x, a.y + a.def.h + 0.15, a.z, heartSize);
  }

  mountAnimal(a) {
    const p = this.player;
    if (p.riding || !a.tame || !a.def.rijdbaar) return false;
    p.riding = a;
    if (p.collides(this.world, a.x, a.y, a.z)) { p.riding = null; this.sounds.nope(); return false; }
    this.animals.stopHunt(a);
    p.setPos({ x: a.x, y: a.y, z: a.z }); p.yaw = a.yaw; p.flying = false; p.onGround = a.onGround;
    a.riding = true; a.walking = false; a.sleep = 0; a.state = 'bereden';
    this.rideCamera = this.thirdPerson;
    this.thirdPerson = true; this.ui.setThirdPerson(true);
    this.ui.setFlying(false); this.ui.setRiding(true);
    this.input.releaseAll(); this.sounds.magic(); this.markDirty();
    return true;
  }

  dismountSpot() {
    const p = this.player, riding = p.riding;
    p.riding = null;
    // Probeer beide zijkanten; blijf bij de leeuw als er geen vrije plek is.
    const sideX = Math.cos(p.yaw), sideZ = -Math.sin(p.yaw);
    let next = { x: p.x, y: p.y, z: p.z };
    for (const sign of [1, -1]) {
      const x = p.x + sign * sideX * 1.5, z = p.z + sign * sideZ * 1.5;
      const y = this.world.surfaceY(Math.floor(x), Math.floor(z)) + 1;
      if (Math.abs(y - p.y) <= 1.5 && !p.collides(this.world, x, y, z)) { next = { x, y, z }; break; }
    }
    p.riding = riding;
    return next;
  }

  dismount() {
    const p = this.player, a = p.riding;
    if (!a) return false;
    const next = this.dismountSpot();
    p.riding = null; a.riding = false; a.walking = false; a.sleep = 2; a.state = 'slapen';
    p.setPos(next); p.onGround = true;
    this.thirdPerson = this.rideCamera; this.ui.setThirdPerson(this.thirdPerson);
    this.ui.setRiding(false); this.ui.setFlying(false);
    this.sounds.pop(); this.markDirty();
    return true;
  }

  syncRide(dt) {
    const p = this.player, a = p.riding;
    if (!a) return;
    a.x = p.x; a.y = p.y; a.z = p.z; a.yaw = p.yaw; a.targetYaw = p.yaw;
    a.state = 'bereden'; a.walking = false; a.phase += Math.hypot(p.vx, p.vz) * dt * 2.7;
    a.swing = Math.min(1, Math.hypot(p.vx, p.vz) / 4);
    a.sync(); a.show(dt);
  }

  toggleDoor(hit) {
    const w = this.world, b = BLOCKS[hit.id];
    const y0 = b.upper ? hit.y - 1 : hit.y;
    const open = !b.open;
    const before = [w.get(hit.x, y0, hit.z), w.get(hit.x, y0 + 1, hit.z)];
    before.forEach((id, i) => {
      const d = BLOCKS[id];
      if (d.shape === 'door') w.set(hit.x, y0 + i, hit.z, doorId(d.dir, d.upper, open));
    });
    // Zou de deur dicht in de speler zitten? Dan blijft hij open.
    if (this.player.collides(w, this.player.x, this.player.y, this.player.z)) {
      before.forEach((id, i) => w.set(hit.x, y0 + i, hit.z, id));
      this.sounds.nope();
      return;
    }
    this.sounds.door();
    this.markDirty();
  }

  toggleGate(hit) {
    const w = this.world, b = BLOCKS[hit.id];
    w.set(hit.x, hit.y, hit.z, gateId(b.dir, !b.open));
    if (this.player.collides(w, this.player.x, this.player.y, this.player.z) ||
      this.animals.list.some((a) => Math.abs(a.x - hit.x - 0.5) < 2 && Math.abs(a.z - hit.z - 0.5) < 2 &&
        Math.abs(a.y - hit.y) < 3 && !a.clearAt(w, a.x, a.y, a.z))) {
      w.set(hit.x, hit.y, hit.z, hit.id); this.sounds.nope(); return;
    }
    this.sounds.door(); this.markDirty();
  }

  launchFirework(hit) {
    this.apply([{ x: hit.x, y: hit.y, z: hit.z, from: hit.id, to: AIR }]);
    this.particles.firework(hit.x + 0.5, hit.y + 0.6, hit.z + 0.5);
    this.sounds.launch();
  }

  openTreasure(hit) {
    this.apply([{ x: hit.x, y: hit.y, z: hit.z, from: B.TREASURE, to: B.TREASURE_OPEN }]);
    this.particles.sparkle(hit.x - .4, hit.y + .2, hit.z - .4,
      hit.x + 1.4, hit.y + 2, hit.z + 1.4, 100);
    this.particles.burst(hit.x, hit.y, hit.z, [[1, .78, .12], [1, .94, .5]], 45, true);
    this.sounds.magic();
  }

  // Kort tikken in de sloop-stand: laat zien dat je moet vasthouden
  hintHold(hit) {
    this.sounds.tick();
    this.particles.burst(hit.x, hit.y, hit.z, this.atlas.particleColors[hit.id] || [[1, 1, 1]], 3);
  }

  breakBlock(hit) {
    const w = this.world, b = BLOCKS[hit.id];
    if (!b.breakable) { this.sounds.nope(); return; }
    const { x, y, z } = hit;
    // Een gat naast water loopt vol met water
    let to = AIR;
    if (hit.id !== B.WATER) {
      const wet = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0]].some(([dx, dy, dz]) => w.get(x + dx, y + dy, z + dz) === B.WATER);
      if (wet) to = B.WATER;
    }
    if (to === hit.id) { this.sounds.nope(); return; }
    const changes = [{ x, y, z, from: hit.id, to }];
    if (b.shape === 'door') {
      const oy = b.upper ? y - 1 : y + 1;
      const other = w.get(x, oy, z);
      if (BLOCKS[other].shape === 'door') changes.push({ x, y: oy, z, from: other, to: AIR });
    }
    const above = w.get(x, y + 1, z);
    if (BLOCKS[above].render === 'cross' && !BLOCKS[above].climb) changes.push({ x, y: y + 1, z, from: above, to: AIR });
    this.apply(changes);
    this.sounds.break(b.sound);
    this.particles.burst(x, y, z, this.atlas.particleColors[BLOCKS[hit.id].family] || this.atlas.particleColors[hit.id], 18);
  }

  apply(changes) {
    for (const c of changes) this.world.set(c.x, c.y, c.z, c.to);
    this.undoStack.push(changes);
    if (this.undoStack.length > MAX_UNDO) this.undoStack.shift();
    this.edits++;
    this.markDirty();
  }

  undo() {
    const changes = this.undoStack.pop();
    if (!changes) { this.sounds.nope(); return; }
    if (changes.snowman) this.snowmen.remove(changes.snowman);
    for (let i = changes.length - 1; i >= 0; i--) {
      const c = changes[i];
      this.world.set(c.x, c.y, c.z, c.from);
    }
    const c = changes[0];
    this.particles.burst(c.x, c.y, c.z, [[1, 1, 0.7], [1, 1, 1]], 8, true);
    this.player.unstick(this.world);
    this.sounds.undo();
    this.edits++;
    this.markDirty();
  }

  // Vasthouden in de sloop-stand: het rondje loopt vol en het blok krijgt scheurtjes
  updateHold(dt) {
    const h = this.playing && !this.ui.paletteOpen && this.mode === 'break' ? this.input.hold : null;
    const stop = () => { this.ui.hideHoldRing(); this.scene.showCrack(null); };
    if (!h) {
      if (this.breakState) { this.breakState = null; stop(); }
      return;
    }
    const ray = this.setRay(h.sx, h.sy);
    const reach = this.reach();
    const hit = raycast(this.world, ray.origin, ray.direction, reach);
    const pet = this.animals.pick(ray, reach);
    const valid = hit && BLOCKS[hit.id].breakable && BLOCKS[hit.id].shape !== 'door' && hit.id !== B.FIREWORK &&
      !(pet && this.animalInFront(pet, hit));
    const key = valid ? hit.x + ',' + hit.y + ',' + hit.z : null;
    if (!this.breakState || this.breakState.key !== key || this.breakState.ptr !== h) {
      this.breakState = { key, t: 0, ptr: h, tick: 0 };
    }
    const st = this.breakState;
    st.t += dt;
    if (!valid) { stop(); return; }
    const progress = st.t / BREAK_TIME;
    if (st.t > 0.12 || h.didBreak) {
      this.ui.holdRing(h.sx, h.sy, progress);
      this.scene.showCrack(hit, Math.floor(progress * 4));
      st.tick -= dt;
      if (st.tick <= 0) {
        st.tick = 0.12;
        this.sounds.tick();
        this.particles.burst(hit.x, hit.y, hit.z, this.atlas.particleColors[hit.id] || [[1, 1, 1]], 2);
      }
    }
    if (progress >= 1) {
      this.breakBlock(hit);
      h.didBreak = true;
      this.breakState = null;
      stop();
    }
  }

  // ---------- de spel-lus ----------

  updateBiome(instant = false) {
    const biome = this.world.biomeAt(this.player.x, this.player.z);
    if (!instant && biome === this.biomeNow && this.world.type === 'world') return; // Avontuur mengt ook binnen een gebied
    this.biomeNow = biome;
    this.scene.setBiome(this.world.biomeView(this.player.x, this.player.z), instant);
    this.weather.setBiome(biome);
    this.music.setStyle(BIOMES[biome].muziek);
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.scene.resize(w, h);
  }

  updateCamera(dt) {
    const p = this.player, cam = this.scene.camera;
    if (this.thirdPerson) {
      // camera schuin boven en achter het poppetje (dan staat het poppetje niet midden in beeld),
      // en niet door muren heen
      const cp = Math.cos(p.pitch), riding = !!p.riding;
      const origin = new THREE.Vector3(p.x, p.y + 1.45, p.z);
      const want = new THREE.Vector3(Math.sin(p.yaw) * cp, -Math.sin(p.pitch), Math.cos(p.yaw) * cp)
        .multiplyScalar(riding ? RIDE_BACK : CAM_BACK).add(new THREE.Vector3(0, riding ? RIDE_UP : CAM_UP, 0));
      const len = want.length();
      const dir = want.divideScalar(len);
      const wall = raycast(this.world, origin, dir, len, (id) => OPAQUE[id] === 1);
      const dist = wall ? Math.max(0.4, wall.dist - 0.3) : len;
      this.camDist = dist < this.camDist || !dt ? dist : this.camDist + (dist - this.camDist) * Math.min(1, dt * 4);
      cam.position.copy(origin).addScaledVector(dir, this.camDist);
    } else {
      this.camDist = 0;
      cam.position.set(p.x, p.y + EYE, p.z);
    }
    cam.rotation.set(Math.max(-1.55, p.pitch + (this.thirdPerson && p.riding ? RIDE_TILT : 0)), p.yaw, 0);
  }

  frame(t) {
    requestAnimationFrame((tt) => this.frame(tt));
    const t0 = performance.now();
    const now = t / 1000;
    const rawDt = now - this.last; // echte tijd sinds het vorige beeldje, voor het meten
    const realDt = this.playing && !document.hidden ? Math.min(1, Math.max(0, now - this.last)) : 0;
    const dt = Math.min(0.05, Math.max(0, now - this.last));
    this.last = now;
    const p = this.player;

    this.input.poll();
    if (this.bench) {
      this.bench.step(Math.min(0.25, Math.max(0, rawDt)));
      this.input.takeLook();
      this.input.taps.length = 0;
    } else if (this.playing && !this.ui.paletteOpen) {
      const [dx, dy] = this.input.takeLook();
      p.yaw -= dx;
      p.pitch = Math.max(-1.55, Math.min(1.55, p.pitch - dy));
      for (const tap of this.input.taps.splice(0)) this.act(tap);
      const wasClimbing = p.climbing;
      p.update(dt, this.input, this.world, now);
      this.syncRide(dt);
      if (wasClimbing !== p.climbing) this.ui.setFlying(p.flying, p.climbing);
    } else {
      this.input.takeLook();
      this.input.taps.length = 0;
      if (this.ui.menuOpen) p.yaw += dt * 0.06; // langzaam rondkijken achter het menu
    }
    this.updateHold(dt);
    this.updateCamera(dt);
    this.avatar.update(dt, p, this.thirdPerson);

    // Randje om het blok onder de muis, of kort om het blok dat je net bouwde
    let hl = null;
    if (this.flash && now < this.flash.until) hl = this.flash;
    else if (this.playing && this.input.hover && !this.ui.paletteOpen) hl = this.rayFrom(this.input.hover.x, this.input.hover.y);
    this.scene.showHighlight(hl);

    this.scene.updateChunks(this.world, this.scene.pixelRatio < 1.5 ? 2 : 3);
    this.loader.update(p.x, p.z, -Math.sin(p.yaw), -Math.cos(p.yaw));
    this.updateCompass();
    this.animals.update(this.playing ? dt : 0, this.world, this.player, this.scene.camera, realDt);
    this.snowmen.update(this.playing ? dt : 0, this.world);
    this.weather.update(dt, this.world, this.player, this.scene.pixelRatio, this.playing && !document.hidden);
    this.particles.update(dt, this.world);
    this.scene.updateClouds(dt);
    if ((this.world.type === 'adventure' || this.world.type === 'world') && now >= (this.nextBiome || 0)) {
      this.updateBiome(); this.nextBiome = now + 0.5;
    }
    this.scene.updateBiome(dt);
    this.scene.render();
    this.bench?.after(rawDt, this.scene.renderer.info);
    if (this.playing && !this.readOnly && now - this.lastThumb > 30) { this.thumb = this.grabThumb(); this.lastThumb = now; }

    // Automatisch bewaren
    if (this.dirty && now - this.dirtyAt > 1.5) this.saveNow();
    else if (this.playing && now - this.lastPosSave > 20) {
      if (this.posKey() !== this.savedPos) this.saveNow();
      else this.lastPosSave = now;
    }

    this.adaptQuality(dt);
    this.perf.record(rawDt, performance.now() - t0);
    if (this.perf.visible) {
      const info = this.scene.renderer.info.render;
      this.perf.draw(now, {
        calls: info.calls, triangles: info.triangles, chunks: `${this.loader.pending} (${this.world.chunks.size})`,
        animals: this.animals.list.length, pixelRatio: this.scene.pixelRatio,
        width: this.canvas.width, height: this.canvas.height,
      });
    }
  }

  // Houdt de iPad het niet bij, dan tekenen we minder scherp; is hij snel, dan juist scherper
  adaptQuality(dt) {
    if (this.fixedQuality) return;
    this.frameTimes.push(dt);
    if (this.frameTimes.length < 90) return;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.frameTimes.length = 0;
    if (this.warmup > 0) { this.warmup--; return; }
    const sc = this.scene;
    if (avg > 1 / 42) {
      // Te traag: eerst minder scherp, daarna minder ver kijken
      if (sc.pixelRatio > 1) { sc.setPixelRatio(sc.pixelRatio - 0.25); this.resize(); }
      else if (this.viewDistance > 4) this.setViewDistance(this.viewDistance - 1);
      else if (sc.pixelRatio > 0.75) { sc.setPixelRatio(0.75); this.resize(); }
      else if (this.viewDistance > 3) this.setViewDistance(3);
      this.lowered = true;
    } else if (avg < 1 / 57 && !this.lowered) {
      // Snel genoeg: eerst scherper, daarna verder kijken
      if (sc.pixelRatio < sc.maxPixelRatio) { sc.setPixelRatio(Math.min(sc.maxPixelRatio, sc.pixelRatio + 0.25)); this.resize(); }
      else if (this.viewDistance < this.maxView) this.setViewDistance(this.viewDistance + 1);
    }
  }
}

async function start() {
  const root = document.getElementById('app');
  try {
    const game = new Game(root);
    await game.init();
    window.__jippecraft = game;
    // ?meet = meetrit (30 seconden), ?meet=10 = 10 seconden
    const meet = location.search.match(/[?&]meet(?:=(\d+))?(?:&|$)/);
    if (meet) game.bench = new Bench(game, meet[1] ? Number(meet[1]) : 30);
  } catch (e) {
    console.error(e);
    logError(e, 'opstarten');
    root.innerHTML = '<div class="error"><h1>Oeps!</h1><p>Dit apparaat kan het spel niet laten zien. Werk de iPad bij via Instellingen &rarr; Algemeen &rarr; Software-update.</p></div>';
  }
  // Offline spelen (alleen als het spel op een eigen website staat)
  if ('serviceWorker' in navigator && window.top === window && !window.claude &&
    (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

// Geen zoomen, scrollen of selecteren op de iPad
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());
document.addEventListener('touchmove', (e) => { if (!e.target.closest?.('.palette-grid, .menu-card, .album-grid, .bench-card')) e.preventDefault(); }, { passive: false });

start();
