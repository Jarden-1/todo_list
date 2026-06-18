# Parallel Backend Development Prompts

这份文档用于把 SmartTodo 后端拆给多个 AI 并行开发。目标是：每个 AI 只改自己负责的目录，避免多人同时改同一个核心文件造成冲突。

## 总体约束

所有 AI 必须遵守：

- 当前有效前端目录是 `frontend/`，`smart-todo/` 是废弃目录，不要读取、修改或参考。
- 后端第一版使用 Node.js + TypeScript + Fastify + Zod + Prisma + PostgreSQL + Redis。
- 认证使用 `loginName + password`，开放注册，不做邮箱验证码、邮箱验证、OAuth。
- Session 使用 HttpOnly Cookie，不把 token 存到 localStorage。
- 所有用户数据必须按 `userId` 隔离。
- AI Key 由用户自己在设置页填写，后端不提供默认 Key；后端加密保存，任何响应都不能返回明文 Key。
- 文件上传第一版不用 COS，固定保存到腾讯云服务器本机磁盘，`storageProvider = "local"`。
- 软删除保留 3 天，软删时写入 `deletedAt` 和 `purgeAfter = now + 3 days`。
- 提醒必须支持 Web Push。浏览器关闭后由 Service Worker 展示系统通知；页面打开时前端展示应用内弹窗、toast 和提示音。
- API 返回结构统一为 `{ "data": ... }`，错误结构统一为 `{ "error": { "code", "message", "details" } }`。
- 所有时间字段使用 ISO 8601 字符串。
- 不要引入与本任务无关的大型重构。

所有 AI 开工前必须先读：

- `backend/README.md`
- `backend/docs/architecture.md`
- `backend/docs/api.md`
- `backend/docs/data-model.md`
- `backend/docs/frontend-integration.md`

## 推荐并行方式

不要让所有 AI 同时从空仓库开始乱建文件。建议分三轮：

1. `AI-0 后端底座` 先创建项目骨架、依赖、Prisma schema、配置、统一错误结构和插件注册。
2. `AI-1` 到 `AI-6` 在底座完成后并行开发各自模块。
3. `AI-7 集成测试` 最后统一接路由、跑测试、修跨模块类型和启动问题。

如果必须所有 AI 同时开始，那么 `AI-0` 只负责先提交骨架，其它 AI 先在各自目录中写 service/schema/test，不改入口文件，等底座合并后再接路由。

## 目录边界建议

第一版建议后端代码目录如下：

```text
backend/
  package.json
  tsconfig.json
  .env.example
  prisma/
    schema.prisma
    migrations/
  src/
    app.ts
    server.ts
    config/
    db/
    plugins/
    common/
    modules/
      auth/
      settings/
      todos/
      files/
      notifications/
      ai/
      workspace/
    jobs/
      reminderWorker.ts
      purgeSoftDeletedWorker.ts
    tests/
```

公共文件归属：

- `package.json`, `tsconfig.json`, `.env.example`, `src/app.ts`, `src/server.ts`, `src/plugins/*`, `src/common/*`, `prisma/schema.prisma` 只允许 `AI-0` 和 `AI-7` 修改。
- `src/modules/auth/**` 只允许 `AI-1` 修改。
- `src/modules/settings/**` 和 AI Key 加密逻辑只允许 `AI-2` 修改。
- `src/modules/todos/**` 只允许 `AI-3` 修改。
- `src/modules/files/**` 只允许 `AI-4` 修改。
- `src/modules/notifications/**` 和 `src/jobs/reminderWorker.ts` 只允许 `AI-5` 修改。
- `src/modules/ai/**` 只允许 `AI-6` 修改。
- `src/modules/workspace/**` 和 `src/jobs/purgeSoftDeletedWorker.ts` 由 `AI-7` 做，建议最后做。

## AI-0：后端底座和数据库提示词

把下面提示词完整发给负责底座的 AI：

