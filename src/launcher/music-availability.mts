export type LauncherMusicMode = "ogg-stream" | "ogg-full" | "midi" | "none";

export interface MusicModeResolutionInput {
  requested?: string;
  explicit?: boolean;
  audio?: boolean;
  midi?: boolean;
  localOgg?: boolean;
  remoteOgg?: boolean;
  preferOgg?: boolean;
}

export function resolveMusicMode({
  requested = "ogg-stream",
  explicit = false,
  audio = true,
  midi = true,
  localOgg = false,
  remoteOgg = false,
  preferOgg = true,
}: MusicModeResolutionInput = {}): LauncherMusicMode {
  if (!audio || requested === "none") return "none";
  const ogg = localOgg || remoteOgg;
  if (explicit && requested === "midi" && midi) return "midi";
  if ((requested === "ogg-stream" || requested === "ogg-full") && ogg) return requested;
  if (!explicit && ogg && preferOgg) return "ogg-stream";
  if (midi) return "midi";
  return ogg ? "ogg-stream" : "none";
}

export interface InstalledMusicAvailability {
  revision?: unknown;
  oggFileIds: readonly string[];
  files: Readonly<Record<string, { objectId?: unknown } | undefined>>;
}

export interface EffectiveMusicModeInput {
  requested: string;
  explicit: boolean;
  audio: boolean;
  midiAvailable: boolean;
  importServer: boolean;
  publishedOggCapable: boolean;
  remoteOggAdvertised: boolean;
  remoteRevision?: unknown;
  installed?: InstalledMusicAvailability | null;
}

export function resolveEffectiveMusicMode({
  requested,
  explicit,
  audio,
  midiAvailable,
  importServer,
  publishedOggCapable,
  remoteOggAdvertised,
  remoteRevision = null,
  installed = null,
}: EffectiveMusicModeInput): LauncherMusicMode {
  let localOgg = false;
  let remoteOgg = false;

  if (installed && publishedOggCapable) {
    const ids = installed.oggFileIds;
    localOgg = ids.length > 0 && ids.every(fileId => !!installed.files[fileId]?.objectId);
    remoteOgg = !importServer && ids.length >= 2 && remoteRevision === installed.revision;
  } else if (!installed && !importServer) {
    remoteOgg = remoteOggAdvertised;
  }

  return resolveMusicMode({
    requested,
    explicit,
    audio,
    midi: midiAvailable,
    localOgg,
    remoteOgg,
    preferOgg: localOgg || (!installed && !importServer),
  });
}
