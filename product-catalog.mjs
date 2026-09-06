export const HOST_PROTOCOL = "eagler-touhou/1";

// Product policy only: callers collect capabilities and installed/remote state.
// This function never persists a preference or installs Runtime resources.
export function resolveMusicMode({ requested = "ogg-stream", explicit = false,
  audio = true, midi = true, localOgg = false, remoteOgg = false, preferOgg = true } = {}) {
  if (!audio || requested === "none") return "none";
  const ogg = localOgg || remoteOgg;
  if (explicit && requested === "midi" && midi) return "midi";
  if ((requested === "ogg-stream" || requested === "ogg-full") && ogg) return requested;
  if (!explicit && ogg && preferOgg) return "ogg-stream";
  if (midi) return "midi";
  return ogg ? "ogg-stream" : "none";
}

export const PRODUCT_GAMES = Object.freeze({
  th06: Object.freeze({
    number: "06",
    title: "東方紅魔郷",
    subtitle: "the Embodiment of Scarlet Devil",
    storage: Object.freeze({
      saveRoot: "/savesth06",
      scoreFile: "score.dat",
      configFiles: Object.freeze(["東方紅魔郷.cfg", "th06.cfg"]),
    }),
    runtime: "./runtime/th06/th06.html",
    dataProvider: "emscripten-preload",
    package: Object.freeze({
      dataFileId: "game-data",
      dataTarget: "/th06.data",
      musicSourceDirectories: Object.freeze({ wav: "bgm", ogg: "bgm" }),
      musicMounts: Object.freeze({ wav: "/bgm", ogg: "/bgm" }),
    }),
    replay: Object.freeze({ prefix: "th6" }),
    multiplayerRuntime: "./runtime/th06/multiplayer/th06.html",
    multiplayer: Object.freeze({
      difficultyMax: 4,
      characterMax: 1,
      loadoutCount: 4,
      peerTransportGlobal: "__th06PeerTransport",
    }),
    features: Object.freeze({ thprac: true, replayManagement: true, languages: true, focusHitbox: true }),
  }),
  th07: Object.freeze({
    number: "07",
    title: "東方妖々夢",
    subtitle: "Perfect Cherry Blossom",
    storage: Object.freeze({
      saveRoot: "/savesth07",
      scoreFile: "score.dat",
      configFiles: Object.freeze(["th07.cfg"]),
    }),
    runtime: "./runtime/th07/th07.html",
    dataProvider: "emscripten-preload",
    package: Object.freeze({
      dataFileId: "game-data",
      dataTarget: "/th07.data",
      musicSourceDirectories: Object.freeze({ wav: ".", ogg: "bgm-ogg" }),
      musicMounts: Object.freeze({ wav: "/", ogg: "/bgm-ogg" }),
    }),
    replay: Object.freeze({ prefix: "th7" }),
    multiplayerRuntime: "./runtime/th07/multiplayer/th07.html",
    multiplayer: Object.freeze({
      difficultyMax: 5,
      characterMax: 2,
      loadoutCount: 6,
      peerTransportGlobal: "__th07PeerTransport",
    }),
    features: Object.freeze({ thprac: true, replayManagement: true, languages: true, focusHitbox: false }),
  }),
  th08: Object.freeze({
    number: "08",
    title: "東方永夜抄",
    subtitle: "Imperishable Night",
    storage: Object.freeze({
      saveRoot: "/savesth08",
      scoreFile: "score.dat",
      configFiles: Object.freeze(["th08.cfg"]),
    }),
    runtime: "./runtime/th08/th08-modern.html",
    dataProvider: "retail-memory",
    package: Object.freeze({
      dataFileId: "game-data",
      dataTarget: "/th08.data",
      musicSourceDirectories: Object.freeze({ ogg: "bgm-ogg" }),
      musicMounts: Object.freeze({ ogg: "/bgm-ogg" }),
    }),
    features: Object.freeze({ thprac: false, replayManagement: false, languages: false, focusHitbox: false }),
  }),
});

export function createLocalProductManifest() {
  return {
    protocol: HOST_PROTOCOL,
    shared: { resourceMode: "hosted" },
    games: Object.fromEntries(Object.entries(PRODUCT_GAMES).map(([game, product]) => [game, {
      ...product,
      music: { midi: { files: [] } },
      languageOptions: [{ id: "ja", title: "日本語(原版)", pack: null }],
    }])),
  };
}
