// De 3D-scene: lucht, zon, wolken, zee rondom en de chunk-meshes.

import * as THREE from '../lib/three.module.min.js';
import { CHUNK, SY, SEA, SECTION } from './engine/constants.js';
import { buildPad, meshChunk, meshSection, mergeSections, KINDS } from './engine/mesher.js';
import { buildLightPad, regionFor, LIGHT_LINEAR } from './engine/light.js';
import { tintsFor } from './engine/tint.js';
import { NIGHT_LIGHT } from './daynight.js';
import { createCrackCanvases } from './textures.js';

const SKY = new THREE.Color('#9ad8ff');
// Lucht 's nachts en de oranje gloed bij zonsopkomst en zonsondergang
const NIGHT = { boven: new THREE.Color('#070b1f'), horizon: new THREE.Color('#18264a'), mist: new THREE.Color('#0e1530') };
const GLOW = new THREE.Color('#ff8d45'), SUN_LOW = new THREE.Color('#ffb066');
const MOONLIGHT = new THREE.Color(0.62, 0.72, 1), DUSKLIGHT = new THREE.Color(1, 0.82, 0.66);
const SEA_COLOR = new THREE.Color('#3d7fd8'), CLOUD_NIGHT = new THREE.Color('#3b4562');
const UNDERWATER = new THREE.Color('#1f56a8');
const lin = (v) => Math.pow(v, 2.2);

