import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..", "..");
const player = fs.readFileSync(path.join(root, "th07-eagler/src/Player.cpp"), "utf8");

if (!player.includes("AnmVm g_EaglerHitboxVm")) {
  throw new Error("th07: always-hitbox visual must own a standalone render VM");
}
if (!player.includes("const Rng savedRng = g_Rng;") || !player.includes("g_Rng = savedRng;")) {
  throw new Error("th07: always-hitbox visual must preserve gameplay RNG around ANM execution");
}
if (/AlwaysShowHitbox\(\)[\s\S]{0,300}SpawnEffect\(24/.test(player)) {
  throw new Error("th07: always-show-hitbox must never allocate native EffectManager effect 24");
}

console.log("TH07 always-hitbox presentation contract: PASS");
