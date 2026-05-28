// Minimal offline-capable service worker for JJK Survivors. Cache-first for
// same-origin static assets so the game still launches with a flaky connection.
// (This file is plain JS so it can be served verbatim from /public.)

// Bump this whenever the build output or precache list changes so old caches
// are purged on activate. Cache-first served stale chunks were causing blank
// screens after deploys that changed module graphs.
const CACHE = "jjk-survivors-v4";

// Pre-cache the shell + the floor texture so the first frame can paint
// without network. The Vite-built JS/CSS chunks are picked up by the
// runtime cache-on-fetch handler below.
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/textures/arena_floor.png",
  "/textures/floor_shibuya.png",
  "/textures/floor_rooftops.png",
  "/textures/floor_subway.png",
  "/textures/floor_blackout.png",
  "/textures/floor_forest.png",
  "/textures/floor_goodwill.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE_URLS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;
  // Bypass cache for the colyseus/meta APIs which need fresh data.
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/matchmake")) return;

  // Navigation requests (the HTML shell) MUST be network-first so a deploy
  // that ships a new JS module graph isn't held hostage by a cached index.
  // The cached copy is only used as an offline fallback.
  const isNavigation =
    e.request.mode === "navigate" ||
    url.pathname === "/" ||
    url.pathname === "/index.html";
  if (isNavigation) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(e.request, copy));
          }
          return res;
        })
        .catch(() => caches.match(e.request).then((hit) => hit || caches.match("/index.html")))
    );
    return;
  }

  // JS / CSS chunks must be NETWORK-FIRST. Cache-first was returning stale
  // hashes after deploys and — worse — falling back to /index.html on miss,
  // which causes the browser to try executing HTML as a JS module and blanks
  // the page. We let chunk 404s propagate so the browser surfaces a real
  // error instead of a silent unmount.
  const isHashedAsset =
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".mjs");
  if (isHashedAsset) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(e.request, copy));
          }
          return res;
        })
        .catch(() => caches.match(e.request).then((hit) => hit || Response.error()))
    );
    return;
  }

  // Everything else (images, audio, fonts) stays cache-first for speed.
  e.respondWith(
    caches.match(e.request).then(
      (hit) =>
        hit ||
        fetch(e.request).then((res) => {
          const copy = res.clone();
          if (res.ok) {
            caches.open(CACHE).then((cache) => cache.put(e.request, copy));
          }
          return res;
        })
    )
  );
});
