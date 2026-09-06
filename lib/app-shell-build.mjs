import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getManifest, injectManifest } from "workbox-build";
import { APP_SHELL_FILES } from "./frontend-manifest.mjs";
import { APP_SHELL_SOURCE_FILE, createAppShellContract } from "./app-shell-policy.mjs";

const project = resolve(fileURLToPath(new URL("..", import.meta.url)));
const defaultSourcePath = resolve(project, APP_SHELL_SOURCE_FILE);

function buildHash(entries, source) {
  const hash = createHash("sha256");
  hash.update(source);
  for (const entry of [...entries].sort((left, right) => left.url.localeCompare(right.url))) {
    hash.update("\0");
    hash.update(entry.url);
    hash.update("\0");
    hash.update(entry.revision || "");
  }
  return hash.digest("hex").slice(0, 20);
}

export async function buildAppShell({
  quiet = false,
  globDirectory = project,
  swDest = null,
  sourcePath = defaultSourcePath,
  additionalGlobPatterns = [],
} = {}) {
  const manifestConfig = {
    globDirectory,
    globPatterns: [...APP_SHELL_FILES, ...additionalGlobPatterns],
    maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
  };
  const source = await readFile(sourcePath, "utf8");
  if (!source.includes("__APP_SHELL_BUILD_ID__") || !source.includes("self.__WB_MANIFEST")) {
    throw new Error("App Shell Service Worker source is missing Workbox build placeholders");
  }

  const firstPass = await getManifest(manifestConfig);
  const indexEntry = firstPass.manifestEntries.find(entry => entry.url === "index.html");
  if (!indexEntry?.revision) throw new Error("Workbox App Shell manifest is missing index.html");
  const navigationEntry = { url: "./", revision: indexEntry.revision };
  const manifestEntries = [...firstPass.manifestEntries, navigationEntry];
  const buildId = buildHash(manifestEntries, source);

  const temp = await mkdtemp(join(tmpdir(), "eagler-touhou-app-shell-"));
  const temporarySource = resolve(temp, "sw-src.js");
  const temporaryDestination = resolve(temp, "sw.js");
  try {
    await writeFile(temporarySource, source.replaceAll("__APP_SHELL_BUILD_ID__", buildId), "utf8");
    const injected = await injectManifest({
      ...manifestConfig,
      additionalManifestEntries: [navigationEntry],
      swSrc: temporarySource,
      swDest: temporaryDestination,
      injectionPoint: "self.__WB_MANIFEST",
    });
    const worker = await readFile(temporaryDestination);
    if (swDest) {
      await mkdir(dirname(swDest), { recursive: true });
      await writeFile(swDest, worker);
    }
    const warnings = [...firstPass.warnings, ...injected.warnings];
    if (warnings.length && !quiet) warnings.forEach(warning => console.warn(`Workbox: ${warning}`));
    if (!quiet) console.log(`App Shell Workbox: ${buildId} - ${injected.count} files - ${injected.size} bytes`);
    return Object.freeze({
      buildId,
      count: injected.count,
      size: injected.size,
      warnings: Object.freeze(warnings),
      worker,
      manifestEntries: Object.freeze(manifestEntries.map(entry => Object.freeze({ ...entry }))),
      contract: createAppShellContract({ buildId, manifestEntries }),
    });
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}
