<div align="center">
  <img src="docs/assets/eagler-touhou-wordmark.svg" alt="EAGLER TOUHOU" width="312">
  <p>一个在 Web 上运行东方 Project 原作的<strong>游戏启动器</strong>和<strong>联机平台</strong>。</p>
  <p>
    <a href="https://qm.qq.com/q/lNOiECzKFi?from=tim"><img src="https://img.shields.io/badge/QQ%20Group-1121412929-12B7F5?logo=tencentqq" alt="QQ Group 1121412929"></a>
    <img src="https://img.shields.io/badge/Node.js-%3E%3D22-43853d" alt="Node.js >=22">
    <img src="https://img.shields.io/badge/Python-3-3776ab" alt="Python 3">
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  </p>
  <p><a href="https://github.com/YomotsuHisami/eagler-touhou/blob/main/docs/README.md">开发文档 📄</a>&nbsp;|&nbsp;<a href="https://touhou.vip/">立刻体验 🎮</a></p>
  <p>在保证原作体验的基础上，提供 触控适配 + 个性化布局、thprac 适配、多语言（基于 thcrap）、存档和 Replay 管理、多人联机大厅。<br>
  在安全上下文条件下，启动器网页<strong>可以被离线运行</strong>。在玩家离线或服务器宕机时，玩家即使刷新了页面也可以使用 Service Worker 提供的缓存文件正常进行游戏。</p>
</div>

## 详细功能

### 完整的原作体验

- 允许用户在浏览器中运行 TH06 和 TH07 (TH08 WIP），并提供导入导出存档、Replay 等文件的界面。
- 存档、Replay 等完全和原版互通。
- 力求完美体验。解决了原 portable 分支中出现的 弹幕抖动、弹幕运动不流畅、闪烁、单线程切换音乐卡顿、手机卡顿 等大量问题。
- 优化非常好，至少能在骁龙 660 上稳定 90Hz 运行。
- 支持高刷新率（>60Hz）。\[感谢 [reallyportable](https://github.com/some100/th07/tree/reallyportable)\]

### 触控适配

- 触摸轨迹 = 游戏人物移动轨迹。提供直接触摸、无限速直接触摸，除此之外，还提供轮盘等移动方式。\[感谢 [reallyportable](https://github.com/some100/th07/tree/reallyportable)\]
- 触控布局自定义。触控按键可以随意拖动、缩放（60% ~ 180%）。
- 提供放大镜，允许玩家在游戏中即时地用双指缩放手势去放大游戏画面。再也不怕看不清弹幕了（x
- 可以保存触控 Replay，并且直接记录输入到游戏里的触摸轨迹。
- 触控菜单手势。\[by [reallyportable](https://github.com/some100/th07/tree/reallyportable)\]
- 触控灵敏度。
- 可以调整游戏画面的默认位置。
- 提供按住按钮、切换按钮和双指操作等低速方式。

### thprac 适配

- 适配 [thprac](https://github.com/touhouworldcup/thprac) 的所有功能。
- 支持在触控设备上使用模拟鼠标，并提供打开 Tab Tracker 和作弊菜单的模拟按键。（你如果需要 F12 菜单的话，讲讲为什么。）

### 多语言

- 理论上支持 [thcrap 语言仓库](https://srv.thpatch.net/) 里的所有语言包。
- 服务器可以按作品指定语言包。你可以往里面加一堆奇怪的语言包，玩家只下载他选中的那个。

### 多人联机大厅

- 提供 TH06MP 和 TH07MP，均基于 [TH07MP 的规则](https://github.com/sbrik1111/th07_multi_player)。
- 提供了一个大厅，支持创建房间后输入房间号加入、选择角色和难度（包括 Extra 和 Phantasm）、玩家都准备后再开始、旁观者。
- 支持暂停后按 R 或者手动重开本局。
- 可以保存多人 Replay。
- 优先使用 WebRTC，也可以通过 WebSocket Relay 连接。
- 支持旁观。旁观者不占玩家席位，只能观看，不会参与游戏状态（但不能中途进入旁观）。
- 单人和多人的存档和 Replay 相互隔离，不过允许共用设置。

### 游戏包与离线运行

- 可以从站点安装游戏包，也可以导入自己合法持有的游戏包 ZIP；
- 游戏包安装后保存在浏览器本地，游戏数据、OGG、字体和语言包可以分别管理；运行组件由站点统一提供；
- 在 HTTPS 或可信 loopback 等安全上下文中，已经安装的游戏和启动器可以离线运行；
- 玩家导入的原版游戏数据不会上传服务器，只会保存在浏览器本地。

## 许可证

使用 [MIT License](LICENSE)。

完整的第三方来源、素材归属和许可信息见 [THIRD_PARTY.md](THIRD_PARTY.md) 与 [ASSETS.md](ASSETS.md)。
