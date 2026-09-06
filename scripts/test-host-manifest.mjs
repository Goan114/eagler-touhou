import assert from "node:assert/strict";
import { HOST_MANIFEST_FILE, HOST_MANIFEST_SCHEMA, validateHostManifest } from "../host-manifest.mjs";

const game = {
  runtime: "runtime/th06/th06.html?hosted=1&v=1",
  multiplayerRuntime: "runtime/th06/multiplayer/th06.html?hosted=1&v=2",
  gameData: {
    path: "th06.data",
    bytes: 1,
    sha256: "a".repeat(64),
    version: `sha256-${"a".repeat(64)}`,
    layout: `sha256-${"b".repeat(64)}`,
  },
  music: { midi: { files: [] } },
};

const hosted = validateHostManifest({
  schema: HOST_MANIFEST_SCHEMA,
  protocol: "eagler-touhou/1",
  profile: "web-validation-test",
  shared: {
    resourceMode: "hosted",
    vanillaFont: "../shared/msgothic.ttc?v=x",
    unicodeFont: "../shared/unifont.otf?v=y",
    netplayRelay: "wss://relay.example.invalid/",
  },
  games: { th06: game },
});
assert.equal(hosted.shared.resourceMode, "hosted");
assert.equal(HOST_MANIFEST_FILE, "host-manifest.json");

assert.throws(() => validateHostManifest({ ...hosted, games: { th99: game } }), /games/);
assert.throws(() => validateHostManifest({ ...hosted, shared: { ...hosted.shared, resourceMode: "import-partial" } }), /resource mode/);
assert.throws(() => validateHostManifest({ ...hosted, shared: { ...hosted.shared, netplayRelay: "https://example.invalid/" } }), /netplayRelay/);

const importedGame = {
  ...game,
  offlineCompatibility: {
    schema: "eagler-touhou/offline-game-pack/1",
    runtimeCompatibility: {
      protocol: "eagler-touhou/1",
      dataLayout: game.gameData.layout,
      versionSource: "offline-pack",
    },
    requiredShared: ["/msgothic.ttc", "/unifont.otf"],
    languages: { source: "offline-pack", baseline: ["ja"] },
  },
};
assert.doesNotThrow(() => validateHostManifest({
  schema: HOST_MANIFEST_SCHEMA,
  protocol: "eagler-touhou/1",
  profile: "web-validation-import",
  shared: { resourceMode: "import" },
  games: { th06: importedGame },
}));

console.log(JSON.stringify({ hostManifest: "PASS", subsetProducts: true }));
