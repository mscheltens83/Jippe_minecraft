// Kleine, gedeelde bouwstenen voor de jungle-, woestijn- en toendradieren.
import { box, part } from '../models.js';

const looks = {
  monkey: { body: '#7a4a2a', face: '#e8c7a0', w: .53, h: 1.12, d: .68, ears: 'round', tail: 'long' },
  parrot: { body: '#e23b3b', face: '#f4d34e', w: .45, h: .83, d: .52, bird: true, wings: '#3273c8', tail: 'long' },
  panda: { body: '#f5f2e9', face: '#f5f2e9', w: .95, h: 1.3, d: 1.15, ears: 'round', patches: '#25252a', legs: '#25252a' },
  frog: { body: '#4cae51', face: '#d5dc58', w: .55, h: .55, d: .55, eyesTop: true },
  sloth: { body: '#948a78', face: '#d4c0a0', w: .58, h: 1.05, d: .72, mask: '#6d6258', longArms: true },
  camel: { body: '#d6b27a', face: '#dec092', w: .95, h: 1.9, d: 1.85, hump: true, neck: true },
  fennec: { body: '#e9d6ad', face: '#f5e8d1', w: .55, h: .84, d: .9, ears: 'huge', tail: 'bushy' },
  lizard: { body: '#a5b94b', face: '#c4d263', w: .38, h: .36, d: .72, tail: 'long' },
  turtle: { body: '#72a86b', face: '#a8bc78', w: .74, h: .68, d: .9, shell: '#5f7842' },
  polarBear: { body: '#f4f4f0', face: '#fcfcf7', w: 1.25, h: 1.38, d: 1.7, ears: 'round', nose: '#303238' },
  penguin: { body: '#292b36', face: '#f9f7ef', w: .63, h: 1.08, d: .58, bird: true, wings: '#292b36', beak: '#ed982d', belly: '#f9f7ef' },
  reindeer: { body: '#8e6548', face: '#b58a61', w: .88, h: 1.65, d: 1.55, antlers: true, tail: 'short' },
  arcticFox: { body: '#f6f8f7', face: '#ffffff', w: .58, h: .78, d: .92, ears: 'point', tail: 'bushy' },
  seal: { body: '#9ca6ad', face: '#bec7cb', w: .92, h: .7, d: 1.4, fins: true },
  snowyOwl: { body: '#f7f9f5', face: '#fbfaf3', w: .62, h: 1.0, d: .65, bird: true, wings: '#eef2ef', spots: '#484d52', beak: '#d9a63b' },
};

