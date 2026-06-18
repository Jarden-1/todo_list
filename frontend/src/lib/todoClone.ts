import { nanoid } from "nanoid";
import { resetMarkdownTaskChecks } from "./markdownTasks";
import type { Todo } from "./types";

export function cloneTodo(todo: Todo): Todo {
  return {
    ...todo,
    tagIds: [...todo.tagIds],
    reminders: todo.reminders.map((reminder) => ({ ...reminder })),
    subtasks: todo.subtasks.map((subtask) => ({ ...subtask })),
    attachments: todo.attachments.map((attachment) => ({ ...attachment })),
    aiMeta: todo.aiMeta
      ? {
          ...todo.aiMeta,
          confidence: todo.aiMeta.confidence ? { ...todo.aiMeta.confidence } : undefined,
          warnings: todo.aiMeta.warnings ? [...todo.aiMeta.warnings] : undefined,
        }
      : null,
  };
}

export function createDuplicateTodo(source: Todo, now = new Date().toISOString()): Todo {
  const duplicated = cloneTodo(source);

  return {
    ...duplicated,
    id: nanoid(),
    title: `${source.title} 副本`,
    status: "todo",
    contentMarkdown: resetMarkdownTaskChecks(source.contentMarkdown),
    reminders: duplicated.reminders.map((reminder) => ({
      ...reminder,
      id: nanoid(),
      sentAt: null,
      dismissedAt: null,
    })),
    subtasks: duplicated.subtasks.map((subtask) => ({
      ...subtask,
      id: nanoid(),
      done: false,
      completedAt: null,
      createdAt: now,
    })),
    attachments: duplicated.attachments.map((attachment) => ({
      ...attachment,
      id: nanoid(),
      createdAt: now,
    })),
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    cancelledAt: null,
  };
}
