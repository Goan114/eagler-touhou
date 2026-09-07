# 服务器部署说明

## 正式候选入口

正式候选统一由 `npm run release` 生成；`Prepare-eagler-touhou-server.ps1` 仍是被复用的底层准备器。输入 JSON 使用 `eagler-touhou/release-input/1`。正式 Release 必须覆盖所有已注册作品，并在 `prepare` 中明确提供一个已经验证的、all-product、**resource-free Runtime Release**，以及三作资源目录、feature 配置与音乐模式。正式入口不接受 `Th08Build`、Emscripten、CMake 或 Ninja 作为 Host 输入；这些属于 Runtime Release 生产者的维护者编译链：

```powershell
npm run release -- --input=D:\ReleaseInputs\release.json --output=D:\Releases\candidate
```

入口要求目标目录尚不存在，先在目标父目录的 `.release-incomplete/` 中以唯一操作 ID 构建和验证，通过后才原子重命名为目标目录。进程级 scratch 位于操作系统临时目录并由 `finally` 清理。输出包括 hosted/import 站点、Runtime、Package 内容、离线 ZIP、输入清单、Release Manifest、checksums 与分级验证报告。报告使用 `eagler-touhou/completion-report/1`，逐项记录 `IMPLEMENTED`、`BUILD-VERIFIED`、`STRUCTURE-VERIFIED`、`RUNTIME-VERIFIED`、`SEMANTIC-VERIFIED`、`HUMAN-ACCEPTED`、`RELEASED`。import 站直接消费本次 hosted 构建生成并验证过的内容清单，避免重新读取工作树中的旧产物身份。入口不上传或切换服务器，因此 `RELEASED` 为 `no`，未执行的浏览器、语义与人工验收为 `pending`。启用 OGG 时使用本次任务独立的 Python 环境，不依赖已有 `.deploy-python` 或系统 `soundfile`。

候选生成后或交接前可独立运行 `npm run verify:release -- D:\Releases\candidate`。该检查同时验证 Release Manifest/checksums、固定输出目录、每作 Package Descriptor 与离线 ZIP，以及完成状态报告；它不提升浏览器或人工验收等级。

Runtime Release 本身只允许本项目可再分发的 HTML / JavaScript / WebAssembly 与声明性元数据；不得包含 `.data`、原版 `.dat`、原版音乐、从原作提取的卡图/图标或其它原版内容。游戏 Runtime 源码 provenance 属于 Runtime Release 生产者；Host 组装只记录 Launcher 自身源码 provenance。

## 产物级别与部署模式

产物级别和资源交付是两条独立维度：`web-development` 与 `web-validation-*` 属于本地私有工作流，不构成发布候选；`web-release-*` 才属于可审查的发布候选。`hosted` 与 `import` 只描述发布站点怎样取得游戏内容，不能替代 profile，也不能提高验证等级。

服务器通过 `deploy/server-features.json` 选择资源和功能：

- `hosted`：服务器发布启动器、运行组件和部署者生成的游戏资源；
- `import`：服务器只发布 Launcher / App Shell 和 App 管理的 Runtime，玩家必须导入完整游戏包；该模式不发布游戏内容、Runtime 更新或 Release Catalog 条目。

`import` 适合不由服务器提供游戏内容的站点。低层准备器必须收到同一次 hosted 构建生成且已验证的 Host Manifest，顶层 `npm run release` 会自动传递，无需人工填写内部 profile 或清单路径：

```powershell
.\deploy\Prepare-eagler-touhou-server.ps1 `
  -OutputDirectory 'D:\Sites\eagler-touhou-lite' `
  -FeatureConfig '.\deploy\server-features-import.example.json' `
  -HostManifest 'D:\Releases\hosted\host-manifest.json'
