# Operations verification

This directory contains explicit maintainer probes for infrastructure that the
repository cannot reproduce hermetically. They are not part of `npm run check`
and must never carry a project-owned public endpoint as an implicit default.

- `verify-public-relay-fallback.mjs` checks public WebSocket relay fallback.
- `verify-public-targeted-relay.mjs` checks targeted public relay routing.
- `verify-public-turn-quality.py` measures a caller-supplied public TURN target.
- `verify-thcrap-real.mjs` checks the current workspace's real thcrap toolchain.

Run these through the matching `npm run verify:*` command. Record the supplied
target, time and release identity outside the source tree when the result is
release evidence. A passing probe proves only the target and conditions that
were actually exercised; it is not a repository-core, browser-device or public
release acceptance result.
