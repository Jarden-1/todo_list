# Backend Architecture

## 目标

后端第一版要承接前端已经存在的个人待办工作流：

- 账号登录后，每个用户看到自己的待办、项目、标签、设置和撤销记录。
- 前端不再直接把核心数据写入 `localStorage`，服务端成为数据源。
- AI 能力由后端调用模型服务，前端只调用 SmartTodo 自己的 API。
- 当前前端本地数据只作为演示数据，不自动迁移成真实账号数据；设置页的导入导出能力保留，并升级成用户数据备份能力。

## 服务边界

后端负责：

- 用户、会话和权限校验
- 数据持久化
- Todo 业务规则
- 文件上传、私有读取和附件元数据维护
- AI 提示词组装和模型调用
- 导入导出
- 服务端提醒调度
- 通知事件生成和发送状态记录
- Web Push 订阅管理和推送发送
- 软删数据到期后的物理清理任务

前端继续负责：

- 视图分组，例如今日、时间轴、项目、优先级、已完成
- 详情面板交互
- 消费后端生成的提醒通知
- 浏览器通知权限申请、Service Worker 注册、Web Push 订阅和本地播放提示音
- 临时 UI 状态，例如当前选中的 todo、折叠分组、详情面板宽度

## 认证方案

注册开放。第一版不做邮箱验证码，也不要求邮箱验证。

建议流程：

1. 用户用 `loginName + password` 注册或登录。
2. 后端校验密码，创建 session。
3. 后端通过 `Set-Cookie` 写入 HttpOnly Session Cookie。
4. 前端请求时带 `credentials: "include"`。
5. 后端从 session 解析 `userId`，所有数据查询都带 `userId` 过滤。

登录名规则：

- `loginName` trim 后不能为空。
- 同一系统内 `loginName` 唯一，大小写不敏感。
- `loginName` 可以是邮箱、手机号、英文用户名或中文名，不验证它是否真的是邮箱。

为什么不用前端 localStorage token：

- 前端现在已经有本地数据，接下来要减少敏感信息暴露面。
- HttpOnly Cookie 可以避免 JS 直接读到会话凭据。
- 个人工具第一版用服务端 session 比 JWT 刷新链路更简单。

## 用户数据隔离

所有核心表都必须包含 `user_id`：

- `todos`
- `projects`
- `tags`
- `todo_tags`
- `subtasks`
- `reminders`
- `attachments`
- `notification_events`
- `web_push_subscriptions`
- `user_settings`
- `undo_records`

任何通过 `id` 查询、更新、删除的接口都必须同时校验 `user_id`，不能只靠全局 id。

## AI 能力

当前前端有两个 AI 入口：

- `useAiOrganize`: 把自然语言整理成结构化待办，并创建 todo。
- `useAiPolishMarkdown`: 润色 todo 正文 Markdown。

接后端后建议变成：

- `POST /api/v1/ai/todo-organizations`: 后端调用模型并在一个事务里创建 todo。
- `POST /api/v1/ai/markdown-polish`: 后端调用模型，只返回润色后的 Markdown。

API Key 策略：

- 后端不提供默认模型 Key。
- 用户必须在设置页填写自己的 API Key 后才能使用 AI 整理和 AI 润色。
- API Key 由后端加密保存，接口永远不返回明文 Key。
- 设置接口可以返回 `hasApiKey: true`，不能返回 `apiKey`。
- 如果用户清除 Key，AI 接口返回 `422 AI_KEY_REQUIRED`。

## Todo 业务规则

后端需要复刻当前前端的重要行为：

- 创建 todo 时，默认 `status = "todo"`，`priority = "medium"`。
- 如果设置了 `dueAt` 且没有传 reminders，按用户设置的 `advanceMinutes` 生成默认提醒。
- 修改 `dueAt` 且没有显式传 reminders 时，重新生成默认提醒。
- 修改 `status = "done"` 时写入 `completedAt`。
- 修改 `status = "cancelled"` 时写入 `cancelledAt`。
- 修改 Markdown 正文时，如果正文里有 `- [ ]` 或 `- [x]`，同步 subtasks。
- 增删改 subtasks 时，同步 Markdown 任务列表，避免详情页显示不一致。

## 删除和清理

第一版默认软删，避免用户误操作后立即丢数据。

推荐策略：

- 普通删除 todo/project/tag 时写入 `deletedAt` 和 `purgeAfter`。
- 默认保留 3 天，超过 `purgeAfter` 后由后台清理任务物理删除。
- `purgeAfter` 建议可通过环境变量 `SOFT_DELETE_RETENTION_DAYS` 配置。
- 恢复接口只能恢复还未过期的数据。
- “清空工作区”是高风险操作，第一版也可以先写软删并设置统一清理期限。

