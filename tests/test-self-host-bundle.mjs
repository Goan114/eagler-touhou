import assert from "node:assert/strict";
import { cp, mkdtemp, mkdir, readFile, rm, stat } from "node:fs/promises";
import { posix, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  SELF_HOST_BUNDLE_COPY_RULES,
  SELF_HOST_BUNDLE_NODE_DEPENDENCIES,
} from "../lib/self-host-bundle.mjs";
import { FRONTEND_PACKAGE_FILES, resolveFrontendPackageSource } from "../lib/frontend-manifest.mjs";

const project = resolve(fileURLToPath(new URL("..", import.meta.url)));
const targets = new Map(SELF_HOST_BUNDLE_COPY_RULES.map(rule => [rule.target, rule.source]));
assert.equal(targets.size, SELF_HOST_BUNDLE_COPY_RULES.length, "self-host bundle targets must be unique");

for (const rule of SELF_HOST_BUNDLE_COPY_RULES) {
  assert.match(rule.source, /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$)).+$/, `unsafe self-host bundle source: ${rule.source}`);
  assert.match(rule.target, /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$)).+$/, `unsafe self-host bundle target: ${rule.target}`);
  const info = await stat(resolve(project, rule.source));
  assert.equal(info.isFile(), true, `self-host bundle source is not a file: ${rule.source}`);
}

for (const file of FRONTEND_PACKAGE_FILES) {
  const source = relative(project, resolveFrontendPackageSource(file)).replaceAll("\\", "/");
  assert.equal(targets.get(file), source, `frontend publication input is missing from self-host bundle: ${file}`);
}
for (const file of ["index.html", "app.js", "styles.css", "assets/notice-github.svg", "vendor/fflate.min.js"]) {
  assert.equal(targets.get(file), `public/${file}`,
    `authored browser source must be copied from public/ without changing its self-host target: ${file}`);
}
assert.ok([...targets.keys()].every(target => !target.startsWith("public/")),
  "the source-only public/ directory must not leak into self-host bundle targets");
for (const required of [
  "assets/launcher/remote-metadata.mjs",
  "host/build.mjs",
  "host/build-import.mjs",
  "host/lib/site-builder.mjs",
  "scripts/package-server.mjs",
  "scripts/verify-server-build.mjs",
  "scripts/prepare-th06-language-pack.mjs",
  "SELF-HOSTING.md",
  "SELF-HOSTING-REFERENCE.md",
  "package.json",
  "package-lock.json",
]) assert.ok(targets.has(required), `required self-host bundle file missing: ${required}`);

assert.ok(!SELF_HOST_BUNDLE_NODE_DEPENDENCIES.includes("typescript"), "self-host bundle must consume compiled Launcher output, not TypeScript");
assert.deepEqual(
  [...targets.keys()].filter(target => target.startsWith("src/")),
  ["src/app-shell-sw.js"],
  "self-host bundle may ship only the App Shell JavaScript build input from src/",
);
assert.ok([...targets.keys()].every(target => !/\.mts$/i.test(target)),
  "self-host bundle must not ship maintainer TypeScript source");
assert.ok([...targets.keys()].every(target => !/\.ps1$/i.test(target)),
  "self-host bundle must not require PowerShell or ship maintainer PowerShell entrypoints");
assert.ok([...targets.keys()].every(target => !target.startsWith("tools/maintainer/")),
  "self-host bundle must not ship maintainer tooling");

for (const target of targets.keys()) {
  assert.doesNotMatch(target, /(?:^|\/)(?:test[-_.]|run-|audit-|profile-|browserstack|playwright|webkit)/i,
    `maintainer/test file leaked into self-host bundle: ${target}`);
  assert.notEqual(target, "server/netplay-relay.mjs", "relay server must not be bundled into the static self-host bundle");
}

// Exercise the actual packaged boundary, not only the source-checkout
// manifest. This fixture is assembled from the production copy rules and keeps
// src/app-shell-sw.js while omitting all TypeScript sources and node_modules.
// Before the source-set check in launcher-build.mjs, importing the copied
// launcher-build module incorrectly treated this as a source checkout and
// failed with "Application TypeScript source tree is empty".
const smokeRoot = await mkdtemp(resolve(project, ".cache", "self-host-bundle-smoke-"));
try {
  for (const rule of SELF_HOST_BUNDLE_COPY_RULES) {
    const source = resolve(project, rule.source);
    const target = resolve(smokeRoot, rule.target);
    await mkdir(resolve(target, ".."), { recursive: true });
    await cp(source, target);
  }
  const packagedLauncher = await import(pathToFileURL(resolve(smokeRoot, "lib/launcher-build.mjs")).href);
  const packagedResult = await packagedLauncher.ensureLauncherBuild({ force: true });
  assert.deepEqual(packagedResult, { built: false, mode: "prebuilt", sourceCount: 0 });
  assert.equal(
    packagedLauncher.resolveBrowserPublicationSource("assets/contracts/product-catalog.mjs"),
    resolve(smokeRoot, "assets/contracts/product-catalog.mjs"),
    "self-host bundle must resolve compiled browser modules from packaged assets",
  );
  assert.equal(
    packagedLauncher.resolveBrowserPublicationSource("product-catalog.mjs"),
    resolve(smokeRoot, "product-catalog.mjs"),
    "self-host bundle must resolve browser facades from packaged root files",
  );
  const packagedManifest = await import(pathToFileURL(resolve(smokeRoot, "lib/frontend-manifest.mjs")).href);
  assert.ok(packagedManifest.BROWSER_MODULE_FILES.includes("assets/launcher/app.mjs"));
} finally {
  await rm(smokeRoot, { recursive: true, force: true });
}

const allowedBareImports = new Set(SELF_HOST_BUNDLE_NODE_DEPENDENCIES);
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
      assert.ok(allowedBareImports.has(packageName), `${target}: undeclared self-host npm dependency ${packageName}`);
      continue;
    }
    const resolvedTarget = posix.normalize(posix.join(posix.dirname(target), specifier));
    assert.ok(targets.has(resolvedTarget), `${target}: relative import escapes self-host bundle manifest: ${specifier}`);
  }
}

const packageTemplate = JSON.parse(await readFile(resolve(project, "host/bundle/package.json"), "utf8"));
assert.deepEqual(Object.keys(packageTemplate.dependencies).sort(), [...SELF_HOST_BUNDLE_NODE_DEPENDENCIES].sort());
assert.equal(packageTemplate.devDependencies, undefined);
assert.deepEqual(Object.keys(packageTemplate.scripts).sort(), ["host", "host:build", "host:doctor", "host:inspect", "import"]);
assert.ok(Object.values(packageTemplate.scripts).every(command => !/pwsh|powershell/i.test(command)),
  "self-host npm commands must not require PowerShell");

console.log(JSON.stringify({
  selfHostBundle: "PASS",
  files: SELF_HOST_BUNDLE_COPY_RULES.length,
  nodeDependencies: SELF_HOST_BUNDLE_NODE_DEPENDENCIES,
}));
