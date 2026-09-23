// Matheri SHG — offline app-shell cache.
// Bump CACHE when you upload a new version of the HTML so old clients pick it up.
const CACHE = 'matheri-shg-v1';

// Adjust the HTML filename below if this app's page isn't named index.html on your host.
const ASSETS = [
  './',
  'index.html',
  'manifest.json',
  'icon-192.png',
  'https://cdn.jsdelivr.net/npm/chart.js@4.5.0/dist/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE)
      .then(function(c){ return c.addAll(ASSETS); })
      .catch(function(){ /* one of the assets failed to fetch during install — don't block activation */ })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k!==CACHE; }).map(function(k){ return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

// Stale-while-revalidate: serve from cache instantly if we have it (so offline
// opens work and repeat opens are fast), and refresh the cache in the background
// whenever there IS a network connection.
self.addEventListener('fetch', function(e){
  if(e.request.method!=='GET') return; // never intercept the Supabase POST calls
  e.respondWith(
    caches.match(e.request).then(function(cached){
      const fetchPromise = fetch(e.request).then(function(networkResponse){
        if(networkResponse && networkResponse.status===200){
          const copy = networkResponse.clone();
          caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
        }
        return networkResponse;
      }).catch(function(){ return cached; });
      return cached || fetchPromise;
    })
  );
});
