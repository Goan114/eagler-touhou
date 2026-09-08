import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const project = resolve(fileURLToPath(new URL("..", import.meta.url)));
const explicitRemoteEntrypoints = [
  "tools/maintainer/verify-public-relay-fallback.mjs",
  "tools/maintainer/verify-public-targeted-relay.mjs",
  "tools/maintainer/verify-public-turn-quality.py",
];

for (const file of explicitRemoteEntrypoints) {
  const source = await readFile(resolve(project, file), "utf8");
  assert.doesNotMatch(source, /(?:test\.)?touhou\.vip/i,
    `${file}: remote/ops entrypoints must require an explicit target instead of embedding project infrastructure`);
}

console.log(JSON.stringify({ remoteTargetPolicy: "PASS", explicitEntrypoints: explicitRemoteEntrypoints.length }));
