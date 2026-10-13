// JippeCraft: hier komt alles samen. Opstarten, de spel-lus, bouwen en slopen.

import { logError } from './errors.js'; // als eerste, zodat ook fouten tijdens het opstarten bewaard worden
import * as THREE from '../lib/three.module.min.js';
import {
  AIR, B, BLOCKS, OPAQUE, WATERY, DIRS, DEFAULT_HOTBAR, PALETTE, SPECIALS, WOODS, MATERIALS, ITEM,
  doorId, gateId, isSpecial, upgradeItemId, torchId, bedId, stairsId, slabId, portalId, TALL_PLANTS,
} from './blocks.js';
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
import { Animals, SPECIES, MAX_ANIMALS } from './animals.js';
import { Avatar } from './avatar.js';
import { Album } from './album.js';
import { buildStamp } from './stamps.js';
import { Quests, hasRoof } from './quests.js';
import { Wardrobe, STICKER_PRIZES } from './wardrobe.js';
import { iconURL } from './icons.js';
import { placeState, neighbourChanges, startCart, stepCart, cartPose, isRail } from './rails.js';
import { switchOn, signalChanges } from './switches.js';
import { speech } from './speech.js';
import { Storm, STOCK_ITEMS } from './storm.js';
import { Farm } from './farm.js';
import { findPortal, portalCells, portalAt, PORTAL_THEMES } from './portal.js';
import { BIOMES } from './biomes.js';
import { Weather } from './weather.js';
import { Snowmen } from './snowman.js';
import { PerfMeter } from './perf.js';
import { Bench } from './bench.js';
import { VERSION } from './version.js';
import { guardNavigation } from './guard.js';
import { DayNight, NOON, sunAmount, glowAmount, sunAngle } from './daynight.js';
import { TINT_KIND } from './engine/tint.js';
import { Physics } from './engine/physics.js';
import { Animal } from './animals/core.js';
import { showTextures } from './texview.js';
import { Hand } from './hand.js';

const REACH = 12;          // hoe ver weg je nog kunt bouwen
const MAX_UNDO = 300;
const BREAK_TIME = 0.5;
// Boerderij in Gevaar (fase 7B): hek, poort, hooi, planken, keien, zaadjes, wortel, fakkel en deur
const FARM_HOTBAR = [B.FENCE, B.GATE, B.HAY, B.PLANKS, B.COBBLE, ITEM.WHEAT_SEEDS, ITEM.CARROT, B.TORCH, B.DOOR];
const FOOD_ITEMS = [ITEM.WHEAT_SEEDS, ITEM.CARROT, ITEM.POTATO];
const STORM_VIEW = 3;      // zichtafstand (chunks) in de Wilde Nacht: verder zie je door de mist toch niet
const STORM_LOD = 14;      // in de Wilde Nacht: dieren verder dan dit (blokken) als één stuk tekenen
const DAY_VIEW = 4, DAY_LOD = 22; // de Wilde Dag heeft geen mist: iets verder kijken
const ANIMAL_HOLD = 1.2;   // zo lang een dier vasthouden (sloop-stand) om het naar huis te sturen    // zo lang vasthouden om een blok te slopen (seconden)
const CAM_BACK = 3.8;      // afstand van de camera achter het poppetje
const CAM_UP = 1.1;        // en zo veel erboven
const RIDE_BACK = 5;       // tijdens het rijden verder weg en hoger,
const RIDE_UP = 1.5;
const RIDE_TILT = -0.24;   // en iets meer naar beneden kijkend, zodat je het dier ziet
const SLOTS = [1, 2, 3, 4, 5, 6];   // zes wereld-plekken, de oude sleutels blijven gelijk
const MIN_LIGHT = 0.18, MIN_LIGHT_BRIGHT = 0.35; // zo donker wordt het hoogstens (ouderinstelling "Grotten lichter")
const TIME_NAMES = { ochtend: 0.97, middag: NOON, avond: 0.66, nacht: 0.8 };

class Game {
  constructor(root) {
    root.textContent = '';
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'view';
    root.appendChild(this.canvas);

    this.atlas = createAtlas();
    this.world = new World();
    this.scene = new GameScene(this.canvas, this.atlas);
    // Na het vertalen van een shader vraagt three.js steeds meteen of het gelukt is: dat laat de iPad
    // wachten. Alleen in de tests (?vast) of met ?debug controleren we dat.
    this.scene.renderer.debug.checkShaderErrors = /[?&](vast|debug)\b/.test(location.search);
    this.player = new Player();
    this.sounds = new Sounds();
    this.music = new Music(this.sounds);
    this.particles = new Particles(this.scene.scene);
    this.particles.setTiles(this.scene.tiles);
    this.animals = new Animals(this.scene.scene, this.particles);
    this.weather = new Weather(this.scene.scene, this.sounds);
    this.snowmen = new Snowmen(this.scene.scene);
    this.avatar = new Avatar(this.scene.scene);
    this.storage = new Storage();
    this.raycaster = new THREE.Raycaster();

    this.hotbar = [...DEFAULT_HOTBAR];
    this.sel = 0;
    this.mode = 'build';
    this.farm = null; // Boerderij in Gevaar (alleen in een boerderij-wereld)
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
    this.home = null;         // thuis (startplek, of het bed)
    this.daynight = new DayNight();
    this.sleeping = false;    // in bed: het scherm wordt even donker

    this.ui = new UI(root, this.atlas, {
      onPlay: () => this.play(),
      onMenu: () => this.openMenu(),
      onMode: (m) => this.setMode(m, true),
      onUndo: () => this.undo(),
      onJump: (v) => { this.input.jumpButton = v; if (v) this.jumpTap(); },
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
      onStorm: () => this.startStorm(),
      onDay: () => this.startStorm({ mode: 'dag' }),
      getSlots: () => this.slotInfo(),
      onSlot: (n) => this.switchSlot(n),
      onNewWorld: (n, type) => this.newWorld(n, type),
      parent: {
        renderer: () => this.scene.renderer,
        pixelRatio: () => this.scene.pixelRatio,
        bootTime: () => this.bootTime,
        savedWorlds: () => this.slotInfo().filter((s) => !s.empty).length,
        fpsOn: () => this.perf.visible,
        onFps: () => this.toggleFps(),
        alwaysDay: () => this.daynight.alwaysDay,
        onAlwaysDay: () => this.setAlwaysDay(!this.daynight.alwaysDay),
        brightCaves: () => !!this.settings.brightCaves,
        onBrightCaves: () => this.setBrightCaves(!this.settings.brightCaves),
        onBench: () => this.leave(location.pathname + '?meet'),
        onBackup: () => this.backup(),
        onRestore: (data) => this.restore(data),
      },
    });
    this.input = new Input(this.canvas, this.ui.stickBase, this.ui.stickKnob);
    this.hand = new Hand(this.scene.camera, this.atlas, this.ui.icons);
    this.input.onKey = (e) => this.key(e);
    this.player.onJump = () => this.sounds.jump();
    this.player.onBounce = () => this.sounds.boing();
    // Zwemrit (5.6): de dolfijn springt uit het water en plonst terug; de walvis spuit bovenaan een fontein
    this.player.onLeap = () => { const p = this.player; this.sounds.animal('dolphin'); this.particles.waterAt(p.x, p.y + 0.3, p.z, 0, 0); this.note('dolphinLeap'); };
    this.player.onSplash = () => { const p = this.player; this.sounds.place('water'); this.particles.waterAt(p.x, p.y + 0.6, p.z, 0, 0); };
    this.player.onSurface = () => {
      const p = this.player, a = p.riding, now = performance.now() / 1000;
      if (a?.type !== 'whale' || now < (this.spoutAt || 0)) return;
      this.spoutAt = now + 2;
      this.particles.waterAt(p.x, p.y + a.def.h + 0.2, p.z, 0, 0); this.sounds.animal('whale');
    };
    this.particles.onBang = () => this.sounds.bang();

    const settings = this.storage.loadLocal('settings') || {};
    this.sounds.muted = !!settings.muted;
    this.settings = { ...settings, predators: settings.predators !== false, album: Array.isArray(settings.album) ? settings.album : [] };
    // Opdrachtjes en stickers (fase 5B): van Jippe, in alle werelden samen
    this.quests = new Quests(settings.stickers || {}, (q) => this.questDone(q));
    // ?stil (de tests): niets hardop voorlezen; het spel onthoudt wel wat het zou zeggen
    speech.silent = /[?&]stil\b/.test(location.search);
    speech.enabled = !this.sounds.muted;
    // Verkleden (fase 5C): wat je aanhebt en wat je al gevonden hebt
    this.wardrobe = new Wardrobe(settings.wardrobe || {});
    this.avatar.build(this.wardrobe.look);
    this.album = new Album(root, this.settings.album,
      (type) => { this.sounds.unlock(); this.sounds.animal(type); },
      () => { this.settings.album = []; this.saveSettings(); },
      this.quests, () => { this.settings.stickers = this.quests.save(); this.saveSettings(); },
      this.wardrobe, () => this.dressed());
    this.animals.setPredators(this.settings.predators);
    this.animals.onCatch = () => { this.sounds.nom(); this.markDirty(); };
    this.animals.onBreed = (baby) => { this.sounds.magic(); this.sounds.animal(baby.type); this.markDirty(); this.note('breed', { type: baby.type }); };
    this.music.on = settings.music !== false;
    this.thirdPerson = !!settings.third;
    this.ui.setMuted(this.sounds.muted);
    this.ui.setMusic(this.music.on);
    this.ui.setPredators(this.settings.predators);
    this.ui.setThirdPerson(this.thirdPerson);
    this.daynight.alwaysDay = !!this.settings.alwaysDay;
    this.applyBrightCaves();
    this.perf = new PerfMeter(root);
    this.perf.show(/[?&]fps\b/.test(location.search) || !!this.settings.fps);

    this.store = new WorldStore();
    const cores = navigator.hardwareConcurrency || 2;
    this.pool = new WorkerPool(this.atlas.faceTiles, Math.max(1, Math.min(2, cores - 1)));
    this.loader = new ChunkLoader(this.world, this.scene, this.pool);
    this.world.onChunkAdded = (c) => this.chunkAdded(c);
    // Natuurkunde: vallend zand, stromend water, plantjes zonder grond, groeiende gewassen
    this.physics = new Physics(this.world, {
      onChange: () => this.markDirty(),
      onBreak: (x, y, z, id) => this.particles.burst(x, y, z, this.atlas.particleColors[BLOCKS[id].family] || [[0.4, 0.7, 0.3]], 10),
      onFall: (f) => { f.mesh = this.scene.fallingBlock(f.id); },
      onLand: (f, ok) => {
        this.scene.removeFalling(f.mesh);
        if (ok) this.sounds.place(BLOCKS[f.id].sound); else this.particles.burst(f.x, f.y, f.z, this.atlas.particleColors[f.id] || [[0.8, 0.7, 0.5]], 12);
      },
    });
    this.world.onBlockChanged = (x, y, z, old, id) => {
      this.physics.notify(x, y, z, id);
      // Een stuk van het portaal (frame of licht) weg? Dan gaat het hele portaal uit
      const was = BLOCKS[old];
      if ((was?.portalColor !== undefined || was?.portal !== undefined) && BLOCKS[id]?.portal === undefined) {
        for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
          if (BLOCKS[this.world.get(x + dx, y + dy, z + dz)]?.portal !== undefined) this.world.set(x + dx, y + dy, z + dz, AIR);
        }
      }
      // Een knop, hendel of drukplaat ging aan of uit: deuren, hekken en lampen in de buurt gaan mee
      if (switchOn(old) !== switchOn(id)) this.signal(x, y, z);
    };
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
    window.addEventListener('pagehide', () => { if (!this.leaving) this.saveNow(); });
    // Op de iPad mag geluid pas aan na het loslaten van een vinger
    for (const type of ['pointerup', 'touchend', 'keydown']) {
      window.addEventListener(type, () => { this.sounds.unlock(); if (this.playing && !this.storm) this.music.start(); }, true);
    }

