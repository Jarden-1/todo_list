import { Prisma, type PrismaClient } from "@prisma/client";

import { ApiError } from "../../common/apiError";
import { removeLocalFileIfExists } from "../files/localDiskStorage";
import { createEntityId } from "./ids";
import { parseMarkdownTasks, replaceMarkdownTaskList } from "./markdownTasks";
import {
  buildDefaultReminderInputs,
  softDeleteActiveReminders,
  toReminderCreateRows
} from "./reminders.service";
import { replaceActiveSubtasksFromMarkdown } from "./subtasks.service";
import { todoInclude, toTodoDto, type TodoWithRelations } from "./todo.dto";
import type {
  BulkMoveTodosInput,
  ReminderInput,
  SubtaskInput,
  TodoCreateInput,
  TodoPatchInput,
  TodoRestoreInput,
  TodosQueryInput
} from "./todos.schemas";

type TodoDb = Pick<
  PrismaClient,
  | "todo"
  | "project"
  | "tag"
  | "todoTag"
  | "subtask"
  | "reminder"
  | "attachment"
  | "userSetting"
>;

type TodoStatus = "todo" | "doing" | "done" | "cancelled";

function uniqueIds(ids: string[] | undefined): string[] {
  return Array.from(new Set((ids ?? []).map((id) => id.trim()).filter(Boolean)));
}

function dateOrNull(value: string | null | undefined): Date | null {
  if (value === undefined || value === null) {
    return null;
  }

  return new Date(value);
}

function statusTimestamps(
  existing: { status?: string; completedAt?: Date | null; cancelledAt?: Date | null },
  status: TodoStatus,
  now: Date
) {
  return {
    completedAt: status === "done" ? (existing.completedAt ?? now) : null,
    cancelledAt: status === "cancelled" ? (existing.cancelledAt ?? now) : null
  };
}

function jsonField(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
}

function buildContentAndSubtasks(
  contentMarkdown: string,
  subtasks: SubtaskInput[] | undefined
): string {
  if (parseMarkdownTasks(contentMarkdown).length > 0 || !subtasks?.length) {
    return contentMarkdown;
  }

  return replaceMarkdownTaskList(
    contentMarkdown,
    subtasks.map((subtask) => ({
      title: subtask.title,
      done: subtask.done ?? false
    }))
  );
}

export class TodosService {
  constructor(private readonly prisma: PrismaClient) {}

  async listTodos(userId: string, query: TodosQueryInput) {
    const where: Prisma.TodoWhereInput = {
      userId,
      ...(query.includeDeleted
        ? {}
        : {
            deletedAt: null
          }),
      ...(query.status
        ? {
            status: query.status
          }
        : {}),
      ...(query.projectId
        ? {
            projectId: query.projectId
          }
        : {}),
      ...(query.priority
        ? {
            priority: query.priority
          }
        : {}),
      ...(query.dueFrom || query.dueTo
        ? {
            dueAt: {
              ...(query.dueFrom
                ? {
                    gte: new Date(query.dueFrom)
                  }
                : {}),
              ...(query.dueTo
                ? {
                    lte: new Date(query.dueTo)
                  }
                : {})
            }
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              {
                title: {
                  contains: query.search,
                  mode: "insensitive"
                }
              },
              {
                contentMarkdown: {
                  contains: query.search,
                  mode: "insensitive"
                }
              }
            ]
          }
        : {})
    };

    const todos = await this.prisma.todo.findMany({
      where,
      include: todoInclude,
      orderBy: {
        updatedAt: "desc"
      }
    });

