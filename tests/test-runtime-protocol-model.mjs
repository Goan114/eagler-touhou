/** L1 protocol-envelope behavior contract. Mutation: none. Proves unknown
 * Runtime messages are accepted only for the current protocol/game and known
 * event or response discriminants. Does not execute a Runtime shell. */
import assert from "node:assert/strict";
import {
  RUNTIME_PROTOCOL_COMMANDS,
  RUNTIME_PROTOCOL_OPTIONAL_COMMANDS,
  RUNTIME_PROTOCOL_OPTIONAL_EVENTS,
  parseRuntimeInboundMessage,
} from "../.cache/build/browser/assets/contracts/runtime-protocol.mjs";

assert.ok(RUNTIME_PROTOCOL_COMMANDS.includes("configure"));
assert.ok(RUNTIME_PROTOCOL_OPTIONAL_COMMANDS.includes("retry-music"));
assert.ok(RUNTIME_PROTOCOL_OPTIONAL_EVENTS.includes("audio-health"));

const ready = { protocol: "eagler-touhou/1", game: "th06", event: "ready", saveRoot: "/savesth06" };
assert.deepEqual(parseRuntimeInboundMessage(ready, "th06"), ready);

const response = { protocol: "eagler-touhou/1", game: "th07", request: "r1", ok: true, files: [] };
assert.deepEqual(parseRuntimeInboundMessage(response, "th07"), response);

for (const invalid of [
  null,
  [],
  { ...ready, protocol: "other/1" },
  { ...ready, game: "th07" },
  { ...ready, event: "unknown-event" },
  { protocol: "eagler-touhou/1", game: "th06", request: "r1", ok: "yes" },
]) assert.equal(parseRuntimeInboundMessage(invalid, "th06"), null);

console.log(JSON.stringify({ runtimeProtocolModel: "PASS", boundary: "unknown-to-envelope" }));
