import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access, cp, mkdir, mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

import { localModuleClosure } from "../lib/browser-module-graph.mjs";
import {
  LINUX_FIRST_INSTALL_BUNDLE_SCHEMA,
  LINUX_FIRST_INSTALL_COPY_RULES,
  LINUX_FIRST_INSTALL_NODE_DEPENDENCIES,
  LINUX_FIRST_INSTALL_RELAY_MODULES,
} from "../lib/linux-first-install-bundle.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const targets = new Map(LINUX_FIRST_INSTALL_COPY_RULES.map(rule => [rule.target, rule]));

assert.equal(LINUX_FIRST_INSTALL_BUNDLE_SCHEMA, "eagler-touhou/linux-first-install-bundle/1");
assert.deepEqual(LINUX_FIRST_INSTALL_NODE_DEPENDENCIES, ["ws"]);
assert.deepEqual([...targets.keys()].sort(), [
  "HOST-README.md",
  "config.env.example",
  "config.external-ws.example",
  "installer",
  "relay/assets/contracts/product-catalog.mjs",
  "relay/lib/contracts/load-compiled-contract.mjs",
  "relay/lib/contracts/product-catalog.mjs",
  "relay/node_modules/ws",
  "relay/server/netplay-relay.mjs",
  "relay/server/render-coturn-config.cjs",
].sort());

for (const rule of LINUX_FIRST_INSTALL_COPY_RULES) {
  assert.match(rule.source, /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$)).+$/, `unsafe first-install source: ${rule.source}`);
  assert.match(rule.target, /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$)).+$/, `unsafe first-install target: ${rule.target}`);
  assert.doesNotMatch(rule.source, /(?:^|\/)(?:th06-eagler|th07-eagler|th08-eaglertemp)(?:\/|$)/,
    `first-install bundle must not depend on a Runtime repository: ${rule.source}`);
  await access(resolve(root, rule.source));
  assert.equal((await stat(resolve(root, rule.source))).isDirectory(), rule.recursive,
    `${rule.source}: recursive copy flag must match source kind`);
}

// The relay's relative ESM closure is bundled from the Host repository. Bare
// npm imports are declared separately so the artifact has one explicit owner
// for both local modules and node_modules dependencies.
const relayClosure = await localModuleClosure({
  root,
  entries: ["server/netplay-relay.mjs"],
  allowBareImports: true,
  allowDynamicImports: true,
});
assert.deepEqual(LINUX_FIRST_INSTALL_RELAY_MODULES, relayClosure);
for (const module of relayClosure) {
  assert.ok(targets.has(`relay/${module}`), `relay local dependency is not bundled: ${module}`);
}
const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
for (const dependency of LINUX_FIRST_INSTALL_NODE_DEPENDENCIES) {
  assert.ok(packageJson.dependencies?.[dependency] || packageJson.devDependencies?.[dependency],
    `first-install node dependency is undeclared: ${dependency}`);
  assert.ok(targets.has(`relay/node_modules/${dependency}`),
    `first-install node dependency is not copied into the relay artifact: ${dependency}`);
}

// These remaining source checks protect deployment-path ABI between the
// self-contained installer artifact and systemd. They deliberately do not
// inspect the PowerShell builder's copy implementation.
const bootstrap = await readFile(resolve(root, "deploy/linux-first-install/bootstrap-host.sh"), "utf8");
const service = await readFile(resolve(root, "deploy/linux-first-install/eagler-netplay.service"), "utf8");
const builder = await readFile(resolve(root, "deploy/Build-LinuxFirstInstallBundle.ps1"), "utf8");
assert.match(builder, /resolve-linux-first-install-bundle\.mjs/,
  "first-install builder must consume the bundle manifest owner");
assert.doesNotMatch(builder, /Join-Path \$project '(?:product-catalog\.mjs|server\\netplay-relay\.mjs|node_modules\\ws)'/,
  "first-install builder must not duplicate manifest-owned relay copy policy");
assert.match(bootstrap, /cp -a -- "\$SCRIPT_DIR\/\.\.\/relay\/\." "\$app_stage\/"/,
  "installer must copy the complete manifest-owned relay tree without flattening its ESM layout");
assert.match(bootstrap, /--check "\$app_stage\/server\/netplay-relay\.mjs"/,
  "installer must syntax-check the staged relay before replacing the installed application");
assert.match(bootstrap, /import\(\"\.\/lib\/contracts\/product-catalog\.mjs\"\); await import\(\"ws\"\)/,
  "installer must resolve the staged relay's local and npm dependencies before promotion");
assert.match(bootstrap, /mv -- "\$app_stage" \/opt\/eagler-netplay\/app/,
  "installer must promote the verified relay tree as one unit");
assert.match(service, /ExecStart=\/opt\/eagler-netplay\/runtime\/node\/bin\/node \/opt\/eagler-netplay\/app\/server\/netplay-relay\.mjs/,
  "systemd must start the relay from the installed artifact path");

const staged = await mkdtemp(resolve(tmpdir(), "eagler-first-install-relay-"));
try {
  for (const rule of LINUX_FIRST_INSTALL_COPY_RULES.filter(rule => rule.target.startsWith("relay/"))) {
    const target = resolve(staged, rule.target);
    await mkdir(dirname(target), { recursive: true });
    await cp(resolve(root, rule.source), target, { recursive: rule.recursive, force: true });
  }
  const relay = spawn(process.execPath, [resolve(staged, "relay/server/netplay-relay.mjs")], {
    cwd: resolve(staged, "relay"),
    env: { ...process.env, TH07_RELAY_HOST: "127.0.0.1", TH07_RELAY_PORT: "0" },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  let stderr = "";
  relay.stderr.setEncoding("utf8");
  relay.stderr.on("data", chunk => { stderr += chunk; });
  await new Promise((resolvePromise, reject) => {
    const timeout = setTimeout(() => reject(new Error(`staged relay did not start: ${stderr}`)), 5000);
    relay.once("error", reject);
    relay.once("exit", code => reject(new Error(`staged relay exited before listening (${code}): ${stderr}`)));
    relay.stdout.setEncoding("utf8");
    relay.stdout.on("data", chunk => {
      if (!String(chunk).includes("listening")) return;
      clearTimeout(timeout);
      resolvePromise();
    });
  });
  relay.kill();
  await new Promise(resolvePromise => relay.once("exit", resolvePromise));
} finally {
  await rm(staged, { recursive: true, force: true });
}

console.log(JSON.stringify({
  linuxFirstInstallRelayOwnership: "PASS",
  schema: LINUX_FIRST_INSTALL_BUNDLE_SCHEMA,
  copyRules: LINUX_FIRST_INSTALL_COPY_RULES.length,
  source: "server/netplay-relay.mjs",
  runtimeRepoDependency: false,
}));
