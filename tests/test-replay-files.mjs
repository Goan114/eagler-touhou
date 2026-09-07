import assert from "node:assert/strict";
import {
  allocateReplayName,
  isReplayFilePath,
  isReplayImportFileName,
  isReplayTargetAvailable,
  isSafeReplayArchivePath,
  isValidReplayName,
  planReplayArchiveImport,
  replayImportAccept,
  selectReplayExportPaths,
} from "../.cache/build/browser/assets/launcher/replay-files.mjs";

assert.equal(replayImportAccept, ".zip,.rpy,.rpyx");
assert.equal(isReplayFilePath("replay/th6_01.rpy"), true);
assert.equal(isReplayFilePath("replay/th7_ud00af.rpyx"), true);
assert.equal(isReplayFilePath("replay/th6_01.rpy.thprac.json"), false);
assert.equal(isReplayFilePath("other/th6_01.rpy"), false);

assert.deepEqual(selectReplayExportPaths([
  "replay/orphan.rpy.thprac.json",
  "replay/th6_01.rpy.thprac.json",
  "replay/th6_01.rpy",
  "replay/th6_02.rpyx",
  "replay/notes.txt",
]), [
  "replay/th6_01.rpy",
  "replay/th6_02.rpyx",
], "Replay export must include only actual replay files");

for (const safe of ["replay/th6_01.rpy", "nested/th6_01.rpy", "notes.txt"]) {
  assert.equal(isSafeReplayArchivePath(safe), true, safe);
}
for (const unsafe of ["", "/absolute.rpy", "../escape.rpy", "a/../b.rpy", "a\\b.rpy", "a//b.rpy"]) {
  assert.equal(isSafeReplayArchivePath(unsafe), false, unsafe);
}

assert.equal(isValidReplayName("th6", "th6_01.rpy"), true);
assert.equal(isValidReplayName("th6", "TH6_ud00AF.RPYX"), true);
assert.equal(isValidReplayName("th6", "th6_ud10000.rpy"), false);
assert.equal(isValidReplayName("th6", "other_01.rpy"), false);
assert.equal(isReplayImportFileName("run.RPYX"), true);
assert.equal(isReplayImportFileName("backup.zip"), true);
assert.equal(isReplayImportFileName("score.dat"), false);

const occupied = [
  "replay/th6_01.rpy",
  "replay/th6_ud0000.rpy.thprac.json",
];
assert.equal(isReplayTargetAvailable(occupied, "replay/th6_ud0000.rpy"), true,
  "unsupported sidecar-like files must not reserve replay identities");
assert.equal(allocateReplayName("th6", occupied, "my replay.rpy"), "th6_ud0000.rpy");
assert.equal(allocateReplayName("th6", occupied, "my replay.rpyx"), "th6_ud0000.rpyx",
  "collision renaming must preserve ReplayX identity");
assert.equal(allocateReplayName("th6", occupied, "th6_02.rpyx"), "th6_02.rpyx");

const planned = planReplayArchiveImport("th6", [
  "backup/th6_01.rpy",
  "backup/th6_01.rpy.thprac.json",
  "backup/pretty name.rpyx",
  "backup/readme.txt",
], ["replay/th6_01.rpy"]);
assert.equal(planned.ok, true);
assert.deepEqual(planned.entries, [
  { sourcePath: "backup/pretty name.rpyx", targetPath: "replay/th6_ud0000.rpyx", kind: "replay" },
  { sourcePath: "backup/th6_01.rpy", targetPath: "replay/th6_ud0000.rpy", kind: "replay" },
]);
assert.deepEqual(planReplayArchiveImport("th6", ["../bad.rpy"], []), { ok: false, reason: "unsafe-path" });
assert.deepEqual(planReplayArchiveImport("th6", ["a/th6_01.rpy", "A/TH6_01.RPY"], []),
  { ok: false, reason: "duplicate-path" });

console.log(JSON.stringify({
  replayFiles: "PASS",
  imports: ["rpy", "rpyx", "zip"],
  replayMetadata: "embedded-prac-only",
  collision: "case-insensitive",
}));
