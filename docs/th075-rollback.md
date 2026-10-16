# TH075 rollback integration

The TH075 multiplayer product stays on `eagler-th075-mp`; the native Runtime
stays on the game's separate `eagler-mp` branch. Ordinary `eagler` is unchanged.

The existing room Rollback toggle is enabled by the product's P8 policy.
`rollbackDefault: false` preserves the prior pure-delay default on room creation
and restored invites. A host opting in starts direct D0/P8; pure delay keeps
manual D0..9 and automatic calibration. Character / first-spell / second-spell
indices and native Replay download remain unchanged.

Runtime options normalize pure delay to mode 1 / P0 and rollback to mode 0 /
P1..8. The relay room's prediction limit advertises the ceiling, so an envelope
may contain P8 while the pure-delay Runtime correctly receives P0. Spectators
accept the TH075-specific EPTM timing identity and consume confirmed input only.
Direct-mode measurement reports use mode 0, D0, reserve 0; P is a separate
Runtime window, not Adonis hybrid prediction reserve.

Validation: focused catalog/options/lobby tests, 51 service/selector tests,
Launcher build, and real release Runtime RTC/WebSocket matches with injected
input delay/loss, spectator hashes, restart, native Replay equality and IDBFS
persistence. Game details and community references are in its
`handoff/ROLLBACK.md`. The pre-existing broad pinned-main room-view authority
fixture still rejects TH075 catalog/i18n additions; its oracle is unchanged.
No site deployment is included in this source change.
