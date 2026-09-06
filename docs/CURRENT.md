# Current engineering rectification

Updated: 2026-09-05

This file is the short-lived execution ledger for the active repository
rectification. Long-lived rules belong in `docs/invariants/`, reusable practice
belongs in the shared playbooks, and completed evidence belongs in
`docs/agent/RECTIFICATION.md` / history-session.

## Active goals

- Make the repository understandable and reproducible as a public GitHub
  project, without preserving accidental local-workspace structure as API.
- Prefer behavior/artifact verification over source-shape locks.
- Keep the default edit-loop gate fast; long browser/media/release gates remain
  explicit.
- Make Runtime Release the normal host input; source compilation is a
  maintainer path.
- Remove duplicated build-policy ownership from PowerShell/JS/CI.
- Keep original-game-derived resources out of source/Runtime Release. Host
  assembly may derive optional UI assets from deployer-supplied originals.

## Completed in the current rectification slice

1. **Runtime build configuration**
   - `config/runtime-builds.json` is the versioned build-policy owner.
   - Runtime profiles reference logical workspace owners rather than repeating
     physical sibling directory names.
   - Developer and deployment PowerShell paths consume the same resolver.

2. **Host resource contract**
   - Final card assets are `th06-card.webp`, `th07-card.webp`,
     `th08-card.webp`.
   - Original title images are build inputs only.
   - Optional artwork/favicon failure must not become a game-content failure.
   - A Runtime-Release-backed TH06/TH07 Host was assembled and verified while
     `EAGLER_WORKSPACE_ROOT` pointed at a directory containing no game source
     repositories; Host provenance contained only the Launcher source.

3. **Repository structure / test ownership**
   - Maintainer-only Node contracts now live under `lib/`; browser URL modules
     keep their existing root paths.
   - Workspace topology has one owner in `config/workspace.json`, consumed by
     Node, Python and PowerShell adapters.
   - Frontend package/App-Shell files have one manifest owner.
   - `npm run check` and `npm run check:workspace` both pass after the moves.

## In progress

1. **scripts/ responsibility split**
   - Reduce the remaining flat `scripts/` mixed-responsibility surface only
     when callers are covered by stable entry points.
   - Continue replacing source-text assertions with executable module,
     artifact, browser, or semantic tests.
   - Add explicit local/workspace/release/remote lanes rather than one giant
     ambiguous test list.

2. **public repository cleanup**
   - Separate ignored local logs/reference screenshots/validation outputs from
     source-facing structure without deleting unrelated local evidence.
   - Keep README/deployment docs aligned with the Runtime-Release-first host
     model.

## Blocked only by product decisions

- Project-owned source license for `eagler-touhou` must be chosen by a human.

## Safety

- Preserve unrelated dirty work.
- No reset/clean/restore.
- No commit, push, publication, or deployment unless explicitly requested.

