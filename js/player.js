// De speler: lopen, springen, vliegen, zwemmen en botsen tegen blokken.

import { B, BLOCKS } from './blocks.js';
import { SX, SZ, SY } from './world.js';

const HALF = 0.3;        // halve breedte
const HEIGHT = 1.7;
export const EYE = 1.55;
const WALK = 4.3, FLY = 9, SWIM = 2.6;
const GRAVITY = 26, JUMP = 8.4;

export class Player {
  constructor() {
    this.x = 0; this.y = 0; this.z = 0;
    this.vx = 0; this.vy = 0; this.vz = 0;
    this.yaw = 0; this.pitch = -0.25;
    this.onGround = false;
    this.flying = false;
    this.inWater = false;
    this.jumpedAt = 0;
  }

  setPos(p) { this.x = p.x; this.y = p.y; this.z = p.z; this.vx = this.vy = this.vz = 0; }

  collides(world, x, y, z) {
    const x0 = Math.floor(x - HALF), x1 = Math.floor(x + HALF - 1e-6);
    const y0 = Math.floor(y), y1 = Math.floor(y + HEIGHT - 1e-6);
    const z0 = Math.floor(z - HALF), z1 = Math.floor(z + HALF - 1e-6);
    for (let by = y0; by <= y1; by++) for (let bz = z0; bz <= z1; bz++) for (let bx = x0; bx <= x1; bx++) {
      if (BLOCKS[world.get(bx, by, bz)].solid) return true;
    }
    return false;
  }

  // Overlapt het blok (bx,by,bz) met de speler? (dan mag je daar niet bouwen)
  overlapsBlock(bx, by, bz) {
    return bx < this.x + HALF && bx + 1 > this.x - HALF &&
      by < this.y + HEIGHT && by + 1 > this.y &&
      bz < this.z + HALF && bz + 1 > this.z - HALF;
  }

  // Zit je vast in een blok? Schuif dan omhoog tot je vrij bent
  unstick(world) {
    let n = 0;
    while (this.collides(world, this.x, this.y, this.z) && n++ < SY) this.y = Math.floor(this.y) + 1.001;
  }

  // Beweeg langs één as; stop bij een blok. Geeft true als we ergens tegenaan kwamen.
  moveAxis(world, axis, d) {
    if (d === 0) return false;
    const steps = Math.ceil(Math.abs(d) / 0.35);
    const sd = d / steps;
    for (let i = 0; i < steps; i++) {
      const nx = axis === 0 ? this.x + sd : this.x;
      const ny = axis === 1 ? this.y + sd : this.y;
      const nz = axis === 2 ? this.z + sd : this.z;
      if (this.collides(world, nx, ny, nz)) {
        // schuif precies tegen het blok aan
        if (axis === 0) this.x = sd > 0 ? Math.floor(nx + HALF) - HALF - 1e-4 : Math.floor(nx - HALF) + 1 + HALF + 1e-4;
        if (axis === 1) this.y = sd > 0 ? Math.floor(ny + HEIGHT) - HEIGHT - 1e-4 : Math.floor(ny) + 1;
        if (axis === 2) this.z = sd > 0 ? Math.floor(nz + HALF) - HALF - 1e-4 : Math.floor(nz - HALF) + 1 + HALF + 1e-4;
        return true;
      }
      this.x = nx; this.y = ny; this.z = nz;
    }
    return false;
  }

  update(dt, input, world, now) {
    const feet = world.get(Math.floor(this.x), Math.floor(this.y + 0.3), Math.floor(this.z));
    const head = world.get(Math.floor(this.x), Math.floor(this.y + EYE), Math.floor(this.z));
    this.inWater = feet === B.WATER || head === B.WATER;

    // Loop-richting t.o.v. waar je kijkt
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    const mx = input.move.x, mz = input.move.y;
    const speed = this.flying ? FLY : this.inWater ? SWIM : WALK;
    const tx = (-sin * mz + cos * mx) * speed;
    const tz = (-cos * mz - sin * mx) * speed;
    const accel = this.onGround || this.flying || this.inWater ? 14 : 5;
    const k = Math.min(1, accel * dt);
    this.vx += (tx - this.vx) * k;
    this.vz += (tz - this.vz) * k;

    if (this.flying) {
      const up = (input.jump ? 1 : 0) - (input.down ? 1 : 0);
      this.vy += (up * 7 - this.vy) * Math.min(1, 10 * dt);
    } else if (this.inWater) {
      this.vy -= 7 * dt;
      if (input.jump) this.vy = Math.min(this.vy + 22 * dt, 3.8);
      this.vy = Math.max(this.vy, -2.5);
    } else {
      this.vy -= GRAVITY * dt;
      this.vy = Math.max(this.vy, -32);
      if (input.jump && this.onGround && now - this.jumpedAt > 0.25) {
        this.vy = JUMP;
        this.jumpedAt = now;
        this.onJump?.();
      }
    }

    const hitX = this.moveAxis(world, 0, this.vx * dt);
    const hitZ = this.moveAxis(world, 2, this.vz * dt);
    if (hitX) this.vx = 0;
    if (hitZ) this.vz = 0;

    const wasFalling = this.vy < 0;
    const hitY = this.moveAxis(world, 1, this.vy * dt);
    this.onGround = hitY && wasFalling;
    if (hitY) this.vy = 0;

    // Automatisch springen tegen een opstapje van 1 blok
    const moving = Math.hypot(mx, mz) > 0.2;
    if ((hitX || hitZ) && this.onGround && moving && !this.flying) {
      const len = Math.hypot(tx, tz) || 1;
      const ax = this.x + (tx / len) * 0.35, az = this.z + (tz / len) * 0.35;
      if (!this.collides(world, ax, this.y + 1.05, az) && this.collides(world, ax, this.y, az)) {
        this.vy = JUMP;
        this.onGround = false;
      }
    }

    // Binnen de wereld blijven
    this.x = Math.min(SX - HALF, Math.max(HALF, this.x));
    this.z = Math.min(SZ - HALF, Math.max(HALF, this.z));
    if (this.y > SY + 6) { this.y = SY + 6; this.vy = Math.min(this.vy, 0); }
    if (this.y < -5) this.unstick(world);
  }
}
