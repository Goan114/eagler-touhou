import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { run } from "./process.mjs";

const REQUIRED = Object.freeze(["acorn", "fflate", "workbox-build"]);

function missingDependencies(projectRoot) {
  return REQUIRED.filter(name => !existsSync(resolve(projectRoot, "node_modules", name, "package.json")));
}

export async function ensureNodeDependencies(projectRoot) {
  let missing = missingDependencies(projectRoot);
  if (!missing.length) return;
  if (!existsSync(resolve(projectRoot, "package-lock.json"))) {
    throw new Error("package-lock.json is missing; refusing to install unpinned Node.js dependencies");
  }
  console.log(`[Host] Installing locked Node.js dependencies (${missing.join(", ")})`);
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  await run(npm, ["ci", "--no-audit", "--no-fund"], { cwd: projectRoot });
  missing = missingDependencies(projectRoot);
  if (missing.length) throw new Error(`npm ci completed but dependencies are still missing: ${missing.join(", ")}`);
}
