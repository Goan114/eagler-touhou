# 开发说明

开始跨模块修改前先阅读 `ARCHITECTURE.md`。它是当前系统边界、数据流和 contract 所有权的长期总览；`PRODUCT_SURFACE.md` 是正式支持功能面的单一清单，`../integrations/RUNTIME_CONTRACT.md` 定义 thcrap/thprac 的有限 Runtime 边界。本文件只负责开发环境、命令和维护流程，不重复维护架构清单。

开发站的本机源声明位于 `lib/development-content.mjs`，`lib/development-host-manifest.mjs` 从实际 Runtime、DATA 和音乐输入构造合法的 `web-development` Host Manifest。`npm start` 直接通过站点根下的 `/host-manifest.json` 端点提供它，同时提供合法的空 `release-catalog.json`。源码根不保存生成的 `games.json`；`npm run check` 会直接验证开发 Host Manifest contract。

产品内容名称与 Runtime mount 位于不含本机路径的 `lib/content-definition.mjs`。维护者专用的 workspace、build profile、Runtime Release、publication 等 contract 也集中在 `lib/`。作者维护的 HTML、CSS、站点图片、字体和 vendored browser files 位于 `public/`，开发服务器把它映射到 URL 根；发布器仍按显式清单把这些文件装配到扁平 deployment root，不会把 `public/` 目录名带进产物。共享 application contract 与 Launcher TypeScript 源码分别位于 `src/contracts/`、`src/launcher/`，由 `tsconfig.launcher.json` 编译到 gitignored 的 `.cache/build/browser/assets/`；开发服务器把这些生成文件映射到稳定的 `/assets/contracts/`、`/assets/launcher/` URL，站点和 Host Kit 打包器再复制到各自产物的 `assets/`。正式发布由 `lib/publication-host-seed.mjs` 提供无本机路径的 build-time seed，随后 package-server 物化并验证真正的 Host Manifest；日常使用者不需要手写这些内部参数。

## 工作区

完整 Runtime 开发需要 sibling 源码工作区。物理目录名由 `config/workspace.json` 统一拥有；不要在 Node / Python / PowerShell 脚本里另写一份 sibling 路径表。

```powershell
mkdir eagler-touhou-workspace
cd .\eagler-touhou-workspace
git clone https://github.com/YomotsuHisami/eagler-touhou.git
git clone --branch eagler https://github.com/YomotsuHisami/th06.git th06-eagler
git clone --branch eagler https://github.com/YomotsuHisami/th07.git th07-eagler
git -C .\th06-eagler submodule update --init vendored/SDL vendored/SDL_image vendored/SDL_ttf
git -C .\th07-eagler submodule update --init vendored/SDL vendored/SDL_image vendored/SDL_ttf
git -C .\th06-eagler\vendored\SDL_ttf submodule update --init external/freetype external/plutosvg external/plutovg
git -C .\th07-eagler\vendored\SDL_ttf submodule update --init external/freetype external/plutosvg external/plutovg
```

目录结构：

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

需要 Node.js 22 或更新版本、CMake、Ninja、Emscripten SDK 和 Python 3。生成 OGG 时还需要 `deploy/requirements.txt` 中的 Python 依赖。

## 安装依赖与检查

```powershell
cd .\eagler-touhou
npm install --ignore-scripts
npm run vendor
npm run build:launcher
npm run check
```

启动本地启动器：

```powershell
npm start
```

打开 `http://127.0.0.1:8130/`。不能直接双击 `index.html`。

卡片图和站点图标是部署者合法持有的 Host 输入，不属于公开 source。标准工作区可把已经准备好的 `th06-card.webp`、`th07-card.webp`、`th08-card.webp` 与 `th06.ico` 放在 `..\games\host-artwork\`；源码开发服务器会从该目录提供这些固定文件，但不会把它们复制进仓库。非标准布局使用 `EAGLER_TOUHOU_ARTWORK_DIR` 显式指定同一输入目录。正式 Host 仍由 Host assembly 从原版资源生成或通过 `--artwork-dir` 接收 override。

## 构建运行时

不含原版资源的源码构建检查：

```powershell
.\scripts\Build-eagler-runtimes.ps1 `
  -EmsdkDirectory '..\toolchains\emsdk'
```

该模式输出到两个游戏仓库的 `build-web-eagler-external`，用于公开源码编译检查，不能直接启动游戏。

本地可玩构建需要把合法持有的游戏资源嵌入到独立目录：

```powershell
.\scripts\Build-eagler-runtimes.ps1 `
  -EmsdkDirectory '..\toolchains\emsdk' `
  -EmbedLocalAssets
```

默认从 `..\th06-eagler\assets` 和 `..\th07-eagler\assets` 读取资源，输出到 `build-web-eagler-default`。也可以使用 `-Th06AssetDirectory` 和 `-Th07AssetDirectory` 指定目录。

