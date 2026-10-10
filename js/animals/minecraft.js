// De Minecraft-dieren (fase 4G): koe, paard, hond, kat, konijn, vos, bij, geit, lama, vis,
// dolfijn en inktvis. Blokkig zoals in Minecraft. Sommige soorten hebben meer kleuren
// (variant): elk dier kiest er bij het neerzetten één.
import { box, part } from '../models.js';

// Kleuren per variant (paard: 6 vachten, kat: 3, konijn: 3, lama: 4 kleedjes, vis: 4 soorten)
export const VARIANTS = {
  horse: [['#8b5a2b', '#3d2616'], ['#3b2a20', '#1d140f'], ['#d9c39a', '#f4ead2'], ['#f2f0ea', '#cfcac0'], ['#7c7c80', '#3f3f44'], ['#26221f', '#0f0d0c']],
  cat: [['#e39a4c', '#fff3e0'], ['#8f8f96', '#d9d9de'], ['#2b2b30', '#f2f2f2']],
  rabbit: [['#9a7653', '#e9d7c0'], ['#f2efe9', '#ffffff'], ['#55453a', '#8e7766']],
  llama: [['#d84a3a'], ['#3f7fd0'], ['#5cb84a'], ['#f0c030']],
  fish: [['#c99b5a', '#e8d2a8'], ['#e8642a', '#ffffff'], ['#3b82d6', '#f2d33a'], ['#f2d33a', '#2b2b30']],
};

const EYE = '#1f252a';

