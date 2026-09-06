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

历史 `dist/`、`archive/temporary/` 和旧 `artifacts/` 内容无限期保留，但它们不是兼容 API，正式构建不得从中隐式选取输入。保留只表示不自动移动或删除，不保证其中的旧站点、脚本或浏览器 profile 继续可执行。

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

profile 表达产物权威级别：`web-development` 和 `web-validation-*` 只供本机开发或验证，`web-release-*` 才能进入发布候选。资源模式是另一维度，并且只有 `hosted` 与 `import` 两个正式值；后者不携带游戏内容、Runtime 更新或 Release Catalog 条目。旧的 `import-only` / `import-partial` 只属于历史部署快照，不再是 Launcher、打包器或 verifier 的兼容 API。