    this.frameTimes = [];
    this.warmup = 2;
    this.lowered = false;
  }

  // Opstarten: werelden uit de opslag halen (dat gaat in IndexedDB niet in één keer)
  // bench: de meetrit maakt zelf een eigen wereld, dan hoeft de bewaarde wereld niet eerst te laden
  async init({ bench = false } = {}) {
    if (bench) {
      this.store.memoryOnly();
      this.metas = {};
    } else {
      // Reageert de opslag niet (Safari kan dat soms na het wisselen van pagina), dan niet
      // eindeloos wachten maar een duidelijke melding geven
      let timer;
      const stuck = new Promise((resolve, reject) => {
        timer = setTimeout(() => { const e = new Error('de opslag reageert niet'); e.code = 'opslag'; reject(e); }, 15000);
      });
      await Promise.race([this.store.open(), stuck]);
      this.migrateOldSaves();
      await this.migrateToV4();
      this.metas = await Promise.race([this.store.loadMetas(SLOTS.map((n) => 'slot' + n)), stuck]);
      clearTimeout(timer);
    }
    const meta = this.storage.loadLocal('meta') || {};
    this.slot = SLOTS.includes(meta.current) ? meta.current : 1;
    if (!bench) {
      const loaded = await this.loadSlot(this.slot);
      if (!loaded) this.freshWorld('world'); // een nieuwe speler begint in de Grote wereld
      this.scene.rebuildAll(this.world);
    }
    this.savedPos = this.posKey();
    const restoreHand = this.hand.prewarm(B.GRASS, ITEM.HOUSE); // de hand ook (blokje en plaatje)
    this.scene.precompile();
    restoreHand();
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
    this.physics.scanChunk(c);
    if (this.spawned.has(c.key)) return;
    this.spawned.add(c.key);
    if (!this.worldReady || c.edited || this.readOnly || this.storm || this.farm) return; // (in de Boerderij komen dieren alleen terug of op bezoek)
    if (this.animals.spawnInChunk(this.world, c.cx, c.cz, this.player)) this.markDirty();
  }

  // Alles klaarzetten voor een andere wereld
  openWorld(fn) {
    this.worldReady = false;
    this.dismount();
    this.snowmen.clear();
    this.loader.reset();
    this.physics.reset();
    this.spawned = new Set();
    fn();
    for (const key of this.world.chunks.keys()) this.spawned.add(key);
    this.worldReady = true;
  }

  freshWorld(type, seed, gv) {
    this.openWorld(() => this.world.generate(type, seed, gv));
    // Dorpen die meteen al geladen zijn, krijgen nu hun dorpelingen
    if (!this.readOnly) for (const c of this.world.chunks.values()) this.animals.spawnVillages(this.world, c.cx, c.cz, this.player);
    this.resetSlot = true; // bij het eerstvolgende bewaren eerst de oude chunks van deze plek weghalen
    this.player.setPos(this.world.spawnPoint());
    this.player.yaw = 0;
    this.player.pitch = -0.25;
    this.player.flying = false;
    this.home = null;
    this.daynight.set(0.02);
    this.undoStack = [];
    this.thumb = null;
    this.animals.clear();
    this.animals.populate(this.world);
    this.updateBiome(true);
    this.syncFarm();
  }

  // In een boerderij-wereld loopt de Boerderij in Gevaar; in elke andere wereld niet
  syncFarm(saved = null) {
    this.farm?.destroy();
    this.farm = null;
    if (this.storm) return;
    if (this.world.type === 'farm') this.farm = new Farm(this, saved || {});
    else { this.animals.preyTypes = null; this.animals.setPredators(this.settings.predators); }
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
      gv: this.world.gv,
      player: { x: place.x, y: place.y, z: place.z, yaw: p.yaw, pitch: p.pitch, flying: p.flying },
      home: this.home,
      time: this.daynight.time,
      hotbar: this.hotbar,
      sel: this.sel,
      mode: this.mode,
      animals: this.animals.serialize(),
      snowmen: this.snowmen.serialize(),
      riding: false, // je stapt bij het laden altijd af, naast je dier
      spawned: [...this.spawned],
      thumb: this.thumb,
      ...(this.portalPos ? { portal: this.portalPos } : {}),
      ...(this.farm ? { farm: this.farm.save() } : {}),
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
        this.world.open({ type: s.type, seed: s.seed || 1, classic: !!s.classic, gv: s.gv || 1 }, chunks);
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
      this.portalPos = s.portal && Number.isFinite(s.portal.x) ? s.portal : null;
      this.daynight.set(s.time ?? 0.02);
      const hotbar = Array.isArray(s.hotbar) ? s.hotbar.map(upgradeItemId) : null;
      this.hotbar = hotbar && hotbar.length === DEFAULT_HOTBAR.length && hotbar.every((id) => PALETTE.includes(id))
        ? hotbar : [...DEFAULT_HOTBAR];
      this.sel = Number.isInteger(s.sel) && s.sel >= 0 && s.sel < this.hotbar.length ? s.sel : 0;
      this.mode = s.mode === 'break' ? 'break' : 'build';
      // Een omgezette wereld van de eerste versie heeft nog geen dieren: die komen er nu bij
      if (Array.isArray(s.animals)) this.animals.load(s.animals);
      else { this.animals.clear(); this.animals.populate(this.world); }
      this.snowmen.load(s.snowmen);
      this.thumb = typeof s.thumb === 'string' ? s.thumb : null;
      this.undoStack = [];
      this.updateBiome(true);
      this.syncFarm(s.farm);
      return true;
    } catch (e) {
      console.warn('Kon wereld niet laden', e);
      logError(e, 'wereld laden');
      return false;
    }
  }

  async loadSlot(n) {
    // Was Jippe in een extra wereld (door een portaal)? Dan daar verder
    const extra = (this.storage.loadLocal('meta') || {}).worlds?.[n] || null;
    if (extra && PORTAL_THEMES.includes(extra)) {
      const key = this.worldKey(n, extra), m = (await this.store.loadMetas([key]))[key];
      if (m && this.applySave(m, await this.store.loadChunks(key))) { this.extra = extra; this.metas[key] = m; return true; }
    }
    const meta = this.metas['slot' + n];
    if (!meta) return false;
    const chunks = await this.store.loadChunks('slot' + n);
    if (!this.applySave(meta, chunks)) return false;
    this.extra = null; // pas als het gelukt is: anders blijft de huidige wereld bij zijn eigen naam
    return true;
  }

  // Elke wereldplek heeft een hoofdwereld en (door portalen) extra werelden: 'slot1', 'slot1~jungle', ...
  worldKey(n = this.slot, extra = this.extra) { return extra ? `slot${n}~${extra}` : 'slot' + n; }

  // Onthouden in welke wereldplek (en welke wereld daarin) Jippe is
  setActiveWorld() {
    const meta = this.storage.loadLocal('meta') || {};
    this.storage.saveLocal('meta', { ...meta, current: this.slot, worlds: { ...(meta.worlds || {}), [this.slot]: this.extra } });
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
    if (this.readOnly || !this.worldReady || this.storm) return Promise.resolve(); // de Wilde Nacht wordt niet bewaard
    const s = this.makeSave();
    const slot = this.worldKey();
    if (this.resetSlot) { this.store.clearSlot(slot); this.resetSlot = false; }
    this.metas[slot] = s;
    this.saving = this.store.save(slot, s, this.world.takeUnsaved()).catch((e) => logError(e, 'bewaren'));
    this.saveT = s.t;
    this.dirty = false;
    this.lastPosSave = performance.now() / 1000;
    this.savedPos = this.posKey();
    return this.saving;
  }

  // Naar een andere pagina (de meetrit): eerst alles bewaren en de opslag sluiten. Anders kan
  // Safari de oude pagina bewaren met het bewaren half af, en wacht de nieuwe pagina daar eindeloos op.
  async leave(url) {
    if (this.leaving) return;
    this.leaving = true;
    try {
      await this.saveNow();
      await this.store.flush();
    } catch (e) { logError(e, 'bewaren voor de meetrit'); }
    this.store.close();
    location.href = url;
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
      await this.saveNow();
      const before = this.slot, extraBefore = this.extra;
      // Lukt het laden niet, dan blijft alles zoals het was (ook welke wereld van de plek: anders
      // zou het volgende bewaren deze wereld onder de verkeerde naam wegschrijven)
      if (!(await this.loadSlot(n))) { this.sounds.nope(); this.slot = before; this.extra = extraBefore; return; }
      this.slot = n;
      this.setActiveWorld();
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
      for (const key of [this.worldKey(n, null), ...PORTAL_THEMES.map((t) => this.worldKey(n, t))]) {
        await this.store.clearSlot(key);
        delete this.metas[key];
      }
      this.slot = n;
      this.extra = null;
      this.setActiveWorld();
      this.freshWorld(type);
      if (type === 'farm') { this.hotbar = [...FARM_HOTBAR]; this.sel = 0; this.mode = 'build'; } // de spullen voor een boerderij
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
    if (this.storm) this.music.stop(); else this.music.start(); // in de Wilde Nacht geen vrolijk muziekje
  }

  openMenu() {
    if (this.storm) { this.storm.askStop(() => this.stopStorm()); return; } // naar het menu = stoppen met de Wilde Nacht (na een vraag)
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
    if (this.storm) { this.sounds.nope(); this.ui.say(`In de ${this.stormName()} heb je alleen je eigen bouwstenen.`, 'chest'); return; }
    this.input.releaseAll();
    this.ui.openPalette(this.hotbar[this.sel]);
    this.sounds.pop();
  }

  pick(id) {
    if (this.storm && !STOCK_ITEMS.includes(id)) { this.sounds.nope(); return; }
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
    if (this.storm) { this.sounds.nope(); return; }
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
    if (this.storm) { this.ui.setCompass(null); return; }
    const p = this.player, h = this.homeSpot();
    const dx = h.x - p.x, dz = h.z - p.z;
    if (!this.playing || Math.hypot(dx, dz) < 50) { this.ui.setCompass(null); return; }
    const sin = Math.sin(p.yaw), cos = Math.cos(p.yaw);
    this.ui.setCompass(Math.atan2(dx * cos - dz * sin, -dx * sin - dz * cos));
  }

  // Twee keer snel op springen: vliegen aan of uit (zoals in Minecraft)
  jumpTap() {
    const now = performance.now();
    if (now - (this.lastJumpTap || 0) < 300 && !this.player.riding) { this.toggleFly(); this.lastJumpTap = 0; return; }
    this.lastJumpTap = now;
  }

  // Blok kopiëren: het blok dat je aantikt (of de juiste soort ervan) komt in je hand
  pickBlock(hit) {
    const b = BLOCKS[hit.id];
    let id = b.family ?? hit.id;
    if (b.crop) id = { wheat: ITEM.WHEAT_SEEDS, carrots: ITEM.CARROT, potatoes: ITEM.POTATO }[b.crop];
    if (!PALETTE.includes(id)) { this.sounds.nope(); return; }
    this.ui.markPicked();
    this.pick(id);
    this.particles.sparkle(hit.x, hit.y, hit.z, hit.x + 1, hit.y + 1, hit.z + 1, 12);
  }

  toggleFly() {
    const p = this.player;
    if (this.storm && !p.flying) { this.sounds.nope(); this.ui.say(`In de ${this.stormName()} kun je niet vliegen!`, 'wildNight'); return; }
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
    speech.enabled = !this.sounds.muted; // zonder geluid ook niet voorlezen
    this.saveSettings();
    this.ui.setMuted(this.sounds.muted);
    this.sounds.pop();
  }

  toggleMusic() {
    this.sounds.unlock();
    this.music.on = !this.music.on;
    this.saveSettings();
    this.ui.setMusic(this.music.on);
    if (this.music.on && !this.storm) this.music.start(); else this.music.stop();
  }

  // Reservekopie van alle werelden (en de instellingen) als bestand
  async backup() {
    this.captureThumb();
    await this.saveNow();
    const data = {
      app: 'JippeCraft', versie: VERSION, datum: new Date().toISOString(),
      instellingen: this.storage.loadLocal('settings'), huidige: this.slot,
      werelden: await this.store.exportAll(SLOTS.flatMap((n) => [this.worldKey(n, null), ...PORTAL_THEMES.map((t) => this.worldKey(n, t))])),
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
    await this.store.importAll(SLOTS.flatMap((n) => [this.worldKey(n, null), ...PORTAL_THEMES.map((t) => this.worldKey(n, t))]), data.werelden);
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

  // Ouderinstelling: altijd middag, of de gewone dag en nacht
  setAlwaysDay(on) {
    this.daynight.alwaysDay = on;
    this.settings.alwaysDay = on;
    this.saveSettings();
  }

  // Ouderinstelling: grotten en de nacht iets lichter
  setBrightCaves(on) {
    this.settings.brightCaves = on;
    this.applyBrightCaves();
    this.saveSettings();
  }

  applyBrightCaves() {
    this.scene.light.uMinLight.value = Math.pow(this.settings.brightCaves ? MIN_LIGHT_BRIGHT : MIN_LIGHT, 2.2);
  }

  key(e) {
    if (e.code === 'Escape') {
      if (this.ui.paletteOpen) this.ui.closePalette();
      else if (this.playing) this.openMenu();
      else this.play();
      return;
    }
    if (this.ui.paletteOpen) return;
    if (e.code === 'Space') this.jumpTap();
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
    if (tap.pick || this.ui.picking) { if (hit) this.pickBlock(hit); return; }
    const pet = this.animals.pick(ray, reach);
    if (pet && this.animalInFront(pet, hit)) {
      if (pet.animal.def.eten?.includes(this.hotbar[this.sel])) this.feedAnimal(pet.animal);
      else this.petAnimal(pet.animal);
      return;
    }
    if (!hit) return;
    this.hand.swing();
    const forceBreak = mode === 'break' && tap.alt;
    if (BLOCKS[hit.id].shape === 'door' && !forceBreak) { this.toggleDoor(hit); return; }
    if (BLOCKS[hit.id].shape === 'gate' && !forceBreak) { this.toggleGate(hit); return; }
    if (hit.id === B.TREASURE && !forceBreak) { this.openTreasure(hit); return; }
    if (hit.id === B.FIREWORK && !forceBreak) { this.launchFirework(hit); return; }
    if (BLOCKS[hit.id].bed && !forceBreak) { this.useBed(hit); return; }
    if (!forceBreak && this.interact(hit)) return;
    if (mode === 'build') this.use(hit);
    else if (forceBreak) this.breakBlock(hit);
    else this.hintHold(hit);
  }

  // Tikken op oven, kist, jukebox of taart doet iets (in plaats van bouwen)
  interact(hit) {
    const w = this.world, b = BLOCKS[hit.id], { x, y, z } = hit;
    if (b.family === B.FURNACE) {
      w.set(x, y, z, B.FURNACE + b.dir * 2 + (b.lit ? 0 : 1));
      this.sounds.place(b.lit ? 'stone' : 'wood');
      if (!b.lit) this.particles.smokeAt(x + 0.5, y + 1, z + 0.5, true);
    } else if (b.family === B.CHEST) {
      w.set(x, y, z, B.CHEST + b.dir * 2 + (b.open ? 0 : 1));
      this.sounds.door();
      if (!b.open) this.particles.sparkle(x + 0.1, y + 0.8, z + 0.1, x + 0.9, y + 1.4, z + 0.9, 12);
    } else if (b.family === B.LEVER) {
      w.set(x, y, z, b.aan ? B.LEVER : B.LEVER + 1); // om
      this.sounds.tick(); this.sounds.place('wood');
    } else if (b.family === B.BUTTON) {
      // Een knop is even aan (2 seconden) en springt dan vanzelf terug
      if (!b.aan) w.set(x, y, z, B.BUTTON + 1);
      this.buttons = (this.buttons || []).filter((k) => k.x !== x || k.y !== y || k.z !== z);
      this.buttons.push({ x, y, z, until: performance.now() / 1000 + 2 });
      this.sounds.tick();
    } else if (b.family === B.DINO_EGG) {
      this.hatchEgg(hit);
    } else if (hit.id === B.JUKEBOX) {
      this.sounds.jukebox();
      this.particles.sparkle(x - 0.2, y + 1, z - 0.2, x + 1.2, y + 2.2, z + 1.2, 30);
    } else if (b.family === B.CAKE) {
      // een hapje: na vier hapjes is de taart op
      w.set(x, y, z, b.bites < 3 ? hit.id + 1 : AIR);
      this.sounds.nom();
      this.particles.heartsAt(x + 0.5, y + 0.9, z + 0.5);
    } else return false;
    this.markDirty();
    return true;
  }

  // Waar raakte de straal het blok? (voor platen en trappen: boven- of onderhelft)
  hitFraction(hit) {
    const r = this.raycaster.ray;
    return r.origin.y + r.direction.y * hit.dist - hit.y;
  }

  // Emmer: water weghalen, of een waterbron neerzetten
  useBucket(hit) {
    const w = this.world;
    if (WATERY[hit.id] && BLOCKS[hit.id].render === 'water') {
      this.apply([{ x: hit.x, y: hit.y, z: hit.z, from: hit.id, to: AIR }]);
      this.sounds.place('water');
      return;
    }
    const [x, y, z] = this.targetCell(hit, B.WATER), existing = w.get(x, y, z);
    if (!w.inside(x, y, z) || !BLOCKS[existing].replaceable || existing === B.WATER) { this.sounds.nope(); return; }
    this.apply([{ x, y, z, from: existing, to: B.WATER }]);
    this.sounds.place('water');
    this.particles.waterAt(x + 0.5, y + 0.8, z + 0.5, 0, 0);
  }

  // Zaadjes: op gras, aarde of een akker; de grond wordt een akker en er komt een plantje op
  plantSeed(hit, crop) {
    const w = this.world, { x, y, z } = hit, above = w.get(x, y + 1, z);
    if (hit.ny !== 1 || ![B.GRASS, B.DIRT, B.FARMLAND].includes(hit.id) || !BLOCKS[above].replaceable || WATERY[above]) { this.sounds.nope(); return; }
    this.apply([{ x, y, z, from: hit.id, to: B.FARMLAND }, { x, y: y + 1, z, from: above, to: crop }]);
    this.sounds.place('grass');
    this.particles.burst(x, y + 0.5, z, [[0.45, 0.32, 0.2], [0.6, 0.8, 0.3]], 8, true);
    this.note('plant', { crop });
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
    else if (sp.kind === 'bucket') this.useBucket(hit);
    else if (sp.kind === 'seed') this.plantSeed(hit, sp.crop);
    else if (sp.kind === 'wand') this.lightPortal(hit);
    else if (sp.kind === 'vehicle') this.placeVehicle(hit, sp.animal);
    else this.placeAnimal(hit, sp.animal);
  }

  placeBlock(hit, id) {
    const w = this.world, p = this.player;
    // Wilde Nacht: alleen bouwen met wat je nog hebt
    if (this.storm && !this.storm.hasStock(id)) { this.sounds.nope(); this.ui.say(`Je ${BLOCKS[id]?.name?.toLowerCase() || 'blokken'} zijn op!`, 'chest'); return; }
    const [x, y, z] = this.targetCell(hit, id);
    const existing = w.get(x, y, z);
    const nb = BLOCKS[id];
    const nope = () => this.sounds.nope();
    const f = this.facing();
    const inPlace = x === hit.x && y === hit.y && z === hit.z;
    const frac = this.hitFraction(hit);
    // Plaat op een plaat van hetzelfde soort: samen één vol blok
    if (nb.shape === 'slab') {
      const hb = BLOCKS[hit.id];
      if (hb.shape === 'slab' && hb.mat === nb.mat && ((!hb.slabTop && hit.ny === 1) || (hb.slabTop && hit.ny === -1))) {
        this.apply([{ x: hit.x, y: hit.y, z: hit.z, from: hit.id, to: MATERIALS[nb.mat].block }]);
        return this.placed(hit.x, hit.y, hit.z, nb);
      }
      const eb = BLOCKS[existing];
      if (eb.shape === 'slab' && eb.mat === nb.mat) {
        this.apply([{ x, y, z, from: existing, to: MATERIALS[nb.mat].block }]);
        return this.placed(x, y, z, nb);
      }
    }
    if (!w.inside(x, y, z) || !BLOCKS[existing].replaceable || existing === id) return nope();
    // Rails: sluiten vanzelf aan op de rails ernaast (fase 5D)
    if (nb.family === B.RAIL) {
      if (!OPAQUE[w.get(x, y - 1, z)]) return nope();
      const rail = B.RAIL + placeState(w, x, y, z, f);
      w.set(x, y, z, rail);
      const more = neighbourChanges(w, x, y, z);
      w.set(x, y, z, existing);
      this.apply([{ x, y, z, from: existing, to: rail }, ...more]);
      return this.placed(x, y, z, nb);
    }
    // Ladder: tegen de muur die je aantikt
    if (nb.family === B.LADDER) {
      if (inPlace || hit.ny !== 0 || !OPAQUE[hit.id]) return nope();
      this.apply([{ x, y, z, from: existing, to: B.LADDER + DIRS.findIndex(([dx, dz]) => dx === -hit.nx && dz === -hit.nz) }]);
      return this.placed(x, y, z, nb);
    }
    // Zeewier en koraal: alleen onder water, op de bodem
    if (nb.waterlogged) {
      const below = w.get(x, y - 1, z);
      if (!WATERY[existing] || !(OPAQUE[below] || below === B.SEAWEED)) return nope();
      this.apply([{ x, y, z, from: existing, to: id }]);
      return this.placed(x, y, z, nb);
    }
    // Suikerriet: op zand, gras of aarde, of op ander suikerriet
    if (id === B.SUGAR_CANE) {
      const below = w.get(x, y - 1, z);
      if (![B.SAND, B.RED_SAND, B.GRASS, B.DIRT, B.SUGAR_CANE].includes(below)) return nope();
      this.apply([{ x, y, z, from: existing, to: id }]);
      return this.placed(x, y, z, nb);
    }
    // Zonnebloem: twee blokken hoog
    if (TALL_PLANTS.has(id)) {
      const up = w.get(x, y + 1, z);
      if (!OPAQUE[w.get(x, y - 1, z)] || !w.inside(x, y + 1, z) || !BLOCKS[up].replaceable) return nope();
      this.apply([{ x, y, z, from: existing, to: id }, { x, y: y + 1, z, from: up, to: id + 1 }]);
      return this.placed(x, y, z, nb);
    }
    if (nb.climb) {
      const supported = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]
        .some(([dx, dy, dz]) => { const id = w.get(x + dx, y + dy, z + dz); return BLOCKS[id].solid || id === B.VINE; });
      if (!supported) return nope();
    } else if (nb.render === 'cross' && !OPAQUE[w.get(x, y - 1, z)]) return nope();

    // Fakkel: op de grond, of tegen de muur die je aantikt
    if (id === B.TORCH) {
      let place = -1;
      if (!inPlace && hit.ny === 0 && OPAQUE[hit.id]) place = torchId(DIRS.findIndex(([dx, dz]) => dx === -hit.nx && dz === -hit.nz));
      else if (BLOCKS[w.get(x, y - 1, z)].solid) place = torchId();
      if (place < 0) return nope();
      this.apply([{ x, y, z, from: existing, to: place }]);
      return this.placed(x, y, z, nb);
    }
    // Lantaarn: staand, of hangend onder een blok
    if (id === B.LANTERN) {
      const hang = !inPlace && hit.ny === -1;
      if (hang ? !BLOCKS[w.get(x, y + 1, z)].solid : !BLOCKS[w.get(x, y - 1, z)].solid) return nope();
      this.apply([{ x, y, z, from: existing, to: hang ? B.LANTERN_HANGING : B.LANTERN }]);
      return this.placed(x, y, z, nb);
    }
    // Bed: twee blokken lang, het hoofdeind van je af
    if (nb.bed) {
      const [dx, dz] = DIRS[f], hx = x + dx, hz = z + dz, there = w.get(hx, y, hz);
      if (!w.inside(hx, y, hz) || !BLOCKS[there].replaceable || !BLOCKS[w.get(x, y - 1, z)].solid) return nope();
      if (p.overlapsBlock(x, y, z) || p.overlapsBlock(hx, y, hz)) return nope();
      this.apply([
        { x, y, z, from: existing, to: bedId(nb.bed.color, false) },
        { x: hx, y, z: hz, from: there, to: bedId(nb.bed.color, true) },
      ]);
      return this.placed(x, y, z, nb);
    }

    if (nb.shape === 'door') {
      // een deur is twee blokken hoog en kijkt naar jou toe
      const up = w.get(x, y + 1, z);
      if (!w.inside(x, y + 1, z) || !BLOCKS[up].replaceable) return nope();
      if (p.overlapsBlock(x, y, z) || p.overlapsBlock(x, y + 1, z)) return nope();
      const d = (f + 2) % 4;
      this.apply([
        { x, y, z, from: existing, to: doorId(d, false, false, nb.wood || 0) },
        { x, y: y + 1, z, from: up, to: doorId(d, true, false, nb.wood || 0) },
      ]);
    } else {
      // Bovenhelft van een zijvlak of de onderkant van een blok aangetikt: trap ondersteboven, plaat boven
      const high = !inPlace && (hit.ny === -1 || (hit.ny === 0 && frac > 0.5));
      const wood = WOODS.findIndex((wd) => wd.log === id);
      let place = id;
      if (nb.shape === 'stairs') place = stairsId(nb.mat, f, high);
      else if (nb.shape === 'slab') place = slabId(nb.mat, high);
      else if (nb.shape === 'gate') place = gateId(f, false, nb.wood || 0);
      else if (wood >= 0 && !inPlace && hit.ny === 0) place = B.LOG_AXIS + wood * 2 + (hit.nx !== 0 ? 0 : 1); // stam ligt
      else if (nb.family === B.FURNACE || nb.family === B.CHEST) place = nb.family + ((f + 2) % 4) * 2; // voorkant naar jou
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
    this.placed(x, y, z, nb);
  }

  // Geluidje, wolkje en een randje om het nieuwe blok
  placed(x, y, z, nb) {
    this.note('place', { id: nb.id, rail: nb.family === B.RAIL, bed: !!nb.bed, roof: !!nb.bed && hasRoof(this.world, x, y, z), dark: (this.world.lightAt(x, y, z) >> 4) < 4 });
    this.sounds.place(nb.sound);
    this.particles.burst(x, y, z, [[1, 1, 1], [0.92, 0.95, 1]], 7, true);
    this.flash = { x, y, z, until: performance.now() / 1000 + 0.35 };
  }

  // Het andere stuk van een bed (hoofdeind bij voeteneind, en andersom)
  bedPartner(x, y, z) {
    const b = BLOCKS[this.world.get(x, y, z)].bed;
    for (const [dx, dz] of DIRS) {
      const o = BLOCKS[this.world.get(x + dx, y, z + dz)].bed;
      if (o && o.color === b.color && o.head !== b.head) return { x: x + dx, y, z: z + dz };
    }
    return null;
  }

  // Tik op een bed: dit is nu je thuis. Is het nacht, dan ga je slapen tot de ochtend.
  useBed(hit) {
    if (this.sleeping) return;
    if (this.storm) { this.sounds.nope(); this.ui.say('Slapen gaat niet: de dieren komen eraan!', 'wildNight'); return; }
    const head = BLOCKS[hit.id].bed.head ? hit : this.bedPartner(hit.x, hit.y, hit.z) || hit;
    this.home = { x: head.x + 0.5, y: head.y + 0.6, z: head.z + 0.5 };
    this.particles.sparkle(hit.x - 0.2, hit.y + 0.5, hit.z - 0.2, hit.x + 1.2, hit.y + 1.6, hit.z + 1.2, 40);
    this.markDirty();
    if (!this.daynight.night) { this.sounds.magic(); this.ui.say('Thuis!', 'goHome'); return; }
    this.sleeping = true;
    this.input.releaseAll();
    this.sounds.sleep();
    this.ui.fade(true);
    setTimeout(() => {
      this.daynight.morning();
      for (const a of this.animals.list) if (a.sleep > 3) a.sleep = 1 + Math.random() * 3;
      this.ui.fade(false);
      this.sleeping = false;
      this.ui.say('Goedemorgen!', 'sun');
      this.note('sleep');
      this.markDirty();
    }, 1600);
  }

  placeStamp(hit, kind) {
    if (this.storm) { this.sounds.nope(); this.ui.say(`Stempels doen niet mee in de ${this.stormName()}. Bouw zelf!`, 'wildNight'); return; }
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
    this.note('stamp', { kind });
  }

  // ---------- portalen (fase 4H) ----------

  // Tik met de toverstaf op een frame van portaalsteen: het portaal gaat aan
  lightPortal(hit) {
    const found = findPortal(this.world, hit.x, hit.y, hit.z);
    if (!found) {
      this.ui.say('Bouw een frame van portaalsteen (4 breed, 5 hoog) en tik erop met de toverstaf', 'portal');
      this.sounds.nope();
      return false;
    }
    this.apply(found.cells.map(([x, y, z]) => ({ x, y, z, from: this.world.get(x, y, z), to: portalId(found.color, found.axis) })));
    const [x0, y0, z0] = found.cells[0];
    this.particles.sparkle(x0 - 2, y0 - 1, z0 - 2, x0 + 3, y0 + 4, z0 + 3, 90);
    this.sounds.magic();
    this.note('portalLit', { color: found.color });
    return true;
  }

  // Door het portaal: naar de themawereld van die kleur, of terug naar de hoofdwereld.
  // Je dier gaat mee, net als je onderbalk en de tijd van de dag.
  async travel(color) {
    if (this.travelling || this.switching || this.readOnly) return;
    this.travelling = true; this.switching = true;
    const theme = PORTAL_THEMES[color], target = this.extra === theme ? null : theme;
    const p = this.player;
    this.ui.warp?.(true);
    this.sounds.whoosh(); this.sounds.magic();
    try {
      const riding = p.riding;
      if (riding) this.dismount();
      const friends = this.animals.list.filter((a) => a === riding || (a.tame && !a.sitting && !a.def.voertuig && Math.hypot(a.x - p.x, a.z - p.z) < 10));
      const carry = friends.map((a) => ({ data: this.animals.serializeOne(a), riding: a === riding }));
      for (const a of friends) this.animals.remove(a);
      this.portalPos = { x: Math.floor(p.x), y: Math.floor(p.y), z: Math.floor(p.z) };
      const hotbar = [...this.hotbar], sel = this.sel, time = this.daynight.time;
      await new Promise((r) => setTimeout(r, 600)); // het beeld draait en vervaagt
      await this.saveNow();
      await this.store.flush();
      const key = this.worldKey(this.slot, target);
      const meta = this.metas[key] || (await this.store.loadMetas([key]))[key];
      if (meta) {
        if (!this.applySave(meta, await this.store.loadChunks(key))) throw new Error('kon de wereld achter het portaal niet laden');
        this.extra = target;
      } else {
        // Voor het eerst door dit portaal: een nieuwe themawereld, met een portaal terug bij de start
        this.extra = target;
        this.freshWorld(target || this.world.type, this.extraSeed(target));
        const sp = this.world.spawnPoint(), x = Math.floor(sp.x) - 1, y = Math.floor(sp.y), z = Math.floor(sp.z) - 4;
        for (let u = -2; u <= 3; u++) for (let v = 0; v <= 5; v++) for (let d = -1; d <= 1; d++) this.world.set(x + u, y + v, z + d, AIR);
        for (const [cx, cy, cz, id] of portalCells(color, 0, x, y, z)) this.world.set(cx, cy, cz, id);
        this.portalPos = { x, y, z };
      }
      this.hotbar = hotbar; this.sel = sel;
      this.daynight.set(time);
      for (const c of carry) {
        const a = this.animals.loadOne({ ...c.data, x: p.x + (c.riding ? 0 : 1.5), y: p.y, z: p.z + (c.riding ? 0 : 1.5) });
        if (a && c.riding) this.mountAnimal(a);
      }
      this.setActiveWorld();
      this.scene.rebuildAll(this.world);
      this.refreshUI();
      this.inPortal = true; // eerst uit het portaal stappen voordat je weer terug kunt
      await this.saveNow();
      this.ui.say(target ? `Welkom in de ${BIOMES[target]?.naam || target}!` : 'Weer thuis!', target ? BIOMES[target]?.icon : 'goHome');
      this.note('portal', { theme: target });
    } catch (e) {
      logError(e, 'portaal');
      this.sounds.nope();
    } finally {
      setTimeout(() => this.ui.warp?.(false), 150);
      this.travelling = false; this.switching = false;
    }
  }

  // De seed van een extra wereld volgt uit die van de wereldplek, zodat hij altijd hetzelfde is
  extraSeed(theme) {
    const main = this.metas['slot' + this.slot]?.seed ?? this.world.seed;
    return theme ? (main ^ Math.imul(PORTAL_THEMES.indexOf(theme) + 1, 0x9e3779b1)) | 0 : main;
  }

  // ---------- knoppen, hendels en drukplaten (fase 5E) ----------

  // Deuren, hekken en lampen rond (x, y, z) krijgen de stand die bij de schakelaars past
  signal(x, y, z) {
    const changes = signalChanges(this.world, x, y, z);
    if (!changes.length) return;
    for (const c of changes) this.world.set(c.x, c.y, c.z, c.to);
    const opened = changes.some((c) => BLOCKS[c.to].open), lit = changes.some((c) => c.to === B.SWITCH_LAMP + 1);
    if (changes.some((c) => BLOCKS[c.to].shape === 'door' || BLOCKS[c.to].shape === 'gate')) this.sounds.door();
    this.particles.sparkle(x - 0.1, y + 0.1, z - 0.1, x + 1.1, y + 0.8, z + 1.1, 10);
    if (opened || lit) this.note('signal', { door: opened, lamp: lit });
    this.markDirty();
  }

  // Knoppen springen terug; drukplaten zijn aan zolang er iemand (of een dier) op staat
  switchTick(now) {
    if (now < (this.nextSwitchTick || 0)) return;
    this.nextSwitchTick = now + 0.1;
    const w = this.world;
    if (this.buttons?.length) {
      for (const k of this.buttons) if (now >= k.until && w.get(k.x, k.y, k.z) === B.BUTTON + 1) w.set(k.x, k.y, k.z, B.BUTTON);
      this.buttons = this.buttons.filter((k) => now < k.until);
    }
    const p = this.player, on = new Set();
    const feet = (e) => {
      const x = Math.floor(e.x), y = Math.floor(e.y + 0.05), z = Math.floor(e.z);
      if (BLOCKS[w.get(x, y, z)]?.family === B.PLATE) on.add(x + ',' + y + ',' + z);
    };
    if (!p.flying) feet(p);
    for (const a of this.animals.list) if (Math.abs(a.x - p.x) < 24 && Math.abs(a.z - p.z) < 24) feet(a);
    for (const k of on) {
      const [x, y, z] = k.split(',').map(Number);
      if (w.get(x, y, z) === B.PLATE) { w.set(x, y, z, B.PLATE + 1); this.sounds.tick(); if (k === [Math.floor(p.x), Math.floor(p.y + 0.05), Math.floor(p.z)].join(',')) this.note('plate'); }
    }
    for (const k of this.platesOn || []) {
      if (on.has(k)) continue;
      const [x, y, z] = k.split(',').map(Number);
      if (w.get(x, y, z) === B.PLATE + 1) w.set(x, y, z, B.PLATE);
    }
    this.platesOn = on;
    // Af en toe: knoppen en drukplaten in de buurt die nog aan staan zonder reden (bijvoorbeeld na
    // opnieuw laden, want de tijd van een knop wordt niet bewaard) springen terug
    if (now >= (this.nextSwitchSweep || 0)) {
      this.nextSwitchSweep = now + 2;
      const px = Math.floor(p.x), py = Math.floor(p.y), pz = Math.floor(p.z);
      for (let x = px - 8; x <= px + 8; x++) for (let y = py - 4; y <= py + 4; y++) for (let z = pz - 8; z <= pz + 8; z++) {
        const id = w.get(x, y, z);
        if (id === B.PLATE + 1 && !on.has(x + ',' + y + ',' + z)) w.set(x, y, z, B.PLATE);
        else if (id === B.BUTTON + 1 && !this.buttons?.some((k) => k.x === x && k.y === y && k.z === z)) w.set(x, y, z, B.BUTTON);
      }
    }
  }

  // ---------- karretje en bootje (fase 5D) ----------

  // Het karretje op de rails, het bootje op het water
  placeVehicle(hit, type) {
    if (this.storm) { this.sounds.nope(); return; }
    const w = this.world, p = this.player;
    let [x, y, z] = this.targetCell(hit, -1);
    if (type === 'minecart') {
      if (isRail(hit.id)) [x, y, z] = [hit.x, hit.y, hit.z];
      if (!isRail(w.get(x, y, z))) { this.ui.say('Zet het karretje op de rails', 'minecart'); this.sounds.nope(); return; }
    } else {
      if (!WATERY[w.get(x, y, z)] && WATERY[w.get(x, y - 1, z)]) y--;
      if (!WATERY[w.get(x, y, z)]) { this.ui.say('Zet het bootje op het water', 'boat'); this.sounds.nope(); return; }
      while (WATERY[w.get(x, y + 1, z)]) y++;
      y -= SPECIES.boat.floatDepth; // het water houdt op bij y + 1: daar drijft het bootje op
    }
    const yaw = Math.round(p.yaw / (Math.PI / 2)) * (Math.PI / 2);
    if (!this.animals.makeRoom(p)) { this.sounds.nope(); return; }
    const v = this.animals.spawn(type, x + 0.5, type === 'minecart' ? y : y + 1, z + 0.5, yaw);
    if (!v) { this.sounds.nope(); return; }
    this.sounds.place('metal');
    this.particles.sparkle(x - 0.2, y, z - 0.2, x + 1.2, y + 1.2, z + 1.2, 25);
    this.markDirty();
  }

  // Rijden in het karretje of varen met het bootje: de stuurknop vooruit of achteruit
  driveVehicle(dt) {
    const p = this.player, v = p.riding, w = this.world;
    const mx = this.input.move.x, mz = this.input.move.y;
    p.vx = p.vy = p.vz = 0;
    if (v.def.voertuig === 'rails') {
      // het karretje staat op de rails in zijn vak (op een helling soms een vak hoger of lager)
      for (const dy of [0.3, 0, -1]) if (!this.cart) this.cart = startCart(w, Math.floor(v.x), Math.floor(v.y + dy), Math.floor(v.z), this.facing());
      if (!this.cart) return;
      const now = cartPose(this.cart), [dx, dz] = DIRS[now.dir];
      // Rijdt het karretje al? Dan is vooruit: doorrijden, en achteruit: remmen (ook in de bochten).
      // Staat het stil, dan rijdt vooruit de kant op waar je kijkt.
      const along = dx * -Math.sin(p.yaw) + dz * -Math.cos(p.yaw);
      const dir = this.cart.speed > 0.3 ? 1 : along >= 0 ? 1 : -1;
      const moving = stepCart(w, this.cart, Math.abs(mz) > 0.15 ? mz * dir : 0, dt);
      const pose = cartPose(this.cart);
      p.setPos({ x: pose.x, y: pose.y, z: pose.z }); p.onGround = true;
      this.vehicleYaw = pose.yaw;
      if (moving) {
        this.cartDist = (this.cartDist || 0) + Math.abs(this.cart.speed) * dt;
        if (this.cartDist > 16) { this.cartDist = 0; this.note('cartRide'); }
        if ((this.cartSound = (this.cartSound || 0) - dt) <= 0) { this.sounds.step('metal'); this.cartSound = 0.5 / Math.max(1, Math.abs(this.cart.speed)); }
      }
      return;
    }
    // Bootje: varen over het water, niet het land op
    const speed = 4.5, sin = Math.sin(p.yaw), cos = Math.cos(p.yaw);
    const tx = (-sin * mz + cos * mx) * speed, tz = (-cos * mz - sin * mx) * speed, k = Math.min(1, dt * 2.5);
    this.boatV.x += (tx - this.boatV.x) * k; this.boatV.z += (tz - this.boatV.z) * k;
    const water = (x, z) => { // hoogte van het water hier, of null als het geen water is
      const ix = Math.floor(x), iz = Math.floor(z), iy = Math.floor(p.y + 0.5);
      for (let y = iy + 1; y >= iy - 1; y--) if (WATERY[w.get(ix, y, iz)] && !WATERY[w.get(ix, y + 1, iz)] && !BLOCKS[w.get(ix, y + 1, iz)].solid) return y + 1;
      return null;
    };
    const r = 0.55;
    const nx = p.x + this.boatV.x * dt, nz = p.z + this.boatV.z * dt;
    const okX = water(nx + Math.sign(this.boatV.x) * r, p.z) !== null && w.isLoaded(nx, p.z);
    if (okX) p.x = nx; else this.boatV.x = 0;
    const okZ = water(p.x, nz + Math.sign(this.boatV.z) * r) !== null && w.isLoaded(p.x, nz);
    if (okZ) p.z = nz; else this.boatV.z = 0;
    const top = water(p.x, p.z);
    if (top !== null) p.y += (top - v.def.floatDepth - p.y) * Math.min(1, dt * 6);
    const sp = Math.hypot(this.boatV.x, this.boatV.z);
    if (sp > 0.3) {
      this.vehicleYaw = Math.atan2(-this.boatV.x, -this.boatV.z);
      this.boatDist = (this.boatDist || 0) + sp * dt;
      if (this.boatDist > 20) { this.boatDist = 0; this.note('boatRide'); }
      if (Math.random() < dt * sp) this.particles.burst(p.x - 0.5, p.y - 0.1, p.z - 0.5, [[0.8, 0.9, 1], [1, 1, 1]], 3, true);
    }
  }

  placeAnimal(hit, type) {
    const w = this.world, p = this.player;
    if (this.storm) { this.sounds.nope(); this.ui.say(`In de ${this.stormName()} zet je geen dieren neer!`, 'wildNight'); return; }
    const [x, y, z] = this.targetCell(hit, -1);
    if (!w.inside(x, y, z) || BLOCKS[w.get(x, y, z)].solid) { this.sounds.nope(); return; }
    // Vissen, dolfijnen en inktvissen alleen in het water
    if (SPECIES[type].onderwater && !WATERY[w.get(x, y, z)]) { this.ui.say?.('Zet een waterdier in het water'); this.sounds.nope(); return; }
    // Al heel veel dieren? Dan ruimen we een ver weg dier op. Lukt dat niet, dan zeggen we hoe het wel kan.
    if (!this.animals.makeRoom(p)) {
      this.ui.say?.(`Er zijn al ${MAX_ANIMALS} dieren. Houd in de sloopstand een dier vast om het naar huis te sturen.`, 'pig');
      this.sounds.nope(); return;
    }
    const yaw = Math.atan2(-(p.x - x - 0.5), -(p.z - z - 0.5));
    const a = this.animals.spawn(type, x + 0.5, y, z + 0.5, yaw);
    if (!a) { this.sounds.nope(); return; }
    // De kleine boerderijdieren houden de vertrouwde plaatsingsregel uit fase 2. Een groot dier dat
    // net niet past (tussen bomen, tegen een muur), zoekt een vrije plek vlak ernaast.
    if (a.def.dieet !== 'boerderij' && !a.clearAt(w, a.x, a.y, a.z)) {
      let free = null;
      for (let r = 1; r <= 2 && !free; r++) for (let dx = -r; dx <= r && !free; dx++) for (let dz = -r; dz <= r && !free; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        for (const dy of [0, 1, -1]) {
          const fx = x + dx + 0.5, fz = z + dz + 0.5, fy = y + dy;
          if (!a.def.onderwater && BLOCKS[w.get(x + dx, fy - 1, z + dz)]?.solid !== true) continue; // niet in de lucht
          if (a.clearAt(w, fx, fy, fz)) { free = { x: fx, y: fy, z: fz }; break; }
        }
      }
      if (!free) {
        this.animals.remove(a);
        this.ui.say?.(`Hier is niet genoeg plek voor een ${a.def.naam.toLowerCase()}`, 'pig');
        this.sounds.nope(); return;
      }
      a.x = free.x; a.y = free.y; a.z = free.z; a.sync();
    }
    this.sounds.animal(type);
    this.particles.heartsAt(x + 0.5, y + 1.1, z + 0.5);
    this.markDirty();
  }

  // Lievelingseten geven: het dier wordt verliefd (hartjes) en zoekt een maatje; een jong groeit sneller
  feedAnimal(a) {
    if (this.storm) { this.sounds.nope(); return; }
    a.wild = false; // een dier dat je gevoerd hebt, wordt nooit opgeruimd
    this.sounds.animal(a.type);
    this.discoverAnimal(a);
    if (a.baby > 0) {
      a.baby = Math.max(1, a.baby - 90);
      this.particles.sparkle(a.x - 0.4, a.y, a.z - 0.4, a.x + 0.4, a.y + 0.8, a.z + 0.4, 20);
    } else if (a.breedWait > 0) {
      a.pet(this.player.x, this.player.z);
    } else {
      a.love = 30; a.sleep = 0; a.sitting = false; a.happy = 1;
      this.particles.heartsAt(a.x, a.y + a.def.h + 0.15, a.z, 1.3);
    }
    this.markDirty();
  }

  discoverAnimal(a) {
    if (this.album.discover(a.type)) {
      this.settings.album = [...this.album.known];
      this.saveSettings();
      this.sounds.magic();
      this.note('album', { type: a.type, count: this.album.known.size });
    }
  }

  petAnimal(a) {
    if (this.storm) { this.sounds.nope(); return; } // in de Wilde Nacht valt er niets te aaien
    if ((a.tame || a.def.voertuig) && a.def.rijdbaar && !a.baby) { this.mountAnimal(a); return; }
    // De ijzergolem geeft je soms een bloem
    if (a.type === 'golem') {
      const now = performance.now() / 1000;
      if (now >= (a.flowerAt || 0)) {
        a.flowerAt = now + 20; a.holdFlower = false;
        this.pick(B.FLOWER_RED);
        this.ui.say('De ijzergolem geeft je een bloem!', 'flower');
        this.note('golemFlower');
      }
    }
    // Een tamme hond gaat zitten of staat weer op als je erop tikt
    if (a.tame && a.type === 'dog') {
      a.sitting = !a.sitting; a.walking = false;
      if (a.sitting) this.note('sit');
      this.sounds.animal(a.type); this.particles.heartsAt(a.x, a.y + a.def.h + 0.15, a.z, 0.8);
      a.show(0); this.markDirty();
      return;
    }
    a.wild = false;
    this.animals.stopHunt(a, 30);
    a.pet(this.player.x, this.player.z);
    this.sounds.animal(a.type);
    this.note('pet', { type: a.type });
    this.discoverAnimal(a);
    let heartSize = 1;
    // Temmen: drie keer snel aaien (leeuw, paard, hond, kat, kameel, olifant, cheetah, tijger)
    if ((a.def.rijdbaar || a.def.volger) && !a.tame && !a.baby) {
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
        this.note('tame', { type: a.type });
      }
    }
    this.particles.heartsAt(a.x, a.y + a.def.h + 0.15, a.z, heartSize);
  }

  mountAnimal(a) {
    const p = this.player;
    if (p.riding || (!a.tame && !a.def.voertuig) || !a.def.rijdbaar) return false;
    this.cart = null; this.vehicleYaw = null; this.boatV = { x: 0, z: 0 };
    p.riding = a;
    if (p.collides(this.world, a.x, a.y, a.z)) { p.riding = null; this.sounds.nope(); return false; }
    this.animals.stopHunt(a);
    p.setPos({ x: a.x, y: a.y, z: a.z }); p.yaw = a.yaw; p.flying = false; p.onGround = a.onGround; p.leaping = false;
    a.riding = true; a.walking = false; a.sleep = 0; a.state = 'bereden';
    this.rideCamera = this.thirdPerson;
    this.thirdPerson = true; this.ui.setThirdPerson(true);
    this.ui.setFlying(false); this.ui.setRiding(true, !!a.def.onderwater);
    this.input.releaseAll(); this.sounds.magic(); this.markDirty();
    this.note('ride', { type: a.type });
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
    p.riding = null; a.riding = false; a.walking = false; a.sleep = a.def.voertuig ? 0 : 2; a.state = a.def.voertuig ? 'rust' : 'slapen';
    if (a.def.voertuig) { a.yaw = a.targetYaw = this.vehicleYaw ?? a.yaw; this.cart = null; this.vehicleYaw = null; }
    p.setPos(next); p.onGround = true; p.leaping = false;
    this.thirdPerson = this.rideCamera; this.ui.setThirdPerson(this.thirdPerson);
    this.ui.setRiding(false); this.ui.setFlying(false);
    this.sounds.pop(); this.markDirty();
    return true;
  }

  syncRide(dt) {
    const p = this.player, a = p.riding;
    if (!a) return;
    const yaw = a.def.voertuig ? this.vehicleYaw ?? a.yaw : p.yaw; // een karretje kijkt langs de rails
    a.x = p.x; a.y = p.y; a.z = p.z; a.yaw = yaw; a.targetYaw = yaw;
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
      if (d.shape === 'door') w.set(hit.x, y0 + i, hit.z, doorId(d.dir, d.upper, open, d.wood || 0));
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
    w.set(hit.x, hit.y, hit.z, gateId(b.dir, !b.open, b.wood || 0));
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

  // Tik op een dino-ei: het ei breekt en er komt een jonge dino uit (de kleur bepaalt welke soort)
  hatchEgg(hit) {
    if (this.storm) { this.sounds.nope(); return; }
    const kinds = [['triceratops', 'stegosaurus', 'parasaur'], ['brachio', 'pteranodon'], ['trex', 'raptor']][BLOCKS[hit.id].egg] || ['triceratops'];
    const type = kinds[Math.floor(Math.random() * kinds.length)];
    const { x, y, z } = hit;
    if (!this.animals.makeRoom(this.player)) { this.sounds.nope(); return; }
    this.apply([{ x, y, z, from: hit.id, to: AIR }]);
    const a = this.animals.spawn(type, x + 0.5, y, z + 0.5, Math.atan2(-(this.player.x - x - 0.5), -(this.player.z - z - 0.5)));
    if (!a) return;
    a.baby = 600; a.show(0);
    this.particles.burst(x, y, z, [[0.95, 0.92, 0.8], [0.8, 0.9, 0.6]], 30);
    this.particles.heartsAt(a.x, a.y + 1, a.z, 1.2);
    this.sounds.pop(); this.sounds.animal(type);
    this.discoverAnimal(a);
    this.note('hatch', { type });
    this.markDirty();
  }

  // ---------- opdrachtjes en stickers (fase 5B) ----------

  // Het spel meldt wat Jippe doet; de opdrachtjes kijken of er een sticker bij komt
  note(event, data) {
    if (this.readOnly || this.bench) return;
    this.quests.note(event, data);
  }

  questDone(q) {
    this.settings.stickers = this.quests.save();
    this.album.stickerEarned(q);
    // Bij sommige stickers hoort iets om aan te trekken
    const prize = STICKER_PRIZES[q.id] && this.wardrobe.unlock(STICKER_PRIZES[q.id]);
    if (prize) { this.settings.wardrobe = this.wardrobe.save(); this.album.showNotice('Cadeautje!', iconURL(prize.icon), prize.naam); }
    this.saveSettings();
    this.sounds.magic();
    const p = this.player;
    this.particles.burst(p.x - 0.5, p.y + 1.6, p.z - 0.5, [[1, 0.85, 0.2], [1, 0.5, 0.7], [0.5, 0.8, 1]], 40, true);
  }

  // Elke seconde: waar is Jippe en wat ziet hij? (voor de opdrachtjes)
  questTick(now) {
    if (now < (this.nextQuestTick || 0) || !this.playing) return;
    this.nextQuestTick = now + 1;
    const p = this.player, w = this.world;
    this.note('height', { y: p.y });
    this.note('world', { type: w.type });
    this.note('biome', { biome: this.biomeNow });
    if (WATERY[w.get(Math.floor(p.x), Math.floor(p.y + EYE), Math.floor(p.z))]) this.note('dive');
    for (const s of w.gen?.structuresNear?.(Math.floor(p.x) - 20, Math.floor(p.z) - 20, Math.floor(p.x) + 20, Math.floor(p.z) + 20) || []) {
      this.note('near', { kind: s.kind });
    }
  }

  // Iets anders aangetrokken in het boek
  dressed() {
    this.avatar.build(this.wardrobe.look);
    this.settings.wardrobe = this.wardrobe.save();
    this.saveSettings();
    this.sounds.pop();
    this.note('dress');
  }

  openTreasure(hit) {
    this.apply([{ x: hit.x, y: hit.y, z: hit.z, from: B.TREASURE, to: B.TREASURE_OPEN }]);
    // In de kist: iets om aan te trekken dat je nog niet had, of goud
    const found = this.wardrobe.treasure();
    this.settings.wardrobe = this.wardrobe.save();
    this.saveSettings();
    if (found.item) {
      this.album.showNotice('Schat!', iconURL(found.item.icon), found.item.naam);
      speech.say(`Je vond ${found.item.een}! Trek hem aan in je boek.`);
    } else {
      this.album.showNotice('Goud!', iconURL('gold'), `${found.gold} keer goud`);
      speech.say('Je vond goud!');
      this.particles.firework(hit.x + 0.5, hit.y + 1.5, hit.z + 0.5);
    }
    this.note('treasure');
    this.particles.sparkle(hit.x - .4, hit.y + .2, hit.z - .4,
      hit.x + 1.4, hit.y + 2, hit.z + 1.4, 100);
    this.particles.burst(hit.x, hit.y, hit.z, [[1, .78, .12], [1, .94, .5]], 45, true);
    this.sounds.magic();
  }

  // Brokjes van een blok: stukjes van de echte textuur (gras en bladeren in hun eigen kleur)
  crumbs(hit, n) {
    const id = BLOCKS[hit.id].family ?? hit.id, tiles = this.atlas.faceTiles[id];
    if (!tiles || TINT_KIND[id] || BLOCKS[id].render === 'cross') {
      this.particles.burst(hit.x, hit.y, hit.z, this.atlas.particleColors[id] || this.atlas.particleColors[hit.id] || [[1, 1, 1]], n);
    } else this.particles.burstTile(hit.x, hit.y, hit.z, tiles[2], n);
  }

  // Kort tikken in de sloop-stand: laat zien dat je moet vasthouden
  hintHold(hit) {
    this.sounds.tick();
    this.crumbs(hit, 3);
  }

  breakBlock(hit) {
    const w = this.world, b = BLOCKS[hit.id];
    if (!b.breakable) { this.sounds.nope(); return; }
    const { x, y, z } = hit;
    // Een gat naast water loopt vanzelf vol: dat doet de natuurkunde (water stroomt erin)
    const to = b.waterlogged ? B.WATER : AIR;
    if (WATERY[hit.id] && b.render === 'water') { this.sounds.nope(); return; } // water sloop je niet, daar is de emmer voor
    const changes = [{ x, y, z, from: hit.id, to }];
    this.note('break', { id: hit.id });
    if (b.shape === 'door' || TALL_PLANTS.has(b.family)) {
      const oy = b.upper ? y - 1 : y + 1;
      const other = w.get(x, oy, z);
      if (BLOCKS[other].family === b.family && BLOCKS[other].upper !== b.upper) changes.push({ x, y: oy, z, from: other, to: AIR });
    }
    if (b.bed) {
      const o = this.bedPartner(x, y, z);
      if (o) changes.push({ ...o, from: w.get(o.x, o.y, o.z), to: AIR });
    }
    const above = w.get(x, y + 1, z);
    if (BLOCKS[above].render === 'cross' && !BLOCKS[above].climb) changes.push({ x, y: y + 1, z, from: above, to: AIR });
    this.apply(changes);
    this.sounds.break(b.sound);
    this.crumbs(hit, 18);
  }

  apply(changes) {
    for (const c of changes) this.world.set(c.x, c.y, c.z, c.to);
    this.storm?.edited(changes); // Wilde Nacht: gerepareerde blokken en de voorraad bouwstenen
    this.undoStack.push(changes);
    if (this.undoStack.length > MAX_UNDO) this.undoStack.shift();
    this.edits++;
    this.markDirty();
  }

  undo() {
    if (this.storm) { this.sounds.nope(); this.ui.say(`In de ${this.stormName()} kun je niets terugdoen!`, 'wildNight'); return; }
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

  // Een dier naar huis sturen (vasthouden in de sloop-stand): het verdwijnt met een poef
  sendAnimalHome(a) {
    if (a.riding || this.storm) return;
    this.particles.burst(a.x - 0.5, a.y + a.def.h * 0.4, a.z - 0.5, [[1, 1, 1], [0.95, 0.95, 1]], 30, true);
    this.particles.heartsAt(a.x, a.y + a.def.h, a.z, 1);
    this.sounds.pop();
    this.ui.say?.(`Dag ${a.def.naam.toLowerCase()}!`, 'goHome');
    this.animals.remove(a);
    this.markDirty();
  }

  // Vasthouden in de sloop-stand: het rondje loopt vol en het blok krijgt scheurtjes.
  // Hou je een dier vast, dan gaat dat dier naar huis.
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
    if (pet && !this.storm && this.animalInFront(pet, hit) && !pet.animal.riding) {
      if (!this.breakState || this.breakState.animal !== pet.animal || this.breakState.ptr !== h) this.breakState = { animal: pet.animal, t: 0, ptr: h };
      const st = this.breakState;
      st.t += dt;
      this.scene.showCrack(null);
      if (st.t > 0.12) this.ui.holdRing(h.sx, h.sy, st.t / ANIMAL_HOLD);
      if (st.t >= ANIMAL_HOLD) { this.sendAnimalHome(pet.animal); h.didBreak = true; this.breakState = null; stop(); }
      return;
    }
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
        this.crumbs(hit, 2);
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
    if (!instant && biome === this.biomeNow && this.world.gen?.climate) return; // Avontuur mengt ook binnen een gebied
    this.biomeNow = biome;
    this.scene.setBiome(this.world.biomeView(this.player.x, this.player.z), instant);
    this.weather.setBiome(biome);
    this.updateMusicStyle();
  }

  // Muziek van het landschap, of 's nachts het rustige nachtliedje
  updateMusicStyle() {
    this.music.setStyle(this.daynight.night ? 'nacht' : BIOMES[this.biomeNow]?.muziek);
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
      // op een grote dino zit je hoger, en hangt de camera verder weg
      const seat = riding ? (p.riding.def?.zadel ?? 0.66) - 0.66 : 0;
      const origin = new THREE.Vector3(p.x, p.y + 1.45 + seat, p.z);
      const want = new THREE.Vector3(Math.sin(p.yaw) * cp, -Math.sin(p.pitch), Math.cos(p.yaw) * cp)
        .multiplyScalar(riding ? RIDE_BACK + seat * 1.5 : CAM_BACK).add(new THREE.Vector3(0, riding ? RIDE_UP : CAM_UP, 0));
      const len = want.length();
      const dir = want.divideScalar(len);
      const wall = raycast(this.world, origin, dir, len, (id) => OPAQUE[id] === 1);
      const dist = wall ? Math.max(0.4, wall.dist - 0.3) : len;
      this.camDist = dist < this.camDist || !dt ? dist : this.camDist + (dist - this.camDist) * Math.min(1, dt * 4);
      cam.position.copy(origin).addScaledVector(dir, this.camDist);
    } else {
      this.camDist = 0;
      cam.position.set(p.x, p.y + EYE - (p.sneaking ? 0.2 : 0), p.z); // sluipen: iets lager
    }
    cam.rotation.set(Math.max(-1.55, p.pitch + (this.thirdPerson && p.riding ? RIDE_TILT : 0)), p.yaw, 0);
    // Geraakt in de Wilde Nacht: het beeld schudt even
    const shake = this.storm?.shake || 0;
    if (shake > 0) { cam.position.x += (Math.random() - 0.5) * shake * 0.5; cam.position.y += (Math.random() - 0.5) * shake * 0.5; cam.rotation.z = (Math.random() - 0.5) * shake * 0.12; }
  }

  // ---------- de Wilde Nacht (fase 6) ----------

  stormName() { return this.storm?.sunny ? 'Wilde Dag' : 'Wilde Nacht'; }

  // Een nieuwe Wilde Nacht (of Wilde Dag, opts.mode = 'dag') op een eigen eiland. Eerst de echte wereld bewaren; van deze wereld
  // wordt niets bewaard (zie saveNow). opts: andere tijden voor de tests.
  async startStorm(opts = {}) {
    if (this.switching) return;
    this.switching = true;
    try {
      if (!this.storm) {
        this.captureThumb();
        await this.saveNow();
        this.stormBack = { alwaysDay: this.daynight.alwaysDay, view: this.viewDistance };
      } else this.storm.destroy();
      this.storm = new Storm(this, opts);
      // In de dichte mist zie je toch niet ver: minder wereld tekenen, en dieren verder dan
      // een paar blokken als één stuk (dat scheelt veel op een oudere tablet)
      const sunny = opts.mode === 'dag';
      this.setViewDistance(Math.min(this.viewDistance, sunny ? DAY_VIEW : STORM_VIEW));
      this.animals.lodDist = sunny ? DAY_LOD : STORM_LOD;
      this.dismount();
      this.freshWorld('island', 1 + Math.floor(Math.random() * 1e6));
      this.animals.clear();
      this.animals.setPredators(false); // de roofdieren jagen hier alleen op Jippe
      this.daynight.alwaysDay = false;
      this.player.flying = false;
      this.mode = 'build';
      this.hotbar = [...STOCK_ITEMS]; this.sel = 1; // je eigen bouwstenen (de echte onderbalk komt terug bij stoppen)
      this.scene.rebuildAll(this.world);
      this.refreshUI();
      this.ui.setStorm(true);
      this.ui.setCounts(this.storm.counts());
      this.storm.begin();
      this.play();
    } finally {
      this.switching = false;
    }
  }

  // Stoppen: terug naar de eigen wereld, en naar het menu
  async stopStorm() {
    if (!this.storm || this.switching) return;
    this.switching = true;
    try {
      this.storm.destroy();
      this.storm = null;
      this.playing = false;
      this.input.enabled = false;
      this.input.releaseAll();
      this.daynight.alwaysDay = this.stormBack?.alwaysDay ?? !!this.settings.alwaysDay;
      this.animals.setPredators(this.settings.predators);
      this.animals.lodDist = null;
      if (this.stormBack?.view) this.setViewDistance(this.stormBack.view);
      this.ui.setStorm(false);
      this.ui.setCounts(null);
      if (!(await this.loadSlot(this.slot))) this.freshWorld('world');
      this.scene.rebuildAll(this.world);
      this.refreshUI();
      this.ui.closePalette();
      this.ui.showMenu();
    } finally {
      this.switching = false;
    }
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
      for (const tap of this.input.taps.splice(0)) if (!this.sleeping) this.act(tap);
      const wasClimbing = p.climbing;
      if (p.riding?.def.voertuig) this.driveVehicle(dt); else p.update(dt, this.input, this.world, now);
      this.syncRide(dt);
      // In een portaal gestapt? Dan op reis (pas weer als je er eerst uit bent gestapt)
      const inPortal = portalAt(this.world, p.x, p.y, p.z);
      if (inPortal !== null && !this.inPortal && !this.readOnly && !this.storm) this.travel(inPortal);
      this.inPortal = inPortal !== null;
      this.questTick(now);
      this.switchTick(now);
      this.storm?.update(dt);
      if (this.farm) { this.animals.lure = FOOD_ITEMS.includes(this.hotbar[this.sel]) ? this.hotbar[this.sel] : null; this.farm.update(dt); }
      if (wasClimbing !== p.climbing) this.ui.setFlying(p.flying, p.climbing);
    } else {
      this.input.takeLook();
      this.input.taps.length = 0;
      if (this.ui.menuOpen) p.yaw += dt * 0.06; // langzaam rondkijken achter het menu
    }
    this.updateHold(dt);
    this.updateCamera(dt);
    this.avatar.update(dt, p, this.thirdPerson);
    this.updateMotion(dt, now);

    // Randje om het blok onder de muis, of kort om het blok dat je net bouwde
    let hl = null;
    if (this.flash && now < this.flash.until) hl = this.flash;
    else if (this.playing && this.input.hover && !this.ui.paletteOpen) hl = this.rayFrom(this.input.hover.x, this.input.hover.y);
    this.scene.showHighlight(hl);

    this.scene.updateChunks(this.world, this.scene.pixelRatio < 1.5 ? 2 : 3);
    this.loader.update(p.x, p.z, -Math.sin(p.yaw), -Math.cos(p.yaw));
    this.updateCompass();
    if (!this.bench?.noAnimals) this.animals.update(this.playing ? dt : 0, this.world, this.player, this.scene.camera, realDt);
    this.snowmen.update(this.playing ? dt : 0, this.world);
    if (!this.readOnly) this.physics.update(realDt, p); // echte tijd: water stroomt even snel op een trage iPad
    for (const f of this.physics.falling) f.mesh?.position.set(f.x + 0.5, f.y + 0.5, f.z + 0.5);
    this.weather.update(dt, this.world, this.player, this.scene.pixelRatio, this.playing && !document.hidden);
    this.particles.update(dt, this.world);
    this.scene.updateClouds(dt);
    this.updateTime(this.playing ? dt : 0, now);
    if ((this.world.type === 'adventure' || this.world.gen?.climate) && now >= (this.nextBiome || 0)) {
      this.updateBiome(); this.nextBiome = now + 0.5;
    }
    this.scene.updateBiome(dt);
    this.updateUnderwater();
    const tDraw = performance.now();
    this.scene.render();
    if (this.bench) this.bench.after(rawDt, this.scene.renderer.info, { logic: tDraw - t0, draw: performance.now() - tDraw });
    if (this.playing && !this.readOnly && !this.storm && now - this.lastThumb > 30) { this.thumb = this.grabThumb(); this.lastThumb = now; }

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

  // Voetstappen: elke anderhalve stap een geluidje van de ondergrond
  footsteps(dt) {
    const p = this.player, speed = Math.hypot(p.vx, p.vz);
    if (p.flying || speed < 0.5 || !(p.onGround || p.inWater)) { this.stepDist = Math.min(this.stepDist || 0, 1); return; }
    this.stepDist = (this.stepDist || 0) + speed * dt;
    if (this.stepDist < (p.riding ? 2.4 : 1.7)) return;
    this.stepDist = 0;
    if (p.inWater) { this.sounds.step('water'); return; }
    const id = this.world.get(Math.floor(p.x), Math.floor(p.y - 0.2), Math.floor(p.z));
    this.sounds.step(id === B.SNOW ? 'snow' : BLOCKS[id]?.sound);
  }

  // Hand in beeld, bredere kijkhoek en stofwolkjes bij sprinten
  updateMotion(dt, now) {
    const p = this.player, cam = this.scene.camera;
    this.hand.setItem(this.hotbar[this.sel]);
    this.hand.update(dt, p, this.playing && !this.thirdPerson && !p.riding && !this.bench && !this.ui.paletteOpen, this.avatar.mat.color);
    const fov = p.sprinting ? 80 : 72;
    if (Math.abs(cam.fov - fov) > 0.05) { cam.fov += (fov - cam.fov) * Math.min(1, dt * 8); cam.updateProjectionMatrix(); }
    if (p.sprinting && p.onGround && now >= (this.nextDust || 0)) { this.particles.dustAt(p.x, p.y, p.z); this.nextDust = now + 0.15; }
  }

  // Zit de camera onder water? Dan blauwe mist, een blauwe tint en gedempt geluid
  updateUnderwater() {
    const c = this.scene.camera.position;
    const under = !!WATERY[this.world.get(Math.floor(c.x), Math.floor(c.y), Math.floor(c.z))];
    if (under === !!this.underwater) return;
    this.underwater = under;
    this.scene.setUnderwater(under);
    this.ui.setUnderwater(under);
    this.sounds.setMuffled(under);
  }

  // Dag en nacht, het licht op de dieren en het poppetje, nachtgeluiden en rook
  updateTime(dt, now) {
    const dn = this.daynight, w = this.world, p = this.player;
    dn.update(dt);
    const t = dn.now;
    this.scene.setTime(sunAmount(t), glowAmount(t), sunAngle(t));
    if (Animal.night !== dn.night) { Animal.night = dn.night; this.updateMusicStyle(); }
    const sc = this.scene;
    for (const a of this.animals.list) sc.tint(w.lightAt(a.x, a.y + 0.5, a.z), a.mat.color);
    for (const s of this.snowmen.list) sc.tint(w.lightAt(s.x, s.y + 1, s.z), s.mat.color);
    sc.tint(w.lightAt(p.x, p.y + 1, p.z), this.avatar.mat.color);
    if (!this.playing || document.hidden) return;
    // Waar ben je? (voor het omgevingsgeluid)
    if (now >= (this.nextAmbient || 0)) {
      this.nextAmbient = now + 1;
      const sky = w.lightAt(p.x, p.y + 1, p.z) >> 4, px = Math.floor(p.x), pz = Math.floor(p.z);
      let sea = false;
      for (const [dx, dz] of [[0, 0], [8, 0], [-8, 0], [0, 8], [0, -8]]) {
        const top = w.surfaceY(px + dx, pz + dz);
        if (w.get(px + dx, top + 1, pz + dz) === B.WATER || w.get(px + dx, top, pz + dz) === B.WATER) sea = true;
      }
      this.weather.context = { night: dn.night, cave: sky < 4 && p.y < 60, sea };
    }
    this.footsteps(dt);
    // Krekels en uilen, alleen buiten
    if (dn.night && (w.lightAt(p.x, p.y + 1, p.z) >> 4) > 7 && now >= (this.nextNightSound || 0)) {
      if (Math.random() < 0.15) this.sounds.owl(); else this.sounds.cricket();
      this.nextNightSound = now + 0.7 + Math.random() * 2.5;
    }
    // Rook boven fakkels en kampvuren in de buurt
    if (now >= (this.nextSmoke || 0)) {
      this.nextSmoke = now + 0.35;
      const px = Math.floor(p.x), py = Math.floor(p.y), pz = Math.floor(p.z);
      let fires = 0;
      for (let y = py - 5; y <= py + 6; y++) for (let x = px - 10; x <= px + 10; x++) for (let z = pz - 10; z <= pz + 10; z++) {
        const id = w.get(x, y, z);
        if (id === B.CAMPFIRE) {
          this.particles.smokeAt(x + 0.5, y + 0.9, z + 0.5, true);
          if (Math.abs(x - px) + Math.abs(z - pz) < 8) fires++;
        } else if (id >= B.TORCH && id <= B.TORCH + 4 && Math.random() < 0.3) {
          const bx = BLOCKS[id].boxes[0];
          this.particles.smokeAt(x + (bx[0] + bx[3]) / 2, y + bx[4] + 0.1, z + (bx[2] + bx[5]) / 2);
        }
      }
      if (fires && Math.random() < 0.7) this.sounds.crackle();
      // Bij de vulkanen: rook uit gloeiende magmasteen bovenop de bergen
      if (this.world.type === 'dino') {
        for (let i = 0; i < 6; i++) {
          const x = px + Math.floor((Math.random() - 0.5) * 70), z = pz + Math.floor((Math.random() - 0.5) * 70);
          if (!w.isLoaded(x, z)) continue;
          const top = w.surfaceY(x, z);
          if (w.get(x, top, z) === B.MAGMA && top > 70) { for (let k = 0; k < 3; k++) this.particles.volcanoSmokeAt(x + 0.5, top + 1.5, z + 0.5); break; }
        }
      }
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
      else if (this.viewDistance < (this.storm ? Math.min(this.maxView, this.storm.sunny ? DAY_VIEW : STORM_VIEW) : this.maxView)) this.setViewDistance(this.viewDistance + 1);
    }
  }
}

