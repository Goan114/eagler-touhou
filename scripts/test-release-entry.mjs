// L3/module + entry safety. Preconditions: temporary local paths only.
// Mutation: invoke the release owner with invalid input and an existing
// destination. Proves formal-release planning and output ownership. It does
// NOT build a host, validate Runtime semantics, or publish anything.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PRODUCT_GAMES } from "../product-catalog.mjs";
import { formalReleaseSourceOwners, normalizeFormalReleaseInput } from "../lib/release-plan.mjs";

const workspace = "C:/workspace";
const inputDirectory = "C:/release-input";
const validInput = {
  schema: "eagler-touhou/release-input/1",
  prepare: {
    RuntimeRelease: "runtime-release",
    FeatureConfig: "features.json",
    Th06Directory: "original/th06",
    Th07Directory: "original/th07",
    Th08Directory: "original/th08",
    Music: ["midi"],
  },
};
const plan = normalizeFormalReleaseInput(validInput, { inputDirectory, workspace, windir: "C:/Windows" });
assert.deepEqual(plan.games, Object.keys(PRODUCT_GAMES));
assert.equal(plan.prepare.Profile, "web-release-hosted");
assert.deepEqual(plan.prepare.Games, Object.keys(PRODUCT_GAMES));
assert.equal(plan.prepare.RuntimeRelease, "C:\\release-input\\runtime-release");
assert.deepEqual(formalReleaseSourceOwners(), ["launcher"]);

assert.throws(() => normalizeFormalReleaseInput({ ...validInput, prepare: { ...validInput.prepare, RuntimeRelease: "" } }, {
  inputDirectory, workspace,
}), /requires prepare\.RuntimeRelease/);
assert.throws(() => normalizeFormalReleaseInput({ ...validInput, games: ["th07"] }, {
  inputDirectory, workspace,
}), /must contain every registered product/);
assert.throws(() => normalizeFormalReleaseInput({ ...validInput, prepare: { ...validInput.prepare, Th08Build: "build" } }, {
  inputDirectory, workspace,
}), /belongs to maintainer Runtime compilation/);

const root = await mkdtemp(join(tmpdir(), "eagler-release-entry-"));
const input = join(root, "input.json");
const output = join(root, "candidate");
await writeFile(input, JSON.stringify({ schema: "eagler-touhou/release-input/1", prepare: {} }));
const runRelease = () => spawnSync(process.execPath, [
  "scripts/release.mjs",
  `--input=${input}`,
  `--output=${output}`,
], { encoding: "utf8" });
let result = runRelease();
assert.notEqual(result.status, 0);
assert.deepEqual(await readdir(root), ["input.json"]);

await mkdir(output);
const marker = join(output, "owner.txt");
await writeFile(marker, "existing owner");
result = runRelease();
assert.notEqual(result.status, 0);
assert.equal(await readFile(marker, "utf8"), "existing owner");
console.log("Release entry output ownership: PASS");
