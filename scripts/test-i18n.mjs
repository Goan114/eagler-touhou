import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  UI_LOCALES,
  UI_MESSAGES,
  resolveUiLocale,
  setUiLocale,
  t,
  validateUiCatalogs,
} from "../i18n.js";

const project = resolve(fileURLToPath(new URL("..", import.meta.url)));
const index = await readFile(resolve(project, "index.html"), "utf8");
const app = await readFile(resolve(project, "app.js"), "utf8");
const appShell = await readFile(resolve(project, "scripts/build-app-shell.mjs"), "utf8");

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
setUiLocale("zh-CN", { persist: false, notify: false });
assert.equal(t("nav.lessMotion"), "更少动画");
assert.equal(t("status.roomCreated", { code: "123456" }), "已创建房间 123456");
assert.match(index, /class="option-select ui-language-select" id="uiLanguageSelect"/);
assert.match(index, /data-i18n="nav\.lessMotion"/);
assert.match(index, /src="app\.js"/);
assert.match(app, /from "\.\/i18n\.js"/);
assert.match(app, /setTranslatedStatus\("status\.selectGame"\)/);
assert.match(appShell, /"i18n\.js"/);

console.log(JSON.stringify({ locales: UI_LOCALES, keys: keys.length, catalogs: "PASS", launcherControl: "PASS" }));
