import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inspectQuickHost, quickHostPaths } from "../lib/quick-host-layout.mjs";
import { writeSyntheticRuntimeRelease } from "../tests/support/runtime-release-fixture.mjs";

const root = await mkdtemp(join(tmpdir(), "eagler-quick-host-"));
const layout = quickHostPaths(root);
assert.equal(layout.config, join(root, "eagler-touhou.config.json"));
assert.equal(layout.runtimeRelease, join(root, "runtime-release"));
assert.equal(layout.games.th06, join(root, "games", "th06"));
assert.equal(layout.site, join(root, "dist", "site"));
assert.equal(layout.importSite, join(root, "dist", "import-site"));
assert.equal(layout.importPackages, join(root, "dist", "import"));
await writeSyntheticRuntimeRelease(layout.runtimeRelease);
for (const game of ["th06", "th07", "th08"]) await mkdir(layout.games[game], { recursive: true });
const put = async path => { await mkdir(join(path, ".."), { recursive: true }); await writeFile(path, Buffer.from([1])); };
for (const name of ["紅魔郷CM.DAT", "紅魔郷ED.DAT", "紅魔郷IN.DAT", "紅魔郷MD.DAT", "紅魔郷ST.DAT", "紅魔郷TL.DAT"]) {
  await put(join(layout.games.th06, name));
}
await put(join(layout.games.th07, "th07.dat"));
await put(join(layout.games.th08, "th08.dat"));

const midiOnly = await inspectQuickHost(root, { music: "midi" });
assert.deepEqual(midiOnly.music, ["midi"]);
await assert.rejects(() => inspectQuickHost(root), /TH06 BGM th06_01\.wav not found/);

for (let index = 1; index <= 17; index++) {
  await put(join(layout.games.th06, "bgm", `th06_${String(index).padStart(2, "0")}.wav`));
}
await put(join(layout.games.th07, "thbgm.dat"));
await put(join(layout.games.th08, "thbgm.dat"));
const full = await inspectQuickHost(root);
assert.deepEqual(full.music, ["midi", "ogg"]);
assert.equal(full.runtimeReleaseSchema, "eagler-touhou/runtime-release/1");
assert.equal(full.games.th08, layout.games.th08);
assert.equal(full.hostConfig.present, false);
assert.equal(full.warnings.length, 2);
await writeFile(layout.config, JSON.stringify({
  schema: "eagler-touhou/host-config/1",
  netplay: { relay: "wss://relay.example.com/eagler-netplay/" },
  externalImportSource: { url: "https://downloads.example.com/packages", hint: "test" },
}));
const configured = await inspectQuickHost(root);
assert.equal(configured.hostConfig.present, true);
assert.equal(configured.hostConfig.netplay.relay, "wss://relay.example.com/eagler-netplay/");
assert.equal(configured.warnings.length, 1, "configured WS/external source leaves only the unverified TURN warning");
console.log(JSON.stringify({ quickHost: "PASS", games: Object.keys(full.games), music: full.music }));

