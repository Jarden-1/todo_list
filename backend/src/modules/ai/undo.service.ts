import type { PrismaClient } from "@prisma/client";

import { ApiError } from "../../common/apiError";
import { toUndoRecordDto, type UndoRecordDto } from "./ai.dto";
import { aiModuleError } from "./ai.errors";
import { softDeleteAiCreatedTodo } from "./ai.service";

export interface ApplyUndoResponse {
  originalInput: string;
  deletedTodoId: string;
}

export async function getLatestUndoRecord(
  prisma: PrismaClient,
  userId: string
): Promise<UndoRecordDto | null> {
  const now = new Date();
  const record = await prisma.undoRecord.findFirst({
    where: {
      userId,
      action: "ai_create_todo",
      consumedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
    },
    orderBy: { createdAt: "desc" }
  });

  return record ? toUndoRecordDto(record) : null;
}

export async function applyUndoRecord(
  prisma: PrismaClient,
  userId: string,
  undoId: string
): Promise<ApplyUndoResponse> {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const record = await tx.undoRecord.findFirst({
      where: {
        id: undoId,
        userId
      }
    });

    if (!record) {
      throw new ApiError("NOT_FOUND", "撤销记录不存在", 404);
    }

    if (record.action !== "ai_create_todo" || !record.todoId) {
      throw new ApiError("NOT_FOUND", "撤销记录不存在", 404);
    }

    if (record.consumedAt) {
      throw aiModuleError("UNDO_ALREADY_CONSUMED", "撤销记录已被使用", 422);
    }

    if (record.expiresAt && record.expiresAt.getTime() <= now.getTime()) {
      throw aiModuleError("UNDO_EXPIRED", "撤销记录已过期", 422);
    }

    const todo = await tx.todo.findFirst({
      where: {
        id: record.todoId,
        userId
      },
      select: {
        id: true
      }
    });

    if (!todo) {
      throw new ApiError("NOT_FOUND", "待办不存在", 404);
    }

    await softDeleteAiCreatedTodo(tx, userId, todo.id, now);

    await tx.undoRecord.update({
      where: { id: record.id },
      data: { consumedAt: now }
    });

    return {
      originalInput: record.originalInput ?? "",
      deletedTodoId: todo.id
    };
  });
}
