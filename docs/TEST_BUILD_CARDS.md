# 测试版卡片开关

本次只接入 TH10 转译版。普通版 TH08（th08-modern.html）保持原有可见性；TH08 x86/v86 转译版是另一个产品，目前没有 Launcher 卡片，本次不新增。

TH10 由唯一产品目录的 testOnly 声明控制。Host Manifest shared.testBuild 必须是布尔 true 才开启；false、缺省、非法值或清单不可用均不开启。这是产品入口开关，不是敏感资源的访问控制。

开发服务器产生 testBuild: true。打包不继承开发清单的开关：scripts/package-server.mjs 默认 false，只有 --test-build=1 开启。npm run import -- --test-build=1 透传到 import 打包；普通 npm run import 和 --test-build=0 保持关闭。不要从 web-validation 或 web-release profile 名推断测试版。开关不会自动添加缺失的 Runtime，所选产品仍须通过原有发布输入校验。

TH10 静态卡片默认 hidden。加载后分类、点击、深链接恢复和 ensureRuntime 使用同一开关。开关不删除包或存档。正式版可见5卡（06/07/普通08/06MP/07MP），测试版可见6卡（增加TH10转译版）。

本地验证（2026-09-10）：Launcher TypeScript构建、产品目录、Host Manifest、开发清单测试通过。tests/test-test-build-cards-browser.mjs使用真实编译Launcher和import清单，覆盖false/true/缺省/非法字符串/清单503、深链接、隐藏卡片程序点击、分类刷新，以及禁JavaScript时普通08可见/10隐藏，无pageerror。tests/test-card-filter-browser.py的--test-build参数对应测试版6卡，默认对应正式5卡。

浏览器测试需要Playwright，可用PLAYWRIGHT_MODULE指定现有安装模块URL。现场证据：.cache/validation/test-build-cards-20260910/browser.json。本地验证不代表公网已部署，部署由独立xhigh子代理执行。

资源声明：产品目录 cardArtwork 为普通06/07/08声明对应webp，TH10为null（现有渐变背景）。hostArtworkFiles据此生成打包依赖，保留站点favicon，避免正式打包强制要求不存在的th10-card.webp。frontend-manifest测试已覆盖四作依赖与TH10-only选择。


## 本次交付状态

2026-09-10，Luna xhigh 部署子代理已将测试版 import 候选部署到 https://test.touhou.vip/ 。线上 shared.testBuild=true、resourceMode=import；TH10 转译版与普通 TH08 均通过浏览器实际点击选中验证，没有新增 TH08 转译卡片。公网 verifier PASS，共172文件；当前与回滚目录的完整性均校验通过。主线程未执行公网操作。

当前 releaseId：sha256-cf3d910f4251f7329957c6bbdd8153073a96253f53cb5cfaee72f35437929b35。
本地候选：D:/workspace/eagler/dist/deploy-import-th10-test-20260910-r4。
结果与验证日志：D:/workspace/eagler/dist/deploy-import-th10-test-20260910-r4-evidence/RESULT.md。
回滚目录：/var/www/eagler-touhou-backup-20260910-test-r4-pre-cf3d910f。

测试版通过 --test-build=1 打包；真实游戏与手机性能尚未验证，未执行回滚或 Git 提交。此前 SSH 失败的阻塞已解除。