需要完整站点验证时使用正式的 Host/发布装配路径，而不是维护第二套“测试分发”拓扑。开发 Runtime 构建仍可作为显式输入参与各自的集成测试；正式候选只由 `npm run release` 的显式 `--output` 或 Quick Host 的 `dist/site` 产生。

新的可导入游戏包只使用 `eagler-touhou/package/1` Package Descriptor。维护者需要从已装配的站点生成离线 ZIP 时使用 `npm run package:offline-game -- <site> th06 [output.zip]`；旧 `game-data-pack/1` / `offline-game-pack/1` 只保留读取兼容，不再有生成命令。

`npm run package:runtime-release -- --output=PATH --th06-build=PATH --th06-multiplayer-build=PATH --th07-build=PATH --th07-multiplayer-build=PATH --th08-build=PATH` 是低层维护者 producer：它把五个已经完成并可追溯的 Runtime build 组装成 resource-free Runtime Release，并生成带尺寸和 SHA-256 的 `runtime-release.json`。它不构建 Runtime、不读取原版游戏内容，也不代替 `npm run release` 的正式站点装配与验收。

其它生成物分类与消费规则见 `docs/ARTIFACTS.md`。

两个构建目录必须保持隔离。不要在同一 CMake 构建目录中来回切换 `TH_EXTERNAL_ASSETS`：CMake 会复用缓存，外置资源构建不会包含游戏档案。

生成的 `.data` 等文件包含原版游戏资源，仅限本机或获授权的私有部署使用，不得提交或分发。

## 常用验证

```powershell
npm run check
npm run check:workspace
npm run test:shell
npm run test:server
npm run audit:publish
npm run verify:server -- D:\Sites\eagler-touhou
npm run verify:deployed -- https://example.invalid/
npm run verify:practice
```

`npm run check` 是日常编辑循环的快速单仓门禁：只跑确定性的源码语法、生成物新鲜度、模块/格式/包契约和公开资源审计；不访问公网，不启动真实浏览器，不要求 sibling 游戏仓库或原版游戏资源。互不依赖的检查会有限并发执行；诊断并发问题时可设置 `EAGLER_CHECK_JOBS=1`。

`npm run check:workspace` 是显式的跨仓集成门禁，会额外读取 TH06/TH07/TH08 工作区状态并运行本地 Runtime/HTTP/格式集成。它也承载少量“结构本身就是 contract”的快速跨仓检查：共享 Runtime 协议词汇、ReplayX/EAGX ABI/PRAC ownership，以及 always-hitbox 不得污染 gameplay RNG/EffectManager 的安全边界。普通实现形状、浏览器、BrowserStack、完整 OGG baseline、公开网络、完整 Runtime 构建和正式 Release 验证继续保持为按需或发布前测试，不能因为“覆盖更多”就加入每次编辑后的默认 `check`。

公开网络、公共 Relay/TURN 和性能 profiling 都属于 remote/ops lane。相关脚本必须显式接收目标 URL；仓库不会为这些命令内置 `touhou.vip` / `test.touhou.vip` 默认值。这样普通本地测试、误执行或 fork 项目不会因为省略参数而访问项目基础设施。

这些非 hermetic 维护者探针统一位于 `scripts/ops/`，其输入、证据边界和对应命令见 `scripts/ops/README.md`。它们不是普通自动化测试，不应移回 `tests/`。

`npm run verify:practice` 是独立的本机 browser/release acceptance lane。它使用临时 HTTPS/HTTP2、隔离且采用默认动效偏好的 Chrome/Chromium profile、合成 Host artwork 和无私有 DATA 的有效 Host Manifest，固定为 Lighthouse desktop、10 ms RTT、40 Mbps 吞吐的本机高速参考 profile。为控制 Lighthouse 的正常测量波动，正式 lane 默认采集五次，并使用 Lighthouse 自带的 `computeMedianRun` 选择代表性报告；它不会挑选最高分，输出也会列出每次 Performance 与 TBT。代表性报告必须让 Performance、Accessibility、Best Practices、SEO 及五项核心性能指标全部达到 100，并通过三条基于用户可见语义的 catalog、单机选择、联机入口浏览场景。默认报告写入操作系统临时目录；正式候选可用 `--report=PATH` 把报告写到仓库外的证据目录。该参考环境用于发现 Launcher 自身退化，不代替真实托管网络、正式 artwork、设备或公开发布验收。`--profile=standard --diagnostic=1` 可用 Lighthouse 标准 desktop 40 ms/10 Mbps profile 查看环境敏感基线，`--diagnostic=1` 也可查看参考 profile 未达门槛时的完整分数；调试时可用奇数 `--runs=1`、`3`、`5`、`7` 或 `9` 调整采样数，正式命令仍是五次采样的硬门禁。

