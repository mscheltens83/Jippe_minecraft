// JippeCraft: hier komt alles samen. Opstarten, de spel-lus, bouwen en slopen.

import * as THREE from '../lib/three.module.min.js';
import { AIR, B, BLOCKS, DEFAULT_HOTBAR, PALETTE } from './blocks.js';
import { createAtlas } from './textures.js';
import { World } from './world.js';
import { GameScene } from './scene.js';
import { Player, EYE } from './player.js';
import { raycast } from './raycast.js';
import { Input } from './input.js';
import { UI } from './ui.js';
import { Sounds } from './audio.js';
import { Particles } from './particles.js';
import { Storage } from './storage.js';

const REACH = 12;          // hoe ver weg je nog kunt bouwen
const MAX_UNDO = 300;

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
    this.particles = new Particles(this.scene.scene);
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

    this.ui = new UI(root, this.atlas, {
      onPlay: () => this.play(),
      onMenu: () => this.openMenu(),
      onMode: (m) => this.setMode(m, true),
      onUndo: () => this.undo(),
      onJump: (v) => { this.input.jumpButton = v; },
      onDown: (v) => { this.input.downButton = v; },
      onFly: () => this.toggleFly(),
      onSelect: (i) => this.select(i),
      onChest: () => this.openChest(),
      onPick: (id) => this.pick(id),
      onToggleSound: () => this.toggleSound(),
      onNewWorld: (type) => this.newWorld(type),
      onRestore: () => this.restoreBackup(),
    });
    this.input = new Input(this.canvas, this.ui.stickBase, this.ui.stickKnob);
    this.input.onKey = (e) => this.key(e);
    this.player.onJump = () => this.sounds.jump();

    const settings = this.storage.loadLocal('settings') || {};
    this.sounds.muted = !!settings.muted;
    this.ui.setMuted(this.sounds.muted);

    const save = this.storage.loadLocal('world');
    const loaded = !!save && this.applySave(save);
    if (!loaded) this.freshWorld('island');
    this.saveT = loaded ? save.t : 0;
    this.savedPos = this.posKey();
    this.scene.rebuildAll(this.world);
    this.refreshUI();
    this.ui.showMenu(this.hasBackup());

    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.visualViewport?.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { this.input.releaseAll(); this.saveNow(); }
    });
    window.addEventListener('pagehide', () => this.saveNow());
    // Op de iPad mag geluid pas aan na het loslaten van een vinger
    for (const type of ['pointerup', 'touchend', 'keydown']) window.addEventListener(type, () => this.sounds.unlock(), true);

    this.frameTimes = [];
    this.last = performance.now() / 1000;
    requestAnimationFrame((t) => this.frame(t));
    this.syncRemote();
  }

  // ---------- wereld & bewaren ----------

  freshWorld(type) {
    this.world.generate(type);
    this.player.setPos(this.world.spawnPoint());
    this.player.yaw = 0;
    this.player.pitch = -0.25;
    this.player.flying = false;
    this.undoStack = [];
  }

  makeSave() {
    const p = this.player;
    return {
      v: 1,
      t: Date.now(),
      type: this.world.type,
      seed: this.world.seed,
      blocks: this.world.serialize(),
      player: { x: p.x, y: p.y, z: p.z, yaw: p.yaw, pitch: p.pitch, flying: p.flying },
      hotbar: this.hotbar,
      sel: this.sel,
      mode: this.mode,
    };
  }

  applySave(s) {
    try {
      if (!s || s.v !== 1 || typeof s.blocks !== 'string') return false;
      this.world.deserialize(s.blocks);
      this.world.type = s.type || 'island';
      this.world.seed = s.seed || 1;
      const p = s.player || {};
      const num = (v, d) => (Number.isFinite(v) ? v : d);
      const sp = this.world.spawnPoint();
      this.player.setPos({ x: num(p.x, sp.x), y: num(p.y, sp.y), z: num(p.z, sp.z) });
      this.player.yaw = num(p.yaw, 0);
      this.player.pitch = num(p.pitch, -0.25);
      this.player.flying = !!p.flying;
      this.player.unstick(this.world);
      if (Array.isArray(s.hotbar) && s.hotbar.length === DEFAULT_HOTBAR.length && s.hotbar.every((id) => PALETTE.includes(id))) {
        this.hotbar = [...s.hotbar];
      }
      this.sel = Number.isInteger(s.sel) && s.sel >= 0 && s.sel < this.hotbar.length ? s.sel : 0;
      this.mode = s.mode === 'break' ? 'break' : 'build';
      this.undoStack = [];
      return true;
    } catch (e) {
      // deserialize() verandert niets als het mislukt, dus de huidige wereld blijft staan
      console.warn('Kon wereld niet laden', e);
      return false;
    }
  }

  saveNow() {
    const s = this.makeSave();
    this.storage.save('world', s);
    this.saveT = s.t;
    this.dirty = false;
    this.lastPosSave = performance.now() / 1000;
    this.savedPos = this.posKey();
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

  hasBackup() { return !!this.storage.loadLocal('backup'); }

  // Op claude.ai: kijk of er in de database een nieuwere versie staat
  async syncRemote() {
    const db = await this.storage.connect();
    if (!db) return;
    const [remote, remoteBackup] = await Promise.all([this.storage.loadRemote('world'), this.storage.loadRemote('backup')]);
    const localBackup = this.storage.loadLocal('backup');
    if (remoteBackup && (!localBackup || remoteBackup.t > localBackup.t)) this.storage.saveLocal('backup', remoteBackup);
    else if (localBackup && (!remoteBackup || localBackup.t > remoteBackup.t)) this.storage.save('backup', localBackup);
    if (remote && remote.t > this.saveT && this.edits === 0) {
      if (this.applySave(remote)) {
        this.storage.saveLocal('world', remote);
        this.saveT = remote.t;
        this.scene.rebuildAll(this.world);
        this.refreshUI();
      }
    } else if (this.saveT && (!remote || this.saveT > remote.t)) {
      this.saveNow();
    }
    this.ui.setBackupAvailable(this.hasBackup());
  }

  newWorld(type) {
    this.storage.save('backup', this.makeSave());
    this.freshWorld(type);
    this.scene.rebuildAll(this.world);
    this.saveNow();
    this.refreshUI();
    this.play();
  }

  restoreBackup() {
    const backup = this.storage.loadLocal('backup');
    if (!backup) return;
    const current = this.makeSave();
    if (!this.applySave(backup)) return;
    this.storage.save('backup', current);
    this.scene.rebuildAll(this.world);
    this.saveNow();
    this.refreshUI();
    this.play();
  }

  // ---------- menu & knoppen ----------

  refreshUI() {
    this.ui.setHotbar(this.hotbar, this.sel);
    this.ui.setMode(this.mode);
    this.ui.setFlying(this.player.flying);
  }

  play() {
    this.sounds.unlock();
    this.ui.hideMenu();
    this.ui.closePalette();
    this.playing = true;
    this.input.enabled = true;
    this.sounds.pop();
  }

  openMenu() {
    this.playing = false;
    this.input.enabled = false;
    this.input.releaseAll();
    this.saveNow();
    this.ui.closePalette();
    this.ui.showMenu(this.hasBackup());
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
    this.ui.openPalette();
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

  toggleFly() {
    const p = this.player;
    p.flying = !p.flying;
    if (p.flying) p.vy = 4;
    this.ui.setFlying(p.flying);
    this.sounds.whoosh();
  }

  toggleSound() {
    this.sounds.unlock();
    this.sounds.muted = !this.sounds.muted;
    this.storage.saveLocal('settings', { muted: this.sounds.muted });
    this.ui.setMuted(this.sounds.muted);
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
    else if (e.code === 'KeyQ' || e.code === 'KeyB') this.setMode(this.mode === 'build' ? 'break' : 'build', true);
    else if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey)) this.undo();
    else if (/^Digit[1-9]$/.test(e.code)) this.select(Number(e.code.slice(5)) - 1);
  }

  // ---------- bouwen & slopen ----------

  rayFrom(x, y) {
    const w = window.innerWidth, h = window.innerHeight;
    this.raycaster.setFromCamera(new THREE.Vector2((x / w) * 2 - 1, -(y / h) * 2 + 1), this.scene.camera);
    return raycast(this.world, this.scene.camera.position, this.raycaster.ray.direction, REACH);
  }

  act(tap) {
    const mode = tap.alt ? (this.mode === 'build' ? 'break' : 'build') : this.mode;
    this.ui.tapRing(tap.x, tap.y, mode);
    const hit = this.rayFrom(tap.x, tap.y);
    if (!hit) return;
    if (mode === 'build') this.place(hit);
    else this.breakBlock(hit);
  }

  place(hit) {
    const w = this.world, id = this.hotbar[this.sel], nb = BLOCKS[id];
    const hb = BLOCKS[hit.id];
    // Op een plantje of in water tikken = dat vakje vervangen
    const inPlace = hb.replaceable && hit.id !== id;
    const x = inPlace ? hit.x : hit.x + hit.nx;
    const y = inPlace ? hit.y : hit.y + hit.ny;
    const z = inPlace ? hit.z : hit.z + hit.nz;
    const existing = w.get(x, y, z);
    const ok = w.inside(x, y, z) &&
      BLOCKS[existing].replaceable && existing !== id &&
      !(nb.solid && this.player.overlapsBlock(x, y, z)) &&
      !(nb.render === 'cross' && !BLOCKS[w.get(x, y - 1, z)].opaque);
    if (!ok) { this.sounds.nope(); return; }
    this.apply([{ x, y, z, from: existing, to: id }]);
    this.sounds.place(nb.sound);
    this.particles.burst(x, y, z, [[1, 1, 1], [0.92, 0.95, 1]], 7, true);
    this.flash = { x, y, z, until: performance.now() / 1000 + 0.35 };
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
    const above = w.get(x, y + 1, z);
    if (BLOCKS[above].render === 'cross') changes.push({ x, y: y + 1, z, from: above, to: AIR });
    this.apply(changes);
    this.sounds.break(b.sound);
    this.particles.burst(x, y, z, this.atlas.particleColors[hit.id], 18);
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

  // ---------- de spel-lus ----------

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.scene.resize(w, h);
  }

  frame(t) {
    requestAnimationFrame((tt) => this.frame(tt));
    const now = t / 1000;
    const dt = Math.min(0.05, Math.max(0, now - this.last));
    this.last = now;
    const p = this.player;

    this.input.poll();
    if (this.playing && !this.ui.paletteOpen) {
      const [dx, dy] = this.input.takeLook();
      p.yaw -= dx;
      p.pitch = Math.max(-1.55, Math.min(1.55, p.pitch - dy));
      for (const tap of this.input.taps.splice(0)) this.act(tap);
      p.update(dt, this.input, this.world, now);
    } else {
      this.input.takeLook();
      this.input.taps.length = 0;
      if (this.ui.menuOpen) p.yaw += dt * 0.06; // langzaam rondkijken achter het menu
    }

    const cam = this.scene.camera;
    cam.position.set(p.x, p.y + EYE, p.z);
    cam.rotation.set(p.pitch, p.yaw, 0);

    // Randje om het blok onder de muis, of kort om het blok dat je net bouwde
    let hl = null;
    if (this.flash && now < this.flash.until) hl = this.flash;
    else if (this.playing && this.input.hover && !this.ui.paletteOpen) hl = this.rayFrom(this.input.hover.x, this.input.hover.y);
    this.scene.showHighlight(hl);

    this.scene.updateChunks(this.world, 3);
    this.particles.update(dt, this.world);
    this.scene.updateClouds(dt);
    this.scene.render();

    // Automatisch bewaren
    if (this.dirty && now - this.dirtyAt > 1.5) this.saveNow();
    else if (this.playing && now - this.lastPosSave > 20) {
      if (this.posKey() !== this.savedPos) this.saveNow();
      else this.lastPosSave = now;
    }

    this.adaptQuality(dt);
  }

  // Als de iPad het niet bijhoudt: iets minder scherp tekenen
  adaptQuality(dt) {
    this.frameTimes.push(dt);
    if (this.frameTimes.length < 120) return;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.frameTimes.length = 0;
    if (avg > 1 / 40 && this.scene.pixelRatio > 1) {
      this.scene.setPixelRatio(Math.max(1, this.scene.pixelRatio - 0.25));
      this.resize();
    }
  }
}

function start() {
  const root = document.getElementById('app');
  try {
    window.__jippecraft = new Game(root);
  } catch (e) {
    console.error(e);
    root.innerHTML = '<div class="error"><h1>Oeps!</h1><p>Dit apparaat kan het spel niet laten zien. Probeer Safari of Chrome.</p></div>';
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
document.addEventListener('touchmove', (e) => { if (!e.target.closest?.('.palette-grid')) e.preventDefault(); }, { passive: false });

start();
