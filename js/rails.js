// Rails en het karretje (fase 5D). Een rail sluit vanzelf aan op de rails ernaast: recht, in een
// bocht of schuin omhoog (zoals in Minecraft). Het karretje volgt de rails, vak voor vak.
//
// Richtingen zijn die van DIRS: 0 = -z (noord), 1 = +x (oost), 2 = +z (zuid), 3 = -x (west).
// Rail-standen (id = B.RAIL + stand):
//   0 recht langs z, 1 recht langs x, 2..5 bocht (0-1, 1-2, 2-3, 3-0), 6..9 helling omhoog naar richting 0..3

import { B, DIRS } from './blocks.js';

export const RAIL_STATES = 10;
export const CONNECT = [[0, 2], [1, 3], [0, 1], [1, 2], [2, 3], [3, 0], [0, 2], [1, 3], [2, 0], [3, 1]];
export const isRail = (id) => id >= B.RAIL && id < B.RAIL + RAIL_STATES;
const opposite = (d) => (d + 2) % 4;

// Welke kanten verbindt deze rail, en gaat hij omhoog (naar welke kant)?
export function railInfo(id) {
  const s = id - B.RAIL;
  return { ends: CONNECT[s], up: s >= 6 ? s - 6 : -1 };
}

// De stand voor een rail met deze twee (of minder) kanten
export function stateFor(ends, up = -1) {
  if (up >= 0) return 6 + up;
  if (ends.length < 2) return (ends[0] ?? 0) % 2 === 0 ? 0 : 1;
  const [a, b] = ends;
  if ((a + 2) % 4 === b) return a % 2 === 0 ? 0 : 1;
  for (let s = 2; s <= 5; s++) if (CONNECT[s].includes(a) && CONNECT[s].includes(b)) return s;
  return 0;
}

// Is er in richting d een rail waarmee deze rail (op x, y, z) kan verbinden? Geeft de hoogte (-1, 0 of 1) of null
function railToward(world, x, y, z, d) {
  const [dx, dz] = DIRS[d];
  for (const dy of [0, 1, -1]) if (isRail(world.get(x + dx, y + dy, z + dz))) return dy;
  return null;
}

// Wijst de rail op (x, y, z) naar richting d (en klopt de hoogte)?
function pointsTo(world, x, y, z, d) {
  const id = world.get(x, y, z);
  if (!isRail(id)) return false;
  return railInfo(id).ends.includes(d);
}

// Hoeveel van de kanten van deze rail lopen echt door naar een andere rail?
function usedEnds(world, x, y, z) {
  const { ends } = railInfo(world.get(x, y, z));
  return ends.filter((d) => {
    const [dx, dz] = DIRS[d];
    for (const dy of [0, 1, -1]) if (pointsTo(world, x + dx, y + dy, z + dz, opposite(d))) return true;
    return false;
  });
}

// Kies de stand voor een nieuwe rail op (x, y, z). facing: de richting waarin Jippe kijkt.
export function placeState(world, x, y, z, facing = 0) {
  const near = [];
  for (let d = 0; d < 4; d++) {
    const dy = railToward(world, x, y, z, d);
    if (dy === null) continue;
    const [dx, dz] = DIRS[d], n = { x: x + dx, y: y + dy, z: z + dz };
    // liever rails die nog een vrije kant hebben (het eind van een spoor)
    near.push({ d, dy, free: usedEnds(world, n.x, n.y, n.z).length < 2 || pointsTo(world, n.x, n.y, n.z, opposite(d)) });
  }
  near.sort((a, b) => Number(b.free) - Number(a.free));
  const up = near.find((n) => n.dy === 1 && n.free);
  if (up) return stateFor([], up.d);
  const ends = near.filter((n) => n.free).slice(0, 2).map((n) => n.d);
  if (!ends.length) return facing % 2 === 0 ? 0 : 1;
  return stateFor(ends);
}

// Na het neerleggen van een rail: rails ernaast met een vrije kant draaien naar de nieuwe rail toe.
// Geeft een lijst wijzigingen { x, y, z, from, to }.
export function neighbourChanges(world, x, y, z) {
  const out = [];
  for (let d = 0; d < 4; d++) {
    const [dx, dz] = DIRS[d];
    for (const dy of [0, 1, -1]) {
      const nx = x + dx, ny = y + dy, nz = z + dz, id = world.get(nx, ny, nz);
      if (!isRail(id)) continue;
      const back = opposite(d);
      if (railInfo(id).ends.includes(back) && (dy !== 1 || railInfo(id).up < 0)) break; // wijst al naar ons
      const used = usedEnds(world, nx, ny, nz);
      if (used.length >= 2) break; // al vol: niet aan zitten
      // ligt de nieuwe rail lager, dan gaat deze rail schuin omlaag naar ons toe? Nee: dan helt de buur omhoog van ons af
      let state;
      if (dy === -1) state = stateFor([], back); // de buur ligt lager: hij helt omhoog naar ons toe
      else state = stateFor([...used.slice(0, 1), back]);
      const to = B.RAIL + state;
      if (to !== id) out.push({ x: nx, y: ny, z: nz, from: id, to });
      break;
    }
  }
  return out;
}

