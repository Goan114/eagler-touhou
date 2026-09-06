# Engineering audit

This document tracks repository and build-system debt that affects public
maintainability, reproducibility, CI trust, and release safety. It is not a UI
wishlist and it is not a list of gameplay bugs.

## Severity A - public-project blockers

### CI did not run the real repository gate

- `eagler-touhou/.github/workflows/publication-audit.yml` previously ran only
  JavaScript syntax for `app.js`, a DOM source check, and publication audit.
- The local `scripts/check.mjs` covered much more, but was not standalone and
  depended on sibling repositories/private development content.
- Result: CI and local "full check" proved different things.

Status: **partially fixed**. `npm run check` is now a standalone repository
gate and GitHub Actions invokes it. `npm run check:workspace` is the explicit
cross-repository integration tier.

### Generated Service Worker lived in the source tree

- The repository historically tracked both `app-shell-sw-src.js` and the
  generated `app-shell-sw.js`.
- Development serving and release assembly could therefore produce different
  manifests with the same filename, creating two plausible publication
  sources for one artifact.

Status: **fixed**. Generated Service Worker output no longer belongs to the
repository source manifest. `lib/app-shell-build.mjs` is the single builder;
the development server serves its result from memory, formal assembly writes it
only into the target deployment, and `build-app-shell.mjs --check` is
non-mutating.

### Syntax coverage was a hand-maintained allowlist

- `scripts/check.mjs` listed individual JS/Python files manually.
- New files such as Runtime Release tooling could exist without being syntax
  checked until somebody remembered to edit the list.

Status: **fixed**. repository source syntax is discovered automatically, with
generated/vendor/private directories excluded explicitly.

### Core checks depended on sibling repositories

- Several Launcher tests read `../th06-eagler`, `../th07-eagler`, and
  `../th08-eaglertemp` directly.
- The development catalog also hashes sibling Runtime/DATA/music files.
- A standalone clone therefore could not reproduce the old `npm run check`.

Status: **fixed at the gate boundary**. Such checks are no longer part of the
standalone repository gate. Cross-repository checks are explicit workspace
integration.

### TH06 CI is stale and does not protect the active branch

- The active branch is `eagler`.
- `.github/workflows/ci.yml` targets `master` only.
- The workflow still invokes `scripts/create_devenv.py` and `scripts/build.py`,
  which do not exist in the current tracked tree.

Status: **open**. Do not repair this by merely adding the `eagler` branch; the
workflow needs replacement by a repository-owned Web/ordinary/MP CI entry.

### TH07 has no repository CI

- There is no tracked `.github/workflows` directory in the current TH07 tree.

Status: **open**.

### Public licensing is undefined for the Launcher repository

- `eagler-touhou` has no `LICENSE`/`COPYING` file and no package license field.
- `NOTICE.txt`, `THIRD_PARTY.md`, and copyright disclaimers do not grant a
  license for project-owned source code.

Status: **human decision required**. Do not invent a license automatically.

### Public resource policy is internally contradictory

- README says original game data/music are not in the public repository.
- `ASSETS.md` explicitly identifies `th06-title00.jpg`, `th07-title00.jpg`,
  `th08-title00.png`, and `th06.ico` as original-game-derived artwork.
- `audit-publication.mjs` currently allowlists those files as reviewed public
  artwork instead of treating them as original-resource-derived inputs.

Status: **open policy mismatch**. GitHub Runtime Release artifacts already have
the stronger boundary: HTML/JS/WASM only. Source/public-frontend artwork policy
must be reconciled separately.

## Severity B - architecture and maintainability

### Source-shape assertions have replaced behavior tests in many areas

- `scripts/test-*.mjs` currently contain hundreds of `assert.match` /
  `assert.doesNotMatch` assertions.
- Examples freeze exact HTML ordering, exact CSS pixel values, function text,
  implementation comments, and relative source ordering.
- `test-touch-contract.mjs` is roughly 145 KiB / 1200+ lines and mostly checks
  source text across TH06/TH07 rather than invoking a stable interface.

