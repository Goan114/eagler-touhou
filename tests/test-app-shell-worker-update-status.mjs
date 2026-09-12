import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../src/app-shell-sw.js", import.meta.url), "utf8");

class MemoryCache {
  entries = new Map();
  key(input) { return typeof input === "string" ? input : input.url; }
  async put(input, response) { this.entries.set(this.key(input), response.clone()); }
  async match(input) { return this.entries.get(this.key(input))?.clone(); }
  async keys() { return [...this.entries.keys()].map(url => new Request(url)); }
}

async function installWorker(existingCacheNames = []) {
  const stores = new Map(existingCacheNames.map(name => [name, new MemoryCache()]));
  const listeners = new Map();
  const caches = {
    async keys() { return [...stores.keys()]; },
    async open(name) {
      if (!stores.has(name)) stores.set(name, new MemoryCache());
      return stores.get(name);
    },
    async delete(name) { return stores.delete(name); },
  };
  const self = {
    __WB_MANIFEST: [],
    registration: { scope: "https://example.test/" },
    addEventListener(type, callback) { listeners.set(type, callback); },
    async skipWaiting() {},
    clients: { async claim() {} },
  };
  vm.runInNewContext(source, { self, caches, URL, Request, Response, fetch, Date, Promise, console });
  let installTask;
  listeners.get("install")({ waitUntil(task) { installTask = task; } });
  await installTask;

  const currentName = [...stores.keys()].find(name => name.includes("__APP_SHELL_BUILD_ID__"));
  const current = stores.get(currentName);
  const metaKey = [...current.entries.keys()].find(url => url.includes("/__app-shell-meta__/"));
  const readMeta = async () => (await current.match(metaKey)).json();
  const requestStatus = async () => {
    let responseTask;
    listeners.get("fetch")({
      request: new Request("https://example.test/__app-shell-update-status__"),
      respondWith(task) { responseTask = task; },
    });
    return (await responseTask).json();
  };
  return { readMeta, requestStatus };
}

const firstInstall = await installWorker();
assert.deepEqual(await firstInstall.readMeta(), {
  build: "__APP_SHELL_BUILD_ID__",
  createdAt: (await firstInstall.readMeta()).createdAt,
  appliedAt: null,
  updated: false,
});
assert.equal((await firstInstall.requestStatus()).appliedAt, null, "first install must not count as an update");

const replacement = await installWorker(["eagler-touhou-app-shell-previous"]);
assert.equal((await replacement.readMeta()).appliedAt, null, "installing a replacement must wait for the refreshed app");
const applied = await replacement.requestStatus();
assert.equal(applied.updated, true);
assert.ok(Number(applied.appliedAt) > 0, "the refreshed app must stamp the applied update time");
assert.equal((await replacement.requestStatus()).appliedAt, applied.appliedAt, "later loads must retain the original applied time");

console.log("app shell worker update status: PASS");
