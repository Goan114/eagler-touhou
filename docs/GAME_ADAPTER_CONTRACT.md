# Game adapter contract

The static product registry is the existing `PRODUCT_GAMES` in `product-catalog.mjs`. Do not introduce a parallel `game-registry.mjs`.

| Declaration | Direct consumer |
| --- | --- |
| title / number / subtitle / Runtime URL | Launcher bootstrap when no remote manifest is available. |
| storage.saveRoot / scoreFile / configFiles | Generic storage runner; Launcher score import/export reads `scoreFile`. `configFiles` lists allowed configuration names and does not require every launch to create them. |
| features.thprac / focusHitbox | Static upper bound on product capabilities. A Host Manifest may disable a capability to reflect the actual Runtime, but cannot enable one the product does not support. |
| features.replayManagement | Static Launcher feature entry; the Host cannot override it. |
| features.languages | Static upper bound for the publisher. Browser-visible language choices come only from Host `languageOptions` and the Package language component. |
| replay.prefix | Replay-manager filename adapter; declared only when `replayManagement` is true. |
| package.dataFileId / dataTarget | The DATA importer reads the declared target filename. |
| package.musicSourceDirectories / musicMounts | The publisher locates music under the per-game assets/OGG root supplied by the caller and uses the static Runtime mount. The legacy package adapter derives OGG targets from the same owner rather than from whether a deployment publishes OGG. |
| dataProvider | `lib/runtime-data-provider.mjs` selects Shell markers and layout rules by ingestion type; preload and retail-memory remain separate implementations. |
| multiplayerRuntime / multiplayer | MP Runtime availability, difficulty/character ranges, and diagnostic entrypoints; the Launcher does not infer them from game names. |

Installation generations, hashes, byte sizes, and OGG collection versions remain owned by the Host Manifest and Package Descriptor and must not enter the static product registry. Development source paths and content lists live in `development-content.mjs`. `development-host-manifest.mjs` builds a development Host Manifest with the same schema as a formal site from the actual TH06/TH07 DATA, Runtime layout, and per-game music files; only original-content identities that cannot be read from the working tree remain explicit inputs. Effective music availability belongs to `src/launcher/music-availability.mts`, which consumes capability plus installed/remote resource state without performing I/O. The Launcher persists the explicit preference; a temporary fallback does not overwrite it. A formal release's import site consumes the Host Manifest produced by the same hosted build and never falls back to development identities from the working tree.

Per-game `features` in `host-manifest/1` accepts only optional Boolean `thprac` and `focusHitbox` fields to constrain the concrete Runtime's capabilities. Missing fields retain the static defaults for compatibility with early schema-1 deployments. `replayManagement` and `languages` are outside this dynamic override surface. Manifest validation must reject unknown or incorrectly typed Host features instead of allowing object spread to leak them into Launcher UI.

Historical `game-data-pack/1` and `offline-game-pack/1` formats are read-compatible only. ZIP parsing belongs to `legacy/legacy-game-pack.mjs`; migration and cleanup of old localStorage, Cache Storage, and custom IndexedDB state belong to `legacy/legacy-import-storage.mjs`. Old `game-data-import.js/.mjs` module URLs are no longer publication contracts. New imports must cross into the Package Store and must not create more legacy storage state.

## Remaining adapter differences

| Scope | Direction |
| --- | --- |
| Legacy import-cache compatibility allowlist | The migration protocol has a historical scope; do not add every new game to old cache paths automatically. |
| Product-specific maintenance notices and original DAT decoding | These belong to specialized product/format implementations and are not removed merely because they mention a game. TH08-specific cleanup was canceled at the user's request. |

When adding a game, search the Launcher, package server, and verifier again for game-specific branches. Populate declarations and verify the shared contract before implementation; never treat an unknown capability as a TH07 default. Temporary audit findings do not belong in long-lived repository documentation.
