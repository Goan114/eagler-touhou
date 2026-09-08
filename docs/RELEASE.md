# Release 与公网部署

本文件面向项目维护者，说明正式候选、发布前验证和公网行为要求。普通自托管请使用 [`SELF_HOSTING.md`](SELF_HOSTING.md) 与 [`SELF_HOSTING_REFERENCE.md`](SELF_HOSTING_REFERENCE.md)。

项目的责任边界是生成和验证完整站点；`npm run release` **不会**登录服务器、安装 Web Server、修改 systemd、防火墙、证书、CDN 或执行公网切换。

## 正式候选入口

正式候选只有一个公开维护者入口：

```text
npm run release -- --input=D:\ReleaseInputs\release.json --output=D:\Releases\candidate
```

输入使用 `eagler-touhou/release-input/1`。正式 Release 必须覆盖所有已注册作品，并明确提供：

- 一个已经验证、覆盖所有作品且不含原版资源的 Runtime Release；
- TH06 / TH07 / TH08 原版资源目录；
- maintainer feature config；
- 明确的音乐模式；
- 需要时的字体、语言包或自定义 artwork 输入。

正式入口不接受 `Th08Build`、Emscripten、CMake 或 Ninja。Runtime 编译属于 Runtime Release producer，不属于站点 release。

`tools/maintainer/assemble-site.ps1` 是 `npm run release` 当前复用的低层维护者实现，不是普通 self-host CLI，也不是服务器部署接口。普通部署者不应直接依赖它的 PowerShell 参数形状。

目标目录必须尚不存在。release owner 在目标父目录的 `.release-incomplete/` 下构建并验证候选，通过后才原子重命名到目标目录。进程级 scratch 使用操作系统临时目录。输出包括 hosted/import 站点、Package 内容、离线 ZIP、输入清单、Release Manifest、checksums 和 completion report。

completion report 使用 `eagler-touhou/completion-report/1`，记录：

```text
IMPLEMENTED
BUILD-VERIFIED
STRUCTURE-VERIFIED
RUNTIME-VERIFIED
SEMANTIC-VERIFIED
HUMAN-ACCEPTED
RELEASED
```

本地生成候选不会把未执行的浏览器、语义、人工或真实发布验证伪装成已完成，也不会把 `RELEASED` 提升为 `yes`。

候选生成后可独立复验：

```text
npm run verify:release -- D:\Releases\candidate
```

该检查验证 Release Manifest/checksums、固定输出结构、Package Descriptor、离线 ZIP 和 completion report；它不替代真实浏览器或人工验收。

Runtime Release 只允许本项目可分发的 HTML / JavaScript / WebAssembly 与声明性布局元数据，不得包含 `.data`、原版 `.dat`、原版音乐、从原作提取的卡图/图标或用户数据。游戏 Runtime 源码 provenance 属于 Runtime Release producer；站点 release 只记录 Launcher 侧 provenance。

## 产物级别与资源模式

产物权威级别和资源交付模式是两条独立维度：

- `web-development`、`web-validation-*`：开发或验证产物，不是正式候选；
- `web-release-*`：可进入正式候选；
- `hosted`：站点发布部署者生成的游戏资源；
- `import`：站点发布 Launcher / App Shell / App-owned Runtime，玩家自行导入完整游戏包。

正式 release 先生成并验证 hosted 站点，再从**同一次 hosted 构建**派生 import 站点和离线 ZIP，避免重新读取不相关的历史产物身份。

maintainer feature config 使用 `eagler-touhou/server-features/1`，是 release assembly 的低层输入。普通 self-host 用户不需要手写它；普通用户配置由 `eagler-touhou.config.json` 拥有。

既有部署中的 `import-only` / `import-partial` 只保留读取兼容；新配置和新产物只接受、只写出 `import`。

## 原版资源、语言与音乐

公开仓库和 Runtime Release 都不包含原版 `.dat`、`.data`、WAV、OGG、Replay、原版字体或用户存档。正式 hosted 候选必须在维护者本机从合法持有的原版目录生成这些部署资源。

站点 assembly 会：

1. 验证 Runtime Release；
2. 从显式原版输入生成 DATA、可选 OGG、语言包和 Launcher artwork；
3. 组装静态站点与 Package Descriptor；
4. 生成 App Shell；
5. 验证完整站点；
6. 只把最终候选发布到 release 输出边界。

Python asset-tool dependencies 统一由 `host/requirements.txt` 声明。正式 release 使用任务私有 Python 环境，不依赖调用者预先安装 `soundfile` / Pillow / fontTools。

默认 self-host 会准备日文、简体中文和英文。正式 release 若使用自定义语言集合，非 `ja` 的 `lang_*` 必须有对应的已生成语言包。Runtime 只下载玩家实际选择的语言资源。

远程安装和离线 ZIP 使用同一份 `eagler-touhou/package/1` Package Descriptor。维护者需要从已装配站点单独生成某作离线包时可使用：

```text
npm run package:offline-game -- D:\Sites\eagler-touhou th06
npm run package:offline-game -- D:\Sites\eagler-touhou th07
```