Status: **open; removed from the default core gate where possible**. Keep old
source-shape tests as migration evidence until equivalent behavioral tests
exist, but do not treat visual/source layout as a universal release blocker.

### Test ownership is split across multiple manual registries

- `package.json`, `scripts/check.mjs`, and GitHub Actions historically carried
  independent test lists.
- This caused silent coverage drift.

Status: **fixed for the active automated gate**. GitHub Actions delegates to
`npm run check`, while `tests/test-plan.mjs` owns repository/workspace test
membership. Browser, release and remote lanes remain explicit commands rather
than hidden second registries.

### `scripts/` is a flat mixed-responsibility directory

It currently mixes:

- build and packaging,
- release and verification,
- browser/WebKit/BrowserStack runners,
- multiplayer tests,
- thcrap tooling,
- font tooling,
- migration utilities,
- debugging and one-off probes,
- Touhou archive/ANM format code.

Status: **partially fixed**. Reusable maintainer-only Node contracts have moved
to `lib/`, including workspace topology, Runtime build profiles, Runtime DATA
layout/provider, Runtime Release, release planning, publication/content
contracts, development Host Manifest construction and frontend packaging
ownership. The two site-font subset builders now derive their browser text
source inventory from `APP_SHELL_FILES` instead of carrying separate frontend
file lists. Browser URL modules deliberately remain at stable root paths when
they are actual product surfaces. The remaining `scripts/` directory still
needs lane-oriented grouping; do not mass-move entry points without caller
coverage.

### Root directories mix source with development state

Observed local state includes logs, server PID/log files, multiple archive
roots, nested artifact roots, screenshots, generated releases, and ad-hoc test
outputs. TH06/TH07 also accumulate multiple `build-web-*` directories; TH08
places many `*-smoke-runner.cjs` files at repository root.

Status: **partially fixed**. The tracked/generated root `games.json` development
artifact has been removed; development metadata is now built through a module
owner and served through canonical Host Manifest / Release Catalog endpoints.
Ignoring files is still not a substitute for a defined output layout, and the
remaining build/test output should converge on one ignored root per repository.

### Quick Host Kit previously copied a broad source-tree slice

The Host Kit used to copy every repository file under broad directory prefixes
such as `scripts/`, `lib/`, `server/` and `deploy/`. That made an operator-facing
artifact inherit maintainer tests, browser runners, diagnostics and unrelated
npm dependencies even though the supported product surface is only `npm run
host` / `npm run import`.

Status: **fixed**. `lib/host-kit-manifest.mjs` is now the single file-ownership
contract for the distributable Host Kit. The kit has its own minimal locked npm
package, and a contract test rejects undeclared relative imports, undeclared
bare npm dependencies and maintainer/test files crossing the product boundary.

### No CMake Presets; canonical build-profile owner now exists

- TH06, TH07, and TH08 have no `CMakePresets.json`.
- TH06/TH07 Web flags are duplicated between development and deployment
  PowerShell scripts.
- Normal/MP/thcrap/thprac/external-assets differences are partly encoded in
  script branches and build-directory names.

Status: **partially fixed**. `config/runtime-builds.json` plus
`lib/runtime-build-profiles.mjs` are now the single Runtime build-policy owner,
and PowerShell build/deploy paths consume the resolver. CMake Presets are still
absent and existing build-directory names remain operational details.

### Launcher source has become monolithic

- `app.js` is roughly 370 KiB.
- `styles.css` is roughly 150 KiB.
- Compatibility, storage, package install, release catalog, multiplayer lobby,
  diagnostics, touch UI, and migration logic remain coupled in the same main
  module.

Status: **partially fixed**. Extract by stable ownership/contract, not by
arbitrary file size. `remote-metadata.mjs` is the first such extraction: it owns
independent Host Manifest / Release Catalog retrieval and has behavior tests for
one-sided failure. The remaining source-shape tests must not dictate future
module boundaries. The obsolete `test-local-launcher-contract.mjs` regex bundle
has been retired after its responsibilities were split across focused App Shell,
Package, Runtime DATA and remote-metadata contracts.

### Compatibility code has no explicit retirement/ownership boundary

