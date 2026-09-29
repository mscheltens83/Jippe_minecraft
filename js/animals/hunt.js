// Alleen boerderijdieren zijn prooi; alle tijden tellen uitsluitend tijdens het spelen.
import { B, blockBoxes } from '../blocks.js';

const PREY = new Set(['pig', 'chicken', 'sheep']);
const hungryAgain = () => 180 + Math.random() * 180;
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const toward = (a, x, z) => Math.atan2(-(x - a.x), -(z - a.z));

function pointBlocked(world, x, y, z) {
  const bx = Math.floor(x), bz = Math.floor(z);
  for (let by = Math.floor(y - 0.5); by <= Math.floor(y); by++) for (const q of blockBoxes(world, bx, by, bz, true)) {
    if (x >= bx + q[0] && x < bx + q[3] && y >= by + q[1] && y < by + q[4] && z >= bz + q[2] && z < bz + q[5]) return true;
  }
  return false;
}

// Een prooi vlak achter een hek telt niet als gevangen.
function reachable(world, hunter, prey) {
  const n = Math.ceil(distance(hunter, prey) * 5);
  for (let i = 1; i < n; i++) {
    const t = i / n, x = hunter.x + (prey.x - hunter.x) * t, z = hunter.z + (prey.z - hunter.z) * t;
    const y = hunter.y + (prey.y - hunter.y) * t + 0.55;
    if (pointBlocked(world, x, y, z)) return false;
  }
  return true;
}

export function updateHunt(a, dt, world, manager) {
  if (dt <= 0) return;
  a.huntPause = Math.max(0, a.huntPause - dt);
  if (PREY.has(a.type)) {
    // De hooibaal wordt om de twee seconden gezocht; bij verwijderen verdwijnt het anker.
    a.hayCheck -= dt;
    if (a.hayCheck <= 0) {
      a.hayCheck = 2; a.hay = null;
      const cx = Math.floor(a.x), cz = Math.floor(a.z), cy = Math.floor(a.y);
      let best = 6;
      for (let x = cx - 6; x <= cx + 6; x++) for (let z = cz - 6; z <= cz + 6; z++) {
        if (Math.hypot(x + 0.5 - a.x, z + 0.5 - a.z) > best) continue;
        for (let y = cy - 2; y <= cy + 1; y++) if (world.get(x, y, z) === B.HAY) {
          best = Math.hypot(x + 0.5 - a.x, z + 0.5 - a.z); a.hay = { x: x + 0.5, z: z + 0.5 };
        }
      }
    }
    if (a.fleeFrom && (!manager.list.includes(a.fleeFrom) || a.fleeFrom.hunt?.target !== a)) a.fleeFrom = null;
    if (a.fleeFrom) {
      a.walking = true; a.sleep = 0; a.graze = false;
      const away = toward(a, a.x * 2 - a.fleeFrom.x, a.z * 2 - a.fleeFrom.z);
      a.targetYaw = away;
    }
    return;
  }
  if (a.def.dieet !== 'roofdier') return;
  if (!manager.predators || a.tame) {
    if (a.hunt) manager.stopHunt(a);
    return;
  }
  if (!a.hunt) {
    a.hunger = Math.max(0, a.hunger - dt);
    if (a.hunger > 0 || a.huntPause > 0) return;
    const prey = manager.list.filter((b) => PREY.has(b.type) && distance(a, b) <= 16)
      .sort((b, c) => distance(a, b) - distance(a, c))[0];
    if (!prey) return;
    a.hunt = { target: prey, phase: 'stalk', elapsed: 0, blocked: 0, sidestep: 0 };
    a.walking = true; a.sleep = 0; a.happy = 0; a.graze = false;
    manager.effects?.warnAt?.(prey, true);
  }
  const h = a.hunt, prey = h.target;
  if (!manager.list.includes(prey)) {
    if (h.phase === 'stalk') manager.effects?.warnAt?.(prey, false);
    a.hunt = null; a.hunger = 60; return;
  }
  h.elapsed += dt;
  if (h.phase === 'stalk' && h.elapsed >= 3) {
    h.phase = 'chase'; h.elapsed = 0; prey.fleeFrom = a;
    manager.effects?.warnAt?.(prey, false);
  }
  if (h.phase === 'chase' && !manager.caught.includes(prey) && distance(a, prey) < 0.9 && reachable(world, a, prey)) {
    prey.fleeFrom = null;
    manager.caught.push(prey); manager.effects?.poofAt?.(prey.x, prey.y + 0.6, prey.z, prey.type === 'chicken');
    manager.onCatch?.();
    a.hunt = null; a.walking = false; a.eatTime = 1.2; a.sleep = 120; a.hunger = hungryAgain();
    return;
  }
  if (h.phase === 'chase' && h.elapsed >= 20) {
    prey.fleeFrom = null; a.hunt = null; a.hunger = 60; a.walking = false; a.sleep = 3;
    return;
  }
  if (h.blocked >= 3 && h.sidestep <= 0) { h.sidestep = 1.3; h.blocked = 0; h.side = Math.random() < 0.5 ? -1 : 1; }
  h.sidestep = Math.max(0, h.sidestep - dt);
  a.walking = true;
  a.targetYaw = toward(a, prey.x, prey.z) + (h.sidestep > 0 ? h.side * Math.PI / 2 : 0);
}
