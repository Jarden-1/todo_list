# Releases

SmartTodo 的版本发布说明。桌面应用基于 [Pake](https://github.com/tw93/Pake)（Rust / Tauri）打包，包装线上站点 `https://todo.zhanghaoyang.cn/`。

## v1.0.0-mac — 2026-07-08

首个桌面版本。

### 下载

- 仓库 tag `v1.0.0-mac` 的 `release/SmartTodo.dmg`（macOS Apple Silicon / aarch64）。

### 包含

- 基于 Pake / Tauri 打包的 macOS 原生 App，包装线上站点（联网即用，后端在腾讯云）。
- 系统托盘常驻：关闭窗口 = 隐藏到托盘，应用不退出，提醒轮询持续运行。
- 1280×800 窗口、自定义蓝紫图标。
- 桌面应用原生系统通知：通过 Tauri `send_notification` 弹出系统级提醒（与页面内弹窗并存）。
- 体积约 10MB（同类 Electron 应用通常 150MB+）。

### 已知限制

- WebView（WKWebView）不支持 Web Push / Push API，但桌面应用已通过 Tauri 原生通知补足系统级提醒；页面内弹窗 + 提示音不受影响。
- Windows / Linux 版本需在各平台用 pake 重新构建（`.ico` 图标已备好，见 `release-assets/`）。

### 备注

- App 直接加载线上站点，线上已包含「桌面应用原生系统通知」等后续增强，无需重新打包即可使用。

## 版本规划

- [ ] Windows 版（需在 Windows 机器用 pake 构建）
- [ ] 自动更新
- [ ] 更多视图（日历、四象限）
