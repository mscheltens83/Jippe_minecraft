// Service worker: zorgt dat JippeCraft ook zonder internet werkt.
// Eerst proberen we het internet (altijd de nieuwste versie), anders de opgeslagen kopie.

// Moet precies 'jippecraft-' + VERSION uit js/version.js zijn (de unit-test controleert dat)
const CACHE = 'jippecraft-4.6.3';
const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'lib/three.module.min.js',
  'js/main.js', 'js/blocks.js', 'js/textures.js', 'js/world.js', 'js/scene.js',
  'js/player.js', 'js/raycast.js', 'js/input.js', 'js/ui.js', 'js/icons.js', 'js/audio.js',
  'js/particles.js', 'js/storage.js', 'js/music.js', 'js/models.js', 'js/animals.js', 'js/avatar.js', 'js/album.js',
  'js/stamps.js', 'js/biomes.js', 'js/structures.js', 'js/weather.js', 'js/snowman.js',
  'js/engine/constants.js', 'js/engine/noise.js', 'js/engine/trees.js', 'js/engine/gen.js', 'js/engine/chunk.js',
  'js/engine/world.js', 'js/engine/mesher.js', 'js/engine/worker.js', 'js/engine/pool.js', 'js/engine/loader.js',
  'js/engine/save.js', 'js/engine/migrate.js', 'js/engine/climate.js', 'js/engine/caves.js', 'js/engine/light.js', 'js/engine/tint.js', 'js/engine/physics.js', 'js/hand.js', 'js/daynight.js', 'js/texview.js',
  'js/animals/core.js', 'js/animals/species.js', 'js/animals/skills.js',
  'js/animals/farm.js', 'js/animals/cats.js', 'js/animals/savanna.js', 'js/animals/hunt.js',
  'js/animals/extras.js',
  'js/version.js', 'js/errors.js', 'js/perf.js', 'js/bench.js', 'js/parent.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok && new URL(e.request.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })),
  );
});
