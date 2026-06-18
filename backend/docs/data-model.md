# Data Model

本文以当前 `frontend/src/lib/types.ts` 为基础，转换成后端持久化模型。

## Enums

```ts
type TodoStatus = "todo" | "doing" | "done" | "cancelled";
type TodoPriority = "low" | "medium" | "high" | "urgent";
type AttachmentType = "image" | "link" | "file";
type UndoAction = "ai_create_todo";
```

## DTO Shape

后端返回给前端的字段名保持 camelCase，尽量贴合当前前端类型，减少接入成本。

```ts
interface Todo {
  id: string;
  title: string;
  status: TodoStatus;
  priority: TodoPriority;
  projectId?: string;
  tagIds: string[];
  dueAt?: string;
  reminders: Reminder[];
  contentMarkdown: string;
  originalInput?: string;
  subtasks: Subtask[];
  attachments: Attachment[];
  aiMeta?: TodoAiMeta;
  assignee?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  cancelledAt?: string;
}
```

数据库字段可以使用 snake_case，但 API 层统一转换为 camelCase。

## Tables

### users

```text
id                 text primary key
login_name         text unique not null
login_name_normalized text unique not null
display_name       text
password_hash      text not null
timezone           text not null default 'Asia/Shanghai'
created_at         timestamptz not null
updated_at         timestamptz not null
last_login_at      timestamptz
disabled_at        timestamptz
```

说明：

- `login_name` 是登录名，不要求是邮箱。
- `login_name_normalized` 用于大小写不敏感查重。

### sessions

```text
id             text primary key
user_id        text not null references users(id)
token_hash     text unique not null
user_agent     text
ip_address     text
created_at     timestamptz not null
expires_at     timestamptz not null
revoked_at     timestamptz
```

Cookie 里只放随机 session token，数据库只存 token hash。

### user_settings

```text
user_id                      text primary key references users(id)
schema_version               integer not null default 2
ai_enabled                   boolean not null default true
ai_model                     text not null default 'gpt-4o-mini'
ai_base_url                  text not null default 'https://api.openai.com/v1'
ai_assistant_prompt          text not null
ai_api_key_ciphertext        text
ai_api_key_iv                text
ai_api_key_auth_tag          text
ringtone_enabled             boolean not null default true
ringtone_sound               text not null default 'chime'
ringtone_volume              integer not null default 70
ringtone_advance_minutes     integer not null default 15
feedback_complete_sound      boolean not null default true
feedback_complete_animation  boolean not null default true
feedback_operation_sound     boolean not null default false
theme                        text
created_at                   timestamptz not null
updated_at                   timestamptz not null
```

说明：

- 后端不提供默认模型 Key。用户未保存 Key 时，AI 接口返回 `AI_KEY_REQUIRED`。
- `ai_api_key_ciphertext` 必须加密保存，API 只返回 `hasApiKey`，不返回明文。
- 如果使用 AES-256-GCM，建议同时保存 `iv` 和 `auth_tag`；主密钥从环境变量读取。

### projects

```text
id          text primary key
user_id     text not null references users(id)
name        text not null
color       text
created_at  timestamptz not null
updated_at  timestamptz not null
deleted_at  timestamptz
purge_after timestamptz
```

索引：

```text
unique(user_id, lower(trim(name))) where deleted_at is null
index(user_id, created_at)
```

### tags

```text
id          text primary key
user_id     text not null references users(id)
name        text not null
color       text
created_at  timestamptz not null
updated_at  timestamptz not null
deleted_at  timestamptz
purge_after timestamptz
```

索引同 projects。

### todos

```text
id                text primary key
user_id           text not null references users(id)
title             text not null
status            text not null
priority          text not null
project_id        text references projects(id)
due_at            timestamptz
content_markdown  text not null default ''
original_input    text
ai_meta           jsonb
assignee          text
created_at        timestamptz not null
updated_at        timestamptz not null
completed_at      timestamptz
cancelled_at      timestamptz
deleted_at        timestamptz
purge_after       timestamptz
```

索引：

```text
index(user_id, deleted_at, updated_at desc)
index(user_id, status, due_at)
index(user_id, project_id)
index(user_id, priority)
```

业务约束：

- `status` 必须属于 `todo / doing / done / cancelled`。
- `priority` 必须属于 `low / medium / high / urgent`。
- `title` trim 后不能为空，建议最大 200 字符。
- `content_markdown` 建议限制体积，第一版可先设 1 MB。

### subtasks

```text
id            text primary key
user_id       text not null references users(id)
todo_id       text not null references todos(id)
title         text not null
done          boolean not null default false
position      integer not null default 0
created_at    timestamptz not null
completed_at  timestamptz
deleted_at    timestamptz
purge_after   timestamptz
```

索引：

