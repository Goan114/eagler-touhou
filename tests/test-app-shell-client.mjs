import assert from "node:assert/strict";
import { createAppShellClient } from "../.cache/build/browser/assets/launcher/app-shell-client.mjs";

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

const firstInstallRegistration = new RegistrationStub();
const firstInstallServiceWorker = {
  controller: null,
  async register() { return firstInstallRegistration; },
  async getRegistration() { return null; },
};
const firstInstallClient = createAppShellClient({
  serviceWorker: firstInstallServiceWorker,
  secureContext: true,
  logger: { warn() {} },
});
await firstInstallClient.ready;
const firstInstallWorker = new WorkerStub();
firstInstallRegistration.installing = firstInstallWorker;
firstInstallRegistration.emit("updatefound");
// clients.claim() may install a controller before the worker's final state
// event. Replacement ownership must remain the value captured at updatefound.
firstInstallServiceWorker.controller = {};
firstInstallWorker.setState("installed");
firstInstallWorker.setState("activated");
assert.equal(firstInstallClient.snapshot().updateReady, false, "first install must not masquerade as an update");

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
assert.equal(client.maybeReload(), false, "reload must only be scheduled once for the same update");

const waitingRegistration = new RegistrationStub();
waitingRegistration.waiting = {};
const waitingServiceWorker = {
  controller: {},
  async register() { return waitingRegistration; },
  async getRegistration() { return null; },
};
const waitingClient = createAppShellClient({
  serviceWorker: waitingServiceWorker,
  secureContext: true,
  logger: { warn() {} },
});
await waitingClient.ready;
assert.equal(waitingClient.snapshot().updateReady, true, "an already-waiting replacement must be surfaced");

const fallbackRegistration = new RegistrationStub();
const fallbackServiceWorker = {
  controller: {},
  async register() { throw new Error("registration unavailable"); },
  async getRegistration() { return fallbackRegistration; },
};
const fallbackClient = createAppShellClient({
  serviceWorker: fallbackServiceWorker,
  secureContext: true,
  logger: { warn() {} },
});
assert.equal(await fallbackClient.ready, fallbackRegistration, "registration failure should reuse an existing registration when available");

let insecureRegisterCalls = 0;
const insecureClient = createAppShellClient({
  serviceWorker: {
    controller: null,
    async register() { insecureRegisterCalls++; return new RegistrationStub(); },
    async getRegistration() { return null; },
  },
  secureContext: false,
});
assert.equal(await insecureClient.ready, null);
assert.equal(insecureRegisterCalls, 0, "insecure contexts must not attempt Service Worker registration");

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
