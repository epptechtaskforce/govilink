// Minimal service worker: lets browsers treat GoviLink as an installable app. The app itself always comes from the network
// (it holds live farmer data), so only the small wrapper page and its icons are kept for a quick start.
var CACHE = 'govilink-shell-v6';
var SHELL = ['./', 'index.html', 'app.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'favicon.png', 'favicon-32.png', 'apple-touch-icon.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;   // never touch the app's own traffic
  // the app's own page (about 600 KB) comes from the device at once and is brought up to date in the background: a new version opens the next time the app is started
  if (new URL(req.url).pathname.slice(-9) === '/app.html') {
    e.respondWith(caches.open(CACHE).then(function (c) {
      return c.match(req).then(function (hit) {
        var net = fetch(req).then(function (res) { if (res && res.ok) c.put(req, res.clone()); return res; });
        if (hit) { e.waitUntil(net.catch(function () {})); return hit; }
        return net;
      });
    }));
    return;
  }
  e.respondWith(fetch(req).then(function (res) {
    var copy = res.clone();
    caches.open(CACHE).then(function (c) { c.put(req, copy); });
    return res;
  }).catch(function () { return caches.match(req).then(function (hit) { return hit || caches.match('index.html'); }); }));
});
