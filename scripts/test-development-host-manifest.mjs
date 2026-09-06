import assert from "node:assert/strict";
import { createDevelopmentHostManifest } from "../lib/development-host-manifest.mjs";
import { HOST_MANIFEST_SCHEMA, validateHostManifest } from "../host-manifest.mjs";
import { PRODUCT_GAMES } from "../product-catalog.mjs";

const manifest = await createDevelopmentHostManifest();
assert.equal(manifest.schema, HOST_MANIFEST_SCHEMA);
assert.equal(manifest.profile, "web-development");
assert.equal(manifest.shared.resourceMode, "hosted");
assert.deepEqual(Object.keys(manifest.games), Object.keys(PRODUCT_GAMES));
assert.doesNotThrow(() => validateHostManifest(manifest));
for (const [game, entry] of Object.entries(manifest.games)) {
  assert.match(entry.runtime, /^\.\.\//, `${game}: development Runtime must remain an explicit workspace-relative input`);
  assert.match(entry.gameData.version, /^sha256-[a-f0-9]{64}$/i);
  assert.match(entry.gameData.layout, /^sha256-[a-f0-9]{64}$/i);
}
console.log(JSON.stringify({ developmentHostManifest: "PASS", games: Object.keys(manifest.games) }));

