import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DEVELOPMENT_CONTENT } from "../lib/development-content.mjs";

const [app, index, catalog, shell, packageServer, packageDescriptor] = await Promise.all([
  readFile(new URL("../app.js", import.meta.url), "utf8"),
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../product-catalog.mjs", import.meta.url), "utf8"),
  readFile(new URL("../../th06-eagler/resources/shell.html", import.meta.url), "utf8"),
  readFile(new URL("./package-server.mjs", import.meta.url), "utf8"),
  readFile(new URL("../package-descriptor.mjs", import.meta.url), "utf8"),
]);

assert.match(catalog, /th06:[\s\S]*multiplayerRuntime: "\.\/runtime\/th06\/multiplayer\/th06\.html"/,
  "TH06 local product catalog must expose an App-owned multiplayer Runtime");
assert.match(DEVELOPMENT_CONTENT.games.th06.multiplayerRuntime, /^\.\.\/th06-eagler\/build-web-netplay-th06\/th06\.html/,
  "TH06 development content owner must point at the isolated netplay build tree");

assert.match(catalog, /th06:[\s\S]*peerTransportGlobal: "__th06PeerTransport"/,
  "runtime diagnostics must use the TH06 peer transport when TH06 multiplayer is active");
assert.match(catalog, /th06:[\s\S]*difficultyMax: 4/,
  "Launcher must retain TH06's 0-4 difficulty range instead of importing TH07 Phantasm semantics");
assert.match(catalog, /th06:[\s\S]*characterMax: 1/,
  "Launcher must keep TH06 loadouts to Reimu and Marisa");
assert.match(catalog, /th06:[\s\S]*loadoutCount: 4/,
  "TH06 room UI must cycle only Reimu and Marisa loadouts");
assert.match(app, /mpShareSettingsKeyForProduct = product => `eagler-touhou-\$\{product\}-share-singleplayer-settings-v1`/,
  "TH06MP and TH07MP must not share one settings-sync preference key");
assert.match(app, /mpLoadoutPreferenceKeyForProduct = product => `eagler-touhou-\$\{product\}-loadout-v1`/,
  "TH06MP and TH07MP must not overwrite each other's remembered loadout");
assert.match(app, /mpTransportRoomId = \(code, product = state\.product\) => `\$\{product\}-\$\{code\}`/,
  "TH06MP and TH07MP must use disjoint relay/lobby room namespaces even when display room codes collide");
assert.match(app, /const multiplayerProducts = new Map\(Object\.entries\(PRODUCT_GAMES\)[\s\S]*product\.multiplayerRuntime && product\.multiplayer/,
  "multiplayer product discovery must follow registered adapters");
assert.match(app, /const productIds = new Set\(\[\.\.\.Object\.keys\(PRODUCT_GAMES\), \.\.\.multiplayerProducts\.keys\(\)\]\)/,
  "route validation must derive ordinary and multiplayer product ids from the registry");
assert.match(app, /return productIds\.has\(value\) \? value : null/,
  "route validation must not repeat a fixed product allowlist");
assert.match(app, /const mpDifficultyMax = \(gameId = state\.game\) => PRODUCT_GAMES\[gameId\]\?\.multiplayer\?\.difficultyMax \?\? 0/,
  "multiplayer difficulty bounds must come from the selected adapter");
assert.match(app, /const maxLoadout = PRODUCT_GAMES\[gameFromProduct\(product\)\]\?\.multiplayer\?\.loadoutCount \?\? 0/,
  "remembered loadout validation must use the selected adapter's declared range");
assert.match(app, /mpRoomSessionKeyForProduct = product => `eagler-touhou-\$\{product\}-room-v1`/,
  "TH06MP and TH07MP must not restore the same persisted room session");
assert.match(app, /mpLobbyClientKeyForProduct = product => `eagler-touhou-\$\{product\}-lobby-client-v1`/,
  "TH06MP and TH07MP must not share one lobby client identity");
assert.match(app, /const transportRoomId = mpTransportRoomId\(room\.code\)[\s\S]*url\.searchParams\.set\("room", transportRoomId\)/,
  "lobby WebSocket must use and cache the product-namespaced room id");
assert.match(app, /relay\.searchParams\.set\("room", mpTransportRoomId\(room\.code\)\)/,
  "gameplay transport must use the same product-namespaced room id as the lobby");
assert.match(app, /const supported = difficulty <= mpDifficultyMax\(\);[\s\S]*button\.hidden = !supported/,
  "TH06 room settings must hide TH07-only Phantasm instead of failing only at launch time");
assert.match(index, /data-game="th06" data-product="th06mp"[\s\S]*MULTIPLAYER/,
  "TH06 multiplayer must be exposed as a dedicated product card");
assert.doesNotMatch(index, /runtimeVariantSelect|th07NetplayOption/,
  "deprecated TH06 card-internal Runtime selector must not remain visible or addressable");
assert.match(app, /product\.multiplayerRuntime && typeof item\.multiplayerRuntime !== "string"/,
  "legacy compatibility manifests must advertise the multiplayer Runtime required by each adapter");
assert.match(app, /Object\.keys\(PRODUCT_GAMES\)\.every\(gameId => validLegacyGame\(gameId, value\.games\[gameId\], resourceMode\)\)/,
  "legacy compatibility manifests must contain every registered adapter");

assert.match(packageServer, /PRODUCT_GAMES\[game\]\.multiplayerRuntime[\s\S]*required\(`\$\{game\}-multiplayer-build`\)/,
  "server publication must require the isolated TH06 multiplayer build");
assert.match(packageServer, /entry\.multiplayerRuntime = `runtime\/\$\{game\}\/multiplayer\/\$\{game\}\.html\?hosted=1&v=\$\{multiplayerRuntimeVersion\}`/,
  "server publication must copy/version each game's App-owned multiplayer Runtime");
assert.match(packageServer, /normal and multiplayer Runtime builds must use identical shared DATA content\/layout/,
  "publication must reject a TH06 multiplayer Runtime built against different DATA content/layout");

assert.match(packageDescriptor, /if \(descriptor\.runtimeRequirement != null\) validateRuntimeRequirement/,
  "content-only Package Descriptors must retain the App-Runtime compatibility requirement path");
assert.match(packageDescriptor, /if \(descriptor\.runtimeRequirement == null\) throw new Error\("package descriptor has no runtime requirement"\)/,
  "Package Descriptor must allow App-owned Runtime mode without re-bundling executable Runtime objects");

assert.match(shell, /options\.netplayDifficulty[\s\S]*options\.netplayDifficulty > 4/,
  "TH06 shell must reject out-of-range TH07-only difficulties");
assert.match(shell, /entry\.character > 1/,
  "TH06 shell must reject TH07-only characters even if Launcher validation is bypassed");
assert.match(shell, /netplayMode: options\.netplayMode \|\| null/,
  "TH06 shell must install the same explicit LAN mode contract as TH07");

console.log("TH06 Launcher netplay contract: PASS");
