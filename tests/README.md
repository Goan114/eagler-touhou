# Tests

Automated tests and reusable test fixtures belong here. `scripts/` is reserved
for build, packaging, serving, verification and maintainer command entrypoints;
tests are not kept there as historical compatibility paths.

The default gate is declared once in `test-plan.mjs` and executed by
`scripts/check.mjs`:

- **repository core** - deterministic, standalone-clone, no browser, no public
  network, no private original resources, no tracked-file mutation;
- **workspace integration** - explicit sibling-repository/private-fixture
  integration in addition to repository core;
- browser, full media conversion, device, remote-network and formal-release
  lanes remain explicit commands and are intentionally not hidden inside the
  edit-loop gate.

Tests should assert observable module/artifact/runtime behavior. Source-text,
CSS-pixel and implementation-order assertions are migration evidence only
unless the text itself is the stable public format being tested.

Every recursively discovered `tests/**/test*.mjs`, `tests/**/test*.py` or
`tests/**/test*.ps1` entrypoint must be owned either by `test-plan.mjs` or by
an explicit `package.json` command. `test-test-ownership.mjs` enforces that
closure so experiments cannot silently accumulate as apparently official
tests. Direct test entrypoints use the `test*` naming convention; descriptive
non-`test*` files under `tests/browser/` are helpers/orchestrators reached from
an owned entrypoint rather than independent lanes.

Tests already scheduled by `test-plan.mjs` are intentionally not mirrored
one-for-one as npm scripts. For a focused run, invoke the owning test file
directly with Node, Python, or PowerShell. `package.json` test commands are
reserved for stable aggregate entrypoints and explicit browser, device, or
deployment lanes that deliberately remain outside the default plan.

Browser lanes must state whether they are hermetic, workspace-dependent,
device-backed or remote. Public Relay/TURN probes and other live operational
checks belong in `tools/maintainer/`, not here. Fixed screenshots, local CDP
profiles, one-machine timings and investigation transcripts are evidence for a
specific run and should be stored outside the public source tree.

`npm run test:legacy-mount-retirement:browser` is hermetic. It installs a
cache-first Worker at the former `/eagler-touhou/` scope, switches the server
to the retirement Worker, and verifies that a controlled legacy page reaches
`/` with the obsolete registration removed.

`npm run test:origin-migration:browser` is hermetic and Chromium-backed. It
creates separate synthetic HTTP and HTTPS origins, seeds conflicting settings
and TH07/TH08 save databases, then verifies that only explicitly selected
owners are overwritten while non-conflicting TH06 data migrates automatically.
