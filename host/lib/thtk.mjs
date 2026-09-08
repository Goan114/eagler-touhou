import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { commandExists } from "./process.mjs";

const VERSION = "12";
const ARCHIVE = "thtk-bin-12.zip";
const DOWNLOAD_URL = "https://github.com/thpatch/thtk/releases/download/12/thtk-bin-12.zip";
const SHA256 = "f6acc00f377b6537e8d504794aec8445cb1e0d6490d2c89d56b3315677765154";

async function archiveHash(path) {
  try {
    return createHash("sha256").update(await readFile(path)).digest("hex");
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function safeZipPath(value) {
  const path = String(value).replaceAll("\\", "/");
  if (!path || path.startsWith("/") || /^[A-Za-z]:/.test(path) || path.split("/").some(part => part === "..")) {
    throw new Error(`unsafe thtk archive path: ${value}`);
  }
  return path;
}

async function extractArchive(bytes, destination) {
  const { unzipSync } = await import("fflate");
  const entries = unzipSync(new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength));
  await rm(destination, { recursive: true, force: true });
  for (const [rawName, content] of Object.entries(entries)) {
    const name = safeZipPath(rawName);
    if (name.endsWith("/")) continue;
    const path = resolve(destination, name);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content);
  }
}

async function ensureWindowsThtk(hostRoot) {
  const cache = resolve(hostRoot, ".cache", "tools", "thtk", VERSION);
  const archive = resolve(cache, ARCHIVE);
  const extracted = resolve(cache, "extracted");
  const toolRoot = resolve(extracted, `thtk-bin-${VERSION}`);
  const tools = {
    thdat: resolve(toolRoot, "thdat.exe"),
    thmsg: resolve(toolRoot, "thmsg.exe"),
    thanm: resolve(toolRoot, "thanm.exe"),
  };
  if (Object.values(tools).every(existsSync)) return Object.freeze(tools);

  await mkdir(cache, { recursive: true });
  if (await archiveHash(archive) !== SHA256) {
    await rm(archive, { force: true });
    console.log(`[Host] Downloading thtk ${VERSION} from the official upstream release`);
    const response = await fetch(DOWNLOAD_URL, { redirect: "follow" });
    if (!response.ok) throw new Error(`Unable to download thtk ${VERSION}: HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    const hash = createHash("sha256").update(bytes).digest("hex");
    if (hash !== SHA256) throw new Error(`Downloaded thtk ${VERSION} SHA-256 mismatch`);
    await writeFile(archive, bytes);
  }
  const bytes = await readFile(archive);
  await extractArchive(bytes, extracted);
  if (!Object.values(tools).every(existsSync)) throw new Error(`thtk ${VERSION} archive did not contain thdat/thmsg/thanm`);
  return Object.freeze(tools);
}

export async function ensureThtk({ hostRoot }) {
  if (process.platform === "win32") return ensureWindowsThtk(hostRoot);
  for (const command of ["thdat", "thmsg"]) {
    if (!await commandExists(command)) {
      throw new Error(`thtk ${VERSION} is required on this platform; install thdat and thmsg and put them on PATH`);
    }
  }
  return Object.freeze({
    thdat: "thdat",
    thmsg: "thmsg",
    thanm: await commandExists("thanm") ? "thanm" : null,
  });
}
