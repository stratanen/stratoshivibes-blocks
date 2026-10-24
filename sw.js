// Offline support: keeps a copy of the game on the device after the first online launch.
// Pages load network-first (players get updates when online), everything falls back to the cache offline.
const CACHE = 'sv-blocks-v23';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './privacy.html',
  './terms.html',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './fonts/bungee-latin-400-normal.woff2',
  './fonts/commissioner-greek-400-normal.woff2',
  './fonts/commissioner-greek-600-normal.woff2',
  './fonts/commissioner-greek-800-normal.woff2',
  './fonts/commissioner-latin-400-normal.woff2',
  './fonts/commissioner-latin-600-normal.woff2',
  './fonts/commissioner-latin-800-normal.woff2',
  './tiles/bolt.webp',
  './tiles/btc.webp',
  './tiles/chart.webp',
  './tiles/crystal.webp',
  './tiles/degen.webp',
  './tiles/diamond.webp',
  './tiles/eth.webp',
  './tiles/fire.webp',
  './tiles/king.webp',
  './tiles/planet.webp',
  './tiles/rocket.webp',
  './tiles/sol.webp',
  './tiles/star.webp',
  './tiles/wallet.webp',
  './art/level-01.webp',
  './art/level-02.webp',
  './art/level-03.webp',
  './art/level-04.webp',
  './art/level-05.webp',
  './art/level-06.webp',
  './art/level-07.webp',
  './art/level-08.webp',
  './art/level-09.webp',
  './art/level-10.webp',
  './art/level-11.webp',
  './art/level-12.webp',
  './wallet.bundle.js',
  './art/chars/bear.webp',
  './art/chars/bull.webp',
  './art/chars/crab.webp',
  './art/chars/degen.webp',
  './art/chars/diamond.webp',
  './art/chars/fudster.webp',
  './art/chars/maxi.webp',
  './art/chars/nocoiner.webp',
  './art/chars/paperhands.webp',
  './art/chars/rugpuller.webp',
  './art/chars/shiller.webp',
  './art/chars/shrimp.webp',
  './art/chars/whale.webp'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const isPage = req.mode === 'navigate' || req.destination === 'document';
  if (isPage) {
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  })));
});
