// Evidence: L3/module. Preconditions: repository config only. Mutations: none.
// Proves: Runtime build variants resolve deterministic CMake cache arguments
// and agree with the product registry. Does NOT prove a compiler/toolchain build.
import assert from "node:assert/strict";
import { PRODUCT_GAMES } from "../lib/contracts/product-catalog.mjs";
import {
  loadRuntimeBuildConfig,
  resolveRuntimeBuild,
} from "../lib/runtime-build-profiles.mjs";

const config = await loadRuntimeBuildConfig();
assert.deepEqual(Object.keys(config.games).sort(), Object.keys(PRODUCT_GAMES).sort());

for (const game of ["th06", "th07"]) {
  const normal = await resolveRuntimeBuild({
    game,
    variant: "normal",
    thcrap: true,
    thprac: true,
    assetRoot: `C:/fixture/${game}`,
    runtimeExtension: "C:/fixture/thprac.cmake",
  });
  assert.equal(normal.features.thcrap, true);
  assert.equal(normal.features.thprac, true);
  assert.equal(normal.workspaceRepository, game);
  assert.equal(normal.sourceDirectory, `${game}-eagler`);
  assert(normal.cmakeArguments.includes("-DTH_ENABLE_NETPLAY=OFF"));
  assert(normal.cmakeArguments.includes("-DTH_ENABLE_MULTIPLAYER_GAMEPLAY=OFF"));
  assert(normal.cmakeArguments.includes(`-D${normal.assetRootVariable}=C:/fixture/${game}`));

  const multiplayer = await resolveRuntimeBuild({
    game,
    variant: "multiplayer",
    thcrap: false,
    thprac: false,
    assetRoot: `C:/fixture/${game}`,
    runtimeExtension: "",
  });
  assert.equal(multiplayer.features.thprac, false);
  assert(multiplayer.cmakeArguments.includes("-DTH_ENABLE_NETPLAY=ON"));
  assert(multiplayer.cmakeArguments.includes("-DTH_ENABLE_MULTIPLAYER_GAMEPLAY=ON"));
  assert(multiplayer.cmakeArguments.includes("-DTH_RUNTIME_EXTENSION_CMAKE="));
}

await assert.rejects(
  () => resolveRuntimeBuild({ game: "th06", variant: "multiplayer", thcrap: true, thprac: true }),
  /fixed to false/,
);
await assert.rejects(
  () => resolveRuntimeBuild({ game: "th08", variant: "normal" }),
  /prebuilt, not a CMake build/,
);

console.log(JSON.stringify({ schema: config.schema, games: Object.keys(config.games), variants: "validated" }));
