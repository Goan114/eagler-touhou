# Game adapter contract

静态产品注册入口是已有 `product-catalog.mjs` 的 `PRODUCT_GAMES`。不新增平行 `game-registry.mjs`。

| 声明 | 直接消费者 |
| --- | --- |
| title / number / subtitle / Runtime URL | 无远端清单时的 Launcher bootstrap |
| storage.saveRoot / scoreFile / configFiles | 通用存储 runner；Launcher 导入/导出读取 scoreFile。configFiles 描述允许的配置名，不要求启动必然创建。 |
| features.thprac / focusHitbox | 静态产品能力上限；Host Manifest 可按实际 Runtime 能力进一步关闭，但不能反向启用产品不支持的能力。 |
| features.replayManagement | Launcher 静态功能入口；Host 无权覆盖。 |
| features.languages | 发布器的静态产品能力上限；浏览器实际可选语言只由 Host `languageOptions` 和 Package language component 表达。 |
| replay.prefix | Replay 管理文件名适配；仅在 replayManagement 为 true 时声明。 |
| package.dataFileId / dataTarget | DATA 导入器读取声明的目标文件名。 |
| package.musicSourceDirectories / musicMounts | 发布器从调用方提供的每作 assets/OGG 根目录定位音乐源，并使用静态 Runtime mount；旧包 adapter 也从同一 owner 取得 OGG target，不依赖部署是否发布 OGG。 |
| dataProvider | `lib/runtime-data-provider.mjs` 按 ingestion 类型选择 Shell marker 与 layout 规则；preload 与 retail-memory 保持独立实现。 |
| multiplayerRuntime / multiplayer | MP Runtime 可用性、难度/机体范围与诊断入口；Launcher 不从游戏名推导。 |

安装代际、hash、bytes、OGG 集合版本仍归 Host Manifest / Package Descriptor，不能写入静态产品注册表。开发站的源路径与内容文件列表位于 `development-content.mjs`，`development-host-manifest.mjs` 从实际 TH06/TH07 DATA、Runtime layout 和各作音乐文件构造与正式站相同 schema 的开发 Host Manifest；只有当前无法从工作树读取的原始内容身份保留为输入声明。音乐可用性与本次 effective mode 归 `src/launcher/music-availability.mts`，只消费能力与安装/远端资源状态，不进行 I/O；Launcher 保存显式偏好，临时 fallback 不覆盖它。正式 release 的 import 站消费同一次 hosted 构建生成的 Host Manifest，不回到工作树中的开发身份。

`host-manifest/1` 的 per-game `features` 只接受可选 boolean `thprac` / `focusHitbox`，用于约束具体 Runtime 的可用能力。字段缺失时保留早期 schema-1 部署的静态默认；`replayManagement` 和 `languages` 不属于该动态覆盖面。未知或类型错误的 Host feature 必须在 manifest validation 时拒绝，不能通过对象展开进入 Launcher UI。

历史 `game-data-pack/1` / `offline-game-pack/1` 只保留读取兼容：ZIP 解析归 `legacy/legacy-game-pack.mjs`，旧 localStorage / Cache Storage / 自定义 IndexedDB 的迁移与清理归 `legacy/legacy-import-storage.mjs`。旧 `game-data-import.js/.mjs` 模块 URL 不再属于发布契约；新导入必须跨入 Package Store，不能继续制造旧存储状态。

## 尚待迁移的差异

| 范围 | 处理方向 |
| --- | --- |
| 旧导入缓存兼容白名单 | 迁移协议有历史范围，不能直接将所有新游戏加入旧缓存路径。 |
| 特定产品维护提示、原始 DAT 解码 | 属于专门产品/格式实现；不因出现游戏名就删除。TH08 专属整顿已按用户要求取消。 |

新增游戏应重新检索 Launcher/package-server/verifier 的游戏条件分支，并先填写声明、验证共同 contract；不能把未知能力当成 TH07 默认值。临时审计结果不作为长期仓库文档保存。
