# API Contract

Base URL:

```text
/api/v1
```

所有时间字段使用 ISO 8601 字符串。第一版默认用户时区为 `Asia/Shanghai`，但接口允许客户端传 `timezone`。

## 通用响应

成功：

```json
{
  "data": {}
}
```

列表：

```json
{
  "data": [],
  "meta": {
    "total": 0,
    "nextCursor": null
  }
}
```

错误：

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "标题不能为空",
    "details": {}
  }
}
```

常用状态码：

- `200`: 成功
- `201`: 创建成功
- `204`: 成功但无响应体
- `400`: 参数错误
- `401`: 未登录
- `403`: 无权限
- `404`: 资源不存在
- `409`: 冲突，例如项目名重复
- `422`: 业务校验失败
- `500`: 服务端错误

## Auth

### POST /auth/register

注册账号。注册开放，暂不做邮箱验证码，也不要求邮箱已验证。登录名只要求不重复，可以是邮箱、手机号、用户名或中文名。

Request:

```json
{
  "loginName": "jarden",
  "password": "demo123",
  "displayName": "Jarden"
}
```

Response:

```json
{
  "data": {
    "user": {
      "id": "usr_1",
      "loginName": "jarden",
      "displayName": "Jarden",
      "timezone": "Asia/Shanghai",
      "createdAt": "2026-06-18T03:00:00.000Z"
    }
  }
}
```

### POST /auth/login

密码登录。成功后后端写入 HttpOnly Cookie。

Request:

```json
{
  "loginName": "jarden",
  "password": "demo123"
}
```

Response 同注册。

### POST /auth/logout

退出登录，撤销当前 session。

Response:

```json
{
  "data": {
    "ok": true
  }
}
```

### GET /auth/me

获取当前登录用户。

Response:

```json
{
  "data": {
    "user": {
      "id": "usr_1",
      "loginName": "jarden",
      "displayName": "Jarden",
      "timezone": "Asia/Shanghai"
    }
  }
}
```

## Bootstrap

### GET /workspace/bootstrap

前端首屏推荐调用这个接口，一次拿齐当前用户数据。

Response:

```json
{
  "data": {
    "user": {},
    "settings": {},
    "projects": [],
    "tags": [],
    "todos": [],
    "undoRecord": null,
    "serverTime": "2026-06-18T03:00:00.000Z"
  }
}
```

## Settings

### GET /settings

返回当前用户设置。注意不返回 AI API Key 明文。后端不提供默认 Key，用户没有保存 Key 时 AI 接口不可用。

Response:

```json
{
  "data": {
    "schemaVersion": 2,
    "aiModel": {
      "enabled": true,
      "model": "gpt-4o-mini",
      "baseUrl": "https://api.openai.com/v1",
      "assistantPrompt": "你是 SmartTodo 的 AI 待办助手。",
      "hasApiKey": false
    },
    "ringtone": {
      "enabled": true,
      "sound": "chime",
      "volume": 70,
      "advanceMinutes": 15
    },
    "feedback": {
      "completeSound": true,
      "completeAnimation": true,
      "operationSound": false
    }
  }
}
```

### PUT /settings

整体替换设置。用于导入或保存设置页。

### PATCH /settings

局部更新设置。

Request:

```json
{
  "ringtone": {
    "advanceMinutes": 30
  }
}
```

如果 `advanceMinutes` 变化，后端应重新计算未发送的默认截止提醒。

### PUT /settings/ai-key

保存或替换当前用户的 AI API Key。Key 只在请求体里出现一次，后端加密保存。

Request:

```json
{
  "apiKey": "sk-..."
}
```

Response:

```json
{
  "data": {
    "hasApiKey": true
  }
}
```

### DELETE /settings/ai-key

清除当前用户保存的 AI API Key。

Response:

```json
{
  "data": {
    "hasApiKey": false
  }
}
```

## Todos

### GET /todos

查询当前用户 todos。

Query:

- `status=todo|doing|done|cancelled`
- `projectId=proj_1`
- `priority=low|medium|high|urgent`
- `dueFrom=2026-06-18T00:00:00.000Z`
- `dueTo=2026-06-19T00:00:00.000Z`
- `search=关键词`
- `includeDeleted=false`

第一版前端可以直接获取全部未删除 todos。

### POST /todos

创建普通待办或结构化表单待办。

Request:

```json
{
  "title": "整理后端接口规范",
  "priority": "high",
  "projectId": "proj_1",
  "dueAt": "2026-06-18T10:00:00.000Z",
  "assignee": "Jarden",
  "contentMarkdown": "## 目标\n先对齐接口。",
  "tagIds": [],
  "attachmentIds": ["file_1"]
}
```

Response:

```json
{
  "data": {
    "todo": {}
  }
}
```

### GET /todos/:todoId

获取单个 todo。

### PATCH /todos/:todoId

局部更新 todo。用于详情面板里的标题、正文、状态、优先级、项目、对接人、截止时间等。

Request:

```json
{
  "title": "整理后端 API 规范",
  "status": "doing",
  "contentMarkdown": "## 目标\n完成 API v1。",
  "attachmentIds": ["file_1", "file_2"]
}
```

如果传 `attachmentIds`，后端把它视为当前 todo 的附件集合：校验这些文件都属于当前用户，然后绑定到该 todo。正文里的 Markdown 图片 URL 和 `attachmentIds` 应保持一致。

### DELETE /todos/:todoId

软删除 todo，设置 `deletedAt` 和 `purgeAfter = now + 3 days`。默认不做立即物理删除，方便撤销。后台清理任务会在保留期后物理删除。

### POST /todos/:todoId/duplicate

复制一份 todo。行为对齐前端：

- title 追加 `副本`
- status 重置为 `todo`
- subtasks 全部重置为未完成
- reminders 重新生成 id，并清空 `sentAt / dismissedAt`
- completedAt / cancelledAt 清空

### POST /todos/:todoId/complete

快捷完成 todo，等价于 `PATCH status = "done"`。

### POST /todos/:todoId/uncomplete

从已完成恢复为待办，等价于 `PATCH status = "todo"`。

### POST /todos/:todoId/cancel

取消 todo，等价于 `PATCH status = "cancelled"`。

### POST /todos/:todoId/restore

从软删除恢复 todo，或撤销取消状态。

Request:

```json
{
  "status": "todo"
}
```

## Subtasks

### POST /todos/:todoId/subtasks

Request:

```json
{
  "title": "补数据表设计"
}
```

后端创建 subtask，并把 `- [ ] 补数据表设计` 追加到 `contentMarkdown`。

### PATCH /todos/:todoId/subtasks/:subtaskId

Request:

```json
{
  "title": "补数据模型设计",
  "done": true
}
```

如果切换 `done`，后端同步 Markdown 里的任务勾选状态。

### DELETE /todos/:todoId/subtasks/:subtaskId

删除 subtask，并从 Markdown 里删除对应任务行。

## Files And Attachments

第一版图片和附件走真实文件上传，不把 base64 写入 Markdown 正文。文件默认是私有资源，读取时必须带登录态。

### POST /files

上传图片或普通附件。使用 `multipart/form-data`。

Form fields:

- `file`: 必填，真实文件。
- `todoId`: 可选。编辑已有 todo 时可直接绑定到 todo；新建 todo 时先不传，创建 todo 时再用 `attachmentIds` 绑定。
- `type`: 可选，`image|file`。后端也可以根据 MIME 自动推断。

Response:

```json
{
  "data": {
    "file": {
      "id": "file_1",
      "type": "image",
      "name": "screenshot.png",
      "url": "/api/v1/files/file_1/content",
      "mimeType": "image/png",
      "size": 482391,
      "createdAt": "2026-06-18T03:00:00.000Z"
    }
  }
}
```

前端 Markdown 插入：

```md
![screenshot.png](/api/v1/files/file_1/content)
```

约束建议：

- 图片允许 `image/png`, `image/jpeg`, `image/webp`, `image/gif`。
- 普通附件第一版可允许 PDF、文本、Office 文档和压缩包，后端维护白名单。
- 图片默认最大 10 MB，普通附件默认最大 30 MB。
- 文件名只作为展示名，磁盘存储名使用后端生成的 `fileId` 或随机 key。

### GET /files/:fileId

获取文件元数据。

Response:

```json
{
  "data": {
    "file": {
      "id": "file_1",
      "type": "image",
      "name": "screenshot.png",
      "url": "/api/v1/files/file_1/content",
      "mimeType": "image/png",
      "size": 482391,
      "todoId": "todo_1",
      "createdAt": "2026-06-18T03:00:00.000Z"
    }
  }
}
```

### GET /files/:fileId/content

读取或预览文件内容。后端校验当前用户拥有该文件后，以流式响应返回二进制内容，并设置 `Content-Type`、`Content-Length` 和安全的 `Content-Disposition`。

### DELETE /files/:fileId

软删除文件，设置 `deletedAt` 和 `purgeAfter = now + 3 days`。如果 Markdown 正文还引用这个文件，前端应该同步删除对应 Markdown 图片或链接。

### POST /todos/:todoId/attachments

把已上传但还未绑定的文件挂到 todo 上。

Request:

```json
{
  "attachmentIds": ["file_1", "file_2"]
}
```

### DELETE /todos/:todoId/attachments/:fileId

从 todo 移除附件。第一版建议直接软删附件；如果未来支持文件库，再扩展成只解绑。

## Projects

### GET /projects

返回当前用户项目列表。

### POST /projects

Request:

```json
{
  "name": "工作",
  "color": "#6366F1"
}
```

同一用户下项目名不允许重复，忽略大小写和首尾空格。

### PATCH /projects/:projectId

更新项目名称或颜色。

### DELETE /projects/:projectId

第一版建议删除项目时把该项目下 todos 的 `projectId` 置空。

## Tags

### GET /tags

### POST /tags

Request:

```json
{
  "name": "重要",
  "color": "#EF4444"
}
```

### PATCH /tags/:tagId

### DELETE /tags/:tagId

删除 tag 时同步删除 `todo_tags` 关联。

## AI

### POST /ai/todo-organizations

AI 整理并直接创建 todo。这个接口替代当前前端的 `useAiOrganize + addTodoFromAi`。

调用前要求当前用户已保存 AI API Key，否则返回 `422 AI_KEY_REQUIRED`。

Request:

```json
{
  "input": "这周要把 todo_list 后端接口想清楚，周五前完成。",
  "timezone": "Asia/Shanghai"
}
```

Response:

```json
{
  "data": {
    "todo": {},
    "aiResult": {
      "title": "完成 todo_list 后端接口设计",
      "projectName": "todo_list",
      "priority": "high",
      "dueAt": "2026-06-19T10:00:00.000Z",
      "reminders": [],
      "subtasks": [],
      "contentMarkdown": "## 目标\n完成后端接口设计。",
      "confidence": {},
      "warnings": []
    },
    "undoRecord": {}
  }
}
```

后端应在事务中完成：

1. 调用模型。
2. 解析 JSON。
3. 找到或创建 project。
4. 创建 todo。
5. 创建最近一次 AI 撤销记录。

### POST /ai/markdown-polish

替代当前前端 `useAiPolishMarkdown`。

调用前要求当前用户已保存 AI API Key，否则返回 `422 AI_KEY_REQUIRED`。

Request:

```json
{
  "markdown": "今天要做后端，先看看接口。",
  "timezone": "Asia/Shanghai"
}
```

Response:

```json
{
  "data": {
    "markdown": "## 目标\n完成后端接口梳理。"
  }
}
```

## Undo

### GET /undo/latest

返回当前用户最近一次未过期撤销记录。

### POST /undo/:undoId/apply

第一版只支持 `ai_create_todo`。

Response:

```json
{
  "data": {
    "originalInput": "用户原始输入",
    "deletedTodoId": "todo_1"
  }
}
```

## Reminders

### GET /reminders/due

用于调试或管理端场景查询到期提醒。普通前端展示提醒建议走 notifications。

Query:

- `before=2026-06-18T03:00:00.000Z`

### POST /todos/:todoId/reminders/:reminderId/mark-sent

Request:

```json
{
  "sentAt": "2026-06-18T03:00:00.000Z"
}
```

### POST /todos/:todoId/reminders/:reminderId/dismiss

Request:

```json
{
  "dismissedAt": "2026-06-18T03:00:00.000Z"
}
```

## Notifications

服务端 reminder worker 会把到期提醒写成通知事件，并通过 Web Push 推送给浏览器。前端打开应用时还要拉取通知，用应用内弹窗、toast 和提示音展示；浏览器关闭时由 Service Worker 展示系统通知。

### GET /push/public-key

获取 Web Push VAPID public key。前端用它创建 `PushSubscription`。

Response:

```json
{
  "data": {
    "publicKey": "BEl..."
  }
}
```

### POST /push/subscriptions

保存或更新当前浏览器的 Web Push subscription。用户在前端允许通知权限后调用。

Request:

```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "keys": {
    "p256dh": "base64url...",
    "auth": "base64url..."
  },
  "userAgent": "Mozilla/5.0 ...",
  "deviceName": "Chrome on macOS"
}
```

Response:

```json
{
  "data": {
    "subscription": {
      "id": "wps_1",
      "enabled": true,
      "createdAt": "2026-06-18T03:00:00.000Z"
    }
  }
}
```

### DELETE /push/subscriptions/:subscriptionId

用户关闭提醒或浏览器订阅失效时删除 subscription。

### DELETE /push/subscriptions/current

按当前浏览器提交的 `endpoint` 删除 subscription。

Request:

```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/..."
}
```

### GET /notifications

Query:

- `unread=true`
- `type=reminder`
- `cursor=...`

Response:

```json
{
  "data": [
    {
      "id": "ntf_1",
      "type": "reminder",
      "title": "SmartTodo 提醒：整理后端接口规范",
      "body": "截止时间提醒 · 今天 18:00",
      "todoId": "todo_1",
      "reminderId": "rem_1",
      "createdAt": "2026-06-18T09:45:00.000Z",
      "readAt": null,
      "deliveredAt": null,
      "pushSentAt": "2026-06-18T09:45:01.000Z",
      "pushFailedAt": null
    }
  ],
  "meta": {
    "nextCursor": null
  }
}
```

### POST /notifications/:notificationId/read

标记通知已读。

### POST /notifications/read-all

批量标记通知已读。

### POST /notifications/:notificationId/delivered

前端已经展示 toast 或浏览器通知后调用，用来记录前端已送达。

### POST /notifications/:notificationId/clicked

用户点击系统通知或应用内弹窗后调用，记录点击并可标记已读。

Request:

```json
{
  "markAsRead": true
}
```

## Workspace Import And Export

### GET /workspace/export

导出当前用户完整数据，兼容现有前端备份格式。

第一版如果返回 JSON，只包含结构化数据和附件元数据，不内嵌文件二进制。已上传文件仍保存在服务端，附件 URL 继续指向 `/files/:fileId/content`。

如果后续需要“可离线搬家的完整备份”，建议新增：

```text
GET /workspace/export.zip
```

zip 内包含 `manifest.json` 和 `files/` 目录，导入时再重建附件记录。

### PUT /workspace/import

Request:

```json
{
  "mode": "replace",
  "backup": {
    "app": "SmartTodo",
    "exportedAt": "2026-06-18T03:00:00.000Z",
    "settings": {},
    "data": {
      "todos": [],
      "projects": [],
      "tags": [],
      "undoRecord": null
    }
  }
}
```

第一版只实现 `replace`。

JSON 导入不直接导入文件二进制。需要导入真实文件时，前端先调用 `POST /files` 上传文件，再在导入数据里引用新的 `attachmentIds`。

### DELETE /workspace

清空当前用户工作区数据，包括 todos、projects、tags、undo_records，但不删除用户账号和 session。

默认走软删并设置 `purgeAfter = now + 3 days`，后台清理任务到期后物理删除。

## Admin And Jobs

这部分不是给普通前端直接用的接口，而是后端内部任务。

### reminder-worker

每分钟运行一次：

- 扫描到期且未发送/未忽略 reminders。
- 创建 `notification_events`。
- 查询用户有效的 `web_push_subscriptions` 并发送 Web Push。
- 记录 `pushSentAt / pushFailedAt / pushError`。
- 如果 Web Push 返回 404/410，禁用对应 subscription。
- 标记 reminder 状态，避免重复创建通知。

### purge-soft-deleted-worker

每天运行一次：

- 扫描 `purgeAfter <= now` 的软删数据。
- 按依赖关系物理删除 todo、subtasks、reminders、attachments、todo_tags。
- 项目和标签物理删除前必须确认没有未删除引用。
