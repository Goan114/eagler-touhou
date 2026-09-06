/** L3/module. Preconditions: product policy + Launcher source. Mutations: isolated
 * selection state only. Proves: capability selection, transient fallback recovery.
 * Does NOT prove: audio playback/decoding, browser gesture policies or gameplay. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { PRODUCT_GAMES, resolveMusicMode } from "../product-catalog.mjs";

const cases = [
  [{ requested: "none", localOgg: true }, "none"],
  [{ requested: "ogg-full", audio: false, localOgg: true }, "none"],
  [{ requested: "midi", explicit: true, localOgg: true }, "midi"],
  [{ requested: "midi", localOgg: true }, "ogg-stream"],
  [{ requested: "midi", remoteOgg: true, preferOgg: false }, "midi"],
  [{ requested: "ogg-full", explicit: true, remoteOgg: true }, "ogg-full"],
  [{ requested: "ogg-full", explicit: true }, "midi"],
  [{ requested: "ogg-full", explicit: true, midi: false }, "none"],
  [{ requested: "midi", explicit: true, midi: false, localOgg: true }, "ogg-stream"],
  [{ requested: "bogus", midi: false, remoteOgg: true }, "ogg-stream"],
];
for (const [input, expected] of cases) {
  assert.equal(resolveMusicMode(input), expected, JSON.stringify(input));
}

let combinations = 0;
for (const requested of ["none", "midi", "ogg-stream", "ogg-full"])
for (const explicit of [false, true])
for (const audio of [false, true])
for (const midi of [false, true])
for (const localOgg of [false, true])
for (const remoteOgg of [false, true])
for (const preferOgg of [false, true]) {
  const input = { requested, explicit, audio, midi, localOgg, remoteOgg, preferOgg };
  const mode = resolveMusicMode(input);
  if (!audio || requested === "none") assert.equal(mode, "none");
  if (mode === "midi") assert.ok(audio && midi);
  if (mode.startsWith("ogg-")) assert.ok(audio && (localOgg || remoteOgg));
  if (audio && explicit && requested === "midi" && midi) assert.equal(mode, "midi");
  if (audio && explicit && requested.startsWith("ogg-") && (localOgg || remoteOgg)) {
    assert.equal(mode, requested);
  }
  combinations++;
}

// Execute the actual Launcher adapter around the selector. Progressive remote
// install may continue; an unrelated/offline publication must not count.
const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const source = app.slice(app.indexOf("function chooseDefaultMusic() {"), app.indexOf("\nconst customSelects ="));
const state = {
  game: "th06",
  music: "ogg-full",
  musicPreference: "ogg-full",
  musicPreferenceExplicit: true,
};
const generation = { descriptor: { revision: "r1" }, files: {} };
const context = {
  state,
  resolveMusicMode,
  webAudioAvailable: true,
  importServer: false,
  activeInstalledPackageGeneration: generation,
  installedPackageSnapshots: new Map(),
  releaseCatalog: { games: {} },
  game: () => ({ music: { midi: {}, ogg: {} } }),
  componentFileIds: () => ["track1", "track2"],
  readImportedOggMeta: () => null,
};
vm.createContext(context);
vm.runInContext(source, context);
context.chooseDefaultMusic();
assert.equal(state.music, "midi");
assert.equal(state.musicPreference, "ogg-full");
context.releaseCatalog.games.th06 = { revision: "r1" };
generation.files.track1 = { objectId: "a" };
context.chooseDefaultMusic();
assert.equal(state.music, "ogg-full");
context.importServer = true;
context.chooseDefaultMusic();
assert.equal(state.music, "midi");
generation.files.track2 = { objectId: "b" };
context.chooseDefaultMusic();
assert.equal(state.music, "ogg-full");
state.musicPreference = "none";
context.chooseDefaultMusic();
assert.equal(state.music, "none");

const roots = new Set();
for (const [game, product] of Object.entries(PRODUCT_GAMES)) {
  assert.equal(roots.has(product.storage.saveRoot), false, `${game}: unique save owner`);
  roots.add(product.storage.saveRoot);
  assert.ok(product.storage.saveRoot.startsWith("/"));
  assert.ok(!product.storage.scoreFile.includes("/"));
  assert.equal(typeof product.features.replayManagement, "boolean");
  assert.equal(typeof product.features.languages, "boolean");
  assert.equal(typeof product.features.focusHitbox, "boolean");
  assert.equal(typeof product.package.dataFileId, "string");
  assert.equal(product.package.dataTarget, `/${game}.data`);
  for (const [mode, directory] of Object.entries(product.package.musicSourceDirectories || {})) {
    assert.ok(["wav", "ogg"].includes(mode));
    assert.equal(typeof directory, "string");
    assert.ok(directory === "." || /^[A-Za-z0-9_.-]+$/.test(directory));
  }
  if (product.features.replayManagement) assert.match(product.replay?.prefix || "", /^th\d$/);
  else assert.equal(product.replay, undefined);
  if (product.multiplayerRuntime) {
    assert.ok(product.multiplayer);
    assert.ok(Number.isInteger(product.multiplayer.difficultyMax));
    assert.ok(Number.isInteger(product.multiplayer.characterMax));
    assert.ok(Number.isInteger(product.multiplayer.loadoutCount));
    assert.match(product.multiplayer.peerTransportGlobal, /^__[A-Za-z0-9]+$/);
  } else {
    assert.equal(product.multiplayer, undefined);
  }
}
console.log(`Product catalog/music policy: PASS (${combinations} combinations + Launcher transitions)`);
