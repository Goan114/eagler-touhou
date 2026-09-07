import assert from "node:assert/strict";
import { createDevelopmentHostManifest } from "../lib/development-host-manifest.mjs";
import { DEVELOPMENT_CONTENT } from "../lib/development-content.mjs";
import { HOST_MANIFEST_SCHEMA, validateHostManifest } from "../lib/contracts/host-manifest.mjs";
import { PRODUCT_GAMES } from "../lib/contracts/product-catalog.mjs";

const manifest = await createDevelopmentHostManifest();
assert.equal(manifest.schema, HOST_MANIFEST_SCHEMA);
assert.equal(manifest.profile, "web-development");
assert.equal(manifest.shared.resourceMode, "hosted");
assert.deepEqual(Object.keys(manifest.games), Object.keys(PRODUCT_GAMES));
assert.doesNotThrow(() => validateHostManifest(manifest));
assert.equal(manifest.shared.netplayRelay, undefined);

const relayManifest = await createDevelopmentHostManifest({ netplayRelay: "ws://127.0.0.1:18142/" });
assert.equal(relayManifest.shared.netplayRelay, "ws://127.0.0.1:18142/");
await assert.rejects(
  createDevelopmentHostManifest({ netplayRelay: "https://example.invalid/" }),
  /netplayRelay/,
);
for (const [game, entry] of Object.entries(manifest.games)) {
  assert.match(entry.runtime, /^\.\.\//, `${game}: development Runtime must remain an explicit workspace-relative input`);
  assert.equal(entry.runtime, DEVELOPMENT_CONTENT.games[game].runtime,
    `${game}: development Host Manifest must preserve the declared Runtime owner`);
  if (PRODUCT_GAMES[game].multiplayerRuntime) {
    assert.equal(entry.multiplayerRuntime, DEVELOPMENT_CONTENT.games[game].multiplayerRuntime,
      `${game}: development Host Manifest must preserve the declared multiplayer Runtime owner`);
  }
  assert.match(entry.gameData.version, /^sha256-[a-f0-9]{64}$/i);
  assert.match(entry.gameData.layout, /^sha256-[a-f0-9]{64}$/i);
}
console.log(JSON.stringify({ developmentHostManifest: "PASS", games: Object.keys(manifest.games) }));
