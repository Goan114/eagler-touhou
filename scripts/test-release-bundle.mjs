/** L2 artifact contract. Preconditions: isolated generated candidate tree.
 * Mutation: creates a temporary bundle. Proves required release owners and report schema.
 * Does NOT prove Runtime contents, browser behavior or publication. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { COMPLETION_FIELDS, COMPLETION_REPORT_SCHEMA } from "../lib/completion-report.mjs";
import { PRODUCT_GAMES } from "../product-catalog.mjs";
import { writeSyntheticRuntimeRelease } from "../tests/support/runtime-release-fixture.mjs";
import { writeReleaseManifest } from "../lib/release-manifest.mjs";
import { verifyReleaseBundle } from "./verify-release-bundle.mjs";

const root = await mkdtemp(join(tmpdir(), "eagler-release-bundle-"));
const games = Object.keys(PRODUCT_GAMES);
for (const directory of ["hosted-site", "import-site", "runtime-release", "game-package", "offline-zip"]) {
  await mkdir(join(root, directory));
}
await writeSyntheticRuntimeRelease(join(root, "runtime-release"));
for (const game of games) {
  await mkdir(join(root, "game-package", game));
  await writeFile(join(root, "game-package", game, "package.json"), "{}\n");
  await writeFile(join(root, "offline-zip", `${game}.zip`), game);
}
const completion = Object.fromEntries(COMPLETION_FIELDS.map(field => [field, "pending"]));
completion.IMPLEMENTED = "yes";
completion["BUILD-VERIFIED"] = "yes";
completion["STRUCTURE-VERIFIED"] = "yes";
completion.RELEASED = "no";
await writeFile(join(root, "verification-report.json"), JSON.stringify({ schema: COMPLETION_REPORT_SCHEMA, steps: [], completion }));
await writeFile(join(root, "input-manifest.json"), "{}\n");
async function inventory(directory, files = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await inventory(path, files);
    else {
      const bytes = await readFile(path);
      files.push({ path: relative(root, path).replaceAll("\\", "/"), bytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex") });
    }
  }
  return files;
}
await writeFile(join(root, "deployment.json"), JSON.stringify({ format: "eagler-touhou-release-bundle/2", games, files: await inventory(root) }));
await writeReleaseManifest(root, {
  profile: "test",
  sources: { fixture: { revision: "test", sha256: "a".repeat(64) } },
  parameters: { games },
});
const result = await verifyReleaseBundle(root);
assert.match(result.releaseId, /^sha256-[a-f0-9]{64}$/);
assert.deepEqual(result.games, games);
assert.equal(result.completion.RELEASED, "no");
console.log("Release bundle L2: PASS");
