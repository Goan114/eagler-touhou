import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

import { canonicalPackagePayload, validatePackageDescriptor } from "../package/package-descriptor.mjs";

const languageFileIds = descriptor => new Set(
  (descriptor.components?.language?.entries || []).map(entry => entry?.file).filter(Boolean),
);

const withoutLanguageComponent = descriptor => Object.fromEntries(
  Object.entries(descriptor.components || {}).filter(([name]) => name !== "language"),
);

function languageEntries(descriptor) {
  const entries = descriptor.components?.language?.entries;
  if (!Array.isArray(entries)) return [];
  return entries.map(entry => ({ id: entry?.id, file: entry?.file }));
}

export function adaptExternalResourceGame({ game, currentEntry, currentDescriptor, resourceEntry, resourceDescriptor }) {
  const current = validatePackageDescriptor(currentDescriptor);
  const resource = validatePackageDescriptor(resourceDescriptor);
  if (current.game !== game || resource.game !== game) throw new Error(`${game}: External resource index game mismatch`);
  const resourceRevision = createHash("sha256").update(canonicalPackagePayload(resource)).digest("hex").slice(0, 16);
  if (resource.revision !== resourceRevision || resourceEntry?.package?.revision !== resource.revision ||
      resourceEntry.package.descriptor !== currentEntry.package.descriptor) {
    throw new Error(`${game}: External resource Package pointer is inconsistent`);
  }
  if (!isDeepStrictEqual(current.runtimeRequirement, resource.runtimeRequirement) ||
      !isDeepStrictEqual(current.base, resource.base) ||
      !isDeepStrictEqual(withoutLanguageComponent(current), withoutLanguageComponent(resource))) {
    throw new Error(`${game}: External resource Package is incompatible with the current Hosted release`);
  }

  const currentLanguageFiles = languageFileIds(current);
  const resourceLanguageFiles = languageFileIds(resource);
  const currentBaseFiles = Object.fromEntries(Object.entries(current.files).filter(([id]) => !currentLanguageFiles.has(id)));
  const resourceBaseFiles = Object.fromEntries(Object.entries(resource.files).filter(([id]) => !resourceLanguageFiles.has(id)));
  if (!isDeepStrictEqual(currentBaseFiles, resourceBaseFiles) ||
      !isDeepStrictEqual(languageEntries(current), languageEntries(resource))) {
    throw new Error(`${game}: External resource Package payload identities are incompatible`);
  }
  if (!Array.isArray(resource.components?.language?.entries)) {
    throw new Error(`${game}: External resource language component is missing`);
  }

  const resourceOptions = new Map((resourceEntry.languageOptions || []).map(option => [option?.id, option]));
  const languages = [];
  const languageOptions = (currentEntry.languageOptions || []).map(option => {
    if (option?.id === "ja" || !option?.pack) return option;
    const replacement = resourceOptions.get(option.id);
    const descriptorEntry = resource.components.language.entries.find(entry => entry.id === option.id);
    const descriptorFile = descriptorEntry && resource.files[descriptorEntry.file];
    if (!replacement?.pack || !descriptorFile || descriptorFile.source !== replacement.pack.url ||
        descriptorFile.bytes !== replacement.pack.bytes || descriptorFile.sha256 !== replacement.pack.sha256 ||
        descriptorFile.revision !== replacement.pack.sha256.slice(0, 16)) {
      throw new Error(`${game}: External resource language pack is inconsistent: ${option.id}`);
    }
    const language = { ...replacement, title: option.title || replacement.title || option.id };
    languages.push(language);
    return language;
  });
  if (languages.length !== (currentEntry.languages || []).length) {
    throw new Error(`${game}: External resource language selection is incomplete`);
  }
  return {
    entry: {
      ...currentEntry,
      package: { revision: resource.revision, descriptor: currentEntry.package.descriptor },
      languages,
      languageOptions,
    },
    descriptor: resource,
  };
}
