# 产物目录约定

新产物按用途写入 `artifacts/`。目录名只表达保留与消费规则，不代表验证状态。

| 目录 | 内容 | 消费规则 |
| --- | --- | --- |
| `release/` | `npm run release` 生成的完整候选 | 必须有 Release Manifest、checksums 和验证报告；发布仍需明确授权。 |
| `validation/` | 测试站、浏览器报告、临时打包候选 | 可以重建；正式发布器不得扫描或隐式选取。 |
| `fixtures/` | 人工审核过的稳定测试输入 | 测试只读；更新需同步说明其 contract。 |
| `deploy/` | 部署与切换证据 | 记录目标、时间和对应 release identity。 |
| `snapshots/` | 外部或历史快照 | 必须记录来源和采集时间，不作为源码或 release 输入。 |
| `tmp/` | 无长期证据价值的中间文件 | 正式构建禁止读取；允许在确认无使用者后清理。 |

DATA 包、WebKit smoke、Runtime Storage、部署 Python bootstrap、工作树 inventory 和其它可重建集成结果使用 `validation/`。仓库不再维护独立的“测试分发”产品拓扑；需要站点级验证时复用正式 Host/发布装配路径。正式候选由 `npm run release -- --input=... --output=...` 写入一个尚不存在的显式目录。

历史 `dist/`、`archive/temporary/` 和旧 `artifacts/` 内容不是兼容 API，正式构建不得从中隐式选取输入。完成交付后，这些可重建内容应移出项目目录或清理；需要长期保存的发布或验收证据必须进入明确的外部证据存储并记录对应 release identity。

下列 build 目录全部是仅本地、可重建的开发/验证输入：

```text
th06-eagler/build-web-eagler-default
th06-eagler/build-web-eagler-external
th06-eagler/build-web-eagler-thprac-test
th06-eagler/build-web-netplay-th06
th07-eagler/build-web-eagler-default
th07-eagler/build-web-eagler-external
th07-eagler/build-web-eagler-thprac
th07-eagler/build-web-th07-netplay
```

这些路径没有兼容承诺。开发源路径由 `lib/development-content.mjs` 明确拥有；发布器不读取这些默认路径，也不从源码根寻找生成清单。路径可以在一次修改中连同全部本地调用方一起迁移。TH08 的现有开发路径不在本轮整顿范围内，也未被移动。

## Build profile

目录名不承担构建身份。开发 Host Manifest 由 `lib/development-host-manifest.mjs` 在需要时从工作区生成并声明 `web-development`；源码树不保存第二份生成清单。发布 Host seed 不含本机路径或生成 identity。低层 `package-server.mjs` 必须收到非开发 profile；服务器候选的 `host-manifest.json`、`deployment.json` 与 Release Manifest 使用同一个 profile，顶层正式候选是 `web-release`。verifier 会拒绝清单与产物 profile 不一致。

浏览器可见的两个清单名称与职责固定：`host-manifest.json` 描述 Runtime、内容 identity、语言、音乐和服务器能力，`release-catalog.json` 只描述可安装 Package revision 与 Package Descriptor 地址。开发服务器也提供这两个标准端点；开发 Release Catalog 合法为空，不再存在第三种 `games.json` 协议。

站点产物始终是扁平、可搬移的 deployment root：`index.html`、`host-manifest.json`、`release-catalog.json`、`assets/`、`runtime/`、`games/` 和 `shared/` 直接位于该目录。产物不内嵌 `/eagler-touhou/` 或其他公开挂载路径；默认由服务器挂载到 `/`，需要子路径时由服务器显式配置，同一份产物无需重打包。

从历史 `/eagler-touhou/` 挂载切换到 `/` 时，服务器临时拥有一层有界兼容：两个旧入口只重定向到 `/`；旧作用域的 `app-shell-sw.js` 返回不缓存的退役 Worker，由它注销旧注册并把受控窗口导航到 `/`；其余旧子路径仅在退役期间映射到同一扁平站点，避免旧缓存页面把 JSON 请求重定向成 HTML。该层不是第二套公开挂载 contract；确认已发布旧 Worker 的存量客户端自然淘汰后，应连同 `legacy-mount-retirement-sw.js` 和对应服务器规则一起删除。

构建 scratch 默认进入操作系统临时目录；必须和最终目录处于同一文件系统才能原子切换的 staging，统一进入目标父目录的 `.tmp/`。需要在失败后保留诊断价值的候选进入 `.release-incomplete/`，不伪装成临时文件。正式候选内部不得出现 `.tmp`、`.staging`、`.next`、临时配置或人工 SSH 文件。

profile 表达产物权威级别：`web-development` 和 `web-validation-*` 只供本机开发或验证，`web-release-*` 才能进入发布候选。资源模式是另一维度，并且只有 `hosted` 与 `import` 两个正式值；后者不携带游戏内容、Runtime 更新或 Release Catalog 条目。旧的 `import-only` / `import-partial` 只属于历史部署快照。Launcher 与 verifier 暂时保留只读兼容；新配置、打包器和发布产物只接受并写出 `import`。
