#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildAppShell } from "../lib/app-shell-build.mjs";
import { deploymentAppShellPatterns, runtimeAppShellPaths } from "../lib/app-shell-policy.mjs";
import { hostArtworkFiles } from "../lib/frontend-manifest.mjs";
import { HOST_MANIFEST_FILE, validateHostManifest } from "../host-manifest.mjs";
import { sourceIdentity, writeReleaseManifest } from "../lib/release-manifest.mjs";
import { WORKSPACE_REPOSITORIES } from "../lib/workspace-layout.mjs";

const project = resolve(fileURLToPath(new URL("..", import.meta.url)));
const root = resolve(process.argv[2] || "");
if (!process.argv[2]) throw new Error("usage: node scripts/refresh-deployment-app-shell.mjs <deployment-root>");

const appRoot = resolve(root, "eagler-touhou");
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
if (!legacy.games || typeof legacy.games !== "object") throw new Error("invalid legacy game catalog");

const runtimePaths = runtimeAppShellPaths(hostManifest);
const inventoryPaths = new Set(deployment.files.map(item => item.path));
const availableHostArtwork = hostArtworkFiles(Object.keys(hostManifest.games)).filter(name =>
  inventoryPaths.has(`eagler-touhou/assets/${name}`));

const temporary = `${swPath}.next-${process.pid}`;
try {
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
  const inventoryEntry = deployment.files.find(item => item.path === "eagler-touhou/app-shell-sw.js");
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
    buildId: result.buildId,
    precache: result.count,
    runtimeFiles: runtimePaths.length,
    appShellWorker: identity,
  }));
} finally {
  await rm(temporary, { force: true });
}