```text
你负责 SmartTodo 后端的项目底座和数据库 schema。请只在 backend/ 目录工作，不要修改 frontend/，不要读取或修改 smart-todo/。

先阅读这些文件：
- backend/README.md
- backend/docs/architecture.md
- backend/docs/api.md
- backend/docs/data-model.md
- backend/docs/frontend-integration.md

技术栈固定：
- Node.js + TypeScript
- Fastify
- Zod
- Prisma
- PostgreSQL
- Redis
- Cookie session

你的任务：
1. 初始化 backend 运行时代码骨架。
2. 创建 package.json、tsconfig.json、.env.example、src/app.ts、src/server.ts。
3. 创建统一 config 读取逻辑，包含：
   - NODE_ENV
   - PORT
   - DATABASE_URL
   - REDIS_URL
   - SESSION_COOKIE_NAME
   - SESSION_SECRET
   - AI_KEY_ENCRYPTION_SECRET
   - UPLOAD_DIR
   - SOFT_DELETE_RETENTION_DAYS，默认 3
   - WEB_PUSH_VAPID_PUBLIC_KEY
   - WEB_PUSH_VAPID_PRIVATE_KEY
   - WEB_PUSH_SUBJECT
4. 创建 Prisma schema，覆盖这些表：
   - users
   - sessions
   - user_settings
   - projects
   - tags
   - todos
   - subtasks
   - reminders
   - attachments
   - todo_tags
   - notification_events
   - web_push_subscriptions
   - undo_records
5. 数据库字段以 backend/docs/data-model.md 为准。
6. 创建 common 层：
   - 统一 API error 类型
   - 统一 zod 校验错误转换
   - requireAuth helper 的类型占位
   - userId 数据隔离 helper
   - softDelete helper：默认 purgeAfter = now + 3 days
7. 创建 Fastify 插件：
   - prisma plugin
   - redis plugin
   - cookie/session plugin 的基础结构
   - error handler
8. 创建 health check：
   - GET /api/v1/health 返回 { data: { ok: true } }
9. 不要实现具体业务模块，不要写 auth/todo/files/ai 的业务逻辑，只提供可供其它 AI 使用的底座。

冲突边界：
- 你可以修改 package.json、tsconfig.json、.env.example、prisma/schema.prisma、src/app.ts、src/server.ts、src/config/**、src/common/**、src/plugins/**。
- 你不要修改 src/modules/auth/**、settings/**、todos/**、files/**、notifications/**、ai/**、workspace/** 中的业务实现，最多创建空目录和 README。

验收标准：
- npm install 后 TypeScript 能编译。
- Prisma schema 能格式化。
- health route 能启动。
- 所有表名和核心字段与 backend/docs/data-model.md 对齐。
- 软删默认 3 天，不要写 30 天。
- 文件 storageProvider 默认 local，不要引入 COS SDK。
```

## AI-1：认证和会话模块提示词

