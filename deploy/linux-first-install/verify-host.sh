#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"
CONFIG_PATH=${1:?usage: verify-host.sh CONFIG}
load_config "$CONFIG_PATH"

base=${ORIGIN_TEST_URL:-http://127.0.0.1:${ORIGIN_LISTEN##*:}}
curl_args=(-fsS --max-time 15 -H "Host: $SITE_HOST" -H 'X-Forwarded-Proto: https')
nginx -t
test "$(curl "${curl_args[@]}" -o /dev/null -w '%{http_code}' "$base/__eagler_origin_health")" = 204
headers=$(curl "${curl_args[@]}" -D - -o /dev/null "$base/package/package-store.mjs")
grep -qi '^Content-Type: application/javascript' <<<"$headers"
grep -qi '^Cache-Control: no-cache' <<<"$headers"
test "$(curl "${curl_args[@]}" -o /dev/null -w '%{http_code}' "$base/")" = 200
curl "${curl_args[@]}" "$base/deployment.json" | python3 -c 'import json,sys; d=json.load(sys.stdin); assert d["format"]=="eagler-touhou-deployment/1"; print({"resourceMode":d.get("resourceMode","hosted"),"files":len(d["files"])})'

plain_http=$(curl -sS --max-time 15 --max-redirs 0 -H "Host: $SITE_HOST" -D - -o /dev/null "$base/" || true)
grep -qi "^Location: https://$SITE_HOST/$" <<<"$plain_http"
migration_headers=$(curl -fsS --max-time 15 -H "Host: $SITE_HOST" -D - -o /dev/null "$base/migrate.html")
grep -qi '^Content-Type: text/html' <<<"$migration_headers"
grep -qi '^Cache-Control: no-cache' <<<"$migration_headers"
secure_headers=$(curl "${curl_args[@]}" -D - -o /dev/null "$base/")
if [[ "$HSTS_MODE" == final ]]; then
  grep -qi '^Strict-Transport-Security: max-age=31536000' <<<"$secure_headers" || {
    echo "HSTS_MODE=final but the HTTPS-facing origin response has no one-year HSTS policy." >&2
    exit 1
  }
else
  if grep -qi '^Strict-Transport-Security:' <<<"$secure_headers"; then
    echo "HSTS must remain disabled during the old-origin migration window." >&2
    exit 1
  fi
fi

if [[ "$RELAY_MODE" != disabled ]]; then
  status=$(curl -sS --http1.1 --max-time 5 -o /dev/null -w '%{http_code}' \
    -H "Host: $SITE_HOST" -H 'X-Forwarded-Proto: https' \
    -H 'Connection: Upgrade' -H 'Upgrade: websocket' \
    -H 'Sec-WebSocket-Version: 13' -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' \
    "$base/eagler-netplay/?room=bootstrap-probe&run=1&player=0&players=2&signal=1" 2>/dev/null || true)
  [[ "$status" == 101 ]] || { echo "WebSocket upgrade failed: HTTP $status" >&2; exit 1; }
fi

echo "Origin verification passed: $base (Host: $SITE_HOST)"
