import assert from "node:assert/strict";
import {
  SITE_NOTICE_DISMISSED_KEY,
  SITE_NOTICE_DURATION_MS,
  SITE_NOTICE_STORAGE_KEY,
  createSiteNoticeController,
  parseSiteNoticeText,
  siteNoticeBrandAsset,
} from "../.cache/build/browser/assets/launcher/site-notice.mjs";

const baseUrl = "https://test.example/eagler-touhou/";
assert.equal(SITE_NOTICE_DURATION_MS, 15_000);
assert.equal(siteNoticeBrandAsset("https://cloud.touhou.best/", baseUrl), "assets/notice-touhou-cloud.png",
  "the permission-cleared 车万云 provider mark must remain available offline");
assert.equal(siteNoticeBrandAsset("https://space.bilibili.com/1", baseUrl), "assets/notice-bilibili.svg");
assert.equal(siteNoticeBrandAsset("https://github.com/example/repo", baseUrl), "assets/notice-github.svg");
assert.equal(siteNoticeBrandAsset("https://qm.qq.com/q/example", baseUrl), "assets/notice-qq.svg");
assert.equal(siteNoticeBrandAsset("faq.html", baseUrl), "assets/th06.ico");
assert.equal(siteNoticeBrandAsset("https://example.org/", baseUrl), "");

const parsed = parseSiteNoticeText(
  "反馈请看 [FAQ](faq.html) 或 [GitHub](https://github.com/example/repo)\n不要执行 [bad](javascript:alert(1))",
  baseUrl,
);
assert.equal(parsed.length, 2);
assert.deepEqual(parsed[0].filter(segment => segment.type === "link").map(segment => ({
  label: segment.label,
  href: segment.href,
  external: segment.external,
  asset: segment.asset,
})), [
  { label: "FAQ", href: "faq.html", external: false, asset: "assets/th06.ico" },
  { label: "GitHub", href: "https://github.com/example/repo", external: true, asset: "assets/notice-github.svg" },
]);
assert.equal(parsed[1].map(segment => segment.type === "text" ? segment.text : segment.label).join(""),
  "不要执行 [bad](javascript:alert(1))", "non-http links must remain inert text");
assert.deepEqual(parseSiteNoticeText("[车万云](https://cloud.touhou.best/)", baseUrl)[0], [{
  type: "link",
  label: "车万云",
  href: "https://cloud.touhou.best/",
  resolvedHref: "https://cloud.touhou.best/",
  external: true,
  asset: "assets/notice-touhou-cloud.png",
}]);

class FakeClassList {
  values = new Set();
  add(...names) { for (const name of names) this.values.add(name); }
  remove(...names) { for (const name of names) this.values.delete(name); }
  contains(name) { return this.values.has(name); }
}

class FakeElement {
  constructor(id = "") { this.id = id; }
  hidden = true;
  scrollTop = 0;
  className = "";
  classList = new FakeClassList();
  styleValues = new Map();
  style = { setProperty: (name, value) => this.styleValues.set(name, value) };
  attributes = new Map();
  listeners = new Map();
  children = [];
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  addEventListener(type, callback) {
    const list = this.listeners.get(type) || [];
    list.push(callback);
    this.listeners.set(type, list);
  }
  removeEventListener(type, callback) {
    const list = this.listeners.get(type) || [];
    this.listeners.set(type, list.filter(value => value !== callback));
  }
  dispatch(type) { for (const callback of this.listeners.get(type) || []) callback({ target: this }); }
  append(...values) { this.children.push(...values); }
  replaceChildren(...values) { this.children = [...values]; }
}

class FakeDocument {
  constructor() {
    this.documentElement = new FakeElement("documentElement");
    this.scrollingElement = this.documentElement;
    this.elements = new Map(["siteNotice", "siteNoticeContent", "siteNoticeOptOut", "siteNoticeClose", "siteNoticeToggle"]
      .map(id => [id, new FakeElement(id)]));
  }
  listeners = new Map();
  getElementById(id) { return this.elements.get(id) || null; }
  createElement() { return new FakeElement(); }
  createTextNode(text) { return { nodeType: 3, textContent: text }; }
  addEventListener(type, callback) {
    const list = this.listeners.get(type) || [];
    list.push(callback);
    this.listeners.set(type, list);
  }
  removeEventListener(type, callback) {
    const list = this.listeners.get(type) || [];
    this.listeners.set(type, list.filter(value => value !== callback));
  }
}

const storageValues = new Map();
const storage = {
  getItem: key => storageValues.has(key) ? storageValues.get(key) : null,
  setItem: (key, value) => storageValues.set(key, String(value)),
};
const documentObj = new FakeDocument();
const windowObj = { location: { href: baseUrl }, scrollY: 0 };
const timers = new Map();
let timerSerial = 0;
let optOutMessages = 0;
const controller = createSiteNoticeController({
  documentObj,
  windowObj,
  storage,
  fetchImpl: async () => new Response("欢迎 [FAQ](faq.html)", { status: 200 }),
  matchMediaImpl: () => ({ matches: true }),
  setTimeoutImpl: (callback, delay) => { const id = ++timerSerial; timers.set(id, { callback, delay }); return id; },
  clearTimeoutImpl: id => timers.delete(id),
  baseUrl,
  onOptOut: () => optOutMessages++,
});

const bar = documentObj.getElementById("siteNotice");
const content = documentObj.getElementById("siteNoticeContent");
const toggle = documentObj.getElementById("siteNoticeToggle");
assert.equal(toggle.attributes.get("aria-checked"), "true");
assert.equal(await controller.load(), true);
assert.equal(bar.hidden, false);
assert.equal(bar.styleValues.get("--site-notice-duration"), "15000ms");
assert.equal(content.children.length, 1);
assert.ok([...timers.values()].some(timer => timer.delay === 15_000));

documentObj.getElementById("siteNoticeClose").dispatch("click");
assert.equal(storageValues.get(SITE_NOTICE_DISMISSED_KEY), "1");
assert.equal(bar.hidden, true, "reduced-motion close must finish immediately");

documentObj.getElementById("siteNoticeOptOut").dispatch("click");
assert.equal(storageValues.get(SITE_NOTICE_STORAGE_KEY), "0");
assert.equal(toggle.attributes.get("aria-checked"), "false");
assert.equal(optOutMessages, 1);
assert.equal(await controller.load(), false, "disabled notice must not fetch/display");
controller.destroy();

console.log(JSON.stringify({ siteNotice: "PASS", durationMs: SITE_NOTICE_DURATION_MS, nonBlocking: true }));
