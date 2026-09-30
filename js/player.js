// De speler: lopen, springen, vliegen, zwemmen, stuiteren en botsen tegen blokken.
// Botsen gaat met kleine blokjes, zodat je een trap op kunt lopen en langs een open deur kunt.

import { B, BLOCKS, blockBoxes } from './blocks.js';
import { SX, SZ, SY } from './world.js';

const HALF = 0.3;        // halve breedte
export const HEIGHT = 1.7;
export const EYE = 1.55;
const WALK = 4.3, FLY = 9, SWIM = 2.6;
const GRAVITY = 26, JUMP = 8.4;
const STEP = 0.6;        // zo hoog stap je vanzelf op (een traptrede)
const E = 1e-4;
const KEYS = ['x', 'y', 'z'];

// Alle botsblokjes in een gebied (in wereld-coördinaten)
function gather(world, lo, hi) {
  const out = [];
  for (let by = Math.floor(lo[1] - 0.5); by <= Math.floor(hi[1]); by++) {
    for (let bz = Math.floor(lo[2]); bz <= Math.floor(hi[2]); bz++) {
      for (let bx = Math.floor(lo[0]); bx <= Math.floor(hi[0]); bx++) {
        const b = BLOCKS[world.get(bx, by, bz)];
        if (!b.solid) continue;
        for (const q of blockBoxes(world, bx, by, bz, true)) out.push([bx + q[0], by + q[1], bz + q[2], bx + q[3], by + q[4], bz + q[5]]);
      }
    }
  }
  return out;
}

export class Player {
  constructor() {
    this.x = 0; this.y = 0; this.z = 0;
    this.vx = 0; this.vy = 0; this.vz = 0;
    this.yaw = 0; this.pitch = -0.25;
    this.onGround = false;
    this.flying = false;
    this.inWater = false;
    this.climbing = false;
    this.jumpedAt = 0;
    this.riding = null;
  }

  setPos(p) { this.x = p.x; this.y = p.y; this.z = p.z; this.vx = this.vy = this.vz = 0; this.climbing = false; }

  box(x = this.x, y = this.y, z = this.z) {
    const half = this.riding ? 0.45 : HALF, height = this.riding ? 1.9 : HEIGHT;
    return [x - half, y, z - half, x + half, y + height, z + half];
  }

  collides(world, x, y, z) {
    const a = this.box(x, y, z);
    const boxes = gather(world, [a[0] + E, a[1] + E, a[2] + E], [a[3] - E, a[4] - E, a[5] - E]);
    return boxes.some((q) => q[0] < a[3] - E && q[3] > a[0] + E && q[1] < a[4] - E && q[4] > a[1] + E && q[2] < a[5] - E && q[5] > a[2] + E);
  }

  // Overlapt het blok (bx,by,bz) met de speler? (dan mag je daar normaal niet bouwen)
  overlapsBlock(bx, by, bz) {
    const half = this.riding ? 0.45 : HALF, height = this.riding ? 1.9 : HEIGHT;
    return bx < this.x + half && bx + 1 > this.x - half &&
      by < this.y + height && by + 1 > this.y &&
      bz < this.z + half && bz + 1 > this.z - half;
  }

  // Bouw je een blok waar je voeten staan? Dan wip je erbovenop (zo bouw je een toren)
  canLiftOver(world, by) {
    return by === Math.floor(this.y + E) && !this.collides(world, this.x, by + 1, this.z);
  }

  liftTo(y) {
    this.y = y;
    this.vy = 0;
    this.onGround = true;
  }

  // Zit je vast in een blok? Schuif dan omhoog tot je vrij bent
  unstick(world) {
    let n = 0;
    while (this.collides(world, this.x, this.y, this.z) && n++ < SY + 8) this.y = Math.floor(this.y) + 1.001;
  }

  // Beweeg langs één as en stop netjes tegen blokjes. Geeft true als we ergens tegenaan kwamen.
  moveAxis(world, axis, d) {
    if (d === 0) return false;
    const a = this.box();
    const lo = [a[0], a[1], a[2]], hi = [a[3], a[4], a[5]];
    if (d > 0) hi[axis] += d; else lo[axis] += d;
    const o1 = (axis + 1) % 3, o2 = (axis + 2) % 3;
    let nd = d;
    for (const q of gather(world, lo, hi)) {
      if (q[o1 + 3] <= a[o1] + E || q[o1] >= a[o1 + 3] - E) continue;
      if (q[o2 + 3] <= a[o2] + E || q[o2] >= a[o2 + 3] - E) continue;
      if (nd > 0 && q[axis] >= a[axis + 3] - E) nd = Math.min(nd, q[axis] - a[axis + 3]);
      else if (nd < 0 && q[axis + 3] <= a[axis] + E) nd = Math.max(nd, q[axis + 3] - a[axis]);
    }
    this[KEYS[axis]] += nd;
    return Math.abs(nd - d) > 1e-7;
  }

