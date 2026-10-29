const CACHE = "living-world-__BUILD__";
const SHELL = __ASSETS__;
const urls = new Set(
  SHELL.map((path) => new URL(path, self.location.origin).href),
);
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("living-world-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
// Each worker serves its own complete shell. Network-first HTML can mix new
// asset URLs with an old offline cache during updates. Never cache arbitrary URLs.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.mode !== "navigate" && !urls.has(url.href)) return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(
        event.request.mode === "navigate" ? "/index.html" : event.request,
        { ignoreVary: true },
      );
      return cached || fetch(event.request);
    }),
  );
});
