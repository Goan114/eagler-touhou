// Repository-owned frontend delivery manifest. Original-game-derived artwork
// is intentionally absent: host assembly supplies those files separately.
const entries = [
  ["index.html", true],
  ["site.webmanifest", true],
  ["styles.css", true],
  ["touch-guide.css", true],
  ["about.css", true],
  ["app.js", true],
  ["app-shell-client.mjs", true],
  ["i18n.js", true],
  ["resource-mode.mjs", true],
  ["migrate.html", true],
  ["about.html", true],
  ["faq.html", true],
  ["legacy-game-pack.mjs", true],
  ["legacy-package-adapter.mjs", true],
  ["legacy-import-storage.mjs", true],
  ["stored-zip.mjs", true],
  ["network-activity.mjs", true],
  ["package-descriptor.mjs", true],
  ["package-generation.mjs", true],
  ["package-store.mjs", true],
  ["runtime-preparation.mjs", true],
  ["package-zip.mjs", true],
  ["package-installer.mjs", true],
  ["package-launcher.mjs", true],
  ["product-catalog.mjs", true],
  ["release-catalog.mjs", true],
  ["host-manifest.mjs", true],
  ["remote-metadata.mjs", true],
  ["vendor/fflate.min.js", true],
  ["vendor/webaudio-tinysynth.min.js", true],
  ["vendor/fflate.LICENSE", false],
  ["vendor/webaudio-tinysynth.LICENSE", false],
  ["assets/touch-rotate-landscape.webp", true],
  ["assets/notice-bilibili.svg", true],
  ["assets/notice-touhou-cloud.png", true],
  ["assets/notice-github.svg", true],
  ["assets/notice-qq.svg", true],
  ["assets/fonts/touhou98.woff2", true],
  ["assets/fonts/unifont-site.woff2", true],
  ["assets/fonts/noto-serif-sc-touhou.woff2", true],
  ["assets/fonts/yatra-one-latin.woff2", true],
  ["assets/fonts/chill-round-gothic-site-medium.woff2", true],
  ["assets/fonts/chill-round-gothic-site-bold.woff2", true],
  ["assets/fonts/chill-round-gothic-site-heavy.woff2", true],
  ["assets/fonts/OFL-NotoSerifSC.txt", false],
  ["assets/fonts/OFL-YatraOne.txt", false],
  ["assets/fonts/OFL-ChillRoundGothic.txt", false],
  ["NOTICE.txt", false],
  ["CHANGELOG.txt", false],
  ["README.md", false],
  ["ASSETS.md", false],
  ["THIRD_PARTY.md", false],
];

export const FRONTEND_PACKAGE_FILES = Object.freeze(entries.map(([path]) => path));
export const APP_SHELL_FILES = Object.freeze(entries.filter(([, appShell]) => appShell).map(([path]) => path));
export const PUBLIC_ASSET_FILES = Object.freeze(
  FRONTEND_PACKAGE_FILES.filter(path => path.startsWith("assets/")),
);

export function hostArtworkFiles(games) {
  return Object.freeze(games.flatMap(game => [
    `${game}-card.webp`,
    ...(game === "th06" ? ["th06.ico"] : []),
  ]));
}

