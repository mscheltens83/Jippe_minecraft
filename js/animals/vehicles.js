// Karretje en bootje (fase 5D). Ze doen mee als "dier" (bewaren, tekenen, erin zitten),
// maar lopen niet zelf rond: ze staan stil tot Jippe erin gaat zitten.
import { box, part } from '../models.js';

export function buildMinecart() {
  const iron = '#8c929a', dark = '#4c5058', rim = '#b9bec6';
  const body = part([
    box(0.9, 0.1, 1.1, dark, 0, 0.18, 0),                          // bodem
    box(0.08, 0.5, 1.1, iron, -0.45, 0.45, 0), box(0.08, 0.5, 1.1, iron, 0.45, 0.45, 0),
    box(0.9, 0.5, 0.08, iron, 0, 0.45, 0.55),
    box(0.98, 0.06, 0.08, rim, 0, 0.72, 0.55), box(0.06, 0.06, 1.2, rim, -0.47, 0.72, 0), box(0.06, 0.06, 1.2, rim, 0.47, 0.72, 0),
    ...[-0.35, 0.35].flatMap((z) => [-0.48, 0.48].map((x) => box(0.08, 0.24, 0.24, '#26221f', x, 0.12, z))), // wieltjes
  ], 0, 0.4, 0);
  const head = part([box(0.9, 0.5, 0.08, iron, 0, 0.45, -0.55), box(0.98, 0.06, 0.08, rim, 0, 0.72, -0.55)], 0, 0.45, -0.55);
  return { parts: [body, head], body, head, legs: [], pattern: [] };
}

export function buildBoat() {
  const wood = '#b8874e', dark = '#7a5530';
  const body = part([
    box(1.1, 0.12, 2.0, dark, 0, 0.1, 0),                           // bodem
    box(0.1, 0.4, 2.0, wood, -0.55, 0.32, 0), box(0.1, 0.4, 2.0, wood, 0.55, 0.32, 0),
    box(1.2, 0.4, 0.1, wood, 0, 0.32, 1.0),
    box(1.0, 0.08, 0.3, dark, 0, 0.36, 0.2),                        // bankje
    box(0.08, 0.08, 1.2, dark, -0.75, 0.42, -0.1), box(0.08, 0.08, 1.2, dark, 0.75, 0.42, -0.1), // roeispanen
  ], 0, 0.3, 0);
  const head = part([box(0.8, 0.4, 0.3, wood, 0, 0.32, -1.1), box(0.4, 0.3, 0.25, wood, 0, 0.32, -1.35)], 0, 0.32, -1.0); // de punt
  return { parts: [body, head], body, head, legs: [], pattern: [] };
}