// Een dier op vier poten: lijf, kop (eventueel aan een nek), oren, staart en poten.
function beast(p) {
  const { w, h, d } = p;
  const legH = h * (p.legH ?? 0.36), bodyH = h * (p.bodyH ?? 0.36), bodyY = legH + bodyH / 2;
  const bodyGeo = [box(w, bodyH, d * 0.72, p.body, 0, bodyY, 0)];
  if (p.spots) {
    bodyGeo.push(box(w + 0.02, bodyH * 0.55, d * 0.22, p.spots, 0, bodyY + bodyH * 0.12, -d * 0.12));
    bodyGeo.push(box(w * 0.6, bodyH * 0.5, d * 0.18, p.spots, w * 0.2 + 0.01, bodyY - bodyH * 0.1, d * 0.2));
    bodyGeo.push(box(w * 0.55, 0.02, d * 0.25, p.spots, -w * 0.15, bodyY + bodyH / 2 + 0.01, d * 0.05));
  }
  if (p.belly) bodyGeo.push(box(w * 0.8, 0.02, d * 0.6, p.belly, 0, legH - 0.005, 0));
  if (p.blanket) {
    bodyGeo.push(box(w + 0.04, bodyH * 0.35, d * 0.5, p.blanket, 0, bodyY + bodyH * 0.35, 0));
    bodyGeo.push(box(w + 0.05, 0.06, d * 0.5, '#f4f1ea', 0, bodyY + bodyH * 0.15, 0));
  }
  const body = part(bodyGeo, 0, bodyY, 0);
  const parts = [body];

  // Kop (met nek voor paard en lama)
  const headS = p.head ?? 0.42;
  const hw = w * (p.headW ?? 0.85), hh = h * headS * 0.55, hd = d * (p.headD ?? 0.32);
  // Nek (paard en lama): vanaf de voorkant van het lijf omhoog, bij het paard schuin naar voren
  const neckH = p.neck ? h * 0.42 : 0, tilt = p.neckTilt || 0;
  const baseY = bodyY + bodyH / 2 - 0.08, baseZ = -d * 0.3;
  const up = Math.cos(tilt), fwd = Math.sin(tilt);
  const headY = p.neck ? baseY + up * neckH : bodyY + bodyH * 0.35;
  const headZ = p.neck ? baseZ - fwd * neckH - hd * 0.3 : -d * 0.36 - hd / 2 + 0.04;
  const headGeo = [box(hw, hh, hd, p.face || p.body, 0, headY, headZ)];
  if (p.neck) {
    const nw = w * 0.42, nd = d * 0.2;
    const neck = box(nw, neckH + 0.1, nd, p.body); neck.rotateX(-tilt); neck.translate(0, baseY + up * neckH / 2, baseZ - fwd * neckH / 2);
    headGeo.push(neck);
    if (p.mane) {
      const mane = box(w * 0.14, neckH + 0.15, d * 0.08, p.mane); mane.rotateX(-tilt);
      mane.translate(0, baseY + up * neckH / 2 + fwd * nd * 0.55, baseZ - fwd * neckH / 2 + up * nd * 0.55);
      headGeo.push(mane);
    }
  }
  if (p.snout) headGeo.push(box(hw * 0.62, hh * 0.45, d * 0.08, p.snout, 0, headY - hh * 0.22, headZ - hd / 2 - d * 0.035));
  for (const s of [-1, 1]) headGeo.push(box(0.05, 0.05, 0.02, EYE, s * hw * 0.3, headY + hh * 0.12, headZ - hd / 2 - 0.006));
  if (p.horns) for (const s of [-1, 1]) headGeo.push(box(0.07, hh * 0.45, 0.07, p.horns, s * hw * 0.42, headY + hh * 0.65, headZ + hd * 0.2));
  if (p.beard) headGeo.push(box(hw * 0.25, hh * 0.45, 0.06, p.beard, 0, headY - hh * 0.65, headZ - hd * 0.3));
  const head = part(headGeo, 0, headY - hh / 2, headZ + hd / 2);
  parts.push(head);

  const ears = [];
  if (p.ears) for (const s of [-1, 1]) {
    const tall = p.ears === 'tall', point = p.ears === 'point';
    const eh = tall ? hh * 1.1 : point ? hh * 0.45 : hh * 0.3, ew = tall ? hw * 0.2 : hw * 0.24;
    const ex = s * hw * (tall ? 0.22 : 0.33), ey = headY + hh / 2 + eh / 2;
    const ear = part([box(ew, eh, 0.06, p.earColor || p.body, ex, ey, headZ + hd * 0.15)], ex, headY + hh / 2, headZ + hd * 0.15);
    ears.push(ear); parts.push(ear);
  }

  let tail = null;
  if (p.tail === 'long') {
    // een lange staart hangt naar beneden (koe, paard, kat)
    const th = bodyH * (p.tailLen ?? 1.1), ty = bodyY + bodyH * 0.35;
    tail = part([box(0.1, th, 0.1, p.tailColor || p.body, 0, ty - th / 2, d * 0.36 + 0.06)], 0, ty, d * 0.36);
    tail.rotation.x = p.tailLift ?? 0.25;
    parts.push(tail);
  } else if (p.tail) {
    const long = false, bushy = p.tail === 'bushy';
    const tw = bushy ? w * 0.32 : long ? 0.1 : 0.14, th = bushy ? bodyH * 0.45 : 0.12, td = bushy ? d * 0.45 : long ? d * 0.5 : d * 0.15;
    const tailGeo = [box(tw, th, td, p.tailColor || p.body, 0, bodyY + bodyH * 0.2 - (long ? 0.08 : 0), d * 0.36 + td / 2)];
    if (bushy && p.tailTip) tailGeo.push(box(tw * 1.02, th * 1.02, td * 0.3, p.tailTip, 0, bodyY + bodyH * 0.2, d * 0.36 + td * 0.88));
    tail = part(tailGeo, 0, bodyY + bodyH * 0.2, d * 0.36);
    parts.push(tail);
  }

  // Een halsband (hond) of zadel (paard): alleen zichtbaar als het dier tam is
  let saddle = null;
  if (p.collar) {
    saddle = part([box(hw * 1.05, hh * 0.22, 0.12, p.collar, 0, headY - hh * 0.55, headZ + hd * 0.55)], 0, headY, headZ);
    parts.push(saddle);
  } else if (p.saddle) {
    saddle = part([box(w + 0.04, 0.1, d * 0.3, p.saddle, 0, bodyY + bodyH / 2 + 0.04, -d * 0.04),
      box(0.04, bodyH * 0.6, 0.12, '#3a2a1c', w / 2 + 0.03, bodyY, -d * 0.04), box(0.04, bodyH * 0.6, 0.12, '#3a2a1c', -w / 2 - 0.03, bodyY, -d * 0.04)], 0, bodyY, 0);
    parts.push(saddle);
  }

  const legs = [], legW = w * (p.legW ?? 0.28);
  for (const z of [-d * 0.26, d * 0.26]) for (const s of [-1, 1]) {
    const x = s * (w / 2 - legW / 2);
    legs.push(part([box(legW, legH, legW, p.legs || p.body, x, legH / 2, z)], x, legH, z));
  }
  return { parts, body, head, ears, tail, saddle, legs, wings: [], pattern: [1, -1, -1, 1] };
}