  update(dt, input, world, now) {
    const feet = world.get(Math.floor(this.x), Math.floor(this.y + 0.3), Math.floor(this.z));
    const head = world.get(Math.floor(this.x), Math.floor(this.y + EYE), Math.floor(this.z));
    this.inWater = feet === B.WATER || head === B.WATER;
    this.climbing = !this.riding && !this.flying && (feet === B.VINE || head === B.VINE);
    const below = world.get(Math.floor(this.x), Math.floor(this.y - 0.05), Math.floor(this.z));

    // Loop-richting t.o.v. waar je kijkt
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    const mx = input.move.x, mz = input.move.y;
    const push = Math.min(1, Math.hypot(mx, mz));
    const rideSpeed = 3.5 + 3 * Math.max(0, (push - 0.45) / 0.55);
    const speed = this.riding ? rideSpeed : this.flying ? FLY : this.climbing ? 2.5 : this.inWater ? SWIM : below === B.MUD ? WALK * 0.5 : WALK;
    const tx = (-sin * mz + cos * mx) * speed;
    const tz = (-cos * mz - sin * mx) * speed;
    const slippery = !this.riding && this.onGround && !this.flying && !this.climbing && (below === B.ICE || below === B.PACKED_ICE);
    const accel = slippery ? 1.5 : this.onGround || this.flying || this.inWater || this.climbing ? 14 : 5;
    const k = Math.min(1, accel * dt);
    this.vx += (tx - this.vx) * k;
    this.vz += (tz - this.vz) * k;

    if (this.flying) {
      const up = (input.jump ? 1 : 0) - (input.down ? 1 : 0);
      this.vy += (up * 7 - this.vy) * Math.min(1, 10 * dt);
    } else if (this.climbing) {
      // Vooruit in een liaan of de springknop = omhoog; omlaag heeft voorrang.
      this.vy = (input.down ? -1 : input.jump || mz > 0.2 ? 1 : 0) * 2.5;
    } else if (this.inWater && !this.riding) {
      this.vy -= 7 * dt;
      if (input.jump) this.vy = Math.min(this.vy + 22 * dt, 3.8);
      this.vy = Math.max(this.vy, -2.5);
    } else {
      this.vy -= GRAVITY * dt;
      this.vy = Math.max(this.vy, -32);
      if (input.jump && this.onGround && now - this.jumpedAt > 0.25) {
        const bouncy = below === B.BOUNCE;
        this.vy = this.riding ? 11.5 : bouncy ? JUMP * 1.55 : JUMP;
        this.jumpedAt = now;
        if (bouncy) this.onBounce?.(); else this.onJump?.();
      }
    }

    // Horizontaal bewegen, met vanzelf opstappen op een traptrede
    const ox = this.x, oy = this.y, oz = this.z;
    let hitX = this.moveAxis(world, 0, this.vx * dt);
    let hitZ = this.moveAxis(world, 2, this.vz * dt);
    if ((hitX || hitZ) && this.onGround && !this.flying) {
      const fx = this.x, fy = this.y, fz = this.z;
      this.x = ox; this.y = oy; this.z = oz;
      this.moveAxis(world, 1, STEP);
      const sx = this.moveAxis(world, 0, this.vx * dt);
      const sz = this.moveAxis(world, 2, this.vz * dt);
      this.moveAxis(world, 1, -(STEP + 0.01));
      const plain = (fx - ox) ** 2 + (fz - oz) ** 2;
      const stepped = (this.x - ox) ** 2 + (this.z - oz) ** 2;
      if (stepped > plain + 1e-6) { hitX = sx; hitZ = sz; } else { this.x = fx; this.y = fy; this.z = fz; }
    }
    if (hitX) this.vx = 0;
    if (hitZ) this.vz = 0;

    const landing = this.vy;
    const hitY = this.moveAxis(world, 1, this.vy * dt);
    this.onGround = hitY && landing < 0;
    if (hitY) {
      const under = world.get(Math.floor(this.x), Math.floor(this.y - 0.05), Math.floor(this.z));
      if (this.onGround && under === B.BOUNCE && landing < -5 && !this.flying) {
        // Boing! Stuiter terug omhoog
        this.vy = Math.min(19, -landing * 0.85);
        this.onGround = false;
        this.onBounce?.();
      } else {
        this.vy = 0;
      }
    }

    // Automatisch springen tegen een opstapje van 1 blok
    const moving = Math.hypot(mx, mz) > 0.2;
    if ((hitX || hitZ) && this.onGround && moving && !this.flying && !this.climbing) {
      const len = Math.hypot(tx, tz) || 1;
      const ax = this.x + (tx / len) * 0.35, az = this.z + (tz / len) * 0.35;
      if (!this.collides(world, ax, this.y + 1.05, az) && this.collides(world, ax, this.y, az)) {
        this.vy = JUMP;
        this.onGround = false;
      }
    }

    // Binnen de wereld blijven
    const edge = this.riding ? 0.45 : HALF;
    this.x = Math.min(SX - edge, Math.max(edge, this.x));
    this.z = Math.min(SZ - edge, Math.max(edge, this.z));
    if (this.y > SY + 6) { this.y = SY + 6; this.vy = Math.min(this.vy, 0); }
    if (this.y < -5) this.unstick(world);
  }
}
