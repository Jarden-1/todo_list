# Todo List 项目 Spec

## 1. 项目定位

这是一个面向个人使用的智能待办管理工具。

它不是传统的简单 checklist，而是一个结合 Markdown 编辑、图片/链接资料整理、AI 自动结构化和提醒能力的待办系统。

核心目标：

- 让用户可以用自然语言快速写下待办。
- 允许待办正文支持 Markdown、图片、链接等富内容。
- 通过一个 AI 整理按钮，把自由输入转换成结构清晰的待办。
- 用户不需要手动保存，AI 整理后默认创建待办。
- 用户可以撤销 AI 输出，也可以继续手动修改结果。
- 通过时间轴、项目、优先级等视图管理同一批待办。

## 2. 产品原则

### 2.1 一个添加入口

不拆分“传统添加”和“AI 添加”两个入口。

统一使用一个添加区：

```text
[写下待办，支持 Markdown / 图片 / 链接]
[AI 整理]
```

用户可以只写一句标题，也可以写复杂内容。

### 2.2 一个 AI 按钮

不提供一排 AI 功能按钮。

只保留一个核心按钮：

```text
AI 整理
```

点击后一次性完成：

- 润色文本
- 生成 Markdown 正文
- 提取标题
- 识别时间
- 识别提醒
- 判断优先级
- 识别项目
- 提取标签
- 拆分子任务
- 补充注意事项

### 2.3 AI 直接创建待办

点击 `AI 整理` 后，系统直接生成一条待办，不再要求用户额外点击保存。

创建完成后显示反馈：

```text
已创建待办：完成 todo_list 第一版设计
[撤销]
```

### 2.4 用户始终有控制权

AI 可以主动整理，但不能覆盖用户的控制权。

必须支持：

- 撤销最近一次 AI 创建结果
- 回到 AI 整理前的原始输入
- 修改 AI 生成后的任意字段
- 修改 Markdown 正文
- 修改时间、提醒、项目、优先级、标签和子任务

## 3. 核心使用流程

### 3.1 智能添加流程

```text
用户输入自由内容
-> 点击 AI 整理
-> AI 返回结构化结果
-> 系统创建待办
-> 待办进入对应视图
-> 用户可以撤销或继续编辑
```

示例输入：

```md
这周要把 todo_list 项目第一版想清楚，最好周五前能做出添加和展示。
重点是 md 编辑、图片链接和 ai 整理，提醒功能可以先做基础版。
```

示例输出：

```text
标题：完成 todo_list 项目第一版设计
项目：todo_list
优先级：高
截止时间：本周五 18:00
提醒：截止前 1 天 09:00

正文：
## 目标
完成 todo_list 项目第一版设计与基础实现。

## 子任务
- 设计待办字段
- 设计添加入口
- 设计时间轴、项目、优先级视图
- 支持 Markdown 正文
- 支持图片和链接
- 接入 AI 整理
- 实现基础提醒

## 注意事项
- AI 整理后应保留撤销能力
- 时间识别结果必须允许用户手动修改
- 第一版优先保证添加和展示流程顺畅
```

### 3.2 普通快速添加流程

用户只输入短标题时，也可以直接创建普通待办。

推荐交互：

```text
输入标题 -> Enter 创建普通待办
```

普通待办默认字段：

- 状态：未完成
- 项目：未分配
- 优先级：普通
- 截止时间：无
- 提醒：无

创建后用户可以点开卡片继续编辑。

### 3.3 撤销流程

AI 整理后必须保留最近一次操作记录。

```text
AI 整理创建待办
-> 显示撤销入口
-> 用户点击撤销
-> 删除刚创建的待办
-> 恢复原始输入
```

撤销只处理最近一次 AI 创建操作。后续可以扩展为完整操作历史。

## 4. 信息架构

### 4.1 主导航

第一版不需要收件箱。

左侧主导航：

```text
今日
时间轴
项目
优先级
已完成
```

### 4.2 页面布局

推荐桌面端布局：

```text
左侧：导航
顶部：添加区
中间：当前视图列表
右侧：待办详情面板
```

移动端布局：

```text
顶部：添加区
中间：视图切换 tabs
主体：待办卡片列表
详情：底部抽屉或独立页面
```

## 5. 视图设计

### 5.1 今日视图

用途：每天打开后知道今天要处理什么。

展示范围：

- 今天截止的待办
- 今天有提醒的待办
- 已逾期但未完成的待办
- 用户手动标记为今天处理的待办

排序建议：

1. 逾期
2. 今天明确时间
3. 今天无明确时间
4. 高优先级

### 5.2 时间轴视图

用途：管理近期节奏和截止时间。

分组：

```text
逾期
今天
明天
本周
下周
未来
无截止时间
```

组内排序：

1. 截止时间升序
2. 优先级降序
3. 更新时间降序

### 5.3 项目视图

用途：查看每个项目的推进情况。

分组：

```text
项目 A
项目 B
未分配项目
```

项目头部展示：

- 项目名称
- 未完成数量
- 最近截止任务
- 完成进度

项目内排序可选：