// Een bij: klein streepjeslijf, doorzichtig lijkende vleugels, kleine pootjes
function bee() {
  const w = 0.34, h = 0.38, d = 0.44, y = 0.2;
  const body = part([box(w, h * 0.6, d, '#f2c230', 0, y, 0), box(w + 0.01, h * 0.61, 0.07, '#2a2420', 0, y, 0.02),
    box(w + 0.01, h * 0.61, 0.07, '#2a2420', 0, y, 0.15), box(0.04, 0.04, 0.08, '#2a2420', 0, y - 0.02, d / 2 + 0.03)], 0, y, 0);
  const head = part([box(w * 0.9, h * 0.55, 0.12, '#2a2420', 0, y + 0.01, -d / 2 - 0.05),
    box(0.05, 0.05, 0.02, '#ffffff', -0.08, y + 0.04, -d / 2 - 0.115), box(0.05, 0.05, 0.02, '#ffffff', 0.08, y + 0.04, -d / 2 - 0.115),
    box(0.02, 0.1, 0.02, '#2a2420', -0.06, y + 0.15, -d / 2 - 0.06), box(0.02, 0.1, 0.02, '#2a2420', 0.06, y + 0.15, -d / 2 - 0.06)], 0, y, -d / 2);
  const wings = [-1, 1].map((s) => part([box(0.2, 0.02, 0.16, '#e4eef6', s * 0.14, y + h * 0.32, -0.02)], s * 0.06, y + h * 0.32, -0.02));
  const legs = [-1, 1].map((s) => part([box(0.04, 0.08, 0.04, '#2a2420', s * 0.08, y - h * 0.3 - 0.04, 0)], s * 0.08, y - h * 0.3, 0));
  return { parts: [body, head, ...wings], body, head, wings, ears: [], legs, pattern: [1, -1] };
}

// Vis en dolfijn: een lijf met een staartvin (die als "staart" heen en weer zwiept), geen poten
function swimmer(p) {
  const { w, h, d } = p, y = h / 2;
  const bodyGeo = [box(w, h * 0.8, d * 0.75, p.body, 0, y, 0)];
  if (p.stripe) bodyGeo.push(box(w + 0.01, h * 0.81, d * 0.1, p.stripe, 0, y, -d * 0.05));
  if (p.belly) bodyGeo.push(box(w * 0.8, 0.02, d * 0.6, p.belly, 0, y - h * 0.4, 0));
  if (p.fin) bodyGeo.push(box(0.06, h * 0.45, d * 0.18, p.body, 0, y + h * 0.55, d * 0.05));
  for (const s of [-1, 1]) bodyGeo.push(box(w * 0.4, 0.04, d * 0.14, p.body, s * w * 0.6, y - h * 0.15, -d * 0.12));
  const body = part(bodyGeo, 0, y, 0);
  const headGeo = [box(w * 0.85, h * 0.7, d * 0.2, p.face || p.body, 0, y, -d * 0.47)];
  if (p.beak) headGeo.push(box(w * 0.4, h * 0.25, d * 0.14, p.face || p.body, 0, y - h * 0.15, -d * 0.62));
  for (const s of [-1, 1]) headGeo.push(box(0.025, 0.05, 0.05, EYE, s * w * 0.43, y + h * 0.1, -d * 0.48));
  const head = part(headGeo, 0, y, -d * 0.37);
  const tail = part([box(0.05, h * 0.9, d * 0.18, p.tailColor || p.body, 0, y, d * 0.46), box(w * 0.9, 0.05, d * 0.14, p.tailColor || p.body, 0, y, d * 0.5)], 0, y, d * 0.37);
  return { parts: [body, head, tail], body, head, tail, wings: [], ears: [], legs: [], pattern: [] };
}

