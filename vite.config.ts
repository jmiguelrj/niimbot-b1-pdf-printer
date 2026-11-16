import { defineConfig, type Plugin } from "vite";

function offlinePwaPlugin(): Plugin {
  return {
    name: "niimbot-offline-pwa-sw",
    apply: "build",
    generateBundle(_options, bundle) {
      const bundleFiles = Object.keys(bundle)
        .filter((file) => !file.endsWith(".map"))
        .sort()
        .map((file) => `./${file}`);

      const staticShell = [
        "./",
        "./index.html",
        "./manifest.webmanifest",
        "./pwa-icon.svg",
        "./favicon.svg",
        "./niimbot-b1.webp",
      ];

      const precacheUrls = Array.from(new Set([...staticShell, ...bundleFiles]));
      const versionSeed = bundleFiles.join("|");
      let hash = 0;
      for (let i = 0; i < versionSeed.length; i++) {
        hash = (hash * 31 + versionSeed.charCodeAt(i)) >>> 0;
      }
      const cachePrefix = "niimbot-label-studio-";
      const cacheName = `${cachePrefix}v1.1.0-${hash.toString(16)}`;

      const swSource = `const CACHE_PREFIX = ${JSON.stringify(cachePrefix)};
const CACHE_NAME = ${JSON.stringify(cacheName)};
const PRECACHE_URLS = ${JSON.stringify(precacheUrls, null, 2)};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (!event.request.url.startsWith(self.registration.scope)) return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (
          response &&
          response.status === 200 &&
          response.type === "basic" &&
          response.url.startsWith(self.registration.scope)
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
`;

      this.emitFile({
        type: "asset",
        fileName: "sw.js",
        source: swSource,
      });
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [offlinePwaPlugin()],
});
