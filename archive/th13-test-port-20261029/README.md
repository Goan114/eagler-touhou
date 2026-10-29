# TH13 Japanese test publication

TH13 follows PR #159 on current main and retains the original source root through one dedicated subtree join. Its Runtime uses the parent Launcher DATA buffer across iframe realms and includes TH13 startup credit layout support.

The test frontend adds five native TH01–TH05 links between the singleplayer and multiplayer shelves. These cards use the existing standalone routes and their native navigation. Their display is controlled by the test publication flag.

Japanese retail `th13.dat` is SHA-256 `3443fe0df11de4b9ed950d09e978317547aae4f029792238a6acca7399670089`. Prepared content contains 203 Japanese archive/music entries. Complete-set music preparation accepts the one continuous OGG file before launch while ordinary per-track games retain their two-track startup rule. The continuous Vorbis stream preserves 123,004,902 original PCM frames. The offline package includes both shared fonts; [package evidence](offline-verification.json) records its members and identity.

Validation covers the production WASM build, mounted card navigation and order, both 480/512-pixel retail artwork layouts, managed shell input and cross-realm DATA, product/host registration, eight TH13 source gates, and real Chromium title/stage entry. Headless software-renderer captures establish startup and rendering behavior; they are not a device performance benchmark.

The test publication is composed from the current main deployment plus TH13, the rebuilt frontend and test-specific relay settings. [Assembly](assemble-test.mjs) verifies baseline file identities, including the routinely regenerated `sync-version.json` marker as a bounded exception, before constructing a newly verified release.

The live [test publication](https://test.touhou.vip/) contains 20 Runtime groups: all main-site generations at composition time plus TH13. [Deployment receipt](deployment-receipt.json) records the unchanged main-site publication and preserved test relay. [HTTP acceptance](public-http.json) hashes the selected entries for all groups and the complete TH13 program set, and checks Japanese DATA/music/shared-font Range requests. [Browser acceptance](browser-acceptance.json) covers import, title/stage entry, enabled BGM, and the five native classic links on desktop and mobile.

The [subtree export](subtree-verification.json) preserves the original TH13 source ancestor and exactly matches the current source tree. The import point is linear so standard subtree exclusions cover both parents of the preceding main merge. Structural commit messages use LF bytes; implementation commits do not inherit control trailers.

The [complete source-history gate](source-history-verification.json) verifies 13 retained source anchors and the TH12, TH12 multiplayer, TH13, and TH15 multiplayer standard subtree exports against the integration base. The exported TH13 tree and ancestor match the direct Windows command. The gate uses the exact source commit bundle on the native Linux host.