    return todos.map(toTodoDto);
  }

  async getTodo(userId: string, todoId: string) {
    const todo = await this.findTodoWithRelations(this.prisma, userId, todoId);
    return toTodoDto(todo);
  }

  async createTodo(userId: string, input: TodoCreateInput) {
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const status = input.status ?? "todo";
      const dueAt = dateOrNull(input.dueAt);
      const contentMarkdown = buildContentAndSubtasks(input.contentMarkdown ?? "", input.subtasks);
      const reminderInputs =
        input.reminders ??
        (await buildDefaultReminderInputs(tx, userId, dueAt));
      const todoId = createEntityId("todo");

      await this.assertProjectExists(tx, userId, input.projectId ?? null);
      const tagIds = await this.assertTagsExist(tx, userId, input.tagIds);
      const attachmentIds = await this.assertAttachmentsExist(tx, userId, input.attachmentIds);

      const timestamps = statusTimestamps({}, status, now);

      await tx.todo.create({
        data: {
          id: todoId,
          userId,
          title: input.title.trim(),
          status,
          priority: input.priority ?? "medium",
          projectId: input.projectId ?? null,
          dueAt,
          dueAtPrecision: input.dueAtPrecision ?? "datetime",
          contentMarkdown,
          originalInput: input.originalInput ?? null,
          ...(input.aiMeta !== undefined
            ? {
                aiMeta: jsonField(input.aiMeta)
              }
            : {}),
          assignee: input.assignee ?? null,
          completedAt: timestamps.completedAt ?? null,
          cancelledAt: timestamps.cancelledAt ?? null,
          createdAt: now,
          updatedAt: now
        }
      });

      await this.replaceTodoTags(tx, userId, todoId, tagIds, now);
      await this.replaceTodoAttachments(tx, userId, todoId, attachmentIds);
      await this.replaceTodoReminders(tx, userId, todoId, reminderInputs, now);
      await replaceActiveSubtasksFromMarkdown(tx, userId, todoId, contentMarkdown, now);

      const todo = await this.findTodoWithRelations(tx, userId, todoId);
      return toTodoDto(todo);
    });
  }

  async updateTodo(userId: string, todoId: string, input: TodoPatchInput) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.findTodo(tx, userId, todoId);
      const now = new Date();
      const data: Prisma.TodoUncheckedUpdateManyInput = {
        updatedAt: now
      };

      if (input.title !== undefined) {
        data.title = input.title.trim();
      }

      if (input.priority !== undefined) {
        data.priority = input.priority;
      }

      if (input.projectId !== undefined) {
        await this.assertProjectExists(tx, userId, input.projectId);
        data.projectId = input.projectId ?? null;
      }

      const nextDueAt = input.dueAt !== undefined ? dateOrNull(input.dueAt) : existing.dueAt;

      if (input.dueAt !== undefined) {
        data.dueAt = nextDueAt;
        // Clearing the due date resets precision; setting a date without an
        // explicit precision defaults to exact datetime.
        if (input.dueAtPrecision === undefined) {
          data.dueAtPrecision = nextDueAt ? "datetime" : "none";
        }
      }

      if (input.dueAtPrecision !== undefined) {
        data.dueAtPrecision = input.dueAtPrecision;
      }

      if (input.assignee !== undefined) {
        data.assignee = input.assignee;
      }

      if (input.contentMarkdown !== undefined) {
        data.contentMarkdown = input.contentMarkdown ?? "";
      }

      if (input.originalInput !== undefined) {
        data.originalInput = input.originalInput;
      }

      if (input.aiMeta !== undefined) {
        data.aiMeta = jsonField(input.aiMeta);
      }

      if (input.status !== undefined) {
        data.status = input.status;
        const timestamps = statusTimestamps(existing, input.status, now);

        if (timestamps.completedAt !== undefined) {
          data.completedAt = timestamps.completedAt;
        }

        if (timestamps.cancelledAt !== undefined) {
          data.cancelledAt = timestamps.cancelledAt;
        }
      }

      await tx.todo.updateMany({
        where: {
          id: todoId,
          userId,
          deletedAt: null
        },
        data
      });

      if (input.tagIds !== undefined) {
        const tagIds = await this.assertTagsExist(tx, userId, input.tagIds);
        await this.replaceTodoTags(tx, userId, todoId, tagIds, now);
      }

      if (input.attachmentIds !== undefined) {
        const attachmentIds = await this.assertAttachmentsExist(tx, userId, input.attachmentIds);
        await this.replaceTodoAttachments(tx, userId, todoId, attachmentIds);
      }

      if (input.reminders !== undefined) {
        await this.replaceTodoReminders(tx, userId, todoId, input.reminders, now);
      } else if (input.dueAt !== undefined) {
        const defaultReminders = await buildDefaultReminderInputs(tx, userId, nextDueAt);
        await this.replaceTodoReminders(tx, userId, todoId, defaultReminders, now);
      }

      if (input.contentMarkdown !== undefined) {
        await replaceActiveSubtasksFromMarkdown(
          tx,
          userId,
          todoId,
          input.contentMarkdown ?? "",
          now
        );
      }

      const todo = await this.findTodoWithRelations(tx, userId, todoId);
      return toTodoDto(todo);
    });
  }

  async deleteTodo(userId: string, todoId: string) {
    const todo = await this.prisma.todo.findFirst({
      where: { id: todoId, userId },
      include: todoInclude
    });

    if (!todo) {
      throw new ApiError("NOT_FOUND", "待办不存在", 404);
    }

    const dto = toTodoDto(todo);
    // Hard delete: physically remove the row + all its relations + disk files,
    // so nothing lingers in the database or the uploads folder. Not recoverable.
    await this.hardDeleteTodos(userId, [todoId]);
    return dto;
  }

  /**
   * Permanently delete todos. Supports two scopes:
   *  - all=true: delete ALL of the user's completed (status=done) todos
   *  - ids:      delete exactly these todo ids (used for single-day or
   *              multi-day deletion — the client sends the ids it grouped on
   *              screen, which avoids any server-side timezone ambiguity)
   * Returns the deleted todo ids.
   */
  async bulkDeleteTodos(
    userId: string,
    scope: { ids?: string[]; all?: boolean }
  ): Promise<{ deletedIds: string[] }> {
    let ids: string[] = [];

    if (scope.all) {
      const rows = await this.prisma.todo.findMany({
        where: { userId, status: "done", deletedAt: null },
        select: { id: true }
      });
      ids = rows.map((row) => row.id);
    } else if (scope.ids && scope.ids.length > 0) {
      const rows = await this.prisma.todo.findMany({
        where: { userId, id: { in: uniqueIds(scope.ids) } },
        select: { id: true }
      });
      ids = rows.map((row) => row.id);
    }

    if (ids.length === 0) {
      return { deletedIds: [] };
    }

    await this.hardDeleteTodos(userId, ids);
    return { deletedIds: ids };
  }

  async bulkMoveTodos(userId: string, input: BulkMoveTodosInput) {
    const requestedIds = uniqueIds(input.ids);
    if (requestedIds.length === 0) {
      return { todos: [] };
    }

    return this.prisma.$transaction(async (tx) => {
      await this.assertProjectExists(tx, userId, input.projectId);

      const existingRows = await tx.todo.findMany({
        where: {
          userId,
          id: { in: requestedIds },
          deletedAt: null
        },
        select: { id: true }
      });
      const existingIds = existingRows.map((row) => row.id);

      if (existingIds.length === 0) {
        return { todos: [] };
      }

      await tx.todo.updateMany({
        where: {
          userId,
          id: { in: existingIds },
          deletedAt: null
        },
        data: {
          projectId: input.projectId ?? null,
          updatedAt: new Date()
        }
      });

      const todos = await tx.todo.findMany({
        where: {
          userId,
          id: { in: existingIds },
          deletedAt: null
        },
        include: todoInclude
      });
      const todoById = new Map(todos.map((todo) => [todo.id, toTodoDto(todo)]));

      return {
        todos: existingIds
          .map((id) => todoById.get(id))
          .filter((todo): todo is ReturnType<typeof toTodoDto> => Boolean(todo))
      };
    });
  }

  /**
   * Physically delete the given todos (scoped to the user) along with their
   * subtasks / reminders / todoTags / undoRecords / notificationEvents and any
   * local attachment files on disk. Mirrors the purge worker's logic.
   */
  private async hardDeleteTodos(userId: string, todoIds: string[]): Promise<void> {
    const ids = uniqueIds(todoIds);
    if (ids.length === 0) return;

    // Collect local attachment files to remove from disk after the DB tx.
    const attachments = await this.prisma.attachment.findMany({
      where: { userId, todoId: { in: ids } },
      select: { storageProvider: true, storageKey: true }
    });
    const localStorageKeys = attachments
      .filter((attachment) => attachment.storageProvider === "local")
      .map((attachment) => attachment.storageKey);

    await this.prisma.$transaction(async (tx) => {
      await tx.notificationEvent.deleteMany({ where: { userId, todoId: { in: ids } } });
      await tx.todoTag.deleteMany({ where: { userId, todoId: { in: ids } } });
      await tx.subtask.deleteMany({ where: { userId, todoId: { in: ids } } });
      await tx.reminder.deleteMany({ where: { userId, todoId: { in: ids } } });
      await tx.attachment.deleteMany({ where: { userId, todoId: { in: ids } } });
      await tx.undoRecord.deleteMany({ where: { userId, todoId: { in: ids } } });
      await tx.todo.deleteMany({ where: { userId, id: { in: ids } } });
    });

    for (const storageKey of localStorageKeys) {
      try {
        await removeLocalFileIfExists(storageKey);
      } catch {
        // Best-effort disk cleanup; DB rows are already gone.
      }
    }
  }

  async duplicateTodo(userId: string, todoId: string) {
    return this.prisma.$transaction(async (tx) => {
      const source = await this.findTodoWithRelations(tx, userId, todoId);
      const now = new Date();
      const duplicateId = createEntityId("todo");
      const resetSubtasks = source.subtasks.map((subtask) => ({
        title: subtask.title,
        done: false
      }));
      const contentMarkdown =
        resetSubtasks.length > 0
          ? replaceMarkdownTaskList(source.contentMarkdown, resetSubtasks)
          : source.contentMarkdown;

      await tx.todo.create({
        data: {
          id: duplicateId,
          userId,
          title: `${source.title} 副本`,
          status: "todo",
          priority: source.priority,
          projectId: source.projectId,
          dueAt: source.dueAt,
          dueAtPrecision: source.dueAtPrecision,
          contentMarkdown,
          originalInput: source.originalInput,
          aiMeta:
            source.aiMeta === null ? undefined : (source.aiMeta as Prisma.InputJsonValue),
          assignee: source.assignee,
          createdAt: now,
          updatedAt: now
        }
      });

      await this.replaceTodoTags(
        tx,
        userId,
        duplicateId,
        source.todoTags.map((todoTag) => todoTag.tagId),
        now
      );

      if (source.reminders.length > 0) {
        await tx.reminder.createMany({
          data: source.reminders.map((reminder) => ({
            id: createEntityId("rem"),
            userId,
            todoId: duplicateId,
            remindAt: reminder.remindAt,
            reason: reminder.reason,
            kind: reminder.kind,
            createdAt: now,
            sentAt: null,
            dismissedAt: null
          }))
        });
      }

      if (resetSubtasks.length > 0) {
        await tx.subtask.createMany({
          data: resetSubtasks.map((subtask, index) => ({
            id: createEntityId("sub"),
            userId,
            todoId: duplicateId,
            title: subtask.title,
            done: false,
            position: index,
            createdAt: now,
            completedAt: null
          }))
        });
      }

      const todo = await this.findTodoWithRelations(tx, userId, duplicateId);
      return toTodoDto(todo);
    });
  }

  async completeTodo(userId: string, todoId: string) {
    const todo = await this.updateTodo(userId, todoId, {
      status: "done"
    });
    // Mark all unread notifications for this todo as read.
    await this.prisma.notificationEvent.updateMany({
      where: { userId, todoId, readAt: null, deletedAt: null },
      data: { readAt: new Date() }
    });
    return todo;
  }

  async uncompleteTodo(userId: string, todoId: string) {
    return this.updateTodo(userId, todoId, {
      status: "todo"
    });
  }

  async cancelTodo(userId: string, todoId: string) {
    const todo = await this.updateTodo(userId, todoId, {
      status: "cancelled"
    });
    // Mark all unread notifications for this todo as read.
    await this.prisma.notificationEvent.updateMany({
      where: { userId, todoId, readAt: null, deletedAt: null },
      data: { readAt: new Date() }
    });
    return todo;
  }

  async restoreTodo(userId: string, todoId: string, input: TodoRestoreInput) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.todo.findFirst({
        where: {
          id: todoId,
          userId
        }
      });

      if (!existing) {
        throw new ApiError("NOT_FOUND", "待办不存在", 404);
      }

      const now = new Date();

      if (existing.deletedAt && existing.purgeAfter && existing.purgeAfter <= now) {
        throw new ApiError("BUSINESS_ERROR", "待办已超过可恢复期限", 422, {
          purgeAfter: existing.purgeAfter.toISOString()
        });
      }

      const nextStatus = input.status ?? (existing.status === "cancelled" ? "todo" : existing.status);
      const timestamps = statusTimestamps(existing, nextStatus as TodoStatus, now);

      await tx.todo.updateMany({
        where: {
          id: todoId,
          userId
        },
        data: {
          status: nextStatus,
          deletedAt: null,
          purgeAfter: null,
          updatedAt: now,
          ...(timestamps.completedAt !== undefined
            ? {
                completedAt: timestamps.completedAt
              }
            : {}),
          ...(timestamps.cancelledAt !== undefined
            ? {
                cancelledAt: timestamps.cancelledAt
              }
            : {})
        }
      });

      const todo = await tx.todo.findFirst({
        where: {
          id: todoId,
          userId
        },
        include: todoInclude
      });

      if (!todo) {
        throw new ApiError("NOT_FOUND", "待办不存在", 404);
      }

      return toTodoDto(todo);
    });
  }

  private async findTodo(
    db: Pick<PrismaClient, "todo">,
    userId: string,
    todoId: string
  ) {
    const todo = await db.todo.findFirst({
      where: {
        id: todoId,
        userId,
        deletedAt: null
      }
    });

    if (!todo) {
      throw new ApiError("NOT_FOUND", "待办不存在", 404);
    }

    return todo;
  }

  private async findTodoWithRelations(
    db: Pick<PrismaClient, "todo">,
    userId: string,
    todoId: string
  ): Promise<TodoWithRelations> {
    const todo = await db.todo.findFirst({
      where: {
        id: todoId,
        userId,
        deletedAt: null
      },
      include: todoInclude
    });

    if (!todo) {
      throw new ApiError("NOT_FOUND", "待办不存在", 404);
    }

    return todo;
  }

  private async assertProjectExists(
    db: Pick<PrismaClient, "project">,
    userId: string,
    projectId: string | null | undefined
  ): Promise<void> {
    if (!projectId) {
      return;
    }

    const project = await db.project.findFirst({
      where: {
        id: projectId,
        userId,
        deletedAt: null
      },
      select: {
        id: true
      }
    });

    if (!project) {
      throw new ApiError("NOT_FOUND", "项目不存在", 404, {
        projectId
      });
    }
  }

  private async assertTagsExist(
    db: Pick<PrismaClient, "tag">,
    userId: string,
    tagIds: string[] | undefined
  ): Promise<string[]> {
    const ids = uniqueIds(tagIds);

    if (ids.length === 0) {
      return [];
    }

    const count = await db.tag.count({
      where: {
        userId,
        id: {
          in: ids
        },
        deletedAt: null
      }
    });

    if (count !== ids.length) {
      throw new ApiError("NOT_FOUND", "标签不存在", 404, {
        tagIds: ids
      });
    }

    return ids;
  }

  private async assertAttachmentsExist(
    db: Pick<PrismaClient, "attachment">,
    userId: string,
    attachmentIds: string[] | undefined
  ): Promise<string[]> {
    const ids = uniqueIds(attachmentIds);

    if (ids.length === 0) {
      return [];
    }

    const count = await db.attachment.count({
      where: {
        userId,
        id: {
          in: ids
        },
        deletedAt: null
      }
    });

    if (count !== ids.length) {
      throw new ApiError("NOT_FOUND", "附件不存在", 404, {
        attachmentIds: ids
      });
    }

    return ids;
  }

  private async replaceTodoTags(
    db: Pick<PrismaClient, "todoTag">,
    userId: string,
    todoId: string,
    tagIds: string[],
    now: Date
  ): Promise<void> {
    await db.todoTag.deleteMany({
      where: {
        userId,
        todoId
      }
    });

    if (tagIds.length === 0) {
      return;
    }

    await db.todoTag.createMany({
      data: tagIds.map((tagId) => ({
        userId,
        todoId,
        tagId,
        createdAt: now
      }))
    });
  }

  private async replaceTodoAttachments(
    db: Pick<PrismaClient, "attachment">,
    userId: string,
    todoId: string,
    attachmentIds: string[]
  ): Promise<void> {
    if (attachmentIds.length === 0) {
      await db.attachment.updateMany({
        where: {
          userId,
          todoId,
          deletedAt: null
        },
        data: {
          todoId: null
        }
      });
      return;
    }

    await db.attachment.updateMany({
      where: {
        userId,
        todoId,
        deletedAt: null,
        id: {
          notIn: attachmentIds
        }
      },
      data: {
        todoId: null
      }
    });

    await db.attachment.updateMany({
      where: {
        userId,
        id: {
          in: attachmentIds
        },
        deletedAt: null
      },
      data: {
        todoId
      }
    });
  }

  private async replaceTodoReminders(
    db: TodoDb,
    userId: string,
    todoId: string,
    reminders: ReminderInput[],
    now: Date
  ): Promise<void> {
    await softDeleteActiveReminders(db, userId, todoId, now);

    if (reminders.length === 0) {
      return;
    }

    await db.reminder.createMany({
      data: toReminderCreateRows(userId, todoId, reminders, now)
    });
  }
}