- 按截止时间
- 按优先级
- 按状态

第一版可以默认按截止时间排序。

### 5.4 优先级视图

用途：聚焦高价值或紧急事项。

分组：

```text
紧急
高
普通
低
```

第一版先不做完整四象限。

原因：

- 四象限需要用户额外判断“重要”和“紧急”两个维度。
- 填写成本较高。
- AI 可以后续辅助判断，但第一版先保持轻量。

### 5.5 已完成视图

用途：归档和回顾。

展示：

- 完成时间
- 原项目
- 原优先级
- 原截止时间

排序：

```text
完成时间倒序
```

## 6. 待办卡片设计

### 6.1 列表卡片

列表中保持克制，避免完整 Markdown 把页面撑得很长。

卡片内容：

```text
[完成勾选] 标题                      [优先级]
项目 / 标签
截止时间 / 提醒时间
Markdown 摘要前几行
子任务进度：2/5
图片 / 链接 / 附件标识
```

### 6.2 卡片状态

状态：

- 未完成
- 进行中
- 已完成
- 已取消

视觉建议：

- 逾期：日期变红，卡片边线轻微强调
- 今日：时间信息高亮
- 高优先级：优先级标签强调
- 已完成：标题弱化，保留可回看能力

### 6.3 详情面板

点击卡片后打开详情面板。

详情内容：

- 标题
- 状态
- 项目
- 优先级
- 截止时间
- 提醒时间
- 标签
- 子任务
- Markdown 正文编辑器
- 图片、链接、附件
- 创建时间
- 更新时间

详情中所有字段都可以编辑。

## 7. Markdown 与素材能力

### 7.1 Markdown 支持范围

第一版支持：

- 标题
- 加粗 / 斜体
- 无序列表
- 有序列表
- 引用
- 代码块
- 分割线
- 链接
- 图片
- 任务列表

### 7.2 图片能力

支持方式：

- 上传图片
- 粘贴图片
- 拖拽图片
- Markdown 中引用图片

图片处理：

- 本地预览
- 存储为附件记录
- 在 Markdown 中插入图片地址

### 7.3 链接能力

支持：

- 自动识别 URL
- Markdown 链接语法
- 链接预览可以作为后续增强

## 8. AI 整理能力

### 8.1 输入

AI 接收：

- 用户原始输入
- 当前日期时间
- 用户时区
- 已有项目列表
- 已有标签列表
- 可选的默认提醒规则

### 8.2 输出结构

AI 应返回结构化 JSON，前端根据 JSON 创建待办。

```json
{
  "title": "完成 todo_list 项目第一版设计",
  "projectName": "todo_list",
  "priority": "high",
  "dueAt": "2026-06-19T18:00:00+08:00",
  "reminders": [
    {
      "remindAt": "2026-06-18T09:00:00+08:00",
      "reason": "截止前一天提醒"
    }
  ],
  "tags": ["产品设计", "AI"],
  "subtasks": [
    "设计待办字段",
    "设计添加入口",
    "设计视图模式"
  ],
  "contentMarkdown": "## 目标\n完成 todo_list 项目第一版设计。\n\n## 注意事项\n- 保留撤销能力\n- 时间字段允许手动修改",
  "confidence": {
    "dueAt": "medium",
    "priority": "high",
    "projectName": "high"
  },
  "warnings": [
    "“周五前”已默认解析为周五 18:00"
  ]
}
```

### 8.3 时间识别原则

时间是高风险字段，必须可见、可改。

默认规则：

- “今天”：默认当天 18:00
- “明天”：默认次日 18:00
- “周五前”：默认周五 18:00
- “上午”：默认 09:00
- “下午”：默认 15:00
- “晚上”：默认 20:00

如果 AI 不确定，应该返回 `confidence.dueAt = "low"` 并附带说明。

### 8.4 AI 修改原则

AI 可以润色和结构化，但需要保留原始输入。

每条由 AI 创建的待办应记录：

- `originalInput`
- `aiGenerated`
- `aiModel`
- `aiCreatedAt`
- `aiWarnings`

## 9. 提醒机制

### 9.1 提醒类型

第一版支持：

- 指定时间提醒
- 截止前提醒
- 逾期提醒

后续扩展：

- 重复任务提醒
- 每日摘要
- 晚间回顾
- 外部渠道提醒

### 9.2 提醒渠道

第一版推荐：

- 浏览器通知
- 应用内提醒

后续可扩展：

- 邮件
- 飞书 / Lark
- 微信机器人
- 系统通知

### 9.3 逾期规则

待办超过截止时间且未完成时：

- 标记为逾期
- 在今日视图和时间轴逾期组展示
- 支持一键延期

延期选项：

```text
明天
下周
自定义
```

## 10. 数据模型

### 10.1 Todo

```ts
type TodoStatus = "todo" | "doing" | "done" | "cancelled";
type TodoPriority = "low" | "medium" | "high" | "urgent";

type Todo = {
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
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  cancelledAt?: string;
};
```

### 10.2 Subtask

