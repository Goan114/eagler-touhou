# Runtime Storage 验证

平台契约见工作区 `docs/invariants/runtime-storage.md`。游戏参数复用 `product-catalog.mjs` 的 storage；不维护另一份游戏 registry。

## 源码协议门禁

`npm run test:storage`（亦由 `npm run check` 执行）在独立 VM 中执行三作真实 Shell 脚本，mock DOM/FS：恢复屏障、失败、超时后迟到成功、读写删除、同步错误传播、不安全路径。等级 L3/module，不证明浏览器 IndexedDB。

## 浏览器 conformance

先以 `npm start` 启动当前工作区 8130 服务；明确指定自有 fixture，每作位于 `<fixture-root>/<game>/score.dat`。

```powershell
npm run test:storage:browser -- --fixture-root D:\fixtures\saves --package th08=D:\fixtures\th08-content.zip
```

`--package GAME=PATH` 可重复，用现有 UI 导入明确内容包；不从 artifacts 自动挑资源。不指定时要求该站本来就能提供游戏 DATA。测试使用隔离浏览器上下文，不访问日常浏览器存档。

默认矩阵：三作 × Chromium/WebKit × `score-only`/`commands`。后者独立加入平面 probe，覆盖 list/read/write/remove/sync、路径拒绝和删除持久性。两类都包含正常关闭、整页重载、临时 Runtime 导出销毁、再次恢复及精确字节比较。不会要求冷启动自动创建 score 或 cfg。

`--cases nested-write` 是独立增强用例，主动创建 `probe/nested.dat`，报告不能代替 score-only。`--cases restore-failure` 通过 Playwright 的新文档初始化脚本，在预期 Runtime 文档建立 `Module` setter，并让第一次 `FS.syncfs(populate)` 返回失败；不修改产品源码。它要求 Runtime 发出 error，且不得进入 ready/first-frame。两者默认不跑。现有作品专用脚本仅作为旧调查入口保留，后续通用存储验证统一使用本 runner。

输出默认进入 `artifacts/validation/runtime-storage/<timestamp>/`，包括逐项 JSON、导出文件和失败截图。失败用例返回非零；控制台 stderr 单独保留，pageerror 或 Runtime error/fatal 才是运行时失败证据。浏览器版本/构建更新后需重跑；Playwright WebKit 不代表真实 iOS。

每次候选发布都应重新运行所需矩阵，并把报告保存到该候选的外部验收证据中。仓库正文不保存某次本机运行的日期化 PASS，也不把 Playwright WebKit 结果表述为真机 Safari 证明。
