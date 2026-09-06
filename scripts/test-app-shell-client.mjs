import assert from "node:assert/strict";
import { createAppShellClient } from "../app-shell-client.mjs";

class EventTargetStub {
  listeners = new Map();
  addEventListener(type, callback) {
    const list = this.listeners.get(type) || [];
    list.push(callback);
    this.listeners.set(type, list);
  }
  emit(type) {
    for (const callback of this.listeners.get(type) || []) callback();
  }
}

class WorkerStub extends EventTargetStub {
  state = "installing";
  setState(state) { this.state = state; this.emit("statechange"); }
}

class RegistrationStub extends EventTargetStub {
  waiting = null;
  installing = null;
  updates = 0;
  updateError = null;
  async update() {
    this.updates++;
    if (this.updateError) throw this.updateError;
  }
}

const registration = new RegistrationStub();
const serviceWorker = {
  controller: {},
  registerCalls: [],
  async register(url, options) {
    this.registerCalls.push({ url, options });
    return registration;
  },
  async getRegistration() { return null; },
};
const changes = [];
const scheduled = [];
let deferReload = true;
let reloads = 0;
const client = createAppShellClient({
  serviceWorker,
  secureContext: true,
  shouldDeferReload: () => deferReload,
  onChange: state => changes.push(state),
  schedule: callback => scheduled.push(callback),
  reload: () => reloads++,
  logger: { warn() {} },
});

await client.ready;
assert.deepEqual(serviceWorker.registerCalls, [{
  url: "./app-shell-sw.js",
  options: { scope: "./", updateViaCache: "none" },
}]);
assert.equal(registration.updates, 1);

const worker = new WorkerStub();
registration.installing = worker;
registration.emit("updatefound");
worker.setState("installed");
assert.equal(client.snapshot().updateReady, true);
assert.equal(client.maybeReload(), false, "running game must defer App Shell reload");
deferReload = false;
assert.equal(client.maybeReload(), true);
assert.equal(scheduled.length, 1);
scheduled.shift()();
assert.equal(reloads, 1);

const failedRegistration = new RegistrationStub();
failedRegistration.updateError = new Error("offline");
const failedServiceWorker = {
  controller: {},
  async register() { return failedRegistration; },
  async getRegistration() { return null; },
};
const failedClient = createAppShellClient({
  serviceWorker: failedServiceWorker,
  secureContext: true,
  logger: { warn() {} },
});
await failedClient.ready;
await Promise.resolve();
assert.equal(failedClient.snapshot().updateCheckFailed, true);
assert.match(failedClient.snapshot().updateError.message, /offline/);

assert.ok(changes.length >= 2);
console.log(JSON.stringify({ appShellClient: "PASS", reloads }));
