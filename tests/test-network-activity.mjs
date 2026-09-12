import assert from "node:assert/strict";
import { createNetworkActivityTracker } from "../.cache/build/browser/assets/launcher/network-activity.mjs";

const events = [];
let tick = 0;
let latestNativeResponse = null;
const fetchImpl = async () => (latestNativeResponse = new Response(new ReadableStream({
  start(controller) {
    controller.enqueue(new Uint8Array([1, 2, 3]));
    controller.enqueue(new Uint8Array([4, 5]));
    controller.close();
  },
}), { status: 200, headers: { "content-length": "5" } }));

const tracker = createNetworkActivityTracker({
  fetchImpl,
  clock: () => ++tick,
  onChange: value => events.push(value),
});

const response = await tracker.fetch("https://example.test/file.bin", {}, { label: "GAME DATA" });
assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], [1, 2, 3, 4, 5]);
assert.equal(tracker.activeCount, 0);
assert.ok(events.some(event => event.count === 1 && event.active[0].phase === "requesting"));
assert.ok(events.some(event => event.active[0]?.total === 5));
assert.ok(events.some(event => event.active[0]?.loaded === 5));
assert.equal(events.at(-1).count, 0);

const directResponse = await tracker.fetch("https://example.test/direct-stream.bin", {}, { label: "DIRECT STREAM" });
const nativeBody = latestNativeResponse.body;
assert.equal(directResponse.body, nativeBody,
  "network tracker must expose the browser's original Response.body because Android WebView/Via can stall on a rebuilt stream");
assert.equal(tracker.activeCount, 0, "direct body consumers end generic progress ownership without wrapping the stream");
const reader = nativeBody.getReader();
const directBytes = [];
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  directBytes.push(...value);
}
assert.deepEqual(directBytes, [1, 2, 3, 4, 5]);

const manual = tracker.begin({ label: "DESCRIPTOR" });
assert.equal(tracker.activeCount, 1);
tracker.update(manual, { loaded: 2, total: 4 });
assert.equal(tracker.snapshot().loaded, 2);
tracker.finish(manual);
assert.equal(tracker.activeCount, 0);

const xhrEvents = [];
class FakeXhr {
  open() {}
  setRequestHeader() {}
  getResponseHeader(name) { return name.toLowerCase() === "content-length" ? "5" : null; }
  getAllResponseHeaders() { return "content-length: 5\r\ncontent-type: application/octet-stream\r\n"; }
  send() {
    this.status = 200;
    this.statusText = "OK";
    this.response = new Blob([new Uint8Array([1, 2, 3, 4, 5])]);
    this.onprogress?.({ loaded: 2, total: 5, lengthComputable: true });
    this.onprogress?.({ loaded: 5, total: 5, lengthComputable: true });
    this.onload?.();
  }
  abort() { this.onabort?.(); }
}
const xhrTracker = createNetworkActivityTracker({
  fetchImpl,
  xhrFactory: () => new FakeXhr(),
  onChange: value => xhrEvents.push(value),
});
const xhrResponse = await xhrTracker.xhrFetch("https://example.test/file.bin", {}, { label: "PACKAGE" });
assert.deepEqual([...new Uint8Array(await xhrResponse.arrayBuffer())], [1, 2, 3, 4, 5]);
assert.ok(xhrEvents.some(event => event.active[0]?.loaded === 2 && event.active[0]?.total === 5),
  "XHR-backed Package transfers must expose live byte progress without wrapping a fetch stream");
assert.equal(xhrTracker.activeCount, 0);

let fallbackFetchCalls = 0;
const fallbackFetch = async () => {
  fallbackFetchCalls++;
  return new Response(new Uint8Array([9, 8, 7]), {
    status: 200,
    headers: { "content-length": "3" },
  });
};
class NetworkErrorXhr extends FakeXhr {
  send() { this.onerror?.(); }
}
const fallbackTracker = createNetworkActivityTracker({
  fetchImpl: fallbackFetch,
  xhrFactory: () => new NetworkErrorXhr(),
});
const fallbackResponse = await fallbackTracker.xhrFetch("https://example.test/large.bin", {}, { label: "PACKAGE FALLBACK" });
assert.deepEqual([...new Uint8Array(await fallbackResponse.arrayBuffer())], [9, 8, 7]);
assert.equal(fallbackFetchCalls, 1,
  "an XHR transport failure must retry once through native fetch");
assert.equal(fallbackTracker.activeCount, 0);

let statusZeroFetchCalls = 0;
class StatusZeroXhr extends FakeXhr {
  send() {
    this.status = 0;
    this.statusText = "";
    this.response = new Blob([]);
    this.onload?.();
  }
}
const statusZeroTracker = createNetworkActivityTracker({
  fetchImpl: async () => {
    statusZeroFetchCalls++;
    return new Response(new Uint8Array([6, 5, 4]), {
      status: 200,
      headers: { "content-length": "3" },
    });
  },
  xhrFactory: () => new StatusZeroXhr(),
});
const statusZeroResponse = await statusZeroTracker.xhrFetch("https://example.test/status-zero.bin");
assert.deepEqual([...new Uint8Array(await statusZeroResponse.arrayBuffer())], [6, 5, 4]);
assert.equal(statusZeroFetchCalls, 1,
  "XHR onload with status 0 must retry once through native fetch");
assert.equal(statusZeroTracker.activeCount, 0);

let abortedFallbackFetchCalls = 0;
const abortedController = new AbortController();
abortedController.abort();
const abortedTracker = createNetworkActivityTracker({
  fetchImpl: async () => {
    abortedFallbackFetchCalls++;
    return new Response();
  },
  xhrFactory: () => new NetworkErrorXhr(),
});
await assert.rejects(
  () => abortedTracker.xhrFetch("https://example.test/cancelled.bin", { signal: abortedController.signal }),
  error => error?.name === "AbortError",
);
assert.equal(abortedFallbackFetchCalls, 0,
  "a user-aborted Package transfer must never be retried through fetch");
assert.equal(abortedTracker.activeCount, 0);

console.log("Network activity contract: PASS");
