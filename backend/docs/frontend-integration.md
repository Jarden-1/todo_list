# Frontend Integration Plan

本文只针对当前有效前端目录 `frontend/`。`smart-todo/` 已废弃，不参与接入。

## 当前前端状态

主要本地状态来源：

- `frontend/src/lib/storage.ts`
  - `smarttodo:todos`
  - `smarttodo:projects`
  - `smarttodo:tags`
  - `smarttodo:undo`
- `frontend/src/contexts/SettingsContext.tsx`
  - `smarttodo:settings`
- `frontend/src/contexts/ThemeContext.tsx`
  - theme

主要业务入口：

- `TodoProvider`: todo、project、tag、undo 的所有增删改查
- `SettingsProvider`: AI、提醒、反馈设置
- `LoginPage`: 当前是本地模拟登录
- `useAiOrganize`: 前端直连模型并返回结构化结果
- `useAiPolishMarkdown`: 前端直连模型并返回 Markdown
- `useTodoReminderScheduler`: 前端本地轮询提醒并标记 sent

## 接入原则

- 先保留前端现有交互和 UI，不重做页面。
- 先用 `GET /workspace/bootstrap` 替代本地初始化。
- 逐步把 `TodoProvider` 内部方法改成 API 调用。
- 前端可以做 optimistic update，但失败时要回滚或重新拉取。
- 登录态用 Cookie，不把 token 放进 localStorage。

## 建议新增前端模块

```text
frontend/src/lib/apiClient.ts
frontend/src/contexts/AuthContext.tsx
frontend/src/lib/pushNotifications.ts
frontend/public/sw.js
```

`apiClient` 统一处理：

- baseUrl
- `credentials: "include"`
- JSON 解析
- 错误转换
- 401 后跳转登录页

`AuthContext` 负责：

- `user`
- `loading`
- `login(loginName, password)`
- `register(loginName, password, displayName)`
- `logout()`
- `refreshMe()`

## TodoProvider 方法映射

| 当前方法 | 后端接口 |
| --- | --- |
| 初始化 `getTodos/getProjects/getTags/getUndoRecord` | `GET /api/v1/workspace/bootstrap` |
| `addTodo` | `POST /api/v1/todos` |
| `updateTodo` | `PATCH /api/v1/todos/:todoId` |
| `deleteTodo` | `DELETE /api/v1/todos/:todoId` |
| `restoreTodo` | `POST /api/v1/todos/:todoId/restore` |
| `duplicateTodo` | `POST /api/v1/todos/:todoId/duplicate` |
| `completeTodo` | `POST /api/v1/todos/:todoId/complete` |
| `uncompleteTodo` | `POST /api/v1/todos/:todoId/uncomplete` |
| `cancelTodo` | `POST /api/v1/todos/:todoId/cancel` |
| `addProject` | `POST /api/v1/projects` |
| `addTag` | `POST /api/v1/tags` |
| `addTodoFromAi` | `POST /api/v1/ai/todo-organizations` |
| `undoLastAiCreate` | `POST /api/v1/undo/:undoId/apply` |
| `toggleSubtask` | `PATCH /api/v1/todos/:todoId/subtasks/:subtaskId` |
| `addSubtask` | `POST /api/v1/todos/:todoId/subtasks` |
| `deleteSubtask` | `DELETE /api/v1/todos/:todoId/subtasks/:subtaskId` |
| `markReminderSent` | `POST /api/v1/todos/:todoId/reminders/:reminderId/mark-sent` |
| `replaceWorkspaceData` | `PUT /api/v1/workspace/import` |
| `clearWorkspaceData` | `DELETE /api/v1/workspace` |

## Markdown 图片和附件接入

当前 `frontend/src/lib/markdownImages.ts` 会把图片读成 data URL。接后端后这块要改成真实上传：

1. 用户在 Markdown 编辑器粘贴、选择或拖入图片。
2. 前端调用 `POST /api/v1/files`，用 `multipart/form-data` 上传文件。
3. 后端返回 `{ id, name, url, mimeType, size }`。
4. 前端在 Markdown 光标处插入 `![name](url)`。
5. 前端把返回的文件加入当前 todo 的 `attachments`，保存 todo 时把 `attachmentIds` 一起传给后端。

编辑已有 todo 时，可以上传时直接传 `todoId`；新建 todo 时，先上传未绑定文件，创建 todo 时传 `attachmentIds` 绑定。

需要替换或新增的前端模块：

```text
frontend/src/lib/fileUploads.ts
frontend/src/lib/markdownImages.ts
frontend/src/components/markdown/useMarkdownEditorController.ts
```

AI 润色时不需要把图片二进制发给模型。Markdown 中的文件 URL 可先转成占位符，模型返回后再还原，沿用当前占位符思路即可。

## SettingsProvider 方法映射

| 当前方法 | 后端接口 |
| --- | --- |
| 初始化 `loadSettings` | `GET /api/v1/settings` 或 bootstrap |
| `updateAiModel` | `PATCH /api/v1/settings` |
| `updateRingtone` | `PATCH /api/v1/settings` |
| `updateFeedback` | `PATCH /api/v1/settings` |
| `replaceSettings` | `PUT /api/v1/settings` |
| `resetSettings` | `PUT /api/v1/settings` with defaults |

注意：

- 前端不再保存模型 API Key 到 localStorage。
- 设置页保留 API Key 输入框，提交后只发送给后端保存，后端返回 `hasApiKey`。
- 后端不提供默认 Key；用户没有保存 Key 时，AI 按钮应提示先去设置页填写 Key。

