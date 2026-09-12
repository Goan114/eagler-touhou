import assert from "node:assert/strict";
import {
  validateExternalResourceFinalUrl,
  validateExternalResourceRedirect,
} from "../lib/external-resource-routing.mjs";
import { adaptExternalResourceGame } from "../lib/external-resource-index.mjs";
import { canonicalPackagePayload } from "../package/package-descriptor.mjs";
import { createHash } from "node:crypto";

const request = "https://play.example.com/games/th08/th08.data?v=revision";
assert.equal(
  validateExternalResourceRedirect(request, {
    status: 307,
    location: "https://asset.example.com/games/th08/th08.data?v=revision",
  }).href,
  "https://asset.example.com/games/th08/th08.data?v=revision",
);
assert.equal(
  validateExternalResourceFinalUrl(request, "https://asset.example.com/games/th08/th08.data?v=revision").href,
  "https://asset.example.com/games/th08/th08.data?v=revision",
);

assert.throws(() => validateExternalResourceRedirect(request, {
  status: 308,
  location: "https://asset.example.com/games/th08/th08.data?v=revision",
}), /expected 307/);
assert.throws(() => validateExternalResourceRedirect(request, {
  status: 307,
  location: "https://asset.example.com/games/th07/th07.data?v=revision",
}), /preserve the Package path and query/);
assert.throws(() => validateExternalResourceRedirect(request, {
  status: 307,
  location: "https://asset.example.com/games/th08/th08.data?v=other",
}), /preserve the Package path and query/);
assert.throws(() => validateExternalResourceRedirect(request, {
  status: 307,
  location: "https://play.example.com/games/th08/th08.data?v=revision",
}), /different HTTPS Origin/);
assert.throws(() => validateExternalResourceFinalUrl(
  request,
  "http://asset.example.com/games/th08/th08.data?v=revision",
), /different HTTPS Origin/);

const sha = value => createHash("sha256").update(value).digest("hex");
const currentLanguageSha = sha("current language");
const resourceLanguageSha = sha("resource language");
const descriptor = (languageSha, languageSource) => {
  const value = {
    schema: "eagler-touhou/package/1", game: "th06", revision: "pending",
    runtimeRequirement: { protocol: "eagler-touhou/1", target: "th06", dataFile: "game-data", dataLayout: "layout" },
    files: {
      "game-data": { source: "games/th06/th06.data", target: "/th06.data", revision: sha("data").slice(0, 16), bytes: 4, sha256: sha("data") },
      "language:lang_en": { source: languageSource, target: "/__eagler/language/lang_en.zip", revision: languageSha.slice(0, 16), bytes: 8, sha256: languageSha },
    },
    base: { files: ["game-data"] },
    components: { language: { type: "language", entries: [{ id: "lang_en", title: "English", file: "language:lang_en" }] } },
  };
  value.revision = createHash("sha256").update(canonicalPackagePayload(value)).digest("hex").slice(0, 16);
  return value;
};
const currentDescriptor = descriptor(currentLanguageSha, "games/th06/thcrap/th06/new/lang_en.new.zip");
const resourceDescriptor = descriptor(resourceLanguageSha, "games/th06/thcrap/th06/stable/lang_en.stable.zip");
const adapted = adaptExternalResourceGame({
  game: "th06",
  currentEntry: {
    package: { revision: currentDescriptor.revision, descriptor: "th06.package.json" },
    languages: [{ id: "lang_en", pack: { url: currentDescriptor.files["language:lang_en"].source, bytes: 8, sha256: currentLanguageSha } }],
    languageOptions: [{ id: "ja", title: "日本語", pack: null }, { id: "lang_en", title: "English", pack: { url: currentDescriptor.files["language:lang_en"].source, bytes: 8, sha256: currentLanguageSha } }],
  },
  currentDescriptor,
  resourceEntry: {
    package: { revision: resourceDescriptor.revision, descriptor: "th06.package.json" },
    languageOptions: [{ id: "ja", title: "日本語", pack: null }, { id: "lang_en", title: "English", pack: { url: resourceDescriptor.files["language:lang_en"].source, bytes: 8, sha256: resourceLanguageSha } }],
  },
  resourceDescriptor,
});
assert.equal(adapted.entry.package.revision, resourceDescriptor.revision);
assert.equal(adapted.entry.languages[0].pack.url, resourceDescriptor.files["language:lang_en"].source);
assert.equal(adapted.descriptor, resourceDescriptor);
assert.throws(() => adaptExternalResourceGame({
  game: "th06", currentEntry: adapted.entry, currentDescriptor,
  resourceEntry: { ...adapted.entry, package: { revision: resourceDescriptor.revision, descriptor: "th06.package.json" } },
  resourceDescriptor: { ...resourceDescriptor, files: { ...resourceDescriptor.files,
    "game-data": { ...resourceDescriptor.files["game-data"], sha256: sha("different") } } },
}), /incompatible|inconsistent/);

console.log("External resource routing contract: PASS");
