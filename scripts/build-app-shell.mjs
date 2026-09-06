#!/usr/bin/env node
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildAppShell } from "../lib/app-shell-build.mjs";

const project = resolve(fileURLToPath(new URL("..", import.meta.url)));

function parseArgs(values) {
  const result = { check: false, output: null };
  for (const value of values) {
    if (value === "--check") result.check = true;
    else if (value.startsWith("--output=")) result.output = resolve(value.slice("--output=".length));
    else throw new Error("usage: node scripts/build-app-shell.mjs [--check] [--output=PATH]");
  }
  if (result.check && result.output) throw new Error("--check and --output cannot be combined");
  return result;
}

const args = parseArgs(process.argv.slice(2));
const output = args.check ? null : (args.output || resolve(project, "dist", "app-shell", "app-shell-sw.js"));
const result = await buildAppShell({ quiet: true, globDirectory: project, swDest: output });
console.log(`App Shell Workbox: ${result.buildId} - ${result.count} files - ${result.size} bytes${args.check ? " (source verified)" : ` -> ${output}`}`);
