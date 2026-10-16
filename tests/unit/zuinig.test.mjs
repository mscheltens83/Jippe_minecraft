// Zuinig tekenen (versie 7.5.0): dieren in de mist niet tekenen, in de zuinige stand hoogstens een paar
// dieren met alle losse stukjes, en een dier ver weg zonder losse stukjes aan zich.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../../lib/three.module.min.js';
import { Animals } from '../../js/animals.js';
import { World } from '../../js/world.js';

// Een vlakke wereld, de camera op ooghoogte, kijkend naar het noorden (-z)
function setup() {
  const w = new World(); w.generate('flat', 3);
  const y = w.surfaceY(48, 60) + 1;
  const camera = new THREE.PerspectiveCamera(72, 1.6, 0.08, 400);
  camera.position.set(48.5, y + 1.6, 60.5);
  camera.updateMatrixWorld();
  const viewer = { x: 48.5, z: 60.5 };
  const animals = new Animals(new THREE.Scene());
  const put = (dz, dx = 0) => { const a = animals.spawn('pig', 48.5 + dx, y, 60.5 - dz, 0); a.timer = 100; return a; };
  return { w, camera, viewer, animals, put };
}

test('een dier helemaal in de mist wordt niet getekend; zonder mist wel', () => {
  const { w, camera, viewer, animals, put } = setup();
  const near = put(8), far = put(40);
  animals.update(0.02, w, viewer, camera);
  assert.ok(near.group.visible && far.group.visible, 'zonder mist zie je ze allebei');
  animals.fogFar = 20;
  animals.update(0.02, w, viewer, camera);
  assert.ok(near.group.visible, 'dichtbij: zichtbaar');
  assert.ok(!far.group.visible, 'achter de mist: niet tekenen');
  animals.fogFar = 60;
  animals.update(0.02, w, viewer, camera);
  assert.ok(far.group.visible, 'mist verder weg: weer zichtbaar');
});

test('ver weg zonder losse stukjes aan het dier, dichtbij weer met', () => {
  const { w, camera, viewer, animals, put } = setup();
  const a = put(35);
  const parts = a.group.children.length;
  animals.update(0.02, w, viewer, camera);
  assert.ok(a.lodOn, 'verder dan 28 blokken: één stuk');
  assert.ok(a.group.children.length < parts && a.group.children.includes(a.lod), 'alleen het ene stuk hangt nog aan het dier');
  assert.ok(!a.group.children.includes(a.head));
  a.z = 60.5 - 5; a.sync();
  animals.update(0.02, w, viewer, camera);
  assert.ok(!a.lodOn && a.group.children.includes(a.head) && a.head.visible && !a.lod.visible, 'dichtbij: weer alle stukjes');
});

test('zuinige stand: hoogstens een paar dieren in beeld met alle stukjes, de dichtstbijzijnde', () => {
  const { w, camera, viewer, animals, put } = setup();
  const list = [3, 5, 7, 9, 11].map((dz, i) => put(dz, i % 2 ? 1.5 : -1.5));
  animals.update(0.02, w, viewer, camera);
  assert.ok(list.every((a) => !a.lodOn), 'gewoon: allemaal met alle stukjes');
  animals.lodCap = 12; animals.detailMax = 2;
  for (let i = 0; i < 3; i++) animals.update(0.02, w, viewer, camera);
  assert.deepEqual(list.map((a) => a.lodOn), [false, false, true, true, true]);
  animals.detailMax = 0; animals.lodCap = null;
  animals.update(0.02, w, viewer, camera);
  assert.ok(list.every((a) => !a.lodOn), 'zuinig uit: weer allemaal');
});
