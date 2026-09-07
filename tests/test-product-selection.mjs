import assert from "node:assert/strict";
import { PRODUCT_GAMES } from "../lib/contracts/product-catalog.mjs";
import { assertProductEntriesRegistered, normalizeProductSelection, selectProductEntries } from "../lib/product-selection.mjs";

assert.deepEqual(normalizeProductSelection(), Object.keys(PRODUCT_GAMES));
assert.deepEqual(normalizeProductSelection(["th07"]), ["th07"]);
assert.deepEqual(normalizeProductSelection("th08,th06"), ["th06", "th08"]);
for (const value of [[], ["th09"], ["th06", "th06"], "th09"]) {
  assert.throws(() => normalizeProductSelection(value), /non-empty unique subset/);
}
assert.deepEqual(selectProductEntries({ th06: 6, th07: 7, th08: 8 }, ["th07"]), { th07: 7 });
const registeredEntries = { th06: {}, th08: {} };
assert.equal(assertProductEntriesRegistered(registeredEntries), registeredEntries);
assert.throws(() => assertProductEntriesRegistered({ th06: {}, th09: {} }, "content catalog games"),
  /content catalog games do not match registered adapters: th09/);
console.log(JSON.stringify({ defaultGames: Object.keys(PRODUCT_GAMES), subset: true }));