## 提醒方案

提醒不能只依赖前端本地定时器。第一版需要由服务端判断哪些提醒到期，并生成通知事件；浏览器关闭后也必须能弹系统通知，所以 Web Push 是第一版必做项。

推荐流程：

1. 用户创建或修改带 `dueAt` 的 todo 时，后端按用户设置的提前时间生成 reminder。
2. 前端在用户开启提醒时申请 Notification 权限，注册 Service Worker，并把 Web Push subscription 上传给后端。
3. 后台 reminder worker 每分钟扫描 `remindAt <= now` 且未发送/未忽略的 reminders。
4. worker 为到期提醒创建 `notification_events`。
5. 如果用户有有效 Web Push subscription，后端发送 Web Push。浏览器关闭时由 Service Worker 展示系统通知。
6. 如果用户当前打开应用，前端同时通过 `GET /notifications?unread=true` 或 SSE 收到提醒，并展示应用内弹窗、toast 和提示音。
7. 前端展示应用内弹窗或 Service Worker 处理通知点击后，调用通知已送达/已读接口。

注意：

- Web Push 要求 HTTPS。腾讯云部署时需要配置域名和 TLS 证书；本地开发可以在 `localhost` 调试。
- Web Push 需要 VAPID 公私钥，后端通过环境变量配置。
- iOS Safari 对 Web Push 有额外限制，第一版可以先覆盖桌面 Chrome/Edge 和 Android Chrome，再在实现阶段单独验证 iOS。
- 如果用户拒绝浏览器通知权限，服务端仍然生成站内通知；前端在应用打开时继续弹应用内提醒。

## 导入导出

当前前端导出格式是：

```json
{
  "app": "SmartTodo",
  "exportedAt": "2026-06-18T00:00:00.000Z",
  "settings": {},
  "data": {
    "todos": [],
    "projects": [],
    "tags": [],
    "undoRecord": null
  }
}
```

后端第一版应兼容这个格式，方便用户通过设置页手动导入备份。

导入策略建议：

- 默认 replace 模式，清空当前用户工作区后写入备份。
- 未来再支持 merge 模式。
- 导入时重新绑定 `user_id`。
- 如果备份里的 id 冲突，第一版可以保留原 id，因为数据限定在当前用户下。
- 不做登录后自动导入。当前本地数据只用于演示，真实数据以用户账号里的服务端数据为准。

## 图片和附件

用户确认第一版就使用真实文件上传，不再把图片用 base64 写进 Markdown 正文。

### 存储结论：本机磁盘

当前决策：

- `storage_provider` 第一版固定为 `local`。
- 文件目录由环境变量 `UPLOAD_DIR` 指定，默认可用项目运行目录下的 `uploads/`。
- 服务器迁移时需要一起迁移数据库和 `uploads/` 目录。
- 后续如果真的需要对象存储，再扩展存储适配层；第一版不接 COS。

推荐策略：

- 前端粘贴、选择或拖入图片时，先调用 `POST /api/v1/files`，使用 `multipart/form-data` 上传真实文件。
- 后端把文件保存在腾讯云服务器本机磁盘，例如 `uploads/{userId}/{yyyy}/{mm}/{fileId}`，数据库 `attachments` 表保存原始文件名、MIME、大小、校验和、存储路径和所属 todo。
- 后端返回附件元数据和可访问 URL，例如 `/api/v1/files/:fileId/content`。
- Markdown 正文插入 `![文件名](/api/v1/files/:fileId/content)`，todo 的 `attachments` 数组同步包含这个文件。
- 读取文件时必须校验登录态和 `user_id`，不能把私有文件暴露成公开静态目录。
- 第一版限制单文件大小和允许的 MIME 类型。建议图片 10 MB 以内，普通附件 30 MB 以内；具体限制可通过环境变量配置。
- 删除 todo 时附件跟随软删，达到 `purgeAfter` 后后台任务同时删除数据库记录和磁盘文件。
- 用户从正文删除图片引用时，前端可调用 `DELETE /files/:fileId`，后端软删附件；也可以先保留为未引用附件，后续做清理任务。

未来如果文件量变大，再考虑对象存储。接口和 Markdown URL 不需要变化，后端只需要把 `storage_provider` 从 `local` 扩展到新的 provider。

## 暂不处理

- 团队协作、共享项目、权限角色。
- 多设备实时同步。
- 短信、邮件等外部提醒渠道。
- 对象存储、图片 CDN、缩略图和转码。
- 完整操作历史。当前只保留最近一次 AI 创建撤销记录。
