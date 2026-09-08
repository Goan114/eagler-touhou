import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { run } from "./process.mjs";

const REQUIRED = Object.freeze(["acorn", "fflate", "workbox-build"]);
const MINIMUM_NODE_MAJOR = 22;

export function assertSupportedNode() {
  const major = Number.parseInt(process.versions.node.split(".")[0], 10);
  if (!Number.isInteger(major) || major < MINIMUM_NODE_MAJOR) {
    throw new Error(`Node.js >= ${MINIMUM_NODE_MAJOR} is required for self-hosting; current version is ${process.version}`);
  }
}

function missingDependencies(projectRoot) {
  return REQUIRED.filter(name => !existsSync(resolve(projectRoot, "node_modules", name, "package.json")));
}

export async function ensureNodeDependencies(projectRoot) {
  assertSupportedNode();
  let missing = missingDependencies(projectRoot);
  if (!missing.length) return;
  if (!existsSync(resolve(projectRoot, "package-lock.json"))) {
    throw new Error("package-lock.json is missing; refusing to install unpinned Node.js dependencies");
  }
  console.log(`[Build] Installing locked Node.js dependencies (${missing.join(", ")})`);
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  await run(npm, ["ci", "--no-audit", "--no-fund"], { cwd: projectRoot });
  missing = missingDependencies(projectRoot);
  if (missing.length) throw new Error(`npm ci completed but dependencies are still missing: ${missing.join(", ")}`);
}
