const CACHE_NAME = "fundly-static-v3";
const STATIC_ASSETS = ["/manifest.webmanifest", "/icon.png", "/apple-icon.png"];
const STATIC_DESTINATIONS = new Set(["style", "script", "image", "font"]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Leave auth/database API calls untouched.
  if (url.pathname.startsWith("/api/")) return;

  // Never cache Next.js data / RSC payloads or any query-string request.
  if (url.search) return;

  // Cache only static assets; keep app/document data always fresh.
  const isStaticAsset = STATIC_DESTINATIONS.has(request.destination);

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => Response.error()),
    );
    return;
  }

  if (!isStaticAsset) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response && response.status === 200 && url.origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});
