import type { Prisma, PrismaClient, Subtask } from "@prisma/client";

import { ApiError } from "../../common/apiError";
import { getSoftDeleteTimestamps } from "../../common/softDelete";
import { createEntityId } from "./ids";
import { parseMarkdownTasks, replaceMarkdownTaskList } from "./markdownTasks";
import { todoInclude, toSubtaskDto, toTodoDto } from "./todo.dto";
import type { SubtaskCreateInput, SubtaskPatchInput } from "./todos.schemas";

type SubtaskDb = Pick<PrismaClient, "subtask" | "todo">;

interface TaskForMarkdown {
  title: string;
  done: boolean;
}

export async function replaceActiveSubtasksFromMarkdown(
  db: SubtaskDb,
  userId: string,
  todoId: string,
  contentMarkdown: string,
  now = new Date()
): Promise<void> {
  const timestamps = getSoftDeleteTimestamps(now);
  const markdownTasks = parseMarkdownTasks(contentMarkdown);

  await db.subtask.updateMany({
    where: {
      userId,
      todoId,
      deletedAt: null
    },
    data: {
      deletedAt: timestamps.deletedAt,
      purgeAfter: timestamps.purgeAfter
    }
  });

  if (markdownTasks.length === 0) {
    return;
  }

  await db.subtask.createMany({
    data: markdownTasks.map((task, index) => ({
      id: createEntityId("sub"),
      userId,
      todoId,
      title: task.title,
      done: task.done,
      position: index,
      createdAt: now,
      completedAt: task.done ? now : null
    }))
  });
}

export async function listActiveSubtasksForMarkdown(
  db: Pick<PrismaClient, "subtask">,
  userId: string,
  todoId: string
): Promise<TaskForMarkdown[]> {
  const subtasks = await db.subtask.findMany({
    where: {
      userId,
      todoId,
      deletedAt: null
    },
    orderBy: {
      position: "asc"
    },
    select: {
      title: true,
      done: true
    }
  });

  return subtasks;
}

export class SubtasksService {
  constructor(private readonly prisma: PrismaClient) {}

  async createSubtask(userId: string, todoId: string, input: SubtaskCreateInput) {
    return this.prisma.$transaction(async (tx) => {
      const todo = await this.findActiveTodo(tx, userId, todoId);
      const lastSubtask = await tx.subtask.findFirst({
        where: {
          userId,
          todoId,
          deletedAt: null
        },
        orderBy: {
          position: "desc"
        },
        select: {
          position: true
        }
      });
      const now = new Date();

      const subtask = await tx.subtask.create({
        data: {
          id: createEntityId("sub"),
          userId,
          todoId,
          title: input.title.trim(),
          done: false,
          position: (lastSubtask?.position ?? -1) + 1,
          createdAt: now
        }
      });

      await this.syncTodoMarkdownFromSubtasks(tx, userId, todoId, todo.contentMarkdown, now);

      const updatedTodo = await this.findActiveTodoWithRelations(tx, userId, todoId);

      return {
        subtask: toSubtaskDto(subtask),
        todo: toTodoDto(updatedTodo)
      };
    });
  }

  async updateSubtask(
    userId: string,
    todoId: string,
    subtaskId: string,
    input: SubtaskPatchInput
  ) {
    return this.prisma.$transaction(async (tx) => {
      const todo = await this.findActiveTodo(tx, userId, todoId);
      const existing = await this.findActiveSubtask(tx, userId, todoId, subtaskId);
      const now = new Date();

      await tx.subtask.updateMany({
        where: {
          id: existing.id,
          userId,
          todoId,
          deletedAt: null
        },
        data: {
          ...(input.title !== undefined
            ? {
                title: input.title.trim()
              }
            : {}),
          ...(input.done !== undefined
            ? {
                done: input.done,
                completedAt: input.done ? now : null
              }
          : {})
        }
      });
      const subtask = await this.findActiveSubtask(tx, userId, todoId, subtaskId);

      await this.syncTodoMarkdownFromSubtasks(tx, userId, todoId, todo.contentMarkdown, now);

      const updatedTodo = await this.findActiveTodoWithRelations(tx, userId, todoId);

      return {
        subtask: toSubtaskDto(subtask),
        todo: toTodoDto(updatedTodo)
      };
    });
  }

  async deleteSubtask(userId: string, todoId: string, subtaskId: string) {
    return this.prisma.$transaction(async (tx) => {
      const todo = await this.findActiveTodo(tx, userId, todoId);
      const existing = await this.findActiveSubtask(tx, userId, todoId, subtaskId);
      const now = new Date();
      const timestamps = getSoftDeleteTimestamps(now);

      await tx.subtask.updateMany({
        where: {
          id: existing.id,
          userId,
          todoId,
          deletedAt: null
        },
        data: {
          deletedAt: timestamps.deletedAt,
          purgeAfter: timestamps.purgeAfter
        }
      });
      const subtask = await tx.subtask.findFirst({
        where: {
          id: subtaskId,
          userId,
          todoId
        }
      });

      if (!subtask) {
        throw new ApiError("NOT_FOUND", "子任务不存在", 404);
      }

      await this.syncTodoMarkdownFromSubtasks(tx, userId, todoId, todo.contentMarkdown, now);

      const updatedTodo = await this.findActiveTodoWithRelations(tx, userId, todoId);

      return {
        subtask: toSubtaskDto(subtask),
        todo: toTodoDto(updatedTodo)
      };
    });
  }

  private async syncTodoMarkdownFromSubtasks(
    db: SubtaskDb,
    userId: string,
    todoId: string,
    currentMarkdown: string,
    now: Date
  ): Promise<void> {
    const tasks = await listActiveSubtasksForMarkdown(db, userId, todoId);
    const contentMarkdown = replaceMarkdownTaskList(currentMarkdown, tasks);

    await db.todo.updateMany({
      where: {
        id: todoId,
        userId,
        deletedAt: null
      },
      data: {
        contentMarkdown,
        updatedAt: now
      }
    });
  }

  private async findActiveTodo(
    db: Pick<PrismaClient, "todo">,
    userId: string,
    todoId: string
  ) {
    const todo = await db.todo.findFirst({
      where: {
        id: todoId,
        userId,
        deletedAt: null
      },
      select: {
        id: true,
        contentMarkdown: true
      }
    });

    if (!todo) {
      throw new ApiError("NOT_FOUND", "待办不存在", 404);
    }

    return todo;
  }

  private async findActiveTodoWithRelations(
    db: Pick<PrismaClient, "todo">,
    userId: string,
    todoId: string
  ) {
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

  private async findActiveSubtask(
    db: Pick<PrismaClient, "subtask">,
    userId: string,
    todoId: string,
    subtaskId: string
  ): Promise<Subtask> {
    const subtask = await db.subtask.findFirst({
      where: {
        id: subtaskId,
        userId,
        todoId,
        deletedAt: null
      }
    });

    if (!subtask) {
      throw new ApiError("NOT_FOUND", "子任务不存在", 404);
    }

    return subtask;
  }
}
