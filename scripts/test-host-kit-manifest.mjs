import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  HOST_KIT_COPY_RULES,
  HOST_KIT_NODE_DEPENDENCIES,
} from "../lib/host-kit-manifest.mjs";
import { FRONTEND_PACKAGE_FILES } from "../lib/frontend-manifest.mjs";

const project = resolve(fileURLToPath(new URL("..", import.meta.url)));
const targets = new Map(HOST_KIT_COPY_RULES.map(rule => [rule.target, rule.source]));
assert.equal(targets.size, HOST_KIT_COPY_RULES.length, "Host Kit targets must be unique");
assert.equal(new Set(HOST_KIT_COPY_RULES.map(rule => rule.source)).size, HOST_KIT_COPY_RULES.length,
  "Host Kit sources must be unique");

for (const rule of HOST_KIT_COPY_RULES) {
  assert.match(rule.source, /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$)).+$/, `unsafe Host Kit source: ${rule.source}`);
  assert.match(rule.target, /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$)).+$/, `unsafe Host Kit target: ${rule.target}`);
  const info = await stat(resolve(project, rule.source));
  assert.equal(info.isFile(), true, `Host Kit source is not a file: ${rule.source}`);
}

for (const file of FRONTEND_PACKAGE_FILES) {
  assert.equal(targets.get(file), file, `frontend publication input is missing from Host Kit: ${file}`);
}
for (const required of [
  "deploy/Start-eagler-touhou-host.ps1",
  "deploy/Build-QuickImport.ps1",
  "scripts/package-server.mjs",
  "scripts/verify-server-build.mjs",
  "scripts/prepare-th06-language-pack.mjs",
  "HOST-README.md",
  "HOST-DEPLOYMENT.md",
  "package.json",
  "package-lock.json",
]) assert.ok(targets.has(required), `required Host Kit file missing: ${required}`);

for (const target of targets.keys()) {
  assert.doesNotMatch(target, /(?:^|\/)(?:test[-_.]|run-|audit-|profile-|browserstack|playwright|webkit)/i,
    `maintainer/test file leaked into Host Kit: ${target}`);
  assert.notEqual(target, "server/netplay-relay.cjs", "relay server must not be bundled into the static Host Kit");
  assert.notEqual(target, "deploy/Build-QuickHostKit.ps1", "Host Kit builder must not recursively ship itself");
}

const allowedBareImports = new Set(HOST_KIT_NODE_DEPENDENCIES);
const importPattern = /(?:\bfrom\s*|\bimport\s*\()(["'])([^"']+)\1/g;
for (const [target, source] of targets) {
  if (!/\.(?:m?js)$/.test(target)) continue;
  const text = await readFile(resolve(project, source), "utf8");
  let match;
  while ((match = importPattern.exec(text))) {
    const specifier = match[2];
    if (specifier.startsWith("node:")) continue;
    if (!specifier.startsWith(".")) {
      const packageName = specifier.startsWith("@")
        ? specifier.split("/").slice(0, 2).join("/")
        : specifier.split("/")[0];
      assert.ok(allowedBareImports.has(packageName), `${target}: undeclared Host npm dependency ${packageName}`);
      continue;
    }
    const resolvedTarget = posix.normalize(posix.join(posix.dirname(target), specifier));
    assert.ok(targets.has(resolvedTarget), `${target}: relative import escapes Host Kit manifest: ${specifier}`);
  }
}

const packageTemplate = JSON.parse(await readFile(resolve(project, "deploy/host-kit/package.json"), "utf8"));
assert.deepEqual(Object.keys(packageTemplate.dependencies).sort(), [...HOST_KIT_NODE_DEPENDENCIES].sort());
assert.equal(packageTemplate.devDependencies, undefined);
assert.deepEqual(Object.keys(packageTemplate.scripts).sort(), ["host", "host:build", "host:doctor", "host:inspect", "import"]);

console.log(JSON.stringify({
  hostKitManifest: "PASS",
  files: HOST_KIT_COPY_RULES.length,
  nodeDependencies: HOST_KIT_NODE_DEPENDENCIES,
}));

