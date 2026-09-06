// Single owner for the default automated gate. package.json may expose
// convenience commands, but it is not a second registry of what `check` means.
export const REPOSITORY_NODE_TESTS = Object.freeze([
  "scripts/test-integrations.mjs",
  "scripts/test-thcrap-service.mjs",
  "scripts/test-thcrap-compiler.mjs",
  "scripts/test-build-profile.mjs",
  "scripts/test-runtime-build-profiles.mjs",
  "scripts/test-quick-host-layout.mjs",
  "scripts/test-language-pack-cache.mjs",
  "scripts/test-host-config.mjs",
  "scripts/test-host-kit-manifest.mjs",
  "scripts/test-workspace-layout.mjs",
  "scripts/test-frontend-manifest.mjs",
  "scripts/test-app-shell-contract.mjs",
  "scripts/test-app-shell-client.mjs",
  "scripts/test-remote-metadata.mjs",
  "scripts/test-resource-mode.mjs",
  "scripts/test-product-selection.mjs",
  "scripts/test-publication-audit.mjs",
  "scripts/test-product-catalog.mjs",
  "scripts/test-runtime-data-provider.mjs",
  "scripts/test-runtime-release.mjs",
  "scripts/test-completion-report.mjs",
  "scripts/test-development-host-manifest.mjs",
  "scripts/test-publication-host-seed.mjs",
  "scripts/test-network-activity.mjs",
  "scripts/test-static-content-policy.mjs",
  "scripts/test-package-descriptor.mjs",
  "scripts/test-package-generation.mjs",
  "scripts/test-package-zip.mjs",
  "scripts/test-legacy-game-pack.mjs",
  "scripts/test-offline-publication.mjs",
  "scripts/test-release-catalog.mjs",
  "scripts/test-host-manifest.mjs",
  "scripts/test-release-manifest.mjs",
  "scripts/test-release-bundle.mjs",
  "scripts/test-release-entry.mjs",
]);

export const REPOSITORY_PYTHON_TESTS = Object.freeze([
  "scripts/test_ogg_converter.py",
]);

export const WORKSPACE_PRECHECKS = Object.freeze([]);

export const WORKSPACE_NODE_TESTS = Object.freeze([
  "scripts/test-shell-protocol.mjs",
  "scripts/test-server.mjs",
  "scripts/test-runtime-release-host-assembly.mjs",
]);

export const WORKSPACE_PYTHON_TESTS = Object.freeze([
  "scripts/test-touhou-formats.py",
]);

