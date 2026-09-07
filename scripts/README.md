# Maintainer commands

`scripts/` contains executable maintainer/CI entrypoints. Reusable policy and
assembly logic should live in `lib/`; automated tests live in `tests/`.

The directory is intentionally flat by default. A subdirectory is introduced
only when it represents a real operational subsystem rather than merely a file
category. `ops/` is the current example: it contains live/public probes that
cannot be part of hermetic repository checks.

## Command families

- `build-*`, `prepare-*`, `subset-*`, `convert_*` - build/input preparation;
- `package-*`, `release.mjs` - artifact producers;
- `verify-*`, `audit-*`, `check.mjs` - verification and publication gates;
- `serve*.mjs` - local development/static serving;
- `resolve-*`, `inspect-*`, `list-*`, `write-*` - thin maintainer adapters;
- `ops/` - explicit public-network/live operational verification.

Prefer the stable npm entrypoints documented in the root README and
`docs/README.md` for normal workflows. Tests already scheduled by
`tests/test-plan.mjs` do not need one npm alias per file; focused maintainers can
run the owning test file directly.

If a script starts exporting reusable APIs or accumulating business policy,
move that reusable owner to `lib/` and keep the script as a thin CLI wrapper.
