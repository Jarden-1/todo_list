// SmartTodo - Core Data Types
// Design: Precision Dark Dashboard

export type TodoStatus = "todo" | "doing" | "done" | "cancelled";
export type TodoPriority = "low" | "medium" | "high" | "urgent";

export interface Subtask {
  id: string;
  todoId?: string;
  title: string;
  done: boolean;
  position?: number;
  createdAt: string;
  completedAt?: string | null;
  deletedAt?: string | null;
  purgeAfter?: string | null;
}

export interface Reminder {
  id: string;
  todoId?: string;
  remindAt: string;
  reason?: string | null;
  kind?: string;
  createdAt?: string;
  sentAt?: string | null;
  dismissedAt?: string | null;
  deletedAt?: string | null;
  purgeAfter?: string | null;
}

export interface Project {
  id: string;
  name: string;
  color?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  purgeAfter?: string | null;
}

export interface Tag {
  id: string;
  name: string;
  color?: string | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  purgeAfter?: string | null;
}

export interface Attachment {
  id: string;
  type: "image" | "link" | "file";
  name?: string;
  url: string;
  mimeType?: string | null;
  size?: number;
  todoId?: string | null;
  createdAt: string;
}

export interface TodoAiMeta {
  aiGenerated: boolean;
  aiModel?: string;
  aiCreatedAt?: string;
  warnings?: string[];
  confidence?: {
    dueAt?: "low" | "medium" | "high";
    priority?: "low" | "medium" | "high";
    projectName?: "low" | "medium" | "high";
  };
}

export interface Todo {
  id: string;
  title: string;
  status: TodoStatus;
  priority: TodoPriority;
  projectId: string | null;
  tagIds: string[];
  dueAt: string | null;
  reminders: Reminder[];
  contentMarkdown: string;
  originalInput: string | null;
  subtasks: Subtask[];
  attachments: Attachment[];
  aiMeta: TodoAiMeta | null;
  assignee: string | null;          // 对接人（自由文本）
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  cancelledAt?: string | null;
  deletedAt?: string | null;
  purgeAfter?: string | null;
}

export interface UndoRecord {
  id: string;
  action: "ai_create_todo";
  todoId: string;
  originalInput: string;
  createdAt: string;
  expiresAt?: string;
}

export type ViewType = "today" | "timeline" | "projects" | "priority" | "completed";

export interface AiOrganizeResult {
  title: string;
  projectName?: string;
  priority: TodoPriority;
  dueAt?: string;
  reminders?: Array<{ remindAt: string; reason?: string }>;
  tags?: string[];
  subtasks?: string[];
  contentMarkdown?: string;
  confidence?: {
    dueAt?: "low" | "medium" | "high";
    priority?: "low" | "medium" | "high";
    projectName?: "low" | "medium" | "high";
  };
  warnings?: string[];
}
