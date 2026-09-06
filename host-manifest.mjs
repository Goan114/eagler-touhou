import { HOST_PROTOCOL, PRODUCT_GAMES } from "./product-catalog.mjs";
import { RESOURCE_MODE_HOSTED, normalizeResourceMode } from "./resource-mode.mjs";

export const HOST_MANIFEST_SCHEMA = "eagler-touhou/host-manifest/1";
export const HOST_MANIFEST_FILE = "host-manifest.json";

const SHA256 = /^[a-f0-9]{64}$/i;
const SHA256_VERSION = /^sha256-[a-f0-9]{64}$/i;

function validOggManifest(ogg) {
  return ogg == null ||
    (typeof ogg.version === "string" && ogg.version.length > 0 &&
     Array.isArray(ogg.files) && Array.isArray(ogg.sizes) &&
     ogg.files.length === ogg.sizes.length &&
     (ogg.sha256 == null ||
      (Array.isArray(ogg.sha256) && ogg.files.length === ogg.sha256.length && ogg.sha256.every(hash => SHA256.test(hash)))));
}

function validOfflineCompatibility(item, resourceMode) {
  if (resourceMode === RESOURCE_MODE_HOSTED) return true;
  const compatibility = item?.offlineCompatibility;
  return compatibility?.schema === "eagler-touhou/offline-game-pack/1" &&
    compatibility.runtimeCompatibility?.protocol === HOST_PROTOCOL &&
    compatibility.runtimeCompatibility?.dataLayout === item.gameData?.layout &&
    compatibility.runtimeCompatibility?.versionSource === "offline-pack" &&
    Array.isArray(compatibility.requiredShared) &&
    ["/msgothic.ttc", "/unifont.otf"].every(target => compatibility.requiredShared.includes(target)) &&
    compatibility.languages?.source === "offline-pack" &&
    Array.isArray(compatibility.languages?.baseline) && compatibility.languages.baseline.includes("ja");
}

function validGame(gameId, item, resourceMode) {
  const product = PRODUCT_GAMES[gameId];
  if (!product || !item || typeof item !== "object" || typeof item.runtime !== "string" || !item.runtime ||
      !item.music?.midi || !Array.isArray(item.music.midi.files)) return false;
  if (product.multiplayerRuntime && (typeof item.multiplayerRuntime !== "string" || !item.multiplayerRuntime)) return false;
  const expectedDataPath = product.package.dataTarget.slice(1);
  return typeof item.gameData?.version === "string" && SHA256_VERSION.test(item.gameData.version) &&
    typeof item.gameData?.layout === "string" && SHA256_VERSION.test(item.gameData.layout) &&
    item.gameData?.path === expectedDataPath &&
    Number.isInteger(item.gameData?.bytes) && item.gameData.bytes > 0 &&
    SHA256.test(item.gameData?.sha256 || "") &&
    validOggManifest(item.music?.ogg) && validOfflineCompatibility(item, resourceMode);
}

function validOptionalUrl(value, protocols) {
  if (value == null) return true;
  if (typeof value !== "string" || !value) return false;
  try { return protocols.has(new URL(value).protocol); }
  catch { return false; }
}

export function validateHostManifest(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || value.schema !== HOST_MANIFEST_SCHEMA ||
      value.protocol !== HOST_PROTOCOL || typeof value.profile !== "string" || !value.profile ||
      !value.shared || typeof value.shared !== "object" || Array.isArray(value.shared) ||
      !value.games || typeof value.games !== "object" || Array.isArray(value.games)) {
    throw new Error("invalid Host Manifest");
  }
  const resourceMode = normalizeResourceMode(value.shared.resourceMode);
  if (!resourceMode) throw new Error("invalid Host Manifest resource mode");
  if (resourceMode === RESOURCE_MODE_HOSTED &&
      (typeof value.shared.vanillaFont !== "string" || typeof value.shared.unicodeFont !== "string")) {
    throw new Error("hosted Host Manifest is missing shared fonts");
  }
  if (resourceMode !== RESOURCE_MODE_HOSTED && (value.shared.vanillaFont != null || value.shared.unicodeFont != null)) {
    throw new Error("import Host Manifest must not publish shared font URLs");
  }
  const fallback = value.shared.gameDataFallback;
  if (fallback != null && (typeof fallback !== "object" || typeof fallback.url !== "string" ||
      !validOptionalUrl(fallback.url, new Set(["https:"])) || (fallback.hint != null && typeof fallback.hint !== "string"))) {
    throw new Error("invalid Host Manifest gameDataFallback");
  }
  if (!validOptionalUrl(value.shared.netplayRelay, new Set(["ws:", "wss:"]))) {
    throw new Error("invalid Host Manifest netplayRelay");
  }
  const actualGames = Object.keys(value.games).sort();
  if (!actualGames.length || actualGames.some(game => !PRODUCT_GAMES[game]) ||
      actualGames.some(game => !validGame(game, value.games[game], resourceMode))) {
    throw new Error("invalid Host Manifest games");
  }
  return { ...value, shared: { ...value.shared, resourceMode } };
}
