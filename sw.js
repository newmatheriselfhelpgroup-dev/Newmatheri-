// Bump this version string every time you upload a new copy of New_Matheri_Sys.html
// so returning devices pick up the update instead of an old cached copy.
const CACHE_VERSION = 'matheri-shg-v8';

const APP_SHELL = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  'https://cdn.jsdelivr.net/npm/chart.js@4.5.0/dist/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

self.addEventListener('install', function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function (cache) {
      return Promise.all(
        APP_SHELL.map(function (url) {
          return cache.add(url).catch(function () {
            // Ignore a single failed asset (e.g. no internet yet) so install still completes
          });
        })
      );
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_VERSION; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;

  // Only handle simple GETs for our own app shell + the two known CDN libraries.
  // Everything else (Supabase API calls, logins, saves) always goes straight to the network.
  if (req.method !== 'GET') return;
  var isShellUrl = APP_SHELL.indexOf(req.url) !== -1 ||
    APP_SHELL.some(function (a) { return req.url.indexOf(a.replace('./', '')) !== -1; });
  if (!isShellUrl) return;

  event.respondWith(
    caches.match(req).then(function (cached) {
      var networkFetch = fetch(req).then(function (res) {
        if (res && res.ok) {
          caches.open(CACHE_VERSION).then(function (cache) { cache.put(req, res.clone()); });
        }
        return res;
      }).catch(function () { return cached; });
      // Serve cached copy instantly if we have one, refresh it in the background;
      // otherwise wait for the network.
      return cached || networkFetch;
    })
  );
});
