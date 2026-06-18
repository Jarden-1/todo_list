import type { PrismaClient, Reminder } from "@prisma/client";

import { ApiError } from "../../common/apiError";
import { getSoftDeleteTimestamps } from "../../common/softDelete";
import { createEntityId } from "./ids";
import { toReminderDto } from "./todo.dto";
import type { ReminderInput } from "./todos.schemas";

type ReminderDb = Pick<PrismaClient, "reminder" | "todo" | "userSetting">;

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
      reason: "截止时间提醒",
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
          deletedAt: null
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
