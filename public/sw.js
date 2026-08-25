// Minimal app-shell cache — not a full offline experience, just enough that
// a repeat visit on a flaky connection still gets the shell instead of
// nothing. Deliberately narrow: only static, non-personalized routes are
// cached. Never caches /api/**, auth, or any user-specific page — those
// must always hit the network so data stays real, matching the rest of
// this app's "never show stale data as current" principle.
//
// Network-first, not cache-first: Next.js content-hashes every JS chunk
// filename per build, so a cache-first strategy here means a returning
// visitor gets served yesterday's HTML — which references chunk files
// that no longer exist on the server after the next deploy replaces
// them, throwing ChunkLoadError (confirmed live: this exact bug, on this
// exact file, right after a routine deploy). Network-first still meets
// the "instant shell on a flaky connection" goal via the catch()
// fallback, just without ever preferring stale content when the network
// is actually up.
const CACHE_NAME = "discover-georgia-shell-v2";
const SHELL_URLS = ["/", "/discover", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only ever handle same-origin GET navigations to the shell routes —
  // everything else (API calls, auth, POST/PATCH/DELETE, third-party
  // requests) passes straight through to the network untouched.
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  if (!SHELL_URLS.includes(url.pathname)) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