`npm run test:runtime-release-host` 是显式的发布链 integration：它先生成 resource-free Runtime Release，再把 logical workspace 指向一个不含游戏源码仓的空目录，只依赖 Runtime Release 与显式原版输入组装并验证 Host。该测试比默认编辑门禁更重，因此不并入 `npm run check`。

`npm run test:multiplayer-replay-launcher:browser` 是聚焦的 Browser lane：它自行启动本地 HTTP 站并用同源最小 Runtime stub 捕获 Launcher 的真实 `configure`/`launch` 协议，只证明 Multiplayer Replay 选择 MP Runtime/storage identity、发送 `replayViewer: true` 且不夹带房间 `netplay*` 配置；它不依赖 Relay、WASM 或私有 DATA，也不冒充 Runtime Replay 播放测试。

`npm run test:multiplayer-spectator-launcher:browser` 是对应的旁观 Launcher 编排场景：两个原始 lobby 客户端只负责占用玩家席并开始一局，Launcher 必须在“仅未入座”状态收到 `start` 后保持不启动，只有显式加入旁观并收到 `spectator-start` 后才进入 Runtime；测试随后从真实 `configure` payload 验证 spectator 身份、人数和互斥 relay role query。真实 spectator gameplay/backlog/reconnect 仍由 Runtime/relay 自己的 browser/contract tests 负责。

`npm run test:package-store:browser` 是 hermetic 的 Package Store/Installer Browser lane：它自行启动本地静态站并在真实 Chromium IndexedDB 中验证 ArrayBuffer canonicalization、bulk read、source lookup、GC/watchdog、AbortSignal/AbortError 传播、本地 ZIP 在 revision 相同场景仍使用用户提供的新字节、成功切换延后 GC，以及失败/尺寸错误更新不得切换 current generation 且必须清除 pending。它还通过真实 `installPublishedPackage()` 验证同一个 AbortSignal 从 Release Catalog 的 Descriptor fetch 一直传到 Package file fetch，取消后 current generation 不变。`tests/test-package-store-contract.mjs` 只保留无法靠普通成功/失败场景证明的 crash-atomic 结构边界：current/pending 切换必须发生在同一个 IndexedDB readwrite transaction 中；`npm run test:package-installer` 直接复用这条 Browser lane，不再保留空壳 source-shape test；`tests/test-package-launcher.mjs` 只保留 optional-component/carry-forward 等纯策略行为。

`npm run test:th06-netplay-launcher:browser` 是显式的跨仓 Browser lane：它从 `createDevelopmentHostManifest()` 取得当前开发 Runtime/DATA 身份，通过 dedicated `th06mp` 产品和真实 lobby room 启动两个 TH06MP Runtime，并强制走 Host-owned WebSocket fallback，验证至少推进到确认帧 300 且两端 canonical hash 一致。它依赖当前 TH06MP build，因此不进入默认 `npm run check`。

本地开发站默认不假定 Relay 已经运行。需要在普通 Launcher 中启用 TH06MP/TH07MP 时，启动服务前设置 `EAGLER_TOUHOU_NETPLAY_RELAY`，例如本机 Relay 使用 `ws://127.0.0.1:18142/`，或使用明确授权的测试 WSS。该值会进入开发 Host Manifest 并通过正式 URL contract 验证；不要把临时 Relay 地址写入产品目录。

测试的规范性准入规则由 `ARCHITECTURE.md` 的 **Testing architecture** 统一拥有。新增测试前先回答三个问题：它保护的稳定 invariant 是什么；能证明该 invariant 的最小测试边界是什么；如果实现保持行为不变而重构，这条断言是否仍应成立。答不清楚时不应先写测试再寻找理由。

针对特定功能的检查集中在 `tests/`，浏览器 runner 位于 `tests/browser/`，包括触控、Replay、多人协议、游戏包、导入器、Release Catalog、网络活动和 Origin 迁移。旧的源码正则/布局锁只可视为迁移证据：它们没有 grandfathered 权威性。重构暴露出脆弱断言时，应先恢复真实 contract，再把覆盖迁到 owner behavior / repository integration / browser-device 等正确层级，然后删除或降级旧 change-detector test；不得为了维持旧测试绿色而保留错误模块边界。

默认测试应当 hermetic、deterministic、可重复运行，不依赖公网、sleep timing、用户本机持久状态或未声明 sibling 内容。真实浏览器、WebKit/WebView、设备触控、公开网络和发布候选验证属于显式重型 lane；它们只用于小测试无法证明的性质，也不能反过来用源码 grep 冒充真实设备回归。

## 运行时资源缺失

如果游戏完成声音和输入初始化后立即退出，通常是运行时没有取得原版游戏档案。确认本地可玩构建使用 `TH_EXTERNAL_ASSETS=OFF`，并重新执行带 `-EmbedLocalAssets` 的构建。

公开源码检查构建使用 `TH_EXTERNAL_ASSETS=ON`，不能直接供开发网页启动游戏。不要复制或提交 `.data` 解决资源缺失问题。