async function start() {
  const root = document.getElementById('app');
  window.__jippecraftBoot = true; // de browser kan het spel aan; vanaf hier mag het opstarten even duren
  const meet = location.search.match(/[?&]meet(?:=(\d+))?(?:&|$)/);
  try {
    const game = new Game(root);
    await game.init({ bench: !!meet });
    game.bootTime = performance.now(); // hoe lang het opstarten duurde (zie het ouderscherm)
    window.__jippecraft = game;
    // ?tijd=nacht (of ochtend, middag, avond, of een getal van 0 tot 1): voor tests en foto's
    const tijd = location.search.match(/[?&]tijd=([a-z0-9.]+)/);
    if (tijd) game.daynight.set(TIME_NAMES[tijd[1]] ?? Number(tijd[1]));
    // ?texturen: alle tegels op een raster (om de texturen te beoordelen)
    if (/[?&]texturen\b/.test(location.search)) showTextures(root, game.atlas);
    // ?meet = meetrit (30 seconden), ?meet=10 = 10 seconden
    if (meet) {
      // Meten gebeurt altijd op het middaguur, dan zijn de metingen te vergelijken
      game.daynight.set(NOON);
      game.daynight.frozen = true;
      game.bench = new Bench(game, meet[1] ? Number(meet[1]) : 30, { extra: !meet[1] }); // ?meet: met extra rondjes
      game.daynight.set(NOON);
    }
  } catch (e) {
    console.error(e);
    logError(e, 'opstarten');
    root.innerHTML = e?.code === 'opslag'
      ? '<div class="error"><h1>Even opnieuw</h1><p>Het spel kan de bewaarde werelden nu niet openen. Je werelden zijn niet weg. ' +
        'Sluit dit tabblad helemaal en open JippeCraft opnieuw.</p></div>'
      : '<div class="error"><h1>Oeps!</h1><p>Dit apparaat kan het spel niet laten zien. Werk de iPad bij via Instellingen &rarr; Algemeen &rarr; Software-update.</p></div>';
  }
  // Offline spelen (alleen als het spel op een eigen website staat)
  if ('serviceWorker' in navigator && window.top === window && !window.claude &&
    (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

// Niet per ongeluk naar de vorige website vegen
guardNavigation();

// Geen zoomen, scrollen of selecteren op de iPad
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());
document.addEventListener('touchmove', (e) => { if (!e.target.closest?.('.palette-grid, .menu-card, .album-grid, .bench-card, .texview')) e.preventDefault(); }, { passive: false });

start();
