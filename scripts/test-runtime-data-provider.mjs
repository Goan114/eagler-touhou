/** L0 provider contract. Preconditions: registered product adapters only.
 * Mutations: synthetic Runtime shell markers. Proves provider-driven shell
 * and layout gates. Does not prove DATA transfer or Runtime execution. */
import assert from "node:assert/strict";
import { PRODUCT_GAMES } from "../product-catalog.mjs";
import { assertRuntimeDataShell, runtimeDataProvider } from "../lib/runtime-data-provider.mjs";

for (const [game, product] of Object.entries(PRODUCT_GAMES)) {
  const provider = runtimeDataProvider(game);
  assert.equal(provider.name, product.dataProvider);
  const complete = provider.shellMarkers.join("\n");
  assert.equal(assertRuntimeDataShell(complete, game, "fixture").name, provider.name);
  for (const marker of provider.shellMarkers) {
    const incomplete = provider.shellMarkers.filter(value => value !== marker).join("\n");
    assert.throws(() => assertRuntimeDataShell(incomplete, game, "fixture"), /provider markers are missing/);
  }
}

assert.throws(() => runtimeDataProvider("unknown"), /unknown Runtime DATA provider/);
console.log(`Runtime DATA provider L0: PASS (${Object.keys(PRODUCT_GAMES).length} adapters)`);
