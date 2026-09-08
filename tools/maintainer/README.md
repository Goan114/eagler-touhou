# Maintainer-only operational probes

This tracked directory contains public, stateless tool source and redacted
templates. It must never contain credentials, private game resources, real
server configuration, generated delivery archives, logs, or acceptance
evidence.

These commands exercise project-maintainer infrastructure that the repository
cannot reproduce hermetically. They intentionally live outside the portable
product/build CLI in `scripts/`, are not part of `npm run check`, and are not a
supported hoster deployment surface.

- `verify-public-relay-fallback.mjs` checks public WebSocket relay fallback.
- `verify-public-targeted-relay.mjs` checks targeted public relay routing.
- `verify-public-turn-quality.py` measures a caller-supplied public TURN target.
- `verify-thcrap-real.mjs` checks the current workspace's real thcrap toolchain.

They intentionally have no npm aliases. Maintainers invoke the required file
directly with an explicit target and record the target, time, and release
identity outside the source tree when the result is release evidence. A passing
probe proves only the target and conditions actually exercised; it is not a
repository-core, browser-device, or public-release acceptance result.

`operator-delivery/` likewise contains only the public template and capability
profile used to build an operator bundle. The generated bundle may contain a
Hosted site's legally owned game resources and must be written outside the
repository, transferred privately, and never committed.