旧 `game-data-pack/1` / `offline-game-pack/1` 只属于读取兼容，新 producer 不再生成它们。

## 公网 Web 行为要求

生成完成的 `site/` 是普通静态站点，可以交给 nginx、Caddy、Apache、IIS、对象存储/CDN、容器或其它基础设施。项目不规定服务器操作系统或 Web Server。

最终公网行为至少应满足：

- 公网入口使用 HTTPS；
- `.wasm` 使用 `application/wasm`，JavaScript 使用正确的 JavaScript MIME；
- HTML、JSON、未版本化入口应重新验证，不能无限期缓存；
- 内容版本化资源可长期缓存；
- CDN 缓存键保留资源查询参数，至少不能丢失 `v`；
- 可按基础设施能力启用 Brotli/Gzip；
- 不要配置会阻止所需 iframe、WASM、音频或 Service Worker 行为的响应策略。

`examples/deployment/nginx.conf` 只是这些行为的一份示例，不是权威部署实现，也不会安装 nginx。

部署前可验证本地产物：

```text
npm run verify:server -- D:\Sites\eagler-touhou
```

部署后从真实公开 URL 验证最终行为：

```text
npm run verify:deployed -- https://example.invalid/
```

真实服务器如何做目录切换、对象存储版本、容器 rollout 或 CDN 发布由运营者决定。项目只要求用户不能在切换过程中拿到互不匹配的 HTML / JS / WASM / DATA / manifest。

## WebSocket Relay 与 TURN

多人联机服务与静态站点是独立基础设施。站点只配置 WebSocket Relay URL；TURN 由 signaling/relay 服务管理并向浏览器提供可用的 STUN/TURN 信息和短期凭据。

维护的服务端实现位于：

```text
server/netplay-relay.mjs
server/render-coturn-config.cjs
server/coturn.env.example
```

是否使用 systemd、Docker、Kubernetes、进程管理器或外部托管服务不属于项目 contract。真实公网 relay/TURN 验证工具位于 `tools/maintainer/`，它们检查显式目标，不进入 hermetic `npm run check`。

## HTTP → HTTPS 数据迁移

HTTP 与 HTTPS 是不同 Origin。路径从 `/eagler-touhou/` 移到 `/` 不会改变 Origin，但 HTTP → HTTPS 会改变浏览器存储边界。

迁移窗口内必须同时保留旧 HTTP Origin 和新 HTTPS Origin。`migrate.html` 在旧 HTTP 页面读取浏览器本地数据，通过受约束的 `postMessage` 协议交给 HTTPS receiver；数据不会上传服务器。

只有迁移窗口内的 Host Manifest 才声明：

```json
{
  "originMigration": { "mode": "http-to-https" }
}
```

迁移内容包括：

- TH06 / TH07 / TH08 存档、Replay、设置和支持作品的 thprac 文件；
- Launcher 设置；
- Package Store installation、generation 与 object 数据；
- 明确拥有的本地资源 cache。

采用**按 owner、按真实冲突显式覆盖**：非冲突旧数据自动迁移；目标端已有冲突时默认保留 HTTPS 数据，只有用户明确选择对应 owner 才覆盖。不存在于旧 HTTP source 的 owner 不能删除 HTTPS target 数据。

迁移窗口期间：

- 不启用 HSTS；
- 精确的 HTTP `/migrate.html` 必须可直接访问；
- 不要让永久 HTTP → HTTPS 重定向提前接管这个迁移页面；
- 普通 HTTP 页面访问仍应干净跳到 HTTPS，不自动启动迁移。

切换前检查：

```text
npm run verify:migration-cutover -- http://example.invalid/ https://example.invalid/
```

## HSTS 最终切换

HSTS 生命周期只有两个项目状态，不引入与产品 contract 无关的“试运行档”：

```text
migration window
  HSTS disabled
        |
        | migration retired
        v
final HTTPS
  Strict-Transport-Security: max-age=31536000
```

结束迁移窗口时：

1. 从 Host Manifest 移除 `originMigration` capability 并重新生成站点；
2. 让旧 HTTP `/migrate.html` 不再承担迁移入口；
3. 在最终 HTTPS 响应上发送至少一年的 `Strict-Transport-Security: max-age=31536000`；
4. 如果 TLS 在 CDN/边缘终止，确认最终客户端响应确实保留该 header；
5. 从真实公网入口运行最终 verifier。

```text
npm run verify:hsts-cutover -- http://example.invalid/ https://example.invalid/
```

该检查只验证最终公开行为：普通 HTTP 入口跳到 HTTPS、HTTPS 发布至少一年 HSTS、Host Manifest 不再声明 `originMigration`。它不关心站点使用 nginx、Caddy、Apache、IIS、对象存储还是某个 Linux 发行版。

`includeSubDomains` 和 HSTS preload 都不是默认策略。只有运营者明确承诺所有相关子域长期 HTTPS 后才应另行启用。

浏览器成功学习 HSTS 后，后续裸域名的 HTTP 尝试可在本地先升级到 HTTPS；从未学习过 HSTS 的新浏览器在完全离线状态下无法凭空完成这一步，除非域名另行进入 preload。
