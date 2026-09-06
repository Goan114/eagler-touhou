# 开发说明

开发站的本机源声明位于 `lib/development-content.mjs`，`lib/development-host-manifest.mjs` 从实际 Runtime、DATA 和音乐输入构造合法的 `web-development` Host Manifest。`npm start` 直接通过标准 `/eagler-touhou/host-manifest.json` 端点提供它，同时提供合法的空 `release-catalog.json`。源码根不保存生成的 `games.json`；`npm run check` 会直接验证开发 Host Manifest contract。

产品内容名称与 Runtime mount 位于不含本机路径的 `lib/content-definition.mjs`。维护者专用的 workspace、build profile、Runtime Release、publication 等 contract 也集中在 `lib/`；浏览器按 URL 加载的 `product-catalog.mjs`、`resource-mode.mjs`、`package-*.mjs` 等仍保留稳定的公开路径。正式发布由 `lib/publication-host-seed.mjs` 提供无本机路径的 build-time seed，随后 package-server 物化并验证真正的 Host Manifest；日常使用者不需要手写这些内部参数。

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
npm run check
```

启动本地启动器：

```powershell
npm start
```

打开 `http://127.0.0.1:8130/eagler-touhou/`。不能直接双击 `index.html`。

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
```

`npm run check` 是日常编辑循环的快速单仓门禁：只跑确定性的源码语法、生成物新鲜度、模块/格式/包契约和公开资源审计；不访问公网，不启动真实浏览器，不要求 sibling 游戏仓库或原版游戏资源。互不依赖的检查会有限并发执行；诊断并发问题时可设置 `EAGLER_CHECK_JOBS=1`。

`npm run check:workspace` 是显式的跨仓集成门禁，会额外读取 TH06/TH07/TH08 工作区状态并运行本地 Runtime/HTTP/格式集成。浏览器、BrowserStack、完整 OGG baseline、公开网络、完整 Runtime 构建和正式 Release 验证继续保持为按需或发布前测试，不能因为“覆盖更多”就加入每次编辑后的默认 `check`。

`npm run test:runtime-release-host` 是显式的发布链 integration：它先生成 resource-free Runtime Release，再把 logical workspace 指向一个不含游戏源码仓的空目录，只依赖 Runtime Release 与显式原版输入组装并验证 Host。该测试比默认编辑门禁更重，因此不并入 `npm run check`。

针对特定功能的检查脚本目前仍集中在 `scripts/`，包括触控、Replay、多人协议、游戏包、导入器、Release Catalog、网络活动和 Origin 迁移。旧的源码正则/布局锁只可视为 L0 迁移证据；新增或重写测试应优先调用稳定模块接口、验证真实产物或实际执行路径。

## 运行时资源缺失

如果游戏完成声音和输入初始化后立即退出，通常是运行时没有取得原版游戏档案。确认本地可玩构建使用 `TH_EXTERNAL_ASSETS=OFF`，并重新执行带 `-EmbedLocalAssets` 的构建。

公开源码检查构建使用 `TH_EXTERNAL_ASSETS=ON`，不能直接供开发网页启动游戏。不要复制或提交 `.data` 解决资源缺失问题。
