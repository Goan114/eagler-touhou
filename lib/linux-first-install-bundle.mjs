import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { localModuleClosure } from "./browser-module-graph.mjs";
import { ensureLauncherBuild } from "./launcher-build.mjs";
import { resolveFrontendPackageSource } from "./frontend-manifest.mjs";

const project = resolve(fileURLToPath(new URL("..", import.meta.url)));
await ensureLauncherBuild();

function copyRule(source, target, recursive = false) {
  const normalize = value => String(value || "").replaceAll("\\", "/");
  const normalizedSource = normalize(source);
  const normalizedTarget = normalize(target);
  for (const [name, value] of [["source", normalizedSource], ["target", normalizedTarget]]) {
    if (!value || value.startsWith("/") || value.split("/").some(part => !part || part === "." || part === "..")) {
      throw new Error(`invalid Linux first-install ${name}: ${value}`);
    }
  }
  return Object.freeze({ source: normalizedSource, target: normalizedTarget, recursive: !!recursive });
}

export const LINUX_FIRST_INSTALL_BUNDLE_SCHEMA = "eagler-touhou/linux-first-install-bundle/1";

export const LINUX_FIRST_INSTALL_RELAY_MODULES = await localModuleClosure({
  root: project,
  entries: ["server/netplay-relay.mjs"],
  allowBareImports: true,
  allowDynamicImports: true,
});

// Repository-owned inputs for the Linux first-install artifact. Site content
// and the official Node archive are caller-provided build inputs and therefore
// intentionally stay outside this manifest.
export const LINUX_FIRST_INSTALL_COPY_RULES = Object.freeze([
  copyRule("deploy/linux-first-install", "installer", true),
  ...LINUX_FIRST_INSTALL_RELAY_MODULES.map(source => copyRule(source, `relay/${source}`)),
  copyRule(
    resolveFrontendPackageSource("assets/contracts/product-catalog.mjs").slice(project.length + 1),
    "relay/assets/contracts/product-catalog.mjs",
  ),
  copyRule("server/render-coturn-config.cjs", "relay/server/render-coturn-config.cjs"),
  copyRule("node_modules/ws", "relay/node_modules/ws", true),
  copyRule("deploy/linux-first-install/README.md", "HOST-README.md"),
  copyRule("deploy/linux-first-install/config.env.example", "config.env.example"),
  copyRule("deploy/linux-first-install/config.external-ws.example", "config.external-ws.example"),
]);

export const LINUX_FIRST_INSTALL_NODE_DEPENDENCIES = Object.freeze(["ws"]);
