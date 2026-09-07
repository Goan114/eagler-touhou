import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { HOST_MANIFEST_SCHEMA, validateHostManifest } from "./contracts/host-manifest.mjs";
import { HOST_PROTOCOL, PRODUCT_GAMES } from "./contracts/product-catalog.mjs";
import { RESOURCE_MODE_HOSTED } from "./contracts/resource-mode.mjs";
import { DEVELOPMENT_CONTENT } from "./development-content.mjs";
import { fileSetIdentity } from "./release-manifest.mjs";
import { extractGameDataLayout } from "./runtime-data-layout.mjs";

const project = resolve(fileURLToPath(new URL("..", import.meta.url)));

async function fileIdentity(path) {
  const bytes = await readFile(path);
  return { bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
}

async function dataIdentity(game, declaration) {
  if (declaration.identity) return { ...declaration.identity };
  const identity = await fileIdentity(resolve(project, declaration.source));
  const layout = extractGameDataLayout(await readFile(resolve(project, declaration.runtimeScript), "utf8"), game);
  if (identity.bytes !== layout.bytes) throw new Error(`${game}: development DATA does not match its Runtime layout`);
  return { ...identity, layout: layout.layout };
}

async function musicDeclaration(declaration, mode) {
  const identities = await Promise.all(declaration.files.map(file => fileIdentity(resolve(project, declaration.base, file))));
  return {
    base: declaration.base,
    mount: declaration.mount,
    files: [...declaration.files],
    ...(mode === "ogg"
      ? fileSetIdentity(declaration.files, identities)
      : { sizes: identities.map(identity => identity.bytes) }),
  };
}

export async function createDevelopmentHostManifest({ netplayRelay } = {}) {
  const games = {};
  for (const [game, product] of Object.entries(PRODUCT_GAMES)) {
    const declaration = DEVELOPMENT_CONTENT.games[game];
    if (!declaration) throw new Error(`${game}: missing development content declaration`);
    const data = await dataIdentity(game, declaration.data);
    const music = { midi: { files: [] } };
    for (const [mode, source] of Object.entries(declaration.music || {})) {
      music[mode] = await musicDeclaration(source, mode);
    }
    games[game] = {
      number: product.number,
      title: product.title,
      subtitle: product.subtitle,
      runtime: declaration.runtime,
      ...(declaration.multiplayerRuntime ? { multiplayerRuntime: declaration.multiplayerRuntime } : {}),
      gameData: {
        version: `sha256-${data.sha256}`,
        layout: data.layout,
        path: product.package.dataTarget.slice(1),
        bytes: data.bytes,
        sha256: data.sha256,
      },
      features: { thprac: product.features.thprac },
      music,
    };
  }

  return validateHostManifest({
    schema: HOST_MANIFEST_SCHEMA,
    protocol: HOST_PROTOCOL,
    profile: "web-development",
    shared: {
      resourceMode: RESOURCE_MODE_HOSTED,
      ...DEVELOPMENT_CONTENT.shared,
      ...(netplayRelay ? { netplayRelay } : {}),
    },
    games,
  });
}
