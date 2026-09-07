#!/usr/bin/env node
import { createHash, randomUUID } from "node:crypto";
import { copyFile, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildAppShell } from "../lib/app-shell-build.mjs";
import { deploymentAppShellPatterns, runtimeAppShellPaths } from "../lib/app-shell-policy.mjs";
import { FRONTEND_PACKAGE_FILES, hostArtworkFiles, resolveFrontendPackageSource } from "../lib/frontend-manifest.mjs";
import { ensureLauncherBuild } from "../lib/launcher-build.mjs";
import { HOST_MANIFEST_FILE, validateHostManifest } from "../lib/contracts/host-manifest.mjs";
import { sourceIdentity, writeReleaseManifest } from "../lib/release-manifest.mjs";
import { WORKSPACE_REPOSITORIES } from "../lib/workspace-layout.mjs";

const project = resolve(fileURLToPath(new URL("..", import.meta.url)));
const values = process.argv.slice(2);
const refreshFrontend = values.includes("--frontend");
const rootValue = values.find(value => !value.startsWith("--"));
if (!rootValue || values.some(value => value !== rootValue && value !== "--frontend")) {
  throw new Error("usage: node scripts/refresh-deployment-app-shell.mjs <deployment-root> [--frontend]");
}
const root = resolve(rootValue);

const appRoot = root;
const swPath = resolve(appRoot, "app-shell-sw.js");
const deploymentPath = resolve(root, "deployment.json");
const hostManifestPath = resolve(appRoot, HOST_MANIFEST_FILE);
const [deployment, hostManifest] = await Promise.all([
  readFile(deploymentPath, "utf8").then(JSON.parse),
  readFile(hostManifestPath, "utf8").then(JSON.parse).then(validateHostManifest),
]);
if (deployment.format !== "eagler-touhou-deployment/1" || !Array.isArray(deployment.files)) {
  throw new Error("invalid deployment manifest");
}

const runtimePaths = runtimeAppShellPaths(hostManifest);
const inventoryPaths = new Set(deployment.files.map(item => item.path));
const availableHostArtwork = hostArtworkFiles(Object.keys(hostManifest.games)).filter(name =>
  inventoryPaths.has(`assets/${name}`));

const temporaryRoot = resolve(dirname(swPath), ".tmp");
await mkdir(temporaryRoot, { recursive: true });
const temporary = resolve(temporaryRoot, `app-shell-sw-${process.pid}-${randomUUID()}.js`);
try {
  if (refreshFrontend) {
    await ensureLauncherBuild();
    const inventory = new Map(deployment.files.map(item => [item.path, item]));
    for (const path of FRONTEND_PACKAGE_FILES) {
      const target = resolve(appRoot, path);
      await mkdir(dirname(target), { recursive: true });
      await copyFile(resolveFrontendPackageSource(path), target);
      const bytes = await readFile(target);
      const identity = { path, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
      const current = inventory.get(path);
      if (current) Object.assign(current, identity);
      else {
        deployment.files.push(identity);
        inventory.set(path, identity);
      }
    }
    deployment.files.sort((left, right) => left.path.localeCompare(right.path, "en"));
  }
  const result = await buildAppShell({
    quiet: true,
    globDirectory: appRoot,
    swDest: temporary,
    additionalGlobPatterns: deploymentAppShellPatterns({
      games: Object.keys(hostManifest.games),
      hostArtwork: availableHostArtwork,
    }),
  });
  const nextPrecache = new Set(result.contract.entries);
  for (const path of runtimePaths) if (!nextPrecache.has(path)) throw new Error(`refreshed App Shell omitted Runtime: ${path}`);
  await rename(temporary, swPath);

  const bytes = await readFile(swPath);
  const identity = {
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
  const inventoryEntry = deployment.files.find(item => item.path === "app-shell-sw.js");
  if (!inventoryEntry) throw new Error("deployment inventory does not own app-shell-sw.js");
  Object.assign(inventoryEntry, identity);
  deployment.generatedAt = new Date().toISOString();
  deployment.appShell = result.contract;
  await writeFile(deploymentPath, `${JSON.stringify(deployment, null, 2)}\n`);

  if (deployment.releaseManifest === "release-manifest.json") {
    const previous = JSON.parse(await readFile(resolve(root, "release-manifest.json"), "utf8"));
    let launcherSource;
    try {
      launcherSource = await sourceIdentity(project);
    } catch {
      const provenance = JSON.parse(await readFile(resolve(project, "host-kit-provenance.json"), "utf8"));
      if (provenance.schema !== "eagler-touhou/host-kit-provenance/1" ||
          provenance.launcherRepository !== WORKSPACE_REPOSITORIES.launcher ||
          !provenance.launcherSource || typeof provenance.launcherSource !== "object") {
        throw new Error("cannot identify Launcher source for refreshed release provenance");
      }
      launcherSource = provenance.launcherSource;
    }
    await writeReleaseManifest(root, {
      profile: previous.profile,
      sources: { ...previous.sources, [WORKSPACE_REPOSITORIES.launcher]: launcherSource },
      parameters: previous.parameters || {},
    });
  }

  console.log(JSON.stringify({
    refreshed: true,
    frontend: refreshFrontend,
    buildId: result.buildId,
    precache: result.count,
    runtimeFiles: runtimePaths.length,
    appShellWorker: identity,
  }));
} finally {
  await rm(temporary, { force: true });
}
