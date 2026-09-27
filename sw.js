// Service worker: zorgt dat JippeCraft ook zonder internet werkt.
// Eerst proberen we het internet (altijd de nieuwste versie), anders de opgeslagen kopie.

const CACHE = 'jippecraft-v1';
const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'lib/three.module.min.js',
  'js/main.js', 'js/blocks.js', 'js/textures.js', 'js/world.js', 'js/mesher.js', 'js/scene.js',
  'js/player.js', 'js/raycast.js', 'js/input.js', 'js/ui.js', 'js/icons.js', 'js/audio.js',
  'js/particles.js', 'js/storage.js',
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
