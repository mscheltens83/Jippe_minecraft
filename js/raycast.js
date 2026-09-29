// Welk blok raak je als je vanaf de camera in een richting kijkt?
// Stapt blok voor blok langs de straal (voxel-DDA).

import { AIR, B, BLOCKS } from './blocks.js';

// `stop(id)` bepaalt welke blokken de straal tegenhouden (standaard: alles behalve lucht)
export function raycast(world, origin, dir, maxDist, stop = null) {
  let x = Math.floor(origin.x), y = Math.floor(origin.y), z = Math.floor(origin.z);
  const stepX = dir.x > 0 ? 1 : -1, stepY = dir.y > 0 ? 1 : -1, stepZ = dir.z > 0 ? 1 : -1;
  const tDeltaX = Math.abs(1 / dir.x), tDeltaY = Math.abs(1 / dir.y), tDeltaZ = Math.abs(1 / dir.z);
  const frac = (v, s) => (s > 0 ? Math.floor(v) + 1 - v : v - Math.floor(v));
  let tMaxX = dir.x !== 0 ? frac(origin.x, stepX) * tDeltaX : Infinity;
  let tMaxY = dir.y !== 0 ? frac(origin.y, stepY) * tDeltaY : Infinity;
  let tMaxZ = dir.z !== 0 ? frac(origin.z, stepZ) * tDeltaZ : Infinity;
  // Zit de camera onder water, dan kun je door het water heen bouwen
  const skipWater = world.get(x, y, z) === B.WATER;
  let nx = 0, ny = 0, nz = 0, t = 0;

  while (t <= maxDist) {
    if (tMaxX < tMaxY && tMaxX < tMaxZ) {
      x += stepX; t = tMaxX; tMaxX += tDeltaX; nx = -stepX; ny = 0; nz = 0;
    } else if (tMaxY < tMaxZ) {
      y += stepY; t = tMaxY; tMaxY += tDeltaY; nx = 0; ny = -stepY; nz = 0;
    } else {
      z += stepZ; t = tMaxZ; tMaxZ += tDeltaZ; nx = 0; ny = 0; nz = -stepZ;
    }
    if (t > maxDist) break;
    if (y < 0 && stepY < 0) break;
    const id = world.get(x, y, z);
    // Het bovenste halve stuk van een hek of hekdeur zit in een leeg rastervak.
    if (id === AIR && y > 0 && (BLOCKS[world.get(x, y - 1, z)]?.shape === 'fence' || BLOCKS[world.get(x, y - 1, z)]?.shape === 'gate')) {
      const below = world.get(x, y - 1, z);
      if (!stop || stop(below)) return { x, y: y - 1, z, nx, ny, nz, id: below, dist: t };
    }
    if (stop ? stop(id) : id !== AIR && !(skipWater && id === B.WATER)) {
      return { x, y, z, nx, ny, nz, id, dist: t };
    }
  }
  return null;
}
