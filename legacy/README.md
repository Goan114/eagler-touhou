# Legacy import compatibility

This directory is the bounded read-only compatibility owner for two previously
published inputs:

- `eagler-touhou/game-data-pack/1` and
  `eagler-touhou/offline-game-pack/1` ZIPs;
- the `eagler-touhou-game-data-v1` Cache Storage and associated localStorage
  metadata written by older Launchers.

New imports and installations must use the Package Store. Legacy data is read
only to perform a one-way migration; a successful migration deletes the old
records, and no production path may create new records in these formats.

The compatibility owner may be retired only in a release that simultaneously:

1. raises the documented minimum supported upgrade baseline beyond every
   Launcher release that wrote these records;
2. provides a standalone export/recovery path for users who skipped that
   baseline; and
3. removes the startup migration call, the readers/adapters, and their tests in
   one reviewed change.

Until those conditions are met, these modules are compatibility code rather
than examples or a second package implementation.

## Short-revision Package Store upgrade window

Package ZIPs published before full per-file SHA-256 declarations may contain
only a 16-character file revision. When such an installed generation is
updated to a descriptor with the same revision and byte count, the installer
hashes the existing object once, reuses it only on an exact SHA-256 match, and
records that verified identity so another game can reuse identical content.
New descriptors and stored objects always carry full SHA-256 identities; this
path must not become an alternate producer format.

Retire this bridge after the minimum supported upgrade baseline is newer than
the last short-revision offline packages published before 2026-09-12 and one
normal release cycle has elapsed after that baseline. Retirement removes the
missing-hash branch and its regression fixture together; content-addressed
reuse of fully identified objects remains part of the Package Store.