// ---------- het karretje volgen over de rails ----------
// cart: { x, y, z, speed, from, to, t, cell: [x, y, z] }. Binnen één vak loopt het pad van het
// midden van kant `from` naar het midden en dan naar het midden van kant `to` (t van 0 tot 1).

const edge = (d) => [0.5 + DIRS[d][0] * 0.5, 0.5 + DIRS[d][1] * 0.5];

// Waar staat het karretje in zijn vak (x, y, z) en welke kant kijkt het op?
export function cartPose(cart) {
  const [cx, cy, cz] = cart.cell, a = edge(cart.from), b = edge(cart.to), t = cart.t;
  let px, pz;
  if (t < 0.5) { const k = t * 2; px = a[0] + (0.5 - a[0]) * k; pz = a[1] + (0.5 - a[1]) * k; } else { const k = (t - 0.5) * 2; px = 0.5 + (b[0] - 0.5) * k; pz = 0.5 + (b[1] - 0.5) * k; }
  const info = cart.info;
  let py = cy + 0.06;
  if (info.up >= 0) py += info.up === cart.to ? t : 1 - t; // op een helling: omhoog of omlaag
  const dir = t < 0.5 ? opposite(cart.from) : cart.to;
  return { x: cx + px, y: py, z: cz + pz, yaw: Math.atan2(-DIRS[dir][0], -DIRS[dir][1]), dir };
}

// Zet het karretje op de rail in dit vak, rijdend in de richting die het best past bij `facing`
export function startCart(world, x, y, z, facing) {
  const id = world.get(x, y, z);
  if (!isRail(id)) return null;
  const info = railInfo(id), [a, b] = info.ends;
  const to = b === facing || (a !== facing && Math.abs(((b - facing + 4) % 4) - 2) > Math.abs(((a - facing + 4) % 4) - 2)) ? b : a;
  return { cell: [x, y, z], from: to === a ? b : a, to, t: 0.5, speed: 0, info };
}

// Het volgende vak in richting `to`, of null als de rails ophouden
function nextCell(world, cart) {
  const [x, y, z] = cart.cell, d = cart.to, [dx, dz] = DIRS[d];
  const ups = cart.info.up === d ? [1] : [0, -1];
  for (const dy of ups) {
    const nx = x + dx, ny = y + dy, nz = z + dz, id = world.get(nx, ny, nz);
    if (!isRail(id)) continue;
    const info = railInfo(id), back = opposite(d);
    if (!info.ends.includes(back)) continue;
    if (dy === -1 && info.up !== back) continue; // naar beneden alleen via een helling die naar ons toe omhoog loopt
    if (dy === 0 && info.up === back) continue;  // een helling met de hoge kant naar ons toe: daar kun je niet op
    return { cell: [nx, ny, nz], from: back, to: info.ends[0] === back ? info.ends[1] : info.ends[0], info };
  }
  return null;
}

// Een stapje rijden. push: -1..1 (stuurknop vooruit of achteruit). Geeft true als het karretje beweegt.
export function stepCart(world, cart, push, dt) {
  // hellingen: omlaag gaat vanzelf sneller, omhoog langzamer
  const slope = cart.info.up < 0 ? 0 : cart.info.up === cart.to ? -1 : 1;
  cart.speed += (push * 7 + slope * 6) * dt;
  cart.speed *= Math.max(0, 1 - (push ? 0.2 : 0.9) * dt); // vanzelf uitrollen
  cart.speed = Math.max(-8, Math.min(8, cart.speed));
  if (Math.abs(cart.speed) < 0.02 && !push && !slope) { cart.speed = 0; return false; }
  let left = cart.speed * dt;
  if (left < 0) { // achteruit: het pad omdraaien
    [cart.from, cart.to] = [cart.to, cart.from]; cart.t = 1 - cart.t; cart.speed = -cart.speed; left = -left;
  }
  while (left > 0) {
    const room = 1 - cart.t;
    if (left < room) { cart.t += left; break; }
    left -= room;
    const next = nextCell(world, cart);
    if (!next) { cart.t = 1; cart.speed = 0; return false; } // einde van de rails
    Object.assign(cart, next); cart.t = 0;
  }
  return true;
}

