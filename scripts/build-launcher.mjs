#!/usr/bin/env node
import { ensureLauncherBuild } from "../lib/launcher-build.mjs";

const result = await ensureLauncherBuild({ force: process.argv.includes("--force") });
console.log(`Launcher modules: ${result.built ? "built" : "ready"} (${result.sourceCount} TypeScript source${result.sourceCount === 1 ? "" : "s"})`);
