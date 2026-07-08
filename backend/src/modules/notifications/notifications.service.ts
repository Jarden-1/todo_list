import { randomUUID } from "node:crypto";

import type { NotificationEvent, Prisma, PrismaClient } from "@prisma/client";

import { ApiError } from "../../common/apiError";
import type { ListNotificationsQuery } from "./notification.dto";
import { toNotificationDto } from "./notification.dto";

type PrismaWritable = PrismaClient | Prisma.TransactionClient;

export interface ReminderNotificationPayload {
  notificationId: string;
  todoId: string;
  reminderId: string;
  title: string;
  body: string;
  url: string;
}

export interface ReminderNotificationInput {
  userId: string;
  todoId: string;
  reminderId: string;
  todoTitle: string;
  dueAt: Date | null;
  remindAt: Date;
  reason: string | null;
  now: Date;
}

interface NotificationCursor {
  createdAt: string;
  id: string;
}

function newNotificationId(): string {
  return `ntf_${randomUUID()}`;
}

function encodeCursor(event: Pick<NotificationEvent, "createdAt" | "id">): string {
  return Buffer.from(
    JSON.stringify({
      createdAt: event.createdAt.toISOString(),
      id: event.id
    } satisfies NotificationCursor)
  ).toString("base64url");
}

function decodeCursor(cursor: string): NotificationCursor {
  try {
    const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));

    if (
      typeof decoded?.createdAt !== "string" ||
      Number.isNaN(Date.parse(decoded.createdAt)) ||
      typeof decoded?.id !== "string"
    ) {
      throw new Error("Invalid cursor shape");
    }

    return decoded as NotificationCursor;
  } catch {
    throw new ApiError("VALIDATION_ERROR", "cursor 不正确", 400, {
      cursor
    });
  }
}

function buildReminderBody(input: ReminderNotificationInput): string {
  if (input.reason?.trim()) {
    return input.reason.trim();
  }

  if (input.dueAt) {
    return `截止时间提醒 · ${input.dueAt.toISOString()}`;
  }

  return `提醒时间 · ${input.remindAt.toISOString()}`;
}

export function buildReminderNotificationPayload(
  input: ReminderNotificationInput,
  notificationId: string
): ReminderNotificationPayload {
  const title = `SmartTodo 提醒：${input.todoTitle}`;
  const body = buildReminderBody(input);

  return {
    notificationId,
    todoId: input.todoId,
    reminderId: input.reminderId,
    title,
    body,
    url: `/todos/${input.todoId}`
  };
}

export async function createReminderNotificationEvent(
  prisma: PrismaWritable,
  input: ReminderNotificationInput
): Promise<NotificationEvent> {
  const notificationId = newNotificationId();
  const payload = buildReminderNotificationPayload(input, notificationId);

  return prisma.notificationEvent.create({
    data: {
      id: notificationId,
      userId: input.userId,
      type: "reminder",
      title: payload.title,
      body: payload.body,
      todoId: input.todoId,
      reminderId: input.reminderId,
      payloadJson: payload as unknown as Prisma.InputJsonObject,
      createdAt: input.now
    }
  });
}

export async function listNotifications(
  prisma: PrismaClient,
  userId: string,
  query: ListNotificationsQuery
) {
  const cursor = query.cursor ? decodeCursor(query.cursor) : null;
  const where: Prisma.NotificationEventWhereInput = {
    userId,
    deletedAt: null,
    ...(query.unread === true ? { readAt: null } : {}),
    ...(query.type ? { type: query.type } : {}),
    // Hide notifications for todos that are done/cancelled — the user has
    // already dealt with them, no point showing stale reminders.
    todo: {
      deletedAt: null,
      status: { notIn: ["done", "cancelled"] }
    },
    ...(cursor
      ? {
          OR: [
            {
              createdAt: {
                lt: new Date(cursor.createdAt)
              }
            },
            {
              createdAt: new Date(cursor.createdAt),
              id: {
                lt: cursor.id
              }
            }
          ]
        }
      : {})
  };
  const events = await prisma.notificationEvent.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: query.limit + 1
  });
  const page = events.slice(0, query.limit);
  const lastPageEvent = page.at(-1) ?? null;

  return {
    data: page.map(toNotificationDto),
    meta: {
      nextCursor:
        events.length > query.limit && lastPageEvent
          ? encodeCursor(lastPageEvent)
          : null
    }
  };
}

async function findUserNotification(
  prisma: PrismaClient,
  userId: string,
  notificationId: string
): Promise<NotificationEvent> {
  const event = await prisma.notificationEvent.findFirst({
    where: {
      id: notificationId,
      userId,
      deletedAt: null
    }
  });

  if (!event) {
    throw new ApiError("NOT_FOUND", "通知不存在", 404);
  }

  return event;
}

export async function markNotificationRead(
  prisma: PrismaClient,
  userId: string,
  notificationId: string
) {
  const event = await findUserNotification(prisma, userId, notificationId);

  if (event.readAt) {
    return toNotificationDto(event);
  }

  await prisma.notificationEvent.updateMany({
    where: {
      id: event.id,
      userId,
      deletedAt: null
    },
    data: {
      readAt: new Date()
    }
  });

  const updated = await findUserNotification(prisma, userId, notificationId);
  return toNotificationDto(updated);
}

export async function markAllNotificationsRead(
  prisma: PrismaClient,
  userId: string
): Promise<{ updatedCount: number }> {
  const result = await prisma.notificationEvent.updateMany({
    where: {
      userId,
      deletedAt: null,
      readAt: null
    },
    data: {
      readAt: new Date()
    }
  });

  return { updatedCount: result.count };
}

export async function markNotificationDelivered(
  prisma: PrismaClient,
  userId: string,
  notificationId: string
) {
  const event = await findUserNotification(prisma, userId, notificationId);

  if (!event.deliveredAt) {
    await prisma.notificationEvent.updateMany({
      where: {
        id: event.id,
        userId,
        deletedAt: null
      },
      data: {
        deliveredAt: new Date()
      }
    });
  }

  const updated = await findUserNotification(prisma, userId, notificationId);
  return toNotificationDto(updated);
}

export async function markNotificationClicked(
  prisma: PrismaClient,
  userId: string,
  notificationId: string,
  markAsRead: boolean
) {
  await findUserNotification(prisma, userId, notificationId);

  const now = new Date();
  await prisma.notificationEvent.updateMany({
    where: {
      id: notificationId,
      userId,
      deletedAt: null
    },
    data: {
      clickedAt: now,
      ...(markAsRead ? { readAt: now } : {})
    }
  });

  const updated = await findUserNotification(prisma, userId, notificationId);
  return toNotificationDto(updated);
}
