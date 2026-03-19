const CACHE_VERSION = "web-serial-cache-v1";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./js/app.js",
  "./js/config.js",
  "./js/input-handler.js",
  "./js/serial-manager.js",
  "./js/terminal-renderer.js",
  "./styles/main.css",
  "./styles/themes.css",
  "./icons/favicon.ico",
  "./icons/favicon-16x16.png",
  "./icons/favicon-32x32.png",
  "./icons/apple-touch-icon.png",
  "./icons/android-chrome-192x192.png",
  "./icons/android-chrome-512x512.png",
  "https://fonts.googleapis.com/css2?family=Lora:wght@400;500&family=Poppins:wght@400;500;600;700&display=swap",
];

/**
 * Install event: Cache static assets on first install
 */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      console.log("[Service Worker] Installing and caching static assets");
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[Service Worker] Some assets failed to cache:", err);
        // Don't fail the installation if some optional assets (like fonts) fail
        return Promise.resolve();
      });
    }),
  );
  self.skipWaiting();
});

/**
 * Activate event: Clean up old cache versions
 */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_VERSION) {
            console.log("[Service Worker] Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
  self.clients.claim();
});

/**
 * Fetch event: Use network-first for HTML (get updates),
 * cache-first for static assets (faster)
 */
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip external domains (except fonts)
  if (
    url.origin !== location.origin &&
    !url.hostname.includes("fonts.googleapis.com")
  ) {
    return;
  }

  // Network-first for HTML (index.html, get latest version)
  if (request.mode === "navigate" || request.url.endsWith(".html")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response && response.status === 200) {
            const cloned = response.clone();
            caches.open(CACHE_VERSION).then((cache) => {
              cache.put(request, cloned);
            });
          }
          return response;
        })
        .catch(() => {
          // Fall back to cache if network fails
          return caches.match(request).then((cached) => {
            return cached || caches.match("/index.html");
          });
        }),
    );
    return;
  }

  // Cache-first for static assets (CSS, JS, icons)
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response && response.status === 200) {
            const cloned = response.clone();
            caches.open(CACHE_VERSION).then((cache) => {
              cache.put(request, cloned);
            });
          }
          return response;
        })
        .catch((err) => {
          console.warn("[Service Worker] Fetch failed for:", request.url, err);
          return new Response("Offline", { status: 503 });
        });
    }),
  );
});

/**
 * Message event: Handle messages from the app
 * (e.g., force update, clear cache, etc.)
 */
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
