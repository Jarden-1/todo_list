# SmartTodo

> 一个面向个人使用的智能待办管理工具——用自然语言快速记下待办，一键让 AI 帮你结构化、排期、拆子任务。

SmartTodo（仓库名 `todo_list`）把 **Markdown 富文本编辑**、**图片/链接资料整理**、**AI 自动结构化** 与 **提醒** 整合到一个清爽的界面里。你只用一个输入框写下想法，点一下「AI 整理」，结构化待办就生成好了——可撤销、可继续改。

## 核心特性

- **统一添加入口**：一个输入框，支持 Markdown / 图片 / 链接，配一个「AI 整理」按钮，不拆分多个入口。
- **AI 整理**：一次性完成润色、提取标题/时间/提醒/优先级/项目/标签/子任务，并直接创建待办；支持撤销回到原始输入。
- **富文本待办正文**：标题、加粗、列表、引用、代码块、分割线、链接、图片（上传 / 粘贴 / 拖拽）。
- **多视图管理**：今日 / 时间轴 / 项目 / 优先级 / 已完成。
- **详情面板**：2×2 网格编辑优先级、对接人、项目、截止时间；自绘截止时间选择器支持「精确时刻 / 某天 / 某周 / 不设置」四种精度与滚轮时分。
- **提醒与通知**：应用内 60s 轮询弹窗 + 提示音；桌面应用额外支持系统原生通知（托盘常驻）。
- **账号与数据隔离**：注册登录，用户维度数据隔离。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React + TypeScript + Vite |
| 后端 | Node.js + Fastify + Prisma + PostgreSQL + Redis |
| 鉴权 | HttpOnly Cookie Session |
| AI | 用户自定义 API Key（服务端加密存储） |
| 桌面端 | Pake（Rust / Tauri）包装线上站点 |
| 部署 | 腾讯云 + Nginx + HTTPS（Certbot） |

## 本地开发

### 后端（backend/）

```bash
cd backend
npm install
cp .env.example .env      # 按需填写 DATABASE_URL / REDIS_URL / SESSION_SECRET / AI_KEY_ENCRYPTION_SECRET
npm run prisma:generate
npm run dev               # http://localhost:3000 ，健康检查 GET /api/v1/health
```

### 前端（frontend/）

```bash
cd frontend
npm install
npm run dev               # Vite 开发服务器，默认代理 /api -> http://localhost:3000
```

打开浏览器访问 Vite 提示的本地地址即可。

## 桌面应用 SmartTodo

SmartTodo 提供基于 [Pake](https://github.com/tw93/Pake)（Rust / Tauri）打包的 **macOS 原生桌面应用**，将线上站点 `https://todo.zhanghaoyang.cn/` 包装为一个轻量 App。

- **下载**：仓库 `v1.0.0-mac` tag 下的 `release/SmartTodo.dmg`（详见 [RELEASES.md](./RELEASES.md)）。
- **特性**：Apple Silicon（aarch64）、约 10MB、系统托盘常驻、1280×800 窗口、自定义图标。
- **提示**：App 直接加载线上站点，因此后端功能与提醒逻辑随线上更新自动生效，无需重新打包。

> 不想安装？直接访问在线版 <https://todo.zhanghaoyang.cn/> 即可使用全部功能。

## 提醒与通知

| 渠道 | 说明 |
|---|---|
| 应用内提醒 | 前端 60s 轮询 `GET /notifications`，弹窗 + 提示音。需保持窗口打开或最小化到托盘。 |
| 桌面原生通知 | macOS 桌面应用通过 Tauri `send_notification` 弹出系统级通知。 |
| 浏览器通知 | Web 端依赖 Web Push / 浏览器权限。 |

## 在线版本与部署

- 线上地址：<https://todo.zhanghaoyang.cn/>
- 前端为静态构建，由 Nginx 托管；`/api/` 反代到后端（`:3000`）。
- 后端为常驻 Node 服务，提醒由服务端定时扫描并推送通知事件。

## 相关文档

- [SPEC.md](./SPEC.md)：产品规格与数据模型。
- [backend/README.md](./backend/README.md)：后端运行说明与已接入能力。

## 发布

版本与下载见 [RELEASES.md](./RELEASES.md)。