export class GameScene {
  constructor(canvas, atlas) {
    const dpr = window.devicePixelRatio || 1;
    const touch = window.matchMedia?.('(pointer: coarse)').matches;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: dpr < 2 && !touch,
      powerPreference: 'high-performance',
    });
    // Op een tablet beginnen we iets minder scherp: dat scheelt veel rekenwerk
    // en je ziet het bij pixel-art nauwelijks. Is de iPad snel, dan gaat het vanzelf omhoog.
    this.maxPixelRatio = Math.min(dpr, 2);
    this.pixelRatio = touch ? Math.min(this.maxPixelRatio, 1.5) : this.maxPixelRatio;
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = SKY;
    this.scene.fog = new THREE.Fog(SKY, 45, 125);

    this.camera = new THREE.PerspectiveCamera(72, 1, 0.08, 400);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera); // de hand hangt aan de camera

    // Alle tegels in één texture-array (één laag per tegel). Zo kunnen er mipmaps bij zonder dat
    // tegels in elkaar overlopen: dichtbij scherpe pixels, in de verte rustig in plaats van flikkerend.
    const tiles = this.tiles = new THREE.DataArrayTexture(atlas.layers, 16, 16, atlas.count);
    tiles.format = THREE.RGBAFormat;
    tiles.type = THREE.UnsignedByteType;
    tiles.magFilter = THREE.NearestFilter;
    // Zoals Minecraft: per mipmap de dichtstbijzijnde pixel. Zacht filteren (lineair) was op de
    // testcomputer een derde trager en geeft wazige blokken; dit houdt de pixels scherp.
    tiles.minFilter = THREE.NearestMipmapNearestFilter;
    tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping;
    tiles.generateMipmaps = true;
    tiles.colorSpace = THREE.SRGBColorSpace;
    tiles.needsUpdate = true;
    this.atlas = atlas;

    // Licht: per hoekpunt zon (groen) en lamp (blauw), per beeldje het daglicht.
    // Zelfde getallen voor alle materialen (één keer veranderen is overal veranderd).
    this.light = {
      uSkyLight: { value: new THREE.Color(1, 1, 1) },   // kleur en sterkte van het zonlicht nu
      uLampLight: { value: new THREE.Color(1, 0.9, 0.72) }, // warm licht van fakkels en lampen
      uMinLight: { value: Math.pow(0.18, 2.2) },          // nooit helemaal donker
      uTiles: { value: tiles },
      uTime: { value: 0 },                                // voor golvend water
    };
    // Per hoekpunt: tuv = plek op de tegel + tegelnummer, tint = kleur van het landschap (gras, blad, water).
    // Bij dichte blokken bepaalt de doorzichtigheid van de tegel waar de landschapskleur komt
    // (de grasrand aan de zijkant van een grasblok wel, de aarde eronder niet).
    const lit = (m, kind) => {
      m.defines = { ['JC_' + kind.toUpperCase()]: '' };
      m.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, this.light);
        shader.vertexShader = 'attribute vec3 tuv;\nattribute vec3 tint;\nvarying vec3 vTuv;\nvarying vec3 vTint;\n' +
          shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvTuv = tuv; vTint = pow(tint, vec3(2.2));');
        shader.fragmentShader = `uniform vec3 uSkyLight;\nuniform vec3 uLampLight;\nuniform float uMinLight;
uniform highp sampler2DArray uTiles;\nuniform float uTime;\nvarying vec3 vTuv;\nvarying vec3 vTint;\n` +
          shader.fragmentShader.replace('#include <map_fragment>', `
            #ifdef JC_WATER
              vec4 jcTex = mix(texture(uTiles, vec3(vTuv.xy + vec2(uTime * 0.031, uTime * 0.017), vTuv.z)),
                texture(uTiles, vec3(vTuv.xy * 0.83 + vec2(-uTime * 0.022, uTime * 0.027), vTuv.z)), 0.5);
            #else
              vec4 jcTex = texture(uTiles, vTuv);
            #endif
            #ifdef JC_SOLID
              jcTex.rgb *= mix(vec3(1.0), vTint, 1.0 - jcTex.a);
              jcTex.a = 1.0;
            #else
              jcTex.rgb *= vTint;
            #endif
            #ifdef JC_CUTOUT
              // In de verte (kleinere mipmap) minder doorzichtig, anders verdwijnen de bladeren
              vec2 jcD = vTuv.xy * 16.0;
              float jcLod = max(0.0, 0.5 * log2(max(dot(dFdx(jcD), dFdx(jcD)), dot(dFdy(jcD), dFdy(jcD)))));
              jcTex.a *= 1.0 + jcLod * 0.25;
            #endif
            diffuseColor *= jcTex;`).replace('#include <color_fragment>', `
            vec3 jcLight = max(vColor.g * uSkyLight, vColor.b * uLampLight);
            jcLight = max(jcLight, vec3(uMinLight));
            jcLight = mix(jcLight, vec3(1.0), step(1.5, vColor.g));
            diffuseColor.rgb *= vColor.r * jcLight;`);
      };
      m.customProgramCacheKey = () => 'jippecraft-' + kind;
      return m;
    };
    this.materials = {
      solid: lit(new THREE.MeshBasicMaterial({ vertexColors: true }), 'solid'),
      cutout: lit(new THREE.MeshBasicMaterial({ vertexColors: true, alphaTest: 0.5, side: THREE.DoubleSide }), 'cutout'),
      glass: lit(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false }), 'glass'),
      water: lit(new THREE.MeshBasicMaterial({
        vertexColors: true, transparent: true, opacity: 0.72, depthWrite: false, side: THREE.DoubleSide,
      }), 'water'),
    };

    this.chunks = new Map();     // sleutel -> { cx, cz, sections, meshes }
    this.viewFar = 120;          // tot hoe ver je kunt kijken (hangt af van de zichtafstand)
    this.buildSky();
    this.buildSea();
    this.buildClouds();
    this.setTime(1, 0, Math.PI * 0.4);
    this.buildHighlight();
    this.buildCrack();
  }

  buildCrack() {
    this.crackTex = createCrackCanvases().map((c) => {
      const t = new THREE.CanvasTexture(c);
      t.magFilter = THREE.NearestFilter;
      t.minFilter = THREE.NearestFilter;
      t.generateMipmaps = false;
      return t;
    });
    this.crack = new THREE.Mesh(
      new THREE.BoxGeometry(1.01, 1.01, 1.01),
      new THREE.MeshBasicMaterial({
        map: this.crackTex[0], transparent: true, depthWrite: false,
        polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      }),
    );
    this.crack.visible = false;
    this.crack.renderOrder = 3;
    this.scene.add(this.crack);
  }

  // Alles wat later pas zichtbaar wordt alvast klaarzetten, zodat het spel dan niet even hapert
  precompile() {
    this.crack.visible = true;
    this.highlight.visible = true;
    this.renderer.compile(this.scene, this.camera);
    this.crack.visible = false;
    this.highlight.visible = false;
  }

  // Scheurtjes op het blok dat je aan het slopen bent (stage 0..3)
  showCrack(hit, stage) {
    if (!hit) { this.crack.visible = false; return; }
    this.crack.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
    this.crack.material.map = this.crackTex[Math.max(0, Math.min(3, stage))];
    this.crack.visible = true;
  }

  buildSky() {
    // Grote bol met een kleurverloop van diepblauw (boven) naar lichtblauw (horizon)
    const geo = new THREE.SphereGeometry(300, 24, 12);
    const colors = [];
    const top = new THREE.Color('#4aa3ec'), hor = new THREE.Color('#c9ecff');
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const h = Math.max(0, pos.getY(i) / 300);
      const c = hor.clone().lerp(top, Math.pow(h, 0.6));
      colors.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    this.sky = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    this.sky.renderOrder = -10;
    this.scene.add(this.sky);

    // Zon, maan en sterren draaien samen rond (een hele baan per dag)
    this.heavens = new THREE.Group();
    this.sky.add(this.heavens);
    const flat = (size, color, map, turn) => {
      const g = new THREE.PlaneGeometry(size, size);
      g.rotateY(turn);
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, map, fog: false, depthWrite: false, transparent: true }));
      m.renderOrder = -9;
      return m;
    };
    // Vierkante zon, net als in Minecraft (kijkt naar het midden)
    this.sun = flat(36, '#fff4b0', null, -Math.PI / 2);
    this.sun.position.set(250, 0, 0);
    // Vierkante maan met een paar kraters
    const mc = document.createElement('canvas'); mc.width = mc.height = 8;
    const mx = mc.getContext('2d');
    mx.fillStyle = '#eef2ff'; mx.fillRect(0, 0, 8, 8);
    mx.fillStyle = '#c3cbe0'; for (const [x, y, w] of [[1, 1, 2], [5, 2, 1], [4, 5, 2], [1, 5, 1]]) mx.fillRect(x, y, w, w);
    const moonTex = new THREE.CanvasTexture(mc);
    moonTex.magFilter = THREE.NearestFilter; moonTex.minFilter = THREE.NearestFilter; moonTex.colorSpace = THREE.SRGBColorSpace;
    this.moon = flat(26, '#ffffff', moonTex, Math.PI / 2);
    this.moon.position.set(-250, 0, 0);
    // Sterren: kleine puntjes op een bol, alleen 's nachts te zien
    const stars = [];
    for (let i = 0; i < 420; i++) {
      const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u) * 240;
      stars.push(Math.cos(a) * r, u * 240, Math.sin(a) * r);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(stars, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({
      color: '#ffffff', size: 2, sizeAttenuation: false, fog: false, depthWrite: false, transparent: true, opacity: 0,
    }));
    this.stars.renderOrder = -9;
    this.stars.visible = false;
    this.heavens.add(this.sun, this.moon, this.stars);
    this.time = { sun: 1, glow: 0, angle: Math.PI / 2 };
  }

  // Tijd van de dag: zon (0..1), oranje gloed (0..1) en stand van de zon
  setTime(sun, glow, angle) {
    // De baan staat een beetje schuin, zodat de zon niet recht boven je hoofd staat
    this.heavens.rotation.set(-0.45, 0.35, angle);
    const t = this.time, changed = Math.abs(t.sun - sun) + Math.abs(t.glow - glow) > 0.003;
    t.sun = sun; t.glow = glow; t.angle = angle;
    if (!changed && this.timeApplied) return;
    this.timeApplied = true;
    this.stars.material.opacity = Math.max(0, 1 - sun * 1.4) * 0.95;
    this.stars.visible = this.stars.material.opacity > 0.01;
    // Licht van de zon op de wereld: 's nachts zwakker en blauwig, bij zonsondergang warm
    const day = lin(NIGHT_LIGHT + (1 - NIGHT_LIGHT) * sun);
    this.light.uSkyLight.value.copy(MOONLIGHT).lerp(new THREE.Color(1, 1, 1), sun).lerp(DUSKLIGHT, glow * 0.6).multiplyScalar(day);
    this.sea.material.color.copy(SEA_COLOR).multiplyScalar(day);
    this.clouds.material.color.copy(CLOUD_NIGHT).lerp(new THREE.Color(1, 1, 1), sun).lerp(GLOW, glow * 0.25);
    if (this.biomeCurrent) this.applyBiome();
  }

  // Helderheid voor een dier of het poppetje op deze plek (light = zon * 16 + lamp)
  tint(light, out) {
    const sky = LIGHT_LINEAR[light >> 4], lamp = LIGHT_LINEAR[light & 15];
    const s = this.light.uSkyLight.value, l = this.light.uLampLight.value, min = this.light.uMinLight.value;
    out.setRGB(Math.max(sky * s.r, lamp * l.r, min), Math.max(sky * s.g, lamp * l.g, min), Math.max(sky * s.b, lamp * l.b, min));
    return out;
  }

  setBiome(biome, instant = false) {
    const air = biome.lucht;
    this.biomeTarget = {
      boven: new THREE.Color(air.boven), horizon: new THREE.Color(air.horizon),
      mist: new THREE.Color(air.mist), zon: new THREE.Color(air.zon),
      mistBegin: air.mistBegin, mistEind: air.mistEind, wolken: air.wolken,
    };
    if (!this.biomeCurrent || instant) {
      this.biomeCurrent = { ...this.biomeTarget };
      for (const key of ['boven', 'horizon', 'mist', 'zon']) this.biomeCurrent[key] = this.biomeTarget[key].clone();
      this.applyBiome();
      this.biomeAnimating = false;
    } else this.biomeAnimating = true;
  }

  // Zacht overgaan als je in Avontuur een ander gebied inloopt (ongeveer twee seconden).
  updateBiome(dt) {
    if (!this.biomeAnimating) return;
    const current = this.biomeCurrent, target = this.biomeTarget;
    const k = 1 - Math.exp(-dt * 2);
    let difference = 0;
    for (const key of ['boven', 'horizon', 'mist', 'zon']) {
      current[key].lerp(target[key], k);
      difference += Math.abs(current[key].r - target[key].r) + Math.abs(current[key].g - target[key].g) + Math.abs(current[key].b - target[key].b);
    }
    for (const key of ['mistBegin', 'mistEind', 'wolken']) {
      current[key] += (target[key] - current[key]) * k;
      difference += Math.abs(current[key] - target[key]);
    }
    this.applyBiome();
    if (difference < 0.001) this.biomeAnimating = false;
  }

  applyBiome() {
    const b = this.biomeCurrent, night = 1 - (this.time?.sun ?? 1), glow = this.time?.glow ?? 0;
    // Kleuren van het landschap, gemengd met de nacht en de gloed van de ondergaande zon
    const mix = this.mixed || (this.mixed = { boven: new THREE.Color(), horizon: new THREE.Color(), mist: new THREE.Color(), zon: new THREE.Color() });
    mix.boven.copy(b.boven).lerp(NIGHT.boven, night);
    mix.horizon.copy(b.horizon).lerp(NIGHT.horizon, night).lerp(GLOW, glow * 0.6);
    mix.mist.copy(b.mist).lerp(NIGHT.mist, night).lerp(GLOW, glow * 0.35);
    mix.zon.copy(b.zon).lerp(SUN_LOW, glow);
    if (!this.underwater) {
      this.scene.background.copy(mix.mist);
      this.scene.fog.color.copy(mix.mist);
    }
    // Mist van het landschap, maar nooit verder dan de geladen wereld
    this.scene.fog.far = Math.min(b.mistEind, this.viewFar);
    this.scene.fog.near = Math.min(b.mistBegin, this.scene.fog.far * 0.6);
    this.sun.material.color.copy(mix.zon);
    // Meer of minder wolken per landschap (wolken: 0 tot 46, zoals vroeger het aantal wolkenblokken)
    this.cloudCut.value = 1 - Math.max(0, Math.min(1, b.wolken / 46)) * 0.5;
    this.clouds.visible = b.wolken > 1;
    const positions = this.sky.geometry.attributes.position, colors = this.sky.geometry.attributes.color;
    const color = this.biomeColor || (this.biomeColor = new THREE.Color());
    for (let i = 0; i < positions.count; i++) {
      const h = Math.pow(Math.max(0, positions.getY(i) / 300), 0.6);
      color.copy(mix.horizon).lerp(mix.boven, h);
      colors.setXYZ(i, color.r, color.g, color.b);
    }
    colors.needsUpdate = true;
  }

  // Zee tot aan de horizon: een grote ring rond de speler, net onder het echte water.
  // Binnen de ring liggen de echte chunks; de ring zelf zit meestal al in de mist.
  buildSea() {
    const geo = new THREE.RingGeometry(1, 700, 48, 1);
    geo.rotateX(-Math.PI / 2);
    this.sea = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#3d7fd8' }));
    this.sea.position.y = SEA + 0.7;
    this.sea.renderOrder = -1;
    this.scene.add(this.sea);
  }

  // Zichtafstand in chunks: bepaalt de mist en waar de zee-ring begint
  setViewDistance(r) {
    this.viewFar = Math.max(40, (r - 0.5) * CHUNK);
    const inner = Math.max(1, (r - 1) * CHUNK);
    this.sea.geometry.dispose();
    const geo = new THREE.RingGeometry(inner, 700, 48, 1);
    geo.rotateX(-Math.PI / 2);
    this.sea.geometry = geo;
    if (this.biomeCurrent) this.applyBiome();
  }

  // Wolken zoals in Minecraft: één platte laag blokwolken uit een patroon, die langzaam
  // wegdrijft. Eén vlak van 768 x 768 blokken dat met de camera meeschuift (één tekenopdracht).
  buildClouds() {
    const N = 64, CELL = 12;                 // 64 x 64 vakjes van 12 blokken
    this.cloudSize = N * CELL;
    // Herhalend patroon (geen naad als het rondschuift): ruis op een rooster dat rondloopt
    const rnd = (i, j, g) => { const h = Math.sin((i % g) * 127.1 + (j % g) * 311.7 + g * 74.7) * 43758.5453; return h - Math.floor(h); };
    const smooth = (t) => t * t * (3 - 2 * t);
    const noise = (x, y, g) => {
      const fx = x / N * g, fy = y / N * g, i = Math.floor(fx), j = Math.floor(fy), u = smooth(fx - i), v = smooth(fy - j);
      const a = rnd(i, j, g), b = rnd(i + 1, j, g), c = rnd(i, j + 1, g), d = rnd(i + 1, j + 1, g);
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    };
    const data = new Uint8Array(N * N * 4);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const v = noise(x, y, 8) * 0.65 + noise(x, y, 16) * 0.35, o = (x + N * y) * 4;
      data[o] = data[o + 1] = data[o + 2] = 255; data[o + 3] = Math.round(v * 255);
    }
    const tex = new THREE.DataTexture(data, N, N);
    tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.needsUpdate = true;
    this.cloudCut = { value: 0.55 };       // hoe hoger, hoe minder wolken
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.85, fog: false, depthWrite: false, side: THREE.DoubleSide });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uCut = this.cloudCut;
      shader.fragmentShader = 'uniform float uCut;\n' + shader.fragmentShader.replace('#include <map_fragment>', `
        vec4 cloud = texture2D(map, vMapUv);
        if (cloud.a < uCut) discard;
        diffuseColor.rgb *= cloud.rgb;
        // naar de rand toe vervagen (het vlak beweegt mee met de camera)
        vec2 jcFar = (vMapUv - uvCenter) * 768.0;
        diffuseColor.a *= 1.0 - smoothstep(160.0, 370.0, length(jcFar));`).replace('void main() {', 'uniform vec2 uvCenter;\nvoid main() {');
      shader.uniforms.uvCenter = this.cloudCenter;
    };
    this.cloudCenter = { value: new THREE.Vector2() };
    const geo = new THREE.PlaneGeometry(this.cloudSize, this.cloudSize);
    geo.rotateX(-Math.PI / 2);
    this.clouds = new THREE.Mesh(geo, mat);
    this.clouds.position.y = SY + 10;
    this.clouds.renderOrder = 2;
    this.cloudDrift = 0;
    this.scene.add(this.clouds);
  }

  // Wolken drijven langzaam naar het oosten en blijven boven de speler
  updateClouds(dt) {
    const cam = this.camera.position, size = this.cloudSize, map = this.clouds.material.map;
    this.cloudDrift += dt * 0.8;
    this.clouds.position.x = cam.x; this.clouds.position.z = cam.z;
    map.offset.set((cam.x - this.cloudDrift) / size, -cam.z / size);
    this.cloudCenter.value.set(0.5 + map.offset.x, 0.5 + map.offset.y);
  }

  buildHighlight() {
    const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.004, 1.004, 1.004));
    this.highlight = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#1b1b1b', transparent: true, opacity: 0.6 }));
    this.highlight.visible = false;
    this.scene.add(this.highlight);
  }

  showHighlight(hit) {
    if (!hit) { this.highlight.visible = false; return; }
    this.highlight.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
    this.highlight.visible = true;
  }

  // ---------- chunks tekenen ----------

  // Een chunk is (opnieuw) helemaal getekend, sectie voor sectie
  setChunkSections(chunk, sections) {
    let e = this.chunks.get(chunk.key);
    if (!e) { e = { cx: chunk.cx, cz: chunk.cz, sections: [], meshes: [] }; this.chunks.set(chunk.key, e); }
    e.sections = sections;
    this.rebuildMeshes(e);
  }

  // De secties van één chunk samenvoegen: per soort één mesh (weinig tekenopdrachten)
  rebuildMeshes(e) {
    for (const m of e.meshes) { this.scene.remove(m); m.geometry.dispose(); }
    e.meshes = [];
    let lo = SY, hi = 0;
    e.sections.forEach((s, i) => { if (s && KINDS.some((k) => s[k])) { lo = Math.min(lo, i * SECTION); hi = Math.max(hi, (i + 1) * SECTION); } });
    if (hi <= lo) return;
    const center = new THREE.Vector3(e.cx * CHUNK + CHUNK / 2, (lo + hi) / 2, e.cz * CHUNK + CHUNK / 2);
    const radius = Math.hypot(CHUNK, hi - lo, CHUNK) / 2 + 1;
    for (const kind of KINDS) {
      const d = mergeSections(e.sections, kind);
      if (!d) continue;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(d.pos, 3));
      geo.setAttribute('tuv', new THREE.BufferAttribute(d.uv, 3));
      geo.setAttribute('tint', new THREE.BufferAttribute(d.tint, 3, true));
      geo.setAttribute('color', new THREE.BufferAttribute(d.col, 3));
      geo.setIndex(new THREE.BufferAttribute(d.idx, 1));
      geo.boundingSphere = new THREE.Sphere(center.clone(), radius);
      const mesh = new THREE.Mesh(geo, this.materials[kind]);
      mesh.matrixAutoUpdate = false;
      if (kind === 'water' || kind === 'glass') mesh.renderOrder = 1;
      this.scene.add(mesh);
      e.meshes.push(mesh);
    }
  }

  // Een vallend blok (zand, grind): een losse kubus met de textuur van dat blok
  fallingBlock(id) {
    this.fallingMats ||= new Map();
    let mat = this.fallingMats.get(id);
    if (!mat) {
      const tile = this.atlas.faceTiles[id][2], c = document.createElement('canvas');
      c.width = c.height = 16;
      c.getContext('2d').drawImage(this.atlas.canvas, (tile % 16) * 16, Math.floor(tile / 16) * 16, 16, 16, 0, 0, 16, 16);
      const t = new THREE.CanvasTexture(c);
      t.magFilter = t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
      mat = new THREE.MeshBasicMaterial({ map: t });
      this.fallingMats.set(id, mat);
    }
    this.fallingGeo ||= new THREE.BoxGeometry(1, 1, 1);
    const mesh = new THREE.Mesh(this.fallingGeo, mat);
    this.scene.add(mesh);
    return mesh;
  }

  removeFalling(mesh) { if (mesh) this.scene.remove(mesh); }

  removeChunk(key) {
    const e = this.chunks.get(key);
    if (!e) return;
    for (const m of e.meshes) { this.scene.remove(m); m.geometry.dispose(); }
    this.chunks.delete(key);
  }

  clearChunks() {
    for (const key of [...this.chunks.keys()]) this.removeChunk(key);
  }

  // Wat Jippe veranderde meteen opnieuw tekenen (alleen de secties die het raakt)
  updateChunks(world, budget = 4) {
    let done = 0;
    for (const [key, mask] of world.dirtySections) {
      if (done >= budget) break;
      world.dirtySections.delete(key);
      const c = world.chunks.get(key), e = this.chunks.get(key);
      if (!c || !e) continue;
      const pad = buildPad(world, c.cx, c.cz), lpad = buildLightPad(world, c.cx, c.cz);
      c.tints ||= tintsFor(world.gen, c.cx, c.cz);
      for (let s = 0; s < SY / SECTION; s++) if (mask & (1 << s)) e.sections[s] = meshSection(pad, lpad, this.atlas.faceTiles, c.cx, c.cz, s, c.tints);
      this.rebuildMeshes(e);
      done++;
    }
  }

  // Alles wat klaar is meteen tekenen (bij het openen van een wereld, en in de tests)
  // Het licht rekenen we in één keer uit voor het hele stuk (veel sneller dan per chunk).
  rebuildAll(world) {
    const todo = [...world.chunks.values()].filter((c) => !c.meshed && world.neighboursReady(c.cx, c.cz));
    if (todo.length) {
      let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
      for (const c of todo) { x0 = Math.min(x0, c.cx); z0 = Math.min(z0, c.cz); x1 = Math.max(x1, c.cx); z1 = Math.max(z1, c.cz); }
      const big = (x1 - x0 + 3) * (z1 - z0 + 3) <= 144 ? regionFor(world, x0 - 1, z0 - 1, x1 - x0 + 3, z1 - z0 + 3) : null;
      for (const c of todo) {
        const region = big || regionFor(world, c.cx - 1, c.cz - 1, 3, 3);
        c.light = region.chunkLight(c.cx, c.cz);
        c.tints ||= tintsFor(world.gen, c.cx, c.cz);
        this.setChunkSections(c, meshChunk(buildPad(world, c.cx, c.cz), region.lightPad(c.cx, c.cz), this.atlas.faceTiles, c.cx, c.cz, c.tints));
        c.meshed = true;
      }
    }
    this.updateChunks(world, Infinity);
  }

  resize(w, h) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  setPixelRatio(r) {
    this.pixelRatio = r;
    this.renderer.setPixelRatio(r);
  }

  // Onder water: blauwe mist dichtbij (de rest doet main.js: blauwe tint en gedempt geluid)
  setUnderwater(on) {
    if (on === !!this.underwater) return;
    this.underwater = on;
    if (!on && this.biomeCurrent) this.applyBiome();
  }

  render() {
    this.light.uTime.value = performance.now() / 1000;
    if (this.underwater) {
      const day = lin(NIGHT_LIGHT + (1 - NIGHT_LIGHT) * this.time.sun);
      this.scene.fog.color.copy(UNDERWATER).multiplyScalar(Math.max(0.25, day));
      this.scene.background.copy(this.scene.fog.color);
      this.scene.fog.near = 1; this.scene.fog.far = 26;
    }
    this.sky.position.copy(this.camera.position);
    this.sea.position.x = this.camera.position.x;
    this.sea.position.z = this.camera.position.z;
    this.renderer.render(this.scene, this.camera);
  }
}