```text
你负责 SmartTodo 后端的认证和会话模块。请只修改 backend/src/modules/auth/**，必要时添加该模块自己的测试文件。不要修改 Prisma schema、app.ts、server.ts 或其它模块；如果发现底座缺少 hook，请在输出里说明，不要直接改公共文件。

先阅读：
- backend/README.md
- backend/docs/api.md 的 Auth 和 Bootstrap 部分
- backend/docs/data-model.md 的 users、sessions、user_settings 部分

业务要求：
1. 注册开放，不做邮箱验证码、邮箱验证、OAuth。
2. 登录字段叫 loginName，不叫 email。loginName 只要求不重复，大小写不敏感。
3. 注册接口：
   - POST /api/v1/auth/register
   - request: { loginName, password, displayName? }
   - 创建 user、默认 user_settings、session。
   - 返回 user，不返回 passwordHash。
4. 登录接口：
   - POST /api/v1/auth/login
   - request: { loginName, password }
   - 校验密码，创建 session，写 HttpOnly Cookie。
5. 退出接口：
   - POST /api/v1/auth/logout
   - 撤销当前 session，清 cookie。
6. 当前用户接口：
   - GET /api/v1/auth/me
   - 未登录返回 401。
7. 密码哈希使用 Argon2id；如果项目依赖没有 argon2，可和底座 AI 协调使用 bcrypt，但不要明文存储。
8. Session token 只在 cookie 中保存随机值，数据库只存 token hash。
9. Cookie 必须 HttpOnly，SameSite 第一版建议 lax。生产环境 secure=true。
10. 所有错误使用统一结构：
    - LOGIN_NAME_TAKEN
    - INVALID_CREDENTIALS
    - UNAUTHENTICATED
    - VALIDATION_ERROR

冲突边界：
- 只写 src/modules/auth/**。
- 不改 src/app.ts。你可以导出 authRoutes，由集成 AI 接入。
- 不改 prisma/schema.prisma。如果需要字段变化，写在最终说明里。

建议文件：
- src/modules/auth/auth.routes.ts
- src/modules/auth/auth.service.ts
- src/modules/auth/auth.schemas.ts
- src/modules/auth/session.service.ts
- src/modules/auth/password.ts
- src/modules/auth/auth.types.ts

验收标准：
- loginName normalization 逻辑清晰。
- 所有数据库查询都按 userId/session 做隔离。
- 响应字段与 backend/docs/api.md 对齐。
- 不出现 email 字段命名。
```

## AI-2：设置和用户 AI Key 模块提示词

```text
你负责 SmartTodo 后端的 Settings 模块和用户 AI Key 加密保存。请只修改 backend/src/modules/settings/**，不要修改 auth/todos/files/notifications/ai 模块。

先阅读：
- backend/docs/api.md 的 Settings 部分
- backend/docs/data-model.md 的 user_settings 部分
- backend/docs/architecture.md 的 AI 能力部分

业务要求：
1. 实现：
   - GET /api/v1/settings
   - PUT /api/v1/settings
   - PATCH /api/v1/settings
   - PUT /api/v1/settings/ai-key
   - DELETE /api/v1/settings/ai-key
2. 响应不能返回 AI API Key 明文，只能返回 hasApiKey。
3. 后端不提供默认 Key。用户没有保存 Key 时，AI 模块会返回 AI_KEY_REQUIRED。
4. apiKey 只在 PUT /settings/ai-key 请求体出现一次，后端加密保存。
5. 加密建议 AES-256-GCM：
   - ciphertext
   - iv
   - authTag
   - master key 从 AI_KEY_ENCRYPTION_SECRET 读取。
6. PATCH /settings 支持局部更新：
   - aiModel.enabled
   - aiModel.model
   - aiModel.baseUrl
   - aiModel.assistantPrompt
   - ringtone.enabled
   - ringtone.sound
   - ringtone.volume
   - ringtone.advanceMinutes
   - feedback.completeSound
   - feedback.completeAnimation
   - feedback.operationSound
7. 如果 advanceMinutes 变化，不要直接改 reminders 模块；只暴露一个 TODO 或事件接口说明，让 todos/notifications 模块后续重算未发送提醒。
8. 每个设置请求都必须 requireAuth，并且只操作当前 userId。

冲突边界：
- 只写 src/modules/settings/**。
- 不改 Prisma schema，不改 app.ts。
- 你可以导出 settingsRoutes 和 settingsService。

建议文件：
- src/modules/settings/settings.routes.ts
- src/modules/settings/settings.service.ts
- src/modules/settings/settings.schemas.ts
- src/modules/settings/aiKeyCrypto.ts
- src/modules/settings/settings.dto.ts

验收标准：
- GET settings 返回结构贴合 backend/docs/api.md。
- hasApiKey 正确。
- 明文 key 不进入日志、不进入响应。
- 删除 key 后 hasApiKey=false。
```

## AI-3：Todo、Project、Tag、Subtask 模块提示词