- `app.js` contains legacy manifest, old complete-pack, HTTP migration, old
  storage, and old-browser compatibility paths in the same module.
- Some are still valuable; others are transitional.

Status: **substantially fixed with an explicit compatibility boundary**. New
package production is exclusively Package Descriptor / Package ZIP. The old
`game-data-pack/1` and `offline-game-pack/1` formats are read-only acquisition
formats owned by `legacy-game-pack.mjs`; their producer is gone, and modern
Package ZIP depends directly on the neutral `stored-zip.mjs` parser. New legacy
ZIP imports are adapted immediately into Package Store by
`legacy-package-adapter.mjs`; they no longer create legacy localStorage, Cache
Storage or custom-IDB state.

Historical browser import state is owned only by `legacy-import-storage.mjs`.
On startup it is one-way migrated into Package Store when complete; cleanup
occurs only after the Package transaction commits, and an already-current
migrated generation is cleaned without reinstalling. Failed or incomplete old
state is preserved for a later migration attempt, but Launcher/Runtime no
longer executes directly from that state. The former `game-data-import.js/.mjs`
module URLs and their duplicate ownership have been retired from the frontend
publication contract. Remaining retirement work is therefore policy/support
window work: eventually delete the bounded read/migration compatibility modules
once pre-Package-Store browser state no longer needs to be supported.

### Internal handoff documents are mixed with public documentation

- Tracked `docs/ios-runtime-webkit-handoff.md` contains internal workspace and
  deployment history alongside public engineering docs.
- README development topology is already stale (for example it still describes
  only the TH06/TH07 sibling layout in places).

Status: **open**. Separate public docs, engineering design docs, and historical
handoffs; keep README as current entry-point documentation only.

## Severity C - operational clarity

### Remote tests default to real project infrastructure

Some `scripts/test-*` / profiling commands default to `touhou.vip` or
`test.touhou.vip`. These are operations/remote diagnostics, not ordinary local
tests.

Status: **open**. Move them to an explicit remote/ops group and require an
explicit target URL for commands that can touch live infrastructure.

### Runtime Release exists and Host consumption is now verified

`lib/runtime-release.mjs` and `package-runtime-release.mjs` define an
all-product, original-resource-free Runtime artifact containing HTML/JS/WASM
and metadata only. `package-server.mjs` can consume it directly.

Status: **fixed for the verified TH06/TH07 integration path**. An integration
test first packages the all-product Runtime Release, then points
`EAGLER_WORKSPACE_ROOT` at an empty logical workspace and successfully assembles
and verifies a TH06/TH07 hosted site from Runtime Release + explicit original
inputs. Its Release Manifest records only Launcher source provenance. Formal
all-product release still additionally requires explicit TH08 original input;
source compilation remains a maintainer/developer fallback, not a host-user
requirement.

## Current gate policy

`npm run check`

- standalone repository syntax;
- App Shell generated-file freshness without mutation;
- deterministic repository-owned unit/format/package/release tests;
- repository publication audit.

This is the fast edit-loop gate. Independent syntax checks and deterministic
repo-local tests run with bounded parallelism; set `EAGLER_CHECK_JOBS=1` when
serial execution is needed for diagnosis. On the current development machine
the same core gate fell from about 12.8 s to about 7.2 s without dropping any
of its current checks.

`npm run check:workspace`

- everything above;
- development catalog against sibling Runtime/content;
- real TH06/TH07 shell protocol VM integration;
- local HTTP server integration;
- pure-Python Touhou format validation against available workspace fixtures.

Not part of the default gate:

- remote/live-server probes;
- visual/CSS layout locks;
- legacy source-shape assertions;
- tests requiring private game content unless invoked explicitly in workspace
  or release validation.

Long-running validation is intentionally opt-in. Full OGG baselines, browser
lifecycles, BrowserStack/real-device work, public-network probes, full Runtime
builds and formal release assembly must not be added to `npm run check` merely
to make the default PASS look stronger. Prefer caching/reuse/parallelism where
the expensive check is valuable, and document any remaining human-only game
acceptance path instead of replacing it with source-shape regexes.

