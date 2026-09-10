#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeProductSelection } from "../lib/product-selection.mjs";
import { validateHostManifest } from "../lib/contracts/host-manifest.mjs";
import { run } from "../host/lib/process.mjs";

const project = resolve(fileURLToPath(new URL("..", import.meta.url)));
const args = Object.fromEntries(process.argv.slice(2).map(value => {
  const split = value.indexOf("=");
  if (!value.startsWith("--") || split < 3) throw new Error(`invalid argument: ${value}`);
  return [value.slice(2, split), value.slice(split + 1)];
}));
const required = name => {
  if (!args[name]) throw new Error(`missing --${name}=PATH`);
  return resolve(args[name]);
};

const source = required("source");
const output = required("output");
const runtimeRelease = required("runtime-release");
const profile = String(args.profile || "");
if (!/^web-(?:validation|release)-/.test(profile)) throw new Error("external packaging requires an explicit web-validation-* or web-release-* --profile=NAME");
if (source === output) throw new Error("external output must differ from its hosted source");
if (args["test-build"] !== undefined && !["0", "1"].includes(args["test-build"])) throw new Error("--test-build must be 0 or 1");

await run(process.execPath, [resolve(project, "scripts/verify-server-build.mjs"), source], { cwd: project });
const sourceDeployment = JSON.parse(await readFile(resolve(source, "deployment.json"), "utf8"));
if (sourceDeployment.resourceMode !== "hosted") throw new Error("external source must be a verified hosted deployment");
const sourceManifest = validateHostManifest(JSON.parse(await readFile(resolve(source, "host-manifest.json"), "utf8")));
const games = normalizeProductSelection(args.games || sourceDeployment.games?.join(","));
if (games.some(game => !sourceManifest.games[game])) throw new Error("external selection is missing from the hosted source");
const runtimeManifest = JSON.parse(await readFile(resolve(runtimeRelease, "runtime-release.json"), "utf8"));
for (const game of games) {
  if (runtimeManifest.games?.[game]?.dataLayout !== sourceManifest.games[game].gameData.layout) {
    throw new Error(`${game}: Runtime Release data layout does not match the hosted Package source`);
  }
}

const featureConfig = resolve(tmpdir(), `eagler-touhou-external-features-${randomUUID()}.json`);
try {
  await writeFile(featureConfig, `${JSON.stringify({
    schema: "eagler-touhou/server-features/1",
    resourceMode: "external",
    games: Object.fromEntries(games.map(game => [game, {
      languages: (sourceManifest.games[game].languageOptions || []).map(language => language.id).filter(Boolean),
      thprac: !!sourceManifest.games[game].features?.thprac,
    }])),
    ...(sourceManifest.shared.netplayRelay ? { netplayRelay: sourceManifest.shared.netplayRelay } : {}),
    ...(sourceManifest.shared.originMigration ? { originMigration: sourceManifest.shared.originMigration } : {}),
  }, null, 2)}\n`);
  await run(process.execPath, [
    resolve(project, "scripts/package-server.mjs"),
    `--output=${output}`,
    `--runtime-release=${runtimeRelease}`,
    `--host-manifest=${resolve(source, "host-manifest.json")}`,
    `--artwork-dir=${resolve(source, "assets")}`,
    `--feature-config=${featureConfig}`,
    `--games=${games.join(",")}`,
    `--profile=${profile}`,
    `--test-build=${args["test-build"] || "0"}`,
  ], { cwd: project });
  await run(process.execPath, [resolve(project, "scripts/verify-server-build.mjs"), output], { cwd: project });
} finally {
  await rm(featureConfig, { force: true });
}
