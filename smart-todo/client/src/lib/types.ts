// SmartTodo - Core Data Types
// Design: Precision Dark Dashboard

export type TodoStatus = "todo" | "doing" | "done" | "cancelled";
export type TodoPriority = "low" | "medium" | "high" | "urgent";

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
  createdAt: string;
  completedAt?: string;
}

export interface Reminder {
  id: string;
  remindAt: string;
  reason?: string;
  sentAt?: string;
  dismissedAt?: string;
}

export interface Project {
  id: string;
  name: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
}

export interface Attachment {
  id: string;
  type: "image" | "link" | "file";
  name?: string;
  url: string;
  mimeType?: string;
  size?: number;
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
  projectId?: string;
  tagIds: string[];
  dueAt?: string;
  reminders: Reminder[];
  contentMarkdown: string;
  originalInput?: string;
  subtasks: Subtask[];
  attachments: Attachment[];
  aiMeta?: TodoAiMeta;
  assignee?: string;          // 对接人（自由文本）
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  cancelledAt?: string;
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
