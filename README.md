# eagler-touhou

`eagler-touhou` 是一个 Web 上的**东方 Project 原作游戏**启动器。

在保证原作体验的基础上，提供 触控适配 + 个性化布局、thprac 适配、多语言（基于 thcrap）、存档和 Replay 管理、多人联机大厅。
在安全上下文条件下，启动器网页**可以被离线运行**。在玩家离线或服务器宕机时，玩家即使刷新了页面也可以使用 Service Worker 提供的缓存文件正常进行游戏。

目前，主持本项目的域名总访问量已有 20w+。几乎解决了玩家提出的所有问题，并听取了大量用户的功能新增建议。

## 详细功能

### 完整的原作体验，但是在浏览器运行

- 允许用户在浏览器中运行 TH06 和 TH07 (TH08 WIP），并提供导入导出存档、Replay 等文件的界面。
- 存档、Replay 等完全和原版互通。
- 力求完美体验。解决了原 portable 分支中出现的 弹幕抖动、弹幕运动不流畅、闪烁、单线程切换音乐卡顿、手机卡顿 等大量问题。
- 优化非常好，至少能在骁龙 660 上稳定 90Hz 运行。
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

- 适配 [thprac](https://github.com/touhouworldcup/thprac) 的所有功能。
- 支持在触控设备上使用模拟鼠标，并提供打开 Tab Tracker 和作弊菜单的模拟按键。（你如果需要 F12 菜单的话，讲讲为什么。）

### 多语言

- 理论上支持 [thcrap 语言仓库](https://srv.thpatch.net/) 里的所有语言包。
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
- 游戏包安装后保存在浏览器本地，游戏数据、运行时、OGG、字体和语言包可以分别管理；
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

需要 Node.js 22 或更新版本。先安装依赖并启动开发服务器：

```powershell
npm install --ignore-scripts
npm run vendor
npm start
```

然后打开 `http://127.0.0.1:8130/eagler-touhou/`。不能直接双击 `index.html`，因为游戏运行时、WASM、浏览器存储和跨页面通信都需要 HTTP(S) 环境。

本地可玩构建还需要 CMake、Ninja、Emscripten SDK、Python 3，以及合法持有的 TH06 / TH07 游戏文件。完整构建说明见[开发说明](docs/DEVELOPMENT.md)。

## 服务器部署

绝大多数部署不需要填写 feature 配置或编译 Runtime。推荐使用固定的 Quick Host 布局：Host Kit 根目录直接包含 `runtime-release/`（TH06/07 普通+多人以及 TH08 的 HTML/JS/WASM 成品）、`games/th06`、`games/th07`、`games/th08` 与 `eagler-touhou.config.json`。首次执行一次 `npm install`，之后运行 `npm run host` 即可。它会生成 hosted 站点并默认只在 `127.0.0.1:8130` 提供服务；`npm run host:build` 只生成同一份可直接上传公网服务器的静态 `dist/site`。详见 [Quick Host](docs/HOST_QUICKSTART.md)。

部署者可以选择两种资源模式：

- `hosted`：服务器提供启动器、运行组件和由部署者生成的游戏资源；
- `import`：服务器提供启动器和运行组件，玩家自行导入完整游戏包；该模式不发布游戏内容、Runtime 更新或 Release Catalog 条目。

正式 Host 的正常输入是一个**不含任何原版游戏资源**的 all-product Runtime Release，加上部署者自己合法持有的三作原版资源。Host 组装不要求部署者另外取得 TH06 / TH07 / TH08 Runtime 源码仓或重新编译 Runtime：

```powershell
python -m pip install -r .\deploy\requirements.txt
.\deploy\Prepare-eagler-touhou-server.ps1 `
  -RuntimeRelease 'D:\Releases\runtime-release' `
  -Th06Directory 'D:\Games\th06' `
  -Th07Directory 'D:\Games\th07' `
  -Th08Directory 'D:\Games\th08' `
  -OutputDirectory 'D:\Sites\eagler-touhou' `
  -Music midi,ogg
```

Runtime Release 只包含本项目可分发的 HTML / JavaScript / WebAssembly 与资源布局元数据，不包含 `.data`、原版 `.dat`、原版音乐、从原作提取的卡图/图标或其它原作资源。缺少非必要 UI 素材时只降级对应界面功能，不应使游戏内容部署整体失败。

生成离线游戏包：

```powershell
npm run package:offline-game -- D:\Sites\eagler-touhou th06
npm run package:offline-game -- D:\Sites\eagler-touhou th07
```

服务器可以配置语言包、`thprac`、外部游戏数据备用地址，以及外部或本地的 WebSocket Relay / TURN。完整的资源模式、语言包、缓存、HTTPS、原子发布和 HTTP → HTTPS 数据迁移说明见[服务器部署说明](docs/SERVER_DEPLOYMENT.md)。

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

运行时、多人、Replay、触控、游戏包和部署验证脚本见 `scripts/`。宿主与游戏之间的消息协议版本为 `eagler-touhou/1`。

## 上游项目、素材与许可

本项目建立在以下项目的成果之上：

- [GensokyoClub/th06](https://github.com/GensokyoClub/th06)：《东方红魔乡》的反编译与可移植源码基础。本项目基于其 [`portable`](https://github.com/GensokyoClub/th06/tree/portable) 分支的 [`9a1c50b`](https://github.com/GensokyoClub/th06/commit/9a1c50b3e7821f2e32e0ff35de7e618216d796e5)，并在其上继续开发 `eagler` 运行时分支。
- [some100/th07](https://github.com/some100/th07)：《东方妖妖梦》的反编译、跨平台移植与 Web 构建基础。本项目基于其 [`reallyportable`](https://github.com/some100/th07/tree/reallyportable) 分支的 [`9775193`](https://github.com/some100/th07/commit/97751939e47f6d83971fa6225c7ff2cb46ebb77c)，并在其上继续开发 `eagler` 运行时分支。

SDL、Emscripten、webaudio-tinysynth、fflate 等基础设施及其许可信息见 [THIRD_PARTY.md](THIRD_PARTY.md)。界面素材及发布注意事项见 [ASSETS.md](ASSETS.md)，项目说明和版权说明见[关于页](about.html)。

本项目是非官方爱好者工程，与上海爱丽丝幻乐团、ZUN 及游戏发行方不存在隶属、授权、认可或赞助关系。项目不授予任何原版游戏内容的使用或再分发许可；不得利用本项目在互联网上上传、托管、共享或以其他任何形式分发无权发布的原版游戏数据、音乐、美术及其他受版权保护的资源。