// Inktvis: een hoog lijf met acht tentakels eronder (die als "poten" bewegen)
function squid() {
  const w = 0.6, h = 0.7, y = 0.75;
  const body = part([box(w, h, w, '#2e3f6b', 0, y, 0), box(0.06, 0.08, 0.02, '#ffffff', -0.15, y - 0.12, -w / 2 - 0.01),
    box(0.06, 0.08, 0.02, '#ffffff', 0.15, y - 0.12, -w / 2 - 0.01), box(0.04, 0.05, 0.02, EYE, -0.15, y - 0.13, -w / 2 - 0.02),
    box(0.04, 0.05, 0.02, EYE, 0.15, y - 0.13, -w / 2 - 0.02)], 0, y, 0);
  const head = part([box(w * 0.7, 0.1, w * 0.7, '#3c5288', 0, y + h / 2 + 0.05, 0)], 0, y + h / 2, 0);
  const legs = [];
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2, x = Math.cos(a) * w * 0.32, z = Math.sin(a) * w * 0.32;
    legs.push(part([box(0.09, 0.55, 0.09, '#273659', x, y - h / 2 - 0.27, z)], x, y - h / 2, z));
  }
  return { parts: [body, head], body, head, wings: [], ears: [], legs, pattern: [1, -1, 1, -1, 1, -1, 1, -1] };
}

export function buildMc(type, variant = 0) {
  const v = VARIANTS[type]?.[variant % (VARIANTS[type]?.length || 1)];
  switch (type) {
    case 'cow': return beast({ w: 0.9, h: 1.4, d: 1.6, body: '#3d2f28', spots: '#f4f1ea', snout: '#e9b7a6', horns: '#d8cfb8', ears: 'round', tail: 'long', legH: 0.34, bodyH: 0.4 });
    case 'horse': return beast({ w: 0.75, h: 1.85, d: 1.9, body: v[0], mane: v[1], tailColor: v[1], snout: v[1], neck: true, neckTilt: 0.6, ears: 'point', tail: 'long', legH: 0.42, bodyH: 0.3, headD: 0.42, headW: 0.62, head: 0.36, saddle: '#7a4b2a', legW: 0.24 });
    case 'dog': return beast({ w: 0.5, h: 0.85, d: 1.05, body: '#dcd7cf', snout: '#bdb6ab', ears: 'point', tail: 'bushy', collar: '#d83b3b', legH: 0.4, bodyH: 0.34, legW: 0.22 });
    case 'cat': return beast({ w: 0.4, h: 0.62, d: 0.85, body: v[0], snout: v[1], ears: 'point', tail: 'long', legH: 0.38, bodyH: 0.34, legW: 0.24 });
    case 'rabbit': return beast({ w: 0.38, h: 0.55, d: 0.55, body: v[0], snout: v[1], tailColor: v[1], ears: 'tall', tail: 'short', legH: 0.22, bodyH: 0.45, head: 0.6, headD: 0.4, legW: 0.3 });
    case 'fox': return beast({ w: 0.5, h: 0.7, d: 0.95, body: '#e07a2e', snout: '#f4efe6', legs: '#2f2420', ears: 'point', earColor: '#2f2420', tail: 'bushy', tailTip: '#f4efe6', legH: 0.34, bodyH: 0.38, legW: 0.22 });
    case 'goat': return beast({ w: 0.62, h: 1.15, d: 1.0, body: '#e8e4dc', snout: '#d2ccc0', horns: '#bdb6a6', beard: '#d2ccc0', ears: 'round', tail: 'short', legH: 0.38, bodyH: 0.36 });
    case 'llama': return beast({ w: 0.75, h: 1.95, d: 1.25, body: '#e9dfc9', snout: '#d8ccb2', blanket: v[0], neck: true, ears: 'tall', tail: 'short', legH: 0.38, bodyH: 0.3, headD: 0.32, legW: 0.24 });
    case 'bee': return bee();
    case 'fish': return swimmer({ w: 0.18, h: 0.3, d: 0.55, body: v[0], stripe: v[1], tailColor: v[1] });
    case 'dolphin': return swimmer({ w: 0.48, h: 0.5, d: 1.6, body: '#7f96ab', belly: '#dfe6ec', fin: true, beak: true });
    case 'squid': return squid();
    default: throw new Error('onbekend dier: ' + type);
  }
}
