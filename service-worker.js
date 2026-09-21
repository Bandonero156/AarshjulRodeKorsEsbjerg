const CACHE_NAME = "aarshjul-app-v1";
const CSV_CACHE_KEY = "./cached-events.csv";
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css?v=pwa-2026",
  "./script.js?v=pwa-2026",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const isActivityCsv = url.hostname === "docs.google.com" && url.pathname.includes("/spreadsheets/d/e/");

  if (isActivityCsv) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(CSV_CACHE_KEY, copy));
          return response;
        })
        .catch(() => caches.match(CSV_CACHE_KEY))
    );
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match("./index.html")));
    return;
  }

  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});

