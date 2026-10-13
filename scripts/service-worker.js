// The service worker of the published build (sw.js, emitted by PwaPlugin in webpack.config.js; the
// dev server has none). The two placeholders below are replaced at build time (scripts/pwa.cjs).
//
// - Pages (navigations) come from the network first: online, a deploy is seen on the next visit,
//   and deep links (/gui, ?cmd=…) get what the server answers (404.html for an unknown path).
//   Offline, a precached page is served as it is (the static pages of blog posts), and the
//   precached index.html for any other page of the site: the router picks the page.
// - Everything else of the site is served from the cache of this version (the file names are
//   content-hashed), falling back to the network; other origins (analytics) are not touched.
// - A new deploy is a new version: the new worker precaches it into its own cache and takes over
//   when no tab runs the old one (no skipWaiting: an open tab keeps the files it was loaded with);
//   the caches of older versions are deleted then.

const CACHE_PREFIX = "tyulkin-";
const CACHE = CACHE_PREFIX + __CACHE_VERSION__;
const PRECACHE_URLS = __PRECACHE_URLS__;
// index.html, precached as the scope root
const APP_SHELL = new URL("./", self.registration.scope).href;

self.addEventListener("install", (event) => {
  // past the HTTP cache: a page cached by the host (Pages: 10 minutes) would be the old version
  // that refers to files the new deploy no longer has
  const requests = PRECACHE_URLS.map((url) => new Request(url, { cache: "reload" }));
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(requests)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      // the first visit works offline without a reload
      .then(() => self.clients.claim()),
  );
});

const fromNetworkFirst = async (request) => {
  try {
    return await fetch(request);
  } catch (error) {
    const cached =
      (await caches.match(request, { cacheName: CACHE, ignoreSearch: true })) ||
      (await caches.match(APP_SHELL, { cacheName: CACHE }));
    if (cached) return cached;
    throw error;
  }
};

const fromCacheFirst = async (event, request) => {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  // the rest of the site (the og:image card, the .woff fallbacks) is kept as it is fetched; the
  // response doesn't wait for the cache write
  if (response.ok && response.type === "basic") {
    event.waitUntil(cache.put(request, response.clone()));
  }
  return response;
};

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    request.mode === "navigate" ? fromNetworkFirst(request) : fromCacheFirst(event, request),
  );
});
