<div align="center">
  <img src="docs/assets/eagler-touhou-wordmark.svg" alt="EAGLER TOUHOU" width="312">
  <p><a href="README.md">简体中文</a> | English</p>
  <p>A <strong>game launcher</strong> and <strong>multiplayer platform</strong> for running original Touhou Project games on the Web.</p>
  <p>
    <a href="https://qm.qq.com/q/lNOiECzKFi?from=tim"><img src="https://img.shields.io/badge/QQ%20Group-1121412929-12B7F5?logo=tencentqq" alt="QQ Group 1121412929"></a>
    <img src="https://img.shields.io/badge/Node.js-%3E%3D22-43853d" alt="Node.js >=22">
    <img src="https://img.shields.io/badge/Python-3-3776ab" alt="Python 3">
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-GPL--3.0--or--later-blue.svg" alt="License: GPL-3.0-or-later"></a>
  </p>
  <p><a href="https://github.com/YomotsuHisami/eagler-touhou/blob/main/docs/README.md">Documentation 📄</a>&nbsp;|&nbsp;<a href="https://touhou.vip/">Play Now 🎮</a></p>
</div>

## Overview

While preserving the original game experience, Eagler Touhou provides touch controls with customizable layouts, thprac integration, multilingual support based on thcrap, save and Replay management, and a multiplayer lobby.

In a secure context, the Launcher **can run offline**. If the player goes offline or the server is unavailable, Service Worker caches allow installed games to keep working even after the page is refreshed.

## Features

### The Complete Original Game Experience

- Run TH06 and TH07 in the browser, with TH08 currently a work in progress. The Launcher provides interfaces for importing and exporting saves, Replays, and other files.
- Saves and Replays are fully interoperable with the original games.
- Aims for a polished experience. It fixes numerous issues inherited from the original portable branches, including jittery bullets, uneven bullet movement, flickering, music stutters when switching tracks in single-threaded mode, and poor performance on phones.
- Highly optimized: it can sustain 90 Hz on at least a Snapdragon 660.
- Supports refresh rates above 60 Hz. \[Thanks to [reallyportable](https://github.com/some100/th07/tree/reallyportable)\]

### Touch Controls

- Your touch path becomes the player's movement path. Available movement methods include Touch, Touch (cheat, unlimited speed), Joystick, and more. \[Thanks to [reallyportable](https://github.com/some100/th07/tree/reallyportable)\]
- Customizable touch layouts. Touch buttons can be freely moved and scaled from 60% to 180%.
- A Magnifier lets players zoom the game viewport at any time with a two-finger gesture. No more losing bullets because they are too small to see (x
- Touch Replays preserve the touch trajectory actually sent to the game.
- Menu gestures: swipe to move the selection cursor, tap to confirm, and tap with two fingers to go back. \[by [reallyportable](https://github.com/some100/th07/tree/reallyportable)\]
- Adjustable touch sensitivity.
- Adjustable default game viewport position.
- Multiple Focus methods, including hold, toggle, and two-finger controls.

### thprac Integration

- Supports every feature provided by [thprac](https://github.com/touhouworldcup/thprac).
- Touch devices can use mouse emulation, with virtual buttons for opening the Tab Tracker and cheat menu. (If you need the F12 menu, tell us why.)

### Languages

- In theory, every language pack in the [thcrap language repository](https://srv.thpatch.net/) is supported.
- Servers can choose which language packs to offer for each game. You can throw in a whole pile of unusual language packs; players download only the one they select.

### Multiplayer Lobby

- Provides TH06MP and TH07MP, both based on the [TH07MP rules](https://github.com/sbrik1111/th07_multi_player).
- The lobby supports room creation, joining by room code, character and difficulty selection—including Extra and Phantasm—ready checks before the game starts, and spectators.
- Restart a run by pressing R while paused or by using the restart control.
- Multiplayer Replays can be saved.
- Uses WebRTC whenever possible, with WebSocket Relay as a fallback.
- Spectators do not occupy player seats and can only watch rather than affect game state, but they cannot join midway through a game.
- Single-player and multiplayer saves and Replays are isolated. Settings may still be shared.

### Game Packages and Offline Play

- Install game packages from the site or import a ZIP containing a legally owned copy of the game.
- Installed packages remain in the browser. Game data, OGG music, fonts, and language packs can be managed independently, while Runtime components are provided by the site.
- In secure contexts such as HTTPS or a trusted loopback address, installed games and the Launcher can run offline.
- Original game data imported by the player is never uploaded to the server; it remains in the browser.

## License

Licensed under the [GNU General Public License v3.0 or later](LICENSE).

Complete third-party source, asset attribution, and licensing information is available in [THIRD_PARTY.md](THIRD_PARTY.md) and [ASSETS.md](ASSETS.md).
