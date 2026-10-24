/* sw.js: offline cache for Part-Writing Detective, adapted from EarCraft.
 * There are two caches. Each has a version. Increase CACHE_VERSION to refresh the cached app files and CDN scripts.
 * The shell cache holds the app files and the two CDN scripts. The install step caches them.
 * The samples cache holds the piano MP3 files. The install step tries to cache them. The first use of a sample also caches it.
 * App files use network first: an online visit gets the latest code, an offline visit uses the cache.
 * The CDN scripts and the samples use cache first.
 * Each external file is fetched with its SRI hash (from index.html and js/samples.js), so a changed file is never cached.
 * The page checks the hash again on each load, also for files from this cache. A daily sample check is therefore not necessary.
 * On GitHub Pages, all project sites of an account share one origin and one CacheStorage. EarCraft is on the same origin.
 * Cache names have the prefix of this app, and cleanup deletes only caches with this prefix.
 */

importScripts("js/samples.js");

const CACHE_PREFIX = "pwdetective-";
const CACHE_VERSION = "v4";
const SHELL_CACHE = CACHE_PREFIX + "shell-" + CACHE_VERSION;
const SAMPLES_CACHE = CACHE_PREFIX + "samples-" + CACHE_VERSION;

const SAMPLES = Object.values(self.PIANO_SAMPLES.notes).map((s) => ({
  url: self.PIANO_SAMPLES.baseUrl + s.file,
  integrity: s.integrity,
}));

const APP_FILES = [
  "./", "./index.html", "./styles.css", "./icon.svg",
  "./manifest.json",
  "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./apple-touch-icon.png",
  "./apple-touch-icon-152x152.png", "./apple-touch-icon-167x167.png",
  "./js/theory.js", "./js/samples.js", "./js/audio.js", "./js/staff.js", "./js/app.js",
];

// Keep these hashes the same as the integrity attributes in index.html.
const CDN_SCRIPTS = [
  {
    url: "https://cdn.jsdelivr.net/npm/tone@15.1.22/build/Tone.js",
    integrity: "sha384-NWoslxaf/3dYwQk+uGziDYJFdsjBpVlU1WpFRexuDFcIk/5PJpCbpVXia2Uikeix",
  },
  {
    url: "https://cdn.jsdelivr.net/npm/vexflow@5.0.0/build/cjs/vexflow.js",
    integrity: "sha384-CqssDDrB0gDzmUGwU/TPip4CJOQif4qWkW+w31xtNqLV34D7utsq7O4N7uBAtF9u",
  },
];

const verifiedRequest = ({ url, integrity }) => new Request(url, { mode: "cors", integrity });

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const shell = await caches.open(SHELL_CACHE);
    await shell.addAll(APP_FILES.concat(CDN_SCRIPTS.map(verifiedRequest)));
    // Cache the samples if possible. A failure here does not stop the install.
    const samples = await caches.open(SAMPLES_CACHE);
    await Promise.allSettled(SAMPLES.map(async (s) => {
      if (await samples.match(s.url)) return;
      const res = await fetch(verifiedRequest(s));
      if (res && res.ok) await samples.put(s.url, res);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keep = new Set([SHELL_CACHE, SAMPLES_CACHE]);
    const names = await caches.keys();
    // Delete only old versions of the caches of this app. Do not delete the caches of other apps on the origin.
    await Promise.all(names.map((n) =>
      (n.startsWith(CACHE_PREFIX) && !keep.has(n) ? caches.delete(n) : null)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(req));               // app files
  } else if (url.hostname === "tonejs.github.io") {
    event.respondWith(cacheFirst(req, SAMPLES_CACHE));  // piano samples
  } else if (url.hostname === "cdn.jsdelivr.net") {
    event.respondWith(cacheFirst(req, SHELL_CACHE));    // Tone.js / VexFlow
  }
  // Other requests: the browser handles them.
});

// Use the network when online and the cache when offline. Navigations fall back to index.html.
async function networkFirst(req) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (e) {
    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) return cached;
    if (req.mode === "navigate") {
      const index = await cache.match("./index.html");
      if (index) return index;
    }
    throw e;
  }
}

// The page request includes its SRI hash, so the browser verifies a network response before it is cached.
// The browser also verifies the response that this function returns.
async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res && res.ok && req.integrity) cache.put(req, res.clone());
  return res;
}
