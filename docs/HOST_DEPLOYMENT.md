# Host deployment

The public deployment model is deliberately small: Eagler Touhou generates a
complete static site, and the operator deploys that directory with their own
web server. The normal workflow never logs in to the operator's server and does
not modify nginx, systemd, firewall rules, certificates, or CDN settings.

## Persistent inputs

Keep these when updating the Host Kit:

```text
EaglerTouhou-Host/
├─ eagler-touhou.config.json
└─ games/
   ├─ th06/
   ├─ th07/
   └─ th08/
```

`games/` and `eagler-touhou.config.json` are the operator-owned persistent
inputs. `dist/site`, `dist/import-site`, and `dist/import` are disposable
outputs. Do not edit generated site files. Change `eagler-touhou.config.json` and
regenerate instead.

## Host configuration

The Host Kit includes `eagler-touhou.config.json`:

```json
{
  "schema": "eagler-touhou/host-config/1",
  "netplay": {
    "relay": "wss://relay.example.com/eagler-netplay/"
  },
  "externalImportSource": {
    "url": "https://downloads.example.com/touhou-packages",
    "hint": "Optional instructions or access code"
  }
}
```

Both values are optional.

- Missing `netplay.relay`: single-player works, multiplayer is disabled.
- Configured WebSocket relay with no verified TURN service: multiplayer works;
  WebRTC direct is attempted first and WebSocket relay remains the fallback.
- Missing `externalImportSource.url`: local package import still works, but the
  Launcher cannot show an administrator-provided package download link.

TURN credentials are never stored in the Host configuration. The relay server
may advertise STUN/TURN servers and short-lived TURN credentials during
signaling.

Run the local check at any time:

```text
npm run host:doctor
```

Python itself must be installed by the operator. The Host build manages only
its project-local Python packages. On Windows, the pinned thtk 12 build tool is
downloaded from the official upstream GitHub release, hash-verified, and kept
under `.cache/`; it is not included in the Host Kit or public site.

`.cache/generated/` also keeps expensive reproducible intermediates such as
prepared TH06/TH07 language packs and verified OGG output. This cache is
independent of `dist/`: deleting or replacing `dist/site` does not force those
items to be generated again. A rebuilt hosted site reuses valid cache entries
and regenerates only missing or invalid items. `dist/` remains disposable;
`.cache/` may also be deleted when a completely cold rebuild is desired.

## Generate a hosted site

```text
npm install
npm run host:build
```

Deploy the generated `dist/site` directory as a unit.

For local use:

```text
npm run host
```

This serves the same generated site on `127.0.0.1:8130`.

### App Shell / offline Runtime updates

`dist/site/eagler-touhou/app-shell-sw.js` is deployment-specific build output.
A complete Host build adds the published App-owned Runtime HTML/JS/WASM files
to its Workbox precache so an already-installed game can launch while the
device is offline. The repository no longer carries a generated
`app-shell-sw.js`; only `app-shell-sw-src.js` is source. Development serving,
Host assembly and deployment refresh all invoke the same App Shell builder.

If only Launcher/App Shell files changed and the existing generated site is
otherwise still the intended deployment, refresh its Workbox and integrity
metadata without rebuilding game assets:

```text
npm run refresh:deployment-app-shell -- dist/site
npm run verify:server -- dist/site
```

This operation does not regenerate DATA, OGG, language packs, fonts, or Runtime
binaries. It preserves existing deployment-specific precache additions and
requires every declared App Runtime HTML/JS/WASM file to remain available
offline.

## Generate Import artifacts

```text
npm run import
```

Quick Import reuses `dist/site` when it is still a verified hosted build for
the current Runtime Release, original game inputs, shared assets, and selected
music modes. If that hosted base is missing, invalid, or older than those
inputs, it is rebuilt automatically before Import packaging; that rebuild in
turn reuses valid `.cache/generated/` intermediates. Use
`deploy/Build-QuickImport.ps1 -RebuildHostedBase` only when you explicitly want
to force that regeneration.

It then produces:

```text
dist/import-site/
dist/import/th06.zip
dist/import/th07.zip
dist/import/th08.zip
```

The three ZIP files are generated from the same Package Descriptors as the
hosted site and are verified after creation. `dist/import-site` contains the
Launcher and App-managed Runtime but no hosted game payload.

## Web server example: nginx

`deploy/nginx-eagler-touhou.conf` is the single public server example supplied
by this project. Adjust its `root` and `server_name`, then configure TLS using
your normal nginx/certificate workflow.

The important properties are:

- `.wasm` is served as `application/wasm`;
- HTML and JSON revalidate instead of being cached forever;
- content-versioned static assets may be cached for a long time;
- the optional `/eagler-netplay/` block proxies WebSocket traffic to a local
  relay on `127.0.0.1:18142`.

If the relay is hosted on another origin, omit the nginx relay block and put
the external `wss://` URL in `eagler-touhou.config.json` before regenerating.

## WebSocket relay

The Host Kit includes the same relay implementation used by the verified TH06
and TH07 multiplayer path:

```text
npm run relay
```

By default it listens on `0.0.0.0:18142` and uses Cloudflare STUN. For a normal
public deployment, run it behind nginx/WSS and keep port 18142 private if
possible.

Common environment variables:

```text
TH07_RELAY_HOST=127.0.0.1
TH07_RELAY_PORT=18142
TH07_STUN_URLS=stun:stun.cloudflare.com:3478
```

The `TH07_` prefix is retained for compatibility with the existing verified
relay implementation; the service supports both TH06 and TH07 netplay.

## Optional TURN

TURN is recommended but not required. Without TURN, direct WebRTC is still
attempted and gameplay can fall back to the WebSocket relay.

For coturn using TURN REST-style temporary credentials, configure the relay
with the same shared secret used by coturn:

```text
TH07_TURN_URLS=turn:turn.example.com:3478?transport=udp,turn:turn.example.com:3478?transport=tcp
TH07_TURN_SHARED_SECRET=<random-secret>
TH07_TURN_TTL_SECONDS=3600
```

Keep the shared secret on the server. The browser receives only short-lived
credentials generated by the relay.

TURN normally also requires the coturn listening ports, relay UDP port range,
public-IP/NAT mapping, and firewall configuration appropriate for that server.
Those settings are infrastructure-specific and are intentionally not modified
by the Host Kit.

## Updating

Updates are rebuilds, not patches:

1. Download the newer Host Kit.
2. Preserve `games/` and `eagler-touhou.config.json`.
3. Run `npm install`.
4. Run `npm run host:build` or `npm run import`.
5. Replace the deployed generated directory with the newly verified output.

The same procedure can be used to roll back with an older Host Kit.