```text
你负责 SmartTodo 后端的核心 Todo 模块，包括 todos、projects、tags、subtasks、todo_tags、reminders 的基础生成。请只修改 backend/src/modules/todos/**。

先阅读：
- backend/docs/api.md 的 Todos、Subtasks、Projects、Tags、Reminders 部分
- backend/docs/data-model.md 的 projects、tags、todos、subtasks、reminders、todo_tags 部分
- backend/docs/architecture.md 的 Todo 业务规则、删除和清理部分

业务要求：
1. 实现 Projects：
   - GET /api/v1/projects
   - POST /api/v1/projects
   - PATCH /api/v1/projects/:projectId
   - DELETE /api/v1/projects/:projectId
   - 同一用户下项目名大小写/trim 后唯一。
   - 删除项目时，把未删除 todos 的 projectId 置空，项目本身软删，purgeAfter = now + 3 days。
2. 实现 Tags：
   - GET /api/v1/tags
   - POST /api/v1/tags
   - PATCH /api/v1/tags/:tagId
   - DELETE /api/v1/tags/:tagId
   - 删除 tag 时删除 todo_tags 关联，tag 软删。
3. 实现 Todos：
   - GET /api/v1/todos
   - POST /api/v1/todos
   - GET /api/v1/todos/:todoId
   - PATCH /api/v1/todos/:todoId
   - DELETE /api/v1/todos/:todoId
   - POST /api/v1/todos/:todoId/duplicate
   - POST /api/v1/todos/:todoId/complete
   - POST /api/v1/todos/:todoId/uncomplete
   - POST /api/v1/todos/:todoId/cancel
   - POST /api/v1/todos/:todoId/restore
4. 创建 todo 默认：
   - status = todo
   - priority = medium
   - tagIds = []
   - reminders = dueAt 存在时按 settings.ringtoneAdvanceMinutes 生成默认提醒，否则 []
5. 状态规则：
   - status done 写 completedAt
   - done 改回 todo 清 completedAt
   - status cancelled 写 cancelledAt
   - cancelled 恢复时清 cancelledAt
6. 软删除：
   - todo 删除写 deletedAt 和 purgeAfter = now + 3 days。
   - 恢复只能恢复 purgeAfter 未过期的数据。
7. Markdown task list 与 subtasks 同步：
   - contentMarkdown 中的 - [ ] / - [x] 要同步为 subtasks。
   - subtask 增删改要同步回 Markdown。
   - 先实现稳定可读的同步逻辑，不要过度复杂。
8. attachments：
   - POST/PATCH todo 接收 attachmentIds。
   - 只校验并绑定属于当前用户、未删除的 attachments。
   - 不实现文件上传逻辑，文件上传归 files 模块。
9. 每个查询、更新、删除必须带 userId，不能只按 id 操作。

冲突边界：
- 只写 src/modules/todos/**。
- 不改 files 模块，不改 notifications 模块，不改 Prisma schema。
- 你可以导出 todosRoutes、projectsRoutes、tagsRoutes。

建议文件：
- src/modules/todos/todos.routes.ts
- src/modules/todos/todos.service.ts
- src/modules/todos/todos.schemas.ts
- src/modules/todos/projects.service.ts
- src/modules/todos/tags.service.ts
- src/modules/todos/subtasks.service.ts
- src/modules/todos/reminders.service.ts
- src/modules/todos/markdownTasks.ts
- src/modules/todos/todo.dto.ts

验收标准：
- API DTO 为 camelCase。
- userId 隔离完整。
- 软删统一 3 天。
- 不出现硬删除 todo 的普通删除行为。
```

## AI-4：文件上传和附件模块提示词