```ts
type Subtask = {
  id: string;
  title: string;
  done: boolean;
  createdAt: string;
  completedAt?: string;
};
```

### 10.3 Reminder

```ts
type Reminder = {
  id: string;
  remindAt: string;
  reason?: string;
  sentAt?: string;
  dismissedAt?: string;
};
```

### 10.4 Project

```ts
type Project = {
  id: string;
  name: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
};
```

### 10.5 Tag

```ts
type Tag = {
  id: string;
  name: string;
  color?: string;
};
```

### 10.6 Attachment

```ts
type Attachment = {
  id: string;
  type: "image" | "link" | "file";
  name?: string;
  url: string;
  mimeType?: string;
  size?: number;
  createdAt: string;
};
```

### 10.7 TodoAiMeta

```ts
type TodoAiMeta = {
  aiGenerated: boolean;
  aiModel?: string;
  aiCreatedAt?: string;
  warnings?: string[];
  confidence?: {
    dueAt?: "low" | "medium" | "high";
    priority?: "low" | "medium" | "high";
    projectName?: "low" | "medium" | "high";
  };
};
```

### 10.8 UndoRecord

```ts
type UndoRecord = {
  id: string;
  action: "ai_create_todo";
  todoId: string;
  originalInput: string;
  createdAt: string;
  expiresAt?: string;
};
```

## 11. 推荐技术架构

### 11.1 第一版形态

推荐先做 Web App。

原因：

- Markdown 编辑器和图片上传更容易实现。
- 浏览器通知适合作为第一版提醒。
- 后续可以包装成桌面应用或移动端 PWA。

### 11.2 前端

推荐：

- React
- TypeScript
- Vite
- Markdown 编辑器组件
- 本地状态管理
- IndexedDB 或本地后端存储

主要模块：

```text
src/
  app/
  components/
    AddTodoComposer/
    TodoCard/
    TodoDetailPanel/
    MarkdownEditor/
    ViewSwitcher/
  features/
    todos/
    projects/
    reminders/
    ai/
  lib/
    date/
    storage/
    markdown/
  styles/
```

### 11.3 后端

第一版可以有两种路线：

路线 A：纯前端 + 本地存储

- 实现快
- 适合个人本地使用
- AI API key 处理需要谨慎

路线 B：前端 + 轻量后端

- 更适合接入 AI
- 可以隐藏 API key
- 后续方便做同步和多端

推荐路线 B：

```text
Web Frontend
-> API Server
-> Database
-> AI Provider
-> Reminder Scheduler
```

### 11.4 API 模块

建议接口：

```text
POST /api/ai/organize-todo
GET  /api/todos
POST /api/todos
PATCH /api/todos/:id
DELETE /api/todos/:id
POST /api/todos/:id/complete
POST /api/undo
GET  /api/projects
POST /api/projects
GET  /api/reminders/due
```

### 11.5 存储

第一版推荐 SQLite。

原因：

- 简单
- 本地开发友好
- 适合个人项目
- 后续可以迁移到 Postgres

## 12. MVP 范围

### 12.1 必须有

- 添加区支持输入 Markdown 文本
- 一个 `AI 整理` 按钮
- AI 整理后直接创建待办
- 创建后支持撤销
- 待办卡片列表
- 今日视图
- 时间轴视图
- 项目视图
- 优先级视图
- 已完成视图
- 待办详情编辑
- 支持链接
- 支持图片上传或粘贴
- 基础提醒字段

### 12.2 可以后置

- 重复任务
- 日历视图
- 四象限视图
- 链接预览
- 文件附件
- 多端同步
- 团队协作
- 每日摘要
- 飞书 / 邮件提醒
- 完整操作历史

## 13. 开发阶段

### Phase 1：产品骨架

- 初始化前端项目
- 建立页面布局
- 实现待办数据模型
- 实现卡片和详情面板
- 实现今日、时间轴、项目、优先级、已完成视图

### Phase 2：添加与编辑

- 实现添加区
- 支持普通快速添加
- 支持 Markdown 编辑
- 支持待办详情编辑
- 支持完成、取消、删除

### Phase 3：AI 整理

- 接入 AI 整理接口
- 定义 AI JSON 输出格式
- 实现 AI 整理后直接创建待办
- 实现撤销
- 实现 AI warning 和 confidence 展示

### Phase 4：图片、链接和提醒

- 支持图片上传、粘贴和预览
- 支持 Markdown 图片插入
- 支持链接识别
- 实现基础提醒时间
- 实现浏览器通知或应用内提醒

### Phase 5：打磨

- 处理空状态
- 处理加载和错误状态
- 优化移动端布局
- 增加本地持久化
- 增加基础测试

## 14. 待确认问题

后续进入实现前，需要确认：

1. 第一版是纯本地应用，还是需要轻量后端？
2. AI 使用哪个模型和 API？
3. 图片第一版存本地、对象存储，还是先用浏览器本地存储？
4. 提醒第一版只做应用内提醒，还是需要浏览器系统通知？
5. 项目是否需要用户手动创建，还是 AI 可自动创建新项目？
6. 是否需要登录账号和多端同步？

