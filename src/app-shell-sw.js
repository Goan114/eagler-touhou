"use strict";

// App Shell only. Package/game content and Package DATA preparation are not
// routed through this worker. Deployment builds may add App-owned Runtime
// HTML/JS/WASM to this same precache so an installed game can start offline.
const CACHE_PREFIX = "eagler-touhou-app-shell-";
const CACHE_NAME = `${CACHE_PREFIX}__APP_SHELL_BUILD_ID__`;
const CACHE_RETENTION = 2;
const PRECACHE_CONCURRENCY = 3;
const scopeUrl = new URL(self.registration.scope);
const PRECACHE_MANIFEST = self.__WB_MANIFEST;
const cacheMetaUrl = new URL(`./__app-shell-meta__/__APP_SHELL_BUILD_ID__`, scopeUrl).href;
const updateStatusUrl = new URL("./__app-shell-update-status__", scopeUrl).href;

const manifestByPathname = new Map(PRECACHE_MANIFEST.map(entry => {
  const url = new URL(entry.url, scopeUrl);
  return [url.pathname, { ...entry, cacheUrl: url.href }];
}));

async function precacheShell() {
  const existingShellCaches = (await caches.keys()).filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME);
  const createdAt = Date.now();
  const cache = await caches.open(CACHE_NAME);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(PRECACHE_CONCURRENCY, PRECACHE_MANIFEST.length) }, async () => {
    while (cursor < PRECACHE_MANIFEST.length) {
      const entry = PRECACHE_MANIFEST[cursor++];
      const cacheUrl = new URL(entry.url, scopeUrl).href;
      const request = new Request(cacheUrl, { cache: "reload" });
      const response = await fetch(request);
      if (!response.ok) throw new Error(`App Shell precache failed: ${request.url} HTTP ${response.status}`);
      await cache.put(cacheUrl, response);
    }
  }));
  await cache.put(cacheMetaUrl, new Response(JSON.stringify({
    build: "__APP_SHELL_BUILD_ID__",
    createdAt,
    appliedAt: null,
    updated: existingShellCaches.length > 0,
  }), { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }));
}

async function appShellUpdateStatus() {
  const cache = await caches.open(CACHE_NAME);
  const response = await cache.match(cacheMetaUrl);
  if (!response) return new Response(null, { status: 503 });
  const status = await response.json();
  if (status.updated === true && !(Number(status.appliedAt) > 0)) {
    status.appliedAt = Date.now();
    const applied = new Response(JSON.stringify(status), {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
    await cache.put(cacheMetaUrl, applied.clone());
    return applied;
  }
  return new Response(JSON.stringify(status), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    await precacheShell();
    await self.skipWaiting();
  })());
});

async function cacheCreatedAt(name) {
  try {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    const metaKey = keys.find(request => new URL(request.url).pathname.includes("/__app-shell-meta__/"));
    if (!metaKey) return 0;
    const response = await cache.match(metaKey);
    const parsed = await response?.json();
    return Number(parsed?.createdAt) || 0;
  } catch {
    return 0;
  }
}

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const shellCaches = (await caches.keys()).filter(name => name.startsWith(CACHE_PREFIX));
    const ranked = await Promise.all(shellCaches.map(async name => ({ name, createdAt: await cacheCreatedAt(name) })));
    ranked.sort((a, b) => b.createdAt - a.createdAt);
    for (const entry of ranked.slice(CACHE_RETENTION)) await caches.delete(entry.name);
    await self.clients.claim();
  })());
});

function manifestEntryForRequest(request) {
  if (request.method !== "GET") return null;
  const url = new URL(request.url);
  if (url.origin !== scopeUrl.origin) return null;
  return manifestByPathname.get(url.pathname) || null;
}

async function shellCacheFirst(request, entry) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(entry.cacheUrl);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(entry.cacheUrl, response.clone());
  return response;
}

self.addEventListener("fetch", event => {
  if (event.request.method === "GET" && event.request.url === updateStatusUrl) {
    event.respondWith(appShellUpdateStatus());
    return;
  }
  const entry = manifestEntryForRequest(event.request);
  if (!entry) return;
  event.respondWith(shellCacheFirst(event.request, entry));
});