```text
你负责 SmartTodo 后端的真实文件上传和附件模块。请只修改 backend/src/modules/files/**。

先阅读：
- backend/docs/api.md 的 Files And Attachments 部分
- backend/docs/data-model.md 的 attachments 部分
- backend/docs/architecture.md 的 图片和附件 部分

业务决策：
- 第一版不用 COS。
- 上传文件固定保存到腾讯云服务器本机磁盘。
- storageProvider 固定为 local。
- 文件读取是私有的，必须登录并校验 userId。

业务要求：
1. 实现：
   - POST /api/v1/files
   - GET /api/v1/files/:fileId
   - GET /api/v1/files/:fileId/content
   - DELETE /api/v1/files/:fileId
   - POST /api/v1/todos/:todoId/attachments
   - DELETE /api/v1/todos/:todoId/attachments/:fileId
2. POST /files 使用 multipart/form-data：
   - file 必填。
   - todoId 可选。
   - type 可选，image|file。
3. 存储路径：
   - 使用 UPLOAD_DIR。
   - 建议路径：uploads/{userId}/{yyyy}/{mm}/{fileId}
   - 不要信任用户原始文件名作为磁盘文件名。
4. 数据库存 metadata：
   - originalName
   - mimeType
   - sizeBytes
   - checksumSha256
   - storageProvider = local
   - storageKey
   - contentUrl = /api/v1/files/:fileId/content
5. 限制：
   - 图片默认最大 10MB。
   - 普通附件默认最大 30MB。
   - 图片 MIME: image/png, image/jpeg, image/webp, image/gif。
   - 普通附件可先支持 pdf、txt、markdown、doc/docx、xls/xlsx、zip。
6. GET content：
   - 校验登录态。
   - 校验文件属于当前 userId 且未删除。
   - stream 返回文件。
   - 设置 Content-Type、Content-Length、Content-Disposition。
7. DELETE /files/:fileId：
   - 软删，deletedAt=now，purgeAfter=now+3 days。
   - 不立即删除磁盘文件。
8. 不要实现 COS，不要引入 COS SDK。

冲突边界：
- 只写 src/modules/files/**。
- 不改 todos 模块。如果需要绑定 todo，只在 files 模块实现 attachment route 或导出 service 给集成 AI 使用。
- 不改 Prisma schema。

建议文件：
- src/modules/files/files.routes.ts
- src/modules/files/files.service.ts
- src/modules/files/files.schemas.ts
- src/modules/files/localDiskStorage.ts
- src/modules/files/mimePolicy.ts
- src/modules/files/file.dto.ts

验收标准：
- Markdown 可使用返回的 url：/api/v1/files/:fileId/content。
- 私有文件不能通过公开静态目录访问。
- 删除文件后 content 返回 404。
- 磁盘路径没有目录穿越风险。
```

## AI-5：提醒、通知、Web Push 模块提示词

