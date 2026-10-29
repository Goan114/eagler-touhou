# TH13 Japanese test publication

TH13 follows PR #159 on current main and retains the original source root through one dedicated subtree join. Its Runtime uses the parent Launcher DATA buffer across iframe realms and includes TH13 startup credit layout support.

The test frontend adds five native TH01–TH05 links between the singleplayer and multiplayer shelves. These cards use the existing standalone routes and their native navigation. Their display is controlled by the test publication flag.

Japanese retail `th13.dat` is SHA-256 `3443fe0df11de4b9ed950d09e978317547aae4f029792238a6acca7399670089`. Prepared content contains 203 Japanese archive/music entries. The continuous Vorbis stream preserves 123,004,902 original PCM frames. The offline package includes both shared fonts; [package evidence](offline-verification.json) records its members and identity.

Validation covers the production WASM build, mounted card navigation and order, both 480/512-pixel retail artwork layouts, managed shell input and cross-realm DATA, product/host registration, eight TH13 source gates, and real Chromium title/stage entry. Headless software-renderer captures establish startup and rendering behavior; they are not a device performance benchmark.

The test publication is composed from the current main deployment plus TH13, the rebuilt frontend and test-specific relay settings. [Assembly](assemble-test.mjs) verifies baseline file identities, including the routinely regenerated `sync-version.json` marker as a bounded exception, before constructing a newly verified release.
