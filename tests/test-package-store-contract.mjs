import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { generationKey } from "../package/package-store.mjs";

assert.throws(() => generationKey("th99", "generation-1"), /game id/,
  "Package Store must share Product Catalog game identity");

const source = await readFile(new URL("../package/package-store.mjs", import.meta.url), "utf8");
assert.match(source, /db\.transaction\(\[PACKAGE_INSTALLATIONS, PACKAGE_GENERATIONS\], "readwrite"\)/,
  "current/pending generation commit must remain one IndexedDB transaction; crash atomicity is a structural contract");
assert.match(source, /currentGeneration: generationId,[\s\S]*pendingGeneration: null/,
  "the same commit transaction must advance current and clear pending");

console.log("Package Store crash-atomic commit structure: PASS");
