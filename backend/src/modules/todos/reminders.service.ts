import type { PrismaClient, Reminder } from "@prisma/client";

import { ApiError } from "../../common/apiError";
import { getSoftDeleteTimestamps } from "../../common/softDelete";
import { createEntityId } from "./ids";
import { toReminderDto } from "./todo.dto";
import type { ReminderInput } from "./todos.schemas";

type ReminderDb = Pick<PrismaClient, "reminder" | "todo" | "userSetting">;
type ReminderRecomputeDb = Pick<PrismaClient, "reminder" | "todo">;

const DEFAULT_DUE_REMINDER_REASON = "截止时间提醒";

export async function getRingtoneAdvanceMinutes(
  db: ReminderDb,
  userId: string
): Promise<number> {
  const settings = await db.userSetting.findUnique({
    where: {
      userId
    },
    select: {
      ringtoneAdvanceMinutes: true
    }
  });

  return settings?.ringtoneAdvanceMinutes ?? 15;
}

export async function buildDefaultReminderInputs(
  db: ReminderDb,
  userId: string,
  dueAt: Date | null
): Promise<ReminderInput[]> {
  if (!dueAt) {
    return [];
  }

  const advanceMinutes = await getRingtoneAdvanceMinutes(db, userId);
  const remindAt = new Date(dueAt);
  remindAt.setUTCMinutes(remindAt.getUTCMinutes() - advanceMinutes);

  return [
    {
      remindAt: remindAt.toISOString(),
      reason: DEFAULT_DUE_REMINDER_REASON,
      kind: "due"
    }
  ];
}

export function toReminderCreateRows(
  userId: string,
  todoId: string,
  reminders: ReminderInput[],
  now = new Date()
) {
  return reminders.map((reminder) => ({
    id: createEntityId("rem"),
    userId,
    todoId,
    remindAt: new Date(reminder.remindAt),
    reason: reminder.reason ?? null,
    kind: reminder.kind ?? "due",
    createdAt: now
  }));
}

export async function softDeleteActiveReminders(
  db: Pick<PrismaClient, "reminder">,
  userId: string,
  todoId: string,
  now = new Date()
): Promise<void> {
  const timestamps = getSoftDeleteTimestamps(now);

  await db.reminder.updateMany({
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
}

export async function recomputeDefaultDueRemindersForUser(
  db: ReminderRecomputeDb,
  userId: string,
  advanceMinutes: number,
  now = new Date()
): Promise<{ replaced: number; created: number }> {
  const timestamps = getSoftDeleteTimestamps(now);
  const replaced = await db.reminder.updateMany({
    where: {
      userId,
      kind: "due",
      reason: DEFAULT_DUE_REMINDER_REASON,
      sentAt: null,
      dismissedAt: null,
      deletedAt: null
    },
    data: {
      deletedAt: timestamps.deletedAt,
      purgeAfter: timestamps.purgeAfter
    }
  });
  const todos = await db.todo.findMany({
    where: {
      userId,
      deletedAt: null,
      dueAt: {
        not: null
      },
      status: {
        notIn: ["done", "cancelled"]
      }
    },
    select: {
      id: true,
      dueAt: true
    }
  });
  const reminderRows = todos.flatMap((todo) => {
    if (!todo.dueAt) {
      return [];
    }

    const remindAt = new Date(todo.dueAt);
    remindAt.setUTCMinutes(remindAt.getUTCMinutes() - advanceMinutes);

    return [
      {
        id: createEntityId("rem"),
        userId,
        todoId: todo.id,
        remindAt,
        reason: DEFAULT_DUE_REMINDER_REASON,
        kind: "due",
        createdAt: now,
        sentAt: null,
        dismissedAt: null
      }
    ];
  });

  if (reminderRows.length > 0) {
    await db.reminder.createMany({
      data: reminderRows
    });
  }

  return {
    replaced: replaced.count,
    created: reminderRows.length
  };
}

export class RemindersService {
  constructor(private readonly prisma: PrismaClient) {}

  async listDueReminders(userId: string, before = new Date()) {
    const reminders = await this.prisma.reminder.findMany({
      where: {
        userId,
        deletedAt: null,
        sentAt: null,
        dismissedAt: null,
        remindAt: {
          lte: before
        },
        todo: {
          userId,
          deletedAt: null,
          status: {
            notIn: ["done", "cancelled"]
          }
        }
      },
      orderBy: {
        remindAt: "asc"
      }
    });

    return reminders.map(toReminderDto);
  }

  async markReminderSent(
    userId: string,
    todoId: string,
    reminderId: string,
    sentAt = new Date()
  ) {
    const reminder = await this.findActiveReminder(userId, todoId, reminderId);

    await this.prisma.reminder.updateMany({
      where: {
        id: reminder.id,
        userId,
        todoId,
        deletedAt: null
      },
      data: {
        sentAt
      }
    });

    return toReminderDto(await this.findActiveReminder(userId, todoId, reminderId));
  }

  async dismissReminder(
    userId: string,
    todoId: string,
    reminderId: string,
    dismissedAt = new Date()
  ) {
    const reminder = await this.findActiveReminder(userId, todoId, reminderId);

    await this.prisma.reminder.updateMany({
      where: {
        id: reminder.id,
        userId,
        todoId,
        deletedAt: null
      },
      data: {
        dismissedAt
      }
    });

    return toReminderDto(await this.findActiveReminder(userId, todoId, reminderId));
  }

  // Dismiss ALL unsent reminders for a todo at once. Used by the
  // notification dialog's "不再提醒" action — once dismissed, the reminder
  // worker's `findDueReminders` query (which filters `dismissedAt: null`)
  // will skip them, so no further notifications fire for this todo.
  async dismissAllActiveRemindersForTodo(
    userId: string,
    todoId: string,
    dismissedAt = new Date()
  ): Promise<{ dismissedCount: number }> {
    const result = await this.prisma.reminder.updateMany({
      where: {
        userId,
        todoId,
        sentAt: null,
        deletedAt: null,
        dismissedAt: null
      },
      data: {
        dismissedAt
      }
    });

    return { dismissedCount: result.count };
  }

  private async findActiveReminder(
    userId: string,
    todoId: string,
    reminderId: string
  ): Promise<Reminder> {
    const reminder = await this.prisma.reminder.findFirst({
      where: {
        id: reminderId,
        todoId,
        userId,
        deletedAt: null,
        todo: {
          userId,
          deletedAt: null
        }
      }
    });

    if (!reminder) {
      throw new ApiError("NOT_FOUND", "提醒不存在", 404);
    }

    return reminder;
  }
}