export function buildExtra(type) {
  const p = looks[type], w = p.w, h = p.h, d = p.d;
  const bodyY = h * .49, bodyH = h * (p.bird ? .65 : .48);
  const bodyGeo = [box(w * .85, bodyH, d * .74, p.body, 0, bodyY, 0)];
  if (p.belly) bodyGeo.push(box(w * .58, h * .45, .035, p.belly, 0, bodyY, -d * .385));
  if (p.shell) {
    bodyGeo.push(box(w * 1.05, h * .38, d * .88, p.shell, 0, bodyY + h * .2, .06));
    bodyGeo.push(box(w * .8, .025, d * .65, '#90a861', 0, bodyY + h * .4, .06));
  }
  if (p.hump) bodyGeo.push(box(w * .75, h * .32, d * .55, '#b79058', 0, bodyY + h * .31, d * .06));
  if (p.neck) bodyGeo.push(box(w * .35, h * .44, d * .32, p.body, 0, h * .69, -d * .29));
  if (p.patches) for (const s of [-1, 1]) bodyGeo.push(box(.04, h * .35, d * .28, p.patches, s * w * .44, bodyY, -d * .13));
  if (p.spots) for (let i = 0; i < 7; i++) bodyGeo.push(box(.04, .07, .07, p.spots, (i % 2 ? 1 : -1) * w * .43, bodyY + (i % 3 - 1) * .16, (i % 4 - 2) * .11));
  const body = part(bodyGeo, 0, bodyY, 0);
  const headY = p.neck ? h * .88 : p.bird ? h * .77 : h * .72;
  const headZ = p.neck ? -d * .43 : -d * .34;
  const headGeo = [box(w * .62, h * (p.bird ? .24 : .29), d * .35, p.face, 0, headY, headZ)];
  if (p.mask) headGeo.push(box(w * .49, h * .16, .035, p.mask, 0, headY, headZ - d * .185));
  if (p.patches) for (const s of [-1, 1]) headGeo.push(box(w * .19, h * .13, .04, p.patches, s * w * .18, headY + .03, headZ - d * .19));
  for (const s of [-1, 1]) {
    const eyeY = p.eyesTop ? headY + h * .12 : headY + h * .035;
    headGeo.push(box(.055, .055, .025, '#1f252a', s * w * .16, eyeY, headZ - d * .195));
    if (p.eyesTop) headGeo.push(box(.13, .11, .14, p.body, s * w * .17, eyeY, headZ - d * .12));
  }
  headGeo.push(box(w * .17, h * .07, d * .11, p.beak || p.nose || '#51423b', 0, headY - h * .07, headZ - d * .23));
  if (p.antlers) for (const s of [-1, 1]) {
    headGeo.push(box(.08, h * .38, .09, '#c3a37a', s * w * .2, h * .99, headZ + .05));
    headGeo.push(box(.24, .07, .08, '#c3a37a', s * w * .33, h * 1.1, headZ + .05));
  }
  const head = part(headGeo, 0, headY, headZ);
  const parts = [body, head], legs = [], wings = [], ears = [];
  if (p.ears) for (const s of [-1, 1]) {
    const eh = p.ears === 'huge' ? h * .5 : p.ears === 'point' ? h * .26 : h * .14;
    const ew = p.ears === 'huge' ? w * .3 : w * .17;
    const ear = part([box(ew, eh, .12, p.body, s * w * .29, headY + eh * .44, headZ + .04),
      box(ew * .62, eh * .65, .015, p.ears === 'huge' ? '#d99994' : p.face, s * w * .29, headY + eh * .44, headZ - .03)], s * w * .26, headY, headZ);
    ears.push(ear); parts.push(ear);
  }
  if (p.bird || p.fins || p.longArms) for (const s of [-1, 1]) {
    const wing = part([box(p.fins ? w * .34 : w * .24, p.longArms ? h * .56 : h * .43, d * .3,
      p.wings || p.body, s * w * .52, bodyY, 0)], s * w * .42, bodyY + h * .1, 0);
    wings.push(wing); parts.push(wing);
  }
  if (p.tail) {
    const tail = part([box(p.tail === 'bushy' ? w * .35 : .1, p.tail === 'long' ? .13 : .18,
      p.tail === 'long' ? d * .8 : d * .48, p.body, 0, bodyY - h * .13, d * .54)], 0, bodyY, d * .34);
    parts.push(tail);
    var resultTail = tail;
  }
  const legColor = p.legs || p.beak || p.body;
  if (p.fins) for (const s of [-1, 1]) {
    legs.push(part([box(w * .22, .12, d * .38, p.body, s * w * .28, .12, d * .38)],
      s * w * .28, .2, d * .25));
  }
  if (!p.fins) for (const s of [-1, 1]) for (const z of (p.bird || p.longArms ? [0] : [-d * .22, d * .22])) {
    const ly = h * (p.bird ? .23 : .25);
    legs.push(part([box(w * .22, ly, d * .18, legColor, s * w * .27, ly / 2, z)], s * w * .27, ly, z));
  }
  return { parts, body, head, tail: resultTail, wings, ears, legs,
    pattern: legs.length === 2 ? [1, -1] : [1, -1, -1, 1] };
}
