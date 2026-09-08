# eagler-touhou

[![CI](https://github.com/YomotsuHisami/eagler-touhou/actions/workflows/ci.yml/badge.svg)](https://github.com/YomotsuHisami/eagler-touhou/actions/workflows/ci.yml)
![Node.js >=22](https://img.shields.io/badge/Node.js-%3E%3D22-43853d)
![Python 3](https://img.shields.io/badge/Python-3-3776ab)

`eagler-touhou` 是一个在 Web 上运行东方 Project 原作移植版的启动器、浏览器本地游戏包管理器与自托管站点生成工具。

在保证原作体验的基础上，提供 触控适配 + 个性化布局、thprac 适配、多语言（基于 thcrap）、存档和 Replay 管理、多人联机大厅。
在安全上下文条件下，启动器网页**可以被离线运行**。在玩家离线或服务器宕机时，玩家即使刷新了页面也可以使用 Service Worker 提供的缓存文件正常进行游戏。

公开仓库不包含原版游戏数据、音乐、提取素材或用户存档。TH06 / TH07 是当前成熟 Runtime 路径，TH08 仍在持续完善。项目是非官方爱好者工程，与上海爱丽丝幻乐团、ZUN 及游戏发行方不存在隶属、授权、认可或赞助关系。

## 从这里开始

| 目标 | 入口 |
| --- | --- |
| 了解当前正式支持什么 | [Product surface](docs/PRODUCT_SURFACE.md) |
| 看模块、数据流、离线与发布架构 | [Architecture](docs/ARCHITECTURE.md) |
| 本地开发与验证 | [Development](docs/DEVELOPMENT.md) · [Contributing](CONTRIBUTING.md) |
| 用原版游戏目录生成可部署的自托管站点 | [Self-hosting](docs/SELF_HOSTING.md) |
| 自托管配置、Import、Relay / TURN 与 Web Server 要求 | [Self-hosting reference](docs/SELF_HOSTING_REFERENCE.md) |
| 正式 Release、HTTP→HTTPS / HSTS 与公网行为验证 | [Release engineering](docs/RELEASE.md) |
| 浏览全部工程文档和仓库目录职责 | [Documentation index](docs/README.md) |

README 只保留面向使用者和新贡献者的概览，不作为第二份架构或功能 contract。

## 详细功能

### 完整的原作体验，但是在浏览器运行

- 允许用户在浏览器中运行 TH06 和 TH07 (TH08 WIP），并提供导入导出存档、Replay 等文件的界面。
- 原版 `.dat` 存档和普通 `.rpy` Replay 走原版兼容路径；需要保存触控等扩展输入时使用独立的 `.rpyx` Replay 格式。
- 针对 portable 分支中实际观察到的弹幕抖动、运动不流畅、闪烁、音乐切换卡顿和移动设备性能问题做了专项修复与优化。
- 支持高刷新率显示，并对移动设备的帧调度、音频和渲染路径提供专项验证。
- 支持高刷新率（>60Hz）。[感谢 reallyportable]

### 触控适配

- 触摸轨迹就是游戏人物移动轨迹。提供直接触摸、无限速直接触摸，除此之外，还提供轮盘等移动方式。[感谢 reallyportable]
- 触控布局自定义。触控按键可以随意拖动、缩放（60% ~ 180%）。
- 提供放大镜，允许玩家在游戏中即时地用双指缩放手势去放大游戏画面。再也不怕看不清弹幕了（x
- 可以保存触控 Replay，并且直接记录输入到游戏里的触摸轨迹。
- 触控菜单手势。[by reallyportable]
- 触控灵敏度。
- 可以调整游戏画面的默认位置。
- 提供按住按钮、切换按钮和双指操作等低速方式。

### thprac 适配

- 提供 [thprac](https://github.com/touhouworldcup/thprac) 风格的关卡跳转、资源参数和练习 Replay 元数据等已记录子集；不宣称覆盖上游全部功能。
- 支持在触控设备上使用模拟鼠标，并提供打开 Tab Tracker 和作弊菜单的模拟按键。（你如果需要 F12 菜单的话，讲讲为什么。）

### 多语言

- 支持经本项目适配器验证的 [thcrap 语言仓库](https://srv.thpatch.net/) 语言包；具体兼容范围以 Host 提供的语言目录为准。
- 服务器可以按作品指定语言包。你可以往里面加一堆奇怪的语言包，玩家只下载他选中的那个。

### 多人联机大厅

- 提供 TH06MP 和 TH07MP，均基于 [TH07MP 的规则](https://github.com/sbrik1111/th07_multi_player)。[感谢 th07mp]
- 提供了一个大厅，支持创建房间后输入房间号加入、选择角色和难度（包括 Extra 和 Phantasm）、玩家都准备后再开始、旁观者。
- 支持暂停后按 R 或者手动重开本局。
- 可以保存多人 Replay。
- 优先使用 WebRTC，也可以通过 WebSocket Relay 连接。
- 支持旁观。旁观者不占玩家席位，只能观看，不会参与游戏状态（但不能中途进入旁观）。
- 单人和多人的存档和 Replay 相互隔离，不过允许共用设置。

### 游戏包与离线运行

- 网站可以只提供启动器和运行组件，玩家自行导入合法持有的游戏文件；
- 远程安装和本地 ZIP 导入使用同一套游戏包描述；
- 游戏包安装后保存在浏览器本地；DATA 和 Package Descriptor 声明的可选组件由 Package Store 管理，Runtime HTML / JavaScript / WebAssembly 仍由站点的 Runtime Release 提供；
- 在 HTTPS 或可信 loopback 等安全上下文中，已经安装的游戏和启动器可以离线运行；
- 服务器可以选择完整托管、仅提供网页并强制本地导入，或只提供少量运行时更新；
- 服务器也可以提供外部游戏数据下载地址，网页只打开链接，不会自动下载第三方 ZIP。

玩家导入的原版游戏数据不会上传服务器。游戏包功能只负责在浏览器本地保存和管理这些内容。

## 使用方式

### 使用已部署的网站

1. 在启动页选择 TH06、TH07 或对应的多人模式。
2. 如果服务器提供游戏包，按提示安装；如果服务器采用本地导入模式，选择自己的游戏包 ZIP 导入。
3. 在游戏设置中选择输入、音乐、语言、触控和练习选项。
4. 单人模式直接启动；多人模式创建房间或输入房间号加入，也可以在开始前选择旁观。
5. 通过 Replay 管理器导入、导出和播放 `.rpy`、`.rpyx` 或 `.zip`。

原版游戏数据、音乐和语言包不包含在公开源码仓库中。使用者必须合法持有对应游戏，并仅可在个人、非商业环境中用于怀旧与研究；网站部署者只能发布自己有权发布的内容。

### 本地运行启动器

需要 Node.js 22 或更新版本。使用锁文件安装依赖并启动开发服务器：

```powershell
npm ci --ignore-scripts
npm run vendor
npm start
```

然后打开 `http://127.0.0.1:8130/`。不能直接双击 `index.html`，因为游戏运行时、WASM、浏览器存储和跨页面通信都需要 HTTP(S) 环境。

本地可玩构建还需要 CMake、Ninja、Emscripten SDK、Python 3，以及合法持有的 TH06 / TH07 游戏文件。完整构建说明见[开发说明](docs/DEVELOPMENT.md)。

## 自托管

普通自托管只需要 Node.js 22+、Python 3、一个经过验证且不含原版资源的 `runtime-release/`，以及部署者合法持有的 TH06 / TH07 / TH08 原版目录。公开自托管入口由 Node 驱动，不要求 PowerShell、CMake、Ninja、Emscripten 或 Runtime 源码仓库。

固定输入布局是 `runtime-release/`、`games/th06`、`games/th07`、`games/th08` 和可选的 `eagler-touhou.config.json`。运行：

```text
npm run host:build   # 生成并验证 dist/site
npm run host         # 生成同一站点后在 127.0.0.1:8130 本地提供服务
npm run import       # 生成 import-only 站点和三作可导入 ZIP
```

首次缺少锁定 Node 依赖时 Host 会自动执行 `npm ci`；Python 构建依赖安装在自托管根目录的 `.cache/python/`。Windows 上 thtk 12 从官方 release 下载并校验 SHA-256；其它平台使用 PATH 中的 `thdat` / `thmsg`。详见 [Self-hosting](docs/SELF_HOSTING.md)。

部署者可以选择两种资源模式：

- `hosted`：服务器提供启动器、运行组件和由部署者生成的游戏资源；
- `import`：服务器提供启动器和运行组件，玩家自行导入完整游戏包；该模式不发布游戏内容、Runtime 更新或 Release Catalog 条目。

Runtime Release 只包含本项目可分发的 HTML / JavaScript / WebAssembly 与资源布局元数据，不包含 `.data`、原版 `.dat`、原版音乐、从原作提取的卡图/图标或其它原作资源。缺少非必要 UI 素材时只降级对应界面功能，不应使游戏内容部署整体失败。

生成离线游戏包：

```powershell
npm run package:offline-game -- D:\Sites\eagler-touhou th06
npm run package:offline-game -- D:\Sites\eagler-touhou th07
```

站点可以配置语言包、`thprac`、外部游戏数据备用地址和 WebSocket Relay；TURN 由联机服务自行管理。完整的资源模式、语言包、缓存、HTTP → HTTPS 数据迁移和服务器行为要求见[自托管参考](docs/SELF_HOSTING_REFERENCE.md)与[Release engineering](docs/RELEASE.md)。

正式站点应使用 HTTPS，并正确提供 `.wasm`、JavaScript、字体和音频的 MIME 类型。发布时应先生成并验证完整目录，再以原子方式切换版本，避免玩家拿到互不匹配的 HTML、JS、WASM 或 DATA。

## 开发与验证

只有维护者需要完整源码工作区。工作区物理目录名由 `config/workspace.json` 统一声明；当前默认拓扑为：

```text
workspace/
├─ eagler-touhou/
├─ th06-eagler/
├─ th07-eagler/
├─ th08-eaglertemp/
├─ thprac-reallyportable/
├─ dependencies/
└─ toolchains/
```

TH06 / TH07 Runtime 源码仓使用各自的维护分支；TH08 和 thprac 也由同一 workspace owner 解析。宿主不链接游戏源码。普通 Host 部署消费 Runtime Release；只有 Runtime Release 生产者或开发者才需要这些 sibling 源码仓和构建工具链。

常用检查：

```powershell
npm run check
npm run check:workspace
npm run test:runtime-release-host
npm run test:shell
npm run test:server
npm run audit:publish
```

### 故障排查：声音和输入初始化后游戏立即退出

如果日志显示 DirectSound、DirectInput 已初始化，随后提示声音、纹理或动画文件找不到，通常是运行时没有取得原版游戏档案，而不是声音或输入设备故障。

公开源码检查构建不含游戏资源，只能使用 `build-web-eagler-external`；本地可玩构建必须使用 `-EmbedLocalAssets` 生成 `build-web-eagler-default`。不得在同一 CMake 构建目录中切换 `TH_EXTERNAL_ASSETS`。

运行时、多人、Replay、触控、游戏包和站点测试见 `tests/`。新的专用 Browser test entrypoint / runner 归入 `tests/browser/`；部分既有显式 Browser lanes 仍保留在 `tests/` 根目录，等待一次完整的测试布局迁移，而不是逐个制造路径 churn。普通自托管入口位于 `host/`，可复用 Node 工具位于 `scripts/` / `lib/`，仅项目维护者使用的发布与公网探针位于 `tools/maintainer/`。宿主与游戏之间的消息协议版本为 `eagler-touhou/1`。

## 上游项目、素材与许可

本项目建立在以下项目的成果之上：

- [GensokyoClub/th06](https://github.com/GensokyoClub/th06)：《东方红魔乡》的反编译与可移植源码基础。本项目基于其 [`portable`](https://github.com/GensokyoClub/th06/tree/portable) 分支的 [`9a1c50b`](https://github.com/GensokyoClub/th06/commit/9a1c50b3e7821f2e32e0ff35de7e618216d796e5)，并在其上继续开发 `eagler` 运行时分支。
- [some100/th07](https://github.com/some100/th07)：《东方妖妖梦》的反编译、跨平台移植与 Web 构建基础。本项目基于其 [`reallyportable`](https://github.com/some100/th07/tree/reallyportable) 分支的 [`9775193`](https://github.com/some100/th07/commit/97751939e47f6d83971fa6225c7ff2cb46ebb77c)，并在其上继续开发 `eagler` 运行时分支。

SDL、Emscripten、webaudio-tinysynth、fflate 等基础设施及其许可信息见 [THIRD_PARTY.md](THIRD_PARTY.md)。界面素材及发布注意事项见 [ASSETS.md](ASSETS.md)，项目说明和版权说明见[关于页](public/about.html)。

当前仓库尚未发布项目级 `LICENSE` 文件。`THIRD_PARTY.md`、`ASSETS.md` 和 vendored 文件中的许可只适用于它们明确描述的第三方组件或素材，不应被理解为整个仓库的项目级许可。

本项目是非官方爱好者工程，与上海爱丽丝幻乐团、ZUN 及游戏发行方不存在隶属、授权、认可或赞助关系。项目不授予任何原版游戏内容的使用或再分发许可；不得利用本项目在互联网上上传、托管、共享或以其他任何形式分发无权发布的原版游戏数据、音乐、美术及其他受版权保护的资源。
