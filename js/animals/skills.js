// Losse vaardigheden: soorten kiezen hun kunstjes in species.js.
import { B } from '../blocks.js';
import * as THREE from '../../lib/three.module.min.js';

const toward = (a, x, z) => { a.targetYaw = Math.atan2(-(x - a.x), -(z - a.z)); };
export const SKILLS = {
  rennen(a, dt, world, effects) {
    if (a.sprint > 0) {
      a.sprint = Math.max(0, a.sprint - dt);
      if (a.sprint < 0.000001) a.sprint = 0;
      if (!a.sprint) a.sprintWait = 8 + Math.random() * 12;
    } else if ((a.sprintWait -= dt) <= 0 && a.onGround && !a.happy && !a.sleep && !a.inWater) {
      a.sprint = 2; a.walking = true; a.graze = false; a.timer = 2.5;
    }
    if (a.sprint > 0 && a.walking && !a.happy) {
      a.dustTime -= dt;
      if (a.dustTime <= 0) { effects?.dustAt?.(a.x, a.y, a.z); a.dustTime = 0.1; }
    }
  },
  spuiten(a, dt, world, effects) {
    if (a.happy > 0.4 && !a.sprayed) {
      a.sprayed = true;
      // De druppels beginnen bij de opgetilde slurf en vliegen naar voren.
      const sin = Math.sin(a.yaw), cos = Math.cos(a.yaw);
      a.group.updateMatrixWorld(true);
      const tip = a.trunk.at(-1).localToWorld(new THREE.Vector3(0, -0.29, 0));
      effects?.waterAt?.(tip.x, tip.y, tip.z, -sin, -cos);
    }
  },
  kudde(a, dt, world, effects, all) {
    if ((a.skillWait -= dt) > 0 || !a.walking || a.happy) return;
    a.skillWait = 1.5;
    let best = null, distance = 12;
    for (const friend of all) {
      if (friend === a || friend.type !== a.type) continue;
      const d = Math.hypot(friend.x - a.x, friend.z - a.z);
      if (d > 3 && d < distance) { best = friend; distance = d; }
    }
    if (best) toward(a, best.x, best.z);
  },
  water(a, dt, world) {
    if ((a.skillWait -= dt) > 0 || a.happy || a.sleep) return;
    a.skillWait = 3;
    if (a.inWater) { a.walking = a.type === 'tiger' || Math.random() < 0.25; a.timer = 4; return; }
    for (let r = 1; r <= 12; r++) for (let i = 0; i < 12; i++) {
      const th = i * Math.PI / 6, x = Math.floor(a.x + Math.cos(th) * r), z = Math.floor(a.z + Math.sin(th) * r);
      for (let y = Math.floor(a.y) - 3; y <= Math.floor(a.y) + 1; y++) {
        if (world.get(x, y, z) !== B.WATER) continue;
        toward(a, x + 0.5, z + 0.5); a.walking = true; a.timer = 5; return;
      }
    }
  },
  bladeren(a, dt, world) {
    if ((a.skillWait -= dt) > 0 || a.happy || a.sleep) return;
    a.skillWait = 4; a.browsing = false;
    for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) for (let dy = 2; dy <= 5; dy++) {
      const x = Math.floor(a.x) + dx, z = Math.floor(a.z) + dz;
      if (world.get(x, Math.floor(a.y) + dy, z) !== B.ACACIA_LEAVES) continue;
      toward(a, x + 0.5, z + 0.5);
      if (Math.hypot(dx, dz) < 2.5) { a.browsing = true; a.walking = false; a.graze = true; a.timer = 4; }
      else { a.walking = true; a.timer = 3; }
      return;
    }
  },
};

export function updateSkills(a, dt, world, effects, all) {
  for (const name of a.def.kunstjes) SKILLS[name]?.(a, dt, world, effects, all);
}