```text
你负责 SmartTodo 后端的提醒、通知和 Web Push。请只修改 backend/src/modules/notifications/** 和 backend/src/jobs/reminderWorker.ts。

先阅读：
- backend/docs/api.md 的 Reminders、Notifications、Admin And Jobs 部分
- backend/docs/data-model.md 的 reminders、notification_events、web_push_subscriptions 部分
- backend/docs/architecture.md 的 提醒方案 部分
- backend/docs/frontend-integration.md 的 提醒接入 部分

硬性要求：
- 浏览器关闭后也必须能弹系统通知，所以 Web Push 是第一版必做。
- 页面打开时还要支持应用内弹窗/toast 数据来源。
- Web Push 要用 VAPID public/private key。

业务要求：
1. 实现 Web Push subscription 接口：
   - GET /api/v1/push/public-key
   - POST /api/v1/push/subscriptions
   - DELETE /api/v1/push/subscriptions/:subscriptionId
   - DELETE /api/v1/push/subscriptions/current
2. POST subscription 保存：
   - endpoint
   - keys.p256dh
   - keys.auth
   - userAgent
   - deviceName
   - userId
   - enabled=true
   - 同一 userId + endpoint 重复时更新，而不是插入重复记录。
3. 实现通知接口：
   - GET /api/v1/notifications
   - POST /api/v1/notifications/:notificationId/read
   - POST /api/v1/notifications/read-all
   - POST /api/v1/notifications/:notificationId/delivered
   - POST /api/v1/notifications/:notificationId/clicked
4. reminderWorker：
   - 每分钟扫描 remindAt <= now 且未发送/未忽略/未删除的 reminders。
   - 为每个到期 reminder 创建 notification_events。
   - 查询该用户 enabled 的 web_push_subscriptions。
   - 发送 Web Push payload，payload 至少包含：
     - notificationId
     - todoId
     - reminderId
     - title
     - body
     - url
   - 发送成功写 pushSentAt。
   - 发送失败写 pushFailedAt、pushError。
   - 如果 Web Push 返回 404/410，禁用 subscription 或写 revokedAt。
   - 标记 reminder.sentAt，避免重复发送。
5. GET /notifications 支持：
   - unread=true
   - type=reminder
   - cursor
6. 所有操作必须按 userId 隔离。
7. 如果用户拒绝通知权限，后端仍生成站内 notification_events；前端打开应用后仍能看到应用内弹窗。

冲突边界：
- 只写 src/modules/notifications/** 和 src/jobs/reminderWorker.ts。
- 不改 todos 模块创建 reminder 的逻辑。
- 不改 frontend，这里只实现后端。
- 不改 Prisma schema。

建议文件：
- src/modules/notifications/push.routes.ts
- src/modules/notifications/notifications.routes.ts
- src/modules/notifications/push.service.ts
- src/modules/notifications/notifications.service.ts
- src/modules/notifications/webPushClient.ts
- src/modules/notifications/notification.dto.ts
- src/jobs/reminderWorker.ts

验收标准：
- VAPID public key 可以返回给前端。
- subscription 可以保存、更新、删除。
- 到期 reminder 能创建站内通知并尝试 Web Push。
- 浏览器关闭通知链路的数据都准备好。
```

## AI-6：AI 代理模块提示词

```text
你负责 SmartTodo 后端的 AI 代理模块。请只修改 backend/src/modules/ai/**。

先阅读：
- backend/docs/api.md 的 AI 和 Undo 部分
- backend/docs/architecture.md 的 AI 能力 部分
- frontend/src/hooks/useAiOrganize.ts
- frontend/src/hooks/useAiPolishMarkdown.ts
- frontend/src/lib/aiTodoResult.ts
- frontend/src/lib/markdownImages.ts

业务要求：
1. AI Key 策略：
   - 后端不提供默认 Key。
   - 必须读取当前用户 settings 中加密保存的 AI Key。
   - 没有 Key 返回 422 AI_KEY_REQUIRED。
   - 不要在日志中输出 Key。
2. 实现：
   - POST /api/v1/ai/todo-organizations
   - POST /api/v1/ai/markdown-polish
   - GET /api/v1/undo/latest
   - POST /api/v1/undo/:undoId/apply
3. todo-organizations：
   - 输入自然语言 input 和 timezone。
   - 使用用户 settings 的 model、baseUrl、assistantPrompt。
   - 调模型，要求模型返回结构化 JSON。
   - 对模型输出做 Zod 校验和兜底。
   - 在事务中：
     - 找到或创建 project。
     - 创建 todo。
     - 创建 reminders/subtasks/tags 关联。
     - 创建 undoRecord。
   - 返回 todo、aiResult、undoRecord。
4. markdown-polish：
   - 输入 markdown 和 timezone。
   - 不要把图片二进制发给模型。
   - 对 Markdown 中的图片 URL 或占位符保持不删除、不乱移动。
   - 返回润色后的 markdown，不直接保存 todo。
5. undo：
   - 第一版只支持 ai_create_todo。
   - apply 后软删对应 todo 或按当前文档定义删除，并标记 undo consumed。
6. 错误码：
   - AI_KEY_REQUIRED
   - AI_MODEL_ERROR
   - AI_RESULT_INVALID
   - UNDO_EXPIRED
   - UNDO_ALREADY_CONSUMED

冲突边界：
- 只写 src/modules/ai/**。
- 不改 settings 模块的加密实现；通过 settings service 或约定接口读取解密后的 key。
- 不改 todos 模块；如果需要创建 todo，调用 todos service，或者先在 ai 模块中写清楚 integration TODO，由集成 AI 接起来。
- 不改 frontend。

建议文件：
- src/modules/ai/ai.routes.ts
- src/modules/ai/ai.service.ts
- src/modules/ai/ai.schemas.ts
- src/modules/ai/modelClient.ts
- src/modules/ai/prompts.ts
- src/modules/ai/aiResultParser.ts
- src/modules/ai/undo.routes.ts
- src/modules/ai/undo.service.ts

验收标准：
- 没有用户 Key 时不会调用模型。
- 不返回、不记录 AI Key。
- 模型输出不可信，必须校验。
- 返回结构与 backend/docs/api.md 对齐。
```

