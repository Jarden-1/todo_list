import type { Prisma, Project, Reminder, Subtask, Tag } from "@prisma/client";

export const todoInclude = {
  subtasks: {
    where: {
      deletedAt: null
    },
    orderBy: {
      position: "asc"
    }
  },
  reminders: {
    where: {
      deletedAt: null
    },
    orderBy: {
      remindAt: "asc"
    }
  },
  attachments: {
    where: {
      deletedAt: null
    },
    orderBy: {
      createdAt: "asc"
    }
  },
  todoTags: {
    where: {
      tag: {
        deletedAt: null
      }
    },
    include: {
      tag: true
    },
    orderBy: {
      createdAt: "asc"
    }
  }
} satisfies Prisma.TodoInclude;

export type TodoWithRelations = Prisma.TodoGetPayload<{
  include: typeof todoInclude;
}>;

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

export function toProjectDto(project: Project) {
  return {
    id: project.id,
    name: project.name,
    color: project.color,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    deletedAt: toIso(project.deletedAt),
    purgeAfter: toIso(project.purgeAfter)
  };
}

export function toTagDto(tag: Tag) {
  return {
    id: tag.id,
    name: tag.name,
    color: tag.color,
    createdAt: tag.createdAt.toISOString(),
    updatedAt: tag.updatedAt.toISOString(),
    deletedAt: toIso(tag.deletedAt),
    purgeAfter: toIso(tag.purgeAfter)
  };
}

export function toSubtaskDto(subtask: Subtask) {
  return {
    id: subtask.id,
    todoId: subtask.todoId,
    title: subtask.title,
    done: subtask.done,
    position: subtask.position,
    createdAt: subtask.createdAt.toISOString(),
    completedAt: toIso(subtask.completedAt),
    deletedAt: toIso(subtask.deletedAt),
    purgeAfter: toIso(subtask.purgeAfter)
  };
}

export function toReminderDto(reminder: Reminder) {
  return {
    id: reminder.id,
    todoId: reminder.todoId,
    remindAt: reminder.remindAt.toISOString(),
    reason: reminder.reason,
    kind: reminder.kind,
    createdAt: reminder.createdAt.toISOString(),
    sentAt: toIso(reminder.sentAt),
    dismissedAt: toIso(reminder.dismissedAt),
    deletedAt: toIso(reminder.deletedAt),
    purgeAfter: toIso(reminder.purgeAfter)
  };
}

export function toTodoDto(todo: TodoWithRelations) {
  return {
    id: todo.id,
    title: todo.title,
    status: todo.status,
    priority: todo.priority,
    projectId: todo.projectId,
    tagIds: todo.todoTags.map((todoTag) => todoTag.tagId),
    dueAt: toIso(todo.dueAt),
    reminders: todo.reminders.map(toReminderDto),
    contentMarkdown: todo.contentMarkdown,
    originalInput: todo.originalInput,
    subtasks: todo.subtasks.map(toSubtaskDto),
    attachments: todo.attachments.map((attachment) => ({
      id: attachment.id,
      type: attachment.type,
      name: attachment.originalName,
      url: attachment.contentUrl,
      mimeType: attachment.mimeType,
      size: Number(attachment.sizeBytes),
      todoId: attachment.todoId,
      createdAt: attachment.createdAt.toISOString()
    })),
    aiMeta: todo.aiMeta,
    assignee: todo.assignee,
    createdAt: todo.createdAt.toISOString(),
    updatedAt: todo.updatedAt.toISOString(),
    completedAt: toIso(todo.completedAt),
    cancelledAt: toIso(todo.cancelledAt),
    deletedAt: toIso(todo.deletedAt),
    purgeAfter: toIso(todo.purgeAfter)
  };
}
