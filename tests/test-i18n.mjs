import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { FRONTEND_PACKAGE_FILES, resolveFrontendPackageSource } from "../lib/frontend-manifest.mjs";
import {
  applyStaticTranslations,
  UI_LOCALES,
  UI_MESSAGES,
  resolveUiLocale,
  setUiLocale,
  t,
  validateUiCatalogs,
} from "../.cache/build/browser/assets/launcher/i18n.mjs";

const index = await readFile(resolveFrontendPackageSource("index.html"), "utf8");

assert.deepEqual(UI_LOCALES, ["zh-CN", "en"]);
assert.equal(resolveUiLocale("zh-CN"), "zh-CN");
assert.equal(resolveUiLocale("zh-TW"), "zh-CN");
assert.equal(resolveUiLocale("ja-JP"), "en");
const keys = validateUiCatalogs();
assert.deepEqual(Object.keys(UI_MESSAGES["zh-CN"]), keys);
assert.deepEqual(Object.keys(UI_MESSAGES.en), keys);
setUiLocale("en", { persist: false, notify: false });
assert.equal(t("nav.lessMotion"), "Less motion");
assert.equal(t("status.roomCreated", { code: "123456" }), "Room 123456 created");
assert.equal(t("missing.fixture"), "missing.fixture", "runtime JS callers must retain fail-soft missing-key behavior");
setUiLocale("zh-CN", { persist: false, notify: false });
assert.equal(t("nav.lessMotion"), "更少动画");
assert.equal(t("status.roomCreated", { code: "123456" }), "已创建房间 123456");

const translatedElement = { dataset: { i18n: "nav.lessMotion" }, textContent: "" };
applyStaticTranslations({ querySelectorAll: selector => selector === "[data-i18n]" ? [translatedElement] : [] });
assert.equal(translatedElement.textContent, "更少动画",
  "static translation must update matching DOM text from the active catalog");

// These are integration selectors consumed by the i18n owner, not styling locks.
assert.match(index, /id="uiLanguageSelect"/);
assert.match(index, /data-i18n="nav\.lessMotion"/);
assert.ok(FRONTEND_PACKAGE_FILES.includes("assets/launcher/i18n.mjs"),
  "the browser i18n owner must be part of the published frontend closure");

console.log(JSON.stringify({ locales: UI_LOCALES, keys: keys.length, catalogs: "PASS", launcherControl: "PASS" }));
