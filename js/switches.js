// Knoppen, hendels en drukplaten (fase 5E). Simpeler dan redstone: er zijn geen draden.
// Staat er een schakelaar aan binnen 4 blokken, dan gaan deuren en hekken open en lampen aan.
// Gaat hij uit (en staat er verder niets aan), dan gaan ze weer dicht en uit.

import { B, BLOCKS, doorId, gateId } from './blocks.js';

export const RANGE = 4;
export const isSwitch = (id) => BLOCKS[id]?.schakel !== undefined;
export const switchOn = (id) => isSwitch(id) && !!BLOCKS[id].aan;

// Staat er een schakelaar aan in de buurt van dit vakje?
export function powered(world, x, y, z) {
  for (let dx = -RANGE; dx <= RANGE; dx++) for (let dy = -RANGE; dy <= RANGE; dy++) for (let dz = -RANGE; dz <= RANGE; dz++) {
    if (switchOn(world.get(x + dx, y + dy, z + dz))) return true;
  }
  return false;
}

// Wat wordt dit blok als het wel of geen stroom krijgt? (null = doet niet mee)
export function targetState(id, on) {
  const b = BLOCKS[id];
  if (!b) return null;
  if (b.shape === 'door') return doorId(b.dir, b.upper, on, b.wood || 0);
  if (b.shape === 'gate') return gateId(b.dir, on, b.wood || 0);
  if (b.schakelLamp) return on ? B.SWITCH_LAMP + 1 : B.SWITCH_LAMP;
  return null;
}

// Een schakelaar op (x, y, z) ging aan of uit: welke deuren, hekken en lampen veranderen?
export function signalChanges(world, x, y, z) {
  const out = [];
  for (let dx = -RANGE; dx <= RANGE; dx++) for (let dy = -RANGE; dy <= RANGE; dy++) for (let dz = -RANGE; dz <= RANGE; dz++) {
    const tx = x + dx, ty = y + dy, tz = z + dz, id = world.get(tx, ty, tz);
    if (targetState(id, true) === null) continue;
    const to = targetState(id, powered(world, tx, ty, tz));
    if (to !== id) out.push({ x: tx, y: ty, z: tz, from: id, to });
  }
  return out;
}
