# Eagler Touhou Linux first-install kit

This directory is the host-side half of a deployment bundle. It supports an
empty Ubuntu 22.04/24.04 host as well as repeat deployments to an existing
host.

The deployment model is:

- the CDN terminates public HTTPS and forwards HTTP to the origin;
- ordinary public HTTP navigation is sent to the HTTPS Launcher without a
  migration marker; migration is an explicit action from the Launcher so a
  normal bare-domain visit cannot be mistaken for migration intent;
- the exact HTTP `migrate.html` URL remains reachable to read old-origin
  browser data;
- Nginx serves `releases/<release-id>` through an atomic `current` symlink;
- `/eagler-netplay/` can proxy to a local or remote WebSocket service;
- coturn can run locally, or TURN can remain on a separate host;
- only the current release and a bounded number of prior releases are kept.

The bundle must contain these top-level directories:

```text
installer/  # this directory
site/       # output of Prepare-eagler-touhou-server.ps1
relay/      # product-catalog.mjs + server/ relay/coturn modules + node_modules/ws
runtime/    # official Linux x64 Node LTS archive for local relay mode
```

## Build the application publication on Windows

For an origin that does not provide game content, build `import`; players then
obtain game-content packages from the separately managed download/CDN location.
The Launcher and its App-managed Runtime still belong in `site/`.

First copy `server-features-import.example.json` to a deployment-private
configuration and add the real HTTPS `gameDataFallback.url` for the CDN/game
package download page. Do not put provider credentials in that file.

```powershell
pwsh -NoProfile -File .\deploy\Prepare-eagler-touhou-server.ps1 `
  -OutputDirectory .\artifacts\server-site `
  -FeatureConfig .\artifacts\server-features-production.json
```

Use the repository's existing verifier before making the bundle. The installer
does path and HTTP checks on the host, but deliberately does not introduce a
second content-identity scheme.

Create the transport bundle with an official Node 22 LTS Linux x64 archive:

```powershell
pwsh -NoProfile -File .\deploy\Build-LinuxFirstInstallBundle.ps1 `
  -SiteDirectory .\artifacts\server-site `
  -LinuxNodeArchive .\artifacts\node-v22.x-linux-x64.tar.xz `
  -OutputArchive .\artifacts\eagler-touhou-first-install.tar.gz
```

## First installation

Copy `config.env.example` to `config.env`, fill in the public host and relay
topology, then run as root from the extracted bundle:

```bash
sudo bash installer/bootstrap-host.sh ./config.env ./site
sudo bash installer/verify-host.sh ./config.env
```

The default profile assumes a CDN/proxy provides public TLS. If the CDN uses a
non-standard origin port, set `ORIGIN_LISTEN` accordingly and open that port
only to the CDN's published egress ranges in the cloud firewall.

Choose the netplay topology explicitly:

- `RELAY_MODE=external`: this origin only reverse-proxies `/eagler-netplay/`
  to another relay host. `RELAY_UPSTREAM` accepts `http://`, `https://`,
  `ws://`, or `wss://`; WebSocket schemes are normalized internally for
  Nginx while preserving the upgrade request. TURN/STUN for that relay belongs
  to the relay host's own configuration; this web origin does not need the
  TURN secret. `config.external-ws.example` is the clean profile for this case.
- `RELAY_MODE=local` + `TURN_MODE=external`: run the bundled signaling/WS relay
  locally, but advertise a separately managed TURN service. Supply either its
  REST shared secret or static test credentials as documented in `config.env`.
- `RELAY_MODE=local` + `TURN_MODE=local`: install the bundled relay plus coturn
  on the same machine. The installer generates a server-only REST secret when
  one is not supplied and writes the same secret to relay and coturn config.

`RELAY_MODE=disabled` is also available for a static-only host.

During the HTTP-to-HTTPS migration window, configure the CDN to pass
`X-Forwarded-Proto` and do not enable HSTS. Public HTTP requests redirect
cleanly to the normal HTTPS Launcher, while `http://HOST/migrate.html` remains
directly reachable with HTTP 200. Users start migration explicitly from the
HTTPS Launcher's 「存档恢复」 link. The migration page reads data in the old
HTTP Origin and transfers it to the HTTPS page with `postMessage`; a blanket
edge redirect or HSTS would make that data unreachable.

Keep `HSTS_MODE=disabled` for that window. After the migration capability has
been removed from the deployed Host Manifest, set `HSTS_MODE=final` and rerun
`bootstrap-host.sh` with the same site config. The generated Nginx site then
publishes `Strict-Transport-Security: max-age=31536000`. If a CDN terminates
TLS, verify that it forwards this response header to browsers. The default does
not opt into `includeSubDomains` or HSTS preload.

## Updates and rollback

```bash
sudo bash installer/deploy-release.sh ./config.env ./site
sudo bash installer/rollback-release.sh ./config.env
```

`deploy-release.sh` stages a complete new directory and changes `current` only
after local validation. `rollback-release.sh` switches to the immediately
previous release. Neither command edits the package files in place.

## Acceptance boundaries

`verify-host.sh` proves the origin route, MIME/cache policy, redirect behavior,
and WebSocket upgrade. For a public release, also verify through the real CDN,
then run the repository's browser TURN probe and real 2P progression test.
Nginx/WebSocket reachability alone is not proof that RTC/TURN gameplay works.

The provided builder requires an official Linux x64 Node LTS archive. It is
carried inside the deployment bundle together with the relay's `ws` dependency,
so first installation does not depend on the target distribution's often-old
Node package or on npm availability.

For local TURN, `TURN_LISTENING_PORT` controls the coturn UDP/TCP listener and
must match the port advertised in `TURN_URLS`. The installer rejects RFC 5737
TEST-NET example addresses in `TURN_EXTERNAL_IP` so a copied sample cannot
silently produce a non-routable TURN deployment.

Before ending the migration window, run:

```bash
node scripts/verify-origin-cutover.mjs http://HOST/ https://HOST/
```

After switching the deployment to `HSTS_MODE=final` and removing
`originMigration`, verify the real public edge from the repository checkout:

```bash
npm run verify:hsts-cutover -- http://HOST/ https://HOST/
```
