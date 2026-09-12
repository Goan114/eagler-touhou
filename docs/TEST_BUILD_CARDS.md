# 测试版卡片开关

TH10 转译版是 `testOnly` 产品。普通版 TH08（`th08-modern.html`）始终是
独立产品；Launcher 没有 TH08 x86/v86 转译版卡片。

Host Manifest 的 `shared.testBuild` 必须严格等于布尔值 `true` 才显示
TH10。`false`、字段缺失、非法值或 Host Manifest 不可用都关闭测试产品。
这是产品入口开关，不是敏感资源的访问控制。

开发服务器生成 `testBuild: true`。打包不继承开发清单状态：
`scripts/package-server.mjs` 默认关闭，只有 `--test-build=1` 开启；
`npm run import -- --test-build=1` 透传该设置。不要从 `web-validation` 或
`web-release` profile 名推断测试版。开关不会补齐缺失 Runtime，所选产品
仍须通过原有发布输入校验。

TH10 静态卡片带有正常导航地址但默认 `hidden`。分类、点击、深链接恢复和
Runtime 启动都使用 `productEnabledForBuild`，因此脚本触发隐藏卡片也不能
绕过开关。正式版显示 5 张卡片（TH06、TH07、普通 TH08、TH06MP、TH07MP）；
测试版增加 TH10，共 6 张。

产品目录中 TH06、TH07、TH08 声明对应卡图，TH10 的 `cardArtwork` 为
`null` 并使用现有渐变背景。Host artwork 清单据此生成打包依赖，不要求
不存在的 `th10-card.webp`。

验证命令：

```powershell
node tests/test-product-selection.mjs
node tests/test-host-manifest.mjs
npm run test:test-build-cards:browser
```

前两项是仓库 contract；最后一项是显式 Chromium 浏览器 lane，覆盖
`true`、关闭/缺失/非法值、清单失败、分类与刷新、隐藏卡片点击和无
JavaScript 的静态可见性。它不属于 `npm run check:workspace`，也不证明
公网部署、真实游戏或手机性能。
