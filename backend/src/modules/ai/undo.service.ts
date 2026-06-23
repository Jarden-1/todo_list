import type { PrismaClient } from "@prisma/client";

import { ApiError } from "../../common/apiError";
import { toUndoRecordDto, type UndoRecordDto } from "./ai.dto";
import { aiModuleError } from "./ai.errors";
import { softDeleteAiCreatedTodo } from "./ai.service";

export interface ApplyUndoResponse {
  originalInput: string;
  // First deleted id, kept for backward compatibility.
  deletedTodoId: string;
  // All deleted ids (the batch created by one AI action).
  deletedTodoIds: string[];
}

function extractTodoIds(record: {
  todoId: string | null;
  payloadJson: unknown;
}): string[] {
  const ids = new Set<string>();
  const payload = record.payloadJson;
  if (payload && typeof payload === "object") {
    const list = (payload as Record<string, unknown>).todoIds;
    if (Array.isArray(list)) {
      for (const id of list) {
        if (typeof id === "string" && id) {
          ids.add(id);
        }
      }
    }
    // Backward compat: older records stored a single todoId in payload.
    const single = (payload as Record<string, unknown>).todoId;
    if (typeof single === "string" && single) {
      ids.add(single);
    }
  }
  if (record.todoId) {
    ids.add(record.todoId);
  }
  return [...ids];
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

    if (record.action !== "ai_create_todo") {
      throw new ApiError("NOT_FOUND", "撤销记录不存在", 404);
    }

    if (record.consumedAt) {
      throw aiModuleError("UNDO_ALREADY_CONSUMED", "撤销记录已被使用", 422);
    }

    if (record.expiresAt && record.expiresAt.getTime() <= now.getTime()) {
      throw aiModuleError("UNDO_EXPIRED", "撤销记录已过期", 422);
    }

    const candidateIds = extractTodoIds(record);
    if (candidateIds.length === 0) {
      throw new ApiError("NOT_FOUND", "撤销记录不存在", 404);
    }

    // Only revert todos that still exist for this user.
    const existing = await tx.todo.findMany({
      where: {
        id: { in: candidateIds },
        userId
      },
      select: { id: true }
    });
    const deletedTodoIds = existing.map((row) => row.id);

    for (const id of deletedTodoIds) {
      await softDeleteAiCreatedTodo(tx, userId, id, now);
    }

    await tx.undoRecord.update({
      where: { id: record.id },
      data: { consumedAt: now }
    });

    return {
      originalInput: record.originalInput ?? "",
      deletedTodoId: deletedTodoIds[0] ?? candidateIds[0] ?? "",
      deletedTodoIds
    };
  });
}