## LoginPage 改造

当前登录页字段文案如果还是邮箱，需要改成“登录名”和密码。登录名不要求是邮箱，只要求不重复。

需要改动：

- 初始页面根据 `GET /auth/me` 判断是否已登录。
- 点击登录调用 `POST /auth/login`。
- 登录成功后拉取 `GET /workspace/bootstrap`。
- 退出登录调用 `POST /auth/logout`，然后清空内存状态并回到登录页。
- 暂不做邮箱验证码、找回密码、邮箱验证。

可以保留演示账号：

- 后端 seed 一个 `demo / demo123`。
- 登录页继续预填这个账号。

## AI 接入改造

### AI 整理

当前：

```text
useAiOrganize -> 直连模型 -> addTodoFromAi
```

目标：

```text
POST /api/v1/ai/todo-organizations -> 返回 todo + aiResult + undoRecord
```

前端收到结果后：

- 把返回的 todo 插入列表顶部。
- 更新 undoRecord。
- 清空输入框。
- toast 展示 `已创建：title`。
- 撤销按钮调用 `POST /undo/:undoId/apply`。

### AI 润色

当前：

```text
useAiPolishMarkdown -> 直连模型 -> updateTodo
```

目标：

```text
POST /api/v1/ai/markdown-polish -> PATCH /todos/:id
```

或者后端提供合并接口：

```text
POST /api/v1/todos/:todoId/markdown-polish
```

第一版建议先用通用 `ai/markdown-polish`，前端继续自己决定是否保存。

## 本地演示数据和导入

当前 localStorage 数据只作为演示数据，不自动迁移为真实账号数据。

第一版建议：

- 用户登录后直接以服务端工作区为准。
- 设置页已有“导入数据”按钮，保留为手动导入入口。
- 导入时读取用户选择的备份 JSON，然后调用 `PUT /workspace/import`。
- 导入成功后重新调用 `GET /workspace/bootstrap` 刷新当前工作区。
- 不弹“是否导入本地数据”的自动迁移提示，避免用户误把演示数据当真实数据。

## 提醒接入

需要改动：

- 前端不再单独判断所有提醒是否到期，服务端 reminder worker 负责生成通知事件。
- 用户开启提醒时，前端调用 `Notification.requestPermission()` 申请系统通知权限。
- 权限允许后，注册 Service Worker，并用 `GET /push/public-key` 返回的 VAPID public key 创建 Push Subscription。
- 前端调用 `POST /push/subscriptions` 把 subscription 保存到后端。
- 应用打开后调用 `GET /notifications?unread=true` 拉取未读提醒，并展示应用内弹窗、toast 和提示音。
- 如果要做在线实时提醒，第一版可以加 SSE；没有 SSE 时用短轮询也可以。
- 浏览器关闭时，Web Push 会唤起 Service Worker，由 `sw.js` 调用 `showNotification` 展示系统通知。
- 用户点击系统通知时，Service Worker 打开或聚焦 SmartTodo 页面，并调用或转交页面调用 `POST /notifications/:id/clicked`。
- 前端展示应用内弹窗、toast 或系统通知后，调用 `POST /notifications/:id/delivered`。
- 用户查看后，调用 `POST /notifications/:id/read` 或 `POST /notifications/read-all`。
- `markReminderSent` 只保留为调试或兼容接口，不再作为主提醒链路。

这部分确实需要改前端。后端负责计算到期提醒、保存订阅、发送 Web Push；前端负责申请权限、注册 Service Worker、保存订阅、展示应用内弹窗和处理系统通知点击。

## 导入导出接入

当前设置页有：

- 导出数据
- 导入数据
- 恢复默认
- 清空数据

后端化后：

- 导出数据调用 `GET /workspace/export`。
- 导入数据读取 JSON 后调用 `PUT /workspace/import`。
- 恢复默认调用 `PUT /settings`。
- 清空数据调用 `DELETE /workspace`。

## 实施顺序

1. 增加后端 auth 和 `workspace/bootstrap`。
2. 前端增加 `apiClient` 和 `AuthContext`，让登录真实生效。
3. `TodoProvider` 从 bootstrap 初始化，仍保留内存 state。
4. 接入 todo 创建、更新、删除、完成、取消。
5. 接入 projects、tags、settings。
6. 把 AI 整理和润色切到后端。
7. 接入 Web Push 和应用内提醒弹窗。
8. 接入导入导出和清空数据。
9. 去掉核心数据的 localStorage 写入，只保留 UI 偏好或离线草稿。

## 风险点

- Markdown 与 subtasks 双向同步必须保持一致，否则详情页会出现勾选状态错位。
- AI 接口要做 JSON 解析和兜底校验，不能直接相信模型输出。
- Markdown 图片要先上传再插入 URL，不能继续把大文件写成 data URL。
- Cookie session 需要配置 CORS credentials 和 SameSite。
- 私有文件 URL 如果直接放在 Markdown 里，渲染图片时请求也必须带 Cookie；跨域部署时要确认 `credentials` 和图片加载策略。
- Web Push 生产环境要求 HTTPS 和有效域名；如果只用 IP 地址部署，浏览器系统通知可能无法正常订阅。
- 浏览器关闭时只能显示系统通知，不能显示 React 应用里的自定义弹窗；应用内弹窗需要页面打开后再补展示未读通知。
- 如果前端做 optimistic update，失败回滚策略要统一，不要每个按钮各写一套。