```text
index(user_id, todo_id, position)
```

### reminders

```text
id            text primary key
user_id       text not null references users(id)
todo_id       text not null references todos(id)
remind_at     timestamptz not null
reason        text
kind          text not null default 'due'
created_at    timestamptz not null
sent_at       timestamptz
dismissed_at  timestamptz
deleted_at    timestamptz
purge_after   timestamptz
```

索引：

```text
index(user_id, remind_at) where sent_at is null and dismissed_at is null and deleted_at is null
index(user_id, todo_id)
```

### attachments

```text
id            text primary key
user_id       text not null references users(id)
todo_id       text references todos(id)
type          text not null
original_name text not null
mime_type     text
size_bytes    bigint not null
checksum_sha256 text
storage_provider text not null default 'local'
storage_key   text not null
content_url   text not null
created_at    timestamptz not null
deleted_at    timestamptz
purge_after   timestamptz
```

说明：

- 第一版使用真实上传，不把图片文件写入 `content_markdown`。
- 第一版 `storage_provider` 固定为 `local`，`storage_key` 指向服务器本机磁盘上的相对路径，例如 `uploads/usr_1/2026/06/file_1`。
- `content_url` 建议为 `/api/v1/files/{id}/content`，读取时后端校验当前用户权限。
- `todo_id` 允许为空，支持“先上传文件，再创建 todo 时绑定 attachmentIds”。
- API DTO 仍返回前端当前需要的 `name / url / mimeType / size`，其中 `name = original_name`，`url = content_url`，`size = size_bytes`。

索引：

```text
index(user_id, todo_id, created_at)
index(user_id, deleted_at, purge_after)
```

### todo_tags

```text
user_id     text not null references users(id)
todo_id     text not null references todos(id)
tag_id      text not null references tags(id)
created_at  timestamptz not null

primary key(todo_id, tag_id)
```

### notification_events

```text
id            text primary key
user_id       text not null references users(id)
type          text not null
title         text not null
body          text
todo_id       text references todos(id)
reminder_id   text references reminders(id)
payload_json  jsonb
created_at    timestamptz not null
read_at       timestamptz
delivered_at  timestamptz
dismissed_at  timestamptz
clicked_at     timestamptz
push_sent_at   timestamptz
push_failed_at timestamptz
push_error     text
deleted_at    timestamptz
purge_after   timestamptz
```

索引：

```text
index(user_id, read_at, created_at desc)
index(user_id, type, created_at desc)
```

### web_push_subscriptions

```text
id              text primary key
user_id         text not null references users(id)
endpoint        text not null
p256dh          text not null
auth            text not null
user_agent      text
device_name     text
enabled         boolean not null default true
last_success_at timestamptz
last_failure_at timestamptz
failure_count   integer not null default 0
created_at      timestamptz not null
updated_at      timestamptz not null
revoked_at      timestamptz
```

索引：

```text
unique(user_id, endpoint)
index(user_id, enabled)
```

说明：

- `endpoint/p256dh/auth` 来自浏览器 `PushSubscription`。
- 如果推送返回 404/410，说明订阅失效，后端应把 `enabled` 设为 false 或写入 `revoked_at`。
- Web Push 的 VAPID private key 不进数据库，只从环境变量读取。

### undo_records

```text
id              text primary key
user_id         text not null references users(id)
action          text not null
todo_id         text references todos(id)
original_input  text
payload_json    jsonb
created_at      timestamptz not null
expires_at      timestamptz
consumed_at     timestamptz
```

第一版只需要保存最近一次未消费的 `ai_create_todo`。创建新的 AI undo record 时，可以把同用户旧记录标记为 consumed。

## Validation Rules

### Todo create

必填：

- `title`

默认值：

- `status`: `todo`
- `priority`: `medium`
- `tagIds`: `[]`
- `reminders`: 如果 `dueAt` 存在则生成默认提醒，否则 `[]`
- `subtasks`: 如果 `contentMarkdown` 有 Markdown task list，则从 Markdown 同步，否则 `[]`
- `attachments`: 从 `attachmentIds` 绑定，默认 `[]`

### Todo update

特殊规则：

- 如果更新 `status = done`，写入 `completed_at = now`。
- 如果从 `done` 改回 `todo`，清空 `completed_at`。
- 如果更新 `status = cancelled`，写入 `cancelled_at = now`。
- 如果更新 `dueAt` 但没有传 reminders，重新生成默认提醒。
- 如果更新 `contentMarkdown`，同步 Markdown 任务列表到 subtasks。

### Project create

- `name` trim 后不能为空。
- 同一用户下项目名唯一。
- 默认颜色为 `#6366F1`。

### Tag create

- `name` trim 后不能为空。
- 同一用户下标签名唯一。
- 默认颜色为 `#6366F1`。
