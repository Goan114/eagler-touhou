import assert from "node:assert/strict";

import { PRODUCT_GAMES } from "../lib/contracts/product-catalog.mjs";
import { normalizeMultiplayerLobbySnapshot } from "../.cache/build/browser/assets/launcher/multiplayer-lobby-snapshot.mjs";

const localClientId = "local_client_01";

const th06 = PRODUCT_GAMES.th06.multiplayer;
const th06Snapshot = normalizeMultiplayerLobbySnapshot({
  playerCount: 2,
  difficulty: th06.difficultyMax + 1,
  spectatorCount: -1,
  spectators: [
    { clientId: "watcher_client_02", name: "  观众\u0000甲  " },
    { clientId: "bad", name: "ignored" },
  ],
  seats: [
    { clientId: localClientId, name: " P1 ", loadout: th06.loadoutCount - 1, ready: true },
    { clientId: "remote_client_03", name: "P2", loadout: th06.loadoutCount, ready: true },
    null,
  ],
}, {
  localClientId,
  maxDifficulty: th06.difficultyMax,
  loadoutCount: th06.loadoutCount,
});

assert.ok(th06Snapshot);
assert.equal(th06Snapshot.difficulty, th06.difficultyMax);
assert.equal(th06Snapshot.seats[0]?.loadout, th06.loadoutCount - 1);
assert.equal(th06Snapshot.seats[1], null, "TH06 must fail closed on a TH07-only loadout index");
assert.equal(th06Snapshot.localSeat, 0);
assert.equal(th06Snapshot.localSpectator, false);
assert.deepEqual(th06Snapshot.spectators, [{ clientId: "watcher_client_02", name: "观众甲" }]);
assert.equal(th06Snapshot.spectatorCount, 1, "invalid negative count must not under-report the normalized list");

const th07 = PRODUCT_GAMES.th07.multiplayer;
const th07Snapshot = normalizeMultiplayerLobbySnapshot({
  playerCount: 3,
  difficulty: th07.difficultyMax,
  spectators: [{ clientId: localClientId, name: "Watcher" }],
  spectatorCount: 4,
  seats: [
    null,
    { clientId: "remote_client_04", name: "P2", loadout: th07.loadoutCount - 1, ready: false, offline: true },
    null,
  ],
}, {
  localClientId,
  maxDifficulty: th07.difficultyMax,
  loadoutCount: th07.loadoutCount,
});

assert.ok(th07Snapshot);
assert.equal(th07Snapshot.seats[1]?.loadout, th07.loadoutCount - 1);
assert.equal(th07Snapshot.seats[1]?.offline, true);
assert.equal(th07Snapshot.localSeat, null);
assert.equal(th07Snapshot.localSpectator, true);
assert.equal(th07Snapshot.spectatorCount, 4);

const inactiveSeat = normalizeMultiplayerLobbySnapshot({
  playerCount: 2,
  seats: [null, null, { clientId: localClientId, name: "P3", loadout: 0 }],
}, { localClientId, maxDifficulty: th07.difficultyMax, loadoutCount: th07.loadoutCount });
assert.ok(inactiveSeat);
assert.equal(inactiveSeat.localSeat, null, "inactive P3 must not become the local seat in a 2P room");

assert.equal(normalizeMultiplayerLobbySnapshot(null, {
  localClientId, maxDifficulty: th06.difficultyMax, loadoutCount: th06.loadoutCount,
}), null);

console.log(JSON.stringify({
  multiplayerLobbySnapshot: "PASS",
  productBounds: ["difficulty", "loadout"],
  identity: "shared-owner",
  inactiveSeat: "ignored",
}));
