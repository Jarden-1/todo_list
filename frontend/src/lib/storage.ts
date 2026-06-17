// SmartTodo - Local Storage Persistence
import { Todo, Project, Tag, UndoRecord } from "./types";
import { nanoid } from "nanoid";

const KEYS = {
  todos: "smarttodo:todos",
  projects: "smarttodo:projects",
  tags: "smarttodo:tags",
  undoRecord: "smarttodo:undo",
};

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// ---- Todos ----
export function getTodos(): Todo[] {
  return load<Todo[]>(KEYS.todos, getDefaultTodos());
}

export function saveTodos(todos: Todo[]): void {
  save(KEYS.todos, todos);
}

// ---- Projects ----
export function getProjects(): Project[] {
  return load<Project[]>(KEYS.projects, getDefaultProjects());
}

export function saveProjects(projects: Project[]): void {
  save(KEYS.projects, projects);
}

// ---- Tags ----
export function getTags(): Tag[] {
  return load<Tag[]>(KEYS.tags, getDefaultTags());
}

export function saveTags(tags: Tag[]): void {
  save(KEYS.tags, tags);
}

// ---- Undo ----
export function getUndoRecord(): UndoRecord | null {
  return load<UndoRecord | null>(KEYS.undoRecord, null);
}

export function saveUndoRecord(record: UndoRecord | null): void {
  save(KEYS.undoRecord, record);
}

// ---- Default seed data ----
function getDefaultProjects(): Project[] {
  const now = new Date().toISOString();
  return [
    { id: "proj-1", name: "工作", color: "#6366F1", createdAt: now, updatedAt: now },
    { id: "proj-2", name: "个人", color: "#10B981", createdAt: now, updatedAt: now },
    { id: "proj-3", name: "学习", color: "#F59E0B", createdAt: now, updatedAt: now },
  ];
}

function getDefaultTags(): Tag[] {
  return [
    { id: "tag-1", name: "重要", color: "#EF4444" },
    { id: "tag-2", name: "AI", color: "#8B5CF6" },
    { id: "tag-3", name: "产品设计", color: "#6366F1" },
    { id: "tag-4", name: "开发", color: "#10B981" },
  ];
}

function getDefaultTodos(): Todo[] {
  const now = new Date();
  const today = new Date(now);
  today.setHours(18, 0, 0, 0);

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(18, 0, 0, 0);

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(18, 0, 0, 0);

  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(18, 0, 0, 0);

  return [
    {
      id: nanoid(),
      title: "完成 SmartTodo 第一版设计",
      status: "doing",
      priority: "high",
      projectId: "proj-1",
      tagIds: ["tag-2", "tag-3"],
      dueAt: today.toISOString(),
      reminders: [{ id: nanoid(), remindAt: today.toISOString(), reason: "今日截止提醒" }],
      contentMarkdown: "## 目标\n完成 SmartTodo 项目第一版设计与基础实现。\n\n## 子任务\n- [x] 设计待办字段\n- [x] 设计添加入口\n- [ ] 设计时间轴、项目、优先级视图\n- [ ] 支持 Markdown 正文\n- [ ] 接入 AI 整理\n\n## 注意事项\n- AI 整理后应保留撤销能力\n- 时间识别结果必须允许用户手动修改",
      subtasks: [
        { id: nanoid(), title: "设计待办字段", done: true, createdAt: now.toISOString(), completedAt: now.toISOString() },
        { id: nanoid(), title: "设计添加入口", done: true, createdAt: now.toISOString(), completedAt: now.toISOString() },
        { id: nanoid(), title: "设计时间轴视图", done: false, createdAt: now.toISOString() },
        { id: nanoid(), title: "支持 Markdown 正文", done: false, createdAt: now.toISOString() },
        { id: nanoid(), title: "接入 AI 整理", done: false, createdAt: now.toISOString() },
      ],
      attachments: [],
      aiMeta: {
        aiGenerated: true,
        aiModel: "gpt-4o",
        aiCreatedAt: now.toISOString(),
        confidence: { dueAt: "high", priority: "high", projectName: "high" },
        warnings: ["截止时间已默认解析为今日 18:00"],
      },
      originalInput: "今天要把 SmartTodo 项目第一版想清楚，重点是 md 编辑、图片链接和 ai 整理。",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: nanoid(),
      title: "阅读《深度工作》第三章",
      status: "todo",
      priority: "medium",
      projectId: "proj-3",
      tagIds: ["tag-1"],
      dueAt: tomorrow.toISOString(),
      reminders: [],
      contentMarkdown: "## 阅读计划\n- 第三章：拥抱无聊\n- 重点摘录关键观点\n- 结合自身情况写反思",
      subtasks: [
        { id: nanoid(), title: "阅读正文", done: false, createdAt: now.toISOString() },
        { id: nanoid(), title: "写读书笔记", done: false, createdAt: now.toISOString() },
      ],
      attachments: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: nanoid(),
      title: "整理上周工作周报",
      status: "todo",
      priority: "urgent",
      projectId: "proj-1",
      tagIds: [],
      dueAt: yesterday.toISOString(),
      reminders: [],
      contentMarkdown: "整理上周完成的工作内容，包括项目进展、遇到的问题和下周计划。",
      subtasks: [],
      attachments: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: nanoid(),
      title: "学习 React 19 新特性",
      status: "todo",
      priority: "medium",
      projectId: "proj-3",
      tagIds: ["tag-4"],
      dueAt: nextWeek.toISOString(),
      reminders: [],
      contentMarkdown: "## 学习内容\n- Server Components\n- Actions\n- use() hook\n- Suspense 改进",
      subtasks: [
        { id: nanoid(), title: "阅读官方文档", done: false, createdAt: now.toISOString() },
        { id: nanoid(), title: "动手实践 Demo", done: false, createdAt: now.toISOString() },
      ],
      attachments: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: nanoid(),
      title: "健身房打卡",
      status: "done",
      priority: "low",
      projectId: "proj-2",
      tagIds: [],
      dueAt: today.toISOString(),
      reminders: [],
      contentMarkdown: "- 跑步 30 分钟\n- 力量训练 45 分钟",
      subtasks: [],
      attachments: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      completedAt: now.toISOString(),
    },
    {
      id: nanoid(),
      title: "准备季度 OKR 复盘材料",
      status: "todo",
      priority: "high",
      projectId: "proj-1",
      tagIds: ["tag-1"],
      dueAt: nextWeek.toISOString(),
      reminders: [],
      contentMarkdown: "## 复盘内容\n- Q2 目标完成情况\n- 关键成果数据\n- 下季度规划",
      subtasks: [
        { id: nanoid(), title: "收集数据", done: false, createdAt: now.toISOString() },
        { id: nanoid(), title: "制作 PPT", done: false, createdAt: now.toISOString() },
        { id: nanoid(), title: "预演讲", done: false, createdAt: now.toISOString() },
      ],
      attachments: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
  ];
}
