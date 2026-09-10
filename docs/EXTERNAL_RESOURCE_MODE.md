# External resource mode

`external` is the automatic remote-Package mode for a site that publishes the Launcher and every selected Runtime, but does not own or bundle the game-content payloads.

The three resource modes have distinct ownership:

| Mode | Launcher and Runtime | Game/shared payloads in deployment | Acquisition |
| --- | --- | --- | --- |
| `hosted` | published | published | automatic Package install |
| `external` | published | omitted | automatic Package install through same-origin resource routes |
| `import` | published | omitted | user-selected local Package |

An external site is derived from a verified hosted deployment. It copies the Host Manifest content identity and Package Descriptors, then republishes the selected Runtime HTML/JS/WASM and Launcher under a new release identity. The external candidate must not contain `games/**` or `shared/**` payload files.

Build with an explicit source, Runtime Release, output and authority-bearing profile:

```powershell
npm run package:external-site -- `
  --source=D:\path\to\verified-hosted-site `
  --runtime-release=D:\path\to\runtime-release `
  --output=D:\path\to\external-site `
  --profile=web-validation-external `
  --games=th06,th07,th08,th10 `
  --test-build=1
```

Package Descriptor `source` values remain safe relative URLs. The public web server must redirect those same-origin paths to the external resource origin. For example:

```nginx
location ^~ /games/ {
    return 307 https://cdn.touhou.vip$request_uri;
}

location ^~ /shared/ {
    return 307 https://cdn.touhou.vip$request_uri;
}
```

The CDN response must allow the Launcher origin through CORS. Redirected Range resources additionally require `206`, an exact `Content-Range`, and `Access-Control-Expose-Headers: Content-Range`. The App Shell Service Worker does not own these Package payloads.

The external build verifier checks the local delivery boundary: Runtime files and Package metadata are present, payloads are absent, and Package pointers, Descriptor revisions and declared byte identities are self-consistent. It does not contact the CDN or download every external payload. Public redirect, CORS, Range and real-browser installation are separate deployment gates.

The existing `externalImportSource` / `gameDataFallback` remains a manual fallback link. It is not the automatic `external` resource mode and is not used as the CDN origin.
