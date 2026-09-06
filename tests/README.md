# Tests

New automated tests and reusable fixtures belong here. Existing historical
`scripts/test-*` entry points are migrated only when they are substantively
touched; moving files by itself is not a quality improvement.

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

