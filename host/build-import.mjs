#!/usr/bin/env node
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureNodeDependencies } from "./lib/node-environment.mjs";
import { run } from "./lib/process.mjs";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

function parseArgs(argv) {
  const values = {};
  for (const raw of argv) {
    if (!raw.startsWith("--")) throw new Error(`unexpected argument: ${raw}`);
    const split = raw.indexOf("=");
    if (split > 2) values[raw.slice(2, split)] = raw.slice(split + 1);
    else values[raw.slice(2)] = true;
  }
  return values;
}

const args = parseArgs(process.argv.slice(2));
const hostRoot = resolve(String(args.root || projectRoot));
const music = String(args.music || "midi,ogg");
const python = String(args.python || process.env.PYTHON || "python");

await ensureNodeDependencies(projectRoot);
const { buildImportArtifacts } = await import("./lib/site-builder.mjs");
await buildImportArtifacts({ projectRoot, hostRoot, music, python });
await run(process.execPath, [
  resolve(projectRoot, "scripts", "inspect-host.mjs"),
  `--root=${hostRoot}`, `--music=${music}`, "--post-import=1",
], { cwd: projectRoot });