```

既有部署中的 `import-only` 和 `import-partial` 仍可由 Launcher 与 verifier 读取；新配置和新产物只接受、只写出 `import`。旧的稀疏 Runtime 更新格式只用于核验既有部署，不再有生成入口。

## 从原版目录生成部署

公开仓库和 Runtime Release 都不包含原版 `.dat`、`.data`、WAV、OGG、MIDI、Replay、完整字体或用户存档。正式 Host 部署者必须在自己的机器上准备合法持有的三作游戏目录，并取得已经验证的 Runtime Release：

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

需要原始 WAV 时使用 `-Music midi,ogg,wav`；只提供 MIDI 时使用 `-Music midi`。

正常 Host 路径会先验证 Runtime Release，再从部署者提供的原版资源组装各作 DATA / 音乐 / 可选 UI 素材，生成部署目录和 `deployment.json` 清单，并删除包含中间私有资源的管理目录。它不会因为 TH06 / TH07 / TH08 Runtime 源码仓不存在而重新要求编译 Runtime。只有显式的维护者 fallback 才从源码编译 Runtime。

TH06 的可选 focus-hitbox 图像来自 TH07 原版资源。准备器可以从部署者提供的 TH07 数据中自动提取它；这类非必要 UI/辅助资源缺失时应禁用对应能力或界面增强，而不是把整个 Host 判为不可部署。核心 Runtime 或核心原版数据缺失仍必须失败。

## 语言包与 thprac

服务器拥有者通过 `server-features.json` 控制每个作品公开的语言和 `thprac`：

```json
{
  "schema": "eagler-touhou/server-features/1",
  "games": {
    "th06": { "languages": ["ja", "lang_en", "lang_zh-hans"], "thprac": true },
    "th07": { "languages": ["ja", "lang_en"], "thprac": false }
  }
}
```

`ja` 是原版日文，不需要额外语言包。其它 `lang_*` 必须对应已经生成的语言包 ZIP。运行时只下载玩家实际选中的语言包，不在游戏运行期间访问 thcrap 服务器。

生成语言包后，把目录传给准备脚本的 `-Th06LanguagePacks` 或 `-Th07LanguagePacks`。语言包准备器和完整参数见 `scripts/prepare-th06-language-pack.mjs --help`。

## 离线游戏包

远程发布和离线 ZIP 使用同一份 Package Descriptor。远程安装按 Descriptor 的 `source` 下载；ZIP 导入则从压缩包中读取同样的 `source`，最终写入相同的浏览器 Package Store / generation。

```powershell
npm run package:offline-game -- D:\Sites\eagler-touhou th06
npm run package:offline-game -- D:\Sites\eagler-touhou th07
```

ZIP 根目录的 `package.json` 是 `eagler-touhou/package/1` Descriptor。旧离线包仍可作为兼容输入读取，但新包不再把旧 manifest 或包内 Runtime 当作安装依据。

安装或更新时，启动器会显示发行元数据、Runtime Release、Package DATA / 可选组件以及 Host shared resources 的请求与进度。Package Store 已经拥有的 generation / object 直接从 IndexedDB 读取；Runtime HTML / JavaScript / WebAssembly 不写入 Package Store。

## 外部下载地址

部署者可以为无法直接提供资源的玩家配置外部入口：

```json
{
  "schema": "eagler-touhou/server-features/1",
  "gameDataFallback": {
    "url": "https://example.invalid/downloads",
    "hint": "提取码：example"
  },
  "games": { "...": "..." }
}
```

网页只打开这个地址，不会自动从第三方下载 ZIP。玩家仍需自行下载，再通过浏览器文件选择器导入。

## Web 服务器要求

- 公网入口应使用 HTTPS；TLS 在 CDN 或反向代理层终止时，源站可以继续使用 HTTP 回源；
- HTTPS 和可信 loopback HTTP 会启用只负责 Launcher / Player 静态文件的 App Shell Service Worker；普通 HTTP 会跳过 SW；
- `.wasm` 使用 `application/wasm`，JavaScript 使用 JavaScript MIME 类型；
- `.data`、`.wasm`、`.js`、`.css`、`.html` 和字体建议启用 Brotli 或 Gzip；
- 版本化资源可以长期缓存，运行时 HTML 应始终重新验证；未版本化资源应保留 ETag 或 Last-Modified 条件校验；
- CDN 缓存键必须保留资源查询参数，至少保留 `v`；
- 不要附加会阻止 iframe、WASM 或音频加载的 CSP。

正式发布应在正式目录之外生成并验证完整 staging，再以同一文件系统中的目录重命名或符号链接原子切换。发布后运行：

```powershell
npm run verify:server -- D:\Sites\eagler-touhou
npm run verify:deployed -- https://example.invalid/
```

## WebSocket Relay 与 TURN

多人联机可以使用外部 WebSocket Relay，也可以使用本地或外部 TURN。部署包通过服务器配置提供对应地址；静态站点和联机服务可以分开部署。

## HTTP → HTTPS 数据迁移

迁移期间旧 HTTP Origin 和新 HTTPS Origin 必须同时保留。玩家通过 `migrate.html` 在旧页面读取浏览器本地数据，再通过 `postMessage` 传递给 HTTPS 页面；数据不上传到服务器。

只有处于迁移窗口的部署，才应在私有 `server-features.json` 中显式启用 Launcher 入口：

```json
{
  "originMigration": { "mode": "http-to-https" }
}
```

纯 HTTP 部署和已经完成迁移的纯 HTTPS / HSTS 部署都应省略该字段。`migrate.html` 仍保留为可复用、非 App Shell 缓存的部署能力，但省略字段时 Launcher 不显示「存档恢复」。结束迁移窗口时删除该字段并重新生成部署产物，不需要修改域名或 Launcher 源码。

迁移内容包括：

- TH06 / TH07 / TH08 的存档、Replay 和设置，以及支持作品的 thprac 文件；
- Launcher 的设置；
- Package Store 的安装状态、generation 与对象数据；
- 旧版本的本地资源缓存。

迁移期间不要先启用 HSTS，也不要把 HTTP 全站直接 301 / 308 到 HTTPS，否则旧页面无法读取旧 Origin 的浏览器存储。切换前检查两个入口：

```powershell
npm run verify:migration-cutover -- http://example.invalid/ https://example.invalid/
```

`migrate.html` 相对于各自传入的站点基址解析；默认根部署即 `/migrate.html`。它在两边都必须直接返回 200，并且在迁移窗口内不能被 HSTS 或永久重定向提前接管。

普通 HTTP 页面访问应干净重定向到 HTTPS，不附加迁移参数，也不自动弹出迁移提示。迁移由启用了上述 Host Manifest capability 的 HTTPS Launcher「存档恢复」入口显式发起；只有精确的 HTTP `/migrate.html` 为读取旧 Origin 数据而保留 200。

迁移窗口结束后进入最终 HTTPS 状态时，需要同时完成两件事：

1. 从私有 `server-features.json` 删除 `originMigration` 并重新生成部署产物；
2. 在最终 HTTPS 链路启用 HSTS。Linux first-install 配置使用 `HSTS_MODE=final`，生成的站点发送 `Strict-Transport-Security: max-age=31536000`。如果 TLS 在 CDN/边缘终止，则必须确认该响应头没有被边缘层剥离。

最终切换后从真实公网入口验证：

```powershell
npm run verify:hsts-cutover -- http://example.invalid/ https://example.invalid/
```

这个检查要求普通 HTTP 入口跳到 HTTPS、HTTPS 至少发布一年 `max-age` 的 HSTS，并且 Host Manifest 已经不再声明 `originMigration`。`includeSubDomains` 和 HSTS preload 不作为默认策略；只有在所有子域和长期 HTTPS 承诺都明确后再单独启用。

浏览器成功接收过 HSTS 后，之后即使用户在地址栏输入裸域名并且浏览器原本会尝试 `http://`，也会先在本地升级为 HTTPS，再进入根 scope 的 Service Worker；这才使裸域名离线启动成为可能。首次访问前从未学习过 HSTS 的浏览器仍无法凭空离线升级，除非该域名另外进入 HSTS preload。