## AI-7：Workspace、清理任务和集成测试提示词

```text
你负责 SmartTodo 后端的 workspace 导入导出、软删清理任务、路由集成和最终验收。请在其它 AI 的模块完成后开始。

先阅读所有后端文档和其它 AI 已完成的代码。

任务：
1. 实现 Workspace：
   - GET /api/v1/workspace/bootstrap
   - GET /api/v1/workspace/export
   - PUT /api/v1/workspace/import
   - DELETE /api/v1/workspace
2. bootstrap 一次返回：
   - user
   - settings
   - projects
   - tags
   - todos
   - undoRecord
   - serverTime
3. export：
   - 兼容前端现有备份格式。
   - JSON 导出只包含结构化数据和附件元数据，不内嵌文件二进制。
4. import：
   - 第一版只实现 replace。
   - 导入时重新绑定 userId。
   - 不做登录后自动导入。
5. DELETE /workspace：
   - 清空当前用户工作区数据，不删除用户账号和 session。
   - 默认软删，purgeAfter = now + 3 days。
6. purgeSoftDeletedWorker：
   - 每天运行。
   - 扫描 purgeAfter <= now 的软删数据。
   - 按依赖关系物理删除 todo、subtasks、reminders、attachments、todo_tags。
   - 删除 attachments 时同步删除本机磁盘文件。
7. 路由集成：
   - 把 auth/settings/todos/files/notifications/ai/workspace routes 挂到 /api/v1。
8. 测试：
   - 至少覆盖 auth、todo 创建/软删、settings AI key hasApiKey、file upload metadata、notification subscription、workspace bootstrap。
9. 修复跨模块类型和启动问题。

冲突边界：
- 你可以改 src/app.ts 做最终 route 注册。
- 你可以改 src/modules/workspace/** 和 src/jobs/purgeSoftDeletedWorker.ts。
- 可以做少量跨模块修复，但必须保持每个模块原本职责，不要重写其它 AI 的业务。

验收标准：
- npm test 或项目约定测试命令通过。
- TypeScript 编译通过。
- 所有第一阶段接口至少能启动并返回统一错误格式。
- 不出现 30 天软删。
- 不出现 COS 实现。
- Web Push subscription 接口存在。
```

## 前端 AI：提醒弹窗和 Web Push 提示词

把下面提示词发给负责前端的 AI。它只做前端，不做后端。

