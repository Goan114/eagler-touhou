# Operator services

The Hosted site intentionally starts without a Netplay Relay endpoint.

## Relay

Install Node.js 22+, copy `services/relay/` to a private service directory, then:

```sh
npm --prefix /opt/eagler-touhou/services/relay ci --omit=dev
sudo cp services/relay/relay.env.example /etc/eagler-touhou/relay.env
sudo chmod 600 /etc/eagler-touhou/relay.env
sudo cp services/relay/eagler-netplay-relay.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now eagler-netplay-relay
```

Expose loopback port `18142` as WSS, then run both probes:

```sh
node services/verify/verify-public-relay-fallback.mjs wss://YOUR_DOMAIN/eagler-netplay/
node services/verify/verify-public-targeted-relay.mjs wss://YOUR_DOMAIN/eagler-netplay/
```

Only after both pass, configure the deployed site copy:

```sh
node services/configure-deployed-site.mjs --site=/var/www/eagler-touhou --relay=wss://YOUR_DOMAIN/eagler-netplay/
```

## TURN

TURN is optional but recommended for difficult NATs. Install coturn, copy and
edit `services/turn/turn.env.example`, and use the same shared secret for coturn
and Relay. The supplied renderer produces the coturn config. Firewall and cloud
security groups must allow the chosen TURN listener and relay port range.

## HTTPS migration

Use the migration-window Nginx example while browser data may still exist on
HTTP. When migration ends:

```sh
node services/configure-deployed-site.mjs --site=/var/www/eagler-touhou --origin-migration=disable
```

Then use the final HTTPS/HSTS example and run the matching verifier from
`services/verify/`.
