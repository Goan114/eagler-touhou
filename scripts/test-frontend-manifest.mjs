/** L0 artifact/source ownership contract. Mutation: none. Proves packaged
 * frontend/App Shell files have one owner and original-game-derived host art
 * is not part of repository-owned frontend assets. Does NOT prove rendering. */
import assert from "node:assert/strict";
import { APP_SHELL_FILES, FRONTEND_PACKAGE_FILES, hostArtworkFiles } from "../lib/frontend-manifest.mjs";

assert.ok(FRONTEND_PACKAGE_FILES.includes("index.html"));
assert.ok(FRONTEND_PACKAGE_FILES.includes("vendor/fflate.LICENSE"));
assert.ok(APP_SHELL_FILES.includes("vendor/fflate.min.js"));
assert.ok(!APP_SHELL_FILES.includes("vendor/fflate.LICENSE"));
assert.ok(APP_SHELL_FILES.every(path => FRONTEND_PACKAGE_FILES.includes(path)));
assert.ok(!FRONTEND_PACKAGE_FILES.includes("app-shell-sw.js"));
assert.ok(FRONTEND_PACKAGE_FILES.every(path => !/title00\.(?:jpg|png)$/i.test(path)));
assert.ok(FRONTEND_PACKAGE_FILES.every(path => !/(?:^|\/)th0[678]-card\.webp$/i.test(path)));
assert.deepEqual(hostArtworkFiles(["th06", "th07", "th08"]), [
  "th06-card.webp", "th06.ico", "th07-card.webp", "th08-card.webp",
]);
console.log(JSON.stringify({ frontendManifest: "PASS", packaged: FRONTEND_PACKAGE_FILES.length, appShell: APP_SHELL_FILES.length }));