```text
你负责 SmartTodo 前端的提醒弹窗、浏览器系统通知和 Web Push 接入。请只修改 frontend/，不要修改 backend/，不要读取或修改 smart-todo/。

先阅读：
- backend/docs/frontend-integration.md 的 提醒接入 部分
- backend/docs/api.md 的 Notifications 和 Push subscription 接口
- frontend/src/contexts/SettingsContext.tsx
- frontend/src/contexts/TodoContext.tsx
- frontend/src/hooks/useTodoReminderScheduler.ts 如果存在
- 当前设置页和提醒相关 UI

后端接口约定：
- GET /api/v1/push/public-key
- POST /api/v1/push/subscriptions
- DELETE /api/v1/push/subscriptions/:subscriptionId
- DELETE /api/v1/push/subscriptions/current
- GET /api/v1/notifications?unread=true
- POST /api/v1/notifications/:id/delivered
- POST /api/v1/notifications/:id/read
- POST /api/v1/notifications/read-all
- POST /api/v1/notifications/:id/clicked

核心需求：
1. 页面打开时：
   - 拉取未读通知。
   - 对 reminder 通知展示应用内弹窗，不只是 toast。
   - 同时可以播放用户设置的提示音。
   - 用户点击弹窗可以打开对应 todo 详情。
   - 展示后调用 delivered。
   - 用户确认/查看后调用 read。
2. 浏览器关闭时：
   - 必须能通过 Web Push 弹系统通知。
   - 前端需要注册 Service Worker。
   - Service Worker 收到 push 后调用 showNotification。
   - 用户点击系统通知时打开或聚焦 SmartTodo，并跳到对应 todo。
   - 点击后调用 clicked，或者把 notificationId 传给页面由页面调用 clicked。
3. 设置页：
   - 增加或接入“开启提醒/浏览器通知”的控制。
   - 用户开启时调用 Notification.requestPermission()。
   - 权限允许后注册 service worker，获取后端 public key，创建 PushSubscription，并 POST 到后端保存。
   - 用户关闭时取消订阅，并调用后端删除 subscription。
   - 如果权限被拒绝，要给明确提示，但页面内提醒仍可工作。
4. 不要继续依赖纯前端本地定时器作为主提醒机制。后端 reminder worker 才是提醒来源。
5. 如果后端还没实现，可以先封装 apiClient 方法和 UI 状态，保留清晰 TODO，但不要写死假数据。

建议新增或修改文件：
- frontend/src/lib/pushNotifications.ts
- frontend/public/sw.js
- frontend/src/hooks/useNotifications.ts
- frontend/src/components/NotificationDialog.tsx
- frontend/src/contexts/SettingsContext.tsx
- frontend/src/pages/SettingsPage.tsx
- frontend/src/contexts/TodoContext.tsx 或对应打开 todo 详情的状态入口

Service Worker 行为建议：
- 监听 push 事件。
- payload 包含 notificationId、todoId、title、body、url。
- showNotification(title, { body, data, icon, badge })。
- 监听 notificationclick。
- 关闭通知。
- clients.matchAll 查找已打开页面；有则 focus 并 postMessage；没有则 clients.openWindow(url)。

应用内弹窗行为建议：
- 弹窗标题使用通知 title。
- 正文显示 body。
- 主按钮：查看任务。
- 次按钮：稍后。
- 查看任务后标记 read，并打开 todo 详情。
- 稍后只关闭弹窗，不一定 read。

验收标准：
- 用户打开页面时能看到未读提醒弹窗。
- 用户允许通知后，前端能向后端保存 PushSubscription。
- Service Worker 能处理 push 和 notificationclick。
- 浏览器关闭时的系统通知链路具备实现条件。
- 如果没有 HTTPS 或通知权限被拒绝，UI 有合理提示。
```

## 最低冲突协作规则

分发任务时，把这段也发给每个 AI：

```text
协作规则：
1. 只修改自己提示词允许的目录。
2. 不要格式化全仓库。
3. 不要重命名其它模块文件。
4. 不要改其它 AI 的接口签名，确实需要时只在最终说明里提出。
5. 不要改 smart-todo/。
6. 不要把软删写成 30 天，必须是 3 天。
7. 不要接 COS，文件存储固定 local。
8. 不要把 AI Key 写入响应或日志。
9. 每个接口都必须按 userId 隔离。
10. 完成后输出：改了哪些文件、暴露了哪些 route/service、还需要集成 AI 做什么。
```
