import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [config, lib, bootstrap, template, verify] = await Promise.all([
  read("deploy/linux-first-install/config.env.example"),
  read("deploy/linux-first-install/lib.sh"),
  read("deploy/linux-first-install/bootstrap-host.sh"),
  read("deploy/linux-first-install/nginx-site.conf.template"),
  read("deploy/linux-first-install/verify-host.sh"),
]);

assert.match(config, /^HSTS_MODE=disabled$/m,
  "first-install must default to the migration-safe non-HSTS state");
assert.match(lib, /case "\$HSTS_MODE" in disabled\|final\)/,
  "deployment config must reject unknown HSTS lifecycle states");
assert.match(template, /@@HSTS_HEADER@@/,
  "Nginx template must expose one explicit HSTS policy insertion point");
assert.match(bootstrap, /HSTS_MODE" == final[\s\S]*Strict-Transport-Security "max-age=31536000" always/,
  "final mode must render the one-year HSTS header");
assert.match(verify, /HSTS_MODE" == final[\s\S]*Strict-Transport-Security: max-age=31536000/,
  "host verification must require HSTS in final mode");
assert.match(verify, /HSTS must remain disabled during the old-origin migration window/,
  "host verification must reject HSTS during migration mode");

console.log(JSON.stringify({ hstsLifecycle: "PASS", modes: ["disabled", "final"], maxAge: 31536000 }));
