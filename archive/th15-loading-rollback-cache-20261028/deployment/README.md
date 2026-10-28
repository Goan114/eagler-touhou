# TH15 多人回滚缓存修复主站发布

修复提交 `88b5a614d99ec12790565b1b886bf3fc71257d30` 已发布到 `touhouonline.com` 与 `touhou.vip`，资源加载前释放已经确认失效的快照缓存。

## 运行时身份

- 版本：`1.0.3-eagler-d02086076c28`。
- WASM SHA-256：`d02086076c28b5c1c795f2aaf4e3b471fac4ccfac8964c7713e68d74e1144a50`。
- Runtime generation：`94db993f3f2fd1652a1b6d6e32e078361dd793fcf9e208465ee27ed0ee7185ba`。
- 日本主站 release：`sha256-8a1829dccb39916486d3c80027d33edca4e332de516a5f0db3a7d55f04a8e25d`。
- 原主站 release：`sha256-2151f71658bd039da5b027676400d8381228b0e154a3c0a207a73e2da88b0c67`。

## 发布范围

基于两站当时的线上发布包，只替换 TH15 多人 generation 中的 `th15.wasm`、`th15.mjs`、`manifest.json`、`crash-code-identities.json`，并更新 `shell.mjs` 中的版本标记。新发布同时更新运行时指针、AppShell 与整站清单。

发布器断言恰好 5 个运行时文件发生变化，其余作品的 generation 描述保持一致。保留现有 `multiplayer.mjs` 桥接代码；现有游戏资源复用。129 测试站指针保持原值，发布操作没有重启 relay 或 TURN。两站 Web 边缘同步定时器恢复为 active。

原主站来源包核对覆盖全部清单对象，对同步服务更新的 `sync-version.json` 单独核对 schema 与原发布声明中的 deployment SHA；这项核对随服务器回执保存。

## 验证回执

- [日本主站组装](assembled-jp.json)、[原主站组装](assembled-cn129.json)：候选包验证、5 文件差异、来源 release、AppShell 身份。
- [日本主站切换](published-jp.json)、[原主站切换](published-cn129.json)：CDN 候选验证通过后原子切换源站。
- [日本服务器](server-jp.json)、[129 服务器](server-cn129.json)：每站发布器通过 76 个文件探测及 3 个资源路由探测，Web 定时器为 active。
- [公网验证](public-runtime.json)：两个主域名与日、中镜像，全部命中新 generation，每个入口验证 15 个文件，并核对其余作品 generation 保持一致。
- [新主域名浏览器](browser-jp.json)、[原主域名浏览器](browser-cn.json)：15 文件哈希、WASM 编译、加载器模块导入均通过，无页面异常。
