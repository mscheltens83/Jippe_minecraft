// Besturing: vingers (joystick + vegen + tikken), muis en toetsenbord.

const TAP_MOVE = 14;      // zoveel pixels mag een vinger schuiven en toch een "tik" zijn
const TAP_TIME = 450;     // ms
const STICK_RADIUS = 56;
const LOOK_TOUCH = 0.0056;
const LOOK_MOUSE = 0.005;

export class Input {
  constructor(surface, stickBase, stickKnob) {
    this.surface = surface;
    this.stickBase = stickBase;
    this.stickKnob = stickKnob;
    this.enabled = false;
    this.stick = { x: 0, y: 0 };
    this.move = { x: 0, y: 0 };
    this.lookDX = 0;
    this.lookDY = 0;
    this.taps = [];
    this.hover = null;
    this.jumpButton = false;
    this.downButton = false;
    this.keys = new Set();
    this.pointers = new Map();
    this.stickId = null;
    this.onKey = null;

    surface.addEventListener('pointerdown', (e) => this.pointerDown(e));
    surface.addEventListener('pointermove', (e) => this.pointerMove(e));
    surface.addEventListener('pointerup', (e) => this.pointerUp(e, false));
    surface.addEventListener('pointercancel', (e) => this.pointerUp(e, true));
    surface.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') this.hover = null; });
    surface.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keydown', (e) => {
      if (e.repeat && this.keys.has(e.code)) return;
      this.keys.add(e.code);
      if (this.enabled || e.code === 'Escape') this.onKey?.(e);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.releaseAll(); });
  }

  pointerDown(e) {
    e.preventDefault();
    if (!this.enabled) return;
    try { this.surface.setPointerCapture(e.pointerId); } catch { /* niet erg */ }
    const w = window.innerWidth, h = window.innerHeight;
    const touch = e.pointerType !== 'mouse';
    const isStick = touch && this.stickId === null && e.clientX < w * 0.42 && e.clientY > h * 0.3;
    const p = {
      sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY,
      t: e.timeStamp, moved: false, stick: isStick, touch, button: e.button,
    };
    this.pointers.set(e.pointerId, p);
    if (isStick) {
      this.stickId = e.pointerId;
      this.stickBase.style.left = e.clientX + 'px';
      this.stickBase.style.top = e.clientY + 'px';
      this.stickBase.classList.add('active');
      this.stickKnob.style.transform = 'translate(-50%, -50%)';
    }
  }

  pointerMove(e) {
    const p = this.pointers.get(e.pointerId);
    if (!p) {
      if (e.pointerType === 'mouse') this.hover = { x: e.clientX, y: e.clientY };
      return;
    }
    e.preventDefault();
    const dist = Math.hypot(e.clientX - p.sx, e.clientY - p.sy);
    if (dist > (p.touch ? TAP_MOVE : 5)) p.moved = true;
    if (p.stick) {
      let dx = e.clientX - p.sx, dy = e.clientY - p.sy;
      const len = Math.hypot(dx, dy);
      if (len > STICK_RADIUS) { dx *= STICK_RADIUS / len; dy *= STICK_RADIUS / len; }
      this.stickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      const nx = dx / STICK_RADIUS, ny = dy / STICK_RADIUS;
      const mag = Math.hypot(nx, ny);
      // kleine dode zone, zodat een rustende duim niet laat lopen
      const f = mag < 0.15 ? 0 : Math.min(1, (mag - 0.15) / 0.75) / mag;
      this.stick.x = nx * f;
      this.stick.y = -ny * f;
    } else if (p.moved) {
      const s = p.touch ? LOOK_TOUCH : LOOK_MOUSE;
      this.lookDX += (e.clientX - p.x) * s;
      this.lookDY += (e.clientY - p.y) * s;
    }
    p.x = e.clientX; p.y = e.clientY;
    if (e.pointerType === 'mouse') this.hover = { x: e.clientX, y: e.clientY };
  }

  pointerUp(e, cancelled) {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    this.pointers.delete(e.pointerId);
    if (p.stick) this.resetStick();
    if (!cancelled && this.enabled && !p.moved && !p.didBreak && e.timeStamp - p.t < TAP_TIME) {
      this.taps.push({ x: p.sx, y: p.sy, alt: p.button === 2 });
    }
  }

  // Een vinger (of linker muisknop) die stil blijft staan: vasthouden om te slopen
  get hold() {
    for (const p of this.pointers.values()) {
      if (!p.stick && !p.moved && (p.touch || p.button === 0)) return p;
    }
    return null;
  }

  resetStick() {
    this.stickId = null;
    this.stick.x = this.stick.y = 0;
    this.stickBase.classList.remove('active');
    this.stickBase.style.left = '';
    this.stickBase.style.top = '';
    this.stickKnob.style.transform = 'translate(-50%, -50%)';
  }

  releaseAll() {
    this.pointers.clear();
    this.resetStick();
    this.jumpButton = false;
    this.downButton = false;
    this.taps.length = 0;
  }

  // Wordt elk beeldje aangeroepen
  poll() {
    const k = this.keys;
    let kx = 0, ky = 0;
    if (k.has('KeyW') || k.has('ArrowUp')) ky += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) ky -= 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) kx -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) kx += 1;
    if (kx && ky) { kx *= Math.SQRT1_2; ky *= Math.SQRT1_2; }
    this.move.x = this.enabled ? Math.max(-1, Math.min(1, kx + this.stick.x)) : 0;
    this.move.y = this.enabled ? Math.max(-1, Math.min(1, ky + this.stick.y)) : 0;
    this.jump = this.enabled && (this.jumpButton || k.has('Space'));
    this.down = this.enabled && (this.downButton || k.has('ShiftLeft') || k.has('ShiftRight'));
  }

  takeLook() {
    const r = [this.lookDX, this.lookDY];
    this.lookDX = this.lookDY = 0;
    return r;
  }
}
