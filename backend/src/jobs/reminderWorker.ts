import { randomUUID } from "node:crypto";

import type { NotificationEvent, PrismaClient, Reminder, Todo } from "@prisma/client";
import type Redis from "ioredis";

import { ApiError } from "../common/apiError";
import {
  buildReminderNotificationPayload,
  createReminderNotificationEvent
} from "../modules/notifications/notifications.service";
import {
  sendWebPush,
  WebPushSendError
} from "../modules/notifications/webPushClient";

const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_INTERVAL_MS = 60_000;
const LOCK_KEY = "smarttodo:jobs:reminder-worker:lock";
const LOCK_TTL_MS = 55_000;

type LoggerLike = {
  info: (payload: unknown, message?: string) => void;
  warn: (payload: unknown, message?: string) => void;
  error: (payload: unknown, message?: string) => void;
};

type DueReminder = Reminder & {
  todo: Todo;
};

export interface ReminderWorkerDeps {
  prisma: PrismaClient;
  redis?: Redis;
  logger?: LoggerLike;
  batchSize?: number;
  now?: () => Date;
}

export interface ReminderWorkerResult {
  scanned: number;
  created: number;
  pushSent: number;
  pushFailed: number;
  skipped: number;
}

export interface ReminderWorkerHandle {
  runNow: () => Promise<ReminderWorkerResult>;
  stop: () => void;
}

async function acquireLock(redis: Redis | undefined): Promise<string | null> {
  if (!redis) {
    return randomUUID();
  }

  const token = randomUUID();
  const acquired = await redis.set(LOCK_KEY, token, "PX", LOCK_TTL_MS, "NX");
  return acquired === "OK" ? token : null;
}

async function releaseLock(
  redis: Redis | undefined,
  token: string
): Promise<void> {
  if (!redis) {
    return;
  }

  await redis.eval(
    "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
    1,
    LOCK_KEY,
    token
  );
}

async function findDueReminders(
  prisma: PrismaClient,
  now: Date,
  batchSize: number
): Promise<DueReminder[]> {
  return prisma.reminder.findMany({
    where: {
      remindAt: {
        lte: now
      },
      sentAt: null,
      dismissedAt: null,
      deletedAt: null,
      todo: {
        deletedAt: null
      }
    },
    include: {
      todo: true
    },
    orderBy: {
      remindAt: "asc"
    },
    take: batchSize
  });
}

async function claimReminderAndCreateNotification(
  prisma: PrismaClient,
  reminder: DueReminder,
  now: Date
): Promise<NotificationEvent | null> {
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.reminder.updateMany({
      where: {
        id: reminder.id,
        userId: reminder.userId,
        sentAt: null,
        dismissedAt: null,
        deletedAt: null
      },
      data: {
        sentAt: now
      }
    });

    if (claimed.count === 0) {
      return null;
    }

    return createReminderNotificationEvent(tx, {
      userId: reminder.userId,
      todoId: reminder.todoId,
      reminderId: reminder.id,
      todoTitle: reminder.todo.title,
      dueAt: reminder.todo.dueAt,
      remindAt: reminder.remindAt,
      reason: reminder.reason,
      now
    });
  });
}

function toPushErrorMessage(error: unknown): string {
  if (error instanceof WebPushSendError) {
    return error.responseBody
      ? `${error.message}: ${error.responseBody}`
      : error.message;
  }

  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown Web Push error";
}

async function sendPushForNotification(
  deps: ReminderWorkerDeps,
  reminder: DueReminder,
  event: NotificationEvent,
  now: Date
): Promise<{ sent: number; failed: number }> {
  const subscriptions = await deps.prisma.webPushSubscription.findMany({
    where: {
      userId: reminder.userId,
      enabled: true,
      revokedAt: null
    }
  });

  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const payload = buildReminderNotificationPayload(
    {
      userId: reminder.userId,
      todoId: reminder.todoId,
      reminderId: reminder.id,
      todoTitle: reminder.todo.title,
      dueAt: reminder.todo.dueAt,
      remindAt: reminder.remindAt,
      reason: reminder.reason,
      now
    },
    event.id
  );
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const subscription of subscriptions) {
    try {
      await sendWebPush(subscription, payload);
      sent += 1;

      await deps.prisma.webPushSubscription.update({
        where: {
          id: subscription.id
        },
        data: {
          lastSuccessAt: now,
          lastFailureAt: null,
          failureCount: 0,
          updatedAt: now
        }
      });
    } catch (error) {
      failed += 1;
      const errorMessage = toPushErrorMessage(error);
      errors.push(`${subscription.id}: ${errorMessage}`);

      await deps.prisma.webPushSubscription.update({
        where: {
          id: subscription.id
        },
        data: {
          lastFailureAt: now,
          failureCount: {
            increment: 1
          },
          updatedAt: now,
          ...(error instanceof WebPushSendError && error.subscriptionGone
            ? {
                enabled: false,
                revokedAt: now
              }
            : {})
        }
      });

      deps.logger?.warn(
        {
          subscriptionId: subscription.id,
          notificationId: event.id,
          error
        },
        "Web Push delivery failed"
      );
    }
  }

  if (sent > 0 || failed > 0) {
    await deps.prisma.notificationEvent.update({
      where: {
        id: event.id
      },
      data: {
        ...(sent > 0 ? { pushSentAt: now } : {}),
        ...(failed > 0
          ? {
              pushFailedAt: now,
              pushError: errors.join("\n").slice(0, 4000)
            }
          : { pushError: null })
      }
    });
  }

  return { sent, failed };
}

export async function runReminderWorkerOnce(
  deps: ReminderWorkerDeps
): Promise<ReminderWorkerResult> {
  const token = await acquireLock(deps.redis);

  if (!token) {
    deps.logger?.info({ lockKey: LOCK_KEY }, "Reminder worker lock not acquired");
    return {
      scanned: 0,
      created: 0,
      pushSent: 0,
      pushFailed: 0,
      skipped: 0
    };
  }

  try {
    const now = deps.now?.() ?? new Date();
    const reminders = await findDueReminders(
      deps.prisma,
      now,
      deps.batchSize ?? DEFAULT_BATCH_SIZE
    );
    const result: ReminderWorkerResult = {
      scanned: reminders.length,
      created: 0,
      pushSent: 0,
      pushFailed: 0,
      skipped: 0
    };

    for (const reminder of reminders) {
      const event = await claimReminderAndCreateNotification(
        deps.prisma,
        reminder,
        now
      );

      if (!event) {
        result.skipped += 1;
        continue;
      }

      result.created += 1;
      const pushResult = await sendPushForNotification(deps, reminder, event, now);
      result.pushSent += pushResult.sent;
      result.pushFailed += pushResult.failed;
    }

    return result;
  } finally {
    await releaseLock(deps.redis, token);
  }
}

export function startReminderWorker(
  deps: ReminderWorkerDeps,
  intervalMs = DEFAULT_INTERVAL_MS
): ReminderWorkerHandle {
  let running = false;

  const runNow = async (): Promise<ReminderWorkerResult> => {
    if (running) {
      return {
        scanned: 0,
        created: 0,
        pushSent: 0,
        pushFailed: 0,
        skipped: 0
      };
    }

    running = true;

    try {
      return await runReminderWorkerOnce(deps);
    } catch (error) {
      deps.logger?.error({ err: error }, "Reminder worker failed");
      throw error;
    } finally {
      running = false;
    }
  };

  const timer = setInterval(() => {
    void runNow().catch(() => undefined);
  }, intervalMs);

  void runNow().catch(() => undefined);

  return {
    runNow,
    stop: () => clearInterval(timer)
  };
}
